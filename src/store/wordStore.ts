import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Word, ReviewLog, ReviewMode } from "@/types";
import {
  uid,
  todayKey,
  addDays,
  initReview,
  advanceReview,
  resetReview,
  isDue,
} from "@/lib/review";
import {
  pushWord,
  pushWordsBulk,
  pushReviewLog,
  deleteWord as cloudDeleteWord,
  deleteReviewLogsByWordId,
} from "@/lib/cloudSyncSupabase";

interface WordStore {
  words: Word[];
  logs: ReviewLog[];
  hydrated: boolean;
  /**
   * 云同步开关：true 时本地变更会推送到 Supabase
   * 收到 Realtime 回调更新本地时设为 false，避免循环推送
   */
  syncEnabled: boolean;

  // CRUD
  /** 添加单个单词，若单词已存在（大小写不敏感）则返回 null */
  addWord: (input: {
    word: string;
    phonetic?: string;
    pos: string;
    meaning: string;
    note?: string;
    date?: string;
  }) => Word | null;
  /** 批量添加单词，自动跳过重复项（大小写不敏感），返回新增数与重复单词列表
   *  mode: "skip"=跳过重复（默认）, "replace"=覆盖重复单词的音标/词性/词意/笔记（保留复习进度）
   */
  addWordsBulk: (
    items: Array<{
      word: string;
      phonetic?: string;
      pos: string;
      meaning: string;
      note?: string;
    }>,
    date?: string,
    mode?: "skip" | "replace",
  ) => { added: number; duplicates: string[]; replaced: string[] };
  updateWord: (id: string, patch: Partial<Word>) => void;
  removeWord: (id: string) => void;
  /** 批量删除单词（同时清理关联复习日志与云端记录） */
  removeWordsBulk: (ids: string[]) => void;

  // 生词标记
  toggleDifficult: (id: string) => void;
  markMastered: (id: string) => void;
  /** 取消已掌握状态：恢复为生词，回到「初识」阶段，下次到期需复习 */
  unmarkMastered: (id: string) => void;

  // 复习
  reviewWord: (id: string, correct: boolean, mode: ReviewMode) => void;
  /** 只记录复习日志，不推进艾宾浩斯节点（用于随机抽查、听写测试等非正式复习） */
  logReview: (id: string, correct: boolean, mode: ReviewMode) => void;

  setHydrated: () => void;

  /* ============ 云同步相关方法 ============ */
  /** 设置 syncEnabled（App.tsx 在 Realtime 回调前后切换） */
  setSyncEnabled: (v: boolean) => void;
  /** 从云端拉取的数据覆盖本地（初次加载或手动同步时调用） */
  hydrateFromCloud: (words: Word[], logs: ReviewLog[]) => void;
  /** 应用 Realtime 推送的单条单词变更 */
  applyRemoteWord: (
    type: "INSERT" | "UPDATE" | "DELETE",
    word: Word,
  ) => void;
  /** 应用 Realtime 推送的单条复习日志变更 */
  applyRemoteLog: (
    type: "INSERT" | "UPDATE" | "DELETE",
    log: ReviewLog,
  ) => void;
}

export const useWordStore = create<WordStore>()(
  persist(
    (set, get) => ({
      words: [],
      logs: [],
      hydrated: false,
      // 开发环境（localhost）默认关闭云同步，避免测试数据污染生产环境
      // 生产环境默认开启
      syncEnabled: !import.meta.env.DEV,

      addWord: (input) => {
        const trimmedWord = input.word.trim();
        // 重复检查（大小写不敏感）
        const exists = get().words.some(
          (w) => w.word.toLowerCase() === trimmedWord.toLowerCase(),
        );
        if (exists) return null;

        const { nextReview, reviewStage } = initReview();
        const word: Word = {
          id: uid(),
          word: trimmedWord,
          phonetic: input.phonetic?.trim() || "",
          pos: input.pos.trim(),
          meaning: input.meaning.trim(),
          note: input.note?.trim() || "",
          date: input.date || todayKey(),
          // 新词默认进入「初识」阶段，已是生词状态
          isDifficult: true,
          isMastered: false,
          nextReview,
          reviewStage,
          createdAt: Date.now(),
        };
        set((s) => ({ words: [word, ...s.words] }));
        // 云同步：后台推送（不阻塞 UI，失败记录到控制台便于排查）
        if (get().syncEnabled) {
          pushWord(word).catch((e) => {
            console.error("[云同步] pushWord 失败:", e);
          });
        }
        return word;
      },

      addWordsBulk: (items, date, mode = "skip") => {
        const targetDate = date || todayKey();
        const { nextReview, reviewStage } = initReview();

        // 构建「小写单词 -> 现存 Word」索引（用于替换模式查找）
        const existingMap = new Map<string, Word>();
        for (const w of get().words) {
          existingMap.set(w.word.toLowerCase(), w);
        }
        const seenInBatch = new Set<string>();
        const duplicates: string[] = [];
        const replaced: string[] = [];
        const newWords: Word[] = [];
        const replacedWords: Word[] = [];

        for (const item of items) {
          const trimmed = item.word.trim();
          const lower = trimmed.toLowerCase();
          const existing = existingMap.get(lower);
          if (existing || seenInBatch.has(lower)) {
            duplicates.push(trimmed);
            if (mode === "replace" && existing) {
              // 覆盖现有单词的音标/词性/词意/笔记，保留复习进度与状态
              const updated: Word = {
                ...existing,
                word: trimmed,
                phonetic: item.phonetic?.trim() || existing.phonetic,
                pos: item.pos.trim() || existing.pos,
                meaning: item.meaning.trim() || existing.meaning,
                note: item.note?.trim() || existing.note,
              };
              replacedWords.push(updated);
              replaced.push(trimmed);
              // 替换索引中的引用，便于后续同批次重复时识别
              existingMap.set(lower, updated);
            }
            continue;
          }
          seenInBatch.add(lower);
          newWords.push({
            id: uid(),
            word: trimmed,
            phonetic: item.phonetic?.trim() || "",
            pos: item.pos.trim(),
            meaning: item.meaning.trim(),
            note: item.note?.trim() || "",
            date: targetDate,
            // 新词默认进入「初识」阶段
            isDifficult: true,
            isMastered: false,
            nextReview,
            reviewStage,
            createdAt: Date.now(),
          });
        }

        // 应用变更：新词前置插入 + 替换词就地更新
        if (newWords.length > 0 || replacedWords.length > 0) {
          const replacedIds = new Set(replacedWords.map((w) => w.id));
          set((s) => ({
            words: [
              ...newWords,
              ...s.words.map((w) =>
                replacedIds.has(w.id)
                  ? replacedWords.find((rw) => rw.id === w.id)!
                  : w,
              ),
            ],
          }));
          // 云同步：新词批量推送
          if (newWords.length > 0 && get().syncEnabled) {
            pushWordsBulk(newWords).catch((e) => console.error("[云同步] 推送异常:", e));
          }
          // 云同步：替换的单词逐条 upsert
          if (replacedWords.length > 0 && get().syncEnabled) {
            for (const rw of replacedWords) {
              pushWord(rw).catch((e) => console.error("[云同步] 推送异常:", e));
            }
          }
        }
        return { added: newWords.length, duplicates, replaced };
      },

      updateWord: (id, patch) => {
        set((s) => ({
          words: s.words.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        }));
        // 云同步：推送更新后的完整单词（需从 state 取最新值）
        if (get().syncEnabled) {
          const updated = get().words.find((w) => w.id === id);
          if (updated) pushWord(updated).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      removeWord: (id) => {
        set((s) => ({
          words: s.words.filter((w) => w.id !== id),
          logs: s.logs.filter((l) => l.wordId !== id),
        }));
        // 云同步：删除云端单词和关联日志
        if (get().syncEnabled) {
          cloudDeleteWord(id).catch((e) => console.error("[云同步] 推送异常:", e));
          deleteReviewLogsByWordId(id).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      removeWordsBulk: (ids) => {
        if (ids.length === 0) return;
        const idSet = new Set(ids);
        set((s) => ({
          words: s.words.filter((w) => !idSet.has(w.id)),
          logs: s.logs.filter((l) => !idSet.has(l.wordId)),
        }));
        // 云同步：逐条删除云端记录（保持与 removeWord 一致的语义）
        if (get().syncEnabled) {
          for (const id of ids) {
            cloudDeleteWord(id).catch((e) => console.error("[云同步] 推送异常:", e));
            deleteReviewLogsByWordId(id).catch((e) => console.error("[云同步] 推送异常:", e));
          }
        }
      },

      toggleDifficult: (id) => {
        set((s) => ({
          words: s.words.map((w) => {
            if (w.id !== id) return w;
            // 遗忘语义：强制回到生词（初识）状态
            // 已掌握的词可借此回到复习循环；正答错时也由 reviewWord 触发同样路径
            const { nextReview, reviewStage } = initReview();
            return {
              ...w,
              isDifficult: true,
              isMastered: false,
              nextReview,
              reviewStage,
            };
          }),
        }));
        // 云同步：推送状态变更
        if (get().syncEnabled) {
          const updated = get().words.find((w) => w.id === id);
          if (updated) pushWord(updated).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      markMastered: (id) => {
        set((s) => ({
          words: s.words.map((w) =>
            w.id === id
              ? {
                  ...w,
                  isMastered: true,
                  isDifficult: false,
                  nextReview: "",
                  reviewStage: -1,
                }
              : w,
          ),
        }));
        // 云同步：推送状态变更
        if (get().syncEnabled) {
          const updated = get().words.find((w) => w.id === id);
          if (updated) pushWord(updated).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      unmarkMastered: (id) => {
        const { nextReview, reviewStage } = initReview();
        set((s) => ({
          words: s.words.map((w) =>
            w.id === id
              ? {
                  ...w,
                  isMastered: false,
                  isDifficult: true,
                  nextReview,
                  reviewStage,
                  // 清除今日复习标记，允许今日重新开始推进阶段
                  lastReviewDate: "",
                }
              : w,
          ),
        }));
        // 云同步：推送状态变更
        if (get().syncEnabled) {
          const updated = get().words.find((w) => w.id === id);
          if (updated) pushWord(updated).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      reviewWord: (id, correct, mode) => {
        const word = get().words.find((w) => w.id === id);
        if (!word) return;
        const today = todayKey();

        // 始终记录复习日志（每次复习行为都记录）
        const log: ReviewLog = {
          id: uid(),
          wordId: id,
          reviewedAt: Date.now(),
          correct,
          mode,
        };
        set((s) => ({ logs: [log, ...s.logs] }));
        // 云同步：推送复习日志
        if (get().syncEnabled) {
          pushReviewLog(log).catch((e) => console.error("[云同步] 推送异常:", e));
        }

        // 同一天最多只推进一次复习阶段
        // 防止「再来一轮」重复认识导致阶段直接到永久
        if (word.lastReviewDate === today) return;

        if (correct) {
          const next = advanceReview(word.reviewStage);
          if (next.reviewStage >= 6) {
            // 推进到「永久」阶段即视为已掌握
            // 「永久」语义等同于「已掌握」，不再停留在 stage=6 等待下一次复习
            get().markMastered(id);
            get().updateWord(id, { lastReviewDate: today });
          } else {
            get().updateWord(id, {
              ...next,
              isMastered: false,
              lastReviewDate: today,
            });
          }
        } else {
          // 答错：重置复习阶段到 stage=0，nextReview 保持今天（仍然到期）
          // 不设置 lastReviewDate，允许今日重问时再次推进阶段
          // 这样答错的词仍然计入"待复习"红点数字，只有答对时才从红点中移除
          const next = resetReview();
          get().updateWord(id, {
            ...next,
            isMastered: false,
          });
        }
      },

      logReview: (id, correct, mode) => {
        // 只记录复习日志，不推进艾宾浩斯节点
        // 用于随机抽查、听写测试等非正式复习场景，确保统计页面能正确统计熟练度
        const log: ReviewLog = {
          id: uid(),
          wordId: id,
          reviewedAt: Date.now(),
          correct,
          mode,
        };
        set((s) => ({ logs: [log, ...s.logs] }));
        // 云同步：推送复习日志
        if (get().syncEnabled) {
          pushReviewLog(log).catch((e) => console.error("[云同步] 推送异常:", e));
        }
      },

      setHydrated: () => {
        set({ hydrated: true });
        // 一次性数据迁移
        // 1. 旧数据中存在 !isMastered && !isDifficult 的词（未点亮的新词）
        //    按新逻辑，所有未掌握的词默认就是生词状态。
        // 2. 旧数据中存在 reviewStage === 6 && !isMastered 的词（停留在「永久」阶段）
        //    按新逻辑，「永久」即「已掌握」，应直接转为已掌握状态。
        const state = get();
        let needsMigration = false;
        const newWords = state.words.map((w) => {
          if (!w.isMastered && !w.isDifficult) {
            needsMigration = true;
            const { nextReview, reviewStage } = initReview();
            return { ...w, isDifficult: true, nextReview, reviewStage };
          }
          if (w.reviewStage === 6 && !w.isMastered) {
            needsMigration = true;
            return {
              ...w,
              isMastered: true,
              isDifficult: false,
              nextReview: "",
              reviewStage: -1,
            };
          }
          return w;
        });
        if (needsMigration) {
          set({ words: newWords });
        }
      },

      /* ============ 云同步相关方法 ============ */
      setSyncEnabled: (v) => set({ syncEnabled: v }),

      hydrateFromCloud: (words, logs) => {
        // 从云端拉取的数据覆盖本地（注意：会触发 persist 写入 localStorage）
        set({ words, logs });
      },

      applyRemoteWord: (type, word) => {
        // Realtime 回调：临时关闭 syncEnabled，避免本地更新触发推送形成循环
        const wasEnabled = get().syncEnabled;
        set({ syncEnabled: false });
        try {
          if (type === "DELETE") {
            set((s) => ({
              words: s.words.filter((w) => w.id !== word.id),
              logs: s.logs.filter((l) => l.wordId !== word.id),
            }));
          } else if (type === "INSERT") {
            // 仅在本地不存在时插入，避免覆盖本地更新的更高版本
            const exists = get().words.some((w) => w.id === word.id);
            if (!exists) {
              set((s) => ({ words: [word, ...s.words] }));
            }
          } else {
            // UPDATE：直接覆盖（Last-Write-Wins；更精细的冲突解决可比较 updatedAt）
            set((s) => ({
              words: s.words.map((w) => (w.id === word.id ? word : w)),
            }));
          }
        } finally {
          set({ syncEnabled: wasEnabled });
        }
      },

      applyRemoteLog: (type, log) => {
        const wasEnabled = get().syncEnabled;
        set({ syncEnabled: false });
        try {
          if (type === "DELETE") {
            set((s) => ({ logs: s.logs.filter((l) => l.id !== log.id) }));
          } else if (type === "INSERT") {
            const exists = get().logs.some((l) => l.id === log.id);
            if (!exists) {
              set((s) => ({ logs: [log, ...s.logs] }));
            }
          } else {
            set((s) => ({
              logs: s.logs.map((l) => (l.id === log.id ? log : l)),
            }));
          }
        } finally {
          set({ syncEnabled: wasEnabled });
        }
      },
    }),
    {
      name: "wordgrid-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

// 派生选择器辅助函数
export function selectWordsByDate(words: Word[], date: string): Word[] {
  return words.filter((w) => w.date === date);
}

export function selectDifficultWords(words: Word[]): Word[] {
  return words.filter((w) => w.isDifficult && !w.isMastered);
}

export function selectDueWords(words: Word[]): Word[] {
  return words.filter((w) => w.isDifficult && !w.isMastered && isDue(w.nextReview));
}

/**
 * 「到期词 ∪ 当日新词」合并数量 —— 用于导航红点与 DailyGrid 的 Due Today 提示
 *
 * 当天新加的词 nextReview 通常是明天，isDue 返回 false，但用户当天应该先学习一次，
 * 所以红点应该把它们也算进来，与生词本「自我检测」逻辑保持一致。
 *
 * Bug 修复：今日新词被复习过后（lastReviewDate === today）就不再计入红点，
 * 否则用户复习完所有词后红点仍显示数字，状态没有归零。
 */
export function selectDueAndTodayNewCount(words: Word[]): number {
  const today = todayKey();
  let count = 0;
  const todayNewIds = new Set<string>();
  for (const w of words) {
    // 当日新加且未掌握且今天还未复习过的词
    if (
      w.date === today &&
      !w.isMastered &&
      w.lastReviewDate !== today
    ) {
      todayNewIds.add(w.id);
    }
  }
  // 先统计到期词，同时跳过当日新词（避免重复计数）
  for (const w of words) {
    if (w.isDifficult && !w.isMastered && isDue(w.nextReview)) {
      count++;
      todayNewIds.delete(w.id);
    }
  }
  // 加上当日新词中未被计入到期词的部分
  count += todayNewIds.size;
  return count;
}

/** 明日到期的生词（nextReview == 明天） */
export function selectTomorrowWords(words: Word[]): Word[] {
  const tomorrow = addDays(todayKey(), 1);
  return words.filter(
    (w) => w.isDifficult && !w.isMastered && w.nextReview === tomorrow,
  );
}

export function selectMasteredWords(words: Word[]): Word[] {
  return words.filter((w) => w.isMastered);
}

/** 最近 N 天新学的词（按添加日期 date 字段过滤，包含所有状态） */
export function selectRecentWords(words: Word[], days: number = 7): Word[] {
  const cutoff = addDays(todayKey(), -days);
  return words.filter((w) => w.date >= cutoff);
}

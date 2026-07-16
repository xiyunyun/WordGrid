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
  /** 批量添加单词，自动跳过重复项（大小写不敏感），返回新增数与重复单词列表 */
  addWordsBulk: (
    items: Array<{
      word: string;
      phonetic?: string;
      pos: string;
      meaning: string;
      note?: string;
    }>,
    date?: string,
  ) => { added: number; duplicates: string[] };
  updateWord: (id: string, patch: Partial<Word>) => void;
  removeWord: (id: string) => void;

  // 生词标记
  toggleDifficult: (id: string) => void;
  markMastered: (id: string) => void;

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
      syncEnabled: true, // 默认开启；Realtime 回调更新本地时临时关闭

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

      addWordsBulk: (items, date) => {
        const targetDate = date || todayKey();
        const { nextReview, reviewStage } = initReview();

        // 重复检查（大小写不敏感）：既比对已有单词，也比对当前批次内已通过的
        const existingLower = new Set(
          get().words.map((w) => w.word.toLowerCase()),
        );
        const seenInBatch = new Set<string>();
        const duplicates: string[] = [];
        const newWords: Word[] = [];

        for (const item of items) {
          const trimmed = item.word.trim();
          const lower = trimmed.toLowerCase();
          if (existingLower.has(lower) || seenInBatch.has(lower)) {
            duplicates.push(trimmed);
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

        if (newWords.length > 0) {
          set((s) => ({ words: [...newWords, ...s.words] }));
          // 云同步：批量推送（一次请求）
          if (get().syncEnabled) {
            pushWordsBulk(newWords).catch((e) => console.error("[云同步] 推送异常:", e));
          }
        }
        return { added: newWords.length, duplicates };
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
          if (word.reviewStage >= 6) {
            // 已达最高阶段，标记为掌握
            get().markMastered(id);
            get().updateWord(id, { lastReviewDate: today });
          } else {
            const next = advanceReview(word.reviewStage);
            get().updateWord(id, {
              ...next,
              isMastered: false,
              lastReviewDate: today,
            });
          }
        } else {
          const next = resetReview();
          get().updateWord(id, {
            ...next,
            isMastered: false,
            lastReviewDate: today,
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
        // 一次性数据迁移：旧数据中存在 !isMastered && !isDifficult 的词
        // （即未点亮的新词）。按新逻辑，所有未掌握的词默认就是生词状态。
        const state = get();
        let needsMigration = false;
        const newWords = state.words.map((w) => {
          if (!w.isMastered && !w.isDifficult) {
            needsMigration = true;
            const { nextReview, reviewStage } = initReview();
            return { ...w, isDifficult: true, nextReview, reviewStage };
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

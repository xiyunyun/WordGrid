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

interface WordStore {
  words: Word[];
  logs: ReviewLog[];
  hydrated: boolean;

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
}

export const useWordStore = create<WordStore>()(
  persist(
    (set, get) => ({
      words: [],
      logs: [],
      hydrated: false,

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
        }
        return { added: newWords.length, duplicates };
      },

      updateWord: (id, patch) =>
        set((s) => ({
          words: s.words.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      removeWord: (id) =>
        set((s) => ({
          words: s.words.filter((w) => w.id !== id),
          logs: s.logs.filter((l) => l.wordId !== id),
        })),

      toggleDifficult: (id) =>
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
        })),

      markMastered: (id) =>
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
        })),

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

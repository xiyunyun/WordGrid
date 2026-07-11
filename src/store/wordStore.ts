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
  addWord: (input: {
    word: string;
    phonetic?: string;
    pos: string;
    meaning: string;
    note?: string;
    date?: string;
  }) => Word;
  addWordsBulk: (
    items: Array<{
      word: string;
      phonetic?: string;
      pos: string;
      meaning: string;
      note?: string;
    }>,
    date?: string,
  ) => number;
  updateWord: (id: string, patch: Partial<Word>) => void;
  removeWord: (id: string) => void;

  // 生词标记
  toggleDifficult: (id: string) => void;
  markMastered: (id: string) => void;

  // 复习
  reviewWord: (id: string, correct: boolean, mode: ReviewMode) => void;

  setHydrated: () => void;
}

export const useWordStore = create<WordStore>()(
  persist(
    (set, get) => ({
      words: [],
      logs: [],
      hydrated: false,

      addWord: (input) => {
        const { nextReview, reviewStage } = initReview();
        const word: Word = {
          id: uid(),
          word: input.word.trim(),
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
        const newWords: Word[] = items.map((item) => ({
          id: uid(),
          word: item.word.trim(),
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
        }));
        set((s) => ({ words: [...newWords, ...s.words] }));
        return newWords.length;
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
        const log: ReviewLog = {
          id: uid(),
          wordId: id,
          reviewedAt: Date.now(),
          correct,
          mode,
        };
        set((s) => ({ logs: [log, ...s.logs] }));

        if (correct) {
          if (word.reviewStage >= 6) {
            // 已达最高阶段，标记为掌握
            get().markMastered(id);
          } else {
            const next = advanceReview(word.reviewStage);
            get().updateWord(id, {
              ...next,
              isMastered: false,
            });
          }
        } else {
          const next = resetReview();
          get().updateWord(id, {
            ...next,
            isMastered: false,
          });
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

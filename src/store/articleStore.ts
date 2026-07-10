import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Difficulty, QuizQuestion } from "@/lib/deepseek";
import type { Word } from "@/types";

/** 单篇文章的归档记录 */
export interface ArticleArchive {
  id: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 创建日期 YYYY-MM-DD */
  date: string;
  /** 文章正文 */
  article: string;
  /** 生成时使用的单词（快照） */
  words: Array<{
    id: string;
    word: string;
    pos: string;
    meaning: string;
    phonetic?: string;
  }>;
  /** 难度 */
  difficulty: Difficulty;
  /** 题目（生成后填充，未生成时为空数组） */
  questions: QuizQuestion[];
  /** 最近一次作答记录 */
  attempt?: QuizAttempt;
}

/** 一次作答记录 */
export interface QuizAttempt {
  /** 作答时间戳 */
  attemptedAt: number;
  /** 每题的用户答案，key = questionId */
  answers: Record<string, string>;
  /** 每题是否正确，key = questionId */
  results: Record<string, boolean>;
  /** 得分（百分制） */
  score: number;
  /** 正确题数 */
  correctCount: number;
  /** 总题数 */
  totalCount: number;
}

interface ArticleStore {
  archives: ArticleArchive[];

  /** 新建归档（生成文章后调用），返回新归档 id */
  addArchive: (input: {
    article: string;
    words: Word[];
    difficulty: Difficulty;
  }) => string;

  /** 为指定归档追加题目 */
  setQuestions: (archiveId: string, questions: QuizQuestion[]) => void;

  /** 记录一次作答 */
  setAttempt: (archiveId: string, attempt: QuizAttempt) => void;

  /** 删除归档 */
  removeArchive: (id: string) => void;

  /** 清空全部归档 */
  clearAll: () => void;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const useArticleStore = create<ArticleStore>()(
  persist(
    (set) => ({
      archives: [],

      addArchive: (input) => {
        const id = genId();
        const archive: ArticleArchive = {
          id,
          createdAt: Date.now(),
          date: todayKey(),
          article: input.article,
          words: input.words.map((w) => ({
            id: w.id,
            word: w.word,
            pos: w.pos,
            meaning: w.meaning,
            phonetic: w.phonetic,
          })),
          difficulty: input.difficulty,
          questions: [],
        };
        set((s) => ({ archives: [archive, ...s.archives] }));
        return id;
      },

      setQuestions: (archiveId, questions) =>
        set((s) => ({
          archives: s.archives.map((a) =>
            a.id === archiveId ? { ...a, questions } : a,
          ),
        })),

      setAttempt: (archiveId, attempt) =>
        set((s) => ({
          archives: s.archives.map((a) =>
            a.id === archiveId ? { ...a, attempt } : a,
          ),
        })),

      removeArchive: (id) =>
        set((s) => ({ archives: s.archives.filter((a) => a.id !== id) })),

      clearAll: () => set({ archives: [] }),
    }),
    {
      name: "wordgrid-article-archive",
    },
  ),
);

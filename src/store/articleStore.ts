import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Difficulty, QuizQuestion } from "@/lib/deepseek";
import type { Word } from "@/types";
import {
  pushArticle,
  deleteArticle as cloudDeleteArticle,
} from "@/lib/cloudSyncSupabase";

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
  /** 最后阅读的归档 id（用于离开页面后恢复） */
  lastReadArchiveId: string | null;
  /** 云同步开关（同 wordStore） */
  syncEnabled: boolean;

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

  /** 清除作答记录（追加题目后旧作答不再适用） */
  clearAttempt: (archiveId: string) => void;

  /** 删除归档（若删除的是 lastReadArchiveId 则一并清除） */
  removeArchive: (id: string) => void;

  /** 清空全部归档 */
  clearAll: () => void;

  /** 设置最后阅读的归档 id */
  setLastReadArchiveId: (id: string | null) => void;

  /* ============ 云同步相关方法 ============ */
  setSyncEnabled: (v: boolean) => void;
  hydrateFromCloud: (archives: ArticleArchive[]) => void;
  applyRemoteArticle: (
    type: "INSERT" | "UPDATE" | "DELETE",
    article: ArticleArchive,
  ) => void;
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
    (set, get) => ({
      archives: [],
      lastReadArchiveId: null,
      // 开发环境（localhost）默认关闭云同步，避免测试数据污染生产环境
      syncEnabled: !import.meta.env.DEV,

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
        if (get().syncEnabled) {
          pushArticle(archive).catch((e) => console.error("[云同步] 文章推送异常:", e));
        }
        return id;
      },

      setQuestions: (archiveId, questions) => {
        set((s) => ({
          archives: s.archives.map((a) =>
            a.id === archiveId ? { ...a, questions } : a,
          ),
        }));
        if (get().syncEnabled) {
          const updated = get().archives.find((a) => a.id === archiveId);
          if (updated) pushArticle(updated).catch((e) => console.error("[云同步] 文章推送异常:", e));
        }
      },

      setAttempt: (archiveId, attempt) => {
        set((s) => ({
          archives: s.archives.map((a) =>
            a.id === archiveId ? { ...a, attempt } : a,
          ),
        }));
        if (get().syncEnabled) {
          const updated = get().archives.find((a) => a.id === archiveId);
          if (updated) pushArticle(updated).catch((e) => console.error("[云同步] 文章推送异常:", e));
        }
      },

      clearAttempt: (archiveId) => {
        set((s) => ({
          archives: s.archives.map((a) =>
            a.id === archiveId ? { ...a, attempt: undefined } : a,
          ),
        }));
        if (get().syncEnabled) {
          const updated = get().archives.find((a) => a.id === archiveId);
          if (updated) pushArticle(updated).catch((e) => console.error("[云同步] 文章推送异常:", e));
        }
      },

      removeArchive: (id) => {
        set((s) => ({
          archives: s.archives.filter((a) => a.id !== id),
          lastReadArchiveId:
            s.lastReadArchiveId === id ? null : s.lastReadArchiveId,
        }));
        if (get().syncEnabled) {
          cloudDeleteArticle(id).catch((e) => console.error("[云同步] 文章推送异常:", e));
        }
      },

      clearAll: () => {
        const old = get().archives;
        set({ archives: [], lastReadArchiveId: null });
        if (get().syncEnabled) {
          old.forEach((a) => cloudDeleteArticle(a.id).catch((e) => console.error("[云同步] 文章推送异常:", e)));
        }
      },

      setLastReadArchiveId: (id) => set({ lastReadArchiveId: id }),

      /* ============ 云同步相关方法 ============ */
      setSyncEnabled: (v) => set({ syncEnabled: v }),

      hydrateFromCloud: (archives) => {
        set({ archives });
      },

      applyRemoteArticle: (type, article) => {
        const wasEnabled = get().syncEnabled;
        set({ syncEnabled: false });
        try {
          if (type === "DELETE") {
            set((s) => ({
              archives: s.archives.filter((a) => a.id !== article.id),
              lastReadArchiveId:
                s.lastReadArchiveId === article.id
                  ? null
                  : s.lastReadArchiveId,
            }));
          } else if (type === "INSERT") {
            const exists = get().archives.some((a) => a.id === article.id);
            if (!exists) {
              set((s) => ({ archives: [article, ...s.archives] }));
            }
          } else {
            set((s) => ({
              archives: s.archives.map((a) =>
                a.id === article.id ? article : a,
              ),
            }));
          }
        } finally {
          set({ syncEnabled: wasEnabled });
        }
      },
    }),
    {
      name: "wordgrid-article-archive",
    },
  ),
);

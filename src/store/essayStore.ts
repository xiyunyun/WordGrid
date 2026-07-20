import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Essay } from "@/types";

interface EssayStore {
  essays: Essay[];
  /** 添加随笔。返回新创建的 Essay（含 id 和 createdAt） */
  addEssay: (data: {
    content: string;
    translation?: string;
    date: string;
    note?: string;
  }) => Essay;
  /** 更新随笔 */
  updateEssay: (id: string, patch: Partial<Omit<Essay, "id" | "createdAt">>) => void;
  /** 删除随笔 */
  removeEssay: (id: string) => void;
  /** 按 id 获取 */
  getEssay: (id: string) => Essay | undefined;
}

export const useEssayStore = create<EssayStore>()(
  persist(
    (set, get) => ({
      essays: [],

      addEssay: ({ content, translation, date, note }) => {
        const essay: Essay = {
          id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          content: content.trim(),
          translation: translation?.trim() || undefined,
          date,
          note: note?.trim() || undefined,
          createdAt: Date.now(),
        };
        set((s) => ({ essays: [...s.essays, essay] }));
        return essay;
      },

      updateEssay: (id, patch) => {
        set((s) => ({
          essays: s.essays.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...patch,
                  // 翻译/笔记空字符串规整为 undefined
                  translation:
                    patch.translation !== undefined
                      ? patch.translation.trim() || undefined
                      : e.translation,
                  note:
                    patch.note !== undefined
                      ? patch.note.trim() || undefined
                      : e.note,
                  content:
                    patch.content !== undefined
                      ? patch.content.trim()
                      : e.content,
                }
              : e,
          ),
        }));
      },

      removeEssay: (id) => {
        set((s) => ({ essays: s.essays.filter((e) => e.id !== id) }));
      },

      getEssay: (id) => get().essays.find((e) => e.id === id),
    }),
    {
      name: "wordgrid-essays",
    },
  ),
);

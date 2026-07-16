import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DateNotesStore {
  /** key: 日期 YYYY-MM-DD，value: 备注文本 */
  notes: Record<string, string>;
  /** 设置某天的备注（空字符串则删除） */
  setNote: (date: string, text: string) => void;
  /** 获取某天的备注 */
  getNote: (date: string) => string;
  /** 删除某天的备注 */
  removeNote: (date: string) => void;
}

export const useDateNotesStore = create<DateNotesStore>()(
  persist(
    (set, get) => ({
      notes: {},
      setNote: (date, text) => {
        const trimmed = text.trim();
        set((s) => {
          const next = { ...s.notes };
          if (trimmed) {
            next[date] = trimmed;
          } else {
            delete next[date];
          }
          return { notes: next };
        });
      },
      getNote: (date) => get().notes[date] || "",
      removeNote: (date) =>
        set((s) => {
          const next = { ...s.notes };
          delete next[date];
          return { notes: next };
        }),
    }),
    {
      name: "wordgrid-date-notes",
    },
  ),
);

/** 截断备注用于摘要显示（默认 20 字） */
export function truncateNote(text: string, max = 20): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

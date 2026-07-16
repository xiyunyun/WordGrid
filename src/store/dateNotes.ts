import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  pushDateNote,
  deleteDateNote,
} from "@/lib/cloudSyncSupabase";

interface DateNotesStore {
  /** key: 日期 YYYY-MM-DD，value: 备注文本 */
  notes: Record<string, string>;
  /** 云同步开关（同 wordStore） */
  syncEnabled: boolean;
  /** 设置某天的备注（空字符串则删除） */
  setNote: (date: string, text: string) => void;
  /** 获取某天的备注 */
  getNote: (date: string) => string;
  /** 删除某天的备注 */
  removeNote: (date: string) => void;

  /* ============ 云同步相关方法 ============ */
  setSyncEnabled: (v: boolean) => void;
  hydrateFromCloud: (notes: Record<string, string>) => void;
  applyRemoteNote: (
    type: "INSERT" | "UPDATE" | "DELETE",
    date: string,
    note: string | null,
  ) => void;
}

export const useDateNotesStore = create<DateNotesStore>()(
  persist(
    (set, get) => ({
      notes: {},
      syncEnabled: true,

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
        // 云同步：推送（有内容则 upsert，空则删除）
        if (get().syncEnabled) {
          if (trimmed) {
            pushDateNote(date, trimmed).catch(() => {});
          } else {
            deleteDateNote(date).catch(() => {});
          }
        }
      },

      getNote: (date) => get().notes[date] || "",

      removeNote: (date) => {
        set((s) => {
          const next = { ...s.notes };
          delete next[date];
          return { notes: next };
        });
        if (get().syncEnabled) {
          deleteDateNote(date).catch(() => {});
        }
      },

      /* ============ 云同步相关方法 ============ */
      setSyncEnabled: (v) => set({ syncEnabled: v }),

      hydrateFromCloud: (notes) => {
        set({ notes });
      },

      applyRemoteNote: (type, date, note) => {
        const wasEnabled = get().syncEnabled;
        set({ syncEnabled: false });
        try {
          if (type === "DELETE" || !note) {
            set((s) => {
              const next = { ...s.notes };
              delete next[date];
              return { notes: next };
            });
          } else {
            // INSERT / UPDATE
            set((s) => ({ notes: { ...s.notes, [date]: note } }));
          }
        } finally {
          set({ syncEnabled: wasEnabled });
        }
      },
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

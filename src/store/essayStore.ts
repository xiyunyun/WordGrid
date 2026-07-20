import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Essay } from "@/types";
import { pushEssay, deleteEssay as cloudDeleteEssay } from "@/lib/cloudSyncSupabase";

interface EssayStore {
  essays: Essay[];
  /** 云同步开关：云端数据 hydrate 时临时关闭，避免循环推送 */
  syncEnabled: boolean;
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
  /* ============ 云同步相关方法 ============ */
  setSyncEnabled: (v: boolean) => void;
  hydrateFromCloud: (essays: Essay[]) => void;
  applyRemoteEssay: (type: "INSERT" | "UPDATE" | "DELETE", essay: Essay) => void;
}

export const useEssayStore = create<EssayStore>()(
  persist(
    (set, get) => ({
      essays: [],
      // 生产环境默认开启推送；开发环境（localhost）getSupabase 返回 null，
      // pushEssay 会自动跳过，这里默认 true 即可
      syncEnabled: !import.meta.env.DEV,

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
        // 云同步：推送新增随笔
        if (get().syncEnabled) {
          pushEssay(essay).catch((e) =>
            console.error("[云同步] 推送异常:", e),
          );
        }
        return essay;
      },

      updateEssay: (id, patch) => {
        let updated: Essay | undefined;
        set((s) => ({
          essays: s.essays.map((e) => {
            if (e.id !== id) return e;
            const next = {
              ...e,
              ...patch,
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
            };
            updated = next;
            return next;
          }),
        }));
        // 云同步：推送更新后的随笔
        if (get().syncEnabled && updated) {
          pushEssay(updated).catch((e) =>
            console.error("[云同步] 推送异常:", e),
          );
        }
      },

      removeEssay: (id) => {
        set((s) => ({ essays: s.essays.filter((e) => e.id !== id) }));
        // 云同步：删除云端随笔
        if (get().syncEnabled) {
          cloudDeleteEssay(id).catch((e) =>
            console.error("[云同步] 删除异常:", e),
          );
        }
      },

      getEssay: (id) => get().essays.find((e) => e.id === id),

      /* ============ 云同步相关方法 ============ */
      setSyncEnabled: (v) => set({ syncEnabled: v }),

      hydrateFromCloud: (essays) => {
        // 从云端拉取的数据覆盖本地（会触发 persist 写入 localStorage）
        set({ essays });
      },

      applyRemoteEssay: (type, essay) => {
        // Realtime 回调：临时关闭 syncEnabled，避免本地更新触发推送形成循环
        const wasEnabled = get().syncEnabled;
        set({ syncEnabled: false });
        try {
          if (type === "DELETE") {
            set((s) => ({ essays: s.essays.filter((e) => e.id !== essay.id) }));
          } else {
            // INSERT 或 UPDATE
            set((s) => {
              const idx = s.essays.findIndex((e) => e.id === essay.id);
              if (idx === -1) {
                return { essays: [...s.essays, essay] };
              }
              const next = [...s.essays];
              next[idx] = essay;
              return { essays: next };
            });
          }
        } finally {
          set({ syncEnabled: wasEnabled });
        }
      },
    }),
    {
      name: "wordgrid-essays",
    },
  ),
);

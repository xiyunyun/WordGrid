/**
 * 用户设置 store
 *
 * 包含两项设置：
 * 1. TTS 音量（0-1），控制单词朗读的播放音量
 * 2. 学习时长追踪开关 + 累计学习秒数
 *
 * 云同步：学习时长通过 user_settings 表（username + total_seconds）同步，
 * 多设备累计时取最大值，避免重复计数。
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSupabase } from "@/lib/supabase";
import { getCurrentUsername } from "@/lib/supabase";

export interface SettingsState {
  /** TTS 音量 0-1，默认 0.5（50%） */
  ttsVolume: number;
  /** 学习时长追踪开关 */
  trackStudyTime: boolean;
  /** 累计学习时长（秒） */
  totalStudySeconds: number;
  /** 上次活动时间戳（ms），用于活动检测 */
  lastActivityAt: number;
  /** 上次同步到云端的秒数（避免无变化时重复推送） */
  lastSyncedSeconds: number;

  setTtsVolume: (v: number) => void;
  setTrackStudyTime: (v: boolean) => void;
  /** 增加学习时长（秒），仅在 trackStudyTime=true 时生效 */
  addStudySeconds: (s: number) => void;
  /** 更新活动时间戳 */
  touchActivity: () => void;

  /** 云同步 */
  syncEnabled: boolean;
  setSyncEnabled: (v: boolean) => void;
  hydrateFromCloud: (totalSeconds: number) => void;
  pushToCloud: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ttsVolume: 0.5,
      trackStudyTime: false,
      totalStudySeconds: 0,
      lastActivityAt: Date.now(),
      lastSyncedSeconds: 0,

      setTtsVolume: (v) => set({ ttsVolume: Math.max(0, Math.min(1, v)) }),
      setTrackStudyTime: (v) => set({ trackStudyTime: v }),

      addStudySeconds: (s) => {
        if (!get().trackStudyTime) return;
        set((state) => ({
          totalStudySeconds: state.totalStudySeconds + s,
        }));
      },

      touchActivity: () => set({ lastActivityAt: Date.now() }),

      syncEnabled: !import.meta.env.DEV,
      setSyncEnabled: (v) => set({ syncEnabled: v }),

      hydrateFromCloud: (totalSeconds) => {
        // 云端取最大值，避免多设备重复计数
        set((s) => ({
          totalStudySeconds: Math.max(s.totalStudySeconds, totalSeconds),
        }));
      },

      pushToCloud: async () => {
        if (!get().syncEnabled) return;
        const supabase = getSupabase();
        if (!supabase) return;
        const username = getCurrentUsername();
        if (!username) return;
        const total = get().totalStudySeconds;
        // 无变化则跳过
        if (total === get().lastSyncedSeconds) return;
        try {
          await (supabase.from("user_settings") as any).upsert(
            {
              username,
              total_seconds: total,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "username" },
          );
          set({ lastSyncedSeconds: total });
        } catch (e) {
          console.error("[云同步] 学习时长推送异常:", e);
        }
      },
    }),
    {
      name: "wordgrid-settings",
      version: 1,
      // 旧版本（version 0）默认 ttsVolume=1，迁移到 0.5
      // 这样已有用户也会降到 50%，新用户直接是 0.5
      migrate: () => ({
        ttsVolume: 0.5,
        trackStudyTime: false,
        totalStudySeconds: 0,
        lastActivityAt: Date.now(),
        lastSyncedSeconds: 0,
        syncEnabled: !import.meta.env.DEV,
      }),
      partialize: (s) => ({
        ttsVolume: s.ttsVolume,
        trackStudyTime: s.trackStudyTime,
        totalStudySeconds: s.totalStudySeconds,
      }),
    },
  ),
);

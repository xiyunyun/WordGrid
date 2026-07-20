/**
 * 主题色彩 Store
 *
 * - 持久化当前主题 id 与自定义色相（localStorage）
 * - 提供 apply() 方法，将当前主题的 CSS 变量写入 :root
 * - 自定义色相启用时，覆盖当前主题的强调色（不影响纸张/墨色）
 *
 * 用法：
 *   const { themeId, customHue, setTheme, setCustomHue } = useThemeStore();
 *   useEffect(() => useThemeStore.getState().apply(), [themeId, customHue]);
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  THEMES,
  DEFAULT_THEME_ID,
  getThemeById,
  applyCustomHue,
  type Theme,
} from "@/lib/themes";
import { getThemeTexture } from "@/lib/themeTextures";

export interface ThemeState {
  /** 当前主题 id */
  themeId: string;
  /** 自定义色相（0-360）。null 表示使用主题默认色相 */
  customHue: number | null;
  /** 切换主题 */
  setTheme: (id: string) => void;
  /** 设置自定义色相，null 表示禁用 */
  setCustomHue: (hue: number | null) => void;
  /** 重置为默认主题 + 清除自定义色相 */
  reset: () => void;
  /** 将当前主题应用到 :root（写入 CSS 变量） */
  apply: () => void;
  /** 获取当前生效的 Theme 对象（不含自定义色相） */
  getTheme: () => Theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: DEFAULT_THEME_ID,
      customHue: null,

      setTheme: (id) => {
        set({ themeId: id });
        // 切换主题后立即应用
        queueMicrotask(() => get().apply());
      },

      setCustomHue: (hue) => {
        set({ customHue: hue });
        queueMicrotask(() => get().apply());
      },

      reset: () => {
        set({ themeId: DEFAULT_THEME_ID, customHue: null });
        queueMicrotask(() => get().apply());
      },

      apply: () => {
        const { themeId, customHue } = get();
        const base = getThemeById(themeId);
        const vars =
          customHue !== null ? applyCustomHue(base, customHue) : base.vars;
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
          root.style.setProperty(key, value);
        }
        // 同步 --c-accent-note 跟随 gold
        root.style.setProperty("--c-accent-note", vars["--c-accent-gold"]);
        // 应用主题对应的背景纹理（径向光晕 + 图案 + 噪点）
        // 自定义色相模式下沿用基础主题的纹理，仅强调色变化
        document.body.style.backgroundImage = getThemeTexture(base);
      },

      getTheme: () => getThemeById(get().themeId),
    }),
    {
      name: "wordgrid-theme",
      // 仅持久化数据字段，不持久化方法
      partialize: (s) => ({ themeId: s.themeId, customHue: s.customHue }),
      // hydrate 后立即应用主题，避免首屏闪烁
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 在下一个微任务中应用，确保 DOM 已就绪
          queueMicrotask(() => state.apply());
        }
      },
    },
  ),
);

/** 所有主题列表（供 UI 渲染） */
export const ALL_THEMES: Theme[] = THEMES;

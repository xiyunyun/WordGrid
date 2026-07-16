/**
 * 单词块显示内容开关
 *
 * 用于 DailyGrid 工具栏的"显示设置"面板，控制 WordCell 中各信息行的显隐。
 * - 单词本身永远显示，不在开关范围内
 * - 其他项（词性/音标/词意/记忆阶段/笔记）可独立开关
 * - 状态持久化到 localStorage，跨会话保持
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DisplaySettingsState {
  /** 显示词性 */
  showPos: boolean;
  /** 显示音标 */
  showPhonetic: boolean;
  /** 显示词意 */
  showMeaning: boolean;
  /** 显示记忆阶段标签 */
  showStage: boolean;
  /** 显示笔记预览 */
  showNote: boolean;
  /** 切换某一项 */
  toggle: (key: "showPos" | "showPhonetic" | "showMeaning" | "showStage" | "showNote") => void;
  /** 一键显示全部 */
  showAll: () => void;
}

export const useDisplaySettingsStore = create<DisplaySettingsState>()(
  persist(
    (set) => ({
      showPos: true,
      showPhonetic: true,
      showMeaning: true,
      showStage: true,
      showNote: true,
      toggle: (key) => set((s) => ({ [key]: !s[key] } as Partial<DisplaySettingsState>)),
      showAll: () =>
        set({
          showPos: true,
          showPhonetic: true,
          showMeaning: true,
          showStage: true,
          showNote: true,
        }),
    }),
    { name: "wordgrid-display-settings" },
  ),
);

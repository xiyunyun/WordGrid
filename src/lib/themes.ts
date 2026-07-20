/**
 * 主题色彩定义
 *
 * 每个主题定义：
 *   - 11 个 CSS 变量值（HSL 格式，不带 hsl() 包裹）：
 *     * paper / paper-warm / paper-card / paper-deep：纸张底色阶
 *     * ink / ink-soft / ink-muted / ink-light：墨色阶
 *     * accent-red / accent-green / accent-gold：强调色（生词/已掌握/烫金）
 *   - texture：背景纹理预设键（见 themeTextures.ts），决定径向光晕、图案、噪点风格
 *
 * 主题切换时，由 store/theme.ts 将这些值写入 :root 的 CSS 变量，
 * 并把对应纹理写入 body 的 background-image。
 *
 * 主题设计原则：
 *   1. 浅色主题：纸张色保持高亮度（85%+ L），墨色保持低亮度（10–25% L）
 *   2. 深色主题（midnight）：纸张色低亮度（10–20% L），墨色高亮度（80–90% L）
 *   3. 强调色与主题色相和谐，用于按钮/高亮/标记
 *   4. 每个主题都搭配独特的纹理质感，避免"批量换色"感
 */

import type { TextureKey } from "@/lib/themeTextures";

export interface Theme {
  /** 主题唯一标识 */
  id: string;
  /** 主题中文名 */
  name: string;
  /** 主题英文名 */
  nameEn: string;
  /** 主题简短描述 */
  description: string;
  /** 背景纹理预设键 */
  texture: TextureKey;
  /** CSS 变量值映射 */
  vars: {
    "--c-paper": string;
    "--c-paper-warm": string;
    "--c-paper-card": string;
    "--c-paper-deep": string;
    "--c-ink": string;
    "--c-ink-soft": string;
    "--c-ink-muted": string;
    "--c-ink-light": string;
    "--c-accent-red": string;
    "--c-accent-green": string;
    "--c-accent-gold": string;
  };
}

export const THEMES: Theme[] = [
  // ============ 默认主题：纸张墨韵 ============
  {
    id: "paper",
    name: "纸张墨韵",
    nameEn: "Paper & Ink",
    description: "暖奶油纸张配深墨黑字，赭石红与烫金为强调",
    texture: "paper",
    vars: {
      "--c-paper": "42 30% 93%",
      "--c-paper-warm": "42 27% 89%",
      "--c-paper-card": "43 33% 96%",
      "--c-paper-deep": "43 33% 85%",
      "--c-ink": "0 0% 10%",
      "--c-ink-soft": "60 3% 22%",
      "--c-ink-muted": "39 7% 39%",
      "--c-ink-light": "37 9% 51%",
      "--c-accent-red": "11 56% 51%",
      "--c-accent-green": "144 19% 30%",
      "--c-accent-gold": "43 89% 38%",
    },
  },

  // ============ 羊皮古卷 - 老化羊皮纸感 ============
  {
    id: "parchment",
    name: "羊皮古卷",
    nameEn: "Parchment Scroll",
    description: "做旧羊皮纸配深褐墨，琥珀光晕与边缘老化晕染",
    texture: "parchment",
    vars: {
      "--c-paper": "36 38% 88%",
      "--c-paper-warm": "32 36% 84%",
      "--c-paper-card": "38 40% 92%",
      "--c-paper-deep": "30 35% 78%",
      "--c-ink": "25 35% 12%",
      "--c-ink-soft": "25 28% 22%",
      "--c-ink-muted": "30 18% 38%",
      "--c-ink-light": "35 18% 50%",
      "--c-accent-red": "18 65% 42%",
      "--c-accent-green": "95 28% 28%",
      "--c-accent-gold": "33 82% 38%",
    },
  },

  // ============ 林间书桌 - 苔绿冷调 ============
  {
    id: "forest",
    name: "林间书桌",
    nameEn: "Forest Desk",
    description: "苔绿冷调纸配深松墨色，森林绿与琥珀强调",
    texture: "forest",
    vars: {
      "--c-paper": "85 22% 92%",
      "--c-paper-warm": "80 20% 88%",
      "--c-paper-card": "85 25% 95%",
      "--c-paper-deep": "85 22% 83%",
      "--c-ink": "150 22% 12%",
      "--c-ink-soft": "150 16% 22%",
      "--c-ink-muted": "140 12% 38%",
      "--c-ink-light": "100 14% 50%",
      "--c-accent-red": "20 65% 48%",
      "--c-accent-green": "145 38% 28%",
      "--c-accent-gold": "38 75% 38%",
    },
  },

  // ============ 子夜静读 - 深色反转 ============
  {
    id: "midnight",
    name: "子夜静读",
    nameEn: "Midnight Reader",
    description: "深墨蓝纸配奶白银墨，星点光斑与霓虹金强调",
    texture: "midnight",
    vars: {
      "--c-paper": "225 35% 12%",
      "--c-paper-warm": "225 30% 16%",
      "--c-paper-card": "225 38% 16%",
      "--c-paper-deep": "225 32% 20%",
      "--c-ink": "40 30% 90%",
      "--c-ink-soft": "40 22% 78%",
      "--c-ink-muted": "40 14% 62%",
      "--c-ink-light": "45 12% 50%",
      "--c-accent-red": "10 75% 62%",
      "--c-accent-green": "150 50% 58%",
      "--c-accent-gold": "45 85% 62%",
    },
  },

  // ============ 远洋日志 - 冷青海蓝 ============
  {
    id: "ocean",
    name: "远洋日志",
    nameEn: "Ocean Journal",
    description: "冷青纸张配深海军墨，波浪纹理与海蓝珊瑚强调",
    texture: "ocean",
    vars: {
      "--c-paper": "200 24% 93%",
      "--c-paper-warm": "195 22% 89%",
      "--c-paper-card": "200 30% 96%",
      "--c-paper-deep": "200 24% 84%",
      "--c-ink": "210 38% 14%",
      "--c-ink-soft": "210 30% 24%",
      "--c-ink-muted": "210 18% 40%",
      "--c-ink-light": "205 18% 52%",
      "--c-accent-red": "8 72% 52%",
      "--c-accent-green": "165 48% 30%",
      "--c-accent-gold": "195 72% 42%",
    },
  },

  // ============ 玫瑰信笺 - 浪漫信纸 ============
  {
    id: "rose",
    name: "玫瑰信笺",
    nameEn: "Rose Letter",
    description: "玫瑰粉纸配深紫墨，花瓣点缀与玫红强调",
    texture: "rose",
    vars: {
      "--c-paper": "340 28% 94%",
      "--c-paper-warm": "335 24% 90%",
      "--c-paper-card": "340 32% 96%",
      "--c-paper-deep": "340 28% 85%",
      "--c-ink": "320 28% 14%",
      "--c-ink-soft": "320 22% 24%",
      "--c-ink-muted": "320 14% 40%",
      "--c-ink-light": "330 16% 52%",
      "--c-accent-red": "345 72% 50%",
      "--c-accent-green": "160 35% 35%",
      "--c-accent-gold": "285 55% 48%",
    },
  },

  // ============ 炭笔素描 - 中性灰阶 ============
  {
    id: "charcoal",
    name: "炭笔素描",
    nameEn: "Charcoal Sketch",
    description: "中性灰纸配炭灰墨，铅笔排线纹理与赭红强调",
    texture: "charcoal",
    vars: {
      "--c-paper": "220 8% 94%",
      "--c-paper-warm": "220 6% 90%",
      "--c-paper-card": "220 12% 97%",
      "--c-paper-deep": "220 8% 85%",
      "--c-ink": "220 10% 14%",
      "--c-ink-soft": "220 8% 24%",
      "--c-ink-muted": "220 6% 40%",
      "--c-ink-light": "220 6% 52%",
      "--c-accent-red": "5 60% 48%",
      "--c-accent-green": "200 22% 38%",
      "--c-accent-gold": "210 28% 42%",
    },
  },

  // ============ 紫藤诗笺 - 紫罗兰文学 ============
  {
    id: "wisteria",
    name: "紫藤诗笺",
    nameEn: "Wisteria Poem",
    description: "浅紫罗兰纸配深紫墨，墨韵水痕与紫罗兰强调",
    texture: "wisteria",
    vars: {
      "--c-paper": "270 24% 93%",
      "--c-paper-warm": "268 22% 89%",
      "--c-paper-card": "270 30% 96%",
      "--c-paper-deep": "270 24% 84%",
      "--c-ink": "275 32% 14%",
      "--c-ink-soft": "275 24% 24%",
      "--c-ink-muted": "275 16% 40%",
      "--c-ink-light": "275 16% 52%",
      "--c-accent-red": "325 68% 50%",
      "--c-accent-green": "155 32% 38%",
      "--c-accent-gold": "280 58% 48%",
    },
  },

  // ============ 落日手记 - 暖橙日落 ============
  {
    id: "sunset",
    name: "落日手记",
    nameEn: "Sunset Diary",
    description: "暖桃纸配深褐墨，落日晕染与橙红金黄强调",
    texture: "sunset",
    vars: {
      "--c-paper": "28 38% 91%",
      "--c-paper-warm": "22 35% 87%",
      "--c-paper-card": "28 42% 95%",
      "--c-paper-deep": "28 33% 82%",
      "--c-ink": "20 38% 14%",
      "--c-ink-soft": "20 28% 24%",
      "--c-ink-muted": "22 18% 40%",
      "--c-ink-light": "28 18% 52%",
      "--c-accent-red": "12 78% 50%",
      "--c-accent-green": "120 28% 32%",
      "--c-accent-gold": "32 92% 45%",
    },
  },
];

export const DEFAULT_THEME_ID = "paper";

/** 根据 id 查找主题，找不到则返回默认主题 */
export function getThemeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * 将自定义色相应用到主题，生成一组新的 CSS 变量
 *
 * 策略：以选定的主题为基础，将三个强调色的色相统一旋转到指定 hue，
 * 同时保持纸张和墨色不变（避免破坏可读性）。
 * - accent-gold → 直接使用选定 hue
 * - accent-red → hue + 30（暖侧）
 * - accent-green → hue - 60（冷侧，回正到绿色区域）
 *
 * 饱和度和亮度沿用当前主题的设定，保证视觉风格统一。
 */
export function applyCustomHue(base: Theme, hue: number): Theme["vars"] {
  const baseGoldHsl = base.vars["--c-accent-gold"].split(" ");
  const goldS = baseGoldHsl[1].replace("%", "");
  const goldL = baseGoldHsl[2].replace("%", "");

  const baseRedHsl = base.vars["--c-accent-red"].split(" ");
  const redS = baseRedHsl[1].replace("%", "");
  const redL = baseRedHsl[2].replace("%", "");

  const baseGreenHsl = base.vars["--c-accent-green"].split(" ");
  const greenS = baseGreenHsl[1].replace("%", "");
  const greenL = baseGreenHsl[2].replace("%", "");

  const norm = (h: number) => ((h % 360) + 360) % 360;

  return {
    ...base.vars,
    "--c-accent-gold": `${norm(hue)} ${goldS}% ${goldL}%`,
    "--c-accent-red": `${norm(hue + 30)} ${redS}% ${redL}%`,
    "--c-accent-green": `${norm(hue - 60)} ${greenS}% ${greenL}%`,
  };
}

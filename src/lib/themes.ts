/**
 * 主题色彩定义
 *
 * 每个主题定义：
 *   - 11 个 CSS 变量值（HSL 格式，不带 hsl() 包裹）：
 *     * paper / paper-warm / paper-card / paper-deep：纸张底色阶
 *     * ink / ink-ink-soft / ink-muted / ink-light：墨色阶
 *     * accent-red / accent-green / accent-gold：强调色（生词/已掌握/烫金）
 *   - texture：背景纹理预设键（见 themeTextures.ts），决定径向光晕、图案、噪点风格
 *
 * 主题切换时，由 store/theme.ts 将这些值写入 :root 的 CSS 变量，
 * 并把对应纹理写入 body 的 background-image。
 *
 * 主题设计原则（v2.3.2 修复主题一体化）：
 *   1. 浅色主题：纸张亮度 94–96%，墨色 8–11%，形成强对比
 *   2. 深色主题（midnight）：纸张亮度 8–10%，墨色 92–95%
 *   3. 强调色饱和度 70–90%，亮度保持中等，确保视觉冲击力
 *   4. 每个主题搭配独特的纹理质感（光晕透明度 0.08–0.28，噪点 0.08–0.12）
 *   5. ⚠️ paper-card 亮度必须低于 paper（约低 4–5%），否则在浅色主题中
 *      paper-card 亮度 ≥ 95% 会近似纯白，造成卡片背景与主题脱节（v2.3.1 bug）
 *      修复后 paper-card 亮度调至 88–92%，使卡片呈现可见的主题色调
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
      "--c-paper": "42 32% 96%",
      "--c-paper-warm": "42 28% 92%",
      "--c-paper-card": "43 36% 92%",
      "--c-paper-deep": "43 35% 86%",
      "--c-ink": "0 0% 8%",
      "--c-ink-soft": "60 4% 18%",
      "--c-ink-muted": "39 9% 35%",
      "--c-ink-light": "37 12% 50%",
      "--c-accent-red": "11 68% 48%",
      "--c-accent-green": "144 28% 28%",
      "--c-accent-gold": "43 92% 42%",
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
      "--c-paper": "36 42% 92%",
      "--c-paper-warm": "32 38% 88%",
      "--c-paper-card": "38 44% 88%",
      "--c-paper-deep": "30 38% 80%",
      "--c-ink": "25 42% 8%",
      "--c-ink-soft": "25 32% 18%",
      "--c-ink-muted": "30 22% 35%",
      "--c-ink-light": "35 22% 50%",
      "--c-accent-red": "18 72% 40%",
      "--c-accent-green": "95 38% 25%",
      "--c-accent-gold": "33 88% 38%",
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
      "--c-paper": "85 28% 95%",
      "--c-paper-warm": "80 24% 91%",
      "--c-paper-card": "85 32% 91%",
      "--c-paper-deep": "85 28% 84%",
      "--c-ink": "150 30% 8%",
      "--c-ink-soft": "150 22% 18%",
      "--c-ink-muted": "140 18% 35%",
      "--c-ink-light": "100 18% 48%",
      "--c-accent-red": "20 72% 45%",
      "--c-accent-green": "145 48% 25%",
      "--c-accent-gold": "38 82% 38%",
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
      "--c-paper": "225 45% 9%",
      "--c-paper-warm": "225 38% 13%",
      "--c-paper-card": "225 48% 13%",
      "--c-paper-deep": "225 42% 17%",
      "--c-ink": "40 38% 94%",
      "--c-ink-soft": "40 28% 80%",
      "--c-ink-muted": "40 18% 62%",
      "--c-ink-light": "45 16% 48%",
      "--c-accent-red": "10 82% 62%",
      "--c-accent-green": "150 60% 58%",
      "--c-accent-gold": "45 92% 62%",
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
      "--c-paper": "200 30% 95%",
      "--c-paper-warm": "195 26% 91%",
      "--c-paper-card": "200 36% 91%",
      "--c-paper-deep": "200 30% 84%",
      "--c-ink": "210 48% 8%",
      "--c-ink-soft": "210 38% 18%",
      "--c-ink-muted": "210 24% 35%",
      "--c-ink-light": "205 24% 50%",
      "--c-accent-red": "8 82% 50%",
      "--c-accent-green": "165 58% 28%",
      "--c-accent-gold": "195 82% 42%",
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
      "--c-paper": "340 34% 95%",
      "--c-paper-warm": "335 28% 91%",
      "--c-paper-card": "340 38% 91%",
      "--c-paper-deep": "340 34% 84%",
      "--c-ink": "320 38% 8%",
      "--c-ink-soft": "320 30% 18%",
      "--c-ink-muted": "320 18% 35%",
      "--c-ink-light": "330 20% 50%",
      "--c-accent-red": "345 82% 48%",
      "--c-accent-green": "160 38% 30%",
      "--c-accent-gold": "285 68% 48%",
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
      "--c-paper": "220 10% 96%",
      "--c-paper-warm": "220 8% 92%",
      "--c-paper-card": "220 14% 92%",
      "--c-paper-deep": "220 10% 85%",
      "--c-ink": "220 12% 8%",
      "--c-ink-soft": "220 10% 18%",
      "--c-ink-muted": "220 8% 35%",
      "--c-ink-light": "220 8% 50%",
      "--c-accent-red": "5 72% 45%",
      "--c-accent-green": "200 28% 35%",
      "--c-accent-gold": "210 35% 40%",
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
      "--c-paper": "270 30% 95%",
      "--c-paper-warm": "268 26% 91%",
      "--c-paper-card": "270 36% 91%",
      "--c-paper-deep": "270 30% 84%",
      "--c-ink": "275 42% 8%",
      "--c-ink-soft": "275 32% 18%",
      "--c-ink-muted": "275 22% 35%",
      "--c-ink-light": "275 22% 50%",
      "--c-accent-red": "325 78% 48%",
      "--c-accent-green": "155 38% 32%",
      "--c-accent-gold": "280 72% 48%",
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
      "--c-paper": "28 46% 94%",
      "--c-paper-warm": "22 42% 90%",
      "--c-paper-card": "28 50% 90%",
      "--c-paper-deep": "28 40% 83%",
      "--c-ink": "20 48% 8%",
      "--c-ink-soft": "20 38% 18%",
      "--c-ink-muted": "22 25% 35%",
      "--c-ink-light": "28 25% 50%",
      "--c-accent-red": "12 88% 48%",
      "--c-accent-green": "120 38% 28%",
      "--c-accent-gold": "32 95% 45%",
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

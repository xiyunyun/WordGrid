/**
 * 主题色彩定义
 *
 * 每个主题定义 11 个 CSS 变量值（HSL 格式，不带 hsl() 包裹）：
 * - paper / paper-warm / paper-card / paper-deep：纸张底色阶
 * - ink / ink-soft / ink-muted / ink-light：墨色阶
 * - accent-red / accent-green / accent-gold：强调色（生词/已掌握/烫金）
 *
 * 主题切换时，由 store/theme.ts 将这些值写入 :root 的 CSS 变量。
 * 主题设计原则：
 *   1. 纸张色保持高亮度（85%+ L），保证正文可读性
 *   2. 墨色保持低亮度（10–25% L），与纸张形成强对比
 *   3. 强调色与主题色相和谐，用于按钮/高亮/标记
 *   4. 整体保持"学术笔记本"质感，不刺眼
 */

export interface Theme {
  /** 主题唯一标识 */
  id: string;
  /** 主题中文名 */
  name: string;
  /** 主题英文名 */
  nameEn: string;
  /** 主题简短描述 */
  description: string;
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
  {
    id: "paper",
    name: "纸张墨韵",
    nameEn: "Paper & Ink",
    description: "暖奶油纸张配深墨黑字，赭石红与烫金为强调",
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
  {
    id: "forest",
    name: "林间晨曦",
    nameEn: "Forest Dawn",
    description: "苔绿纸张配深松墨色，森林绿与琥珀强调",
    vars: {
      "--c-paper": "85 22% 92%",
      "--c-paper-warm": "80 20% 88%",
      "--c-paper-card": "85 25% 95%",
      "--c-paper-deep": "85 22% 83%",
      "--c-ink": "150 18% 12%",
      "--c-ink-soft": "150 14% 22%",
      "--c-ink-muted": "140 10% 38%",
      "--c-ink-light": "100 12% 50%",
      "--c-accent-red": "20 65% 48%",
      "--c-accent-green": "145 35% 30%",
      "--c-accent-gold": "38 75% 40%",
    },
  },
  {
    id: "rose",
    name: "暮色玫瑰",
    nameEn: "Twilight Rose",
    description: "浅玫瑰纸配深紫墨，玫红与紫罗兰强调",
    vars: {
      "--c-paper": "340 25% 94%",
      "--c-paper-warm": "335 22% 90%",
      "--c-paper-card": "340 30% 96%",
      "--c-paper-deep": "340 25% 85%",
      "--c-ink": "320 25% 14%",
      "--c-ink-soft": "320 20% 24%",
      "--c-ink-muted": "320 12% 40%",
      "--c-ink-light": "330 14% 52%",
      "--c-accent-red": "345 70% 50%",
      "--c-accent-green": "160 35% 35%",
      "--c-accent-gold": "285 55% 48%",
    },
  },
  {
    id: "ocean",
    name: "深海沉静",
    nameEn: "Ocean Depth",
    description: "淡青纸配深海军墨，海洋蓝与珊瑚红强调",
    vars: {
      "--c-paper": "200 22% 93%",
      "--c-paper-warm": "195 20% 89%",
      "--c-paper-card": "200 28% 96%",
      "--c-paper-deep": "200 22% 84%",
      "--c-ink": "210 35% 14%",
      "--c-ink-soft": "210 28% 24%",
      "--c-ink-muted": "210 16% 40%",
      "--c-ink-light": "205 16% 52%",
      "--c-accent-red": "8 70% 52%",
      "--c-accent-green": "165 45% 32%",
      "--c-accent-gold": "195 70% 42%",
    },
  },
  {
    id: "amber",
    name: "古道茶香",
    nameEn: "Ancient Tea",
    description: "暖棕纸配深褐墨，琥珀金与赭石红强调",
    vars: {
      "--c-paper": "32 28% 91%",
      "--c-paper-warm": "28 25% 87%",
      "--c-paper-card": "32 32% 95%",
      "--c-paper-deep": "32 26% 82%",
      "--c-ink": "25 30% 12%",
      "--c-ink-soft": "25 22% 22%",
      "--c-ink-muted": "28 14% 40%",
      "--c-ink-light": "32 14% 52%",
      "--c-accent-red": "15 60% 48%",
      "--c-accent-green": "100 22% 32%",
      "--c-accent-gold": "35 85% 40%",
    },
  },
  {
    id: "snow",
    name: "极简雪夜",
    nameEn: "Snowy Night",
    description: "纯净白纸配炭灰墨，银灰与冷蓝强调",
    vars: {
      "--c-paper": "220 15% 96%",
      "--c-paper-warm": "220 12% 92%",
      "--c-paper-card": "220 20% 98%",
      "--c-paper-deep": "220 12% 88%",
      "--c-ink": "220 16% 14%",
      "--c-ink-soft": "220 12% 24%",
      "--c-ink-muted": "220 8% 42%",
      "--c-ink-light": "220 8% 55%",
      "--c-accent-red": "355 60% 50%",
      "--c-accent-green": "200 30% 38%",
      "--c-accent-gold": "210 55% 48%",
    },
  },
  {
    id: "midnight",
    name: "夜阑人静",
    nameEn: "Midnight",
    description: "深墨蓝纸配浅银墨，反转配色，适合夜间阅读",
    vars: {
      "--c-paper": "225 30% 14%",
      "--c-paper-warm": "225 26% 18%",
      "--c-paper-card": "225 32% 18%",
      "--c-paper-deep": "225 28% 22%",
      "--c-ink": "40 25% 88%",
      "--c-ink-soft": "40 18% 75%",
      "--c-ink-muted": "40 12% 60%",
      "--c-ink-light": "45 10% 50%",
      "--c-accent-red": "10 70% 60%",
      "--c-accent-green": "150 45% 55%",
      "--c-accent-gold": "45 80% 60%",
    },
  },
  {
    id: "wisteria",
    name: "紫藤夜话",
    nameEn: "Wisteria Whisper",
    description: "浅紫罗兰纸配深紫墨，紫罗兰与品红强调",
    vars: {
      "--c-paper": "270 22% 93%",
      "--c-paper-warm": "268 20% 89%",
      "--c-paper-card": "270 27% 96%",
      "--c-paper-deep": "270 22% 84%",
      "--c-ink": "275 30% 14%",
      "--c-ink-soft": "275 22% 24%",
      "--c-ink-muted": "275 14% 40%",
      "--c-ink-light": "275 14% 52%",
      "--c-accent-red": "325 65% 50%",
      "--c-accent-green": "155 30% 38%",
      "--c-accent-gold": "280 55% 48%",
    },
  },
  {
    id: "sunset",
    name: "落日余晖",
    nameEn: "Sunset Glow",
    description: "暖橙纸配深褐墨，橙红与金黄强调",
    vars: {
      "--c-paper": "28 35% 92%",
      "--c-paper-warm": "22 32% 88%",
      "--c-paper-card": "28 38% 95%",
      "--c-paper-deep": "28 30% 83%",
      "--c-ink": "20 35% 14%",
      "--c-ink-soft": "20 25% 24%",
      "--c-ink-muted": "22 16% 40%",
      "--c-ink-light": "28 16% 52%",
      "--c-accent-red": "12 75% 50%",
      "--c-accent-green": "120 25% 35%",
      "--c-accent-gold": "32 90% 45%",
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

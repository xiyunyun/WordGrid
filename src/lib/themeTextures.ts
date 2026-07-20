/**
 * 主题背景纹理预设
 *
 * 每个预设是一段 CSS background-image 值，可包含多层叠加：
 *   1. 径向渐变层（color tint，跟随主题色变量）
 *   2. 可选特殊图案层（如星点、波浪、斜线等，主题独特质感）
 *   3. 噪点层（SVG fractalNoise，色调匹配主题）
 *
 * 使用方式：由 store/theme.ts 在 apply() 时根据当前主题的 texture 字段
 * 选取对应预设，写入 document.body.style.backgroundImage。
 *
 * 设计原则：
 *   - 纹理应"看得见但不抢戏"，opacity 控制在 0.03–0.10
 *   - 噪点颜色矩阵（feColorMatrix）按主题色相调色
 *   - 深色主题（midnight）使用亮色噪点（反转）
 */
import type { Theme } from "@/lib/themes";

/** 主题纹理键 */
export type TextureKey =
  | "paper"
  | "parchment"
  | "forest"
  | "midnight"
  | "ocean"
  | "rose"
  | "charcoal"
  | "wisteria"
  | "sunset";

/**
 * 生成 SVG fractalNoise 数据 URL
 *
 * @param colorMatrix - SVG feColorMatrix values 字符串（4×5 矩阵，空格分隔）
 * @param opacity     - 整体不透明度（0-1）
 * @param size        - 噪点 tile 尺寸（px），默认 160
 * @param baseFreq    - 噪点基础频率，越小颗粒越粗，默认 0.85
 */
function noise(
  colorMatrix: string,
  opacity = 0.04,
  size = 160,
  baseFreq = 0.85,
): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${baseFreq}' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='${colorMatrix}'/></filter><rect width='${size}' height='${size}' filter='url(%23n)' opacity='${opacity}'/></svg>`;
  // 编码：将 < > # 等字符转为 URL 安全形式
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, "/")}")`;
}

/** 生成 SVG 圆点矩阵数据 URL（用于午夜星点、玫瑰花瓣等） */
function dots(
  count: number,
  colorMatrix: string,
  opacity = 0.08,
  size = 240,
): string {
  // 在 size×size 范围内随机分布 count 个圆点
  const seed = 1234; // 固定种子保证视觉一致
  let rng = seed;
  const rand = () => {
    rng = (rng * 9301 + 49297) % 233280;
    return rng / 233280;
  };
  const dotsArr = Array.from({ length: count }, () => ({
    cx: Math.round(rand() * size),
    cy: Math.round(rand() * size),
    r: 0.5 + rand() * 1.2,
  }));
  const dotsSvg = dotsArr
    .map((d) => `<circle cx='${d.cx}' cy='${d.cy}' r='${d.r}'/>`)
    .join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><filter id='dot'><feColorMatrix values='${colorMatrix}'/></filter><g filter='url(%23dot)' opacity='${opacity}'>${dotsSvg}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, "/")}")`;
}

/** 生成 SVG 平行斜线纹理（用于炭笔素描） */
function hatching(
  colorMatrix: string,
  opacity = 0.05,
  size = 160,
  angle = 45,
  spacing = 8,
): string {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * spacing;
  const dy = Math.sin(rad) * spacing;
  const lines = [];
  // 沿垂直于线方向密集排布
  for (let i = -size; i < size * 2; i += spacing) {
    const x1 = i - Math.sin(rad) * size;
    const y1 = i + Math.cos(rad) * size;
    const x2 = i + Math.sin(rad) * size;
    const y2 = i - Math.cos(rad) * size;
    lines.push(
      `<line x1='${x1.toFixed(1)}' y1='${y1.toFixed(1)}' x2='${x2.toFixed(1)}' y2='${y2.toFixed(1)}' stroke-width='0.5'/>`,
    );
    void dx;
    void dy;
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><filter id='h'><feColorMatrix values='${colorMatrix}'/></filter><g filter='url(%23h)' opacity='${opacity}' stroke='currentColor'>${lines.join("")}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, "/")}")`;
}

/** 生成 SVG 波浪线纹理（用于远洋日志） */
function waves(
  colorMatrix: string,
  opacity = 0.06,
  size = 200,
): string {
  const path = Array.from({ length: 6 }, (_, i) => {
    const y = 30 + i * 30;
    return `M0,${y} Q${size / 4},${y - 10} ${size / 2},${y} T${size},${y}`;
  }).join(" ");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><filter id='w'><feColorMatrix values='${colorMatrix}'/></filter><g filter='url(%23w)' opacity='${opacity}' fill='none' stroke='currentColor' stroke-width='0.8'>${path.split("M").filter(Boolean).map((p) => `<path d="M${p}" />`).join("")}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, "/")}")`;
}

/** 生成 SVG 大块墨晕纹理（用于紫藤诗笺的"墨韵水痕"） */
function inkBlots(
  colorMatrix: string,
  opacity = 0.08,
  size = 280,
): string {
  const blots = [
    { cx: 70, cy: 50, r: 40 },
    { cx: 210, cy: 90, r: 55 },
    { cx: 140, cy: 200, r: 45 },
    { cx: 30, cy: 220, r: 30 },
    { cx: 250, cy: 250, r: 35 },
  ];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'><filter id='b'><feColorMatrix values='${colorMatrix}'/><feGaussianBlur stdDeviation='8'/></filter><g filter='url(%23b)' opacity='${opacity}'>${blots.map((b) => `<circle cx='${b.cx}' cy='${b.cy}' r='${b.r}'/>`).join("")}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/%2F/g, "/")}")`;
}

/** 纹理预设：键 → CSS background-image 值 */
export const THEME_TEXTURES: Record<TextureKey, string> = {
  /** 纸张墨韵 - 默认暖奶油纸，强烈金色与赭红光晕，细密噪点 */
  paper: [
    "radial-gradient(circle at 20% 10%, hsl(var(--c-accent-gold) / 0.10) 0%, transparent 45%)",
    "radial-gradient(circle at 80% 80%, hsl(var(--c-accent-red) / 0.08) 0%, transparent 50%)",
    noise("0 0 0 0 0.4 0 0 0 0 0.36 0 0 0 0 0.3 0 0 0 0.08 0", 0.08),
  ].join(", "),

  /** 羊皮古卷 - 强化琥珀光晕与边缘老化，明显羊皮纹理 */
  parchment: [
    "radial-gradient(ellipse at 30% 20%, hsl(var(--c-accent-gold) / 0.18) 0%, transparent 60%)",
    "radial-gradient(ellipse at 70% 80%, hsl(var(--c-accent-red) / 0.12) 0%, transparent 65%)",
    "radial-gradient(circle at 50% 50%, transparent 35%, hsl(var(--c-paper-deep) / 0.30) 100%)",
    noise("0 0 0 0 0.5 0 0 0 0 0.42 0 0 0 0 0.28 0 0 0 0.12 0", 0.12, 180, 0.7),
  ].join(", "),

  /** 林间书桌 - 苔绿光晕，绿调噪点 */
  forest: [
    "radial-gradient(circle at 25% 15%, hsl(var(--c-accent-green) / 0.14) 0%, transparent 55%)",
    "radial-gradient(circle at 75% 75%, hsl(var(--c-accent-gold) / 0.10) 0%, transparent 55%)",
    noise("0 0 0 0 0.28 0 0 0 0 0.35 0 0 0 0 0.22 0 0 0 0.10 0", 0.10, 160, 0.85),
  ].join(", "),

  /** 子夜静读 - 反转深色：奶白墨色噪点 + 星点光斑 */
  midnight: [
    "radial-gradient(circle at 20% 30%, hsl(var(--c-accent-gold) / 0.18) 0%, transparent 50%)",
    "radial-gradient(circle at 80% 70%, hsl(var(--c-accent-red) / 0.12) 0%, transparent 55%)",
    dots(120, "0 0 0 0 0.95 0 0 0 0 0.92 0 0 0 0 0.85 0 0 0 1 0", 0.25, 320),
    noise("0 0 0 0 0.85 0 0 0 0 0.82 0 0 0 0 0.75 0 0 0 0.10 0", 0.10, 200, 0.95),
  ].join(", "),

  /** 远洋日志 - 冷青光晕 + 波浪线纹理 */
  ocean: [
    "radial-gradient(circle at 25% 20%, hsl(var(--c-accent-gold) / 0.12) 0%, transparent 55%)",
    "radial-gradient(circle at 75% 80%, hsl(var(--c-accent-red) / 0.08) 0%, transparent 55%)",
    waves("0 0 0 0 0.20 0 0 0 0 0.32 0 0 0 0 0.42 0 0 0 0.8 0", 0.18, 220),
    noise("0 0 0 0 0.25 0 0 0 0 0.34 0 0 0 0 0.42 0 0 0 0.08 0", 0.08, 160, 0.85),
  ].join(", "),

  /** 玫瑰信笺 - 玫红光晕 + 花瓣点缀 */
  rose: [
    "radial-gradient(circle at 20% 15%, hsl(var(--c-accent-red) / 0.12) 0%, transparent 55%)",
    "radial-gradient(circle at 80% 85%, hsl(var(--c-accent-gold) / 0.10) 0%, transparent 55%)",
    dots(60, "0 0 0 0 0.65 0 0 0 0 0.35 0 0 0 0 0.50 0 0 0 1 0", 0.16, 280),
    noise("0 0 0 0 0.55 0 0 0 0 0.32 0 0 0 0 0.42 0 0 0 0.08 0", 0.08, 160, 0.85),
  ].join(", "),

  /** 炭笔素描 - 中性灰 + 斜线纹理（素描排线感） */
  charcoal: [
    "radial-gradient(circle at 30% 20%, hsl(var(--c-ink) / 0.08) 0%, transparent 55%)",
    "radial-gradient(circle at 70% 80%, hsl(var(--c-ink-light) / 0.10) 0%, transparent 60%)",
    hatching("0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 0 0.2 0 0 0 1 0", 0.08, 160, 45, 9),
    noise("0 0 0 0 0.25 0 0 0 0 0.24 0 0 0 0 0.22 0 0 0 0.08 0", 0.08, 160, 0.9),
  ].join(", "),

  /** 紫藤诗笺 - 紫罗兰光晕 + 大块墨晕水痕 */
  wisteria: [
    "radial-gradient(circle at 25% 20%, hsl(var(--c-accent-gold) / 0.14) 0%, transparent 55%)",
    "radial-gradient(circle at 75% 80%, hsl(var(--c-accent-red) / 0.10) 0%, transparent 55%)",
    inkBlots("0 0 0 0 0.35 0 0 0 0 0.20 0 0 0 0 0.45 0 0 0 0.8 0", 0.12, 320),
    noise("0 0 0 0 0.45 0 0 0 0 0.30 0 0 0 0 0.50 0 0 0 0.08 0", 0.08, 160, 0.85),
  ].join(", "),

  /** 落日手记 - 暖橙光晕 + 落日大圆晕染 */
  sunset: [
    "radial-gradient(circle at 80% 15%, hsl(var(--c-accent-gold) / 0.28) 0%, transparent 38%)",
    "radial-gradient(circle at 20% 80%, hsl(var(--c-accent-red) / 0.14) 0%, transparent 55%)",
    "radial-gradient(circle at 80% 15%, transparent 4%, hsl(var(--c-accent-gold) / 0.08) 8%, transparent 14%)",
    noise("0 0 0 0 0.55 0 0 0 0 0.32 0 0 0 0 0.20 0 0 0 0.10 0", 0.10, 160, 0.85),
  ].join(", "),
};

/** 默认纹理（paper） */
export const DEFAULT_TEXTURE: TextureKey = "paper";

/** 根据主题获取纹理 CSS 值 */
export function getThemeTexture(theme: Theme): string {
  const key = theme.texture ?? DEFAULT_TEXTURE;
  return THEME_TEXTURES[key] ?? THEME_TEXTURES[DEFAULT_TEXTURE];
}

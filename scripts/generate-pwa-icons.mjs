/**
 * 生成 PWA 图标
 *
 * 从 public/favicon.svg 生成：
 * - pwa-192.png (192x192 普通图标)
 * - pwa-512.png (512x512 普通图标)
 * - pwa-maskable-512.png (512x512 maskable 图标，带背景填充)
 *
 * maskable 图标需要将内容收缩到安全区域（80%），
 * 并用主题背景色填充外围，确保在各种形状（圆/方/圆角方）下都完整显示。
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

const svgBuffer = readFileSync(resolve(publicDir, "favicon.svg"));

// 普通图标：直接渲染 SVG
await sharp(svgBuffer).resize(192, 192).png().toFile(resolve(publicDir, "pwa-192.png"));
console.log("✓ pwa-192.png");

await sharp(svgBuffer).resize(512, 512).png().toFile(resolve(publicDir, "pwa-512.png"));
console.log("✓ pwa-512.png");

// maskable 图标：用背景色填充 + 内容收缩到中心安全区（80%）
// 思路：先渲染一个带背景色的 512x512 画布，
// 然后将原 SVG 缩小到 410x410（512*0.8），居中合成上去
const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#F5F1E8"/>
</svg>`;

const iconBuffer = await sharp(svgBuffer).resize(410, 410).png().toBuffer();

await sharp(Buffer.from(bgSvg))
  .composite([{ input: iconBuffer, gravity: "center" }])
  .png()
  .toFile(resolve(publicDir, "pwa-maskable-512.png"));
console.log("✓ pwa-maskable-512.png");

console.log("\n全部图标生成完成。");

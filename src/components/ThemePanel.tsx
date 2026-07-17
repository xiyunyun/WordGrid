/**
 * 主题选择面板
 *
 * 包含：
 * - 主题预设网格：点击切换 7 套预设主题
 * - 自定义色相轮盘：拖动选取 0-360 色相，覆盖当前主题的强调色
 * - 重置按钮
 *
 * 使用方式：作为受控弹窗组件，由父组件控制 open 状态
 */
import { useEffect, useRef } from "react";
import { X, Check, RotateCcw, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore, ALL_THEMES } from "@/store/theme";
import { getThemeById } from "@/lib/themes";
import type { Theme } from "@/lib/themes";

interface ThemePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ThemePanel({ open, onClose }: ThemePanelProps) {
  const themeId = useThemeStore((s) => s.themeId);
  const customHue = useThemeStore((s) => s.customHue);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setCustomHue = useThemeStore((s) => s.setCustomHue);
  const reset = useThemeStore((s) => s.reset);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

      {/* 面板 */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-ink/15 bg-paper-card p-6 shadow-deep"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="mb-5 flex items-center justify-between border-b border-ink/10 pb-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-accent-gold" strokeWidth={1.5} />
            <div>
              <div className="eyebrow">Theme · 主题色彩</div>
              <h2 className="font-display text-xl font-medium text-ink">
                选择你心仪的主题
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-ink-light transition-colors hover:bg-ink/5 hover:text-ink"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 主题预设网格 */}
        <section className="mb-6">
          <div className="mb-3 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Preset Themes · 预设主题
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ALL_THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                active={themeId === theme.id && customHue === null}
                onClick={() => {
                  setTheme(theme.id);
                  setCustomHue(null);
                }}
              />
            ))}
          </div>
        </section>

        {/* 自定义色相轮盘 */}
        <section className="mb-6 border-t border-ink/10 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Custom Hue · 自定义色相
            </div>
            {customHue !== null && (
              <button
                onClick={() => setCustomHue(null)}
                className="flex items-center gap-1 rounded border border-ink/15 px-2 py-0.5 font-mono text-2xs uppercase text-ink-light transition-colors hover:border-ink/30 hover:text-ink"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
                禁用
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <ColorWheel
              hue={customHue ?? 0}
              active={customHue !== null}
              onHueChange={(h) => setCustomHue(h)}
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="font-body text-sm leading-relaxed text-ink-muted">
                拖动轮盘选取色相，将以当前主题（
                <span className="font-medium text-ink">
                  {getThemeById(themeId).name}
                </span>
                ）为基础，把强调色（生词红、已掌握绿、烫金）统一旋转到选定色相。
                纸张与墨色保持不变，确保可读性。
              </p>
              {customHue !== null && (
                <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                  <span className="font-mono text-2xs uppercase text-ink-light">
                    当前色相
                  </span>
                  <span className="font-mono text-2xs tabular-nums text-accent-gold">
                    {customHue}°
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 重置按钮 */}
        <div className="flex justify-end border-t border-ink/10 pt-4">
          <button onClick={reset} className="btn-ghost">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            重置为默认
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ 主题预览卡片 ============ */
function ThemeCard({
  theme,
  active,
  onClick,
}: {
  theme: Theme;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-2 rounded-md border p-3 text-left transition-all",
        active
          ? "border-ink bg-ink/5 shadow-paper"
          : "border-ink/15 hover:border-ink/40 hover:shadow-paper",
      )}
    >
      {/* 色板预览 */}
      <div className="flex h-12 overflow-hidden rounded">
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-paper"]})` }}
        />
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-paper-card"]})` }}
        />
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-ink"]})` }}
        />
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-accent-gold"]})` }}
        />
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-accent-red"]})` }}
        />
        <div
          className="flex-1"
          style={{ background: `hsl(${theme.vars["--c-accent-green"]})` }}
        />
      </div>

      {/* 名称 */}
      <div>
        <div className="flex items-center justify-between gap-1">
          <span className="font-display text-sm font-medium text-ink">
            {theme.name}
          </span>
          {active && (
            <Check className="h-3.5 w-3.5 text-accent-green" strokeWidth={2} />
          )}
        </div>
        <div className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
          {theme.nameEn}
        </div>
      </div>
    </button>
  );
}

/* ============ 色相轮盘 ============ */
interface ColorWheelProps {
  /** 当前色相 0-360 */
  hue: number;
  /** 是否启用 */
  active: boolean;
  /** 色相变化回调 */
  onHueChange: (hue: number) => void;
}

function ColorWheel({ hue, active, onHueChange }: ColorWheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const size = 160;

  /** 根据鼠标位置计算色相 */
  const updateFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // atan2 返回 -π到π，0 在 +x 方向（右）。我们要 0 在顶部（12 点），顺时针递增
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    onHueChange(Math.round(angle));
  };

  // 指示点位置（极坐标 → 笛卡尔）
  const indicatorRadius = size / 2 - 12;
  const angleRad = (hue * Math.PI) / 180;
  // 0° 在顶部，顺时针
  const ix = Math.sin(angleRad) * indicatorRadius;
  const iy = -Math.cos(angleRad) * indicatorRadius;

  return (
    <div
      ref={ref}
      className="relative cursor-pointer touch-none select-none"
      style={{ width: size, height: size }}
      onPointerDown={(e) => {
        e.preventDefault();
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        updateFromEvent(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (dragging.current) updateFromEvent(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {/* 色相环 */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-opacity",
          active ? "opacity-100" : "opacity-50",
        )}
        style={{
          background:
            "conic-gradient(from 0deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%), hsl(180,80%,55%), hsl(240,80%,55%), hsl(300,80%,55%), hsl(360,80%,55%))",
        }}
      />
      {/* 中心圆（露出当前主题纸张色） */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 18,
          background: "hsl(var(--c-paper-card))",
          boxShadow: "inset 0 0 0 1px hsl(var(--c-ink) / 0.1)",
        }}
      />
      {/* 中心色块（显示当前 hue） */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 28,
          background: active
            ? `hsl(${hue}, 80%, 55%)`
            : "hsl(var(--c-ink-light))",
          transition: "background 0.2s",
        }}
      />
      {/* 指示点 */}
      <div
        className={cn(
          "absolute h-4 w-4 rounded-full border-2 border-paper shadow-md transition-transform",
          active ? "scale-100" : "scale-0",
        )}
        style={{
          left: size / 2 + ix - 8,
          top: size / 2 + iy - 8,
          background: `hsl(${hue}, 80%, 55%)`,
        }}
      />
    </div>
  );
}

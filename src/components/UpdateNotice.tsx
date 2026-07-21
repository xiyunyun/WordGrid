import { useState, useEffect } from "react";
import { X, Sparkles } from "lucide-react";
import { CHANGELOG, hasUnreadUpdate, markUpdateRead } from "@/lib/changelog";
import { cn } from "@/lib/utils";

/**
 * 更新公告弹窗
 *
 * 当有新版本且用户未读时，自动弹出显示更新内容。
 * 关闭后在 localStorage 记录已读版本号，下次更新前不再弹出。
 */
export default function UpdateNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasUnreadUpdate()) {
      // 延迟 500ms 弹出，避免页面加载时的视觉冲突
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    markUpdateRead();
    setOpen(false);
  };

  if (!open) return null;

  const latest = CHANGELOG[0];

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 弹窗 */}
      <div className="relative z-10 mx-auto w-full max-w-md animate-slide-up overflow-hidden rounded-lg border border-accent-gold/30 bg-paper-card shadow-deep-always">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/10 bg-accent-gold/5 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gold/15 text-accent-gold">
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                What's New
              </div>
              <div className="font-display text-lg font-medium text-ink">
                WordGrid 更新了
                <span className="ml-2 font-mono text-2xs text-ink-light">
                  <span className="text-ink-light/60">v</span>
                  <span className="ml-0.5">{latest.version}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md border border-ink/20 p-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 更新内容 */}
        <div className="px-4 py-4 md:px-6 md:py-5">
          <div className="mb-3 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            {latest.date} · 更新内容
          </div>
          <ul className="space-y-2">
            {latest.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent-gold" />
                <span className="font-body text-sm leading-relaxed text-ink-soft">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部提示 + 确认按钮 */}
        <div className="border-t border-ink/10 bg-paper-warm/40 px-4 py-3 md:px-6">
          <button
            onClick={handleClose}
            className="btn-primary w-full justify-center"
          >
            我知道了
          </button>
          <p className="mt-2 text-center font-body text-2xs text-ink-light">
            后续可在「关于 - 开发日志」中查看完整更新记录
          </p>
        </div>
      </div>
    </div>
  );
}

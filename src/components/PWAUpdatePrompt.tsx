import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

/**
 * PWA 更新提示组件
 *
 * 修复「推送代码后网站不更新，需 Ctrl+Shift+R 才刷新」的 bug：
 * 配合 vite-plugin-pwa 的 skipWaiting + clientsClaim，
 * 当检测到新版本 SW 时，弹出提示让用户一键刷新。
 */
export default function PWAUpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      // SW 注册失败不影响正常使用，静默处理
      console.warn("SW register error:", error);
    },
  });

  // 用户关闭提示
  const close = () => {
    setNeedRefresh(false);
    setDismissed(true);
  };

  // 用户点击「立即刷新」
  const update = () => {
    updateServiceWorker(true);
  };

  // 5 秒后自动刷新（即使不点击，新 SW 也已就绪，自动应用更新）
  useEffect(() => {
    if (!needRefresh || dismissed) return;
    const t = setTimeout(() => {
      updateServiceWorker(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [needRefresh, dismissed, updateServiceWorker]);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-slide-up md:bottom-6">
      <div className="flex items-center gap-3 rounded-md border border-ink/20 bg-paper-card px-4 py-3 shadow-deep-always">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-gold/15 text-accent-gold">
          <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <div className="font-display text-sm font-medium text-ink">
            检测到新版本
          </div>
          <div className="font-body text-xs text-ink-muted">
            点击刷新以应用更新，8 秒后自动刷新
          </div>
        </div>
        <button
          onClick={update}
          className="flex-shrink-0 rounded-md bg-ink px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-paper transition-colors hover:bg-ink-soft"
        >
          立即刷新
        </button>
        <button
          onClick={close}
          className="flex-shrink-0 rounded p-1 text-ink-light hover:bg-ink/5 hover:text-ink"
          aria-label="关闭"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

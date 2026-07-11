import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, ChevronRight } from "lucide-react";
import {
  hasImportantNotice,
  getImportantNoticeItems,
  isImportantDismissed,
  dismissImportantNotice,
  LATEST_VERSION,
} from "@/lib/changelog";

/**
 * 重要更新浮窗
 *
 * 当最新版本包含 "重要更新⚠️⚠️⚠️" 标记时，在主界面侧边显示浮窗。
 * 用户可关闭，关闭后该版本不再显示（新版本发布后会再次出现）。
 *
 * 显示位置：
 * - 桌面端：右侧固定，垂直居中偏下
 * - 手机端：底部全宽条幅
 */
export default function ImportantNoticeFloat() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 仅当有重要更新且用户未关闭时显示
    if (hasImportantNotice() && !isImportantDismissed()) {
      // 延迟 1500ms 显示，确保 UpdateNotice 弹窗（500ms 显示）已在前台
      // 用户关闭 UpdateNotice 后，ImportantNoticeFloat 浮窗才可见，避免重叠
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    dismissImportantNotice();
    setVisible(false);
  };

  const handleViewDetails = () => {
    dismissImportantNotice();
    setVisible(false);
    navigate("/about");
  };

  if (!visible) return null;

  const items = getImportantNoticeItems();

  return (
    <>
      {/* 手机端：底部条幅 - 避开底部导航栏（z-40），用 z-50 显示在导航栏上方 */}
      <div className="md:hidden fixed inset-x-0 bottom-16 z-50 animate-slide-up px-3">
        <div className="m-3 rounded-lg border border-accent-red/40 bg-paper-card shadow-deep">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-accent-red/20 bg-accent-red/5 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <AlertTriangle
                className="h-4 w-4 text-accent-red"
                strokeWidth={1.5}
              />
              <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                重要更新 · v{LATEST_VERSION}
              </span>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md border border-ink/20 p-1 text-ink transition-colors hover:bg-ink hover:text-paper"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          {/* 内容 */}
          <div className="px-4 py-3">
            <ul className="space-y-1.5">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className="font-body text-xs leading-relaxed text-ink-soft"
                >
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleViewDetails}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
            >
              查看详情
              <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* 桌面端：右侧浮窗 */}
      <div className="hidden md:flex fixed right-6 bottom-24 z-50 animate-slide-in-right">
        <div className="w-80 rounded-lg border border-accent-red/40 bg-paper-card shadow-deep">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-accent-red/20 bg-accent-red/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-red/15 text-accent-red">
                <AlertTriangle
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                />
              </div>
              <div>
                <div className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                  Important · 重要更新
                </div>
                <div className="font-display text-sm font-medium text-ink">
                  v{LATEST_VERSION}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md border border-ink/20 p-1 text-ink transition-colors hover:bg-ink hover:text-paper"
              aria-label="关闭"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
          {/* 内容 */}
          <div className="px-4 py-3">
            <ul className="space-y-2">
              {items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 font-body text-xs leading-relaxed text-ink-soft"
                >
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent-red" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={handleViewDetails}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
            >
              前往查看详情
              <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

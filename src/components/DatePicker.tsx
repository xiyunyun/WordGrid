import { useState, useEffect, useRef, useMemo } from "react";
import { Calendar, ChevronRight, X } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { formatMD, weekdayCN, todayKey } from "@/lib/review";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  onJump: (date: string) => void;
}

/**
 * 悬浮日期选择器 - 右下角固定按钮
 * 点击展开二级菜单，按月份分组列出所有存在单词的日期
 */
export default function DatePicker({ onJump }: DatePickerProps) {
  const words = useWordStore((s) => s.words);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 收集所有存在单词的日期，倒序
  const dates = useMemo(() => {
    const set = new Set<string>();
    words.forEach((w) => set.add(w.date));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [words]);

  // 按月份分组
  const monthGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of dates) {
      const monthKey = d.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(d);
    }
    return Array.from(map.entries());
  }, [dates]);

  const today = todayKey();
  const todayInList = dates.includes(today);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    // 延迟绑定避免触发本次点击
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleJump = (date: string) => {
    onJump(date);
    setOpen(false);
  };

  const handleJumpToday = () => {
    if (todayInList) {
      handleJump(today);
    } else {
      // 今日无单词，滚动到顶部（最近日期）
      window.scrollTo({ top: 0, behavior: "smooth" });
      setOpen(false);
    }
  };

  if (dates.length === 0) return null;

  return (
    <>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border shadow-card transition-all",
          open
            ? "border-ink bg-ink text-paper"
            : "border-ink/20 bg-paper-card text-ink hover:border-ink hover:shadow-deep",
        )}
        aria-label="选择日期"
        title="跳转到日期"
      >
        <Calendar className="h-5 w-5" strokeWidth={1.5} />
      </button>

      {/* 二级菜单面板 */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full right-0 mb-3 w-72 origin-bottom-right animate-slide-up overflow-hidden rounded-md border border-ink/15 bg-paper-card shadow-deep"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3">
            <div>
              <div className="eyebrow">Jump To Date</div>
              <div className="font-display text-lg font-medium text-ink">
                跳转到日期
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-ink-light hover:bg-ink/5 hover:text-ink"
              aria-label="关闭"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* 今日快捷入口 */}
          <div className="border-b border-ink/8 px-2 py-2">
            <button
              onClick={handleJumpToday}
              className="flex w-full items-center justify-between rounded px-2 py-2 text-left transition-colors hover:bg-paper-warm/60"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent-red" />
                <span className="font-body text-sm text-ink">
                  今日 · {formatMD(today)}
                </span>
              </div>
              {!todayInList && (
                <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                  暂无单词
                </span>
              )}
            </button>
          </div>

          {/* 日期列表 - 按月分组 */}
          <div className="max-h-80 overflow-y-auto px-2 py-2 scrollbar-thin">
            {monthGroups.map(([monthKey, days]) => {
              const [y, m] = monthKey.split("-");
              return (
                <div key={monthKey} className="mb-2">
                  {/* 月份标题 */}
                  <div className="sticky top-0 bg-paper-card px-2 py-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-medium text-ink">
                        {parseInt(m, 10)}月
                      </span>
                      <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                        {y} · {days.length} days
                      </span>
                    </div>
                  </div>

                  {/* 日期项 */}
                  <ul className="space-y-0.5">
                    {days.map((d) => {
                      const dayCount = words.filter((w) => w.date === d).length;
                      const isToday = d === today;
                      return (
                        <li key={d}>
                          <button
                            onClick={() => handleJump(d)}
                            className={cn(
                              "group flex w-full items-center justify-between rounded px-2 py-2 text-left transition-colors",
                              isToday
                                ? "bg-accent-red/8 hover:bg-accent-red/12"
                                : "hover:bg-paper-warm/60",
                            )}
                          >
                            <div className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "font-display text-base font-medium",
                                  isToday ? "text-accent-red" : "text-ink",
                                )}
                              >
                                {formatMD(d)}
                              </span>
                              <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                                {weekdayCN(d)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-2xs text-ink-light">
                                {dayCount} 词
                              </span>
                              <ChevronRight
                                className="h-3.5 w-3.5 text-ink-light opacity-0 transition-opacity group-hover:opacity-100"
                                strokeWidth={1.5}
                              />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* 底部统计 */}
          <div className="border-t border-ink/8 bg-paper-warm/40 px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            {dates.length} days · {words.length} entries
          </div>
        </div>
      )}
    </>
  );
}

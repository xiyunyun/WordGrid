/**
 * 日历选择器组件
 *
 * 通用日历设计，类似 Windows 自带日历：
 * - 6x7 表格（周一至周日 × 6 行，覆盖完整月份）
 * - 月份切换（上一月/下一月/回到今天）
 * - 多选日期
 * - 显示有备注的日期（小圆点指示）
 * - 鼠标悬停 0.5s 或右键显示备注内容（自动渐隐）
 * - 可作为 dropdown 使用（点击外部收起）
 *
 * 用于：
 * - 生词本工具栏的日期筛选（4个子页面共用）
 * - 积木造文界面的日期筛选
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerCalendarProps {
  /** 已选中的日期列表（YYYY-MM-DD） */
  selected: string[];
  /** 选中日期变化回调 */
  onChange: (next: string[]) => void;
  /** 备注数据：key=日期，value=备注文本（用于显示小圆点） */
  notes?: Record<string, string>;
  /** 触发按钮的标签文字，默认"日期" */
  label?: string;
}

/** 日期格式化为 YYYY-MM-DD */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 月份名 */
const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export default function DatePickerCalendar({
  selected,
  onChange,
  notes = {},
  label = "日期",
}: DatePickerCalendarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // 当前显示的月份（默认本月）
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // 备注提示框状态：hover 0.5s 后显示
  const [tooltip, setTooltip] = useState<{
    key: string;
    text: string;
    left: number;
    top: number;
  } | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hoverTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  // 清除所有计时器
  const clearHoverTimers = useCallback(() => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // 鼠标进入日期单元格：如有备注，0.5s 后显示提示框
  const handleCellHover = useCallback(
    (key: string, e: React.MouseEvent<HTMLElement>) => {
      if (!notes[key] || !notes[key].trim()) return;
      clearHoverTimers();
      const rect = e.currentTarget.getBoundingClientRect();
      hoverTimer.current = window.setTimeout(() => {
        setTooltip({
          key,
          text: notes[key],
          left: rect.left + rect.width / 2,
          top: rect.bottom + 4,
        });
        setTooltipVisible(true);
      }, 500);
    },
    [notes, clearHoverTimers],
  );

  // 鼠标离开：渐隐提示框
  const handleCellLeave = useCallback(() => {
    clearHoverTimers();
    setTooltipVisible(false);
    hideTimer.current = window.setTimeout(() => setTooltip(null), 200);
  }, [clearHoverTimers]);

  // 右键：立即显示提示框
  const handleCellContextMenu = useCallback(
    (key: string, e: React.MouseEvent<HTMLElement>) => {
      if (!notes[key] || !notes[key].trim()) return;
      e.preventDefault();
      clearHoverTimers();
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
        key,
        text: notes[key],
        left: rect.left + rect.width / 2,
        top: rect.bottom + 4,
      });
      setTooltipVisible(true);
    },
    [notes, clearHoverTimers],
  );

  // 关闭弹窗时清除提示框
  useEffect(() => {
    if (!open) {
      clearHoverTimers();
      setTooltip(null);
      setTooltipVisible(false);
    }
  }, [open, clearHoverTimers]);

  // 卸载时清除计时器
  useEffect(() => clearHoverTimers, [clearHoverTimers]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // 切换月份
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // 构造 6x7 日历网格
  const grid = useMemo(() => {
    // 本月第一天
    const firstDay = new Date(viewYear, viewMonth, 1);
    // 周一为本周第一天（getDay() 周日=0，转换为周一开始的偏移）
    const firstDayWeekday = (firstDay.getDay() + 6) % 7; // 0=周一
    // 本月天数
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // 上月天数（用于填充前面的格子）
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];
    // 前面填充上月日期
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
      cells.push({ date: d, isCurrentMonth: false, key: toDateKey(d) });
    }
    // 本月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({ date: d, isCurrentMonth: true, key: toDateKey(d) });
    }
    // 后面填充下月日期，补齐到 42 格（6x7）
    while (cells.length < 42) {
      const lastDate = cells[cells.length - 1].date;
      const d = new Date(lastDate);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, isCurrentMonth: false, key: toDateKey(d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // 切换选中日期
  const toggleDate = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((d) => d !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  // 清除全部
  const clearAll = () => {
    onChange([]);
  };

  const todayKey = toDateKey(new Date());
  const isActive = selected.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-colors font-mono text-2xs uppercase tracking-editorial",
          isActive || open
            ? "border-ink bg-ink text-paper"
            : "border-ink/20 text-ink-light hover:border-ink hover:text-ink",
        )}
      >
        <Calendar className="h-3 w-3" strokeWidth={1.5} />
        {label}
        {isActive && (
          <span className="ml-0.5 rounded bg-paper/20 px-1 tabular-nums">
            {selected.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-ink/15 bg-paper-card p-3 shadow-deep animate-fade-in">
          {/* 月份切换头 */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded p-1 text-ink-light transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="上一月"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <div className="text-center">
              <div className="font-display text-sm font-medium text-ink">
                {viewYear} 年 {MONTH_NAMES[viewMonth]}
              </div>
            </div>
            <button
              onClick={nextMonth}
              className="rounded p-1 text-ink-light transition-colors hover:bg-ink/5 hover:text-ink"
              aria-label="下一月"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* 回到今天 */}
          <button
            onClick={goToday}
            className="mb-2 w-full rounded border border-ink/15 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink"
          >
            回到今天 · {todayKey.slice(5)}
          </button>

          {/* 星期标题 */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w}
                className="py-1 text-center font-mono text-2xs uppercase text-ink-light"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 6x7 日历网格 */}
          <div className="grid grid-cols-7 gap-0.5">
            {grid.map((cell) => {
              const isSelected = selected.includes(cell.key);
              const isToday = cell.key === todayKey;
              const hasNote = !!(notes[cell.key] && notes[cell.key].trim());
              return (
                <button
                  key={cell.key}
                  onClick={() => toggleDate(cell.key)}
                  onMouseEnter={(e) => handleCellHover(cell.key, e)}
                  onMouseLeave={handleCellLeave}
                  onContextMenu={(e) => handleCellContextMenu(cell.key, e)}
                  className={cn(
                    "relative aspect-square rounded text-center font-mono text-xs transition-all",
                    !cell.isCurrentMonth && "text-ink-light/40",
                    cell.isCurrentMonth && !isSelected && !isToday && "text-ink hover:bg-ink/5",
                    isToday && !isSelected && "border border-accent-gold/50 text-accent-gold",
                    isSelected && "bg-ink text-paper",
                    hasNote && !isSelected && "ring-1 ring-accent-gold/30",
                  )}
                  title={cell.key}
                >
                  {cell.date.getDate()}
                  {/* 备注小圆点 */}
                  {hasNote && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                        isSelected ? "bg-paper" : "bg-accent-gold",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* 底部操作栏 */}
          {isActive && (
            <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-2">
              <span className="font-mono text-2xs text-ink-light">
                已选 {selected.length} 个日期
              </span>
              <button
                onClick={clearAll}
                className="flex items-center gap-1 rounded border border-ink/15 px-2 py-0.5 font-mono text-2xs uppercase text-ink-light transition-colors hover:border-accent-red/40 hover:text-accent-red"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
                清除
              </button>
            </div>
          )}
        </div>
      )}

      {/* 备注提示框：使用 fixed 定位脱离父级 overflow 限制 */}
      {tooltip && (
        <div
          className={cn(
            "pointer-events-none fixed z-[100] max-w-xs -translate-x-1/2 rounded-md border border-accent-gold/40 bg-paper-card px-3 py-2 shadow-deep transition-all duration-200",
            tooltipVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
          )}
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <div className="mb-1 font-mono text-2xs uppercase tracking-editorial text-accent-gold">
            Note · {tooltip.key}
          </div>
          <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-ink-soft">
            {tooltip.text}
          </p>
          {/* 小三角箭头 */}
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-accent-gold/40 bg-paper-card" />
        </div>
      )}
    </div>
  );
}

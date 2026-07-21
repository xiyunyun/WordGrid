/**
 * 日期范围选择器组件
 *
 * 与 DatePickerCalendar 视觉风格统一（Windows 风格 6x7 日历网格），
 * 但用于选择起止日期范围：
 * - 第一次点击：选择起始日期（高亮）
 * - 第二次点击：选择结束日期（高亮区间）
 *   - 若结束日期早于起始日期，自动交换两者
 * - 第三次点击：重新开始选择（清除原区间，以新点击为起始）
 *
 * 区间内的日期用半透明背景显示，两端用实心背景。
 * 每次点击后即触发 onChange 回调，第二次点击后弹出会自动关闭。
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  /** 当前选中的日期范围，null 表示未选择 */
  value: { start: string; end: string } | null;
  /** 范围变化回调：用户完成两次点击后调用，或清除时调用为 null */
  onChange: (range: { start: string; end: string } | null) => void;
  /** 触发按钮的标签文字，默认"日期范围" */
  label?: string;
}

/** 日期格式化为 YYYY-MM-DD */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTH_NAMES = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export default function DateRangePicker({
  value,
  onChange,
  label = "日期范围",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 当前显示的月份：打开时默认跳到当前选中区间的起始月，或本月
  const [viewYear, setViewYear] = useState(() => {
    if (value?.start) {
      const d = new Date(value.start + "T00:00:00");
      return d.getFullYear();
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value?.start) {
      const d = new Date(value.start + "T00:00:00");
      return d.getMonth();
    }
    return new Date().getMonth();
  });

  // 临时起始日期：用户点击第一次但未点击第二次时保存
  // null 表示当前未在选择中（即下次点击是新一轮的起始）
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setPendingStart(null);
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

  // 6x7 日历网格
  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const firstDayWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const cells: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, prevMonthDays - i);
      cells.push({ date: d, isCurrentMonth: false, key: toDateKey(d) });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      cells.push({ date: d, isCurrentMonth: true, key: toDateKey(d) });
    }
    while (cells.length < 42) {
      const lastDate = cells[cells.length - 1].date;
      const d = new Date(lastDate);
      d.setDate(d.getDate() + 1);
      cells.push({ date: d, isCurrentMonth: false, key: toDateKey(d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // 判断日期是否在当前选中范围内（包含 pendingStart 状态下的预览）
  const rangeInfo = useMemo(() => {
    const start = pendingStart ?? value?.start ?? null;
    const end = pendingStart ? null : value?.end ?? null;
    return { start, end };
  }, [pendingStart, value]);

  // 点击日期
  const handleClick = (key: string) => {
    if (!pendingStart) {
      // 第一次点击：选起始
      setPendingStart(key);
      return;
    }
    // 第二次点击：选结束
    let start = pendingStart;
    let end = key;
    if (start > end) [start, end] = [end, start];
    onChange({ start, end });
    setPendingStart(null);
    setOpen(false);
  };

  // 清除范围
  const clearRange = () => {
    onChange(null);
    setPendingStart(null);
  };

  const todayKeyStr = toDateKey(new Date());
  const isActive = !!value;
  // 范围内的日期判断（含端点）
  const isInRange = (key: string) => {
    if (!rangeInfo.start) return false;
    if (rangeInfo.end) {
      return key >= rangeInfo.start && key <= rangeInfo.end;
    }
    // 只有起始没有结束时，仅高亮起始
    return key === rangeInfo.start;
  };
  const isStart = (key: string) => rangeInfo.start === key;
  const isEnd = (key: string) => rangeInfo.end === key;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-colors font-mono text-2xs uppercase tracking-editorial",
          isActive || open
            ? "border-ink bg-ink text-paper"
            : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
        )}
      >
        <Calendar className="h-3 w-3" strokeWidth={1.5} />
        {label}
        {isActive && (
          <span className="ml-0.5 rounded bg-paper/20 px-1 tabular-nums">
            {value!.start.slice(5)}→{value!.end.slice(5)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-ink/15 bg-paper-card p-3 shadow-deep-always animate-fade-in">
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
              {pendingStart && (
                <div className="mt-0.5 font-mono text-2xs text-accent-gold">
                  请选择结束日期
                </div>
              )}
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
            回到今天 · {todayKeyStr.slice(5)}
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
              const inRange = isInRange(cell.key);
              const startCell = isStart(cell.key);
              const endCell = isEnd(cell.key);
              const isToday = cell.key === todayKeyStr;
              return (
                <button
                  key={cell.key}
                  onClick={() => handleClick(cell.key)}
                  className={cn(
                    "relative aspect-square rounded text-center font-mono text-xs transition-all",
                    !cell.isCurrentMonth && "text-ink-light/40",
                    cell.isCurrentMonth && !inRange && !isToday && "text-ink hover:bg-ink/5",
                    isToday && !inRange && "border border-accent-gold/50 text-accent-gold",
                    inRange && !startCell && !endCell && "bg-ink/15 text-ink",
                    startCell && "rounded-r-none bg-ink text-paper",
                    endCell && "rounded-l-none bg-ink text-paper",
                    startCell && endCell && "rounded",
                  )}
                >
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* 底部操作栏 */}
          <div className="mt-2 flex items-center justify-between border-t border-ink/10 pt-2">
            <span className="font-mono text-2xs text-ink-light">
              {pendingStart
                ? `起始：${pendingStart}`
                : value
                  ? `${value.start} → ${value.end}`
                  : "未选择范围"}
            </span>
            {isActive && (
              <button
                onClick={clearRange}
                className="flex items-center gap-1 rounded border border-ink/15 px-2 py-0.5 font-mono text-2xs uppercase text-ink-light transition-colors hover:border-accent-red/40 hover:text-accent-red"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
                清除
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

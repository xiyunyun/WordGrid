import { useMemo, useState } from "react";
import { ChevronDown, Plus, Inbox } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { selectDueWords } from "@/store/wordStore";
import {
  todayKey,
  formatMD,
  weekdayCN,
  weekdayEN,
  isDue,
} from "@/lib/review";
import WordCell from "@/components/WordCell";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";
import { useMidnightCountdown } from "@/hooks/useMidnightCountdown";

interface DailyGridProps {
  onRequestAdd: (date?: string) => void;
  onReviewDue?: () => void;
  onRequestEdit?: (word: Word) => void;
  onRequestNote?: (word: Word) => void;
}

interface DateGroup {
  date: string;
  words: ReturnType<typeof useWordStore.getState>["words"];
}

export default function DailyGrid({
  onRequestAdd,
  onReviewDue,
  onRequestEdit,
  onRequestNote,
}: DailyGridProps) {
  const words = useWordStore((s) => s.words);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const today = todayKey();
  const dueWords = selectDueWords(words);
  const countdown = useMidnightCountdown();

  // 按日期分组，倒序
  const groups: DateGroup[] = useMemo(() => {
    const map = new Map<string, typeof words>();
    for (const w of words) {
      if (!map.has(w.date)) map.set(w.date, []);
      map.get(w.date)!.push(w);
    }
    return Array.from(map.entries())
      .map(([date, ws]) => ({ date, words: ws }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [words]);

  const toggleCollapse = (date: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (words.length === 0) {
    return <EmptyState onRequestAdd={() => onRequestAdd()} />;
  }

  return (
    <div className="space-y-6">
      {/* 顶部摘要条 */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <div className="eyebrow mb-1">Daily Grid · 每日网格</div>
          <h2 className="font-display text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            词汇档案
            <span className="ml-3 font-serif text-lg italic text-ink-light">
              {words.length} entries
            </span>
          </h2>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => onReviewDue?.()}
            className={cn(
              "flex items-center gap-3 rounded-md border px-4 py-2.5 transition-colors",
              dueWords.length > 0
                ? "border-accent-red/40 bg-accent-red/5 hover:bg-accent-red/10"
                : "border-ink/15 bg-paper-card hover:border-ink/30",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs",
                dueWords.length > 0
                  ? "bg-accent-red text-paper"
                  : "bg-ink/10 text-ink-light",
              )}
            >
              {dueWords.length}
            </div>
            <div className="text-left">
              <div
                className={cn(
                  "font-mono text-2xs uppercase tracking-editorial",
                  dueWords.length > 0 ? "text-accent-red" : "text-ink-light",
                )}
              >
                Due Today
              </div>
              <div className="font-body text-sm text-ink">
                {dueWords.length > 0
                  ? `今日需复习 ${dueWords.length} 词`
                  : "今日无待复习词"}
              </div>
            </div>
          </button>

          {/* 倒计时 - 距下次更新复习内容（显示在 Due Today 下方） */}
          <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            <span>下次更新</span>
            <span className="font-mono text-sm text-ink tabular-nums">
              {countdown.text}
            </span>
          </div>
        </div>
      </section>

      {/* 日期行列表 */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isToday = group.date === today;
          const isCollapsed = collapsed.has(group.date);
          const difficultCount = group.words.filter((w) => w.isDifficult).length;
          const dueCount = group.words.filter(
            (w) => w.isDifficult && !w.isMastered && isDue(w.nextReview),
          ).length;

          return (
            <section
              key={group.date}
              id={`date-${group.date}`}
              className={cn(
                "scroll-mt-32 overflow-hidden rounded-md border bg-paper-card/60",
                isToday
                  ? "border-ink/25 shadow-paper"
                  : "border-ink/10",
              )}
            >
              {/* 日期行头部 */}
              <header
                className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-paper-warm/40 md:gap-8 md:px-6 md:py-4"
                onClick={() => toggleCollapse(group.date)}
              >
                {/* 区块 1：日期 + 今日标记 - 与行内其他元素水平对齐 */}
                <div className="flex flex-shrink-0 items-baseline gap-2">
                  <div
                    className={cn(
                      "font-serif text-base font-medium leading-none tracking-tight md:text-xl",
                      isToday ? "text-ink" : "text-ink-soft",
                    )}
                  >
                    {formatMD(group.date)}
                  </div>
                  {isToday && (
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                      · 今日
                    </span>
                  )}
                </div>

                {/* 区块 2：周几（中文 + 英文）- 手机端隐藏英文缩写 */}
                <div className="flex flex-shrink-0 flex-col justify-center border-l border-ink/10 pl-3 md:pl-8">
                  <div
                    className={cn(
                      "font-mono text-2xs uppercase tracking-editorial",
                      isToday ? "text-accent-red" : "text-ink-light",
                    )}
                  >
                    {weekdayCN(group.date)}
                  </div>
                  <div className="mt-0.5 hidden font-serif text-sm italic text-ink-light md:block">
                    {weekdayEN(group.date)}
                  </div>
                </div>

                {/* 区块 3：统计（words + 生词） */}
                <div className="flex flex-1 flex-wrap items-baseline gap-3 border-l border-ink/10 pl-3 md:gap-6 md:pl-8">
                  <div className="flex items-baseline gap-1 md:gap-2">
                    <span className="font-serif text-base font-medium text-ink md:text-xl">
                      {group.words.length}
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                      words
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 md:gap-2">
                    <span
                      className={cn(
                        "font-serif text-base font-medium md:text-xl",
                        difficultCount > 0 ? "text-accent-red" : "text-ink-light",
                      )}
                    >
                      {difficultCount}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-2xs uppercase tracking-editorial",
                        difficultCount > 0 ? "text-accent-red" : "text-ink-light",
                      )}
                    >
                      生词
                    </span>
                  </div>
                  {dueCount > 0 && (
                    <div className="rounded border border-accent-red/30 bg-accent-red/5 px-2 py-0.5 font-mono text-2xs uppercase tracking-editorial text-accent-red">
                      {dueCount} due
                    </div>
                  )}
                </div>

                {/* 右侧操作 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestAdd(group.date);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-ink/20 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                    title="向这一天添加单词"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(group.date);
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border border-ink/15 text-ink-light transition-all",
                      isCollapsed ? "rotate-[-90deg]" : "",
                    )}
                    aria-label={isCollapsed ? "展开" : "折叠"}
                  >
                    <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </header>

              {/* 单词单元格网格区 - 自适应多行排列 */}
              {!isCollapsed && (
                <div className="border-t border-ink/8 px-2 py-3 md:px-4 animate-fade-in">
                  <div
                    className="grid gap-2 md:gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"
                  >
                    {group.words.map((w) => (
                      <WordCell
                        key={w.id}
                        word={w}
                        onRequestEdit={onRequestEdit}
                        onRequestNote={onRequestNote}
                      />
                    ))}
                    {/* 添加占位卡 */}
                    <button
                      onClick={() => onRequestAdd(group.date)}
                      className="flex min-h-[110px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink/20 py-6 text-ink-light transition-colors hover:border-ink/40 hover:text-ink"
                    >
                      <Plus className="h-5 w-5" strokeWidth={1.5} />
                      <span className="font-mono text-2xs uppercase tracking-editorial">
                        Add Word
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  onRequestAdd,
}: {
  onRequestAdd: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 grid grid-cols-3 gap-1 opacity-30">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-12 border border-ink/30"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <Inbox className="mb-4 h-10 w-10 text-ink-light" strokeWidth={1} />
      <div className="eyebrow mb-2">Empty Archive</div>
      <h2 className="mb-2 font-display text-3xl font-medium text-ink">
        开始你的词汇档案
      </h2>
      <p className="mb-6 max-w-md font-body text-sm text-ink-muted">
        点击下方按钮添加第一个单词，或使用批量导入快速录入。
        每一天都会成为网格中的一行，让积累可见。
      </p>

      <button onClick={onRequestAdd} className="btn-primary">
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        添加第一个单词
      </button>
    </div>
  );
}

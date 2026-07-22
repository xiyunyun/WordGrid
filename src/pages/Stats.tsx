import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  AlarmClock,
  BookOpen,
  Check,
  TrendingUp,
  Archive,
} from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import {
  selectDueAndTodayNewCount,
  selectMasteredWords,
} from "@/store/wordStore";
import {
  todayKey,
  formatMDShort,
  addDays,
} from "@/lib/review";
import { cn } from "@/lib/utils";
import DateRangePicker from "@/components/DateRangePicker";

export default function Stats() {
  const words = useWordStore((s) => s.words);
  const logs = useWordStore((s) => s.logs);

  const today = todayKey();
  const todayAdded = words.filter((w) => w.date === today).length;
  // 需复习统计：与导航红点、DailyGrid Due Today、自我检测「到期词+当日新词」逻辑保持一致
  // （包含今日新加未掌握且未复习的词，与 selectDueAndTodayNewCount 一致）
  const dueCount = selectDueAndTodayNewCount(words);
  const masteredWords = selectMasteredWords(words);
  // 学习中：所有未掌握的单词（含初识到长期，不含已掌握）
  const learningCount = words.filter((w) => !w.isMastered).length;

  // 日期范围筛选：默认为空（空表示"最近 14 天"）
  // 用户选择起止日期后，图表按所选区间显示
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  // 计算实际显示的日期范围
  // - 无筛选时：最近 14 天
  // - 有筛选时：[start, end]，按日期升序
  const chartDates = useMemo(() => {
    if (dateRange && dateRange.start && dateRange.end) {
      const list: string[] = [];
      let cur = dateRange.start;
      while (cur <= dateRange.end) {
        list.push(cur);
        cur = addDays(cur, 1);
      }
      return list;
    }
    // 默认：最近 14 天
    const recent: string[] = [];
    for (let i = 13; i >= 0; i--) {
      recent.push(addDays(today, -i));
    }
    return recent;
  }, [dateRange, today]);

  // 每日新增数据
  const dailyData = useMemo(() => {
    const days: Array<{
      date: string;
      label: string;
      added: number;
      difficult: number;
      mastered: number;
      cumulative: number;
    }> = [];
    let cum = 0;
    for (const d of chartDates) {
      const dayWords = words.filter((w) => w.date === d);
      const added = dayWords.length;
      const difficult = dayWords.filter((w) => w.isDifficult).length;
      const mastered = dayWords.filter((w) => w.isMastered).length;
      cum += added;
      days.push({
        date: d,
        label: formatMDShort(d),
        added,
        difficult,
        mastered,
        cumulative: cum,
      });
    }
    return days;
  }, [words, chartDates]);

  // 累计折线图数据
  const cumulativeData = useMemo(() => {
    let cumDifficult = 0;
    let cumMastered = 0;
    return dailyData.map((d) => {
      cumDifficult += d.difficult;
      cumMastered += d.mastered;
      return {
        label: d.label,
        生词: cumDifficult,
        已掌握: cumMastered,
      };
    });
  }, [dailyData]);

  // 熟练度排行显示数量：默认 10，可选 5/10/20/50/全部
  const [rankLimit, setRankLimit] = useState<number | "all">(10);

  // 今日复习统计
  const todayReviews = logs.filter(
    (l) => new Date(l.reviewedAt).toDateString() === new Date().toDateString(),
  );
  const todayCorrect = todayReviews.filter((l) => l.correct).length;
  const todayWrong = todayReviews.length - todayCorrect;

  const stats = [
    {
      label: "今日添加",
      labelEn: "Added Today",
      value: todayAdded,
      icon: Plus,
      iconClass: "text-ink",
      valueClass: "text-ink",
      bg: "border-ink/15 bg-paper-card",
    },
    {
      label: "需复习",
      labelEn: "Due Today",
      value: dueCount,
      icon: AlarmClock,
      iconClass: "text-accent-red",
      valueClass: "text-accent-red",
      bg: "border-ink/15 bg-paper-card",
    },
    {
      label: "学习中",
      labelEn: "Learning",
      value: learningCount,
      icon: BookOpen,
      iconClass: "text-accent-gold",
      valueClass: "text-accent-gold",
      bg: "border-ink/15 bg-paper-card",
    },
    {
      label: "已认识",
      labelEn: "Mastered",
      value: masteredWords.length,
      icon: Check,
      iconClass: "text-accent-green",
      valueClass: "text-accent-green",
      bg: "border-ink/15 bg-paper-card",
    },
  ];

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">Statistics</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            进度档案
            <span className="ml-3 font-serif text-lg italic text-ink-light">
              {words.length} total entries
            </span>
          </h2>
          <p className="max-w-md font-body text-sm text-ink-muted">
            可视化你的学习轨迹。每日新增、累计生词、已掌握词汇一目了然。
          </p>
        </div>
      </section>

      {/* 数据面板 2×2 宫格 */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={cn(
                "rounded-md border p-5 transition-all hover:shadow-paper-hover",
                s.bg,
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <Icon
                  className={cn("h-5 w-5", s.iconClass)}
                  strokeWidth={1.5}
                />
                <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                  {s.labelEn}
                </span>
              </div>
              <div
                className={cn(
                  "font-display text-3xl md:text-5xl font-medium leading-none",
                  s.valueClass,
                )}
              >
                {s.value}
              </div>
              <div className="mt-2 font-body text-sm text-ink-muted">
                {s.label}
              </div>
            </div>
          );
        })}
      </section>

      {/* 图表日期范围筛选 - 同时控制下方两个图表 */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink/15 bg-paper-card p-3 md:p-4 hover:shadow-paper-hover">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-ink-light" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            日期范围
          </span>
          {dateRange ? (
            <span className="font-mono text-xs tabular-nums text-ink">
              {dateRange.start} → {dateRange.end}
              <span className="ml-2 text-ink-light">
                共 {chartDates.length} 天
              </span>
            </span>
          ) : (
            <span className="font-mono text-xs text-ink-light">
              最近 14 天 · 点击日历选择自定义范围
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={(range) => setDateRange(range)}
          />
          {dateRange && (
            <button
              onClick={() => setDateRange(null)}
              className="rounded-md border border-ink/15 px-2 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-red/40 hover:text-accent-red"
            >
              重置
            </button>
          )}
        </div>
      </section>

      {/* 每日新增柱状图 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 hover:shadow-paper-hover">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Daily New Words</div>
            <h3 className="font-display text-2xl font-medium text-ink">
              每日新增词汇
            </h3>
          </div>
          <TrendingUp className="h-5 w-5 text-ink-light" strokeWidth={1.5} />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--c-ink-light) / 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(var(--c-ink-light))",
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={{ stroke: "hsl(var(--c-ink) / 0.15)" }}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "hsl(var(--c-ink-light))",
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--c-ink) / 0.04)" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--c-paper-card))",
                  border: "1px solid hsl(var(--c-ink) / 0.15)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--c-ink))", fontWeight: 600 }}
              />
              <Bar
                dataKey="added"
                name="新增"
                fill="hsl(var(--c-ink-muted))"
                radius={[2, 2, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 累计折线图 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 hover:shadow-paper-hover">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Cumulative Growth</div>
            <h3 className="font-display text-2xl font-medium text-ink">
              累计词汇量趋势
            </h3>
          </div>
          <div className="flex items-center gap-4 font-mono text-2xs uppercase tracking-editorial">
            <span className="flex items-center gap-1.5 text-accent-red">
              <span className="h-2 w-2 rounded-full bg-accent-red" />
              生词
            </span>
            <span className="flex items-center gap-1.5 text-accent-green">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              已掌握
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={cumulativeData}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="hsl(var(--c-ink-light) / 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "hsl(var(--c-ink-light))",
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={{ stroke: "hsl(var(--c-ink) / 0.15)" }}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "hsl(var(--c-ink-light))",
                  fontSize: 11,
                  fontFamily: "JetBrains Mono",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--c-paper-card))",
                  border: "1px solid hsl(var(--c-ink) / 0.15)",
                  borderRadius: "6px",
                  fontFamily: "JetBrains Mono",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--c-ink))", fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="生词"
                stroke="hsl(var(--c-accent-red))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--c-accent-red))", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="已掌握"
                stroke="hsl(var(--c-accent-green))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--c-accent-green))", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 今日复习汇总 */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md border border-ink/15 bg-paper-card p-5 hover:shadow-paper-hover">
          <div className="eyebrow mb-2">Today's Reviews</div>
          <div className="font-display text-2xl md:text-4xl font-medium text-ink">
            {todayReviews.length}
          </div>
          <div className="mt-1 font-body text-xs text-ink-light">
            今日总复习次数
          </div>
        </div>
        <div className="rounded-md border border-ink/15 bg-paper-card p-5 hover:shadow-paper-hover">
          <div className="eyebrow mb-2 text-accent-green">Correct</div>
          <div className="font-display text-2xl md:text-4xl font-medium text-accent-green">
            {todayCorrect}
          </div>
          <div className="mt-1 font-body text-xs text-ink-light">
            答对次数
          </div>
        </div>
        <div className="rounded-md border border-ink/15 bg-paper-card p-5 hover:shadow-paper-hover">
          <div className="eyebrow mb-2 text-accent-red">Wrong</div>
          <div className="font-display text-2xl md:text-4xl font-medium text-accent-red">
            {todayWrong}
          </div>
          <div className="mt-1 font-body text-xs text-ink-light">
            答错次数
          </div>
        </div>
      </section>

      {/* 熟练度排行 - 错误最多 / 正确最多 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 hover:shadow-paper-hover">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow mb-1">Mastery Ranking</div>
            <h3 className="font-display text-2xl font-medium text-ink">
              熟练度排行
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {/* 显示数量选择器 */}
            <div className="flex items-center gap-1">
              <span className="mr-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
                显示
              </span>
              {([5, 10, 20, 50, "all"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRankLimit(opt)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-2xs tabular-nums transition-colors",
                    rankLimit === opt
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/15 text-ink-light hover:border-ink/30 hover:text-ink",
                  )}
                >
                  {opt === "all" ? "全部" : opt}
                </button>
              ))}
            </div>
            <Archive className="h-5 w-5 text-ink-light" strokeWidth={1.5} />
          </div>
        </div>
        <MasteryRanking
          words={words}
          logs={logs}
          limit={rankLimit}
        />
      </section>
    </div>
  );
}

function MasteryRanking({
  words,
  logs,
  limit = 8,
}: {
  words: import("@/types").Word[];
  logs: import("@/types").ReviewLog[];
  /** 显示数量：数字表示前 N 个，"all" 表示全部 */
  limit?: number | "all";
}) {
  // 按单词聚合正确/错误次数
  const ranked = useMemo(() => {
    const map = new Map<string, { correct: number; wrong: number }>();
    for (const l of logs) {
      const entry = map.get(l.wordId) ?? { correct: 0, wrong: 0 };
      if (l.correct) entry.correct += 1;
      else entry.wrong += 1;
      map.set(l.wordId, entry);
    }
    return words
      .map((w) => {
        const s = map.get(w.id) ?? { correct: 0, wrong: 0 };
        return { word: w, correct: s.correct, wrong: s.wrong };
      })
      .filter((r) => r.correct > 0 || r.wrong > 0);
  }, [words, logs]);

  const applyLimit = <T,>(arr: T[]) =>
    limit === "all" ? arr : arr.slice(0, limit);

  const mostWrong = applyLimit(
    [...ranked]
      .filter((r) => r.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.correct - a.correct),
  );
  const mostCorrect = applyLimit(
    [...ranked]
      .filter((r) => r.correct > 0)
      .sort((a, b) => b.correct - a.correct || a.wrong - b.wrong),
  );

  if (ranked.length === 0) {
    return (
      <div className="py-8 text-center font-body text-sm text-ink-light">
        暂无复习记录
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <RankList
        title="错误最多"
        titleEn="Most Wrong"
        accent="text-accent-red"
        items={mostWrong.map((r) => ({
          word: r.word,
          count: r.wrong,
          countLabel: "错",
        }))}
      />
      <RankList
        title="正确最多"
        titleEn="Most Correct"
        accent="text-accent-green"
        items={mostCorrect.map((r) => ({
          word: r.word,
          count: r.correct,
          countLabel: "对",
        }))}
      />
    </div>
  );
}

function RankList({
  title,
  titleEn,
  accent,
  items,
}: {
  title: string;
  titleEn: string;
  accent: string;
  items: Array<{
    word: import("@/types").Word;
    count: number;
    countLabel: string;
  }>;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2 border-b border-ink/10 pb-2">
        <span className={cn("font-display text-lg font-medium", accent)}>
          {title}
        </span>
        <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
          {titleEn}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-6 text-center font-body text-xs text-ink-light">
          暂无数据
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li
              key={item.word.id}
              className="flex items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-paper-warm/40"
            >
              <span className="w-5 flex-shrink-0 text-center font-mono text-2xs text-ink-light tabular-nums">
                {i + 1}
              </span>
              <span className="w-20 md:w-28 flex-shrink-0 font-serif text-base font-medium tracking-word text-ink">
                {item.word.word}
              </span>
              <span className="hidden sm:block w-12 flex-shrink-0 font-mono text-xs italic text-accent-gold">
                {item.word.pos}
              </span>
              <span className="min-w-0 flex-1 truncate font-body text-sm text-ink-soft">
                {item.word.meaning}
              </span>
              <span
                className={cn(
                  "flex-shrink-0 rounded-sm px-2 py-0.5 font-mono text-2xs tabular-nums",
                  accent,
                )}
              >
                {item.count} {item.countLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

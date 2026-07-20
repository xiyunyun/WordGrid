import { useMemo, useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Plus,
  Inbox,
  StickyNote,
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Filter,
  X,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Eye,
  EyeOff,
} from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { selectDueAndTodayNewCount } from "@/store/wordStore";
import { useDateNotesStore, truncateNote } from "@/store/dateNotes";
import { useDisplaySettingsStore } from "@/store/displaySettings";
import { COMMON_POS } from "@/lib/pos";
import {
  todayKey,
  formatMD,
  weekdayCN,
  weekdayEN,
  isDue,
} from "@/lib/review";
import WordCell from "@/components/WordCell";
import DateNoteModal from "@/components/DateNoteModal";
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
  words: Word[];
}

// 模块级缓存：路由切换时模块不重新加载（保持状态），刷新页面时模块重新加载（重置到默认）
// 复用 Wordbook 的方案：切走再回来保持折叠状态、滚动位置和筛选状态，只有刷新/重启才重置
let cachedCollapsed: Set<string> | null = null;
let cachedScrollY = 0;
let cachedSortAsc = false;
let cachedFilterDueOnly = false;
let cachedFilterNoteKeyword = "";
let cachedFilterPos: Set<string> | null = null;

export default function DailyGrid({
  onRequestAdd,
  onReviewDue,
  onRequestEdit,
  onRequestNote,
}: DailyGridProps) {
  const words = useWordStore((s) => s.words);
  const dateNotes = useDateNotesStore((s) => s.notes);
  // 从模块级缓存恢复折叠状态，无缓存则默认空集（全部展开）
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => cachedCollapsed ?? new Set(),
  );
  // 折叠状态变化时同步到模块级缓存
  useEffect(() => {
    cachedCollapsed = collapsed;
  }, [collapsed]);

  // 滚动位置：挂载时恢复，卸载时保存
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (!scrollRestored.current && cachedScrollY > 0) {
      // 等待 DOM 渲染完成再恢复滚动位置
      const t = setTimeout(() => {
        window.scrollTo({ top: cachedScrollY, behavior: "auto" });
        scrollRestored.current = true;
      }, 50);
      return () => clearTimeout(t);
    }
    scrollRestored.current = true;
  }, []);

  useEffect(() => {
    return () => {
      // 组件卸载（路由切走）时保存滚动位置
      cachedScrollY = window.scrollY;
    };
  }, []);

  // 日期备注弹窗状态
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteModalDate, setNoteModalDate] = useState("");

  // ============ 筛选与排序状态（均走模块级缓存，路由切换保持） ============
  // 排序：false=倒序（最新在前，默认），true=正序（最早在前）
  const [sortAsc, setSortAsc] = useState<boolean>(() => cachedSortAsc);
  useEffect(() => { cachedSortAsc = sortAsc; }, [sortAsc]);

  // 只显示待复习日期
  const [filterDueOnly, setFilterDueOnly] = useState<boolean>(() => cachedFilterDueOnly);
  useEffect(() => { cachedFilterDueOnly = filterDueOnly; }, [filterDueOnly]);

  // 备注关键词搜索
  const [filterNoteKeyword, setFilterNoteKeyword] = useState<string>(() => cachedFilterNoteKeyword);
  useEffect(() => { cachedFilterNoteKeyword = filterNoteKeyword; }, [filterNoteKeyword]);

  // 词性筛选（多选，多词性单词任一命中即显示）
  const [filterPos, setFilterPos] = useState<Set<string>>(() => cachedFilterPos ?? new Set());
  useEffect(() => { cachedFilterPos = filterPos; }, [filterPos]);

  // 词性筛选面板展开/收起
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // 显示设置面板展开/收起（控制单词块各信息行的显隐）
  const [displayPanelOpen, setDisplayPanelOpen] = useState(false);
  const displaySettings = useDisplaySettingsStore();
  // 是否有隐藏项（用于按钮激活指示）
  const hasHiddenItem =
    !displaySettings.showPos ||
    !displaySettings.showPhonetic ||
    !displaySettings.showMeaning ||
    !displaySettings.showStage ||
    !displaySettings.showNote;

  const today = todayKey();
  // 红点提示数量：到期词 ∪ 当日新加未掌握词（与生词本「自我检测」和导航红点逻辑一致）
  // 当天新加的 10 个词会让红点从 5 变成 15，而不是只反映到期词数量
  const dueCount = selectDueAndTodayNewCount(words);
  const countdown = useMidnightCountdown();

  // 从所有单词中实际出现的词性集合（只显示有对应单词的词性）
  const availablePos = useMemo(() => {
    const set = new Set<string>();
    for (const w of words) {
      if (!w.pos) continue;
      // 拆分多词性字符串（空格分隔）
      const parts = w.pos.split(/\s+/).filter(Boolean);
      parts.forEach((p) => set.add(p));
    }
    // 保持 COMMON_POS 的标准顺序，只保留实际出现的
    return COMMON_POS.filter((p) => set.has(p));
  }, [words]);

  // 切换词性选中
  const togglePos = (p: string) => {
    setFilterPos((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  // 是否有任何筛选条件激活
  const hasActiveFilter =
    filterDueOnly || filterNoteKeyword.trim().length > 0 || filterPos.size > 0;

  // 清空所有筛选
  const clearAllFilters = () => {
    setFilterDueOnly(false);
    setFilterNoteKeyword("");
    setFilterPos(new Set());
  };

  // 按日期分组（先按筛选条件过滤单词，再按日期分组）
  // 注意：词性筛选在单词层生效后，对应的日期板块会自动展开以显示筛选结果
  const groups: DateGroup[] = useMemo(() => {
    const keyword = filterNoteKeyword.trim().toLowerCase();

    // 第一轮：按单词/日期筛选
    const map = new Map<string, Word[]>();
    for (const w of words) {
      // 词性筛选：多词性单词任一命中即保留
      if (filterPos.size > 0) {
        if (!w.pos) continue;
        const wPos = w.pos.split(/\s+/).filter(Boolean);
        if (!wPos.some((p) => filterPos.has(p))) continue;
      }
      if (!map.has(w.date)) map.set(w.date, []);
      map.get(w.date)!.push(w);
    }

    // 第二轮：按日期维度筛选
    let entries = Array.from(map.entries()).map(([date, ws]) => ({ date, words: ws }));
    if (filterDueOnly) {
      entries = entries.filter((g) =>
        g.words.some((w) => w.isDifficult && !w.isMastered && isDue(w.nextReview)),
      );
    }
    if (keyword) {
      entries = entries.filter((g) => {
        const note = (dateNotes[g.date] || "").toLowerCase();
        return note.includes(keyword);
      });
    }

    // 排序
    return entries.sort((a, b) =>
      sortAsc ? (a.date < b.date ? -1 : 1) : a.date < b.date ? 1 : -1,
    );
  }, [words, filterPos, filterDueOnly, filterNoteKeyword, dateNotes, sortAsc]);

  // 词性筛选激活时，自动展开所有（筛选后的）日期板块，让筛选结果立即可见
  // 使用派生值而非副作用修改 collapsed，避免与用户手动折叠冲突
  const effectiveCollapsed = filterPos.size > 0 ? new Set<string>() : collapsed;

  const toggleCollapse = (date: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // 收起全部 / 展开全部 —— 两个纯粹独立的操作，不做复杂状态判断
  // Bug 预防：通过 disabled 状态阻止无效点击（全部展开时「展开」禁用，全部收起时「收起」禁用）
  const expandAll = () => {
    setCollapsed(new Set());
  };
  const collapseAll = () => {
    setCollapsed(new Set(groups.map((g) => g.date)));
  };

  const openNoteModal = (date: string) => {
    setNoteModalDate(date);
    setNoteModalOpen(true);
  };

  if (words.length === 0) {
    return <EmptyState onRequestAdd={() => onRequestAdd()} />;
  }

  // 全部展开 / 全部收起的判定（用于按钮 disabled 状态，防止无效点击）
  // 词性筛选激活时使用 effectiveCollapsed（强制展开），此时按钮状态基于它判定
  const allExpanded = effectiveCollapsed.size === 0;
  const allCollapsed =
    groups.length > 0 && effectiveCollapsed.size === groups.length;

  return (
    <div className="space-y-6">
      {/* 顶部摘要条 */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/15 pb-5">
        <div>
          <div className="eyebrow mb-1">Daily Grid</div>
          <h2 className="font-display text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            每日网格
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
              dueCount > 0
                ? "border-accent-red/40 bg-accent-red/5 hover:bg-accent-red/10"
                : "border-ink/15 bg-paper-card hover:border-ink/30",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs",
                dueCount > 0
                  ? "bg-accent-red text-paper"
                  : "bg-ink/10 text-ink-light",
              )}
            >
              {dueCount}
            </div>
            <div className="text-left">
              <div
                className={cn(
                  "font-mono text-2xs uppercase tracking-editorial",
                  dueCount > 0 ? "text-accent-red" : "text-ink-light",
                )}
              >
                Due Today
              </div>
              <div className="font-body text-sm text-ink">
                {dueCount > 0
                  ? `今日需复习 ${dueCount} 词`
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

      {/* 日期列表工具条 —— 独立层级，包含展开/收起、排序、筛选等工具 */}
      <section className="space-y-2 border-b border-ink/10 pb-3">
        {/* 第一行：展开/收起 + 排序 + 筛选触发 + 统计 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* 展开全部 */}
            <button
              onClick={expandAll}
              disabled={allExpanded}
              className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-paper-card px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:border-ink/8 disabled:text-ink-light/40 disabled:hover:border-ink/8"
              title="展开全部日期"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
              展开
            </button>
            {/* 收起全部 */}
            <button
              onClick={collapseAll}
              disabled={allCollapsed}
              className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-paper-card px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:border-ink/8 disabled:text-ink-light/40 disabled:hover:border-ink/8"
              title="收起全部日期"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
              收起
            </button>

            {/* 分隔线 */}
            <span className="mx-1 h-5 w-px bg-ink/10" />

            {/* 排序切换：倒序（最新在前）↔ 正序（最早在前） */}
            <button
              onClick={() => setSortAsc((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                sortAsc
                  ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
              )}
              title={sortAsc ? "当前：正序（最早在前），点击切换为倒序" : "当前：倒序（最新在前），点击切换为正序"}
            >
              {sortAsc ? (
                <ArrowUpNarrowWide className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <ArrowDownNarrowWide className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              {sortAsc ? "最早" : "最新"}
            </button>

            {/* 只显示待复习 */}
            <button
              onClick={() => setFilterDueOnly((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                filterDueOnly
                  ? "border-accent-red/50 bg-accent-red/10 text-accent-red"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
              )}
              title="只显示今天有待复习词的日期"
            >
              待复习
            </button>

            {/* 筛选面板展开/收起按钮（含激活指示） */}
            <button
              onClick={() => setFilterPanelOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                filterPanelOpen || hasActiveFilter
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
              )}
              title="展开筛选面板"
            >
              <Filter className="h-3.5 w-3.5" strokeWidth={1.5} />
              筛选
              {hasActiveFilter && (
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-gold px-1 font-mono text-2xs text-paper">
                  {(filterDueOnly ? 1 : 0) +
                    (filterNoteKeyword.trim() ? 1 : 0) +
                    (filterPos.size > 0 ? 1 : 0)}
                </span>
              )}
            </button>

            {/* 清空筛选（仅有筛选时显示） */}
            {hasActiveFilter && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 rounded-md border border-ink/15 px-2 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-red/30 hover:text-accent-red"
                title="清空所有筛选"
              >
                <X className="h-3 w-3" strokeWidth={1.5} />
                清空
              </button>
            )}

            {/* 分隔线 */}
            <span className="mx-1 h-5 w-px bg-ink/10" />

            {/* 显示设置按钮 */}
            <button
              onClick={() => setDisplayPanelOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                displayPanelOpen || hasHiddenItem
                  ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
              )}
              title="设置单词块显示内容"
            >
              {hasHiddenItem ? (
                <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
              ) : (
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
              )}
              显示
            </button>
          </div>

          {/* 统计信息 */}
          <div className="flex items-center gap-3 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            <span>{groups.length} days</span>
            <span className="text-ink-light/40">·</span>
            <span>{words.length} entries</span>
            {effectiveCollapsed.size > 0 && (
              <>
                <span className="text-ink-light/40">·</span>
                <span>{effectiveCollapsed.size} 折叠</span>
              </>
            )}
          </div>
        </div>

        {/* 第二行：筛选面板（可折叠） */}
        {filterPanelOpen && (
          <div className="mt-2 space-y-3 rounded-md border border-ink/10 bg-paper-warm/40 p-3 animate-fade-in">
            {/* 备注关键词搜索 */}
            <div>
              <label className="eyebrow mb-1.5 block">Search Note · 按备注搜索</label>
              <div className="relative max-w-sm">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-light"
                  strokeWidth={1.5}
                />
                <input
                  value={filterNoteKeyword}
                  onChange={(e) => setFilterNoteKeyword(e.target.value)}
                  placeholder="输入关键词筛选备注（如：厨房、数字）"
                  className="w-full rounded-md border border-ink/15 bg-paper-card py-1.5 pl-8 pr-3 font-body text-xs text-ink placeholder:text-ink-light/50 focus:border-ink/30 focus:outline-none"
                />
                {filterNoteKeyword && (
                  <button
                    onClick={() => setFilterNoteKeyword("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-light hover:bg-ink/10 hover:text-ink"
                    aria-label="清空"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>

            {/* 词性多选筛选 —— 只显示实际有对应单词的词性 */}
            {availablePos.length > 0 && (
              <div>
                <label className="eyebrow mb-1.5 block">
                  POS · 词性筛选（可多选，多词性单词任一命中即显示）
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availablePos.map((p) => {
                    const active = filterPos.has(p);
                    return (
                      <button
                        key={p}
                        onClick={() => togglePos(p)}
                        className={cn(
                          "rounded-md border px-2.5 py-1 font-mono text-2xs transition-all",
                          active
                            ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                            : "border-ink/15 text-ink-light hover:border-accent-gold/30 hover:text-ink",
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                {filterPos.size > 0 && (
                  <p className="mt-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light">
                    已选 {filterPos.size} 项 · 筛选时所有日期自动展开
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 第三行：显示设置面板（可折叠）—— 控制单词块各信息行的显隐 */}
        {displayPanelOpen && (
          <div className="mt-2 space-y-3 rounded-md border border-ink/10 bg-paper-warm/40 p-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <label className="eyebrow">
                Display · 单词块显示内容（单词本身始终显示）
              </label>
              {hasHiddenItem && (
                <button
                  onClick={() => displaySettings.showAll()}
                  className="rounded-md border border-ink/15 px-2 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-gold/30 hover:text-accent-gold"
                  title="一键显示全部"
                >
                  全部显示
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "showPos" as const, label: "词性" },
                { key: "showPhonetic" as const, label: "音标" },
                { key: "showMeaning" as const, label: "词意" },
                { key: "showStage" as const, label: "记忆阶段" },
                { key: "showNote" as const, label: "笔记" },
              ].map(({ key, label }) => {
                const active = displaySettings[key];
                return (
                  <button
                    key={key}
                    onClick={() => displaySettings.toggle(key)}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-2xs transition-all",
                      active
                        ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                        : "border-ink/15 text-ink-light hover:border-ink/30 hover:text-ink",
                    )}
                  >
                    {active ? (
                      <Eye className="h-3 w-3" strokeWidth={1.5} />
                    ) : (
                      <EyeOff className="h-3 w-3" strokeWidth={1.5} />
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
            {hasHiddenItem && (
              <p className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                已隐藏 {5 -
                  [displaySettings.showPos, displaySettings.showPhonetic, displaySettings.showMeaning, displaySettings.showStage, displaySettings.showNote].filter(Boolean).length} 项 · 关闭后单词块会自适应缩小
              </p>
            )}
          </div>
        )}
      </section>

      {/* 日期行列表 */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isToday = group.date === today;
          // 词性筛选激活时强制展开，否则使用用户折叠状态
          const isCollapsed = effectiveCollapsed.has(group.date);
          const difficultCount = group.words.filter((w) => w.isDifficult).length;
          const dueCount = group.words.filter(
            (w) => w.isDifficult && !w.isMastered && isDue(w.nextReview),
          ).length;
          const note = dateNotes[group.date] || "";
          const notePreview = truncateNote(note, 24);

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
                {/* 区块 1：日期 + 今日标记 */}
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

                {/* 区块 2：周几（中文 + 英文） */}
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
                  {/* 备注摘要 */}
                  {notePreview && (
                    <span className="hidden items-center gap-1 font-body text-xs text-ink-muted sm:flex">
                      <StickyNote
                        className="h-3 w-3 text-accent-gold"
                        strokeWidth={1.5}
                      />
                      <span className="italic">{notePreview}</span>
                    </span>
                  )}
                </div>

                {/* 右侧操作 */}
                <div className="flex items-center gap-2">
                  {/* 备注按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openNoteModal(group.date);
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                      note
                        ? "border-accent-gold/40 bg-accent-gold/5 text-accent-gold hover:bg-accent-gold/10"
                        : "border-ink/15 text-ink-light hover:border-ink/30 hover:text-ink",
                    )}
                    title={note ? "查看/编辑备注" : "添加备注"}
                  >
                    <StickyNote className="h-4 w-4" strokeWidth={1.5} />
                  </button>
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

              {/* 备注摘要行（折叠时不显示，移动端始终显示在头部下方） */}
              {!isCollapsed && notePreview && (
                <div className="flex items-center gap-1 border-t border-ink/8 bg-accent-gold/3 px-3 py-1.5 md:px-6 sm:hidden">
                  <StickyNote
                    className="h-3 w-3 flex-shrink-0 text-accent-gold"
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-xs italic text-ink-muted">
                    {notePreview}
                  </span>
                </div>
              )}

              {/* 单词单元格网格区 - 自适应多行排列 */}
              {!isCollapsed && (
                <div className="border-t border-ink/8 px-2 py-3 md:px-4 animate-fade-in">
                  <div className="grid gap-2 md:gap-3 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
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
        {/* 筛选后无结果提示 */}
        {groups.length === 0 && hasActiveFilter && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Filter className="mb-3 h-8 w-8 text-ink-light" strokeWidth={1} />
            <div className="eyebrow mb-1">No Matches</div>
            <p className="mb-4 font-body text-sm text-ink-muted">
              没有符合当前筛选条件的日期
            </p>
            <button
              onClick={clearAllFilters}
              className="btn-ghost"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              清空筛选
            </button>
          </div>
        )}
      </div>

      {/* 日期备注编辑弹窗 */}
      <DateNoteModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        date={noteModalDate}
      />
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
        开始你的每日网格
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

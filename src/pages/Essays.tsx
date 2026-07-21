import { useMemo, useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Plus,
  StickyNote,
  ChevronsDownUp,
  ChevronsUpDown,
  Pencil,
  Trash2,
  Quote,
} from "lucide-react";
import { useEssayStore } from "@/store/essayStore";
import {
  todayKey,
  formatMD,
  weekdayCN,
  weekdayEN,
} from "@/lib/review";
import AddEssayDrawer from "@/components/AddEssayDrawer";
import SpeakButton from "@/components/SpeakButton";
import type { Essay } from "@/types";
import { cn } from "@/lib/utils";

interface EssaysProps {
  /** 外部触发的添加抽屉打开（来自 AppShell 的 Add 按钮） */
  addTrigger?: number;
}

interface DateGroup {
  date: string;
  essays: Essay[];
}

// 模块级缓存：路由切换时保持状态，刷新页面时重置
let cachedCollapsed: Set<string> | null = null;
let cachedSortAsc = false;

export default function Essays({ addTrigger }: EssaysProps) {
  const essays = useEssayStore((s) => s.essays);
  const removeEssay = useEssayStore((s) => s.removeEssay);

  // 折叠状态
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => cachedCollapsed ?? new Set(),
  );
  useEffect(() => {
    cachedCollapsed = collapsed;
  }, [collapsed]);

  // 排序：false=倒序（最新在前），true=正序
  const [sortAsc, setSortAsc] = useState<boolean>(() => cachedSortAsc);
  useEffect(() => {
    cachedSortAsc = sortAsc;
  }, [sortAsc]);

  // 添加/编辑抽屉
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string | undefined>(undefined);
  const [editEssay, setEditEssay] = useState<Essay | null>(null);

  // 监听外部添加触发（AppShell 的 Add 按钮）
  // 仅当 addTrigger 真正递增时才打开抽屉
  // 通过比较前后值避免：
  //   1. 首次挂载时误触发（prevRef 未初始化）
  //   2. StrictMode 双重执行 effect 导致的二次触发（同值不递增）
  //   3. 路由切走再回来时 addTrigger 保持非零但未变化的误触发
  const prevTriggerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (addTrigger === undefined) return;
    // 首次记录或值未变化（StrictMode 二次执行 / 路由切回）都不触发
    if (prevTriggerRef.current === undefined) {
      prevTriggerRef.current = addTrigger;
      return;
    }
    if (addTrigger <= prevTriggerRef.current) return;
    prevTriggerRef.current = addTrigger;
    setEditEssay(null);
    setDrawerDate(undefined);
    setDrawerOpen(true);
  }, [addTrigger]);

  const openAdd = (date?: string) => {
    setEditEssay(null);
    setDrawerDate(date);
    setDrawerOpen(true);
  };

  const openEdit = (essay: Essay) => {
    setEditEssay(essay);
    setDrawerDate(undefined);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditEssay(null);
    setDrawerDate(undefined);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确认删除这条随笔？")) {
      removeEssay(id);
    }
  };

  // 按日期分组
  const groups: DateGroup[] = useMemo(() => {
    const map = new Map<string, Essay[]>();
    for (const e of essays) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    // 同一天内按创建时间升序（早录入在前）
    for (const arr of map.values()) {
      arr.sort((a, b) => a.createdAt - b.createdAt);
    }
    return Array.from(map.entries())
      .map(([date, es]) => ({ date, essays: es }))
      .sort((a, b) => (sortAsc ? (a.date < b.date ? -1 : 1) : a.date < b.date ? 1 : -1));
  }, [essays, sortAsc]);

  const allCollapsed =
    groups.length > 0 && collapsed.size === groups.length;

  const allExpanded = groups.length > 0 && collapsed.size === 0;

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(groups.map((g) => g.date)));

  const toggleCollapse = (date: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const today = todayKey();

  // 空状态
  if (essays.length === 0) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Quote className="mb-4 h-10 w-10 text-ink-light" strokeWidth={1} />
          <div className="eyebrow mb-2">Empty Essays</div>
          <h2 className="mb-2 font-display text-3xl font-medium text-ink">
            开始你的随笔摘录
          </h2>
          <p className="mb-6 max-w-md font-body text-sm text-ink-muted">
            记录让你心动的句子和翻译。每条随笔都像一张便签贴纸，按日期分组，
            内容自适应长度展示。
          </p>
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            添加第一条随笔
          </button>
        </div>
        <AddEssayDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          defaultDate={drawerDate}
          editEssay={editEssay}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">Essays</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            时光随笔
            <span className="ml-3 font-serif text-lg italic text-ink-light">
              {essays.length} entries
            </span>
          </h2>
          <button onClick={() => openAdd()} className="btn-gold">
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>添加随笔</span>
          </button>
        </div>
      </section>

      {/* 工具条 */}
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 展开 / 收起 */}
          <button
            onClick={expandAll}
            disabled={allExpanded}
            className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-paper-card px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:border-ink/8 disabled:text-ink-light/40"
            title="展开全部日期"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
            展开
          </button>
          <button
            onClick={collapseAll}
            disabled={allCollapsed}
            className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-paper-card px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink disabled:cursor-not-allowed disabled:border-ink/8 disabled:text-ink-light/40"
            title="收起全部日期"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" strokeWidth={1.5} />
            收起
          </button>

          <span className="mx-1 h-5 w-px bg-ink/10" />

          {/* 排序切换 */}
          <button
            onClick={() => setSortAsc((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
              sortAsc
                ? "border-accent-gold/50 bg-accent-gold/10 text-accent-gold"
                : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
            )}
            title={
              sortAsc
                ? "当前：正序（最早在前），点击切换为倒序"
                : "当前：倒序（最新在前），点击切换为正序"
            }
          >
            {sortAsc ? "最早" : "最新"}
          </button>
        </div>

        {/* 统计 */}
        <div className="flex items-center gap-3 font-mono text-2xs uppercase tracking-editorial text-ink-light">
          <span>{groups.length} days</span>
          <span className="text-ink-light/40">·</span>
          <span>{essays.length} entries</span>
        </div>
      </section>

      {/* 日期分组列表 */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isToday = group.date === today;
          const isCollapsed = collapsed.has(group.date);

          return (
            <section
              key={group.date}
              id={`essay-date-${group.date}`}
              className={cn(
                "scroll-mt-32 overflow-hidden rounded-md border bg-paper-card/60",
                isToday ? "border-ink/25 hover:shadow-paper-hover" : "border-ink/10",
              )}
            >
              {/* 日期头部 */}
              <header
                className="flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors hover:bg-paper-warm/40 md:gap-8 md:px-6 md:py-4"
                onClick={() => toggleCollapse(group.date)}
              >
                {/* 日期 */}
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

                {/* 周几 */}
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

                {/* 统计 */}
                <div className="flex flex-1 flex-wrap items-baseline gap-3 border-l border-ink/10 pl-3 md:gap-6 md:pl-8">
                  <div className="flex items-baseline gap-1 md:gap-2">
                    <span className="font-serif text-base font-medium text-ink md:text-xl">
                      {group.essays.length}
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                      essays
                    </span>
                  </div>
                </div>

                {/* 右侧操作 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openAdd(group.date);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-ink/20 text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
                    title="向这一天添加随笔"
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

              {/* 瀑布流卡片容器
                  使用 CSS columns 实现瀑布流，每个卡片用 break-inside-avoid 避免被切割
                  - 移动端 1 列
                  - 平板 2 列
                  - 桌面 3 列
                  卡片高度自适应内容，不会被截断 */}
              {!isCollapsed && (
                <div className="border-t border-ink/8 px-3 py-3 md:px-4 animate-fade-in">
                  <div className="columns-1 gap-3 sm:columns-2 md:columns-2 lg:columns-3 [&>*]:mb-3">
                    {group.essays.map((essay) => (
                      <EssayCard
                        key={essay.id}
                        essay={essay}
                        onEdit={() => openEdit(essay)}
                        onDelete={() => handleDelete(essay.id)}
                      />
                    ))}
                    {/* 添加占位卡 */}
                    <button
                      onClick={() => openAdd(group.date)}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink/20 py-6 text-ink-light transition-colors hover:border-ink/40 hover:text-ink"
                    >
                      <Plus className="h-5 w-5" strokeWidth={1.5} />
                      <span className="font-mono text-2xs uppercase tracking-editorial">
                        Add Essay
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <AddEssayDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        defaultDate={drawerDate}
        editEssay={editEssay}
      />
    </div>
  );
}

/* ============ 随笔卡片 ============ */
function EssayCard({
  essay,
  onEdit,
  onDelete,
}: {
  essay: Essay;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={cn(
        // v2.3.7：背景从 bg-paper（最亮，接近纯白）改为 bg-paper-card/60，与每日网格日期卡片一致
        "group flex w-full break-inside-avoid flex-col overflow-hidden rounded-md border bg-paper-card/60 p-4 transition-all hover:shadow-paper-hover hover:shadow-deep-hover",
        "border-ink/15",
      )}
    >
      {/* 正文 */}
      <div className="mb-2 flex items-start gap-2">
        <Quote
          className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-accent-gold/60"
          strokeWidth={1.5}
        />
        <p className="min-w-0 flex-1 break-words whitespace-pre-wrap font-serif text-base leading-relaxed text-ink md:text-lg">
          {essay.content}
        </p>
      </div>

      {/* 翻译 */}
      {essay.translation && (
        <div className="mt-1 mb-2 min-w-0 border-l-2 border-accent-gold/40 pl-3">
          <p className="break-words whitespace-pre-wrap font-body text-sm leading-relaxed text-ink-soft">
            {essay.translation}
          </p>
        </div>
      )}

      {/* 笔记 */}
      {essay.note && (
        <div className="mt-2 mb-2 rounded-sm border border-accent-gold/30 bg-accent-gold/5 px-3 py-2">
          <div className="mb-1 flex items-center gap-1 font-mono text-2xs uppercase tracking-editorial text-accent-gold">
            <StickyNote className="h-3 w-3" strokeWidth={1.5} />
            Note
          </div>
          <p className="break-words whitespace-pre-wrap font-body text-xs leading-relaxed text-ink-muted">
            {essay.note}
          </p>
        </div>
      )}

      {/* 底部操作栏：播音 / 编辑 / 删除 */}
      <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-2">
        <SpeakButton
          text={essay.content}
          size="sm"
          className="hover:bg-accent-gold/10"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded p-1 text-ink-light transition-colors hover:bg-ink/10 hover:text-ink"
            title="编辑随笔"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-ink-light transition-colors hover:bg-accent-red/10 hover:text-accent-red"
            title="删除随笔"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </article>
  );
}

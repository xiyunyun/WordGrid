import { useState, useEffect, useRef, useMemo } from "react";

import { useSearchParams } from "react-router-dom";
import {
  Eye,
  Shuffle,
  Keyboard,
  List,
  Check,
  X,
  RotateCcw,
  Bookmark,
  NotebookPen,
  Download,
  Volume2,
  Loader2,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import {
  selectDifficultWords,
  selectDueAndTodayNewWords,
  selectDueAndTodayNewCount,
  selectMasteredWords,
  selectRecentWords,
} from "@/store/wordStore";
import { shuffle, todayKey } from "@/lib/review";
import { STAGE_LABELS } from "@/types";
import type { Word, ReviewLog, ReviewMode } from "@/types";
import { cn } from "@/lib/utils";
import { speakWord } from "@/lib/tts";
import SpeakButton from "@/components/SpeakButton";
import SelfCheckFlow from "@/components/SelfCheckFlow";
import NoteModal from "@/components/NoteModal";
import ExportModal from "@/components/ExportModal";
import WordbookFilterBar, {
  DEFAULT_FILTER,
  type FilterState,
} from "@/components/WordbookFilterBar";

type ViewMode = "list" | "self_check" | "random" | "dictation" | "cards";
type ListTag = "due" | "difficult" | "mastered" | "recent7" | "all";
/** 自我检测练习范围 */
type SelfCheckScope = "due" | "all_difficult";

// 模块级缓存：路由切换时模块不重新加载（保持状态），刷新页面时模块重新加载（重置到默认）
let cachedMode: ViewMode | null = null;
let cachedTag: ListTag | null = null;
let cachedFilter: FilterState | null = null;
let cachedSelfCheckScope: SelfCheckScope | null = null;

export default function Wordbook() {
  const words = useWordStore((s) => s.words);
  // 从模块级缓存恢复，无缓存则默认 list
  const [mode, setMode] = useState<ViewMode>(() => cachedMode ?? "list");
  // mode 变化时同步到模块级缓存
  useEffect(() => {
    cachedMode = mode;
  }, [mode]);
  // 筛选状态：模块级缓存，刷新页面时重置
  const [filter, setFilter] = useState<FilterState>(() => cachedFilter ?? DEFAULT_FILTER);
  useEffect(() => {
    cachedFilter = filter;
  }, [filter]);
  // 自我检测练习范围：模块级缓存
  const [selfCheckScope, setSelfCheckScope] = useState<SelfCheckScope>(
    () => cachedSelfCheckScope ?? "due",
  );
  useEffect(() => {
    cachedSelfCheckScope = selfCheckScope;
  }, [selfCheckScope]);
  // 笔记查看弹窗
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteWord, setNoteWord] = useState<Word | null>(null);
  // 导出弹窗
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // 从 URL 读取 focus 参数（搜索跳转定位用），处理完后清除
  const [searchParams, setSearchParams] = useSearchParams();
  const focusWordId = searchParams.get("focus") || "";

  const difficultWords = selectDifficultWords(words);
  // 待复习列表使用「到期词 ∪ 当日新词」合并列表，与计数红点严格一致
  // 修复：之前列表只用 selectDueWords（仅到期词），导致当日新词不出现在列表中，
  // 但红点数字却包含当日新词，造成「数字显示 20 但列表只有 5 个」的不一致
  const dueWords = selectDueAndTodayNewWords(words);
  // Due Today 数量：与导航红点、Stats、DailyGrid 一致
  // （到期词 ∪ 当日新加未复习词，避免今日已复习的新词被重复计入）
  const dueTodayCount = selectDueAndTodayNewCount(words);
  const masteredWords = selectMasteredWords(words);
  const recentWords = selectRecentWords(words, 7);

  const openNoteModal = (word: Word) => {
    setNoteWord(word);
    setNoteModalOpen(true);
  };

  // 完全没有任何单词时才显示空状态
  const hasAnyWords = words.length > 0;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">Wordbook</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            温故而知新
            <span className="ml-3 font-serif text-lg italic text-ink-light">
              {words.length} in archive
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <p className="hidden max-w-md font-serif text-sm italic text-ink-muted sm:block">
              学而不思则罔，思而不学则殆。
            </p>
            <button
              onClick={() => setExportModalOpen(true)}
              disabled={words.length === 0}
              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-40"
              title="导出单词本"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              导出
            </button>
          </div>
        </div>

        {/* 艾宾浩斯遗忘曲线七阶段说明 */}
        <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2">
          <span className="mr-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            记忆阶段
          </span>
          {STAGE_LABELS.map((label, idx) => (
            <span
              key={label}
              className="flex items-center gap-1"
            >
              <span
                className={cn(
                  "font-mono text-2xs tabular-nums",
                  // 颜色渐进：暖灰 → 灰墨 → 金 → 墨绿（从生疏到熟练）
                  idx === 0 && "text-ink-light",
                  idx === 1 && "text-ink-muted",
                  idx === 2 && "text-accent-gold/70",
                  idx === 3 && "text-accent-gold",
                  idx === 4 && "text-accent-green/60",
                  idx === 5 && "text-accent-green/80",
                  idx === 6 && "text-accent-green",
                )}
              >
                {idx + 1}.{label}
              </span>
              {idx < STAGE_LABELS.length - 1 && (
                <span className="text-ink-light/40">→</span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* 模式切换 */}
      <nav className="flex flex-wrap gap-2">
        {[
    { key: "list" as ViewMode, label: "List", labelCN: "单词列表", icon: List },
    { key: "self_check" as ViewMode, label: "Self-Check", labelCN: "自我检测", icon: Eye },
    { key: "random" as ViewMode, label: "Random", labelCN: "随机抽查", icon: Shuffle },
    { key: "dictation" as ViewMode, label: "Dictation", labelCN: "听写测试", icon: Keyboard },
    { key: "cards" as ViewMode, label: "Cards", labelCN: "卡片浏览", icon: Layers },
  ].map((m) => {
          const Icon = m.icon;
          const active = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 transition-all",
                active
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span className="hidden sm:inline font-mono text-2xs uppercase tracking-editorial">
                {m.label}
              </span>
              <span className="font-body text-xs">· {m.labelCN}</span>
            </button>
          );
        })}
      </nav>

      {/* 共用筛选工具栏：根据当前 mode 显示不同筛选项 */}
      {hasAnyWords && (
        <WordbookFilterBar
          filter={filter}
          onChange={setFilter}
          showStage={mode === "list" || mode === "random" || mode === "dictation" || mode === "cards"}
          showPos={mode === "list" || mode === "random" || mode === "dictation" || mode === "cards"}
          showExcludeMastered={
            mode === "list" || mode === "random" || mode === "dictation" || mode === "cards"
          }
          showDates={true}
          selfCheckPlaceholder={
            mode === "self_check" ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                  练习范围
                </span>
                <button
                  onClick={() => setSelfCheckScope("due")}
                  className={cn(
                    "rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                    selfCheckScope === "due"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
                  )}
                >
                  到期词 + 当日新词
                </button>
                <button
                  onClick={() => setSelfCheckScope("all_difficult")}
                  className={cn(
                    "rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                    selfCheckScope === "all_difficult"
                      ? "border-ink bg-ink text-paper"
                      : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
                  )}
                >
                  全部生词
                </button>
              </div>
            ) : undefined
          }
        />
      )}

      {/* 空状态 - 仅当完全没有任何单词时 */}
      {!hasAnyWords && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bookmark
            className="mb-4 h-10 w-10 text-ink-light"
            strokeWidth={1}
          />
          <div className="eyebrow mb-2">No Words Yet</div>
          <h3 className="mb-2 font-display text-2xl font-medium text-ink">
            生词本暂无内容
          </h3>
          <p className="max-w-md font-body text-sm text-ink-muted">
            在每日网格中点击单词单元格即可标记为生词，
            被标记的单词会自动流转至此处并生成艾宾浩斯复习计划。
          </p>
        </div>
      )}

      {/* 模式内容 */}
      {hasAnyWords && (
        <>
          {mode === "list" && (
            <ListView
              dueWords={dueWords}
              dueTodayCount={dueTodayCount}
              difficultWords={difficultWords}
              masteredWords={masteredWords}
              recentWords={recentWords}
              allWords={words}
              filter={filter}
              focusWordId={focusWordId}
              onConsumeFocus={() => {
                // 定位完成后清除 URL 中的 focus，避免刷新重复滚动
                setSearchParams({}, { replace: true });
              }}
              onRequestNote={openNoteModal}
            />
          )}
          {mode === "self_check" && (
            <SelfCheckView
              key={`${selfCheckScope}-${filter.dates?.join(",") ?? ""}`}
              words={(() => {
                // 自我检测列表根据 selfCheckScope 决定
                let baseWords: Word[];
                if (selfCheckScope === "all_difficult") {
                  baseWords = difficultWords;
                } else {
                  // 默认：到期词 ∪ 当天新词（未复习），与待复习列表、红点数字严格一致
                  // dueWords 已是 selectDueAndTodayNewWords 的结果（含当日新词，已去重）
                  baseWords = dueWords;
                }
                // 应用日期筛选（如果工具栏启用了日期筛选）
                if (filter.dates && filter.dates.length > 0) {
                  return baseWords.filter((w) => filter.dates!.includes(w.date));
                }
                return baseWords;
              })()}
              onRequestNote={openNoteModal}
            />
          )}
          {mode === "random" && (
            <RandomView
              words={words}
              filter={filter}
              onRequestNote={openNoteModal}
            />
          )}
          {mode === "dictation" && (
            <DictationView
              words={words}
              filter={filter}
              onRequestNote={openNoteModal}
            />
          )}
          {mode === "cards" && (
            <CardsView
              words={words}
              filter={filter}
              onRequestNote={openNoteModal}
            />
          )}
        </>
      )}

      {/* 笔记查看弹窗 */}
      <NoteModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        word={noteWord}
      />

      {/* 导出弹窗 */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        words={words}
      />
    </div>
  );
}

/* ============ 极简列表 ============ */
function ListView({
  dueWords,
  dueTodayCount,
  difficultWords,
  masteredWords,
  recentWords,
  allWords,
  filter,
  focusWordId,
  onConsumeFocus,
  onRequestNote,
}: {
  dueWords: Word[];
  /** Due Today 标签显示的数量（到期词 ∪ 当日新加未复习词，与导航红点一致） */
  dueTodayCount: number;
  difficultWords: Word[];
  masteredWords: Word[];
  recentWords: Word[];
  allWords: Word[];
  filter: FilterState;
  /** 搜索跳转传入的目标单词 id，定位完成后会调用 onConsumeFocus 清除 */
  focusWordId?: string;
  onConsumeFocus?: () => void;
  onRequestNote: (word: Word) => void;
}) {
  const markMastered = useWordStore((s) => s.markMastered);
  const toggleDifficult = useWordStore((s) => s.toggleDifficult);

  // 标签筛选：从模块级缓存恢复，无缓存则按默认逻辑（有待复习→due，否则→difficult）
  const [activeTag, setActiveTag] = useState<ListTag>(
    () => cachedTag ?? (dueWords.length > 0 ? "due" : "difficult"),
  );
  // activeTag 变化时同步到模块级缓存
  useEffect(() => {
    cachedTag = activeTag;
  }, [activeTag]);

  // 搜索跳转：自动切到「全部」标签（确保目标词必定在列表中）
  useEffect(() => {
    if (!focusWordId) return;
    setActiveTag("all");
  }, [focusWordId]);

  // 标签切换后列表渲染完成，滚动到目标词并高亮
  const focusedRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (!focusWordId) return;
    // 等待 DOM 渲染（切到 all 标签后的列表）
    const t = setTimeout(() => {
      const el = document.getElementById(`word-${focusWordId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        focusedRef.current = el as HTMLLIElement;
        onConsumeFocus?.();
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusWordId, activeTag]);

  const tagWords =
    activeTag === "due"
      ? dueWords
      : activeTag === "difficult"
        ? difficultWords
        : activeTag === "mastered"
          ? masteredWords
          : activeTag === "recent7"
            ? recentWords
            : allWords;

  // 应用筛选工具栏的筛选（记忆阶段 + 词性 + 排除已掌握 + 日期）
  // 筛选为空时直接使用 tagWords，避免无谓的 filter 开销
  const filteredWords = useMemo(() => {
    if (!filter.stages && !filter.pos && !filter.excludeMastered && !filter.dates) return tagWords;
    return tagWords.filter((w) => {
      // 排除已掌握
      if (filter.excludeMastered && w.isMastered) return false;
      // 记忆阶段筛选：-1 表示已掌握，0-6 对应 reviewStage
      if (filter.stages) {
        const wordStage = w.isMastered ? -1 : w.reviewStage;
        if (!filter.stages.includes(wordStage)) return false;
      }
      // 词性筛选
      if (filter.pos && !filter.pos.includes(w.pos)) return false;
      // 日期筛选（多选）
      if (filter.dates && filter.dates.length > 0 && !filter.dates.includes(w.date)) return false;
      return true;
    });
  }, [tagWords, filter.stages, filter.pos, filter.excludeMastered, filter.dates]);

  // 复习标签下隐藏释义（点击显示），其余标签（含全部单词、近七日）直接显示
  const hideMeaning = activeTag === "due";

  const tags: Array<{
    key: ListTag;
    label: string;
    labelCN: string;
    count: number;
    accent: string;
  }> = [
    {
      key: "due",
      label: "Due Today",
      labelCN: "待复习",
      count: dueTodayCount,
      accent: "accent-red",
    },
    {
      key: "difficult",
      label: "Difficult",
      labelCN: "生词",
      count: difficultWords.length,
      accent: "accent-red",
    },
    {
      key: "mastered",
      label: "Mastered",
      labelCN: "已掌握",
      count: masteredWords.length,
      accent: "accent-green",
    },
    {
      key: "recent7",
      label: "Recent 7d",
      labelCN: "近七日",
      count: recentWords.length,
      accent: "accent-gold",
    },
    {
      key: "all",
      label: "All",
      labelCN: "全部",
      count: allWords.length,
      accent: "accent-gold",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 全部生词 + 标签筛选 */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-ink-light" strokeWidth={1.5} />
          <h3 className="font-display text-xl font-medium text-ink">
            全部生词
          </h3>
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            {tagWords.length} shown
          </span>
          <div className="flex-1 border-t border-ink/15" />
        </div>

        {/* 标签筛选条 - 位于"全部生词"标题下方 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tags.map((t) => {
            const active = activeTag === t.key;
            const accentClasses =
              t.accent === "accent-red"
                ? active
                  ? "border-accent-red/40 bg-accent-red/10 text-accent-red"
                  : "border-ink/15 bg-paper-card text-ink-light hover:border-accent-red/30 hover:text-accent-red"
                : t.accent === "accent-green"
                  ? active
                    ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-ink/15 bg-paper-card text-ink-light hover:border-accent-green/30 hover:text-accent-green"
                  : active
                    ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
                    : "border-ink/15 bg-paper-card text-ink-light hover:border-accent-gold/30 hover:text-accent-gold";
            return (
              <button
                key={t.key}
                onClick={() => setActiveTag(t.key)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors",
                  accentClasses,
                )}
              >
                <span className="hidden sm:inline font-mono text-2xs uppercase tracking-editorial">
                  {t.label}
                </span>
                <span className="font-body text-xs">· {t.labelCN}</span>
                <span className="font-mono text-2xs tabular-nums">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 当前标签下的单词列表（应用筛选工具栏筛选后）
         * v2.3.5：ul 自身承载统一背景 bg-paper-card/60，li 之间用 border-b 主题色细分隔线，
         * hover 时整行高亮 bg-paper-deep/40，背景无断开，行间分隔仅靠一条细线
         */}
        {filteredWords.length > 0 ? (
          <ul className="wordbook-grid overflow-hidden rounded-md border border-ink/10 bg-paper-card/60">
            {filteredWords.map((w) => (
              <MinimalRow
                key={w.id}
                word={w}
                hideMeaning={hideMeaning}
                focusHighlight={!!focusWordId && w.id === focusWordId}
                onMaster={() => markMastered(w.id)}
                onForget={() => toggleDifficult(w.id)}
                onRequestNote={onRequestNote}
              />
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center py-10 text-center font-body text-sm text-ink-light">
            {tagWords.length > 0 ? "当前筛选条件下暂无单词" : "该标签下暂无单词"}
          </div>
        )}
      </section>
    </div>
  );
}

function MinimalRow({
  word,
  highlighted = false,
  hideMeaning = false,
  focusHighlight = false,
  onMaster,
  onForget,
  onRequestNote,
}: {
  word: Word;
  highlighted?: boolean;
  hideMeaning?: boolean;
  /** 搜索跳转定位高亮（金色 ring 闪烁 1.6s） */
  focusHighlight?: boolean;
  onMaster: () => void;
  onForget: () => void;
  onRequestNote: (word: Word) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const showMeaning = !hideMeaning || revealed;

  // 搜索跳转高亮：1.6s 后自动消失
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!focusHighlight) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(t);
  }, [focusHighlight]);

  return (
    <li
      id={`word-${word.id}`}
      className={cn(
        // v2.3.5：背景由父 ul 统一承载，行间仅用一条主题色细线分隔
        // hover 整行高亮（subgrid 子项全部覆盖）
        "group px-2 py-2.5 md:py-3 border-b border-ink/5 last:border-b-0 transition-colors hover:bg-paper-deep/40",
        highlighted && "bg-accent-red/10",
        flash && "ring-2 ring-accent-gold ring-offset-2 ring-offset-paper-card bg-accent-gold/10",
      )}
    >
      {/* 等级 - 已掌握显示加深颜色的对勾 */}
      <div className="text-center">
        {highlighted ? (
          <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
            due
          </span>
        ) : word.isMastered ? (
          <Check
            className="mx-auto h-4 w-4 text-accent-green"
            strokeWidth={2.5}
          />
        ) : (
          <span
            className={cn(
              "font-mono text-2xs",
              // 颜色与七阶段展示同步：暖灰 → 灰墨 → 金 → 墨绿渐进
              word.reviewStage === 0 && "text-ink-light",
              word.reviewStage === 1 && "text-ink-muted",
              word.reviewStage === 2 && "text-accent-gold/70",
              word.reviewStage === 3 && "text-accent-gold",
              word.reviewStage === 4 && "text-accent-green/60",
              word.reviewStage === 5 && "text-accent-green/80",
              word.reviewStage === 6 && "text-accent-green",
            )}
          >
            {STAGE_LABELS[word.reviewStage]?.[0] || "·"}
          </span>
        )}
      </div>

      {/* 单词 + 音标 - 不使用删除线，保持字形完整以加强记忆 */}
      <div className="overflow-hidden">
        <span
          className={cn(
            "font-serif text-base md:text-lg font-medium tracking-word",
            word.isMastered ? "text-ink-soft" : "text-ink",
          )}
        >
          {word.word}
        </span>
        {word.phonetic && (
          <span className="ml-2 font-mono text-xs text-ink-light">
            {word.phonetic}
          </span>
        )}
      </div>

      {/* 词性 - 列宽由 grid 的 max-content 统一取最宽行 */}
      <div className="hidden sm:block overflow-hidden">
        <span className="font-mono text-xs italic text-accent-gold whitespace-nowrap">
          {word.pos}
        </span>
      </div>

      {/* 释义 - 复习标签下隐藏（点击显示），其余直接显示 */}
      <div className="overflow-hidden">
        {showMeaning ? (
          <span className="font-body text-xs md:text-sm text-ink-soft animate-fade-in">
            {word.meaning}
          </span>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="font-mono text-2xs uppercase tracking-editorial text-ink-light/60 transition-colors hover:text-ink-light"
          >
            · · · 点击显示释义
          </button>
        )}
      </div>

      {/* 语音播放按钮 */}
      <div className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <SpeakButton text={word.word} />
      </div>

      {/* 笔记按钮 - 点击打开二级菜单（NoteModal） */}
      <div className="hidden sm:flex">
        {word.note ? (
          <button
            onClick={() => onRequestNote(word)}
            className="flex items-center gap-1 rounded px-2 py-1 text-accent-gold/70 transition-colors hover:bg-accent-gold/10 hover:text-accent-gold"
            title="查看笔记"
          >
            <NotebookPen className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-2xs uppercase tracking-editorial">
              note
            </span>
          </button>
        ) : (
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light/30">
            —
          </span>
        )}
      </div>

      {/* 操作 - 根据单词状态显示唯一按钮：
          已掌握 → 遗忘（回到生词）；非已掌握 → 标熟 */}
      <div className="flex items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        {word.isMastered ? (
          <button
            onClick={onForget}
            className="flex items-center gap-1.5 rounded-md border border-accent-red/30 px-2.5 py-1.5 text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
            title="遗忘了，回到生词本"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-2xs uppercase tracking-editorial">
              遗忘
            </span>
          </button>
        ) : (
          <button
            onClick={onMaster}
            className="flex items-center gap-1.5 rounded-md border border-accent-green/30 px-2.5 py-1.5 text-accent-green transition-colors hover:bg-accent-green hover:text-paper"
            title="标记为已掌握"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            <span className="font-mono text-2xs uppercase tracking-editorial">
              标熟
            </span>
          </button>
        )}
      </div>
    </li>
  );
}

/* ============ 自我检测模式 ============ */
function SelfCheckView({ words, onRequestNote }: { words: Word[]; onRequestNote: (word: Word) => void }) {
  return (
    <div className="mx-auto max-w-2xl px-0">
      <SelfCheckFlow words={words} mode="self_check" persistKey="wordgrid-selfcheck-wordbook" onRequestNote={onRequestNote} />
    </div>
  );
}

/* ============ 随机抽查模式 - 基于全部单词的无限随机练习 ============ */

/**
 * 从复习日志聚合计算某 mode 的统计（今日/累计）
 * 数据源是已同步的 review_logs，天然跨设备同步
 */
function getPracticeStats(
  logs: ReviewLog[],
  mode: ReviewMode,
): { today: number; total: number } {
  const todayStart = new Date(todayKey() + "T00:00:00").getTime();
  let today = 0;
  let total = 0;
  for (const log of logs) {
    if (log.mode !== mode) continue;
    total++;
    if (log.reviewedAt >= todayStart) today++;
  }
  return { today, total };
}

function RandomView({ words, filter, onRequestNote }: { words: Word[]; filter: FilterState; onRequestNote: (word: Word) => void }) {
  // 应用筛选：记忆阶段 + 词性 + 排除已掌握 + 日期
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (filter.excludeMastered && w.isMastered) return false;
      if (filter.stages) {
        const wordStage = w.isMastered ? -1 : w.reviewStage;
        if (!filter.stages.includes(wordStage)) return false;
      }
      if (filter.pos && !filter.pos.includes(w.pos)) return false;
      if (filter.dates && filter.dates.length > 0 && !filter.dates.includes(w.date)) return false;
      return true;
    });
  }, [words, filter]);

  const [queue, setQueue] = useState<Word[]>(() => shuffle(filteredWords));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const logReview = useWordStore((s) => s.logReview);
  // 统计直接从 logs 聚合（已同步），无需独立 localStorage
  const logs = useWordStore((s) => s.logs);
  const stats = useMemo(
    () => getPracticeStats(logs, "random"),
    [logs],
  );

  // 词库变化时重新洗牌
  useEffect(() => {
    setQueue(shuffle(filteredWords));
    setIdx(0);
    setRevealed(false);
  }, [filteredWords.length]);

  const current = queue[idx];

  // 筛选后无可用单词
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shuffle className="mb-4 h-10 w-10 text-ink-light" strokeWidth={1} />
        <div className="eyebrow mb-2">No Words Match</div>
        <p className="font-body text-sm text-ink-muted">
          当前筛选条件下没有可用的单词，请调整筛选后重试。
        </p>
      </div>
    );
  }

  const handle = (correct: boolean) => {
    // 记录复习日志（计入统计页面熟练度排行，不推进艾宾浩斯节点）
    logReview(current.id, correct, "random");
    // 计数：本轮（今日/累计从 logs 自动聚合，无需手动维护）
    setSessionCount((n) => n + 1);

    // 推进：队列耗尽则自动重新洗牌（无限练习，不触发完成页）
    setRevealed(false);
    const nextIdx = idx + 1;
    if (nextIdx >= queue.length) {
      setQueue(shuffle(filteredWords));
      setIdx(0);
    } else {
      setIdx(nextIdx);
    }
  };

  const reshuffle = () => {
    setQueue(shuffle(filteredWords));
    setIdx(0);
    setRevealed(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shuffle className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Random Mode
          </span>
          {/* 计数：今日 · 累计 · 本轮 */}
          <span className="flex items-center gap-3 border-l border-ink/15 pl-3 font-mono text-2xs uppercase tracking-editorial">
            <span className="text-ink-light">
              今日{" "}
              <span className="text-accent-gold tabular-nums">
                {stats.today}
              </span>
            </span>
            <span className="text-ink-light">
              累计{" "}
              <span className="text-ink tabular-nums">{stats.total}</span>
            </span>
            <span className="text-ink-light">
              本轮{" "}
              <span className="text-ink-light tabular-nums">
                {sessionCount}
              </span>
            </span>
          </span>
        </div>
        <button onClick={reshuffle} className="btn-ghost">
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          换一批
        </button>
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-accent-gold/30 bg-paper-card p-6 md:p-12 text-center hover:shadow-paper-hover">
          <div className="eyebrow mb-4 text-accent-gold">Random Quiz</div>
          <h3 className="font-serif text-3xl md:text-5xl font-medium tracking-word text-ink">
            {current.word}
          </h3>
          <div className="mt-2 font-mono text-sm italic text-accent-gold">
            {current.pos}
          </div>
          <div className="mt-3 flex justify-center">
            <SpeakButton text={current.word} size="md" />
          </div>
          <div className="my-8 border-t border-dashed border-ink/15" />
          {revealed ? (
            <div className="animate-ink-bloom">
              <p className="font-body text-xl md:text-2xl text-ink-soft">
                {current.meaning}
              </p>
              {current.note && (
                <div
                  className="mt-4 cursor-pointer rounded-md border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-left transition-colors hover:bg-accent-gold/10"
                  onClick={() => onRequestNote(current)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                      Note · 笔记
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                      点击展开
                    </span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-2">
                    {current.note}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mx-auto flex w-full flex-col items-center gap-2 text-ink-light transition-colors hover:text-ink"
            >
              <Eye className="h-6 w-6" strokeWidth={1} />
              <span className="font-mono text-2xs uppercase tracking-editorial">
                显示释义
              </span>
            </button>
          )}
        </div>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => handle(false)}
            className="flex items-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/5 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            不认识
          </button>
          <button
            onClick={() => handle(true)}
            className="flex items-center gap-2 rounded-md border border-accent-green/40 bg-accent-green/5 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-green transition-colors hover:bg-accent-green hover:text-paper"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            认识
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ 听写测试模式 - 基于全部单词的无限听写练习 ============ */

function DictationView({ words, filter, onRequestNote }: { words: Word[]; filter: FilterState; onRequestNote: (word: Word) => void }) {
  // 应用筛选：记忆阶段 + 词性 + 排除已掌握 + 日期
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (filter.excludeMastered && w.isMastered) return false;
      if (filter.stages) {
        const wordStage = w.isMastered ? -1 : w.reviewStage;
        if (!filter.stages.includes(wordStage)) return false;
      }
      if (filter.pos && !filter.pos.includes(w.pos)) return false;
      if (filter.dates && filter.dates.length > 0 && !filter.dates.includes(w.date)) return false;
      return true;
    });
  }, [words, filter]);

  const [queue, setQueue] = useState<Word[]>(() => shuffle(filteredWords));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [sessionCount, setSessionCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 记录上次提交答案的时间戳，防止键盘连发导致刚出结果就自动跳到下一题
  const lastActionRef = useRef(0);
  const logReview = useWordStore((s) => s.logReview);
  // 统计直接从 logs 聚合（已同步），无需独立 localStorage
  const logs = useWordStore((s) => s.logs);
  const stats = useMemo(
    () => getPracticeStats(logs, "dictation"),
    [logs],
  );

  // 词库变化时重新洗牌
  useEffect(() => {
    setQueue(shuffle(filteredWords));
    setIdx(0);
    setInput("");
    setResult("idle");
  }, [filteredWords.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [idx]);

  // 以下函数和 hooks 必须在条件 return 之前定义（React Hooks 规则）
  const advance = () => {
    setInput("");
    setResult("idle");
    const nextIdx = idx + 1;
    // 队列耗尽则自动重新洗牌（无限练习）
    if (nextIdx >= queue.length) {
      setQueue(shuffle(filteredWords));
      setIdx(0);
    } else {
      setIdx(nextIdx);
    }
  };

  // 答错后重来一次：只重置输入状态，不推进到下一题
  const retry = () => {
    setInput("");
    setResult("idle");
  };

  // 答题后回车连贯操作：答对→下一题，答错/显示答案→再来一次
  // 防抖：提交答案后 500ms 内的回车忽略，避免键盘连发导致结果一闪而过
  useEffect(() => {
    if (result === "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // 提交瞬间键盘连发的回车不应触发跳转，等用户松手后再按
        if (Date.now() - lastActionRef.current < 500) return;
        if (result === "correct") {
          advance();
        } else {
          retry();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, idx, queue.length, words]);

  const current = queue[idx];

  // 筛选后无可用单词
  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Keyboard className="mb-4 h-10 w-10 text-ink-light" strokeWidth={1} />
        <div className="eyebrow mb-2">No Words Match</div>
        <p className="font-body text-sm text-ink-muted">
          当前筛选条件下没有可用的单词，请调整筛选后重试。
        </p>
      </div>
    );
  }

  const bumpStats = () => {
    // 今日/累计从 logs 自动聚合，这里只计本轮
    setSessionCount((n) => n + 1);
  };

  const submit = () => {
    if (!input.trim() || result !== "idle") return;
    const correct = input.trim().toLowerCase() === current.word.toLowerCase();
    setResult(correct ? "correct" : "wrong");
    lastActionRef.current = Date.now();
    // 记录复习日志（计入统计页面熟练度排行，不推进艾宾浩斯节点）
    logReview(current.id, correct, "dictation");
    bumpStats();
  };

  const showAnswer = () => {
    if (result !== "idle") return;
    setResult("wrong");
    lastActionRef.current = Date.now();
    // 显示答案视为答错
    logReview(current.id, false, "dictation");
    bumpStats();
  };

  const reshuffle = () => {
    setQueue(shuffle(filteredWords));
    setIdx(0);
    setInput("");
    setResult("idle");
  };

  // 听单词发音
  const handleSpeak = async () => {
    if (speaking) return;
    setSpeaking(true);
    await speakWord(current.word);
    setSpeaking(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Keyboard className="h-4 w-4 text-ink" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Dictation
          </span>
          {/* 计数：今日 · 累计 · 本轮 */}
          <span className="flex items-center gap-3 border-l border-ink/15 pl-3 font-mono text-2xs uppercase tracking-editorial">
            <span className="text-ink-light">
              今日{" "}
              <span className="text-ink tabular-nums">{stats.today}</span>
            </span>
            <span className="text-ink-light">
              累计{" "}
              <span className="text-ink tabular-nums">{stats.total}</span>
            </span>
            <span className="text-ink-light">
              本轮{" "}
              <span className="text-ink-light tabular-nums">
                {sessionCount}
              </span>
            </span>
          </span>
        </div>
        <button onClick={reshuffle} className="btn-ghost">
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          换一批
        </button>
      </div>

      <div className="mx-auto max-w-2xl">
        <div
          className={cn(
            "rounded-md border bg-paper-card p-6 md:p-12 text-center hover:shadow-paper-hover transition-colors",
            result === "correct"
              ? "border-accent-green/50"
              : result === "wrong"
                ? "border-accent-red/50 animate-shake"
                : "border-ink/15",
          )}
        >
          <div className="eyebrow mb-4">听发音拼写单词</div>

          {/* 发音按钮 - 听写核心功能 */}
          <div className="mb-4 flex justify-center">
            <button
              onClick={handleSpeak}
              disabled={speaking}
              className="flex items-center gap-2 rounded-md border border-accent-gold/50 bg-accent-gold/10 px-5 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-gold transition-colors hover:bg-accent-gold hover:text-paper disabled:opacity-50"
            >
              {speaking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  正在朗读...
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" strokeWidth={1.5} />
                  点击听单词
                </>
              )}
            </button>
          </div>

          {/* 显示词性与释义作为提示 */}
          <div className="font-mono text-sm italic text-accent-gold">
            {current.pos}
          </div>
          <h3 className="mt-3 font-body text-2xl md:text-4xl font-medium text-ink">
            {current.meaning}
          </h3>

          <div className="my-8 border-t border-dashed border-ink/15" />

          {/* 输入区 */}
          {result === "idle" ? (
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="输入单词拼写..."
              className="w-full rounded-md border border-ink/20 bg-paper px-4 py-2 md:py-3 text-center font-serif text-xl md:text-3xl tracking-word text-ink placeholder:text-ink-light/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
            />
          ) : (
            <div className="animate-fade-in">
              <div
                className={cn(
                  "font-serif text-2xl md:text-4xl font-medium tracking-word",
                  result === "correct" ? "text-accent-green" : "text-accent-red",
                )}
              >
                {input.trim() || "（未输入）"}
              </div>
              {result === "wrong" && (
                <div className="mt-2">
                  <div className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                    ✗ 答错了
                  </div>
                  <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
                    正确答案
                  </div>
                  <div className="font-serif text-3xl font-medium tracking-word text-accent-green">
                    {current.word}
                  </div>
                </div>
              )}
              {result === "correct" && (
                <div className="mt-2 font-mono text-2xs uppercase tracking-editorial text-accent-green">
                  ✓ 答对了
                </div>
              )}
              <div className="mt-3 flex justify-center">
                <SpeakButton text={current.word} size="md" />
              </div>
              {current.note && (
                <div
                  className="mt-4 cursor-pointer rounded-md border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-left transition-colors hover:bg-accent-gold/10"
                  onClick={() => onRequestNote(current)}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                      Note · 笔记
                    </span>
                    <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                      点击展开
                    </span>
                  </div>
                  <p className="font-body text-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-2">
                    {current.note}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作 */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {result === "idle" ? (
            <>
              <button
                onClick={submit}
                disabled={!input.trim()}
                className="btn-primary disabled:opacity-40"
              >
                <Check className="h-4 w-4" strokeWidth={2} />
                提交判卷
              </button>
              <button onClick={showAnswer} className="btn-ghost">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                显示答案
              </button>
            </>
          ) : result === "correct" ? (
            <button onClick={advance} className="btn-primary">
              <Check className="h-4 w-4" strokeWidth={2} />
              下一题
            </button>
          ) : (
            <button onClick={retry} className="btn-primary">
              <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
              再来一次
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ 卡片浏览模式 - 纯查看完整单词信息，上一个/下一个轮播 ============ */

function CardsView({
  words,
  filter,
  onRequestNote,
}: {
  words: Word[];
  filter: FilterState;
  onRequestNote: (word: Word) => void;
}) {
  // 应用筛选：与 RandomView/DictationView 一致的筛选逻辑
  const filteredWords = useMemo(() => {
    return words.filter((w) => {
      if (filter.excludeMastered && w.isMastered) return false;
      if (filter.stages) {
        const wordStage = w.isMastered ? -1 : w.reviewStage;
        if (!filter.stages.includes(wordStage)) return false;
      }
      if (filter.pos && !filter.pos.includes(w.pos)) return false;
      if (filter.dates && filter.dates.length > 0 && !filter.dates.includes(w.date))
        return false;
      return true;
    });
  }, [words, filter]);

  const [idx, setIdx] = useState(0);

  // 筛选变化时重置索引
  useEffect(() => {
    setIdx(0);
  }, [filteredWords.length]);

  // 键盘左右切换
  useEffect(() => {
    if (filteredWords.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setIdx((i) => (i - 1 + filteredWords.length) % filteredWords.length);
      } else if (e.key === "ArrowRight") {
        setIdx((i) => (i + 1) % filteredWords.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredWords.length]);

  if (filteredWords.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-md border border-ink/15 bg-paper-card p-12 text-center">
          <div className="eyebrow mb-4 text-ink-light">Cards</div>
          <p className="font-body text-sm text-ink-muted">
            当前筛选条件下没有单词
          </p>
        </div>
      </div>
    );
  }

  const current = filteredWords[idx];
  const stageLabels = ["初识", "巩固", "熟悉", "稳定", "深植", "长期", "永久"];

  const goPrev = () =>
    setIdx((i) => (i - 1 + filteredWords.length) % filteredWords.length);
  const goNext = () => setIdx((i) => (i + 1) % filteredWords.length);

  return (
    <div className="mx-auto max-w-2xl">
      {/* 卡片本体 - 与 RandomView/DictationView 统一样式 */}
      <div className="rounded-md border border-ink/15 bg-paper-card p-6 md:p-12 text-center hover:shadow-paper-hover">
        <div className="eyebrow mb-4 text-ink-light">
          Cards · {idx + 1} / {filteredWords.length}
        </div>

        {/* 单词 */}
        <h3 className="font-serif text-3xl md:text-5xl font-medium tracking-word text-ink">
          {current.word}
        </h3>

        {/* 音标 */}
        {current.phonetic && (
          <div className="mt-2 font-mono text-sm italic text-accent-gold">
            {current.phonetic}
          </div>
        )}

        {/* 词性 + 发音 */}
        <div className="mt-2 flex items-center justify-center gap-3">
          {current.pos && (
            <span className="font-mono text-sm italic text-ink-light">
              {current.pos}
            </span>
          )}
          <SpeakButton text={current.word} size="md" />
        </div>

        <div className="my-8 border-t border-dashed border-ink/15" />

        {/* 词意 */}
        <p className="font-body text-xl md:text-2xl text-ink-soft">
          {current.meaning}
        </p>

        {/* 笔记（点击展开） */}
        {current.note && (
          <div
            className="mt-4 cursor-pointer rounded-md border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-left transition-colors hover:bg-accent-gold/10"
            onClick={() => onRequestNote(current)}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                Note · 笔记
              </span>
              <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                点击展开
              </span>
            </div>
            <p className="font-body text-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-2">
              {current.note}
            </p>
          </div>
        )}

        {/* 记忆阶段标签 */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {current.isMastered ? (
            <span className="rounded border border-accent-green/30 bg-accent-green/5 px-2 py-0.5 font-mono text-2xs uppercase tracking-editorial text-accent-green">
              已掌握
            </span>
          ) : (
            <span className="rounded border border-ink/15 px-2 py-0.5 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              {stageLabels[current.reviewStage] ?? "初识"}
            </span>
          )}
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            · {current.date}
          </span>
        </div>
      </div>

      {/* 上一个/下一个按钮 */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          className="flex items-center gap-2 rounded-md border border-ink/20 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/40 hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          上一个
        </button>
        <button
          onClick={goNext}
          className="flex items-center gap-2 rounded-md border border-ink/20 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/40 hover:text-ink"
        >
          下一个
          <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      <p className="mt-3 text-center font-mono text-2xs uppercase tracking-editorial text-ink-light/60">
        ← → 键盘左右切换
      </p>
    </div>
  );
}



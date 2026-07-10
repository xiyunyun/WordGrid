import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import {
  selectDifficultWords,
  selectDueWords,
  selectMasteredWords,
  selectRecentWords,
} from "@/store/wordStore";
import { shuffle, todayKey } from "@/lib/review";
import { STAGE_LABELS } from "@/types";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";
import { speak } from "@/lib/tts";
import SpeakButton from "@/components/SpeakButton";
import SelfCheckFlow from "@/components/SelfCheckFlow";
import NoteModal from "@/components/NoteModal";
import ExportModal from "@/components/ExportModal";

type ViewMode = "list" | "self_check" | "random" | "dictation";
type ListTag = "due" | "difficult" | "mastered" | "recent7";

export default function Wordbook() {
  const words = useWordStore((s) => s.words);
  const [mode, setMode] = useState<ViewMode>("list");
  // 笔记查看弹窗
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteWord, setNoteWord] = useState<Word | null>(null);
  // 导出弹窗
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const difficultWords = selectDifficultWords(words);
  const dueWords = selectDueWords(words);
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
        <div className="eyebrow mb-1">Wordbook · 生词本</div>
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
      </section>

      {/* 模式切换 */}
      <nav className="flex flex-wrap gap-2">
        {[
          { key: "list" as ViewMode, label: "List", labelCN: "单词列表", icon: List },
          { key: "self_check" as ViewMode, label: "Self-Check", labelCN: "自我检测", icon: Eye },
          { key: "random" as ViewMode, label: "Random", labelCN: "随机抽查", icon: Shuffle },
          { key: "dictation" as ViewMode, label: "Dictation", labelCN: "听写测试", icon: Keyboard },
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
                  : "border-ink/20 text-ink-light hover:border-ink hover:text-ink",
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
              difficultWords={difficultWords}
              masteredWords={masteredWords}
              recentWords={recentWords}
              onRequestNote={openNoteModal}
            />
          )}
          {mode === "self_check" && (
            <SelfCheckView words={dueWords.length > 0 ? dueWords : difficultWords} />
          )}
          {mode === "random" && <RandomView words={words} />}
          {mode === "dictation" && <DictationView words={words} />}
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
  difficultWords,
  masteredWords,
  recentWords,
  onRequestNote,
}: {
  dueWords: Word[];
  difficultWords: Word[];
  masteredWords: Word[];
  recentWords: Word[];
  onRequestNote: (word: Word) => void;
}) {
  const markMastered = useWordStore((s) => s.markMastered);
  const toggleDifficult = useWordStore((s) => s.toggleDifficult);

  // 标签筛选：默认显示今日需复习，无则回退生词
  const [activeTag, setActiveTag] = useState<ListTag>(
    dueWords.length > 0 ? "due" : "difficult",
  );

  const tagWords =
    activeTag === "due"
      ? dueWords
      : activeTag === "difficult"
        ? difficultWords
        : activeTag === "mastered"
          ? masteredWords
          : recentWords;

  // 复习标签下隐藏释义（点击显示），其余标签直接显示
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
      count: dueWords.length,
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
                  : "border-ink/15 text-ink-light hover:border-accent-red/30 hover:text-accent-red"
                : t.accent === "accent-green"
                  ? active
                    ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-ink/15 text-ink-light hover:border-accent-green/30 hover:text-accent-green"
                  : active
                    ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
                    : "border-ink/15 text-ink-light hover:border-accent-gold/30 hover:text-accent-gold";
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

        {/* 当前标签下的单词列表 */}
        {tagWords.length > 0 ? (
          <ul className="divide-y divide-ink/8 border-y border-ink/10">
            {tagWords.map((w) => (
              <MinimalRow
                key={w.id}
                word={w}
                hideMeaning={hideMeaning}
                onMaster={() => markMastered(w.id)}
                onForget={() => toggleDifficult(w.id)}
                onRequestNote={onRequestNote}
              />
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center py-10 text-center font-body text-sm text-ink-light">
            该标签下暂无单词
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
  onMaster,
  onForget,
  onRequestNote,
}: {
  word: Word;
  highlighted?: boolean;
  hideMeaning?: boolean;
  onMaster: () => void;
  onForget: () => void;
  onRequestNote: (word: Word) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const showMeaning = !hideMeaning || revealed;

  return (
    <li
      className={cn(
        "group flex items-center gap-2 px-2 py-2.5 md:gap-4 md:py-3 transition-colors hover:bg-paper-warm/40",
        highlighted && "bg-accent-red/5",
      )}
    >
      {/* 等级 - 已掌握显示加深颜色的对勾 */}
      <div className="w-8 md:w-12 flex-shrink-0 text-center">
        {highlighted ? (
          <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
            due
          </span>
        ) : word.isMastered ? (
          <Check
            className="mx-auto h-4 w-4 text-accent-green"
            strokeWidth={2.5}
          />
        ) : word.isDifficult ? (
          <span className="font-mono text-2xs text-ink-light">
            {STAGE_LABELS[word.reviewStage]?.[0] || "·"}
          </span>
        ) : (
          <span className="font-mono text-2xs text-ink-light/50">·</span>
        )}
      </div>

      {/* 单词 + 音标 - 不使用删除线，保持字形完整以加强记忆 */}
      <div className="w-28 md:w-52 flex-shrink-0">
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

      {/* 词性 */}
      <div className="hidden sm:block w-12 md:w-16 flex-shrink-0">
        <span className="font-mono text-xs italic text-accent-gold">
          {word.pos}
        </span>
      </div>

      {/* 释义 - 复习标签下隐藏（点击显示），其余直接显示 */}
      <div className="min-w-0 flex-1">
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
      <div className="flex-shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <SpeakButton text={word.word} />
      </div>

      {/* 笔记按钮 - 点击打开二级菜单（NoteModal） */}
      <div className="hidden sm:flex flex-shrink-0">
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
      <div className="flex flex-shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
function SelfCheckView({ words }: { words: Word[] }) {
  return (
    <div className="mx-auto max-w-2xl px-0">
      <SelfCheckFlow words={words} mode="self_check" />
    </div>
  );
}

/* ============ 随机抽查模式 - 基于全部单词的无限随机练习 ============ */
const RANDOM_STATS_KEY = "wordgrid-random-stats";

interface RandomStats {
  date: string; // YYYY-MM-DD：用于跨日归零
  today: number; // 今日随机学习数
  total: number; // 累计随机学习数
}

function loadRandomStats(): RandomStats {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(RANDOM_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RandomStats;
      if (parsed.date === today) return parsed;
      // 跨日：今日归零，累计保留
      return { date: today, today: 0, total: parsed.total };
    }
  } catch {
    // 解析失败：忽略
  }
  return { date: today, today: 0, total: 0 };
}

function saveRandomStats(stats: RandomStats) {
  try {
    localStorage.setItem(RANDOM_STATS_KEY, JSON.stringify(stats));
  } catch {
    // 写入失败：忽略
  }
}

function RandomView({ words }: { words: Word[] }) {
  const [queue, setQueue] = useState<Word[]>(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [stats, setStats] = useState<RandomStats>(loadRandomStats);

  // 词库变化时重新洗牌
  useEffect(() => {
    setQueue(shuffle(words));
    setIdx(0);
    setRevealed(false);
  }, [words.length]);

  const current = queue[idx];

  if (!current) return null;

  const handle = () => {
    // 计数：本轮 + 今日 + 累计
    setSessionCount((n) => n + 1);
    const newStats: RandomStats = {
      date: todayKey(),
      today: stats.today + 1,
      total: stats.total + 1,
    };
    setStats(newStats);
    saveRandomStats(newStats);

    // 推进：队列耗尽则自动重新洗牌（无限练习，不触发完成页）
    setRevealed(false);
    const nextIdx = idx + 1;
    if (nextIdx >= queue.length) {
      setQueue(shuffle(words));
      setIdx(0);
    } else {
      setIdx(nextIdx);
    }
  };

  const reshuffle = () => {
    setQueue(shuffle(words));
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
        <div className="rounded-md border border-accent-gold/30 bg-paper-card p-6 md:p-12 text-center shadow-paper">
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
            <p className="font-body text-xl md:text-2xl text-ink-soft animate-ink-bloom">
              {current.meaning}
            </p>
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
            onClick={handle}
            className="flex items-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/5 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            不认识
          </button>
          <button
            onClick={handle}
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
const DICTATION_STATS_KEY = "wordgrid-dictation-stats";

interface DictationStats {
  date: string;
  today: number;
  total: number;
}

function loadDictationStats(): DictationStats {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(DICTATION_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DictationStats;
      if (parsed.date === today) return parsed;
      return { date: today, today: 0, total: parsed.total };
    }
  } catch {
    // 解析失败：忽略
  }
  return { date: today, today: 0, total: 0 };
}

function saveDictationStats(stats: DictationStats) {
  try {
    localStorage.setItem(DICTATION_STATS_KEY, JSON.stringify(stats));
  } catch {
    // 写入失败：忽略
  }
}

function DictationView({ words }: { words: Word[] }) {
  const [queue, setQueue] = useState<Word[]>(() => shuffle(words));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const [sessionCount, setSessionCount] = useState(0);
  const [stats, setStats] = useState<DictationStats>(loadDictationStats);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 词库变化时重新洗牌
  useEffect(() => {
    setQueue(shuffle(words));
    setIdx(0);
    setInput("");
    setResult("idle");
  }, [words.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [idx]);

  const current = queue[idx];
  if (!current) return null;

  const advance = () => {
    setInput("");
    setResult("idle");
    const nextIdx = idx + 1;
    // 队列耗尽则自动重新洗牌（无限练习）
    if (nextIdx >= queue.length) {
      setQueue(shuffle(words));
      setIdx(0);
    } else {
      setIdx(nextIdx);
    }
  };

  const bumpStats = () => {
    setSessionCount((n) => n + 1);
    const newStats: DictationStats = {
      date: todayKey(),
      today: stats.today + 1,
      total: stats.total + 1,
    };
    setStats(newStats);
    saveDictationStats(newStats);
  };

  const submit = () => {
    if (!input.trim() || result !== "idle") return;
    const correct = input.trim().toLowerCase() === current.word.toLowerCase();
    setResult(correct ? "correct" : "wrong");
    bumpStats();
  };

  const showAnswer = () => {
    if (result !== "idle") return;
    setResult("wrong");
    bumpStats();
  };

  const reshuffle = () => {
    setQueue(shuffle(words));
    setIdx(0);
    setInput("");
    setResult("idle");
  };

  // 听单词发音
  const handleSpeak = async () => {
    if (speaking) return;
    setSpeaking(true);
    await speak(current.word);
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
            "rounded-md border bg-paper-card p-6 md:p-12 text-center shadow-paper transition-colors",
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
                  <div className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
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
          ) : (
            <button onClick={advance} className="btn-primary">
              下一题
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



import { useState, useMemo, useCallback } from "react";
import { Blocks, Check, Loader2, RotateCcw, BookOpen, AlertCircle } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { generateArticle, type Difficulty } from "@/lib/deepseek";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";

type Phase = "select" | "loading" | "reading";

const DIFFICULTIES: Array<{
  key: Difficulty;
  label: string;
  labelCN: string;
  desc: string;
}> = [
  { key: "beginner", label: "Beginner", labelCN: "初级", desc: "简单句型，基础词汇" },
  { key: "intermediate", label: "Intermediate", labelCN: "中级", desc: "多样句型，从句复合句" },
  { key: "advanced", label: "Advanced", labelCN: "高级", desc: "复杂修辞，接近母语" },
];

export default function ArticleBuilder() {
  const words = useWordStore((s) => s.words);

  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [article, setArticle] = useState("");
  const [error, setError] = useState("");

  const selectedWords = useMemo(
    () => words.filter((w) => selected.has(w.id)),
    [words, selected],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(words.map((w) => w.id)));
  }, [words]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleGenerate = async () => {
    if (selectedWords.length < 3) return;
    setPhase("loading");
    setError("");
    try {
      const text = await generateArticle(selectedWords, difficulty);
      setArticle(text);
      setPhase("reading");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败，请稍后重试");
      setPhase("select");
    }
  };

  const reset = () => {
    setPhase("select");
    setArticle("");
    setError("");
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">Blocks · 单词积木</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
            积木造文
            <span className="ml-3 font-serif text-lg italic text-ink-light">
              {words.length} words available
            </span>
          </h2>
          <p className="max-w-md font-serif text-sm italic text-ink-muted">
            不积跬步，无以至千里。
          </p>
        </div>
      </section>

      {phase === "select" && (
        <SelectPhase
          words={words}
          selected={selected}
          selectedCount={selectedWords.length}
          difficulty={difficulty}
          error={error}
          onToggle={toggleSelect}
          onSelectAll={selectAll}
          onClearAll={clearAll}
          onDifficultyChange={setDifficulty}
          onGenerate={handleGenerate}
        />
      )}

      {phase === "loading" && <LoadingPhase />}

      {phase === "reading" && (
        <ReadingPhase
          article={article}
          selectedWords={selectedWords}
          difficulty={difficulty}
          onReset={reset}
        />
      )}
    </div>
  );
}

/* ============ 选择阶段 ============ */
function SelectPhase({
  words,
  selected,
  selectedCount,
  difficulty,
  error,
  onToggle,
  onSelectAll,
  onClearAll,
  onDifficultyChange,
  onGenerate,
}: {
  words: Word[];
  selected: Set<string>;
  selectedCount: number;
  difficulty: Difficulty;
  error: string;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onDifficultyChange: (d: Difficulty) => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* 难度选择 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-5 shadow-paper">
        <div className="mb-3 flex items-center gap-2">
          <Blocks className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Difficulty · 难度选择
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {DIFFICULTIES.map((d) => {
            const active = difficulty === d.key;
            return (
              <button
                key={d.key}
                onClick={() => onDifficultyChange(d.key)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-md border px-4 py-2.5 text-left transition-all",
                  active
                    ? "border-accent-gold/50 bg-accent-gold/10"
                    : "border-ink/15 hover:border-accent-gold/30",
                )}
              >
                <div className="flex items-center gap-2">
                  {active && <Check className="h-3 w-3 text-accent-gold" strokeWidth={2} />}
                  <span
                    className={cn(
                      "font-mono text-2xs uppercase tracking-editorial",
                      active ? "text-accent-gold" : "text-ink-light",
                    )}
                  >
                    {d.label}
                  </span>
                  <span className="font-body text-xs text-ink">· {d.labelCN}</span>
                </div>
                <span className="font-body text-2xs text-ink-light">{d.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 选择工具栏 */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            已选{" "}
            <span className="text-accent-gold tabular-nums">{selectedCount}</span>
            {" "}/{" "}
            <span className="text-ink tabular-nums">{words.length}</span>
          </span>
          <button
            onClick={onSelectAll}
            className="rounded-md border border-ink/15 px-2.5 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink"
          >
            全选
          </button>
          <button
            onClick={onClearAll}
            className="rounded-md border border-ink/15 px-2.5 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink"
          >
            清空
          </button>
        </div>

        <button
          onClick={onGenerate}
          disabled={selectedCount < 3}
          className="btn-gold disabled:opacity-40"
        >
          <Blocks className="h-3.5 w-3.5" strokeWidth={1.5} />
          生成文章
        </button>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-accent-red/30 bg-accent-red/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-accent-red" strokeWidth={1.5} />
          <span className="font-body text-sm text-accent-red">{error}</span>
        </div>
      )}

      {/* 单词网格 - 可多选 */}
      <section>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {words.map((w) => {
            const isSelected = selected.has(w.id);
            return (
              <button
                key={w.id}
                onClick={() => onToggle(w.id)}
                className={cn(
                  "group relative flex flex-col rounded-md border p-3 text-left transition-all",
                  isSelected
                    ? "border-accent-gold/50 bg-accent-gold/10 shadow-paper"
                    : "border-ink/10 bg-paper-card hover:border-accent-gold/30",
                )}
              >
                {/* 选中标记 */}
                <div className="absolute right-2 top-2">
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border transition-all",
                      isSelected
                        ? "border-accent-gold bg-accent-gold text-paper"
                        : "border-ink/20",
                    )}
                  >
                    {isSelected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </div>
                </div>

                <span
                  className={cn(
                    "min-w-0 break-words pr-5 font-serif text-base font-medium tracking-word",
                    isSelected ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {w.word}
                </span>
                <span className="mt-0.5 font-mono text-2xs italic text-accent-gold">
                  {w.pos}
                </span>
                <span className="mt-1 line-clamp-2 font-body text-2xs text-ink-light">
                  {w.meaning}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedCount < 3 && selectedCount > 0 && (
        <div className="text-center font-mono text-2xs uppercase tracking-editorial text-ink-light">
          至少选择 3 个单词才能生成文章
        </div>
      )}
    </div>
  );
}

/* ============ 加载阶段 ============ */
function LoadingPhase() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
      <Loader2
        className="mb-4 h-10 w-10 animate-spin text-accent-gold"
        strokeWidth={1.5}
      />
      <div className="eyebrow mb-2 text-accent-gold">Generating</div>
      <h3 className="font-display text-2xl font-medium text-ink">
        正在生成文章...
      </h3>
      <p className="mt-2 font-body text-sm text-ink-light">
        AI 正在将你选中的单词编织成一篇阅读文章，请稍候。
      </p>
    </div>
  );
}

/* ============ 阅读阶段 ============ */
function ReadingPhase({
  article,
  selectedWords,
  difficulty,
  onReset,
}: {
  article: string;
  selectedWords: Word[];
  difficulty: Difficulty;
  onReset: () => void;
}) {
  // 构建单词查找表（小写匹配）
  const wordMap = useMemo(() => {
    const map = new Map<string, Word>();
    for (const w of selectedWords) {
      map.set(w.word.toLowerCase(), w);
    }
    return map;
  }, [selectedWords]);

  // 将文章文本按词拆分，高亮选中的单词
  const renderArticle = useCallback(() => {
    // 按段落分割
    const paragraphs = article.split(/\n+/).filter((p) => p.trim());

    return paragraphs.map((para, pi) => {
      // 按单词边界拆分，保留标点和空格
      const tokens = para.split(/(\b)/);
      return (
        <p key={pi} className="mb-5 font-body text-lg leading-relaxed text-ink-soft last:mb-0">
          {tokens.map((token, ti) => {
            const clean = token.toLowerCase().replace(/[^a-z'-]/g, "");
            const matched = clean && wordMap.has(clean);
            if (matched) {
              const word = wordMap.get(clean)!;
              return (
                <WordHighlight key={ti} token={token} word={word} />
              );
            }
            return <span key={ti}>{token}</span>;
          })}
        </p>
      );
    });
  }, [article, wordMap]);

  const diffLabel = DIFFICULTIES.find((d) => d.key === difficulty);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 阅读工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Reading Mode
          </span>
          <span className="flex items-center gap-1.5 border-l border-ink/15 pl-3 font-mono text-2xs uppercase tracking-editorial">
            <span className="text-ink-light">难度</span>
            <span className="text-accent-gold">{diffLabel?.labelCN}</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-editorial">
            <span className="text-ink-light">高亮</span>
            <span className="text-ink tabular-nums">{selectedWords.length}</span>
            <span className="text-ink-light">词</span>
          </span>
        </div>
        <button onClick={onReset} className="btn-ghost">
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          重新选择
        </button>
      </div>

      {/* 文章阅读区 */}
      <article className="rounded-md border border-ink/15 bg-paper-card p-8 shadow-paper lg:p-12">
        <div className="mx-auto max-w-2xl">{renderArticle()}</div>
      </article>

      {/* 高亮单词速查表 */}
      <section className="rounded-md border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Word List · 本文单词
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedWords.map((w) => (
            <span
              key={w.id}
              className="inline-flex items-baseline gap-1 rounded-md border border-accent-gold/30 bg-paper-card px-2.5 py-1"
            >
              <span className="font-serif text-sm font-medium tracking-word text-ink">
                {w.word}
              </span>
              <span className="font-mono text-2xs italic text-accent-gold">{w.pos}</span>
              <span className="font-body text-2xs text-ink-light">{w.meaning}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============ 高亮单词组件 - 悬浮显示释义 ============ */
function WordHighlight({ token, word }: { token: string; word: Word }) {
  const [showTip, setShowTip] = useState(false);

  return (
    <span
      className="relative inline cursor-pointer rounded-sm bg-accent-gold/20 px-0.5 font-medium text-ink underline decoration-accent-gold/40 decoration-dotted underline-offset-4 transition-colors hover:bg-accent-gold/30"
      onClick={() => setShowTip((v) => !v)}
      onMouseLeave={() => setShowTip(false)}
    >
      {token}
      {showTip && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-ink/20 bg-paper px-3 py-1.5 shadow-deep animate-fade-in">
          <span className="font-mono text-2xs italic text-accent-gold">{word.pos}</span>
          <span className="ml-1.5 font-body text-xs text-ink">{word.meaning}</span>
        </span>
      )}
    </span>
  );
}

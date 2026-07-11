import { useState, useEffect, useRef } from "react";
import { X, Search, Volume2, Loader2, BookOpen, AlertCircle } from "lucide-react";
import {
  lookupWord,
  getFirstPhonetic,
  getFirstAudio,
  getPosCN,
  type DictEntry,
} from "@/lib/dictionary";
import { lookupWordMeaning, type CnMeaning } from "@/lib/deepseek";

interface DictionaryModalProps {
  open: boolean;
  onClose: () => void;
  /** 初始查询单词 */
  initialWord: string;
}

/**
 * 词典弹窗
 *
 * 用户可查询单词的拼写、音标、词性、释义等信息。
 * 数据来源：Free Dictionary API (dictionaryapi.dev)
 */
export default function DictionaryModal({
  open,
  onClose,
  initialWord,
}: DictionaryModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [cnMeanings, setCnMeanings] = useState<CnMeaning[]>([]);
  const [cnLoading, setCnLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 当弹窗打开或 initialWord 变化时自动查询
  useEffect(() => {
    if (open && initialWord) {
      setQuery(initialWord);
      doLookup(initialWord);
    }
    if (!open) {
      // 关闭时重置状态
      setEntry(null);
      setCnMeanings([]);
      setError("");
      setNotFound(false);
      setLoading(false);
      setCnLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialWord]);

  // 自动聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const doLookup = async (word: string) => {
    const clean = word.trim();
    if (!clean) return;

    setLoading(true);
    setCnLoading(true);
    setError("");
    setNotFound(false);
    setEntry(null);
    setCnMeanings([]);

    // 并行查询：英文释义 + 中文释义
    const enPromise = lookupWord(clean)
      .then((result) => {
        if (result) {
          setEntry(result);
        } else {
          setNotFound(true);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "查询失败");
      });

    const cnPromise = lookupWordMeaning(clean)
      .then(setCnMeanings)
      .catch(() => {
        // 中文释义失败不影响主流程
      });

    await Promise.all([enPromise, cnPromise]);
    setLoading(false);
    setCnLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doLookup(query);
  };

  const handlePlayAudio = () => {
    const audioUrl = getFirstAudio(entry);
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(() => {});
    }
  };

  if (!open) return null;

  const phonetic = getFirstPhonetic(entry);
  const audioUrl = getFirstAudio(entry);

  return (
    <div className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-ink/15 bg-paper-card shadow-deep animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
            <div>
              <div className="eyebrow">Dictionary · 词典</div>
              <h2 className="font-display text-lg font-medium text-ink md:text-xl">
                查词
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-ink/20 p-2 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="border-b border-ink/10 px-4 py-3 md:px-6 md:py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light"
                strokeWidth={1.5}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入单词查询..."
                className="input-paper pl-9 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="btn-primary disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
              ) : (
                <Search className="h-4 w-4" strokeWidth={1.5} />
              )}
              查询
            </button>
          </form>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {/* 加载中 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2
                className="mb-3 h-8 w-8 animate-spin text-accent-gold"
                strokeWidth={1.5}
              />
              <p className="font-body text-sm text-ink-light">
                正在查询 "{query}"...
              </p>
            </div>
          )}

          {/* 错误 */}
          {error && !loading && (
            <div className="flex items-start gap-3 rounded-md border border-accent-red/40 bg-accent-red/10 p-4">
              <AlertCircle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-red"
                strokeWidth={1.5}
              />
              <div>
                <div className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                  查询失败
                </div>
                <p className="mt-1 font-body text-sm text-ink-soft">{error}</p>
              </div>
            </div>
          )}

          {/* 未找到 */}
          {notFound && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen
                className="mb-3 h-10 w-10 text-ink-light/40"
                strokeWidth={1}
              />
              <div className="font-display text-lg font-medium text-ink">
                未找到 "{query}"
              </div>
              <p className="mt-1 font-body text-sm text-ink-light">
                该词不在词典中，可能是拼写错误、专有名词或非英语单词。
              </p>
            </div>
          )}

          {/* 查词结果 */}
          {entry && !loading && (
            <div className="space-y-4 animate-fade-in">
              {/* 单词头部 */}
              <div className="rounded-md border border-ink/10 bg-paper p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-medium tracking-word text-ink md:text-3xl">
                    {entry.word}
                  </h3>
                  {audioUrl && (
                    <button
                      onClick={handlePlayAudio}
                      className="flex items-center gap-1.5 rounded-md border border-ink/20 px-2.5 py-1 font-mono text-2xs uppercase tracking-editorial text-ink transition-colors hover:bg-ink hover:text-paper"
                      title="播放发音"
                    >
                      <Volume2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      发音
                    </button>
                  )}
                </div>
                {phonetic && (
                  <div className="mt-1 font-mono text-sm italic text-accent-gold">
                    {phonetic}
                  </div>
                )}
              </div>

              {/* 中文释义（优先展示） */}
              {(cnLoading || cnMeanings.length > 0) && (
                <div className="rounded-md border border-accent-gold/30 bg-accent-gold/5 p-3 md:p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                      中文释义
                    </span>
                    {cnLoading && (
                      <Loader2
                        className="h-3 w-3 animate-spin text-accent-gold"
                        strokeWidth={1.5}
                      />
                    )}
                  </div>
                  {!cnLoading && cnMeanings.length > 0 && (
                    <ul className="space-y-1.5">
                      {cnMeanings.map((m, mi) => (
                        <li
                          key={mi}
                          className="flex items-baseline gap-1 font-body text-sm leading-relaxed text-ink"
                        >
                          <span className="text-ink-light">{m.pos}：</span>
                          <span className="font-medium text-ink">{m.meaning}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* 英文释义列表 */}
              {entry.meanings.map((m, mi) => (
                <div
                  key={mi}
                  className="rounded-md border border-ink/10 bg-paper p-3 md:p-4"
                >
                  {/* 词性标签 */}
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                      {m.partOfSpeech}
                    </span>
                    <span className="font-body text-2xs text-ink-light">
                      {getPosCN(m.partOfSpeech)}
                    </span>
                  </div>

                  {/* 释义条目（最多 2 条） */}
                  <ol className="space-y-2">
                    {m.definitions.slice(0, 2).map((d, di) => (
                      <li key={di} className="flex items-start gap-2">
                        <span className="mt-0.5 font-mono text-2xs text-ink-light tabular-nums">
                          {di + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="font-body text-sm leading-relaxed text-ink-soft">
                            {d.definition}
                          </p>
                          {d.example && (
                            <p className="mt-1 font-body text-xs italic leading-relaxed text-ink-light">
                              "{d.example}"
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* 同义词 */}
                  {m.synonyms.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ink/10 pt-2">
                      <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                        同义词
                      </span>
                      {m.synonyms.slice(0, 5).map((s, si) => (
                        <button
                          key={si}
                          onClick={() => {
                            setQuery(s);
                            doLookup(s);
                          }}
                          className="rounded border border-ink/15 px-1.5 py-0.5 font-mono text-2xs text-ink-soft transition-colors hover:border-accent-gold/40 hover:text-accent-gold"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 来源 */}
              {entry.sourceUrl && (
                <div className="text-center">
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-2xs text-ink-light underline decoration-dotted underline-offset-2 transition-colors hover:text-accent-gold"
                  >
                    数据来源：Wiktionary
                  </a>
                </div>
              )}
            </div>
          )}

          {/* 空状态（刚打开还没查询） */}
          {!entry && !loading && !error && !notFound && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search
                className="mb-3 h-10 w-10 text-ink-light/40"
                strokeWidth={1}
              />
              <p className="font-body text-sm text-ink-light">
                输入单词查询释义、音标、词性
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 音频元素（隐藏） */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}

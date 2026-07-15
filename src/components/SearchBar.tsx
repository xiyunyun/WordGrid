import { useState, useMemo, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { cn } from "@/lib/utils";
import type { Word } from "@/types";

interface SearchBarProps {
  onPickWord: (word: Word) => void;
}

/**
 * 全局单词搜索栏
 *
 * - 前缀匹配（act → act, action, active）
 * - 默认最多显示 5 个建议
 * - 上下方向键选择，回车进入，点击进入
 * - Esc 关闭建议
 */
export default function SearchBar({ onPickWord }: SearchBarProps) {
  const words = useWordStore((s) => s.words);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return words
      .filter((w) => w.word.toLowerCase().startsWith(q))
      .sort(
        (a, b) =>
          a.word.length - b.word.length || a.word.localeCompare(b.word),
      )
      .slice(0, 5);
  }, [query, words]);

  // 输入变化时重置选中项
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // 点击外部关闭建议
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pickWord = (w: Word) => {
    onPickWord(w);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = suggestions[activeIdx] || suggestions[0];
      if (target) pickWord(target);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light"
          strokeWidth={1.5}
        />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索单词…"
          className="w-full rounded-md border border-ink/20 bg-paper-card py-1.5 pl-9 pr-3 font-serif text-sm text-ink placeholder:text-ink-light/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-ink/15 bg-paper-card shadow-card">
          {suggestions.map((w, idx) => (
            <li key={w.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // 防止 input blur 抢先触发
                  pickWord(w);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  "flex w-full items-baseline gap-3 px-3 py-2 text-left transition-colors",
                  idx === activeIdx
                    ? "bg-accent-gold/10"
                    : "hover:bg-paper-warm/40",
                )}
              >
                <span className="font-serif text-base font-medium text-ink">
                  {w.word}
                </span>
                {w.phonetic && (
                  <span className="font-mono text-xs text-ink-light">
                    {w.phonetic}
                  </span>
                )}
                {w.pos && (
                  <span className="font-mono text-2xs italic text-accent-gold">
                    {w.pos}
                  </span>
                )}
                <span className="ml-auto min-w-0 flex-1 truncate font-body text-sm text-ink-muted">
                  {w.meaning}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

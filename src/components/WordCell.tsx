import { Bookmark, Check, Trash2, NotebookPen, Pencil } from "lucide-react";
import type { Word } from "@/types";
import { useWordStore } from "@/store/wordStore";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import SpeakButton from "@/components/SpeakButton";

interface WordCellProps {
  word: Word;
  compact?: boolean;
  onRequestEdit?: (word: Word) => void;
  onRequestNote?: (word: Word) => void;
}

export default function WordCell({
  word,
  compact = false,
  onRequestEdit,
  onRequestNote,
}: WordCellProps) {
  const markMastered = useWordStore((s) => s.markMastered);
  const removeWord = useWordStore((s) => s.removeWord);

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col rounded-md border bg-paper-card shadow-paper transition-all hover:shadow-card",
        word.isMastered
          ? "border-accent-green/30 border-l-[3px] border-l-accent-green opacity-75"
          : "border-accent-red/40 border-l-[3px] border-l-accent-red",
      )}
    >
      {/* 单词主体 - 不再响应单击切换生词 */}
      <div className="flex flex-col items-start gap-1 px-3 py-2.5 md:px-4 md:py-3">
        {/* 单词行：单词 + 词性 */}
        <div className="flex w-full items-baseline justify-between gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 font-serif text-lg font-medium leading-tight tracking-word break-words md:text-xl",
              word.isMastered ? "text-ink-muted" : "text-ink",
            )}
          >
            {word.word}
          </span>
          {word.pos && (
            <span className="flex-shrink-0 font-mono text-2xs italic text-accent-gold">
              {word.pos}
            </span>
          )}
        </div>
        {/* 音标行 */}
        {word.phonetic && (
          <span className="font-mono text-xs text-ink-light">
            {word.phonetic}
          </span>
        )}
        {/* 释义行 */}
        <span
          className={cn(
            "font-body text-sm leading-snug",
            word.isMastered ? "text-ink-light" : "text-ink-soft",
          )}
        >
          {word.meaning}
        </span>
      </div>

      {/* 状态条 */}
      <div className="flex items-center justify-between border-t border-ink/8 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          {word.isMastered ? (
            <>
              <Check
                className="h-3 w-3 text-accent-green"
                strokeWidth={2}
              />
              <span className="font-mono text-2xs uppercase tracking-editorial text-accent-green">
                已掌握
              </span>
            </>
          ) : (
            <>
              <Bookmark
                className="h-3 w-3 fill-accent-red text-accent-red"
                strokeWidth={1.5}
              />
              <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                {STAGE_LABELS[word.reviewStage] || "初识"}
              </span>
            </>
          )}
        </div>

        {/* 悬浮操作 - 手机端始终显示，桌面端 hover 显示 */}
        <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <SpeakButton text={word.word} />
          {onRequestEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestEdit(word);
              }}
              className="rounded p-1 text-ink-light hover:bg-accent-gold/10 hover:text-accent-gold"
              title="编辑"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
          {!word.isMastered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                markMastered(word.id);
              }}
              className="rounded p-1 text-accent-green/70 hover:bg-accent-green/10 hover:text-accent-green"
              title="标记为已掌握"
            >
              <Check className="h-3 w-3" strokeWidth={2} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeWord(word.id);
            }}
            className="rounded p-1 text-ink-light hover:bg-accent-red/10 hover:text-accent-red"
            title="删除"
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 笔记预览 - 点击打开完整笔记弹窗 */}
      {word.note && !compact && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestNote?.(word);
          }}
          className="block w-full border-t border-ink/8 bg-accent-gold/5 px-3 py-1.5 text-left transition-colors hover:bg-accent-gold/10"
          title="点击查看完整笔记"
        >
          <div className="flex items-start gap-1.5">
            <NotebookPen
              className="mt-0.5 h-3 w-3 flex-shrink-0 text-accent-gold/70"
              strokeWidth={1.5}
            />
            <span className="font-body text-2xs leading-snug text-ink-muted line-clamp-1">
              {word.note.split("\n")[0]}
            </span>
            <span className="ml-auto flex-shrink-0 font-mono text-2xs uppercase tracking-editorial text-accent-gold/60">
              查看 →
            </span>
          </div>
        </button>
      )}
    </article>
  );
}

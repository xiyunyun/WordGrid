import { X, Bookmark, Check, ArrowRight } from "lucide-react";
import type { Word } from "@/types";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import SpeakButton from "@/components/SpeakButton";

interface WordSearchModalProps {
  open: boolean;
  word: Word | null;
  onClose: () => void;
  onGotoWordbook: () => void;
}

/**
 * 搜索结果弹窗
 *
 * - 设计风格与 WordCell 一致（左侧色条 + 状态条 + 笔记区）
 * - 弹窗内更松散，字号更大
 * - 右下角"转到单词列表"按钮 → 关闭弹窗 + 跳转 /wordbook
 */
export default function WordSearchModal({
  open,
  word,
  onClose,
  onGotoWordbook,
}: WordSearchModalProps) {
  if (!open || !word) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <article
        className={cn(
          "relative w-full max-w-xl overflow-hidden rounded-lg border bg-paper-card shadow-deep-always",
          word.isMastered
            ? "border-accent-green/30 border-l-[4px] border-l-accent-green"
            : "border-accent-red/40 border-l-[4px] border-l-accent-red",
        )}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md border border-ink/20 p-1.5 text-ink-light transition-colors hover:bg-ink hover:text-paper"
          aria-label="关闭"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {/* 单词主体 - 比列表卡片更松散，字号更大 */}
        <div className="flex flex-col gap-4 px-6 py-7 md:px-8 md:py-8">
          <div className="flex flex-wrap items-baseline gap-3 pr-8">
            <h2 className="font-serif text-3xl font-medium tracking-word text-ink md:text-4xl">
              {word.word}
            </h2>
            {word.pos && (
              <span className="font-mono text-sm italic text-accent-gold">
                {word.pos}
              </span>
            )}
          </div>
          {word.phonetic && (
            <span className="font-mono text-base text-ink-light">
              {word.phonetic}
            </span>
          )}

          <div className="border-t border-ink/10 pt-4">
            <div className="eyebrow mb-2">Meaning · 释义</div>
            <p className="font-body text-lg leading-relaxed text-ink-soft">
              {word.meaning}
            </p>
          </div>

          {word.note && (
            <div className="border-t border-ink/10 pt-4">
              <div className="eyebrow mb-2">Note · 笔记</div>
              <p className="whitespace-pre-wrap font-body text-base leading-relaxed text-ink-muted">
                {word.note}
              </p>
            </div>
          )}
        </div>

        {/* 状态条 + 操作 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-6 py-4 md:px-8">
          <div className="flex items-center gap-2">
            {word.isMastered ? (
              <>
                <Check
                  className="h-4 w-4 text-accent-green"
                  strokeWidth={2}
                />
                <span className="font-mono text-2xs uppercase tracking-editorial text-accent-green">
                  已掌握
                </span>
              </>
            ) : (
              <>
                <Bookmark
                  className="h-4 w-4 fill-accent-red text-accent-red"
                  strokeWidth={1.5}
                />
                <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                  {STAGE_LABELS[word.reviewStage] || "初识"}
                </span>
              </>
            )}
            <SpeakButton text={word.word} />
          </div>
          <button onClick={onGotoWordbook} className="btn-ghost">
            转到单词列表
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </article>
    </div>
  );
}

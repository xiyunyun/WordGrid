import { Check, Trash2, NotebookPen, Pencil, Eye, Brain } from "lucide-react";
import type { Word } from "@/types";
import { useWordStore } from "@/store/wordStore";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import SpeakButton from "@/components/SpeakButton";
import { useDisplaySettingsStore } from "@/store/displaySettings";

interface WordCellProps {
  word: Word;
  compact?: boolean;
  onRequestEdit?: (word: Word) => void;
  onRequestNote?: (word: Word) => void;
}

/**
 * 记忆阶段标签的颜色映射（与生词本保持一致）
 * 暖灰 → 灰墨 → 金 → 墨绿渐进，对应 0-6 七个阶段
 */
const STAGE_COLORS: Record<number, string> = {
  0: "text-ink-light",
  1: "text-ink-muted",
  2: "text-accent-gold/70",
  3: "text-accent-gold",
  4: "text-accent-green/60",
  5: "text-accent-green/80",
  6: "text-accent-green",
};

export default function WordCell({
  word,
  compact = false,
  onRequestEdit,
  onRequestNote,
}: WordCellProps) {
  const markMastered = useWordStore((s) => s.markMastered);
  const unmarkMastered = useWordStore((s) => s.unmarkMastered);
  const removeWord = useWordStore((s) => s.removeWord);
  const { showPos, showPhonetic, showMeaning, showStage, showNote } =
    useDisplaySettingsStore();

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col rounded-md border bg-paper-card shadow-paper transition-all hover:shadow-card",
        word.isMastered
          ? "border-accent-green/30 border-l-[3px] border-l-accent-green opacity-75"
          : "border-accent-red/40 border-l-[3px] border-l-accent-red",
      )}
    >
      {/* 单词主体：单词行（右侧固定状态标签）+ 词性/音标/词意竖向排列 */}
      <div className="flex flex-col items-start gap-1 px-3 py-2.5 md:px-4 md:py-3">
        {/* 单词行：单词 + 右侧固定宽度的记忆状态标签 */}
        <div className="flex w-full items-start justify-between gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 font-serif text-lg font-medium leading-tight tracking-word break-words md:text-xl",
              word.isMastered ? "text-ink-muted" : "text-ink",
            )}
          >
            {word.word}
          </span>
          {/* 记忆状态标签 - 无图标、固定小尺寸、七色方案、靠右边界 */}
          {showStage && (
            <span
              className={cn(
                "ml-2 flex-shrink-0 self-start pt-0.5 text-right font-mono text-2xs uppercase tracking-editorial",
                word.isMastered
                  ? "w-10 text-accent-green"
                  : STAGE_COLORS[word.reviewStage] ?? "text-ink-light",
              )}
              title={
                word.isMastered
                  ? "已掌握"
                  : `记忆阶段：${STAGE_LABELS[word.reviewStage] || "初识"}`
              }
            >
              {word.isMastered
                ? "掌握"
                : STAGE_LABELS[word.reviewStage]?.[0] || "初"}
            </span>
          )}
        </div>
        {/* 词性行 */}
        {showPos && word.pos && (
          <span className="font-mono text-2xs italic text-accent-gold">
            {word.pos}
          </span>
        )}
        {/* 音标行 */}
        {showPhonetic && word.phonetic && (
          <span className="font-mono text-xs text-ink-light">
            {word.phonetic}
          </span>
        )}
        {/* 释义行 */}
        {showMeaning && (
          <span
            className={cn(
              "font-body text-sm leading-snug",
              word.isMastered ? "text-ink-light" : "text-ink-soft",
            )}
          >
            {word.meaning}
          </span>
        )}
      </div>

      {/* 功能按钮栏 - 独占一行，居中平均放置；mt-auto 确保卡片被拉高时贴底对齐 */}
      <div className="mt-auto flex items-center justify-center gap-4 border-t border-ink/8 px-3 py-1.5">
        {/* 悬浮操作 - 手机端始终显示，桌面端 hover 显示 */}
        <div className="flex items-center gap-4 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
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
          {word.isMastered ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                unmarkMastered(word.id);
              }}
              className="rounded p-1 text-accent-red/70 hover:bg-accent-red/10 hover:text-accent-red"
              title="标记为已遗忘（恢复为生词）"
            >
              <Brain className="h-3 w-3" strokeWidth={2} />
            </button>
          ) : (
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
      {showNote && word.note && !compact && (
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

      {/* 辅助：用于提示当前为"仅单词"模式（仅当其他项全部关闭时显示一次） */}
      {!showPos && !showPhonetic && !showMeaning && !showStage && !showNote && (
        <div className="flex items-center justify-center gap-1 border-t border-ink/8 py-0.5 font-mono text-2xs uppercase tracking-editorial text-ink-light/40">
          <Eye className="h-2.5 w-2.5" strokeWidth={1.5} />
          <span>仅单词</span>
        </div>
      )}
    </article>
  );
}

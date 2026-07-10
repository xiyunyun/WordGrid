import { useEffect } from "react";
import { X, NotebookPen } from "lucide-react";
import type { Word } from "@/types";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  word: Word | null;
}

/**
 * 笔记查看弹窗 - 居中显示完整笔记内容
 * 宽高根据内容自适应：
 * - 高度根据回车换行数决定
 * - 宽度根据最长一行决定，但保证最小宽度与边距
 */
export default function NoteModal({ open, onClose, word }: NoteModalProps) {
  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !word) return null;

  const note = word.note || "";

  // 按回车切分行
  const lines = note.split("\n");
  const lineCount = lines.length;

  // 找最长一行的字符数（用于决定宽度）
  const maxLineLength = Math.max(...lines.map((l) => l.length));

  // 宽度计算：每字符约 1.1rem，加上左右内边距 4rem，最小 320px，最大 640px
  const calculatedWidth = maxLineLength * 1.1 + 4;
  const width = Math.max(20, Math.min(calculatedWidth, 40)); // rem

  // 高度计算：每行约 1.8rem，加上头部与内边距，最小适应 3 行
  const heightRem = Math.max(lineCount * 1.8 + 10, 14);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* 背景虚焦遮罩 */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗主体 - 宽高自适应 */}
      <div
        className="relative z-10 mx-4 animate-slide-up overflow-hidden rounded-md border border-ink/15 bg-paper shadow-deep"
        style={{ width: `${width}rem`, maxWidth: "90vw" }}
      >
        {/* 头部 */}
        <header className="flex items-center justify-between border-b border-ink/15 bg-paper-card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gold/10 text-accent-gold">
              <NotebookPen className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div>
              <div className="eyebrow text-accent-gold">Note</div>
              <h3 className="font-display text-xl font-medium text-ink">
                {word.word}
                <span className="ml-2 font-mono text-sm italic text-ink-light">
                  {word.pos}
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-ink/20 p-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* 笔记正文 - 保留换行 */}
        <div
          className="px-4 py-4 md:px-6 md:py-5"
          style={{ minHeight: `${heightRem}rem`, maxHeight: "60vh" }}
        >
          <p className="whitespace-pre-wrap break-words font-body text-base leading-relaxed text-ink-soft">
            {note}
          </p>
        </div>

        {/* 底部提示 */}
        <footer className="border-t border-ink/10 bg-paper-warm/40 px-5 py-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
          按 ESC 关闭 · {lineCount} 行 · {note.length} 字符
        </footer>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { X, NotebookPen, Pencil, Check } from "lucide-react";
import type { Word } from "@/types";
import { useWordStore } from "@/store/wordStore";

interface NoteModalProps {
  open: boolean;
  onClose: () => void;
  word: Word | null;
}

/**
 * 笔记查看/编辑弹窗 - 居中显示完整笔记内容
 *
 * 默认只读模式：只能查看和框选文字。
 * 点击「编辑」按钮切换到编辑模式，textarea 可直接修改。
 * 再次点击「完成」按钮保存并退出编辑模式（自动保存，无需手动保存按钮）。
 * 关闭弹窗时若处于编辑模式，自动保存草稿。
 *
 * 宽高根据内容自适应：
 * - 高度根据回车换行数决定
 * - 宽度根据最长一行决定，但保证最小宽度与边距
 */
export default function NoteModal({ open, onClose, word }: NoteModalProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const updateWord = useWordStore((s) => s.updateWord);

  // 从 store 按 id 取最新 word（避免父组件持有的快照过时）
  // 编辑时调用 updateWord 后，store 更新，此处能拿到最新 note
  const latestWord = useWordStore((s) =>
    word ? s.words.find((w) => w.id === word.id) ?? word : null,
  );

  const note = latestWord?.note || "";

  // 进入编辑模式时，用最新 note 初始化草稿
  const enterEdit = () => {
    setDraft(note);
    setEditing(true);
    // 等待 textarea 渲染后聚焦
    setTimeout(() => {
      textareaRef.current?.focus();
      // 光标移到末尾
      const el = textareaRef.current;
      if (el) {
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 0);
  };

  // 退出编辑模式并保存
  const exitEdit = () => {
    if (latestWord && draft !== note) {
      updateWord(latestWord.id, { note: draft });
    }
    setEditing(false);
  };

  // ESC 处理：编辑模式下 ESC 先退出编辑（保存），非编辑模式 ESC 关闭弹窗
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) {
          exitEdit();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, draft, note, latestWord]);

  // 弹窗关闭时重置编辑状态
  useEffect(() => {
    if (!open) {
      setEditing(false);
      setDraft("");
    }
  }, [open]);

  if (!open || !latestWord) return null;

  // 按回车切分行
  const displayNote = editing ? draft : note;
  const lines = displayNote.split("\n");
  const lineCount = lines.length;

  // 找最长一行的字符数（用于决定宽度）
  const maxLineLength = Math.max(...lines.map((l) => l.length));

  // 宽度计算：每字符约 1.1rem，加上左右内边距 4rem，最小 320px，最大 640px
  const calculatedWidth = maxLineLength * 1.1 + 4;
  const width = Math.max(20, Math.min(calculatedWidth, 40)); // rem

  // 高度计算：每行约 1.8rem，加上头部与内边距，最小适应 3 行
  const heightRem = Math.max(lineCount * 1.8 + 10, 14);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" data-modal="true">
      {/* 背景虚焦遮罩 */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={() => {
          if (editing) exitEdit();
          onClose();
        }}
      />

      {/* 弹窗主体 - 宽高自适应 */}
      <div
        className="relative z-10 mx-4 animate-slide-up overflow-hidden rounded-md border border-ink/15 bg-paper shadow-deep-always"
        style={{ width: `${width}rem`, maxWidth: "90vw" }}
      >
        {/* 头部 */}
        <header className="flex items-center justify-between border-b border-ink/15 bg-paper-card px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gold/10 text-accent-gold">
              <NotebookPen className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="eyebrow text-accent-gold">Note</div>
              {/* 单词：与 WordCell 同款 font-serif，避免使用艺术体 font-display */}
              <div className="flex items-baseline gap-2">
                <h3 className="font-serif text-xl font-medium leading-tight tracking-word text-ink">
                  {latestWord.word}
                </h3>
                {latestWord.pos && (
                  <span className="font-mono text-2xs italic text-accent-gold">
                    {latestWord.pos}
                  </span>
                )}
              </div>
              {/* 词意：与 WordCell 同款 font-body，紧贴单词下方 */}
              {latestWord.meaning && (
                <p className="font-body text-sm leading-snug text-ink-soft">
                  {latestWord.meaning}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 编辑/完成按钮 */}
            {editing ? (
              <button
                onClick={exitEdit}
                className="flex items-center gap-1 rounded-md border border-accent-green/40 bg-accent-green/10 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-accent-green transition-colors hover:bg-accent-green hover:text-paper"
                title="保存并退出编辑"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                完成
              </button>
            ) : (
              <button
                onClick={enterEdit}
                className="flex items-center gap-1 rounded-md border border-ink/20 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:bg-ink hover:text-paper"
                title="编辑笔记"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                编辑
              </button>
            )}
            <button
              onClick={() => {
                if (editing) exitEdit();
                onClose();
              }}
              className="rounded-md border border-ink/20 p-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
              aria-label="关闭"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* 笔记正文 - 编辑/只读切换 */}
        <div
          className="px-4 py-4 md:px-6 md:py-5"
          style={{ minHeight: `${heightRem}rem`, maxHeight: "60vh" }}
        >
          {editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full resize-none break-words rounded-md border border-accent-gold/30 bg-paper-warm/30 p-3 font-body text-base leading-relaxed text-ink-soft focus:border-accent-gold focus:outline-none focus:ring-1 focus:ring-accent-gold/20"
              style={{ minHeight: `${heightRem}rem`, maxHeight: "60vh" }}
              placeholder="输入笔记内容..."
            />
          ) : (
            <p className="whitespace-pre-wrap break-words font-body text-base leading-relaxed text-ink-soft">
              {note || <span className="text-ink-light/50">暂无笔记，点击「编辑」添加</span>}
            </p>
          )}
        </div>

        {/* 底部提示 */}
        <footer className="border-t border-ink/10 bg-paper-warm/40 px-5 py-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
          {editing ? (
            <span className="text-accent-gold">编辑中 · 自动保存 · 按 ESC 退出编辑</span>
          ) : (
            <>
              按 ESC 关闭 · {lineCount} 行 · {note.length} 字符
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

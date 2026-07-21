import { useState, useEffect } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { useDateNotesStore } from "@/store/dateNotes";

interface DateNoteModalProps {
  open: boolean;
  onClose: () => void;
  date: string;
}

/**
 * 日期备注编辑弹窗
 * 用于为某一天添加学习分类备注（如"厨房用品"、"数字"、"颜色"等）
 */
export default function DateNoteModal({ open, onClose, date }: DateNoteModalProps) {
  const notes = useDateNotesStore((s) => s.notes);
  const setNote = useDateNotesStore((s) => s.setNote);
  const removeNote = useDateNotesStore((s) => s.removeNote);

  const existing = notes[date] || "";
  const [text, setText] = useState(existing);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setText(existing);
      setSaved(false);
    }
  }, [open, date, existing]);

  if (!open) return null;

  const handleSave = () => {
    setNote(date, text);
    setSaved(true);
    setTimeout(() => onClose(), 500);
  };

  const handleDelete = () => {
    removeNote(date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-md border border-ink/15 bg-paper-card shadow-deep-always animate-slide-up">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-5 py-3">
          <div>
            <div className="eyebrow">Date Note · 日期备注</div>
            <h3 className="font-display text-xl font-medium text-ink">{date}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-ink/20 p-2 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4">
          <label className="eyebrow mb-2 block">Note · 备注</label>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (saved) setSaved(false);
            }}
            placeholder="记录今天学习的单词分类，如：厨房用品、数字、颜色…"
            rows={4}
            className="input-paper resize-none"
            autoFocus
          />
          <p className="mt-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
            备注会显示在日期板块和跳转日期面板中，方便快速定位学习主题
          </p>

          {saved && (
            <div className="mt-3 rounded-md border border-accent-green/40 bg-accent-green/10 p-2 font-mono text-2xs text-accent-green">
              ✓ 已保存
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-ink/10 px-5 py-3">
          {existing ? (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-md border border-accent-red/30 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              删除备注
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-ghost"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={text.trim() === existing.trim()}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

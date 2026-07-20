import { useState, useEffect } from "react";
import { X, Save, Plus, BookText } from "lucide-react";
import { useEssayStore } from "@/store/essayStore";
import { todayKey } from "@/lib/review";
import type { Essay } from "@/types";

interface AddEssayDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  /** 传入则进入编辑模式，回填表单并改为更新 */
  editEssay?: Essay | null;
}

/**
 * 添加 / 编辑随笔抽屉
 * 字段：正文（必填） + 翻译（可选） + 日期 + 笔记（可选）
 * 不包含词性、音标等单词相关字段
 */
export default function AddEssayDrawer({
  open,
  onClose,
  defaultDate,
  editEssay,
}: AddEssayDrawerProps) {
  const addEssay = useEssayStore((s) => s.addEssay);
  const updateEssay = useEssayStore((s) => s.updateEssay);

  const isEditing = !!editEssay;

  const [content, setContent] = useState("");
  const [translation, setTranslation] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate || todayKey());
  const [justSaved, setJustSaved] = useState(false);
  const [justAdded, setJustAdded] = useState(0);

  // 抽屉重新打开时重置或回填
  useEffect(() => {
    if (!open) return;
    if (editEssay) {
      // 编辑模式：回填
      setContent(editEssay.content);
      setTranslation(editEssay.translation || "");
      setNote(editEssay.note || "");
      setDate(editEssay.date);
      setJustSaved(false);
    } else {
      // 新增模式：清空
      setContent("");
      setTranslation("");
      setNote("");
      setDate(defaultDate || todayKey());
      setJustAdded(0);
    }
  }, [open, defaultDate, editEssay]);

  if (!open) return null;

  const handleAdd = () => {
    if (!content.trim()) return;
    addEssay({ content, translation, note, date });
    setJustAdded((n) => n + 1);
    // 清空正文/翻译/笔记，保留日期，方便连续录入
    setContent("");
    setTranslation("");
    setNote("");
  };

  const handleSaveEdit = () => {
    if (!editEssay || !content.trim()) return;
    updateEssay(editEssay.id, { content, translation, note, date });
    setJustSaved(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in justify-end">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <aside className="relative flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-ink/15 bg-paper-card shadow-deep">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 md:px-6 md:py-4">
          <div>
            <div className="eyebrow">
              {isEditing ? "Edit Essay" : "New Essay"}
            </div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {isEditing ? "编辑随笔" : "添加随笔"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-ink/20 p-2 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 表单 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {/* 日期 */}
          <div className="mb-5">
            <label className="eyebrow mb-2 block">Date · 录入日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-paper font-mono text-sm"
            />
          </div>

          {/* 正文 */}
          <div className="mb-4">
            <label className="eyebrow mb-2 block">
              Content · 正文（必填）
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                "But every once in a while you find someone who's iridescent, and when you do, nothing will ever compare."
              }
              rows={4}
              autoFocus
              className="input-paper resize-none font-serif text-base leading-relaxed"
            />
          </div>

          {/* 翻译 */}
          <div className="mb-4">
            <label className="eyebrow mb-2 block">
              Translation · 翻译（可选）
            </label>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder={"世人万千种，浮云莫去求，斯人如彩虹，遇上方知有。"}
              rows={3}
              className="input-paper resize-none font-body text-sm leading-relaxed"
            />
          </div>

          {/* 笔记 */}
          <div className="mb-4">
            <label className="eyebrow mb-2 block">
              Note · 笔记（可选）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={"出处、灵感、想法..."}
              rows={3}
              className="input-paper resize-none font-body text-sm leading-relaxed"
            />
          </div>

          {/* 反馈提示 */}
          {isEditing && justSaved && (
            <div className="mb-4 rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
              ✓ 已保存修改
            </div>
          )}
          {!isEditing && justAdded > 0 && (
            <div className="mb-4 rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
              ✓ 已添加 {justAdded} 条随笔
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="border-t border-ink/10 px-4 py-3 md:px-6 md:py-4">
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              disabled={!content.trim() || justSaved}
              className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" strokeWidth={1.5} />
              保存修改
            </button>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!content.trim()}
              className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              添加到 {date}
            </button>
          )}
          {!isEditing && justAdded > 0 && (
            <button
              onClick={onClose}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-ink/15 py-2 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/30 hover:text-ink"
            >
              <BookText className="h-3 w-3" strokeWidth={1.5} />
              完成 · 查看随笔
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, Plus, ClipboardPaste, FileText, Save } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { parseBulkText, todayKey } from "@/lib/review";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";

interface AddWordDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  clipboardText?: string;
  /** 传入则进入编辑模式，回填表单并改为更新 */
  editWord?: Word | null;
}

type Tab = "single" | "bulk";

// 英语全部词性 - 含 8 大词性及常见细分
const COMMON_POS = [
  "n.",       // noun 名词
  "v.",       // verb 动词
  "adj.",     // adjective 形容词
  "adv.",     // adverb 副词
  "pron.",    // pronoun 代词
  "prep.",    // preposition 介词
  "conj.",    // conjunction 连词
  "interj.",  // interjection 感叹词
  "art.",     // article 冠词
  "num.",     // numeral 数词
  "aux.",     // auxiliary verb 助动词
  "modal v.", // modal verb 情态动词
  "vt.",      // transitive verb 及物动词
  "vi.",      // intransitive verb 不及物动词
  "abbr.",    // abbreviation 缩写
];

export default function AddWordDrawer({
  open,
  onClose,
  defaultDate,
  clipboardText,
  editWord,
}: AddWordDrawerProps) {
  const addWord = useWordStore((s) => s.addWord);
  const addWordsBulk = useWordStore((s) => s.addWordsBulk);
  const updateWord = useWordStore((s) => s.updateWord);

  const isEditing = !!editWord;

  const [tab, setTab] = useState<Tab>("single");
  const [word, setWord] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [pos, setPos] = useState("n.");
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate || todayKey());
  const [bulkText, setBulkText] = useState("");
  const [justAdded, setJustAdded] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  // 剪贴板内容自动填充（仅非编辑模式）
  useEffect(() => {
    if (open && !isEditing && clipboardText && tab === "single" && !word) {
      setWord(clipboardText.trim());
    }
  }, [open, clipboardText, tab, word, isEditing]);

  // 抽屉重新打开时重置或回填
  useEffect(() => {
    if (!open) return;
    if (editWord) {
      // 编辑模式：回填表单
      setTab("single");
      setWord(editWord.word);
      setPhonetic(editWord.phonetic || "");
      setPos(editWord.pos);
      setMeaning(editWord.meaning);
      setNote(editWord.note);
      setDate(editWord.date);
      setJustSaved(false);
    } else {
      // 新增模式：清空表单
      setTab("single");
      setWord("");
      setPhonetic("");
      setMeaning("");
      setNote("");
      setBulkText("");
      setDate(defaultDate || todayKey());
      setJustAdded(0);
    }
  }, [open, defaultDate, editWord]);

  if (!open) return null;

  const handleAddSingle = () => {
    if (!word.trim()) return;
    addWord({ word, phonetic, pos, meaning, note, date });
    setJustAdded((n) => n + 1);
    setWord("");
    setPhonetic("");
    setMeaning("");
    setNote("");
    // 保持 pos 与 date
  };

  const handleSaveEdit = () => {
    if (!editWord || !word.trim()) return;
    updateWord(editWord.id, {
      word: word.trim(),
      phonetic: phonetic.trim(),
      pos: pos.trim(),
      meaning: meaning.trim(),
      note: note.trim(),
      date,
    });
    setJustSaved(true);
    // 短暂提示后关闭
    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleAddBulk = () => {
    const items = parseBulkText(bulkText, date);
    if (items.length === 0) return;
    const count = addWordsBulk(items, date);
    setJustAdded((n) => n + count);
    setBulkText("");
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
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-6 py-4">
          <div>
            <div className="eyebrow">{isEditing ? "Edit Entry" : "New Entry"}</div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {isEditing ? "编辑单词" : "添加单词"}
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

        {/* Tab 切换 - 编辑模式隐藏 */}
        {!isEditing && (
          <div className="flex border-b border-ink/10 px-6">
            {[
              { key: "single" as Tab, label: "单个录入", icon: Plus },
              { key: "bulk" as Tab, label: "批量导入", icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-3 py-3 font-mono text-2xs uppercase tracking-editorial transition-all",
                    tab === t.key
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-light hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* 表单内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 日期选择 */}
          <div className="mb-5">
            <label className="eyebrow mb-2 block">Date · 录入日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-paper font-mono text-sm"
            />
          </div>

          {isEditing || tab === "single" ? (
            <div className="space-y-4 animate-fade-in">
              {/* 剪贴板提示 - 仅新增模式 */}
              {!isEditing && clipboardText && (
                <div className="flex items-start gap-2 rounded-md border border-accent-gold/40 bg-accent-gold/10 p-3">
                  <ClipboardPaste
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-gold"
                    strokeWidth={1.5}
                  />
                  <div className="text-sm text-ink">
                    <div className="font-body">检测到剪贴板内容：</div>
                    <div className="font-serif italic text-accent-gold">
                      "{clipboardText.slice(0, 40)}"
                    </div>
                    <div className="font-mono text-2xs text-ink-light">
                      已自动填入单词字段
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="eyebrow mb-2 block">Word · 单词</label>
                <input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isEditing) handleSaveEdit();
                      else handleAddSingle();
                    }
                  }}
                  placeholder="如 abandon"
                  className="input-paper font-serif text-lg"
                  autoFocus
                />
              </div>

              <div>
                <label className="eyebrow mb-2 block">
                  Phonetic · 音标 (可选)
                </label>
                <input
                  value={phonetic}
                  onChange={(e) => setPhonetic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isEditing) handleSaveEdit();
                      else handleAddSingle();
                    }
                  }}
                  placeholder="如 /əˈbændən/"
                  className="input-paper font-mono text-sm"
                />
              </div>

              <div>
                <label className="eyebrow mb-2 block">POS · 词性</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_POS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPos(p)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 font-mono text-xs transition-all",
                        pos === p
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/20 text-ink-light hover:border-ink hover:text-ink",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="eyebrow mb-2 block">
                  Meaning · 释义
                </label>
                <input
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isEditing) handleSaveEdit();
                      else handleAddSingle();
                    }
                  }}
                  placeholder="如 放弃；遗弃"
                  className="input-paper"
                />
              </div>

              <div>
                <label className="eyebrow mb-2 block">
                  Note · 笔记 (可选)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="词根、搭配、例句..."
                  rows={3}
                  className="input-paper resize-none"
                />
              </div>

              {/* 编辑模式：保存成功提示 */}
              {isEditing && justSaved && (
                <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
                  ✓ 已保存修改
                </div>
              )}

              {/* 新增模式：添加成功提示 */}
              {!isEditing && justAdded > 0 && (
                <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
                  ✓ 已添加 {justAdded} 个单词
                </div>
              )}

              {isEditing ? (
                <button
                  onClick={handleSaveEdit}
                  disabled={!word.trim() || justSaved}
                  className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Save className="h-4 w-4" strokeWidth={1.5} />
                  保存修改
                </button>
              ) : (
                <button
                  onClick={handleAddSingle}
                  disabled={!word.trim()}
                  className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  添加到 {date}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="eyebrow mb-2 block">Format · 格式说明</label>
                <div className="rounded-md border border-ink/15 bg-paper p-3 font-mono text-2xs leading-relaxed text-ink-muted">
                  推荐竖线分隔（AI 友好，5 字段）：
                  <br />
                  <span className="text-accent-gold">单词|音标|词性|词意|笔记</span>
                  <br />
                  <span className="text-ink-light">示例：abandon|/əˈbændən/|v.|放弃；遗弃|派生：abandonment</span>
                  <br />
                  <br />
                  也支持省略字段：
                  <br />
                  <span className="text-accent-gold">word|phonetic|pos|meaning</span>
                  <span className="text-ink-light"> （无笔记）</span>
                  <br />
                  <span className="text-accent-gold">word|pos|meaning</span>
                  <span className="text-ink-light"> （无音标/笔记）</span>
                  <br />
                  <span className="text-accent-gold">word|meaning</span>
                  <span className="text-ink-light"> （仅单词+词意）</span>
                </div>
              </div>

              <div>
                <label className="eyebrow mb-2 block">Bulk Text · 批量文本</label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={
                    "abandon|/əˈbændən/|v.|放弃；遗弃|派生：abandonment\nbenefit|/ˈbenɪfɪt/|n.|利益；好处\ncapable|/ˈkeɪpəbl/|adj.|有能力的"
                  }
                  rows={10}
                  className="input-paper resize-none font-mono text-sm"
                />
              </div>

              {justAdded > 0 && (
                <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
                  ✓ 已批量添加 {justAdded} 个单词
                </div>
              )}

              <button
                onClick={handleAddBulk}
                disabled={!bulkText.trim()}
                className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileText className="h-4 w-4" strokeWidth={1.5} />
                解析并导入
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

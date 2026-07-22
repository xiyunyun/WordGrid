import { useState, useEffect } from "react";
import { X, Plus, FileText, Save, AlertTriangle } from "lucide-react";
import { useWordStore } from "@/store/wordStore";
import { parseBulkText, todayKey } from "@/lib/review";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";
import { COMMON_POS } from "@/lib/pos";

interface AddWordDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  /** 传入则进入编辑模式，回填表单并改为更新 */
  editWord?: Word | null;
}

type Tab = "single" | "bulk";

export default function AddWordDrawer({
  open,
  onClose,
  defaultDate,
  editWord,
}: AddWordDrawerProps) {
  const addWord = useWordStore((s) => s.addWord);
  const addWordsBulk = useWordStore((s) => s.addWordsBulk);
  const updateWord = useWordStore((s) => s.updateWord);
  const existingWords = useWordStore((s) => s.words);

  const isEditing = !!editWord;

  const [tab, setTab] = useState<Tab>("single");
  const [word, setWord] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [posArr, setPosArr] = useState<string[]>(["n."]);
  const [meaning, setMeaning] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate || todayKey());
  const [bulkText, setBulkText] = useState("");
  const [justAdded, setJustAdded] = useState(0);
  const [justSaved, setJustSaved] = useState(false);
  /** 单个录入：单词已存在提示 */
  const [dupWarning, setDupWarning] = useState(false);
  /** 批量导入：被跳过的重复单词列表 */
  const [bulkDuplicates, setBulkDuplicates] = useState<string[]>([]);
  /** 批量导入：被替换的重复单词列表 */
  const [bulkReplaced, setBulkReplaced] = useState<string[]>([]);
  /** 批量导入冲突对话框：待确认的重复单词列表（解析后未导入前） */
  const [pendingConflict, setPendingConflict] = useState<string[] | null>(null);
  /** 缓存最近一次解析结果，供冲突对话框确认后使用 */
  const [pendingItems, setPendingItems] = useState<
    Array<{ word: string; phonetic?: string; pos: string; meaning: string; note?: string }>
  >([]);

  /** 将存储中的 pos 字符串拆分为词性数组 */
  const splitPos = (raw: string): string[] => {
    if (!raw?.trim()) return [];
    // 按 COMMON_POS 长度降序匹配，避免 "v." 误匹配 "modal v." 中的片段
    const sorted = [...COMMON_POS].sort((a, b) => b.length - a.length);
    const found: string[] = [];
    let rest = raw;
    for (const p of sorted) {
      if (rest.includes(p)) {
        found.push(p);
        rest = rest.replace(p, " ");
      }
    }
    // 若有未匹配的残留片段，也作为自定义词性保留
    const leftover = rest.split(/[\s,，、/]+/).map((s) => s.trim()).filter(Boolean);
    return [...found, ...leftover];
  };

  /** 将词性数组合并为存储字符串 */
  const joinPos = (arr: string[]): string => arr.join(" ");

  // 抽屉重新打开时重置或回填
  useEffect(() => {
    if (!open) return;
    if (editWord) {
      // 编辑模式：回填表单
      setTab("single");
      setWord(editWord.word);
      setPhonetic(editWord.phonetic || "");
      setPosArr(splitPos(editWord.pos));
      setMeaning(editWord.meaning);
      setNote(editWord.note);
      setDate(editWord.date);
      setJustSaved(false);
      setDupWarning(false);
      setBulkDuplicates([]);
      setBulkReplaced([]);
      setPendingConflict(null);
      setPendingItems([]);
    } else {
      // 新增模式：清空表单
      setTab("single");
      setWord("");
      setPhonetic("");
      setPosArr(["n."]);
      setMeaning("");
      setNote("");
      setBulkText("");
      setDate(defaultDate || todayKey());
      setJustAdded(0);
      setDupWarning(false);
      setBulkDuplicates([]);
      setBulkReplaced([]);
      setPendingConflict(null);
      setPendingItems([]);
    }
  }, [open, defaultDate, editWord]);

  if (!open) return null;

  const handleAddSingle = () => {
    if (!word.trim()) return;
    const result = addWord({ word, phonetic, pos: joinPos(posArr), meaning, note, date });
    if (!result) {
      // 单词已存在，提示但不清空表单，方便用户修改
      setDupWarning(true);
      return;
    }
    setDupWarning(false);
    setJustAdded((n) => n + 1);
    setWord("");
    setPhonetic("");
    setMeaning("");
    setNote("");
    // 保持 posArr 与 date
  };

  const handleSaveEdit = () => {
    if (!editWord || !word.trim()) return;
    updateWord(editWord.id, {
      word: word.trim(),
      phonetic: phonetic.trim(),
      pos: joinPos(posArr).trim(),
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

  /** 切换词性选中状态（多选） */
  const togglePos = (p: string) => {
    setPosArr((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  /** 解析批量文本并执行导入。
   *  若存在重复单词：先弹出冲突对话框让用户选择「跳过」或「替换」，再据此执行。
   *  若无重复：直接导入。
   */
  const handleAddBulk = () => {
    const items = parseBulkText(bulkText, date);
    if (items.length === 0) return;

    // 与现有单词比对（大小写不敏感）
    const existingLower = new Set(
      existingWords.map((w) => w.word.toLowerCase()),
    );
    const dupWords: string[] = [];
    const seenInBatch = new Set<string>();
    for (const item of items) {
      const lower = item.word.trim().toLowerCase();
      if (existingLower.has(lower) || seenInBatch.has(lower)) {
        dupWords.push(item.word.trim());
      }
      seenInBatch.add(lower);
    }

    if (dupWords.length > 0) {
      // 有重复：缓存解析结果，弹出冲突对话框
      setPendingItems(items);
      setPendingConflict(dupWords);
      return;
    }

    // 无重复：直接导入
    const { added } = addWordsBulk(items, date, "skip");
    setJustAdded((n) => n + added);
    setBulkDuplicates([]);
    setBulkReplaced([]);
    setBulkText("");
  };

  /** 冲突对话框：用户选择跳过 */
  const handleConflictSkip = () => {
    if (pendingItems.length === 0) return;
    const { added, duplicates } = addWordsBulk(pendingItems, date, "skip");
    setJustAdded((n) => n + added);
    setBulkDuplicates(duplicates);
    setBulkReplaced([]);
    setPendingConflict(null);
    setPendingItems([]);
    setBulkText("");
  };

  /** 冲突对话框：用户选择替换 */
  const handleConflictReplace = () => {
    if (pendingItems.length === 0) return;
    const { added, duplicates, replaced } = addWordsBulk(pendingItems, date, "replace");
    setJustAdded((n) => n + added);
    setBulkDuplicates(duplicates.filter((w) => !replaced.includes(w)));
    setBulkReplaced(replaced);
    setPendingConflict(null);
    setPendingItems([]);
    setBulkText("");
  };

  /** 冲突对话框：取消 */
  const handleConflictCancel = () => {
    setPendingConflict(null);
    setPendingItems([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in justify-end">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <aside className="relative flex h-full w-full max-w-md animate-slide-in-right flex-col border-l border-ink/15 bg-paper-card shadow-deep-always">
        {/* 抽屉头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 md:px-6 md:py-4">
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
          <div className="flex border-b border-ink/10 px-4 md:px-6">
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
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
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
              <div>
                <label className="eyebrow mb-2 block">Word · 单词</label>
                <input
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value);
                    if (dupWarning) setDupWarning(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isEditing) handleSaveEdit();
                      else handleAddSingle();
                    }
                  }}
                  placeholder="如 abandon"
                  className="input-paper font-serif text-lg"
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
                <label className="eyebrow mb-2 block">POS · 词性（可多选）</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_POS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePos(p)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 font-mono text-xs transition-all",
                        posArr.includes(p)
                          ? "border-ink bg-ink text-paper"
                          : "border-ink/15 bg-paper-card text-ink-light hover:border-ink/30 hover:text-ink",
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
              {!isEditing && justAdded > 0 && !dupWarning && (
                <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
                  ✓ 已添加 {justAdded} 个单词
                </div>
              )}

              {/* 新增模式：单词已存在提示 */}
              {!isEditing && dupWarning && (
                <div className="rounded-md border border-accent-red/40 bg-accent-red/5 p-3 font-mono text-2xs text-accent-red">
                  ⚠ 该单词已存在，无需重复添加
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
                  笔记换行：用分号（;或；）分隔多段，导入后自动换行
                  <br />
                  <span className="text-ink-light">示例：happy|adj.|快乐的|反义词：unhappy；例句：He felt happy.</span>
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
                  ✓ 已批量添加 {justAdded} 个新单词
                </div>
              )}

              {/* 批量导入：替换提示 */}
              {bulkReplaced.length > 0 && (
                <div className="rounded-md border border-ink/25 bg-ink/5 p-3">
                  <div className="font-mono text-2xs text-ink">
                    ↻ 以下 {bulkReplaced.length} 个单词已替换为新内容（复习进度已保留）：
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {bulkReplaced.map((w) => (
                      <span
                        key={w}
                        className="rounded-sm border border-ink/20 bg-paper-card px-1.5 py-0.5 font-serif text-xs text-ink-muted"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 批量导入：重复单词跳过提示 */}
              {bulkDuplicates.length > 0 && (
                <div className="rounded-md border border-accent-gold/40 bg-accent-gold/5 p-3">
                  <div className="font-mono text-2xs text-accent-gold">
                    ⚠ 以下 {bulkDuplicates.length} 个单词已存在，已自动跳过：
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {bulkDuplicates.map((w) => (
                      <span
                        key={w}
                        className="rounded-sm border border-accent-gold/30 bg-paper-card px-1.5 py-0.5 font-serif text-xs text-ink-muted"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
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

      {/* 批量导入冲突对话框（Windows 风格：跳过 / 替换 / 取消） */}
      {pendingConflict && pendingConflict.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={handleConflictCancel}
          />
          <div className="relative w-full max-w-md rounded-lg border border-ink/20 bg-paper-card p-5 shadow-deep-always">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-gold/10 text-accent-gold">
                <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-ink">
                  检测到 {pendingConflict.length} 个单词已存在
                </h3>
                <p className="mt-1 font-body text-sm text-ink-muted">
                  请选择如何处理这些重复单词：
                </p>
                <ul className="mt-1 font-mono text-2xs text-ink-light">
                  <li>
                    <span className="text-ink">跳过</span> · 保留现有单词不变，仅导入新单词
                  </li>
                  <li>
                    <span className="text-ink">替换</span> · 用新内容覆盖音标/词性/词意/笔记（保留复习进度）
                  </li>
                </ul>
              </div>
            </div>

            {/* 重复单词预览（最多显示 8 个，超出折叠） */}
            <div className="mt-3 max-h-24 overflow-y-auto rounded-md border border-ink/10 bg-paper p-2">
              <div className="flex flex-wrap gap-1">
                {pendingConflict.slice(0, 12).map((w) => (
                  <span
                    key={w}
                    className="rounded-sm border border-accent-gold/30 bg-paper-card px-1.5 py-0.5 font-serif text-xs text-ink-muted"
                  >
                    {w}
                  </span>
                ))}
                {pendingConflict.length > 12 && (
                  <span className="font-mono text-2xs text-ink-light">
                    …等共 {pendingConflict.length} 个
                  </span>
                )}
              </div>
            </div>

            {/* 按钮组 */}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={handleConflictCancel}
                className="rounded-md border border-ink/20 px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-ink/40 hover:text-ink"
              >
                取消
              </button>
              <button
                onClick={handleConflictSkip}
                className="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-accent-gold transition-colors hover:bg-accent-gold/20"
              >
                跳过重复
              </button>
              <button
                onClick={handleConflictReplace}
                className="rounded-md border border-ink bg-ink px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-paper transition-colors hover:bg-ink/90"
              >
                替换已有
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

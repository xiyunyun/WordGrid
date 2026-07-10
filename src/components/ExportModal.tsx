import { useState } from "react";
import { X, Download, FileText, FileCode, Table, Layers } from "lucide-react";
import type { Word } from "@/types";
import {
  buildExportContent,
  buildFileName,
  downloadFile,
  type ExportFormat,
  type ExportScope,
} from "@/lib/exporter";
import { cn } from "@/lib/utils";

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  words: Word[];
}

const FORMAT_OPTIONS: Array<{
  key: ExportFormat;
  label: string;
  labelCN: string;
  desc: string;
  icon: typeof FileText;
}> = [
  {
    key: "txt",
    label: "TXT",
    labelCN: "纯文本",
    desc: "每行一个单词，通用性强",
    icon: FileText,
  },
  {
    key: "md",
    label: "Markdown",
    labelCN: "标记文档",
    desc: "带表格结构，适合阅读归档",
    icon: FileCode,
  },
  {
    key: "csv",
    label: "CSV",
    labelCN: "表格数据",
    desc: "可导入 Excel / 欧路词典",
    icon: Table,
  },
  {
    key: "anki",
    label: "Anki",
    labelCN: "记忆卡片",
    desc: "制表符分隔，直接导入 Anki",
    icon: Layers,
  },
];

const SCOPE_OPTIONS: Array<{
  key: ExportScope;
  label: string;
  labelCN: string;
  desc: string;
}> = [
  {
    key: "word_only",
    label: "Words Only",
    labelCN: "仅单词",
    desc: "只导出单词列表",
  },
  {
    key: "word_meaning",
    label: "Words + Meaning",
    labelCN: "单词 + 词意",
    desc: "含音标、词性、释义",
  },
  {
    key: "word_meaning_note",
    label: "Full Export",
    labelCN: "单词 + 词意 + 笔记",
    desc: "含全部字段（含个人笔记）",
  },
];

export default function ExportModal({ open, onClose, words }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("txt");
  const [scope, setScope] = useState<ExportScope>("word_meaning");
  const [justExported, setJustExported] = useState(false);

  if (!open) return null;

  const handleExport = () => {
    const content = buildExportContent(words, format, scope);
    const fileName = buildFileName(format, scope);
    downloadFile(content, fileName);
    setJustExported(true);
    setTimeout(() => setJustExported(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-4">
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-ink/15 bg-paper-card shadow-deep animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-6 py-4">
          <div>
            <div className="eyebrow">Export · 导出单词本</div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              导出单词
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

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* 统计 */}
          <div className="mb-5 rounded-md border border-ink/10 bg-paper p-3 text-center">
            <span className="font-display text-3xl font-medium text-ink">
              {words.length}
            </span>
            <span className="ml-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              words to export
            </span>
          </div>

          {/* 格式选择 */}
          <div className="mb-5">
            <label className="eyebrow mb-3 block">Format · 导出格式</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = format === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setFormat(opt.key)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-3 transition-all",
                      active
                        ? "border-ink bg-ink/5"
                        : "border-ink/15 hover:border-ink/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active ? "text-ink" : "text-ink-light",
                      )}
                      strokeWidth={1.5}
                    />
                    <span className="font-mono text-2xs uppercase tracking-editorial text-ink">
                      {opt.label}
                    </span>
                    <span className="font-body text-2xs text-ink-light">
                      {opt.labelCN}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 font-body text-xs text-ink-muted">
              {FORMAT_OPTIONS.find((o) => o.key === format)?.desc}
            </p>
          </div>

          {/* 内容范围 */}
          <div className="mb-5">
            <label className="eyebrow mb-3 block">Scope · 导出内容</label>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => {
                const active = scope === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setScope(opt.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-4 py-3 transition-all",
                      active
                        ? "border-ink bg-ink/5"
                        : "border-ink/15 hover:border-ink/40",
                    )}
                  >
                    <div className="text-left">
                      <div className="font-mono text-2xs uppercase tracking-editorial text-ink">
                        {opt.label}
                      </div>
                      <div className="font-body text-sm text-ink-soft">
                        {opt.labelCN}
                      </div>
                    </div>
                    <div className="font-body text-2xs text-ink-muted">
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Anki 导入提示 */}
          {format === "anki" && (
            <div className="mb-5 rounded-md border border-accent-gold/40 bg-accent-gold/10 p-3">
              <div className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                Anki 导入提示
              </div>
              <p className="mt-1 font-body text-xs leading-relaxed text-ink-soft">
                导出的 .txt 文件可直接导入 Anki。导入时选择
                <span className="font-mono">「基础（含正反面的卡片）」</span>
                类型，字段分隔符选择
                <span className="font-mono">「制表符 Tab」</span>，并勾选
                <span className="font-mono">「允许在字段中使用 HTML」</span>。
              </p>
            </div>
          )}

          {/* 导出成功提示 */}
          {justExported && (
            <div className="rounded-md border border-accent-green/40 bg-accent-green/10 p-3 font-mono text-2xs text-accent-green">
              ✓ 已开始下载，请检查浏览器下载列表
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 border-t border-ink/15 px-6 py-4">
          <button onClick={onClose} className="btn-ghost">
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={words.length === 0}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
            导出 {words.length} 个单词
          </button>
        </div>
      </div>
    </div>
  );
}

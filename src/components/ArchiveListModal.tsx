import { useState, useMemo } from "react";
import { X, Archive, Calendar, FileText, ChevronRight, Trash2, Award } from "lucide-react";
import type { ArticleArchive } from "@/store/articleStore";
import { cn } from "@/lib/utils";

interface ArchiveListModalProps {
  open: boolean;
  onClose: () => void;
  archives: ArticleArchive[];
  onOpenArchive: (archive: ArticleArchive) => void;
  onDeleteArchive: (id: string) => void;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
};

export default function ArchiveListModal({
  open,
  onClose,
  archives,
  onOpenArchive,
  onDeleteArchive,
}: ArchiveListModalProps) {
  // 按 createdAt 降序稳定排序（最新的在最前）
  // 避免云端拉取顺序不稳定导致每次刷新排序都变化
  const sortedArchives = useMemo(
    () => [...archives].sort((a, b) => b.createdAt - a.createdAt),
    [archives],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-ink/15 bg-paper-card shadow-deep">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 md:px-6 md:py-4">
          <div>
            <div className="eyebrow">Archive · 文章归档</div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              历史文章
              <span className="ml-2 font-serif text-base italic text-ink-light">
                {archives.length} entries
              </span>
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

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">
          {archives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Archive
                className="mb-3 h-10 w-10 text-ink-light"
                strokeWidth={1}
              />
              <div className="eyebrow mb-2">No Archives</div>
              <p className="font-body text-sm text-ink-muted">
                还没有归档的文章，生成一篇文章后会自动保存到这里。
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedArchives.map((a) => (
                <ArchiveRow
                  key={a.id}
                  archive={a}
                  onOpen={() => onOpenArchive(a)}
                  onDelete={() => onDeleteArchive(a.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveRow({
  archive,
  onOpen,
  onDelete,
}: {
  archive: ArticleArchive;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <li
      className="group flex items-center gap-2 rounded-md border border-ink/10 bg-paper p-3 transition-colors hover:border-ink/30 hover:bg-paper-warm/40 md:gap-4 md:p-4"
    >
      <button onClick={onOpen} className="flex flex-1 items-center gap-2 text-left md:gap-4">
        {/* 日期块 */}
        <div className="flex w-14 flex-shrink-0 flex-col items-center rounded-md border border-ink/10 bg-paper-card py-2 md:w-16">
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            {archive.date.slice(5).replace("-", "/")}
          </span>
          <span className="font-display text-lg font-medium text-ink">
            {archive.date.slice(8)}
          </span>
        </div>

        {/* 内容预览 */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-ink-light" strokeWidth={1.5} />
            <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
              {DIFFICULTY_LABEL[archive.difficulty] || archive.difficulty}
            </span>
            <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
              · {archive.words.length} 词
            </span>
            {archive.questions.length > 0 && (
              <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                · {archive.questions.length} 题
              </span>
            )}
            {archive.attempt && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-2xs uppercase tracking-editorial",
                  archive.attempt.score >= 80
                    ? "bg-accent-green/10 text-accent-green"
                    : archive.attempt.score >= 50
                      ? "bg-accent-gold/10 text-accent-gold"
                      : "bg-accent-red/10 text-accent-red",
                )}
              >
                <Award className="h-3 w-3" strokeWidth={1.5} />
                {archive.attempt.score}分
              </span>
            )}
          </div>
          <p className="line-clamp-2 font-serif text-sm italic text-ink-soft">
            {archive.article.slice(0, 120)}...
          </p>
        </div>

        <ChevronRight
          className="h-4 w-4 flex-shrink-0 text-ink-light transition-colors group-hover:text-ink"
          strokeWidth={1.5}
        />
      </button>

      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirmDel) {
            onDelete();
          } else {
            setConfirmDel(true);
            setTimeout(() => setConfirmDel(false), 2500);
          }
        }}
        className={cn(
          "flex-shrink-0 rounded p-1.5 transition-colors",
          confirmDel
            ? "bg-accent-red text-paper"
            : "text-ink-light opacity-100 hover:bg-accent-red/10 hover:text-accent-red md:opacity-0 md:group-hover:opacity-100",
        )}
        title={confirmDel ? "再次点击确认删除" : "删除"}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </li>
  );
}

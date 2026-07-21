import { useEffect, useState } from "react";
import { X, AlarmClock, Zap } from "lucide-react";
import type { Word } from "@/types";
import SelfCheckFlow from "@/components/SelfCheckFlow";

interface DueTodayModalProps {
  open: boolean;
  onClose: () => void;
  words: Word[];
  /** 明日到期的单词，用于"立即复习明日"模式 */
  tomorrowWords?: Word[];
}

/**
 * Due Today 复习弹窗 - 中央聚焦 + 背景虚焦
 * 复用 SelfCheckFlow 流程，与生词本自我检测体验一致
 * 支持切换"今日复习"与"立即复习明日"两种模式
 */
export default function DueTodayModal({
  open,
  onClose,
  words,
  tomorrowWords = [],
}: DueTodayModalProps) {
  // 模式：today=今日到期，tomorrow=提前复习明日
  const [mode, setMode] = useState<"today" | "tomorrow">("today");

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // 每次打开重置为今日模式
  useEffect(() => {
    if (open) setMode("today");
  }, [open]);

  if (!open) return null;

  const activeWords = mode === "today" ? words : tomorrowWords;
  const hasTomorrow = tomorrowWords.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* 背景虚焦遮罩 */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 中央弹窗 */}
      <div className="relative z-10 mx-4 w-full max-w-2xl animate-slide-up overflow-hidden rounded-md border border-ink/15 bg-paper shadow-deep-always">
        {/* 头部 */}
        <header className="flex items-center justify-between border-b border-ink/15 bg-paper-card px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <div
              className={
                "flex h-10 w-10 items-center justify-center rounded-full " +
                (mode === "today"
                  ? "bg-accent-red/10 text-accent-red"
                  : "bg-accent-gold/10 text-accent-gold")
              }
            >
              <AlarmClock className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div
                className={
                  "eyebrow " +
                  (mode === "today" ? "text-accent-red" : "text-accent-gold")
                }
              >
                {mode === "today" ? "Due Today" : "Early Review"}
              </div>
              <h2 className="font-display text-2xl font-medium text-ink">
                {mode === "today" ? "今日复习" : "提前复习明日"}
                <span className="ml-2 font-serif text-base italic text-ink-light">
                  {activeWords.length} words
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-ink/20 p-2 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* 模式切换条 - 仅当有明日单词时显示 */}
        {hasTomorrow && (
          <div className="flex items-center gap-2 border-b border-ink/10 bg-paper-warm/30 px-4 py-2 md:px-6">
            <button
              onClick={() => setMode("today")}
              className={
                "rounded-md border px-3 py-1 font-mono text-2xs uppercase tracking-editorial transition-colors " +
                (mode === "today"
                  ? "border-accent-red/40 bg-accent-red/10 text-accent-red"
                  : "border-ink/15 text-ink-light hover:border-ink/30 hover:text-ink")
              }
            >
              今日 · {words.length} 词
            </button>
            <button
              onClick={() => setMode("tomorrow")}
              className={
                "flex items-center gap-1 rounded-md border px-3 py-1 font-mono text-2xs uppercase tracking-editorial transition-colors " +
                (mode === "tomorrow"
                  ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
                  : "border-ink/15 text-ink-light hover:border-ink/30 hover:text-ink")
              }
            >
              <Zap className="h-3 w-3" strokeWidth={1.5} />
              明日 · {tomorrowWords.length} 词
            </button>
          </div>
        )}

        {/* 流程主体 - key 随 mode 变化以重置 SelfCheckFlow 内部状态 */}
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <SelfCheckFlow
            key={mode}
            words={activeWords}
            mode="self_check"
            showRestart
            dryRun={mode === "tomorrow"}
          />
        </div>

        {/* 底部提示 */}
        <footer className="border-t border-ink/10 bg-paper-warm/40 px-4 py-3 md:px-6 font-mono text-2xs uppercase tracking-editorial text-ink-light">
          按 ESC 关闭 ·{" "}
          {mode === "today"
            ? "答错的词汇将在明天再次出现"
            : "提前复习不影响艾宾浩斯节点"}
        </footer>
      </div>
    </div>
  );
}

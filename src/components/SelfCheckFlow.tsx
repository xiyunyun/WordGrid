import { useState } from "react";
import { Check, X, Eye, RotateCcw } from "lucide-react";
import type { Word, ReviewMode } from "@/types";
import { useWordStore } from "@/store/wordStore";
import { formatMD, todayKey } from "@/lib/review";
import SpeakButton from "@/components/SpeakButton";

interface SelfCheckFlowProps {
  words: Word[];
  mode?: ReviewMode;
  /** 完成时的回调，可选 */
  onComplete?: (stats: {
    correct: number;
    wrong: number;
    total: number;
  }) => void;
  /** 是否显示"再来一轮"按钮，默认 true */
  showRestart?: boolean;
  /** 演练模式：不更新 store 的艾宾浩斯节点（用于提前复习明日） */
  dryRun?: boolean;
}

/**
 * 自我检测流程 - 可复用的复习卡片流转组件
 *
 * 核心行为：
 * - 挂载时快照 words 到内部 queue，之后不受 props 变化影响
 * - "不认识"：记录复习日志 + 重置艾宾浩斯节点，并将该词重新追加到队尾再次提问
 * - "认识"：记录复习日志 + 推进艾宾浩斯节点，消费该词
 * - 全部消费后显示完成统计页
 * - dryRun=true 时仅流转卡片，不调用 reviewWord 更新 store
 */
export default function SelfCheckFlow({
  words,
  mode = "self_check",
  onComplete,
  showRestart = true,
  dryRun = false,
}: SelfCheckFlowProps) {
  const reviewWord = useWordStore((s) => s.reviewWord);

  // 挂载时锁定快照 —— 复习过程中 store 更新不会干扰当前流程
  const [initialWords] = useState<Word[]>(() => words);
  const [queue, setQueue] = useState<Word[]>(() => [...words]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [done, setDone] = useState(false);

  const total = initialWords.length; // 唯一单词总数
  const current = queue[idx];

  const handle = (correct: boolean) => {
    if (!current) return;
    // 记录复习日志 + 更新艾宾浩斯节点（dryRun 模式跳过）
    if (!dryRun) {
      reviewWord(current.id, correct, mode);
    }
    setRevealed(false);

    const newStats = {
      correct: stats.correct + (correct ? 1 : 0),
      wrong: stats.wrong + (correct ? 0 : 1),
    };
    setStats(newStats);

    let newQueue = queue;
    if (!correct) {
      // 不认识 → 重新追加到队尾，稍后会再次提问
      newQueue = [...queue, current];
      setQueue(newQueue);
    }

    const nextIdx = idx + 1;
    if (nextIdx >= newQueue.length) {
      setDone(true);
      onComplete?.({ ...newStats, total });
    } else {
      setIdx(nextIdx);
    }
  };

  const restart = () => {
    setQueue([...initialWords]);
    setIdx(0);
    setRevealed(false);
    setStats({ correct: 0, wrong: 0 });
    setDone(false);
  };

  // 空列表 —— 弹窗仍保持打开，仅提示无待复习词
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Check
          className="mb-4 h-10 w-10 text-accent-green"
          strokeWidth={1.5}
        />
        <div className="eyebrow mb-2 text-accent-green">All Caught Up</div>
        <h3 className="font-display text-2xl font-medium text-ink">
          今日无待复习词
        </h3>
        <p className="mt-2 font-body text-sm text-ink-light">
          需要复习的单词为 0，干得漂亮。
        </p>
      </div>
    );
  }

  // 完成或越界保护
  if (done || !current) {
    const attempts = stats.correct + stats.wrong;
    const accuracy =
      attempts > 0 ? Math.round((stats.correct / attempts) * 100) : 100;
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
        <Check
          className="mb-4 h-12 w-12 text-accent-green"
          strokeWidth={1.5}
        />
        <div className="eyebrow mb-2 text-accent-green">Review Complete</div>
        <h3 className="mb-6 font-display text-3xl font-medium text-ink">
          复习完成
        </h3>

        <div className="grid grid-cols-3 gap-6 rounded-md border border-ink/15 bg-paper-card p-6 shadow-paper">
          <div>
            <div className="font-display text-4xl font-medium text-ink">
              {total}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Total
            </div>
          </div>
          <div>
            <div className="font-display text-4xl font-medium text-accent-green">
              {stats.correct}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Correct
            </div>
          </div>
          <div>
            <div className="font-display text-4xl font-medium text-accent-red">
              {stats.wrong}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Wrong
            </div>
          </div>
        </div>

        <div className="mt-5 font-body text-sm text-ink-muted">
          正确率
          <span
            className={
              "ml-2 font-display text-2xl font-medium " +
              (accuracy >= 80
                ? "text-accent-green"
                : accuracy >= 50
                  ? "text-accent-gold"
                  : "text-accent-red")
            }
          >
            {accuracy}%
          </span>
        </div>

        <p className="mt-4 max-w-md font-body text-xs text-ink-light">
          答错的词汇已重置艾宾浩斯复习节点，将在
          <span className="mx-1 font-mono text-accent-red">明天</span>
          重新出现。今日为 {formatMD(todayKey())}。
        </p>

        {showRestart && (
          <button onClick={restart} className="btn-ghost mt-6">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            再来一轮
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* 进度条 */}
      <div className="mb-6 flex items-center gap-4">
        <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
          {idx + 1} / {queue.length}
          {queue.length > total && (
            <span className="ml-2 text-accent-red">
              (含重问 {queue.length - total})
            </span>
          )}
        </span>
        <div className="h-px flex-1 bg-ink/15">
          <div
            className="h-px bg-ink transition-all duration-300"
            style={{ width: `${(idx / queue.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 单词卡片 */}
      <div>
        <div className="rounded-md border border-ink/15 bg-paper-card p-10 text-center shadow-paper">
          <div className="eyebrow mb-4">Self-Check</div>
          <h3 className="font-serif text-5xl font-medium tracking-word text-ink">
            {current.word}
          </h3>
          {current.phonetic && (
            <div className="mt-2 font-mono text-sm text-ink-light">
              {current.phonetic}
            </div>
          )}
          <div className="mt-2 font-mono text-sm italic text-accent-gold">
            {current.pos}
          </div>
          {revealed && (
            <div className="mt-3 flex justify-center">
              <SpeakButton text={current.word} size="md" />
            </div>
          )}

          <div className="my-8 border-t border-dashed border-ink/15" />

          {revealed ? (
            <p className="font-body text-2xl text-ink-soft animate-ink-bloom">
              {current.meaning}
            </p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="mx-auto flex w-full flex-col items-center gap-2 text-ink-light transition-colors hover:text-ink"
            >
              <Eye className="h-6 w-6" strokeWidth={1} />
              <span className="font-mono text-2xs uppercase tracking-editorial">
                点击显示释义
              </span>
            </button>
          )}
        </div>

        {/* 判卷按钮 */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => handle(false)}
            className="flex items-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/5 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            不认识
          </button>
          <button
            onClick={() => handle(true)}
            className="flex items-center gap-2 rounded-md border border-accent-green/40 bg-accent-green/5 px-6 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-green transition-colors hover:bg-accent-green hover:text-paper"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            认识
          </button>
        </div>
      </div>
    </div>
  );
}

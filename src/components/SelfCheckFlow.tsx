import { useState, useEffect, useMemo } from "react";
import { Check, X, Eye, RotateCcw } from "lucide-react";
import type { Word, ReviewMode, ReviewLog } from "@/types";
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
  /**
   * 已废弃：进度现在从 review_logs 派生，天然跨设备同步。
   * 保留参数仅为向后兼容，不再有实际作用。
   */
  persistKey?: string;
}

/**
 * 从今日 review_logs 派生自我检测的进度
 *
 * 设计原理：
 * - 每次"认识/不认识"都会写一条 review_log（mode=self_check）
 * - 跨设备同步后，B 设备能从 logs 看到A 设备已复习的词
 * - "已消费" = 该 wordId 在今日 logs 中至少有一条记录（不论对错、不论重问）
 * - "完成" = initialWords 中的每个 wordId 都已消费
 * - 重问的词会产生新 log，但不影响"是否已消费"的判断
 */
function getTodaySelfCheckStats(logs: ReviewLog[], mode: ReviewMode) {
  const todayStart = new Date(todayKey() + "T00:00:00").getTime();
  const consumedIds = new Set<string>();
  let correct = 0;
  let wrong = 0;
  for (const log of logs) {
    if (log.mode !== mode) continue;
    if (log.reviewedAt < todayStart) continue;
    consumedIds.add(log.wordId);
    if (log.correct) correct++;
    else wrong++;
  }
  return { consumedIds, correct, wrong };
}

/**
 * 自我检测流程 - 可复用的复习卡片流转组件
 *
 * 核心行为：
 * - 挂载时快照 words 到 initialWords（不变）
 * - 从今日 review_logs 派生已消费的 wordId 集合
 * - 队列 = initialWords 中尚未消费的词（保持原顺序）
 * - "不认识"：记录复习日志 + 重置艾宾浩斯节点，并将该词重新追加到队尾再次提问
 * - "认识"：记录复习日志 + 推进艾宾浩斯节点
 * - 全部消费后显示完成统计页
 * - dryRun=true 时仅流转卡片，不调用 reviewWord 更新 store（进度也不同步）
 */
export default function SelfCheckFlow({
  words,
  mode = "self_check",
  onComplete,
  showRestart = true,
  dryRun = false,
}: SelfCheckFlowProps) {
  const reviewWord = useWordStore((s) => s.reviewWord);
  const logs = useWordStore((s) => s.logs);

  // 挂载时锁定快照（之后不受 props 变化影响）
  const [initialWords] = useState<Word[]>(() => words);

  // 本地状态：只记录"本轮重问"的临时队列（不持久化，因为进度从 logs 派生）
  // 当用户点"不认识"时，词会被追加到 reaskQueue 末尾再次提问
  const [reaskQueue, setReaskQueue] = useState<Word[]>([]);
  const [revealed, setRevealed] = useState(false);
  // 是否点击了"再来一轮"：重启后不再从 logs 派生 done，而是用本轮临时计数
  const [restarted, setRestarted] = useState(false);
  const [restartedStats, setRestartedStats] = useState({ correct: 0, wrong: 0 });
  const [restartedConsumed, setRestartedConsumed] = useState(0);

  // 从今日 logs 派生已消费集合与统计（跨设备同步的进度来源）
  const { consumedIds, correct: logCorrect, wrong: logWrong } = useMemo(
    () => getTodaySelfCheckStats(logs, mode),
    [logs, mode],
  );

  // 主队列 = initialWords 中尚未消费的词 + 本轮重问队列
  // dryRun 模式下不从 logs 派生（因为 dryRun 不写 logs）
  const queue = useMemo(() => {
    if (dryRun) return [...initialWords, ...reaskQueue];
    if (restarted) {
      // "再来一轮"模式：重新从头开始，用本地计数
      const remaining = initialWords.slice(restartedConsumed);
      return [...remaining, ...reaskQueue];
    }
    const remaining = initialWords.filter((w) => !consumedIds.has(w.id));
    return [...remaining, ...reaskQueue];
  }, [initialWords, consumedIds, reaskQueue, dryRun, restarted, restartedConsumed]);

  const total = initialWords.length;
  const current = queue[0];

  // done 判断
  const done = restarted
    ? restartedConsumed >= total
    : !dryRun && consumedIds.size >= total;

  // 统计展示
  const stats = restarted
    ? restartedStats
    : dryRun
      ? { correct: 0, wrong: 0 }
      : { correct: logCorrect, wrong: logWrong };

  // 完成回调
  useEffect(() => {
    if (done) {
      onComplete?.({ ...stats, total });
    }
  }, [done, stats, total, onComplete]);

  const handle = (correct: boolean) => {
    if (!current) return;
    // 记录复习日志 + 更新艾宾浩斯节点（dryRun 模式跳过）
    if (!dryRun) {
      reviewWord(current.id, correct, mode);
    }
    setRevealed(false);

    if (restarted) {
      // "再来一轮"模式：本地计数
      setRestartedStats((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        wrong: s.wrong + (correct ? 0 : 1),
      }));
      setRestartedConsumed((n) => n + 1);
      if (!correct) {
        setReaskQueue((q) => [...q, current]);
      }
      return;
    }

    // 正常模式：
    // - 首次复习的词（来自 remaining）：日志写入后 consumedIds 自动更新，remaining 缩减
    // - 重问的词（来自 reaskQueue）：需要手动管理 reaskQueue
    // 判断 current 是否来自 reaskQueue：检查它是否已在 consumedIds 中（重问的词之前一定被消费过）
    const isFromReask = !dryRun && consumedIds.has(current.id);

    if (isFromReask) {
      // 来自重问队列：无论对错都从 reaskQueue 移除当前位置
      // 不认识的话再加到末尾
      setReaskQueue((q) => {
        const idx = q.findIndex((w) => w.id === current.id);
        if (idx === -1) return q;
        const newQ = [...q.slice(0, idx), ...q.slice(idx + 1)];
        if (!correct) newQ.push(current);
        return newQ;
      });
    } else {
      // 首次复习：日志写入后 consumedIds 会自动更新
      // 不认识的话需要加到 reaskQueue 末尾
      if (!correct) {
        setReaskQueue((q) => [...q, current]);
      }
    }
  };

  const restart = () => {
    setRestarted(true);
    setRestartedStats({ correct: 0, wrong: 0 });
    setRestartedConsumed(0);
    setReaskQueue([]);
    setRevealed(false);
  };

  // 空列表
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Check className="mb-4 h-10 w-10 text-accent-green" strokeWidth={1.5} />
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
        <Check className="mb-4 h-12 w-12 text-accent-green" strokeWidth={1.5} />
        <div className="eyebrow mb-2 text-accent-green">Review Complete</div>
        <h3 className="mb-6 font-display text-3xl font-medium text-ink">
          复习完成
        </h3>

        <div className="grid grid-cols-3 gap-3 rounded-md border border-ink/15 bg-paper-card p-4 shadow-paper md:gap-6 md:p-6">
          <div>
            <div className="font-display text-2xl font-medium text-ink md:text-4xl">
              {total}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Total
            </div>
          </div>
          <div>
            <div className="font-display text-2xl font-medium text-accent-green md:text-4xl">
              {stats.correct}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              Correct
            </div>
          </div>
          <div>
            <div className="font-display text-2xl font-medium text-accent-red md:text-4xl">
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

  // 计算进度条位置（基于已消费数 + 本轮重问位置）
  const consumedCount = restarted ? restartedConsumed : (dryRun ? 0 : consumedIds.size);
  const progressIdx = consumedCount + (queue.length - reaskQueue.length > 0 ? 0 : 0);

  return (
    <div className="animate-fade-in">
      {/* 进度条 */}
      <div className="mb-4 flex items-center gap-2 md:mb-6 md:gap-4">
        <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
          {consumedCount + 1} / {total}
          {reaskQueue.length > 0 && (
            <span className="ml-2 text-accent-red">
              (含重问 {reaskQueue.length})
            </span>
          )}
        </span>
        <div className="h-px flex-1 bg-ink/15">
          <div
            className="h-px bg-ink transition-all duration-300"
            style={{ width: `${(consumedCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* 单词卡片 */}
      <div>
        <div className="rounded-md border border-ink/15 bg-paper-card p-5 text-center shadow-paper md:p-10">
          <div className="eyebrow mb-4">Self-Check</div>
          <h3 className="font-serif text-3xl font-medium tracking-word text-ink md:text-5xl">
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

          <div className="my-5 border-t border-dashed border-ink/15 md:my-8" />

          {revealed ? (
            <div className="animate-ink-bloom">
              <p className="font-body text-xl text-ink-soft md:text-2xl">
                {current.meaning}
              </p>
              {current.note && (
                <div className="mt-4 rounded-md border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-left">
                  <div className="mb-1 font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                    Note · 笔记
                  </div>
                  <p className="font-body text-sm leading-relaxed text-ink-muted whitespace-pre-wrap">
                    {current.note}
                  </p>
                </div>
              )}
            </div>
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
        <div className="mt-5 flex items-center justify-center gap-3 md:mt-6 md:gap-4">
          <button
            onClick={() => handle(false)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/5 px-4 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper md:flex-none md:px-6"
          >
            <X className="h-4 w-4" strokeWidth={2} />
            不认识
          </button>
          <button
            onClick={() => handle(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-md border border-accent-green/40 bg-accent-green/5 px-4 py-2.5 font-mono text-2xs uppercase tracking-editorial text-accent-green transition-colors hover:bg-accent-green hover:text-paper md:flex-none md:px-6"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            认识
          </button>
        </div>
      </div>
    </div>
  );
}

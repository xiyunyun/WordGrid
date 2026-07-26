import { useState, useEffect, useMemo } from "react";
import { Check, X, Eye, RotateCcw, Bookmark } from "lucide-react";
import type { Word, ReviewMode, ReviewLog } from "@/types";
import { useWordStore } from "@/store/wordStore";
import { formatMD, todayKey } from "@/lib/review";
import { cn } from "@/lib/utils";
import SpeakButton from "@/components/SpeakButton";

/**
 * localStorage 持久化缓存：跨路由切换 AND 跨页面刷新/关闭保留状态
 *
 * 设计原理：
 * - SelfCheckFlow 的进度（已消费的词）从今日 review_logs 派生，天然跨设备同步
 * - 但「再来一轮」和「重问队列」是本地行为，不入 logs（避免污染统计），所以需要手动缓存
 * - 缓存 key = persistKey + 当日日期，确保每天重置
 * - 使用 localStorage 而非模块级 Map，确保关闭网页后重问队列不丢失
 */
interface RestartCache {
  restarted: boolean;
  restartedStats: { correct: number; wrong: number };
  restartedConsumed: number;
  /** 重问队列只存 id，重新挂载时从 initialWords 恢复 Word 对象 */
  reaskIds: string[];
  /** 持久化 initialWords 的 ID 列表，确保切走再回来时 total 不缩水 */
  initialIds: string[];
}

const REASK_STORAGE_PREFIX = "wordgrid-reask-";

function getRestartCacheKey(persistKey: string | undefined): string {
  return `${REASK_STORAGE_PREFIX}${persistKey ?? "default"}-${todayKey()}`;
}

function loadRestartCache(persistKey: string | undefined): RestartCache | null {
  try {
    const key = getRestartCacheKey(persistKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as RestartCache;
  } catch {
    return null;
  }
}

function saveRestartCache(persistKey: string | undefined, cache: RestartCache): void {
  try {
    const key = getRestartCacheKey(persistKey);
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // localStorage 不可用时静默降级
  }
}

function clearRestartCache(persistKey: string | undefined): void {
  try {
    const key = getRestartCacheKey(persistKey);
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

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
  /** 点击笔记时打开笔记弹窗（查看/编辑），可选 */
  onRequestNote?: (word: Word) => void;
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
  persistKey,
  onRequestNote,
}: SelfCheckFlowProps) {
  const reviewWord = useWordStore((s) => s.reviewWord);
  const logs = useWordStore((s) => s.logs);
  const markMastered = useWordStore((s) => s.markMastered);

  // 挂载时锁定快照（之后不受 props 变化影响）
  // 但当 words prop 中出现新词（如用户在 SelfCheck 期间添加了新词）时，追加到 initialWords
  //
  // 关键修复：优先从 localStorage 缓存恢复 initialIds，避免切走再回来时 total 缩水
  // 场景：100 个待复习词，答对 50 个后切走，dueWords 选择器缩小为 50 个。
  // 如果直接用 words prop 初始化，重挂载后 initialWords 只剩 50 个 → total 显示 50。
  // 从缓存的 initialIds 恢复（从 store 完整 words 中按 ID 查找），total 保持 100。
  const [initialWords, setInitialWords] = useState<Word[]>(() => {
    const cached = loadRestartCache(persistKey);
    // 兼容旧缓存（可能没有 initialIds 字段）
    if (cached && cached.initialIds && cached.initialIds.length > 0) {
      const allWords = useWordStore.getState().words;
      const restored = cached.initialIds
        .map((id) => allWords.find((w) => w.id === id))
        .filter((w): w is Word => Boolean(w));
      if (restored.length > 0) return restored;
    }
    return words;
  });

  // 当 words prop 中的 ID 集合变化时，将新词追加到 initialWords 末尾
  // 这样用户在 SelfCheck 期间添加的"当日新词"也能进入队列
  const wordsIdSignature = useMemo(
    () => words.map((w) => w.id).sort().join(","),
    [words],
  );
  useEffect(() => {
    setInitialWords((prev) => {
      const existingIds = new Set(prev.map((w) => w.id));
      const newWords = words.filter((w) => !existingIds.has(w.id));
      if (newWords.length === 0) return prev;
      return [...prev, ...newWords];
    });
  }, [wordsIdSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  // 从模块级缓存恢复「再来一轮」状态（路由切换后保留进度）
  const cachedRestart = useMemo(() => loadRestartCache(persistKey), [persistKey]);

  // 本地状态：只记录"本轮重问"的临时队列（不持久化，因为进度从 logs 派生）
  // 当用户点"不认识"时，词会被追加到 reaskQueue 末尾再次提问
  const [reaskQueue, setReaskQueue] = useState<Word[]>(() => {
    // 从缓存恢复时，需要从 initialWords 中按 id 还原 Word 对象
    if (cachedRestart && cachedRestart.reaskIds.length > 0) {
      const idSet = new Set(cachedRestart.reaskIds);
      return words.filter((w) => idSet.has(w.id));
    }
    return [];
  });
  const [revealed, setRevealed] = useState(false);
  // 是否点击了"再来一轮"：重启后不再从 logs 派生 done，而是用本轮临时计数
  const [restarted, setRestarted] = useState(() => cachedRestart?.restarted ?? false);
  const [restartedStats, setRestartedStats] = useState(
    () => cachedRestart?.restartedStats ?? { correct: 0, wrong: 0 },
  );
  const [restartedConsumed, setRestartedConsumed] = useState(
    () => cachedRestart?.restartedConsumed ?? 0,
  );

  // 当 restarted/restartedStats/restartedConsumed/reaskQueue/initialWords 变化时，同步到 localStorage
  // 这样路由切换或关闭网页后重新挂载能恢复进度和重问队列
  // 关键：无论是否 restarted 都要保存，否则非 restarted 模式下的 reaskQueue 会丢失
  // initialIds 也需保存，否则切走再回来时 total 会缩水（dueWords 选择器缩小了）
  useEffect(() => {
    saveRestartCache(persistKey, {
      restarted,
      restartedStats,
      restartedConsumed,
      reaskIds: reaskQueue.map((w) => w.id),
      initialIds: initialWords.map((w) => w.id),
    });
  }, [restarted, restartedStats, restartedConsumed, reaskQueue, persistKey, initialWords]);

  // 从今日 logs 派生已消费集合与统计（跨设备同步的进度来源）
  const { consumedIds, correct: logCorrect, wrong: logWrong } = useMemo(
    () => getTodaySelfCheckStats(logs, mode),
    [logs, mode],
  );

  // 仅统计 initialWords 中已消费的词（避免历史 logs 中已不在 initialWords 的词干扰进度）
  // 场景：用户学了 20 个词（答对→nextReview 推进到明天），关闭网页再打开，
  //       initialWords 变成 30 个（不含旧的 20 个），但 consumedIds 仍有 20 个。
  //       如果用 consumedIds.size 判断 done，会错误地认为已完成 20/30。
  //       用 consumedInInitial 只统计当前 initialWords 中的已消费词，进度才准确。
  const consumedInInitial = useMemo(() => {
    const set = new Set<string>();
    for (const w of initialWords) {
      if (consumedIds.has(w.id)) set.add(w.id);
    }
    return set;
  }, [initialWords, consumedIds]);

  // 主队列 = initialWords 中尚未消费的词 + 本轮重问队列
  // dryRun 模式下不从 logs 派生（因为 dryRun 不写 logs）
  const queue = useMemo(() => {
    if (dryRun) return [...initialWords, ...reaskQueue];
    if (restarted) {
      // "再来一轮"模式：重新从头开始，用本地计数
      const remaining = initialWords.slice(restartedConsumed);
      return [...remaining, ...reaskQueue];
    }
    const remaining = initialWords.filter((w) => !consumedInInitial.has(w.id));
    return [...remaining, ...reaskQueue];
  }, [initialWords, consumedInInitial, reaskQueue, dryRun, restarted, restartedConsumed]);

  // total 包含重问的词：答错后词会被追加到 reaskQueue，总数应相应增加
  // 这样进度显示为 "1 / 41 (含重问 1)" 而不是 "1 / 40 (含重问 1)"
  const initialTotal = initialWords.length;
  const total = initialTotal + reaskQueue.length;
  const current = queue[0];
  // 从 live words prop 按 id 解析最新 word 对象，确保编辑笔记后卡片即时刷新
  // current 用于队列逻辑（id/顺序），liveCurrent 用于显示（note 等字段实时）
  const liveCurrent = current
    ? words.find((w) => w.id === current.id) ?? current
    : null;

  // done 判断：所有原始词都已消费 且 重问队列清空
  // 用 consumedInInitial.size（只统计 initialWords 中的已消费词）判断完成
  // 这样关闭网页再打开后，不会因历史 logs 中的词错误判断为已完成
  const done = restarted
    ? restartedConsumed >= initialTotal && reaskQueue.length === 0
    : !dryRun && consumedInInitial.size >= initialTotal && reaskQueue.length === 0;

  // 统计展示
  const stats = restarted
    ? restartedStats
    : dryRun
      ? { correct: 0, wrong: 0 }
      : { correct: logCorrect, wrong: logWrong };

  // 空列表判断：
  // - initialTotal===0 且 今日没有 self_check 日志 → 真正无待复习，显示空状态
  // - initialTotal===0 但 今日有 self_check 日志 → 已复习完毕，进入 done 分支显示完成页 + 再来一轮
  //   （避免用户刚复习完进 SelfCheck 看到空状态而非完成页）
  // 注意：这里用全局 consumedIds 判断"今日是否复习过"，而非 consumedInInitial
  //       因为 initialTotal===0 时 consumedInInitial 也必然为 0，无法区分两种情况
  const hasTodayLogs = !dryRun && consumedIds.size > 0;

  // 当 initialTotal===0 但今日已有 logs 时，强制 done=true，显示完成页
  const effectiveDone = done || (total === 0 && hasTodayLogs);

  // 完成回调
  useEffect(() => {
    if (effectiveDone) {
      onComplete?.({ ...stats, total });
    }
  }, [effectiveDone, stats, total, onComplete]);

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
    // - 首次复习的词（来自 remaining）：日志写入后 consumedInInitial 自动更新，remaining 缩减
    // - 重问的词（来自 reaskQueue）：需要手动管理 reaskQueue
    // 判断 current 是否来自 reaskQueue：直接检查 reaskQueue 中是否包含该词
    // （不再用 consumedIds.has 判断，因为 consumedIds 可能包含已不在 initialWords 中的历史词）
    const isFromReask = reaskQueue.some((w) => w.id === current.id);

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

  /** 标记当前词为已掌握：写一条 correct 日志（计入统计）+ markMastered + 推进队列
   *  复用 handle(true) 的队列推进逻辑，额外调用 markMastered 更新单词状态 */
  const handleMaster = () => {
    if (!current) return;
    if (!dryRun) {
      reviewWord(current.id, true, mode);
      markMastered(current.id);
    }
    handle(true);
  };

  const restart = () => {
    setRestarted(true);
    setRestartedStats({ correct: 0, wrong: 0 });
    setRestartedConsumed(0);
    setReaskQueue([]);
    setRevealed(false);
  };

  if (total === 0 && !hasTodayLogs) {
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
  if (effectiveDone || !current) {
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

        <div className="grid grid-cols-3 gap-3 rounded-md border border-ink/15 bg-paper-card p-4 hover:shadow-paper-hover md:gap-6 md:p-6">
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

  // 计算进度条位置（基于已消费数）
  // 用 consumedInInitial.size 而非 consumedIds.size，确保只统计当前 initialWords 中的已消费词
  const consumedCount = restarted ? restartedConsumed : (dryRun ? 0 : consumedInInitial.size);

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
        <div className="relative rounded-md border border-ink/15 bg-paper-card p-5 text-center hover:shadow-paper-hover md:p-10">
          {/* 右上角：标记已掌握按钮（独立位置避免与认识/不认识误触） */}
          {!dryRun && (
            <button
              onClick={handleMaster}
              className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-ink/20 bg-paper px-2.5 py-1 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-green hover:bg-accent-green hover:text-paper"
              title="标记为已掌握，不再出现在复习队列"
            >
              <Bookmark className="h-3 w-3" strokeWidth={1.5} />
              标记掌握
            </button>
          )}
          <div className="eyebrow mb-4">Self-Check</div>
          <h3 className="font-serif text-3xl font-medium tracking-word text-ink md:text-5xl">
            {liveCurrent?.word}
          </h3>
          {liveCurrent?.phonetic && (
            <div className="mt-2 font-mono text-sm text-ink-light">
              {liveCurrent.phonetic}
            </div>
          )}
          <div className="mt-2 font-mono text-sm italic text-accent-gold">
            {liveCurrent?.pos}
          </div>
          {revealed && (
            <div className="mt-3 flex justify-center">
              <SpeakButton text={liveCurrent?.word ?? ""} size="md" />
            </div>
          )}

          <div className="my-5 border-t border-dashed border-ink/15 md:my-8" />

          {revealed ? (
            <div className="animate-ink-bloom">
              <p className="font-body text-xl text-ink-soft md:text-2xl">
                {liveCurrent?.meaning}
              </p>
              {liveCurrent?.note && (
                <div
                  className={cn(
                    "mt-4 rounded-md border border-accent-gold/30 bg-accent-gold/5 px-4 py-3 text-left",
                    onRequestNote && "cursor-pointer transition-colors hover:bg-accent-gold/10",
                  )}
                  onClick={onRequestNote && liveCurrent ? () => onRequestNote(liveCurrent) : undefined}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                      Note · 笔记
                    </span>
                    {onRequestNote && (
                      <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                        点击编辑
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm leading-relaxed text-ink-muted whitespace-pre-wrap line-clamp-7">
                    {liveCurrent.note}
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

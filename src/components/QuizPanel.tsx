import { useState } from "react";
import { Check, X, Loader2, Award, RotateCcw } from "lucide-react";
import type { QuizQuestion } from "@/lib/deepseek";
import { gradeAnswer } from "@/lib/deepseek";
import { cn } from "@/lib/utils";

interface QuizPanelProps {
  questions: QuizQuestion[];
  /** 已有的作答记录（从归档恢复时传入） */
  initialAttempt?: {
    answers: Record<string, string>;
    results: Record<string, boolean>;
    score: number;
    correctCount: number;
    totalCount: number;
  } | null;
  /** 作答完成回调，用于持久化 */
  onAttempt?: (attempt: {
    answers: Record<string, string>;
    results: Record<string, boolean>;
    score: number;
    correctCount: number;
    totalCount: number;
  }) => void;
}

type Status = "answering" | "graded";

export default function QuizPanel({
  questions,
  initialAttempt,
  onAttempt,
}: QuizPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(
    initialAttempt?.answers || {},
  );
  const [status, setStatus] = useState<Status>(
    initialAttempt ? "graded" : "answering",
  );
  const [results, setResults] = useState<Record<string, boolean>>(
    initialAttempt?.results || {},
  );

  const total = questions.length;
  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const correctCount = Object.values(results).filter(Boolean).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const setAnswer = (qid: string, val: string) => {
    if (status === "graded") return; // 已批改不可再改
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const handleGrade = () => {
    const newResults: Record<string, boolean> = {};
    for (const q of questions) {
      const { correct } = gradeAnswer(q, answers[q.id] || "");
      newResults[q.id] = correct;
    }
    setResults(newResults);
    setStatus("graded");
    const cc = Object.values(newResults).filter(Boolean).length;
    onAttempt?.({
      answers,
      results: newResults,
      score: total > 0 ? Math.round((cc / total) * 100) : 0,
      correctCount: cc,
      totalCount: total,
    });
  };

  const handleRetry = () => {
    setAnswers({});
    setResults({});
    setStatus("answering");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 题目头部 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Quiz · 阅读理解
          </span>
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            <span className="text-ink tabular-nums">{answered}</span>
            {" "}/{" "}
            <span className="text-ink tabular-nums">{total}</span>
            <span className="ml-1">已答</span>
          </span>
        </div>
        {status === "graded" ? (
          <button onClick={handleRetry} className="btn-ghost">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            重新作答
          </button>
        ) : (
          <button
            onClick={handleGrade}
            disabled={answered === 0}
            className="btn-gold disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            提交批改
          </button>
        )}
      </div>

      {/* 题目列表 */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            userAnswer={answers[q.id] || ""}
            result={results[q.id]}
            graded={status === "graded"}
            onAnswer={(val) => setAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* 批改结果汇总 */}
      {status === "graded" && (
        <div className="rounded-md border border-ink/15 bg-paper-card p-4 shadow-paper animate-fade-in md:p-6">
          <div className="flex items-center justify-center gap-4 md:gap-6">
            <div className="text-center">
              <Award
                className={cn(
                  "mx-auto mb-2 h-8 w-8 md:h-10 md:w-10",
                  score >= 80
                    ? "text-accent-green"
                    : score >= 50
                      ? "text-accent-gold"
                      : "text-accent-red",
                )}
                strokeWidth={1.5}
              />
              <div className="font-display text-3xl font-medium text-ink md:text-4xl">
                {score}
                <span className="text-lg text-ink-light md:text-xl">分</span>
              </div>
              <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
                Score
              </div>
            </div>
            <div className="h-12 w-px bg-ink/15 md:h-16" />
            <div className="text-center">
              <div className="font-display text-3xl font-medium text-accent-green md:text-4xl">
                {correctCount}
                <span className="text-lg text-ink-light md:text-xl">/{total}</span>
              </div>
              <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
                Correct
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ 单题卡片 ============ */
function QuestionCard({
  question,
  index,
  userAnswer,
  result,
  graded,
  onAnswer,
}: {
  question: QuizQuestion;
  index: number;
  userAnswer: string;
  result?: boolean;
  graded: boolean;
  onAnswer: (val: string) => void;
}) {
  const isFill = question.type === "fill_blank";

  return (
    <div
      className={cn(
        "rounded-md border p-3 transition-colors md:p-5",
        graded
          ? result
            ? "border-accent-green/40 bg-accent-green/5"
            : "border-accent-red/40 bg-accent-red/5"
          : "border-ink/15 bg-paper-card",
      )}
    >
      {/* 题号 + 类型 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
          Q{index + 1}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-mono text-2xs uppercase tracking-editorial",
            isFill
              ? "bg-accent-gold/10 text-accent-gold"
              : "bg-accent-red/10 text-accent-red",
          )}
        >
          {isFill ? "填空" : "选择"}
        </span>
        {graded && (
          <span className="ml-auto">
            {result ? (
              <Check className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
            ) : (
              <X className="h-4 w-4 text-accent-red" strokeWidth={2.5} />
            )}
          </span>
        )}
      </div>

      {/* 题干 */}
      <p className="mb-3 font-body text-base text-ink">{question.stem}</p>

      {/* 填空题：显示含空位的原句 + 输入框 */}
      {isFill && question.sentence && (
        <p className="mb-3 font-serif text-base leading-relaxed text-ink-soft">
          {renderFillSentence(question.sentence, userAnswer, graded)}
        </p>
      )}

      {/* 作答区 */}
      {isFill ? (
        <input
          value={userAnswer}
          onChange={(e) => onAnswer(e.target.value)}
          disabled={graded}
          placeholder="输入单词..."
          className={cn(
            "input-paper font-serif",
            graded && result && "border-accent-green/40 text-accent-green",
            graded && !result && "border-accent-red/40 text-accent-red",
          )}
        />
      ) : (
        <div className="space-y-2">
          {question.options?.map((opt) => {
            const selected = userAnswer === opt.key;
            const isCorrect = graded && question.answer === opt.key;
            const isWrong = graded && selected && !isCorrect;
            return (
              <button
                key={opt.key}
                onClick={() => onAnswer(opt.key)}
                disabled={graded}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-4 py-2.5 text-left transition-all",
                  !graded && selected && "border-accent-gold/50 bg-accent-gold/10",
                  !graded && !selected && "border-ink/15 hover:border-ink/30",
                  isCorrect && "border-accent-green/50 bg-accent-green/10",
                  isWrong && "border-accent-red/50 bg-accent-red/10",
                  graded && !isCorrect && !isWrong && "border-ink/10 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border font-mono text-2xs",
                    selected && !graded && "border-accent-gold bg-accent-gold text-paper",
                    isCorrect && "border-accent-green bg-accent-green text-paper",
                    isWrong && "border-accent-red bg-accent-red text-paper",
                    !selected && !graded && "border-ink/20 text-ink-light",
                    graded && !isCorrect && !isWrong && "border-ink/20 text-ink-light",
                  )}
                >
                  {opt.key}
                </span>
                <span className="font-body text-sm text-ink-soft">{opt.text}</span>
                {isCorrect && (
                  <Check className="ml-auto h-4 w-4 text-accent-green" strokeWidth={2.5} />
                )}
                {isWrong && (
                  <X className="ml-auto h-4 w-4 text-accent-red" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 批改后显示解析 */}
      {graded && (
        <div
          className={cn(
            "mt-3 rounded-md border px-3 py-2 font-body text-xs",
            result
              ? "border-accent-green/20 bg-accent-green/5 text-accent-green"
              : "border-accent-red/20 bg-accent-red/5 text-accent-red",
          )}
        >
          {gradeAnswer(question, userAnswer).explanation}
        </div>
      )}
    </div>
  );
}

/** 渲染填空题原句：将 ___ 替换为用户输入或正确答案 */
function renderFillSentence(
  sentence: string,
  userAnswer: string,
  graded: boolean,
) {
  const parts = sentence.split(/_{2,}/);
  if (parts.length < 2) return sentence;

  const blankContent = graded
    ? userAnswer.trim() || "（未作答）"
    : userAnswer || "______";

  return (
    <>
      {parts[0]}
      <span
        className={cn(
          "mx-1 inline-block rounded px-1.5 py-0.5 font-mono text-sm",
          graded
            ? userAnswer.trim()
              ? "bg-accent-gold/20 text-ink"
              : "bg-accent-red/10 text-accent-red"
            : "bg-accent-gold/10 text-ink-soft",
        )}
      >
        {blankContent}
      </span>
      {parts.slice(1).join(" ")}
    </>
  );
}

/** 题目加载占位组件 */
export function QuizLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <Loader2
        className="mb-3 h-8 w-8 animate-spin text-accent-gold"
        strokeWidth={1.5}
      />
      <div className="eyebrow mb-1 text-accent-gold">Generating Quiz</div>
      <p className="font-body text-sm text-ink-light">
        AI 正在生成阅读理解题目，请稍候...
      </p>
    </div>
  );
}

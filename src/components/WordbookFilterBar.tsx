/**
 * 生词本共用筛选工具栏
 *
 * 在「单词列表 / 自我检测 / 随机抽查 / 听写测试」四个二级页面之间共用，
 * 切换页面时位置一致，视觉无跳变。各页面通过 props 控制显示哪些筛选项。
 *
 * 筛选项：
 * - 记忆阶段（多选）：0-6 + 已掌握
 * - 词性（多选）：n./v./adj./...
 * - 排除已掌握（开关）
 *
 * 自我检测页面无筛选项，由 selfCheckPlaceholder 提供占位内容。
 */
import { useState, useRef, useEffect } from "react";
import { Filter, Check, X } from "lucide-react";
import { COMMON_POS } from "@/lib/pos";
import { STAGE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

export interface FilterState {
  /** 选中的记忆阶段（0-6 对应艾宾浩斯节点，-1 表示已掌握）。null 表示不筛选 */
  stages: number[] | null;
  /** 选中的词性列表。null 表示不筛选 */
  pos: string[] | null;
  /** 排除已掌握的单词（仅 random/dictation 有效） */
  excludeMastered: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  stages: null,
  pos: null,
  excludeMastered: false,
};

interface WordbookFilterBarProps {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  /** 显示哪些筛选项 */
  showStage?: boolean;
  showPos?: boolean;
  showExcludeMastered?: boolean;
  /** 自我检测页面的占位内容 */
  selfCheckPlaceholder?: React.ReactNode;
  /** 当前页面 mode，用于决定是否显示任何筛选 */
  hasFilter?: boolean;
}

/** 所有可选的记忆阶段（含已掌握） */
const ALL_STAGES: Array<{ value: number; label: string }> = [
  { value: 0, label: STAGE_LABELS[0] },
  { value: 1, label: STAGE_LABELS[1] },
  { value: 2, label: STAGE_LABELS[2] },
  { value: 3, label: STAGE_LABELS[3] },
  { value: 4, label: STAGE_LABELS[4] },
  { value: 5, label: STAGE_LABELS[5] },
  { value: 6, label: STAGE_LABELS[6] },
  { value: -1, label: "已掌握" },
];

export default function WordbookFilterBar({
  filter,
  onChange,
  showStage = false,
  showPos = false,
  showExcludeMastered = false,
  selfCheckPlaceholder,
  hasFilter = true,
}: WordbookFilterBarProps) {
  // 如果没有任何筛选项且没有占位内容，则不渲染工具栏
  if (!hasFilter && !selfCheckPlaceholder) return null;
  // 自我检测页面：只渲染占位内容
  if (selfCheckPlaceholder && !showStage && !showPos && !showExcludeMastered) {
    return <div className="flex flex-wrap items-center gap-2">{selfCheckPlaceholder}</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showStage && (
        <MultiSelectDropdown
          label="记忆阶段"
          options={ALL_STAGES.map((s) => ({ value: String(s.value), label: s.label }))}
          selected={(filter.stages ?? []).map(String)}
          onChange={(next) => {
            const nums = next.map(Number);
            onChange({ ...filter, stages: nums.length > 0 ? nums : null });
          }}
        />
      )}
      {showPos && (
        <MultiSelectDropdown
          label="词性"
          options={COMMON_POS.map((p) => ({ value: p, label: p }))}
          selected={filter.pos ?? []}
          onChange={(next) => {
            onChange({ ...filter, pos: next.length > 0 ? next : null });
          }}
        />
      )}
      {showExcludeMastered && (
        <button
          onClick={() => onChange({ ...filter, excludeMastered: !filter.excludeMastered })}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-colors font-mono text-2xs uppercase tracking-editorial",
            filter.excludeMastered
              ? "border-ink bg-ink text-paper"
              : "border-ink/20 text-ink-light hover:border-ink hover:text-ink",
          )}
        >
          <Filter className="h-3 w-3" strokeWidth={1.5} />
          排除已掌握
          {filter.excludeMastered && <Check className="h-3 w-3" strokeWidth={2} />}
        </button>
      )}
      {/* 重置按钮：任一筛选激活时显示 */}
      {(filter.stages || filter.pos || filter.excludeMastered) && (
        <button
          onClick={() => onChange({ ...DEFAULT_FILTER })}
          className="flex items-center gap-1 rounded-md border border-ink/15 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-red/40 hover:text-accent-red"
          title="清除筛选"
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
          清除
        </button>
      )}
      {selfCheckPlaceholder}
    </div>
  );
}

/** 多选下拉组件 */
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const isActive = selected.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 transition-colors font-mono text-2xs uppercase tracking-editorial",
          isActive || open
            ? "border-ink bg-ink text-paper"
            : "border-ink/20 text-ink-light hover:border-ink hover:text-ink",
        )}
      >
        <Filter className="h-3 w-3" strokeWidth={1.5} />
        {label}
        {isActive && (
          <span className="ml-0.5 rounded bg-paper/20 px-1 tabular-nums">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 min-w-[10rem] overflow-y-auto rounded-md border border-ink/15 bg-paper-card p-1.5 shadow-deep animate-fade-in">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left transition-colors",
                  isSelected
                    ? "bg-ink/8 text-ink"
                    : "text-ink-light hover:bg-ink/5 hover:text-ink",
                )}
              >
                <span className="font-body text-sm">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

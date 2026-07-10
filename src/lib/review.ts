import { EBINGHAUS_INTERVALS } from "@/types";

/** 返回 YYYY-MM-DD 格式的本地日期 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 今日日期 key */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** 在某日期上加 days 天 */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 标记为生词时初始化复习计划 */
export function initReview(): { nextReview: string; reviewStage: number } {
  return {
    nextReview: addDays(todayKey(), EBINGHAUS_INTERVALS[0]),
    reviewStage: 0,
  };
}

/** 答对时推进阶段 */
export function advanceReview(stage: number): {
  nextReview: string;
  reviewStage: number;
} {
  const nextStage = Math.min(stage + 1, EBINGHAUS_INTERVALS.length - 1);
  return {
    nextReview: addDays(todayKey(), EBINGHAUS_INTERVALS[nextStage]),
    reviewStage: nextStage,
  };
}

/** 答错时重置复习节点 */
export function resetReview(): { nextReview: string; reviewStage: number } {
  return {
    nextReview: addDays(todayKey(), EBINGHAUS_INTERVALS[0]),
    reviewStage: 0,
  };
}

/** 是否到期需要复习 */
export function isDue(nextReview: string): boolean {
  return nextReview <= todayKey();
}

/** 生成唯一 id */
export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

/** 中文星期 */
const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export function weekdayCN(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return WEEKDAYS[d.getDay()];
}

/** 英文星期 */
const WEEKDAYS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function weekdayEN(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return WEEKDAYS_EN[d.getDay()];
}

/** 格式化日期数字为 "7 月 9 日" 形式（去除前导零，更易读） */
export function formatMD(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${parseInt(m, 10)} 月 ${parseInt(d, 10)} 日`;
}

/** 格式化日期为 "07/09" 形式 */
export function formatMDShort(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${m}/${d}`;
}

/** 解析多行 "word - pos. meaning" 文本为词条数组 */
export function parseBulkText(
  text: string,
  date: string,
): Array<Pick<Word, "word" | "pos" | "meaning" | "note">> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 支持 "word - pos. meaning" / "word pos. meaning" / "word meaning"
      let rest = line;
      let word = "";
      let pos = "";
      let meaning = "";

      // 提取 word
      const dashMatch = rest.match(/^([a-zA-Z][a-zA-Z'-]*)\s*[-—–]\s*(.+)$/);
      const spaceMatch = rest.match(/^([a-zA-Z][a-zA-Z'-]*)\s+(.+)$/);

      if (dashMatch) {
        word = dashMatch[1];
        rest = dashMatch[2];
      } else if (spaceMatch) {
        word = spaceMatch[1];
        rest = spaceMatch[2];
      } else {
        word = rest;
        return { word, pos: "", meaning: "", note: "" };
      }

      // 提取词性 pos.
      const posMatch = rest.match(/^([a-zA-Z]+\.)\s*(.+)$/);
      if (posMatch) {
        pos = posMatch[1];
        meaning = posMatch[2].trim();
      } else {
        meaning = rest.trim();
      }

      return { word, pos, meaning, note: "" };
    });
}

// 仅用于 parseBulkText 类型引用
import type { Word } from "@/types";

/** 打乱数组 */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

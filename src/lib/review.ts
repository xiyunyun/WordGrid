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

/**
 * 答错时重置复习节点
 *
 * 关键设计：nextReview 设为今天，保持"到期"状态。
 * 原因：答错的词需要被重问，不应该从"待复习"红点中移除。
 * 只有答对时才推进 nextReview 到下一个复习间隔，从红点中移除。
 */
export function resetReview(): { nextReview: string; reviewStage: number } {
  return {
    nextReview: todayKey(),
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

/**
 * 格式化笔记：将半角/全角分号转换为换行符
 *
 * 批量导入时，一行就是一个单词（回车=新单词），所以笔记内无法直接换行。
 * 用户可用分号分隔多段笔记，导入后自动转为多行显示。
 * 例：「反义词：unhappy；近似词：sad；例句：He felt unhappy.」
 *     → 「反义词：unhappy\n近似词：sad\n例句：He felt unhappy.」
 */
function formatNote(rawNote: string): string {
  // 无分号时直接返回（trim 已在调用处完成）
  if (!/[;；]/.test(rawNote)) return rawNote;
  // 按半角或全角分号拆分，trim 每段，过滤空段，用换行符连接
  return rawNote
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

/** 解析多行文本为词条数组
 *
 * 优先识别竖线分隔格式（AI 友好，5 字段）：
 *   word|phonetic|pos|meaning|note
 *   word|phonetic|pos|meaning
 *   word|pos|meaning
 *   word|meaning
 *
 * 笔记字段支持分号换行：note 中的 ; 或 ；会被转为换行符，
 * 这样用户可以在一行内写多段笔记（反义词；例句；派生词等）。
 * 如果 note 本身包含 |，会被重新拼回（note 是最后一个字段，允许含 |）。
 *
 * 向下兼容旧格式：
 *   "word - pos. meaning" / "word pos. meaning" / "word meaning"
 */
export function parseBulkText(
  text: string,
  date: string,
): Array<Pick<Word, "word" | "phonetic" | "pos" | "meaning" | "note">> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 竖线分隔格式
      if (line.includes("|")) {
        const parts = line.split("|").map((s) => s.trim());
        const word = parts[0] || "";
        if (!word) return { word: "", phonetic: "", pos: "", meaning: "", note: "" };

        // 根据字段数推断含义（向后兼容字段数变化）
        if (parts.length >= 5) {
          // word | phonetic | pos | meaning | note
          // note 是最后一个字段，允许包含 |（重新拼回）
          const noteRaw = parts.slice(4).join("|");
          return {
            word,
            phonetic: parts[1],
            pos: parts[2],
            meaning: parts[3],
            note: formatNote(noteRaw),
          };
        }
        if (parts.length === 4) {
          // word | phonetic | pos | meaning
          return {
            word,
            phonetic: parts[1],
            pos: parts[2],
            meaning: parts[3],
            note: "",
          };
        }
        if (parts.length === 3) {
          // word | pos | meaning
          return {
            word,
            phonetic: "",
            pos: parts[1],
            meaning: parts[2],
            note: "",
          };
        }
        // parts.length === 2: word | meaning
        return {
          word,
          phonetic: "",
          pos: "",
          meaning: parts[1],
          note: "",
        };
      }

      // 旧格式：支持 "word - pos. meaning" / "word pos. meaning" / "word meaning"
      let rest = line;
      let word = "";
      let pos = "";
      let meaning = "";

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
        return { word, phonetic: "", pos: "", meaning: "", note: "" };
      }

      const posMatch = rest.match(/^([a-zA-Z]+\.)\s*(.+)$/);
      if (posMatch) {
        pos = posMatch[1];
        meaning = posMatch[2].trim();
      } else {
        meaning = rest.trim();
      }

      return { word, phonetic: "", pos, meaning, note: "" };
    })
    .filter((item) => item.word);
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

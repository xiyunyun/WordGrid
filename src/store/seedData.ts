import type { Word } from "@/types";
import { addDays, todayKey, uid } from "@/lib/review";

// 示例数据 - 用于首次启动时填充
// 包含过去几天的单词，展示网格历史感与复习到期状态
export function buildSeedWords(): Word[] {
  const today = todayKey();
  const yesterday = addDays(today, -1);
  const dayBefore = addDays(today, -2);
  const threeDaysAgo = addDays(today, -3);
  const weekAgo = addDays(today, -7);

  const make = (
    word: string,
    pos: string,
    meaning: string,
    date: string,
    opts: Partial<Word> = {},
  ): Word => ({
    id: uid(),
    word,
    pos,
    meaning,
    note: "",
    date,
    isDifficult: false,
    isMastered: false,
    nextReview: "",
    reviewStage: -1,
    createdAt: Date.now() - Math.floor(Math.random() * 86400000),
    ...opts,
  });

  return [
    // 今天
    make("abandon", "v.", "放弃；遗弃", today, {
      isDifficult: true,
      nextReview: addDays(today, 1),
      reviewStage: 0,
    }),
    make("abstract", "adj.", "抽象的", today),
    make("academic", "adj.", "学术的；学院的", today, {
      isDifficult: true,
      nextReview: today,
      reviewStage: 1,
    }),
    make("acknowledge", "v.", "承认；答谢", today),
    make("adequate", "adj.", "足够的；胜任的", today),

    // 昨天
    make("benefit", "n.", "利益；好处", yesterday, {
      isDifficult: true,
      nextReview: today,
      reviewStage: 0,
    }),
    make("boundary", "n.", "边界；分界线", yesterday),
    make("capable", "adj.", "有能力的", yesterday, {
      isDifficult: true,
      nextReview: addDays(today, 1),
      reviewStage: 0,
    }),
    make("circumstance", "n.", "情况；环境", yesterday),

    // 前天
    make("deliberate", "adj.", "故意的；深思熟虑的", dayBefore, {
      isDifficult: true,
      nextReview: today,
      reviewStage: 2,
    }),
    make("demonstrate", "v.", "证明；展示", dayBefore),
    make("distinct", "adj.", "明显的；独特的", dayBefore, {
      isMastered: true,
    }),
    make("dominant", "adj.", "占优势的；主导的", dayBefore),

    // 三天前
    make("elaborate", "adj.", "精心制作的；详尽的", threeDaysAgo, {
      isDifficult: true,
      nextReview: today,
      reviewStage: 1,
    }),
    make("emerge", "v.", "出现；浮现", threeDaysAgo),
    make("enhance", "v.", "提高；增强", threeDaysAgo),
    make("essential", "adj.", "必要的；本质的", threeDaysAgo, {
      isDifficult: true,
      nextReview: addDays(today, 2),
      reviewStage: 2,
    }),

    // 一周前 - 已掌握的旧词
    make("fundamental", "adj.", "基本的；根本的", weekAgo, {
      isMastered: true,
    }),
    make("generate", "v.", "产生；生成", weekAgo, {
      isMastered: true,
    }),
    make("hypothesis", "n.", "假设；假说", weekAgo, {
      isDifficult: true,
      nextReview: today,
      reviewStage: 3,
    }),
    make("identify", "v.", "识别；确认", weekAgo, {
      isMastered: true,
    }),
  ];
}

// 核心数据类型定义

export interface Word {
  id: string;
  word: string;
  pos: string; // 词性 n. v. adj. adv. ...
  meaning: string; // 中文释义
  note?: string; // 个人笔记
  date: string; // 添加日期 YYYY-MM-DD
  isDifficult: boolean; // 是否生词
  isMastered: boolean; // 是否已掌握
  nextReview: string; // ISO 日期 YYYY-MM-DD
  reviewStage: number; // 0-6 对应艾宾浩斯节点
  createdAt: number;
}

export type ReviewMode = "self_check" | "dictation" | "random";

export interface ReviewLog {
  id: string;
  wordId: string;
  reviewedAt: number;
  correct: boolean;
  mode: ReviewMode;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  added: number;
  difficult: number;
  mastered: number;
  reviewed: number;
}

// 艾宾浩斯遗忘曲线复习间隔（天）
export const EBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30, 60];

// 复习阶段对应的描述
export const STAGE_LABELS = [
  "初识",
  "巩固",
  "熟悉",
  "稳定",
  "深植",
  "长期",
  "永久",
];

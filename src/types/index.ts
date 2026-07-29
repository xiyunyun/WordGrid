// 核心数据类型定义

export interface Word {
  id: string;
  word: string;
  phonetic?: string; // 音标，如 /həˈloʊ/
  pos: string; // 词性 n. v. adj. adv. ...
  meaning: string; // 中文释义
  note?: string; // 个人笔记
  date: string; // 添加日期 YYYY-MM-DD
  isDifficult: boolean; // 是否生词
  isMastered: boolean; // 是否已掌握
  nextReview: string; // ISO 日期 YYYY-MM-DD
  reviewStage: number; // 0-6 对应艾宾浩斯节点
  lastReviewDate?: string; // 最后一次推进复习阶段的日期 YYYY-MM-DD（同一天不重复推进）
  createdAt: number;
  masteredAt?: number; // 标记为已掌握的时间戳（毫秒），用于已掌握列表按时间排序
  updatedAt?: number; // 云端最后更新时间戳（毫秒），用于多设备 Last-Write-Wins 冲突解决
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

/**
 * 随笔 / 句子摘录
 * 用于记录喜欢的句子和翻译，类似便签贴纸，按日期分组
 */
export interface Essay {
  id: string;
  /** 正文（通常是英文原句） */
  content: string;
  /** 翻译（通常是中文翻译） */
  translation?: string;
  /** 添加日期 YYYY-MM-DD */
  date: string;
  /** 个人笔记（可选） */
  note?: string;
  createdAt: number;
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

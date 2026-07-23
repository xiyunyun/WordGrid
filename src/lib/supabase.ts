/**
 * Supabase 客户端 + 数据库类型定义
 *
 * 设计原则：
 * - 本地 localStorage 仍是 primary 数据源（离线优先，无网络也能用）
 * - Supabase 作为云同步层，后台静默推送/拉取
 * - 用 Realtime subscription 替代打开应用时的强制刷新
 * - 通过 updated_at 实现 Last-Write-Wins 乐观并发
 *
 * 表结构见 Supabase SQL Editor 中执行的 schema
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

/** 检查 Supabase 是否已配置 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** 单例客户端（未配置时返回 null，调用方需自行处理） */
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  // 开发环境（npm run dev / localhost）禁用云同步，避免测试数据污染生产环境
  // 生产环境（构建后的版本）正常启用
  // 如需在 localhost 测试云同步功能，可临时注释此判断
  if (import.meta.env.DEV) return null;
  if (!isSupabaseConfigured()) return null;
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false }, // 我们用自己的登录系统
      realtime: { params: { eventsPerSecond: 2 } },
    });
  }
  return _client;
}

/* ============ 数据库行类型（snake_case，对应 PG 表） ============ */

export interface WordRow {
  id: string;
  username: string;
  word: string;
  phonetic: string | null;
  pos: string | null;
  meaning: string;
  note: string | null;
  date: string;
  is_difficult: boolean;
  is_mastered: boolean;
  next_review: string | null;
  review_stage: number;
  last_review_date: string | null;
  created_at: number;
  updated_at: string;
}

export interface ReviewLogRow {
  id: string;
  username: string;
  word_id: string;
  reviewed_at: number;
  correct: boolean;
  mode: string;
  created_at: string;
}

export interface ArticleArchiveRow {
  id: string;
  username: string;
  created_at: number;
  date: string | null;
  article: string | null;
  words_snapshot: unknown;
  difficulty: string | null;
  questions: unknown;
  attempt: unknown;
  translation: string | null;
  server_created_at: string;
}

export interface DateNoteRow {
  username: string;
  date: string;
  note: string | null;
  updated_at: string;
}

export interface EssayRow {
  id: string;
  username: string;
  content: string;
  translation: string | null;
  date: string;
  note: string | null;
  created_at: number;
  updated_at: string;
}

/* ============ 本地类型 ↔ 数据库行 转换函数 ============ */

import type { Word, ReviewLog, ReviewMode, Essay } from "@/types";
import type { ArticleArchive } from "@/store/articleStore";

/** 当前登录用户名（作为 RLS 隔离键） */
import { getCurrentUser } from "@/lib/auth";

export function getCurrentUsername(): string | null {
  return getCurrentUser()?.username ?? null;
}

/** Word（本地）→ WordRow（DB） */
export function toWordRow(w: Word, username: string): WordRow {
  return {
    id: w.id,
    username,
    word: w.word,
    phonetic: w.phonetic || null,
    pos: w.pos || null,
    meaning: w.meaning,
    note: w.note || null,
    date: w.date,
    is_difficult: w.isDifficult,
    is_mastered: w.isMastered,
    next_review: w.nextReview || null,
    review_stage: w.reviewStage,
    last_review_date: w.lastReviewDate || null,
    created_at: w.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/** WordRow（DB）→ Word（本地） */
export function fromWordRow(r: WordRow): Word {
  return {
    id: r.id,
    word: r.word,
    phonetic: r.phonetic || "",
    pos: r.pos || "",
    meaning: r.meaning,
    note: r.note || "",
    date: r.date,
    isDifficult: r.is_difficult,
    isMastered: r.is_mastered,
    nextReview: r.next_review || "",
    reviewStage: r.review_stage,
    lastReviewDate: r.last_review_date || undefined,
    createdAt: r.created_at,
  };
}

/** ReviewLog（本地）→ ReviewLogRow（DB） */
export function toReviewLogRow(
  l: ReviewLog,
  username: string,
): ReviewLogRow {
  return {
    id: l.id,
    username,
    word_id: l.wordId,
    reviewed_at: l.reviewedAt,
    correct: l.correct,
    mode: l.mode,
    created_at: new Date().toISOString(),
  };
}

/** ReviewLogRow（DB）→ ReviewLog（本地） */
export function fromReviewLogRow(r: ReviewLogRow): ReviewLog {
  return {
    id: r.id,
    wordId: r.word_id,
    reviewedAt: r.reviewed_at,
    correct: r.correct,
    mode: r.mode as ReviewMode,
  };
}

/** ArticleArchive（本地）→ ArticleArchiveRow（DB） */
export function toArticleArchiveRow(
  a: ArticleArchive,
  username: string,
): ArticleArchiveRow {
  return {
    id: a.id,
    username,
    created_at: a.createdAt,
    date: a.date,
    article: a.article,
    words_snapshot: a.words,
    difficulty: a.difficulty,
    questions: a.questions,
    attempt: a.attempt ?? null,
    translation: a.translation ?? null,
    server_created_at: new Date().toISOString(),
  };
}

/** ArticleArchiveRow（DB）→ ArticleArchive（本地） */
export function fromArticleArchiveRow(r: ArticleArchiveRow): ArticleArchive {
  return {
    id: r.id,
    createdAt: r.created_at,
    date: r.date || "",
    article: r.article || "",
    words: (r.words_snapshot as ArticleArchive["words"]) || [],
    difficulty: (r.difficulty as ArticleArchive["difficulty"]) || "intermediate",
    questions: (r.questions as ArticleArchive["questions"]) || [],
    attempt: (r.attempt as ArticleArchive["attempt"]) || undefined,
    translation: (r.translation as ArticleArchive["translation"]) || undefined,
  };
}

/** Essay（本地）→ EssayRow（DB） */
export function toEssayRow(e: Essay, username: string): EssayRow {
  return {
    id: e.id,
    username,
    content: e.content,
    translation: e.translation || null,
    date: e.date,
    note: e.note || null,
    created_at: e.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/** EssayRow（DB）→ Essay（本地） */
export function fromEssayRow(r: EssayRow): Essay {
  return {
    id: r.id,
    content: r.content,
    translation: r.translation || undefined,
    date: r.date,
    note: r.note || undefined,
    createdAt: r.created_at,
  };
}

/**
 * Supabase 云同步适配层
 *
 * 核心能力：
 * 1. pullAll：一次性拉取当前用户的所有数据（初次加载 / 手动同步）
 * 2. pushWord / pushWordsBulk / pushReviewLog / pushArticle / pushDateNote：单条增量推送
 * 3. subscribeChanges：订阅 Realtime 变更，收到推送后回调
 * 4. migrateFromLocal：首次连接时把 localStorage 数据上传到 Supabase
 *
 * 设计要点：
 * - 上传走 upsert（INSERT or UPDATE on conflict id），自动处理新建/更新
 * - 下载走 select，按 username 过滤
 * - Realtime 订阅 INSERT/UPDATE/DELETE 事件，收到后转换成本地格式回调
 * - 不做强制刷新：收到变更后由 store 决定如何合并到 React state
 */

import { getSupabase, getCurrentUsername } from "@/lib/supabase";
import type {
  WordRow,
  ReviewLogRow,
  ArticleArchiveRow,
  DateNoteRow,
} from "@/lib/supabase";
import {
  toWordRow,
  fromWordRow,
  toReviewLogRow,
  fromReviewLogRow,
  toArticleArchiveRow,
  fromArticleArchiveRow,
} from "@/lib/supabase";
import type { Word, ReviewLog } from "@/types";
import type { ArticleArchive } from "@/store/articleStore";

export interface CloudSyncResult {
  success: boolean;
  error?: string;
  message?: string;
  /** 拉取到的数据条目数（仅 pullAll 返回） */
  count?: number;
  /** 是否跳过（无变化） */
  skipped?: boolean;
}

export interface PulledData {
  words: Word[];
  logs: ReviewLog[];
  articles: ArticleArchive[];
  dateNotes: Record<string, string>;
}

/* ============ 拉取 ============ */

/** 拉取当前用户的所有数据 */
export async function pullAll(): Promise<CloudSyncResult & { data?: PulledData }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  try {
    // 并行拉取四类数据
    const [wordsRes, logsRes, articlesRes, notesRes] = await Promise.all([
      (supabase.from("words") as any).select("*").eq("username", username),
      (supabase.from("review_logs") as any).select("*").eq("username", username),
      (supabase.from("article_archives") as any).select("*").eq("username", username),
      (supabase.from("date_notes") as any).select("*").eq("username", username),
    ]);

    const errors = [wordsRes.error, logsRes.error, articlesRes.error, notesRes.error].filter(
      Boolean,
    );
    if (errors.length > 0) {
      return { success: false, error: errors[0]?.message || "拉取失败" };
    }

    const words = (wordsRes.data as WordRow[]).map(fromWordRow);
    const logs = (logsRes.data as ReviewLogRow[]).map(fromReviewLogRow);
    const articles = (articlesRes.data as ArticleArchiveRow[]).map(
      fromArticleArchiveRow,
    );
    const dateNotes: Record<string, string> = {};
    for (const row of notesRes.data as DateNoteRow[]) {
      if (row.note) dateNotes[row.date] = row.note;
    }

    return {
      success: true,
      data: { words, logs, articles, dateNotes },
      count: words.length + logs.length + articles.length,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/* ============ 推送（增量） ============ */

/** 推送单个单词（upsert） */
export async function pushWord(word: Word): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const row = toWordRow(word, username);
  const { error } = await (supabase.from("words") as any).upsert(row, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 批量推送单词（一次请求，效率高） */
export async function pushWordsBulk(words: Word[]): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };
  if (words.length === 0) return { success: true, skipped: true };

  const rows = words.map((w) => toWordRow(w, username));
  const { error } = await (supabase.from("words") as any).upsert(rows, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true, count: rows.length };
}

/** 删除单词 */
export async function deleteWord(id: string): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const { error } = await (supabase.from("words") as any).delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 推送复习日志 */
export async function pushReviewLog(log: ReviewLog): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const row = toReviewLogRow(log, username);
  const { error } = await (supabase.from("review_logs") as any).upsert(row, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 删除复习日志（删除单词时联动） */
export async function deleteReviewLogsByWordId(
  wordId: string,
): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };

  const { error } = await (supabase.from("review_logs") as any).delete().eq("word_id", wordId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 推送文章归档 */
export async function pushArticle(
  article: ArticleArchive,
): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const row = toArticleArchiveRow(article, username);
  const { error } = await (supabase.from("article_archives") as any).upsert(row, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 删除文章归档 */
export async function deleteArticle(id: string): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };

  const { error } = await (supabase.from("article_archives") as any).delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 推送日期备注（upsert by username+date） */
export async function pushDateNote(
  date: string,
  note: string,
): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const row: DateNoteRow = {
    username,
    date,
    note: note || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await (supabase.from("date_notes") as any).upsert(row, { onConflict: "username,date" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** 删除日期备注 */
export async function deleteDateNote(date: string): Promise<CloudSyncResult> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const { error } = await (supabase.from("date_notes") as any).delete().eq("username", username).eq("date", date);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/* ============ Realtime 订阅 ============ */

export interface RealtimeCallbacks {
  onWordChange: (type: "INSERT" | "UPDATE" | "DELETE", word: Word) => void;
  onReviewLogChange: (
    type: "INSERT" | "UPDATE" | "DELETE",
    log: ReviewLog,
  ) => void;
  onArticleChange: (
    type: "INSERT" | "UPDATE" | "DELETE",
    article: ArticleArchive,
  ) => void;
  onDateNoteChange: (
    type: "INSERT" | "UPDATE" | "DELETE",
    date: string,
    note: string | null,
  ) => void;
}

/**
 * 订阅当前用户的数据变更
 * 返回 unsubscribe 函数（组件卸载时调用）
 */
export function subscribeChanges(callbacks: RealtimeCallbacks): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const username = getCurrentUsername();
  if (!username) return () => {};

  const channels: Array<{ unsubscribe: () => void }> = [];

  // 订阅 words 表
  const wordChannel = supabase
    .channel(`words:${username}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "words",
        filter: `username=eq.${username}`,
      },
      (payload) => {
        const type = payload.eventType;
        const row = payload.new as WordRow | null;
        const oldRow = payload.old as WordRow | null;
        if (type === "DELETE" && oldRow) {
          callbacks.onWordChange("DELETE", fromWordRow(oldRow));
        } else if (row) {
          callbacks.onWordChange(type as "INSERT" | "UPDATE", fromWordRow(row));
        }
      },
    )
    .subscribe();
  channels.push(wordChannel);

  // 订阅 review_logs 表
  const logChannel = supabase
    .channel(`logs:${username}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "review_logs",
        filter: `username=eq.${username}`,
      },
      (payload) => {
        const type = payload.eventType;
        const row = payload.new as ReviewLogRow | null;
        const oldRow = payload.old as ReviewLogRow | null;
        if (type === "DELETE" && oldRow) {
          callbacks.onReviewLogChange("DELETE", fromReviewLogRow(oldRow));
        } else if (row) {
          callbacks.onReviewLogChange(
            type as "INSERT" | "UPDATE",
            fromReviewLogRow(row),
          );
        }
      },
    )
    .subscribe();
  channels.push(logChannel);

  // 订阅 article_archives 表
  const articleChannel = supabase
    .channel(`articles:${username}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "article_archives",
        filter: `username=eq.${username}`,
      },
      (payload) => {
        const type = payload.eventType;
        const row = payload.new as ArticleArchiveRow | null;
        const oldRow = payload.old as ArticleArchiveRow | null;
        if (type === "DELETE" && oldRow) {
          callbacks.onArticleChange("DELETE", fromArticleArchiveRow(oldRow));
        } else if (row) {
          callbacks.onArticleChange(
            type as "INSERT" | "UPDATE",
            fromArticleArchiveRow(row),
          );
        }
      },
    )
    .subscribe();
  channels.push(articleChannel);

  // 订阅 date_notes 表
  const noteChannel = supabase
    .channel(`notes:${username}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "date_notes",
        filter: `username=eq.${username}`,
      },
      (payload) => {
        const type = payload.eventType;
        const row = payload.new as DateNoteRow | null;
        const oldRow = payload.old as DateNoteRow | null;
        if (type === "DELETE" && oldRow) {
          callbacks.onDateNoteChange("DELETE", oldRow.date, null);
        } else if (row) {
          callbacks.onDateNoteChange(
            type as "INSERT" | "UPDATE",
            row.date,
            row.note,
          );
        }
      },
    )
    .subscribe();
  channels.push(noteChannel);

  // 返回 unsubscribe 函数
  return () => {
    channels.forEach((c) => c.unsubscribe());
  };
}

/* ============ 首次迁移：本地数据 → Supabase ============ */

/** localStorage 标记：是否已完成本地 → Supabase 迁移 */
const MIGRATION_KEY = "wordgrid-supabase-migrated";

export function isMigratedToSupabase(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === "1";
}

export function setMigratedToSupabase() {
  localStorage.setItem(MIGRATION_KEY, "1");
}

/**
 * 首次迁移：把 localStorage 中的本地数据上传到 Supabase
 * - 已迁移过则跳过
 * - 本地无数据也跳过（新用户）
 * - 迁移成功后标记，避免重复执行
 */
export async function migrateFromLocal(
  localWords: Word[],
  localLogs: ReviewLog[],
  localArticles: ArticleArchive[],
  localDateNotes: Record<string, string>,
): Promise<CloudSyncResult> {
  if (isMigratedToSupabase()) {
    return { success: true, skipped: true, message: "已迁移过，跳过" };
  }

  const supabase = getSupabase();
  if (!supabase) return { success: false, error: "Supabase 未配置" };
  const username = getCurrentUsername();
  if (!username) return { success: false, error: "未登录" };

  const totalItems =
    localWords.length + localLogs.length + localArticles.length + Object.keys(localDateNotes).length;
  if (totalItems === 0) {
    setMigratedToSupabase();
    return { success: true, skipped: true, message: "本地无数据，无需迁移" };
  }

  try {
    // 批量上传 words
    if (localWords.length > 0) {
      const rows = localWords.map((w) => toWordRow(w, username));
      const { error } = await (supabase.from("words") as any).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`words: ${error.message}`);
    }

    // 批量上传 review_logs
    if (localLogs.length > 0) {
      const rows = localLogs.map((l) => toReviewLogRow(l, username));
      const { error } = await (supabase.from("review_logs") as any).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`logs: ${error.message}`);
    }

    // 批量上传 article_archives
    if (localArticles.length > 0) {
      const rows = localArticles.map((a) => toArticleArchiveRow(a, username));
      const { error } = await (supabase.from("article_archives") as any).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`articles: ${error.message}`);
    }

    // 批量上传 date_notes
    if (Object.keys(localDateNotes).length > 0) {
      const rows: DateNoteRow[] = Object.entries(localDateNotes).map(
        ([date, note]) => ({
          username,
          date,
          note,
          updated_at: new Date().toISOString(),
        }),
      );
      const { error } = await (supabase.from("date_notes") as any).upsert(rows, { onConflict: "username,date" });
      if (error) throw new Error(`notes: ${error.message}`);
    }

    setMigratedToSupabase();
    return {
      success: true,
      message: `已迁移 ${totalItems} 条数据到 Supabase`,
      count: totalItems,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "迁移失败" };
  }
}

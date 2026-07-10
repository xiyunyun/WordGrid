/**
 * 更新日志数据
 *
 * 【如何添加新版本日志】
 * 1. 在下方数组最前面（索引 0）添加新条目
 * 2. version 递增（如 "1.1.0" → "1.2.0"）
 * 3. date 填写发布日期
 * 4. items 填写本次更新的内容要点
 * 5. git commit + push 后用户即可看到弹窗提示
 *
 * 弹窗机制：用户关闭弹窗后会在 localStorage 记录已读版本号，
 * 下次版本号变化时才会再次弹出。
 */

export interface ChangelogEntry {
  /** 版本号，递增 */
  version: string;
  /** 发布日期 YYYY-MM-DD */
  date: string;
  /** 本次更新要点 */
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-07-10",
    items: [
      "添加了日志功能，完善了 API 调用性能",
    ],
  },
];

/** 当前最新版本号 */
export const LATEST_VERSION = CHANGELOG[0]?.version ?? "1.0.0";

/** localStorage key：记录用户已读的最新版本号 */
const READ_VERSION_KEY = "wordgrid-read-version";

/** 检查是否有未读更新 */
export function hasUnreadUpdate(): boolean {
  const readVersion = localStorage.getItem(READ_VERSION_KEY);
  return readVersion !== LATEST_VERSION;
}

/** 标记当前版本为已读 */
export function markUpdateRead(): void {
  localStorage.setItem(READ_VERSION_KEY, LATEST_VERSION);
}

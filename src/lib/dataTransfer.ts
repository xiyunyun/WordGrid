/**
 * 全量数据导入导出工具
 *
 * 导出范围：单词本、文章归档、随笔、种子标记（即用户产生的所有数据）
 * 不导出：登录状态（wordgrid-auth，属于会话信息）、TTS 音频缓存（IndexedDB，体积大且可自动重建）
 *
 * 导出格式：JSON 文件，包含版本号和导出时间，方便后续兼容性处理
 */

/** 导出数据的版本号，未来格式变更时升级 */
const EXPORT_VERSION = 1;

/** 需要导出的 localStorage key 列表 */
const EXPORT_KEYS = [
  "wordgrid-store", // 单词本 + 复习记录
  "wordgrid-article-archive", // 文章归档 + 题目 + 作答
  "wordgrid-essays", // 随笔摘录
  "wordgrid-date-notes", // 日期备注
  "wordgrid-seeded", // 种子数据标记
];

/** 导出文件结构 */
interface ExportBundle {
  /** 格式版本 */
  version: number;
  /** 导出时间 ISO 字符串 */
  exportedAt: string;
  /** 导出来源标识 */
  source: string;
  /** localStorage 数据 */
  data: Record<string, string>;
}

/** 导入结果 */
export interface ImportResult {
  success: boolean;
  error?: string;
  /** 导入的条目数 */
  importedKeys: number;
}

/**
 * 构建 导出 bundle 的 JSON 字符串
 *
 * 抽取为独立函数，供 exportAllData（下载）与 getDataStats（统计大小）共用，
 * 确保界面显示的数据大小与实际下载文件大小完全一致。
 */
function buildExportJson(): string {
  const data: Record<string, string> = {};

  for (const key of EXPORT_KEYS) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }

  const bundle: ExportBundle = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: "WordGrid",
    data,
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * 导出全部用户数据为 JSON 文件并触发下载
 */
export function exportAllData(): void {
  const json = buildExportJson();
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `wordgrid-backup-${date}.json`;

  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 文件导入数据
 *
 * 会覆盖当前同名的 localStorage key。
 * 导入后需刷新页面让 Zustand store 重新读取。
 */
export async function importAllData(file: File): Promise<ImportResult> {
  try {
    const text = await file.text();
    const bundle = JSON.parse(text) as ExportBundle;

    if (!bundle || typeof bundle !== "object") {
      return { success: false, error: "文件格式无效：不是有效的 JSON", importedKeys: 0 };
    }

    if (!bundle.data || typeof bundle.data !== "object") {
      return { success: false, error: "文件格式无效：缺少 data 字段", importedKeys: 0 };
    }

    // 版本检查（未来升级时在此处理迁移）
    if (bundle.version > EXPORT_VERSION) {
      return {
        success: false,
        error: `文件版本（v${bundle.version}）高于当前支持版本（v${EXPORT_VERSION}），请更新应用`,
        importedKeys: 0,
      };
    }

    let count = 0;
    for (const [key, value] of Object.entries(bundle.data)) {
      // 只导入已知 key，防止恶意数据
      if (EXPORT_KEYS.includes(key) && typeof value === "string") {
        localStorage.setItem(key, value);
        count++;
      }
    }

    if (count === 0) {
      return {
        success: false,
        error: "文件中没有可导入的有效数据",
        importedKeys: 0,
      };
    }

    return { success: true, importedKeys: count };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "导入失败：文件解析错误",
      importedKeys: 0,
    };
  }
}

/**
 * 获取当前数据的简要统计（用于显示在导出按钮旁）
 *
 * 数据大小按与导出文件完全相同的方式计算（buildExportJson 的 UTF-8 字节数），
 * 因此界面显示的大小与实际下载的文件大小一致。
 */
export function getDataStats(): {
  wordCount: number;
  articleCount: number;
  totalSizeKB: number;
} {
  let wordCount = 0;
  let articleCount = 0;

  try {
    const storeRaw = localStorage.getItem("wordgrid-store");
    if (storeRaw) {
      const parsed = JSON.parse(storeRaw);
      // Zustand persist 格式：{ state: { words: [...] }, version: N }
      const words = parsed?.state?.words;
      if (Array.isArray(words)) wordCount = words.length;
    }
  } catch {
    // ignore
  }

  try {
    const archiveRaw = localStorage.getItem("wordgrid-article-archive");
    if (archiveRaw) {
      const parsed = JSON.parse(archiveRaw);
      const archives = parsed?.state?.archives;
      if (Array.isArray(archives)) articleCount = archives.length;
    }
  } catch {
    // ignore
  }

  // 用与导出完全相同的 JSON 计算字节数，确保显示大小 = 下载大小
  const json = buildExportJson();
  const totalBytes = new TextEncoder().encode(json).length;

  return {
    wordCount,
    articleCount,
    totalSizeKB: Math.round(totalBytes / 1024),
  };
}

/**
 * 删除所有用户学习数据
 *
 * 清除范围：单词本、复习记录、文章归档、题目作答、随笔摘录、种子标记、TTS 音频缓存
 * 保留范围：登录状态（wordgrid-auth），避免删除后被迫重新登录
 */
export async function clearAllData(): Promise<void> {
  // 1. 清除 localStorage 中的用户数据（保留登录态）
  for (const key of EXPORT_KEYS) {
    localStorage.removeItem(key);
  }

  // 2. 清除 IndexedDB 中的 TTS 音频缓存
  try {
    if (typeof indexedDB !== "undefined") {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("wordgrid-tts");
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    }
  } catch {
    // ignore
  }
}


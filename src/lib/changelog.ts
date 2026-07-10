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
      "完善开发日志，补充历史版本功能记录",
      "修复版本号文字排版问题",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-07-10",
    items: [
      "新增开发日志功能，记录版本更新历史",
      "新增更新公告弹窗，新版本发布时自动通知用户",
      "关于页面新增开发日志区块",
    ],
  },
  {
    version: "0.9.1",
    date: "2026-07-10",
    items: [
      "修复 DeepSeek API 返回空内容问题（关闭 v4-flash 模型推理模式）",
      "优化 max_tokens 配置，避免 token 预算浪费",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-07-10",
    items: [
      "积木造文新增文章字数滑块（50-300字可控）",
      "新增入门难度级别，适合小学生/零基础学习者",
      "新增文章翻译功能（DeepSeek 翻译全文为中文）",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-07-10",
    items: [
      "手机端 UI 全面适配，支持竖屏显示",
      "新增底部导航栏，适配触控操作",
      "设备检测自动切换手机/桌面 UI 方案",
      "等比例缩放 UI 元素，提升手机端易读性",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-07-10",
    items: [
      "新增数据导出/导入功能，支持完整数据备份与恢复",
      "新增关于页面，包含软件介绍和作者信息",
      "登录状态改为永久有效（不再 7 天过期）",
      "新增清空测试数据功能",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-07-10",
    items: [
      "新增统计页面，学习数据可视化展示",
      "新增词频排行和复习进度图表",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-07-10",
    items: [
      "新增用户认证系统（用户名密码登录）",
      "SHA-256 密码哈希加密存储",
      "支持多用户管理",
      "GitHub Pages 部署上线，支持自定义域名",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-07-10",
    items: [
      "新增积木造文功能：基于选定单词 AI 生成英语文章",
      "新增文章归档系统，自动保存生成的文章和题目",
      "支持三种难度级别（初级/中级/高级）",
      "新增生成题目功能：填空题 + 选择题",
      "DeepSeek 自动阅卷评分",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-10",
    items: [
      "批量导入支持竖线分隔 5 字段格式（单词|音标|词性|词意|笔记）",
      "新增导出功能：支持 TXT / Markdown / CSV / Anki 四种格式",
      "三种导出内容范围（仅单词 / 单词+词意 / 单词+词意+笔记）",
      "音标字段支持，单词卡片布局改为 单词↓音标↓词意",
      "卡片框架放大，防止文字溢出",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-10",
    items: [
      "新增有道 TTS 语音发音功能",
      "IndexedDB 三级音频缓存（内存→IndexedDB→API），避免重复 API 调用",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-09",
    items: [
      "基础单词学习系统：每日网格展示、单词添加/编辑/删除",
      "艾宾浩斯遗忘曲线智能复习算法",
      "生词标记和掌握标记功能",
      "自我检测复习流程",
      "听写练习模式",
      "随机复习模式",
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

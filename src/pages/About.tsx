import { useState, useRef } from "react";
import {
  Download,
  Upload,
  Info,
  AlertTriangle,
  Check,
  Database,
  BookOpen,
  Heart,
  Loader2,
  Trash2,
  ScrollText,
} from "lucide-react";
import {
  exportAllData,
  importAllData,
  getDataStats,
  clearAllData,
} from "@/lib/dataTransfer";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { CHANGELOG } from "@/lib/changelog";

export default function About() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 删除数据：三阶段流程
  // 0 = 初始（显示按钮）
  // 1 = 第一次确认（显示警告 + 继续按钮）
  // 2 = 输入确认文字（需要输入"确定删除"）
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const stats = getDataStats();
  const cloudConfigured = isSupabaseConfigured();
  const currentUser = getCurrentUser();

  const handleExport = () => {
    setExporting(true);
    // 用 setTimeout 让 loading 状态显示出来
    setTimeout(() => {
      try {
        exportAllData();
        setExporting(false);
      } catch {
        setExporting(false);
      }
    }, 300);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importAllData(file);
      if (result.success) {
        setImportResult({
          success: true,
          message: `导入成功，共导入 ${result.importedKeys} 项数据。页面将在 2 秒后刷新以应用新数据...`,
        });
        // 2 秒后刷新页面让 Zustand 重新加载
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setImportResult({
          success: false,
          message: result.error || "导入失败",
        });
      }
    } catch {
      setImportResult({
        success: false,
        message: "导入异常，请检查文件是否正确",
      });
    } finally {
      setImporting(false);
      // 清空 input 以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteConfirm = () => {
    setDeleteStep(1);
  };

  const handleDeleteCancel = () => {
    setDeleteStep(0);
    setDeleteConfirmText("");
  };

  const handleDeleteProceed = () => {
    setDeleteStep(2);
    setDeleteConfirmText("");
  };

  const handleDeleteExecute = async () => {
    if (deleteConfirmText.trim() !== "确定删除") return;
    setDeleting(true);
    try {
      await clearAllData();
      // 刷新页面让 Zustand 重载空状态
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">About · 关于</div>
        <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
          关于 WordGrid
          <span className="ml-3 font-serif text-lg italic text-ink-light">
            词汇网格
          </span>
        </h2>
      </section>

      {/* 软件介绍 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 shadow-paper">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            About · 软件介绍
          </span>
        </div>
        <h3 className="mb-3 font-display text-xl font-medium text-ink">
          {/* ↓↓↓ 请在此处修改为你的软件介绍 ↓↓↓ */}
          WordGrid 词汇网格
        </h3>
        <p className="font-body text-sm leading-relaxed text-ink-soft">
          {/* ↓↓↓ 请在此处修改软件介绍文案 ↓↓↓ */}
          WordGrid 是一款基于艾宾浩斯遗忘曲线的英语词汇学习工具。
          它将每日学习的单词以网格形式呈现，配合智能复习计划，
          帮助你高效记忆。支持生词本管理、自我检测、听写练习、
          AI 文章生成、阅读理解题目以及阅卷纠错等功能。
          <br />
          <br />
          【更多功能锐意开发中，有好的建议随时联系开发者，QQ：1619947679，微信：r1619947679】
        </p>
      </section>

      {/* 作者介绍 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 shadow-paper">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Author · 作者介绍
          </span>
        </div>
        <h3 className="mb-3 font-display text-xl font-medium text-ink">
          {/* ↓↓↓ 请在此处修改为你的署名 ↓↓↓ */}
          【作者署名】
        </h3>
        <p className="font-body text-sm leading-relaxed text-ink-soft">
          {/* ↓↓↓ 请在此处修改作者介绍文案 ↓↓↓ */}
          这里是熙云，因为最近学习英语，觉得有些略显乏味，所以心血来潮制作了这个网页，本意是帮助自己更好的学习英语和单词记忆。
          <br />
          <br />
          但是本着互联网开源精神，我开源了这个网站，也希望这个简单的工具能帮助自己和大家更高效地学习英语词汇。
          <br />
          <br />
          软件完全免费，开源代码托管在 GitHub 上，欢迎大家提出建议和反馈。
        </p>
      </section>

      {/* 数据统计 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 shadow-paper">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Data · 当前数据概况
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="rounded-md border border-ink/10 bg-paper p-4 text-center">
            <div className="font-display text-xl md:text-3xl font-medium text-ink tabular-nums">
              {stats.wordCount}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              单词数
            </div>
          </div>
          <div className="rounded-md border border-ink/10 bg-paper p-4 text-center">
            <div className="font-display text-xl md:text-3xl font-medium text-ink tabular-nums">
              {stats.articleCount}
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              文章数
            </div>
          </div>
          <div className="rounded-md border border-ink/10 bg-paper p-4 text-center">
            <div className="font-display text-xl md:text-3xl font-medium text-ink tabular-nums">
              {stats.totalSizeKB}
              <span className="text-base text-ink-light"> KB</span>
            </div>
            <div className="mt-1 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              数据大小
            </div>
          </div>
        </div>
      </section>

      {/* 数据导入导出 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 shadow-paper">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Data Transfer · 数据备份与迁移
          </span>
        </div>

        {/* 定期保存提示 */}
        <div className="mb-5 flex items-start gap-3 rounded-md border border-accent-gold/40 bg-accent-gold/10 p-4">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-gold"
            strokeWidth={1.5}
          />
          <div>
            <div className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
              重要提示
            </div>
            <p className="mt-1 font-body text-sm leading-relaxed text-ink-soft">
              本应用的数据存储在浏览器本地（localStorage）。
              {cloudConfigured ? (
                <>
                  已配置云端同步，数据会<strong className="text-ink">自动同步</strong>到云端
                  （基于 Supabase 实时数据库，多设备修改自动同步，无需手动操作）。
                  仍建议<strong className="text-accent-red">定期导出备份</strong>以防意外。
                </>
              ) : (
                <>
                  清除浏览器缓存、重装系统或更换设备都会导致数据丢失。
                  请<strong className="text-accent-red">定期导出备份</strong>以防数据丢失。
                </>
              )}
            </p>
          </div>
        </div>

        {/* 导入导出按钮 */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary disabled:opacity-40"
          >
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                导出中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" strokeWidth={1.5} />
                导出数据
              </>
            )}
          </button>

          <button
            onClick={handleImportClick}
            disabled={importing}
            className="btn-ghost disabled:opacity-40"
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                导入中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                导入数据
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* 导入结果提示 */}
        {importResult && (
          <div
            className={
              "mt-4 flex items-start gap-3 rounded-md border p-4 animate-fade-in " +
              (importResult.success
                ? "border-accent-green/40 bg-accent-green/10"
                : "border-accent-red/40 bg-accent-red/10")
            }
          >
            {importResult.success ? (
              <Check
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-green"
                strokeWidth={1.5}
              />
            ) : (
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-red"
                strokeWidth={1.5}
              />
            )}
            <div>
              <div
                className={
                  "font-mono text-2xs uppercase tracking-editorial " +
                  (importResult.success ? "text-accent-green" : "text-accent-red")
                }
              >
                {importResult.success ? "导入成功" : "导入失败"}
              </div>
              <p className="mt-1 font-body text-sm text-ink-soft">
                {importResult.message}
              </p>
            </div>
          </div>
        )}

        {/* 补充说明 */}
        <div className="mt-4 space-y-2 border-t border-ink/10 pt-4">
          <p className="font-body text-xs text-ink-light">
            <strong className="text-ink-soft">导出说明：</strong>
            导出文件为 JSON 格式，包含全部单词、复习记录、文章归档、题目作答等数据。
            可分享给他人导入使用。
          </p>
          <p className="font-body text-xs text-ink-light">
            <strong className="text-ink-soft">导入说明：</strong>
            导入会<strong className="text-accent-red">覆盖</strong>当前同类型数据。
            导入后页面将自动刷新以应用新数据。语音缓存不会被导入（会在使用时自动重建）。
          </p>
          {cloudConfigured && currentUser && (
            <p className="font-body text-xs text-ink-light">
              <strong className="text-ink-soft">云同步状态：</strong>
              当前账号 <span className="font-mono text-ink-soft">{currentUser.username}</span>{" "}
              已启用 Supabase 实时云同步，所有修改会自动推送到云端，其他设备登录同一账号即可同步。
            </p>
          )}
        </div>
      </section>

      {/* 危险操作区：删除所有数据 */}
      <section className="rounded-md border border-accent-red/40 bg-accent-red/5 p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-accent-red" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
            Danger Zone · 危险操作
          </span>
        </div>

        {deleteStep === 0 && (
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <p className="font-body text-sm text-ink-soft">
              删除所有单词、复习记录、文章归档、题目作答等全部学习数据。
              此操作<strong className="text-accent-red">不可撤销</strong>，请务必先导出备份。
            </p>
            <button
              onClick={handleDeleteConfirm}
              className="flex flex-shrink-0 items-center gap-2 rounded-md border border-accent-red/40 bg-accent-red/10 px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-accent-red transition-colors hover:bg-accent-red hover:text-paper"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              删除所有数据
            </button>
          </div>
        )}

        {deleteStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 rounded-md border border-accent-red/40 bg-paper p-4">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-red"
                strokeWidth={1.5}
              />
              <div>
                <div className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                  第一次确认
                </div>
                <p className="mt-1 font-body text-sm leading-relaxed text-ink-soft">
                  你即将删除<strong className="text-accent-red">所有学习数据</strong>，
                  包括 {stats.wordCount} 个单词、{stats.articleCount} 篇文章归档及全部复习记录。
                  <br />
                  删除后<strong className="text-accent-red">无法恢复</strong>。
                  如果尚未备份，请先点击「取消」并导出数据。
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button onClick={handleDeleteCancel} className="btn-ghost">
                取消
              </button>
              <button
                onClick={handleDeleteProceed}
                className="flex items-center gap-2 rounded-md border border-accent-red bg-accent-red px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-paper transition-colors hover:bg-accent-red/90"
              >
                我已了解，继续
              </button>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 rounded-md border border-accent-red/40 bg-paper p-4">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-red"
                strokeWidth={1.5}
              />
              <div>
                <div className="font-mono text-2xs uppercase tracking-editorial text-accent-red">
                  最终确认
                </div>
                <p className="mt-1 font-body text-sm leading-relaxed text-ink-soft">
                  请在下方输入框中输入<strong className="text-accent-red">「确定删除」</strong>
                  四个字，然后点击「永久删除」按钮。输入完全匹配才会执行删除。
                </p>
              </div>
            </div>
            <div>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deleting}
                placeholder='在此输入"确定删除"'
                className="input-paper font-mono"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="btn-ghost disabled:opacity-40"
              >
                取消
              </button>
              <button
                onClick={handleDeleteExecute}
                disabled={deleting || deleteConfirmText.trim() !== "确定删除"}
                className="flex items-center gap-2 rounded-md border border-accent-red bg-accent-red px-4 py-2 font-mono text-2xs uppercase tracking-editorial text-paper transition-colors hover:bg-accent-red/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    永久删除
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 开发日志 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-4 md:p-6 shadow-paper">
        <div className="mb-4 flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Changelog · 开发日志
          </span>
        </div>
        <div className="space-y-4">
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              className="rounded-md border border-ink/10 bg-paper p-3 md:p-4"
            >
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-display text-base font-medium text-ink">
                  <span className="font-mono text-xs text-ink-light">v</span>
                  <span className="ml-0.5">{entry.version}</span>
                </span>
                <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                  {entry.date}
                </span>
              </div>
              <ul className="space-y-1.5">
                {entry.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent-gold" />
                    <span className="font-body text-sm leading-relaxed text-ink-soft">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 技术信息 */}
      <section className="rounded-md border border-ink/10 bg-paper-warm/40 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 text-ink-light" strokeWidth={1.5} />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            Tech Stack · 技术信息
          </span>
        </div>
        <p className="font-body text-xs leading-relaxed text-ink-light">
          {/* ↓↓↓ 可修改为实际技术栈信息 ↓↓↓ */}
          React 18 + TypeScript + Vite + Tailwind CSS + Zustand
          <br />
          语音合成：有道智云 TTS · 文章生成：DeepSeek API
          <br />
          数据存储：浏览器 localStorage · 云同步：Supabase 实时数据库 · 部署：GitHub Pages
        </p>
      </section>
    </div>
  );
}

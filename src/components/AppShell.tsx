import { NavLink, useLocation } from "react-router-dom";
import { Grid3x3, BookOpen, BarChart3, Blocks, Plus, LogOut, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWordStore } from "@/store/wordStore";
import { selectDueWords } from "@/store/wordStore";
import { formatMDShort, weekdayCN, todayKey } from "@/lib/review";
import SearchBar from "@/components/SearchBar";
import type { Word } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  onQuickAdd: () => void;
  onLogout?: () => void;
  /** 顶部搜索栏选中单词时触发（在 App.tsx 中打开搜索结果弹窗） */
  onPickWord?: (word: Word) => void;
}

const navItems = [
  { to: "/", label: "Grid", labelCN: "每日网格", icon: Grid3x3 },
  { to: "/wordbook", label: "Wordbook", labelCN: "生词本", icon: BookOpen },
  { to: "/blocks", label: "Blocks", labelCN: "积木造文", icon: Blocks },
  { to: "/stats", label: "Stats", labelCN: "统计", icon: BarChart3 },
  { to: "/about", label: "About", labelCN: "关于", icon: Info },
];

export default function AppShell({ children, onQuickAdd, onLogout, onPickWord }: AppShellProps) {
  const location = useLocation();
  const words = useWordStore((s) => s.words);
  const dueCount = selectDueWords(words).length;
  const today = todayKey();

  return (
    <div className="flex h-full min-h-screen flex-col bg-paper pt-[env(safe-area-inset-top)]">
      {/* 顶部导航 - 编辑杂志刊头 */}
      <header className="border-b border-ink/15 bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 py-3 md:px-6 md:py-4 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3 md:gap-4">
              <h1 className="font-display text-2xl font-semibold tracking-tightest text-ink md:text-3xl lg:text-4xl">
                WordGrid
              </h1>
              <span className="hidden font-mono text-2xs uppercase tracking-editorial text-ink-light sm:inline">
                词汇网格 · Vol.I
              </span>
            </div>

            <div className="flex items-center gap-3 md:gap-6">
              <div className="hidden text-right md:block">
                <div className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
                  {weekdayCN(today)}
                </div>
                <div className="font-display text-lg italic text-ink">
                  {formatMDShort(today)}
                </div>
              </div>
              <button onClick={onQuickAdd} className="btn-gold" aria-label="添加单词">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Add</span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="btn-ghost ml-1 md:ml-2"
                  aria-label="登出"
                  title="退出登录"
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* 全局搜索栏 - 桌面端与手机端均显示，置于 Logo 行下方 */}
          {onPickWord && (
            <div className="mt-3 max-w-2xl">
              <SearchBar onPickWord={onPickWord} />
            </div>
          )}
        </div>

        {/* 主导航标签栏 - 仅桌面端显示（md+） */}
        <nav className="mx-auto hidden max-w-[1400px] gap-0 px-6 lg:px-10 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-2 border-b-2 px-4 py-3 transition-all",
                  active
                    ? "border-ink text-ink"
                    : "border-transparent text-ink-light hover:border-ink/30 hover:text-ink",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span className="font-mono text-2xs uppercase tracking-editorial">
                  {item.label}
                </span>
                <span className="font-body text-sm">·</span>
                <span className="font-body text-sm">{item.labelCN}</span>
                {item.to === "/wordbook" && dueCount > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-red px-1.5 font-mono text-2xs text-paper">
                    {dueCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </header>

      {/* 主内容区 - 手机端减少 padding，底部留出导航栏空间 */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-5 pb-24 md:px-6 md:py-8 md:pb-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>

      {/* 页脚 - 仅桌面端显示 */}
      <footer className="hidden border-t border-ink/15 bg-paper/60 md:block">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-6 py-4 font-mono text-2xs uppercase tracking-editorial text-ink-light sm:flex-row sm:items-center lg:px-10">
          <span>WordGrid © 2026 · A Vocabulary Archive</span>
          <span>Ebbinghaus Review Engine · Local-First</span>
        </div>
      </footer>

      {/* 手机端底部导航栏 - fixed 固定在屏幕底部 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/15 bg-paper/95 backdrop-blur-sm md:hidden">
        <div className="flex items-stretch justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors",
                  active ? "text-ink" : "text-ink-light",
                )}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className="font-body text-[10px] leading-none">
                  {item.labelCN}
                </span>
                {item.to === "/wordbook" && dueCount > 0 && (
                  <span className="absolute right-1/4 top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-red px-1 font-mono text-[9px] text-paper">
                    {dueCount}
                  </span>
                )}
                {active && (
                  <span className="absolute inset-x-2 top-0 h-0.5 rounded-full bg-ink" />
                )}
              </NavLink>
            );
          })}
        </div>
        {/* iOS safe area support */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}

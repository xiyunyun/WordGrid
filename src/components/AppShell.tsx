import { NavLink, useLocation } from "react-router-dom";
import { Grid3x3, BookOpen, BarChart3, Blocks, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWordStore } from "@/store/wordStore";
import { selectDueWords } from "@/store/wordStore";
import { formatMDShort, weekdayCN, todayKey } from "@/lib/review";

interface AppShellProps {
  children: React.ReactNode;
  onQuickAdd: () => void;
  onLogout?: () => void;
}

const navItems = [
  { to: "/", label: "Grid", labelCN: "每日网格", icon: Grid3x3 },
  { to: "/wordbook", label: "Wordbook", labelCN: "生词本", icon: BookOpen },
  { to: "/blocks", label: "Blocks", labelCN: "积木造文", icon: Blocks },
  { to: "/stats", label: "Stats", labelCN: "统计", icon: BarChart3 },
];

export default function AppShell({ children, onQuickAdd, onLogout }: AppShellProps) {
  const location = useLocation();
  const words = useWordStore((s) => s.words);
  const dueCount = selectDueWords(words).length;
  const today = todayKey();

  return (
    <div className="flex h-full min-h-screen flex-col bg-paper">
      {/* 顶部导航 - 编辑杂志刊头 */}
      <header className="border-b border-ink/15 bg-paper/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 lg:px-10">
          <div className="flex items-baseline gap-4">
            <h1 className="font-display text-3xl font-semibold tracking-tightest text-ink lg:text-4xl">
              WordGrid
            </h1>
            <span className="hidden font-mono text-2xs uppercase tracking-editorial text-ink-light sm:inline">
              词汇网格 · Vol.I
            </span>
          </div>

          <div className="flex items-center gap-6">
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
                className="btn-ghost ml-2"
                aria-label="登出"
                title="退出登录"
              >
                <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {/* 主导航标签栏 */}
        <nav className="mx-auto flex max-w-[1400px] gap-0 px-6 lg:px-10">
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

      {/* 主内容区 */}
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-ink/15 bg-paper/60">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-2 px-6 py-4 font-mono text-2xs uppercase tracking-editorial text-ink-light sm:flex-row sm:items-center lg:px-10">
          <span>WordGrid © 2026 · A Vocabulary Archive</span>
          <span>Ebbinghaus Review Engine · Local-First</span>
        </div>
      </footer>
    </div>
  );
}

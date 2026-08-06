import { useState } from "react";
import {
  Lock,
  User,
  Loader2,
  AlertCircle,
  BookOpen,
  Sparkles,
  UserPlus,
  LogIn,
} from "lucide-react";
import { login, register, loginAsGuest } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

type Mode = "login" | "register";

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (!username.trim() || !password) {
        setError("请输入用户名和密码");
        return;
      }
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      if (password.length < 6) {
        setError("密码至少 6 位");
        return;
      }
    } else {
      if (!username.trim() || !password) return;
    }

    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(username, password)
          : await register(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || (mode === "login" ? "登录失败" : "注册失败"));
      }
    } catch {
      setError(mode === "login" ? "登录异常，请稍后重试" : "注册异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    loginAsGuest();
    onLoginSuccess();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-warm px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Logo / 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <BookOpen className="h-7 w-7 text-accent-gold" strokeWidth={1.5} />
            <span className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink">
              WordGrid
            </span>
          </div>
          <p className="font-serif text-sm italic text-ink-muted">
            词汇网格 · {mode === "login" ? "登录" : "注册"}
          </p>
        </div>

        {/* 模式切换 */}
        <div className="mb-5 flex rounded-md border border-ink/15 bg-paper-card p-1">
          <button
            onClick={() => switchMode("login")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2 font-mono text-2xs uppercase tracking-editorial transition-colors",
              mode === "login"
                ? "bg-ink text-paper"
                : "text-ink-light hover:text-ink",
            )}
          >
            <LogIn className="h-3.5 w-3.5" strokeWidth={1.5} />
            登录
          </button>
          <button
            onClick={() => switchMode("register")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2 font-mono text-2xs uppercase tracking-editorial transition-colors",
              mode === "register"
                ? "bg-ink text-paper"
                : "text-ink-light hover:text-ink",
            )}
          >
            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
            注册
          </button>
        </div>

        {/* 登录/注册卡片 */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-ink/15 bg-paper-card p-6 md:p-8 shadow-paper-always"
        >
          {/* 用户名 */}
          <div>
            <label className="eyebrow mb-2 block">Username · 用户名</label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light"
                strokeWidth={1.5}
              />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="输入用户名"
                className="input-paper pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* 密码 */}
          <div>
            <label className="eyebrow mb-2 block">
              Password · 密码{mode === "register" && "（至少 6 位）"}
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light"
                strokeWidth={1.5}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="输入密码"
                className="input-paper pl-10"
              />
            </div>
          </div>

          {/* 确认密码（仅注册） */}
          {mode === "register" && (
            <div className="animate-fade-in">
              <label className="eyebrow mb-2 block">Confirm · 确认密码</label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-light"
                  strokeWidth={1.5}
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  placeholder="再次输入密码"
                  className="input-paper pl-10"
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-accent-red/30 bg-accent-red/5 px-3 py-2 animate-fade-in">
              <AlertCircle
                className="h-4 w-4 flex-shrink-0 text-accent-red"
                strokeWidth={1.5}
              />
              <span className="font-body text-sm text-accent-red">{error}</span>
            </div>
          )}

          {/* 注册说明 */}
          {mode === "register" && (
            <div className="rounded-md border border-accent-gold/30 bg-accent-gold/5 px-3 py-2 animate-fade-in">
              <p className="font-body text-2xs leading-relaxed text-ink-soft">
                注册后默认可用单词本、复习等本地功能。
                语音朗读、AI 文章生成、云存档需登录后输入密钥解锁。
              </p>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                {mode === "login" ? "登录中..." : "注册中..."}
              </>
            ) : mode === "login" ? (
              "登录"
            ) : (
              "注册并登录"
            )}
          </button>
        </form>

        {/* 分隔线 */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/15" />
          <span className="font-mono text-2xs uppercase tracking-editorial text-ink-light">
            or
          </span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>

        {/* 游客登录 */}
        <button
          onClick={handleGuestLogin}
          disabled={loading}
          className="btn-ghost w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          游客登录
        </button>
        <p className="mt-3 text-center font-body text-2xs text-ink-light">
          游客模式仅可用本地功能，不含语音、AI、云存档
        </p>
      </div>
    </div>
  );
}

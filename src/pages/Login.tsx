import { useState } from "react";
import { Lock, User, Loader2, AlertCircle, BookOpen } from "lucide-react";
import { login } from "@/lib/auth";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError("");

    try {
      const result = await login(username, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || "登录失败");
      }
    } catch {
      setError("登录异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-warm px-4">
      <div className="w-full max-w-sm">
        {/* Logo / 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <BookOpen className="h-7 w-7 text-accent-gold" strokeWidth={1.5} />
            <span className="font-display text-3xl font-medium tracking-tightest text-ink">
              WordGrid
            </span>
          </div>
          <p className="font-serif text-sm italic text-ink-muted">
            词汇网格 · 登录
          </p>
        </div>

        {/* 登录卡片 */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-lg border border-ink/15 bg-paper-card p-8 shadow-paper"
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
            <label className="eyebrow mb-2 block">Password · 密码</label>
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

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-ink-light">
          需要账号请联系管理员
        </p>
      </div>
    </div>
  );
}

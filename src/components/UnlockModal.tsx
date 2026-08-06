import { useState } from "react";
import { X, Key, Loader2, AlertCircle, Check } from "lucide-react";
import { useUnlockStore } from "@/store/unlock";
import { isGuest } from "@/lib/auth";

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
  /** 游客点击解锁时触发（提示退出登录去注册） */
  onGuestAttempt?: () => void;
}

export default function UnlockModal({
  open,
  onClose,
  onGuestAttempt,
}: UnlockModalProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const unlock = useUnlockStore((s) => s.unlock);

  if (!open) return null;

  const guest = isGuest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guest) {
      onGuestAttempt?.();
      return;
    }
    if (!key.trim()) {
      setError("请输入密钥");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await unlock(key);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setKey("");
          setSuccess(false);
        }, 1200);
      } else {
        setError(result.error || "密钥错误");
      }
    } catch {
      setError("解锁异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setKey("");
    setError("");
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-ink/15 bg-paper-card shadow-deep-always animate-fade-in">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-ink/15 px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-accent-gold" strokeWidth={1.5} />
            <div>
              <div className="eyebrow">Unlock · 功能解锁</div>
              <h2 className="font-display text-lg font-medium text-ink">
                输入密钥解锁高级功能
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md border border-ink/20 p-2 text-ink transition-colors hover:bg-ink hover:text-paper"
            aria-label="关闭"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-4 py-4 md:px-6 md:py-5">
          {guest ? (
            /* 游客拦截：不可解锁 */
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-md border border-accent-gold/40 bg-accent-gold/10 p-4">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-gold"
                  strokeWidth={1.5}
                />
                <div>
                  <div className="font-mono text-2xs uppercase tracking-editorial text-accent-gold">
                    游客无法解锁
                  </div>
                  <p className="mt-1 font-body text-sm leading-relaxed text-ink-soft">
                    高级功能（语音朗读、AI 文章生成、云存档）仅对注册账号开放。
                    请退出游客模式并注册账号后，再输入密钥解锁。
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleClose();
                  onGuestAttempt?.();
                }}
                className="btn-primary w-full justify-center"
              >
                退出并注册账号
              </button>
            </div>
          ) : (
            /* 正常解锁表单 */
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="font-body text-sm text-ink-soft">
                输入管理员提供的密钥，解锁以下功能：
              </p>
              <ul className="space-y-1 font-body text-2xs text-ink-light">
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent-gold" />
                  语音朗读（TTS）
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent-gold" />
                  AI 文章生成（DeepSeek）
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-accent-gold" />
                  云存档同步（Supabase）
                </li>
              </ul>

              <div>
                <label className="eyebrow mb-2 block">Unlock Key · 密钥</label>
                <input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={loading || success}
                  placeholder="输入密钥"
                  className="input-paper font-mono"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-accent-red/30 bg-accent-red/5 px-3 py-2 animate-fade-in">
                  <AlertCircle
                    className="h-4 w-4 flex-shrink-0 text-accent-red"
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-sm text-accent-red">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-md border border-accent-green/40 bg-accent-green/10 px-3 py-2 animate-fade-in">
                  <Check
                    className="h-4 w-4 flex-shrink-0 text-accent-green"
                    strokeWidth={1.5}
                  />
                  <span className="font-body text-sm text-accent-green">
                    解锁成功，所有功能已开启
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || success || !key.trim()}
                className="btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    验证中...
                  </>
                ) : success ? (
                  "已解锁"
                ) : (
                  "解锁"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

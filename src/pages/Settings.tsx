import { useState } from "react";
import { Settings as SettingsIcon, Volume2, Clock, Play, Pause, Key, Check, Lock } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useUnlockStore } from "@/store/unlock";
import { speakWord } from "@/lib/tts";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import UnlockModal from "@/components/UnlockModal";

/** 将秒数格式化为 X小时Y分Z秒 */
function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}小时${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}

export default function Settings() {
  const ttsVolume = useSettingsStore((s) => s.ttsVolume);
  const setTtsVolume = useSettingsStore((s) => s.setTtsVolume);
  const trackStudyTime = useSettingsStore((s) => s.trackStudyTime);
  const setTrackStudyTime = useSettingsStore((s) => s.setTrackStudyTime);
  const totalStudySeconds = useSettingsStore((s) => s.totalStudySeconds);
  const pushToCloud = useSettingsStore((s) => s.pushToCloud);

  const unlocked = useUnlockStore((s) => s.unlocked);
  const isGuest = useUnlockStore((s) => s.isGuest);
  const currentUser = getCurrentUser();

  const [testing, setTesting] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  // 试听按钮
  const handleTest = async () => {
    setTesting(true);
    try {
      await speakWord("hello");
    } catch {
      // ignore
    } finally {
      setTesting(false);
    }
  };

  // 切换学习时长追踪
  const handleToggleTrack = (v: boolean) => {
    setTrackStudyTime(v);
    if (!v) {
      // 关闭时推送最后一次累计
      pushToCloud();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 头部 */}
      <section className="border-b border-ink/15 pb-5">
        <div className="eyebrow mb-1">Settings</div>
        <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tightest text-ink lg:text-4xl">
          设置
        </h2>
        <p className="mt-2 font-serif text-sm italic text-ink-muted">
          工欲善其事，必先利其器。
        </p>
      </section>

      {/* 功能解锁状态 */}
      <section
        className={cn(
          "rounded-md border p-5 md:p-8",
          unlocked
            ? "border-accent-green/30 bg-accent-green/5"
            : isGuest
              ? "border-ink/15 bg-paper-card"
              : "border-accent-gold/40 bg-accent-gold/5",
        )}
      >
        <div className="flex items-center gap-3 mb-4">
          {unlocked ? (
            <Check className="h-5 w-5 text-accent-green" strokeWidth={1.5} />
          ) : isGuest ? (
            <Lock className="h-5 w-5 text-ink-light" strokeWidth={1.5} />
          ) : (
            <Key className="h-5 w-5 text-accent-gold" strokeWidth={1.5} />
          )}
          <div>
            <div className="eyebrow text-ink-light">Unlock · 功能解锁</div>
            <h3 className="font-display text-lg font-medium text-ink">
              {unlocked ? "已解锁全部功能" : isGuest ? "游客模式" : "高级功能未解锁"}
            </h3>
          </div>
        </div>

        {unlocked ? (
          <p className="font-body text-sm text-ink-soft">
            当前账号 <span className="font-mono text-ink">{currentUser?.username}</span>{" "}
            已解锁语音朗读、AI 文章生成、云存档同步。
          </p>
        ) : isGuest ? (
          <div className="space-y-3">
            <p className="font-body text-sm text-ink-soft">
              游客模式仅可用单词本、复习等本地功能。语音朗读、AI 文章生成、云存档需注册账号并输入密钥解锁。
            </p>
            <p className="font-body text-2xs text-ink-light">
              请退出登录后在登录页注册账号。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-body text-sm text-ink-soft">
              当前账号 <span className="font-mono text-ink">{currentUser?.username}</span>{" "}
              尚未解锁高级功能。输入密钥后可解锁：
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
            <button
              onClick={() => setUnlockOpen(true)}
              className="btn-primary"
            >
              <Key className="h-4 w-4" strokeWidth={1.5} />
              输入密钥解锁
            </button>
          </div>
        )}
      </section>

      <UnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} />

      {/* 语音音量设置 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-5 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Volume2 className="h-5 w-5 text-accent-gold" strokeWidth={1.5} />
          <div>
            <div className="eyebrow text-ink-light">Audio</div>
            <h3 className="font-display text-lg font-medium text-ink">语音音量</h3>
          </div>
        </div>
        <p className="font-body text-sm text-ink-muted mb-4">
          调整单词朗读（TTS）的播放音量。试听效果请点击右侧按钮。
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={ttsVolume}
            onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
            className="flex-1 accent-accent-gold"
          />
          <span className="font-mono text-sm tabular-nums text-ink w-12 text-right">
            {Math.round(ttsVolume * 100)}%
          </span>
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn-ghost flex items-center gap-1.5"
          >
            {testing ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <Play className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
            试听
          </button>
        </div>
      </section>

      {/* 学习时长追踪 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-5 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-accent-gold" strokeWidth={1.5} />
          <div>
            <div className="eyebrow text-ink-light">Tracking</div>
            <h3 className="font-display text-lg font-medium text-ink">学习时长</h3>
          </div>
        </div>
        <p className="font-body text-sm text-ink-muted mb-4">
          开启后自动记录你在 WordGrid 中的活跃学习时长，跨设备云同步。60 秒内无操作视为暂停。
        </p>

        {/* 开关 */}
        <div className="flex items-center justify-between gap-4 py-3 border-y border-ink/10">
          <span className="font-body text-sm text-ink">启用学习时长追踪</span>
          <button
            onClick={() => handleToggleTrack(!trackStudyTime)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              trackStudyTime ? "bg-accent-green" : "bg-ink/20",
            )}
            role="switch"
            aria-checked={trackStudyTime}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform",
                trackStudyTime ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* 累计时长显示 */}
        {trackStudyTime && (
          <div className="mt-5 animate-fade-in">
            <div className="eyebrow mb-2 text-ink-light">累计学习时长</div>
            <div className="flex items-baseline gap-3">
              <div className="font-mono text-4xl font-medium tabular-nums text-ink md:text-5xl">
                {formatDuration(totalStudySeconds)}
              </div>
            </div>
            <p className="mt-2 font-mono text-2xs uppercase tracking-editorial text-ink-light">
              自动同步至云端 · 多设备累计
            </p>
          </div>
        )}
      </section>

      {/* 占位说明 */}
      <section className="rounded-md border border-dashed border-ink/15 p-5 text-center md:p-8">
        <SettingsIcon className="mx-auto mb-2 h-5 w-5 text-ink-light" strokeWidth={1.5} />
        <p className="font-body text-sm text-ink-light">
          更多设置项将陆续加入
        </p>
      </section>
    </div>
  );
}

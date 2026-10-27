import { useState } from "react";
import {
  Settings as SettingsIcon,
  Volume2,
  Clock,
  Play,
  Pause,
  Key,
  Check,
  Lock,
  Sparkles,
  KeyRound,
  Server,
  PowerOff,
  AlertTriangle,
} from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useUnlockStore } from "@/store/unlock";
import { speakWord } from "@/lib/tts";
import { getCurrentUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/access";
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

  // AI 与语音相关设置（订阅以保持 UI 响应）
  const voiceEnabledRaw = useSettingsStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useSettingsStore((s) => s.setVoiceEnabled);
  const deepseekKeyMode = useSettingsStore((s) => s.deepseekKeyMode);
  const deepseekCustomKey = useSettingsStore((s) => s.deepseekCustomKey);
  const useOfficialDeepseekKey = useSettingsStore((s) => s.useOfficialDeepseekKey);
  const useCustomDeepseekKey = useSettingsStore((s) => s.useCustomDeepseekKey);
  const disableDeepseek = useSettingsStore((s) => s.disableDeepseek);

  const admin = isAdminUser();

  // 语音开关的有效值：未显式设置时，管理员默认开启，其他用户默认关闭
  const voiceEnabled = voiceEnabledRaw === undefined ? admin : voiceEnabledRaw;

  // DeepSeek 当前状态文案
  const deepseekStatus: { label: string; tone: "on" | "off" | "warn" } = (() => {
    if (!unlocked) return { label: "未解锁", tone: "off" };
    if (deepseekKeyMode === "off") return { label: "已关闭", tone: "off" };
    if (deepseekKeyMode === "custom") {
      return deepseekCustomKey.trim()
        ? { label: "使用我的 API Key", tone: "on" }
        : { label: "Key 为空，未启用", tone: "warn" };
    }
    if (deepseekKeyMode === "official") {
      return { label: "使用官方 Key", tone: "warn" };
    }
    return admin
      ? { label: "使用官方 Key（默认）", tone: "warn" }
      : { label: "未启用", tone: "off" };
  })();

  // 自定义 Key 输入
  const [keyInput, setKeyInput] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSaveCustomKey = () => {
    if (!keyInput.trim()) {
      setKeyMsg({ ok: false, text: "请输入 DeepSeek API Key" });
      return;
    }
    useCustomDeepseekKey(keyInput.trim());
    setKeyInput("");
    setKeyMsg({ ok: true, text: "已启用你自己的 API Key，AI 功能已开启" });
  };

  const handleUseOfficial = () => {
    useOfficialDeepseekKey();
    setKeyMsg({ ok: true, text: "已切换为官方 Key（作者私人额度，可能不稳定或欠费）" });
  };

  const handleDisableAi = () => {
    disableDeepseek();
    setKeyMsg({ ok: true, text: "已关闭 AI 功能" });
  };

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

      {/* AI 与语音功能 */}
      <section className="rounded-md border border-ink/15 bg-paper-card p-5 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-accent-gold" strokeWidth={1.5} />
          <div>
            <div className="eyebrow text-ink-light">AI &amp; Voice</div>
            <h3 className="font-display text-lg font-medium text-ink">AI 与语音功能</h3>
          </div>
        </div>
        <p className="font-body text-sm text-ink-muted mb-4">
          语音朗读与 AI 文章生成默认关闭，开启或填入密钥后方可使用。
          非管理员账号建议填入自己的 DeepSeek API Key，避免占用作者的私人额度。
        </p>

        {/* 语音朗读开关 */}
        <div className="flex items-center justify-between gap-4 py-3 border-y border-ink/10">
          <div>
            <span className="font-body text-sm text-ink">启用语音朗读</span>
            <p className="mt-0.5 font-body text-2xs text-ink-light">
              开启后可使用单词发音与试听
              {!unlocked && "（需先解锁高级功能）"}
            </p>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            disabled={!unlocked}
            className={cn(
              "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors",
              voiceEnabled ? "bg-accent-green" : "bg-ink/20",
              !unlocked && "cursor-not-allowed opacity-40",
            )}
            role="switch"
            aria-checked={voiceEnabled}
          >
            <span
              className={cn(
                "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform",
                voiceEnabled ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>

        {/* DeepSeek AI */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="eyebrow text-ink-light">DeepSeek · AI 文章生成</div>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-2xs uppercase tracking-editorial",
                deepseekStatus.tone === "on"
                  ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                  : deepseekStatus.tone === "warn"
                    ? "border-accent-gold/40 bg-accent-gold/10 text-accent-gold"
                    : "border-ink/15 bg-ink/5 text-ink-light",
              )}
            >
              {deepseekStatus.label}
            </span>
          </div>

          {!unlocked ? (
            <p className="mt-3 font-body text-sm text-ink-light">
              需先解锁高级功能后才能使用 AI 文章生成。
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              {/* 自定义 Key */}
              <div>
                <label className="eyebrow mb-2 block">填入你的 API KEY</label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => {
                      setKeyInput(e.target.value);
                      setKeyMsg(null);
                    }}
                    placeholder="sk-xxxxxxxx（DeepSeek 开放平台获取）"
                    className="input-paper min-w-0 flex-1 font-mono"
                  />
                  <button
                    onClick={handleSaveCustomKey}
                    disabled={!keyInput.trim()}
                    className="btn-primary flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <KeyRound className="h-3.5 w-3.5" strokeWidth={1.5} />
                    解锁
                  </button>
                </div>
                <p className="mt-1.5 font-body text-2xs text-ink-light">
                  Key 仅保存在本机浏览器，不会上传云端。
                </p>
              </div>

              {/* 官方 Key */}
              <div className="rounded-md border border-accent-gold/30 bg-accent-gold/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-gold"
                    strokeWidth={1.5}
                  />
                  <div className="flex-1">
                    <p className="font-body text-2xs leading-relaxed text-ink-soft">
                      官方 Key 为作者私人额度，不稳定，大部分时候处于欠费状态，可能随时不可用。
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleUseOfficial}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial transition-colors",
                          deepseekKeyMode === "official" || (deepseekKeyMode === undefined && admin)
                            ? "border-accent-gold bg-accent-gold text-paper"
                            : "border-ink/20 text-ink-light hover:border-accent-gold/40 hover:text-accent-gold",
                        )}
                      >
                        <Server className="h-3.5 w-3.5" strokeWidth={1.5} />
                        选择官方key（额度是作者私人的，不稳定，大部分时候是欠费状态）
                      </button>
                      {deepseekStatus.tone !== "off" && (
                        <button
                          onClick={handleDisableAi}
                          className="flex items-center gap-1.5 rounded-md border border-ink/20 px-3 py-1.5 font-mono text-2xs uppercase tracking-editorial text-ink-light transition-colors hover:border-accent-red/40 hover:text-accent-red"
                        >
                          <PowerOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                          关闭 AI
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {keyMsg && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 animate-fade-in",
                    keyMsg.ok
                      ? "border-accent-green/40 bg-accent-green/10"
                      : "border-accent-red/30 bg-accent-red/5",
                  )}
                >
                  {keyMsg.ok ? (
                    <Check className="h-4 w-4 flex-shrink-0 text-accent-green" strokeWidth={1.5} />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-accent-red" strokeWidth={1.5} />
                  )}
                  <span
                    className={cn(
                      "font-body text-sm",
                      keyMsg.ok ? "text-accent-green" : "text-accent-red",
                    )}
                  >
                    {keyMsg.text}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

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

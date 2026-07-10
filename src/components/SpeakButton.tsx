import { useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { speak } from "@/lib/tts";
import { cn } from "@/lib/utils";

interface SpeakButtonProps {
  /** 待朗读文本（通常是单词） */
  text: string;
  /** 尺寸，与所在界面的其他图标按钮保持一致 */
  size?: "sm" | "md";
  className?: string;
}

/**
 * 语音播放按钮 - 调用有道智云 TTS 合成并播放
 * 点击后显示加载状态，播放完毕恢复
 */
export default function SpeakButton({
  text,
  size = "sm",
  className,
}: SpeakButtonProps) {
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    await speak(text);
    setLoading(false);
  };

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const padding = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={loading ? "正在合成语音..." : "播放发音"}
      className={cn(
        "rounded text-ink-light transition-colors hover:bg-accent-gold/10 hover:text-accent-gold disabled:opacity-50",
        padding,
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} strokeWidth={1.5} />
      ) : (
        <Volume2 className={iconSize} strokeWidth={1.5} />
      )}
    </button>
  );
}

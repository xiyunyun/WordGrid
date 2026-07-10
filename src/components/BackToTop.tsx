import { ArrowUp } from "lucide-react";
import { useScrollThreshold } from "@/hooks/useScrollThreshold";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  /** 滚动超过多少像素后显示按钮，默认 400 */
  threshold?: number;
}

/**
 * 返回顶部按钮 - 滚动超过阈值后淡入显示
 * 点击后以贝塞尔曲线平滑滚动到顶部
 */
export default function BackToTop({ threshold = 400 }: BackToTopProps) {
  const visible = useScrollThreshold(threshold);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // 浏览器原生贝塞尔平滑滚动
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border border-ink/20 bg-paper-card text-ink shadow-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-ink hover:bg-ink hover:text-paper hover:shadow-deep",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-label="返回顶部"
      title="返回顶部"
    >
      <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
    </button>
  );
}

import { useState, useEffect } from "react";

/**
 * 监听指定元素的滚动位置，返回是否滚动超过阈值
 * 用于浮动"返回顶部"按钮的显隐控制
 */
export function useScrollThreshold(threshold = 300): boolean {
  const [passed, setPassed] = useState(false);

  useEffect(() => {
    const handler = () => {
      setPassed(window.scrollY > threshold);
    };
    // 初始检测
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);

  return passed;
}

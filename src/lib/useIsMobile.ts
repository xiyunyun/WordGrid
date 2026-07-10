import { useState, useEffect } from "react";

/**
 * 响应式断点 Hook
 *
 * 检测当前视口宽度是否小于指定断点。
 * 默认断点 768px（Tailwind md），即手机竖屏通常 <768px。
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}

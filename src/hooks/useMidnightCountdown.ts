import { useState, useEffect } from "react";

/**
 * 倒计时到下一个自然日 0 点（即明天 00:00:00）
 * 返回剩余时间的 HH:MM:SS 格式字符串与剩余毫秒数
 */
export function useMidnightCountdown(): {
  text: string;
  msLeft: number;
} {
  const calc = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0); // 下一个 0 点
    const msLeft = tomorrow.getTime() - now.getTime();
    const totalSec = Math.max(0, Math.floor(msLeft / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const text = [h, m, s]
      .map((n) => n.toString().padStart(2, "0"))
      .join(":");
    return { text, msLeft };
  };

  const [state, setState] = useState(calc);

  useEffect(() => {
    const timer = setInterval(() => {
      setState(calc());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return state;
}

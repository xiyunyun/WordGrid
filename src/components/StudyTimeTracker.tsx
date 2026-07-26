import { useEffect, useRef } from "react";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * 学习时长追踪器
 *
 * 工作原理：
 * - 监听用户活动事件（mousemove/keydown/click/scroll/touchstart）
 * - 每次活动更新 lastActivityAt 时间戳
 * - 每 10 秒检查一次：若距上次活动不超过 60 秒（用户仍在活跃），则累加 10 秒到 totalStudySeconds
 * - 每 60 秒（6 次累计）尝试推送到云端
 * - 页台隐藏（visibilitychange）时暂停累计，重新可见时重置活动时间
 *
 * 精度：10 秒粒度，足够用于学习时长统计，避免频繁写入
 * 活动超时：60 秒无活动视为离开，不累计
 */
const TICK_INTERVAL = 10; // 秒
const ACTIVITY_TIMEOUT = 60; // 秒
const PUSH_INTERVAL = 60; // 秒（每 6 次 tick 推送一次）

export default function StudyTimeTracker() {
  const trackStudyTime = useSettingsStore((s) => s.trackStudyTime);
  const addStudySeconds = useSettingsStore((s) => s.addStudySeconds);
  const touchActivity = useSettingsStore((s) => s.touchActivity);
  const pushToCloud = useSettingsStore((s) => s.pushToCloud);
  const tickCountRef = useRef(0);

  useEffect(() => {
    if (!trackStudyTime) return;

    // 活动事件监听
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const onActivity = () => touchActivity();
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // 定时器：每 10 秒检查活动状态并累计
    const timer = window.setInterval(() => {
      const lastActivityAt = useSettingsStore.getState().lastActivityAt;
      const now = Date.now();
      const idleSeconds = (now - lastActivityAt) / 1000;

      // 60 秒内有活动 → 视为活跃学习，累计 10 秒
      if (idleSeconds < ACTIVITY_TIMEOUT) {
        addStudySeconds(TICK_INTERVAL);
      }

      // 每 60 秒推送一次
      tickCountRef.current += 1;
      if (tickCountRef.current >= PUSH_INTERVAL / TICK_INTERVAL) {
        tickCountRef.current = 0;
        pushToCloud();
      }
    }, TICK_INTERVAL * 1000);

    // 页面可见性变化：隐藏时暂停（下次 tick 不会累计），可见时重置活动时间
    const onVisibility = () => {
      if (!document.hidden) {
        touchActivity();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      // 卸载时推送最后一次
      pushToCloud();
    };
  }, [trackStudyTime, addStudySeconds, touchActivity, pushToCloud]);

  return null;
}

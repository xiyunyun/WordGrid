/**
 * 解锁状态 store
 *
 * 轻量响应式封装：auth.ts 的解锁状态存在 localStorage（非响应式），
 * 这里用一个极简 store 让 UI 能在解锁状态变化时自动重渲染。
 *
 * 设计：
 * - App 启动时调用 refresh() 从 localStorage 读取真实状态
 * - submitUnlockKey 成功后调用 refresh() 触发 UI 更新
 * - 登录/登出后也需调用 refresh()
 */
import { create } from "zustand";
import { isUnlocked, submitUnlockKey, getCurrentUser } from "@/lib/auth";

interface UnlockState {
  /** 当前是否已解锁高级功能（TTS + DeepSeek + 云存档） */
  unlocked: boolean;
  /** 是否为游客（游客无解锁入口） */
  isGuest: boolean;
  /** 是否已登录 */
  authed: boolean;
  /** 从 localStorage 刷新状态（登录/登出/解锁后调用） */
  refresh: () => void;
  /** 提交密钥解锁，成功后自动 refresh */
  unlock: (key: string) => Promise<{ success: boolean; error?: string }>;
}

export const useUnlockStore = create<UnlockState>((set) => ({
  unlocked: false,
  isGuest: false,
  authed: false,

  refresh: () => {
    const user = getCurrentUser();
    set({
      authed: !!user,
      isGuest: user?.isGuest ?? false,
      unlocked: isUnlocked(),
    });
  },

  unlock: async (key: string) => {
    const result = await submitUnlockKey(key);
    if (result.success) {
      const user = getCurrentUser();
      set({
        authed: !!user,
        isGuest: user?.isGuest ?? false,
        unlocked: isUnlocked(),
      });
    }
    return result;
  },
}));

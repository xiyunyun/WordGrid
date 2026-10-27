/**
 * 高级功能访问控制
 *
 * 统一解析「语音朗读」与「AI 文章生成」是否可用，以及实际应使用的 DeepSeek Key。
 *
 * 权限层级：
 *   1. 必须已解锁（密钥解锁 / 管理员默认解锁）—— 见 lib/auth.isUnlocked
 *   2. 语音：需用户在设置中开启 voiceEnabled（管理员默认开启，其他用户默认关闭）
 *   3. AI：需用户选择密钥来源 deepseekKeyMode
 *        - official = 使用作者私人 Key（不稳定，可能欠费）
 *        - custom   = 使用用户自己填写的 Key
 *        未选择时，管理员默认 official，其他用户默认不启用 AI
 *
 * 这样非管理员用户即便用密钥解锁了功能，语音与 AI 依旧默认关闭，需自行开启，
 * 避免消耗作者私人的语音/DeepSeek 额度。
 */
import { getCurrentUser, isUnlocked, AUTH_USERS } from "@/lib/auth";
import { useSettingsStore, type DeepseekKeyMode } from "@/store/settingsStore";

/** 作者私人的 DeepSeek Key（构建时注入） */
const OFFICIAL_DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as
  | string
  | undefined;

/** 当前登录用户是否为管理员（xiyun 等 AUTH_USERS 中的账号） */
export function isAdminUser(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return AUTH_USERS.some((u) => u.username === user.username);
}

/**
 * 语音朗读是否可用
 * 需同时满足：已解锁 + 用户开关已开启（未显式设置时管理员默认开，其他默认关）
 */
export function isVoiceEnabled(): boolean {
  if (!isUnlocked()) return false;
  const { voiceEnabled } = useSettingsStore.getState();
  if (voiceEnabled === undefined) {
    // 从未显式设置：管理员默认开启，其余用户默认关闭
    return isAdminUser();
  }
  return voiceEnabled;
}

/**
 * 解析当前 DeepSeek 密钥来源
 * @returns "official" | "custom" 表示 AI 可用；"none" 表示 AI 未启用
 */
export function resolveDeepseekKeyMode(): DeepseekKeyMode | "none" {
  // 未解锁一律不可用
  if (!isUnlocked()) return "none";

  const { deepseekKeyMode, deepseekCustomKey } = useSettingsStore.getState();

  // 用户显式关闭
  if (deepseekKeyMode === "off") return "none";
  // 用户自己填写了 Key 且选择了 custom：校验非空
  if (deepseekKeyMode === "custom") {
    return deepseekCustomKey.trim() ? "custom" : "none";
  }
  if (deepseekKeyMode === "official") {
    return "official";
  }

  // 从未显式选择：管理员默认官方 Key，其他用户默认关闭 AI
  return isAdminUser() ? "official" : "none";
}

/** AI 文章生成是否可用 */
export function isAiEnabled(): boolean {
  return resolveDeepseekKeyMode() !== "none";
}

/**
 * 获取实际用于请求 DeepSeek 的 Key
 * @returns Key 字符串；AI 未启用或 Key 缺失时返回 null
 */
export function getDeepseekKey(): string | null {
  const mode = resolveDeepseekKeyMode();
  if (mode === "custom") {
    return useSettingsStore.getState().deepseekCustomKey.trim() || null;
  }
  if (mode === "official") {
    return OFFICIAL_DEEPSEEK_KEY || null;
  }
  return null;
}

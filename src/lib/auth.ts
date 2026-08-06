/**
 * 客户端认证系统
 *
 * 三种身份：
 * 1. 管理员（xiyun）：硬编码在 AUTH_USERS，本地验证，永远 unlocked
 * 2. 注册用户：存 Supabase registered_users 表，密码 SHA-256 哈希，unlocked 状态由密钥解锁后写入
 * 3. 游客：本地会话，无云存档、无密钥解锁入口
 *
 * 安全设计：
 * - 密码以 SHA-256 哈希传输与存储（非明文）
 * - 密钥比对走 Supabase RPC（verify_unlock_key），密钥原文前端永远拿不到
 * - registered_users 表开启 RLS 且无 policy，前端只能通过 RPC 操作
 * - 前端解锁门控为"防君子不防小人"（DeepSeek key 本就在前端）
 */

import { getSupabase } from "@/lib/supabase";

/** 管理员账号配置（本地硬编码，不走 Supabase） */
export interface AuthUser {
  username: string;
  /** SHA-256 密码哈希（非明文） */
  passwordHash: string;
  /** 显示名称（可选） */
  displayName?: string;
}

/**
 * 预设管理员列表
 *
 * ⚠️ 请在部署前修改此配置！
 * passwordHash 是密码的 SHA-256 哈希值，不是明文密码。
 *
 * 生成方法：在浏览器控制台执行
 *   await crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的密码'))
 *     .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''))
 */
export const AUTH_USERS: AuthUser[] = [
  {
    username: "xiyun",
    // 默认密码 "admin123" 的哈希 —— 请务必修改！
    passwordHash: "d8201ddbb8a2eac86d466c78cb9d8e4c2cd97172f4aec32bd99c4e27ff406526",
    displayName: "管理员熙云",
  },
];

/** localStorage 存储登录状态的 key */
const AUTH_STORAGE_KEY = "wordgrid-auth";

/** 游客用户名（仅用于会话标识，不参与云同步） */
export const GUEST_USERNAME = "__guest__";

/** 登录状态记录 */
interface AuthSession {
  username: string;
  displayName: string;
  loginAt: number;
  /** 是否为游客模式（游客不参与云同步、不可输密钥解锁） */
  isGuest?: boolean;
  /** 是否已解锁高级功能（TTS + DeepSeek + 云存档）。管理员永远为 true */
  unlocked?: boolean;
  /** 身份来源：admin=本地管理员 / registered=Supabase注册用户 / guest=游客 */
  source?: "admin" | "registered" | "guest";
}

/** 用浏览器 SubtleCrypto 计算 SHA-256（十六进制） */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 检查当前是否已登录（永不过期，除非手动登出） */
export function isAuthenticated(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.username) return false;
    return true;
  } catch {
    return false;
  }
}

/** 当前是否为游客模式 */
export function isGuest(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as AuthSession;
    return session?.isGuest === true;
  } catch {
    return false;
  }
}

/** 获取当前登录用户信息 */
export function getCurrentUser(): {
  username: string;
  displayName: string;
  isGuest: boolean;
  unlocked: boolean;
  source: "admin" | "registered" | "guest";
} | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.username) return null;
    return {
      username: session.username,
      displayName: session.displayName,
      isGuest: session.isGuest === true,
      unlocked: session.unlocked === true,
      source: session.source || (session.isGuest ? "guest" : "registered"),
    };
  } catch {
    return null;
  }
}

/** 当前会话是否已解锁高级功能（管理员永远已解锁） */
export function isUnlocked(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return user.unlocked;
}

/* ============ 登录 ============ */

/**
 * 管理员登录（本地验证，不走 Supabase）
 * 管理员永远 unlocked = true
 */
async function loginAsAdmin(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const user = AUTH_USERS.find((u) => u.username === username.trim());
  if (!user) {
    return { success: false, error: "用户名不存在" };
  }
  const inputHash = await sha256(password);
  if (inputHash !== user.passwordHash) {
    return { success: false, error: "密码错误" };
  }
  const session: AuthSession = {
    username: user.username,
    displayName: user.displayName || user.username,
    loginAt: Date.now(),
    isGuest: false,
    unlocked: true,
    source: "admin",
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return { success: true };
}

/**
 * 注册用户登录（走 Supabase verify_login RPC）
 * unlocked 状态从数据库读取
 */
async function loginAsRegistered(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "云服务未配置，无法登录注册账号" };
  }
  const passwordHash = await sha256(password);
  try {
    const { data, error } = await (supabase.rpc as any)("verify_login", {
      p_username: username.trim(),
      p_password_hash: passwordHash,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    // verify_login 返回 0 行 = 用户名/密码错误；1 行 = 成功
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { success: false, error: "用户名或密码错误" };
    }
    const row = data[0];
    const session: AuthSession = {
      username: row.username,
      displayName: row.display_name || row.username,
      loginAt: Date.now(),
      isGuest: false,
      unlocked: row.unlocked === true,
      source: "registered",
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/** 登录入口：先尝试管理员，失败再走注册用户 */
export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    return { success: false, error: "请输入用户名和密码" };
  }
  // 管理员优先（用户名命中 AUTH_USERS）
  const isAdminTarget = AUTH_USERS.some((u) => u.username === trimmed);
  if (isAdminTarget) {
    return loginAsAdmin(trimmed, password);
  }
  // 其余走注册用户
  return loginAsRegistered(trimmed, password);
}

/* ============ 注册 ============ */

/**
 * 注册新账号
 *
 * - 任何人可注册（不需要审批）
 * - 新账号默认 unlocked = false（需输入密钥才能解锁高级功能）
 * - 用户名冲突时返回失败
 */
export async function register(
  username: string,
  password: string,
  displayName?: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = username.trim();
  if (!trimmed || !password) {
    return { success: false, error: "请输入用户名和密码" };
  }
  if (trimmed === GUEST_USERNAME) {
    return { success: false, error: "该用户名不可用" };
  }
  // 保留管理员用户名，防止抢占
  if (AUTH_USERS.some((u) => u.username === trimmed)) {
    return { success: false, error: "该用户名已被占用" };
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "云服务未配置，无法注册" };
  }
  const passwordHash = await sha256(password);
  try {
    const { data, error } = await (supabase.rpc as any)("register_user", {
      p_username: trimmed,
      p_password_hash: passwordHash,
      p_display_name: displayName?.trim() || null,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    // register_user 返回 true = 成功；返回 null = 用户名冲突
    if (data !== true) {
      return { success: false, error: "用户名已被占用" };
    }
    // 注册成功后自动登录（unlocked=false，需后续输密钥解锁）
    const session: AuthSession = {
      username: trimmed,
      displayName: displayName?.trim() || trimmed,
      loginAt: Date.now(),
      isGuest: false,
      unlocked: false,
      source: "registered",
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/* ============ 游客登录 ============ */

/**
 * 游客登录
 *
 * 游客可使用单词本、复习、文章归档、随笔、日期备注等本地功能，
 * 但不可使用：云存档、TTS 语音、DeepSeek 文章生成（无密钥解锁入口）。
 */
export function loginAsGuest(): void {
  const session: AuthSession = {
    username: GUEST_USERNAME,
    displayName: "游客",
    loginAt: Date.now(),
    isGuest: true,
    unlocked: false,
    source: "guest",
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

/* ============ 解锁 ============ */

/**
 * 提交密钥解锁当前账号
 *
 * - 游客不可调用（需先退出注册账号）
 * - 管理员已解锁，无需调用
 * - 注册用户：调 verify_unlock_key RPC，成功后更新本地会话 + Supabase registered_users.unlocked
 *
 * @returns success=true 解锁成功；success=false 给出错误原因
 */
export async function submitUnlockKey(
  key: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { success: false, error: "请输入密钥" };
  }
  const user = getCurrentUser();
  if (!user) {
    return { success: false, error: "未登录" };
  }
  if (user.isGuest) {
    return { success: false, error: "游客无法解锁，请先退出并注册账号" };
  }
  if (user.unlocked) {
    return { success: true }; // 已解锁，幂等
  }
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: "云服务未配置" };
  }
  try {
    const { data, error } = await (supabase.rpc as any)(
      "verify_unlock_key",
      { input_key: trimmed },
    );
    if (error) {
      return { success: false, error: error.message };
    }
    if (data !== true) {
      return { success: false, error: "密钥错误" };
    }
    // 密钥正确：更新本地会话
    updateSession({ unlocked: true });
    // 同步到 Supabase（注册用户），通过 RPC 写入（表有 RLS，前端不可直接 update）
    if (user.source === "registered") {
      try {
        await (supabase.rpc as any)("set_user_unlocked", {
          p_username: user.username,
        });
      } catch {
        // 静默失败：本地已解锁，数据库写入失败不影响当前体验
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/**
 * 登录后从 Supabase 刷新解锁状态（换设备登录时同步云端 unlocked）
 *
 * 通过 verify_login RPC 已在登录时取到 unlocked，这里不需要再次查询。
 * 保留此函数为空操作占位，避免外部调用点报错。
 */
export async function refreshUnlockStatusFromCloud(): Promise<void> {
  // 登录时 verify_login 已返回 unlocked，无需额外查询
}

/** 局部更新会话（解锁后调用） */
function updateSession(patch: Partial<AuthSession>): void {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const session = JSON.parse(raw) as AuthSession;
    const next = { ...session, ...patch };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** 登出 */
export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * 工具函数：生成密码哈希
 *
 * 在浏览器控制台使用：
 *   import('@/lib/auth').then(m => m.generatePasswordHash('你的密码')).then(console.log)
 */
export async function generatePasswordHash(password: string): Promise<string> {
  return sha256(password);
}

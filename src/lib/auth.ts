/**
 * 简单的客户端认证系统
 *
 * 设计说明：
 * - GitHub Pages 是纯静态托管，无后端，认证只能在客户端完成
 * - 密码以 SHA-256 哈希存储，不是明文（但仍非绝对安全，代码公开可被逆向）
 * - 登录状态存 localStorage，永不过期（除非手动登出）
 * - 适用于"防陌生人"场景，不适合高安全需求
 *
 * 使用方法：
 * 1. 在下方 AUTH_USERS 数组中添加用户名和密码哈希
 * 2. 用 generatePasswordHash() 函数生成哈希（见文件底部说明）
 */

/** 用户账号配置 */
export interface AuthUser {
  username: string;
  /** SHA-256 密码哈希（非明文） */
  passwordHash: string;
  /** 显示名称（可选） */
  displayName?: string;
}

/**
 * 预设用户列表
 *
 * ⚠️ 请在部署前修改此配置！
 * passwordHash 是密码的 SHA-256 哈希值，不是明文密码。
 *
 * 生成方法：在浏览器控制台执行
 *   await crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的密码'))
 *     .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''))
 *
 * 或用在线工具：https://emn178.github.io/online-tools/sha256.html
 *
 * 示例：密码 "123456" 的哈希是
 *   8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
 */
export const AUTH_USERS: AuthUser[] = [
  {
    username: "xiyun",
    // 默认密码 "admin123" 的哈希 —— 请务必修改！
    passwordHash: "d8201ddbb8a2eac86d466c78cb9d8e4c2cd97172f4aec32bd99c4e27ff406526",
    displayName: "管理员熙云",
  },
  {
    username: "hujie",
    // 密码 "123456" 的哈希
    passwordHash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    displayName: "胡姐",
  },
  // 添加更多用户：
  {
    username: "lianggan",
    // 密码 "lg123" 的哈希
    passwordHash: "5cc5057444a9c3ec3b3d700c813bff07fb3e20a5231599112d168553242de232",
    displayName: "梁淦",
  },
  {
    username: "liujing",
    // 密码 "498890" 的哈希
    passwordHash: "404463501d3f4dddb20b0affa5003f2610c7bfb1c8cf47de4f45ea9a54f732d6",
    displayName: "刘静",
  },
];

/** localStorage 存储登录状态的 key */
const AUTH_STORAGE_KEY = "wordgrid-auth";

/** 登录状态记录 */
interface AuthSession {
  username: string;
  displayName: string;
  loginAt: number;
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

/** 获取当前登录用户信息 */
export function getCurrentUser(): { username: string; displayName: string } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;
    if (!session?.username) return null;
    return { username: session.username, displayName: session.displayName };
  } catch {
    return null;
  }
}

/** 登录验证 */
export async function login(
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
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  return { success: true };
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
 *
 * 或直接执行：
 *   crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的密码'))
 *     .then(buf => Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''))
 *     .then(console.log)
 */
export async function generatePasswordHash(password: string): Promise<string> {
  return sha256(password);
}

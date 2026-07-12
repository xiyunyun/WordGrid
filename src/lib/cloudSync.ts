/**
 * 云端存档工具
 *
 * 基于 Gitee API 实现用户数据的云端同步
 * 每个用户用 cloudId 标识，对应仓库中 backups/{cloudId}.json 文件
 *
 * 配置项（在 .env.local 中设置）：
 * - VITE_GITEE_OWNER    仓库所有者用户名
 * - VITE_GITEE_REPO     仓库名
 * - VITE_GITEE_TOKEN    Gitee 私人令牌
 * - VITE_GITEE_BRANCH   分支名（默认 master）
 */

/** Gitee 配置 */
const GITEE_OWNER = import.meta.env.VITE_GITEE_OWNER as string | undefined;
const GITEE_REPO = import.meta.env.VITE_GITEE_REPO as string | undefined;
const GITEE_TOKEN = import.meta.env.VITE_GITEE_TOKEN as string | undefined;
const GITEE_BRANCH =
  (import.meta.env.VITE_GITEE_BRANCH as string | undefined) || "master";

/** localStorage 中存 cloudId 的 key */
const CLOUD_ID_KEY = "wordgrid-cloud-id";

/** localStorage 中存本地最后修改时间的 key（ISO 字符串，仅作记录） */
const LOCAL_LAST_MODIFIED_KEY = "wordgrid-last-modified";

/** localStorage 中存云端文件 SHA 的 key（用于版本比对，避免重复下载） */
const LOCAL_CLOUD_SHA_KEY = "wordgrid-cloud-sha";

/** Gitee API 基础地址 */
const GITEE_API = "https://gitee.com/api/v5";

/** 需要备份的 localStorage key（与 dataTransfer 保持一致） */
const BACKUP_KEYS = [
  "wordgrid-store",
  "wordgrid-article-archive",
  "wordgrid-seeded",
];

/** cloudId 允许字符：字母、数字、下划线、横线，长度 1-32 */
export function validateCloudId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) return "云端标识不能为空";
  if (trimmed.length > 32) return "云端标识长度不能超过 32";
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed))
    return "云端标识仅支持字母、数字、下划线、横线";
  return null;
}

/** 检查 Gitee 是否已配置 */
export function isCloudConfigured(): boolean {
  return !!(GITEE_OWNER && GITEE_REPO && GITEE_TOKEN);
}

/** 获取本地最后修改时间（ISO 字符串），用于与云端比较 */
export function getLocalLastModified(): string {
  return localStorage.getItem(LOCAL_LAST_MODIFIED_KEY) || "";
}

/** 更新本地最后修改时间为当前时间 */
export function setLocalLastModified(): void {
  localStorage.setItem(LOCAL_LAST_MODIFIED_KEY, new Date().toISOString());
}

/** 获取本地保存的云端文件 SHA（用于版本比对） */
export function getLocalCloudSha(): string {
  return localStorage.getItem(LOCAL_CLOUD_SHA_KEY) || "";
}

/** 保存云端文件 SHA 到本地（下载/上传成功后调用） */
export function setLocalCloudSha(sha: string): void {
  localStorage.setItem(LOCAL_CLOUD_SHA_KEY, sha);
}

/** 返回 Gitee 配置信息（用于 UI 提示） */
export function getCloudConfigInfo() {
  return {
    owner: GITEE_OWNER || "",
    repo: GITEE_REPO || "",
    branch: GITEE_BRANCH,
    configured: isCloudConfigured(),
  };
}

/** 读取已保存的 cloudId */
export function getCloudId(): string {
  return localStorage.getItem(CLOUD_ID_KEY) || "";
}

/** 保存 cloudId */
export function setCloudId(id: string): void {
  localStorage.setItem(CLOUD_ID_KEY, id.trim());
}

/** 构造云端文件路径 */
function buildFilePath(cloudId: string): string {
  return `backups/${cloudId}.json`;
}

/** UTF-8 安全的 base64 编码 */
function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** UTF-8 安全的 base64 解码 */
function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** 查询云端文件的 SHA（更新已有文件时必须携带） */
async function getFileSha(cloudId: string): Promise<string | null> {
  const path = buildFilePath(cloudId);
  const url = `${GITEE_API}/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${path}?ref=${GITEE_BRANCH}&access_token=${GITEE_TOKEN}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha || null;
  } catch {
    return null;
  }
}

/** 收集本地数据打包为 JSON */
function packLocalData(): string {
  const data: Record<string, string> = {};
  for (const key of BACKUP_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) data[key] = v;
  }
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    source: "WordGrid-CloudSync",
    data,
  });
}

/** 从云端 JSON 解包并写入 localStorage，返回写入条目数 */
function unpackAndApply(json: string): number {
  const bundle = JSON.parse(json);
  if (!bundle?.data || typeof bundle.data !== "object") {
    throw new Error("云端数据格式无效");
  }
  let count = 0;
  for (const [key, value] of Object.entries(bundle.data)) {
    if (BACKUP_KEYS.includes(key) && typeof value === "string") {
      localStorage.setItem(key, value);
      count++;
    }
  }
  if (count === 0) throw new Error("云端数据中没有有效条目");
  return count;
}

export interface CloudResult {
  success: boolean;
  error?: string;
  message?: string;
}

/** 上传本地数据到云端 */
export async function uploadToCloud(): Promise<CloudResult> {
  if (!isCloudConfigured()) {
    return {
      success: false,
      error: "云存档未配置，请在 .env.local 中设置 VITE_GITEE_OWNER / REPO / TOKEN",
    };
  }
  const cloudId = getCloudId();
  const err = validateCloudId(cloudId);
  if (err) return { success: false, error: err };

  const content = packLocalData();
  const base64Content = encodeBase64(content);
  const path = buildFilePath(cloudId);

  try {
    // 先查 SHA 决定 POST 新建 or PUT 更新
    const sha = await getFileSha(cloudId);
    const method = sha ? "PUT" : "POST";
    const url = `${GITEE_API}/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${path}?access_token=${GITEE_TOKEN}`;

    const body: Record<string, unknown> = {
      access_token: GITEE_TOKEN,
      content: base64Content,
      message: `chore(backup): update ${cloudId} at ${new Date().toISOString()}`,
      branch: GITEE_BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `上传失败（HTTP ${res.status}）：${errText.slice(0, 200)}`,
      };
    }

    // 上传成功后，保存新文件 SHA 到本地（关键：避免下次 smartDownload 误判为远端更新而循环刷新）
    try {
      const data = await res.json();
      const newSha = data.content?.sha || data.sha;
      if (newSha) {
        setLocalCloudSha(newSha);
      }
      setLocalLastModified();
    } catch {
      setLocalLastModified();
    }

    return {
      success: true,
      message: `已上传 ${(content.length / 1024).toFixed(1)} KB 到云端存档（标识：${cloudId}）`,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/** 从云端下载数据并覆盖本地 */
export async function downloadFromCloud(): Promise<CloudResult> {
  if (!isCloudConfigured()) {
    return {
      success: false,
      error: "云存档未配置，请在 .env.local 中设置 VITE_GITEE_OWNER / REPO / TOKEN",
    };
  }
  const cloudId = getCloudId();
  const err = validateCloudId(cloudId);
  if (err) return { success: false, error: err };

  const path = buildFilePath(cloudId);
  const url = `${GITEE_API}/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${path}?ref=${GITEE_BRANCH}&access_token=${GITEE_TOKEN}`;

  try {
    const res = await fetch(url);
    if (res.status === 404) {
      return {
        success: false,
        error: `云端无存档（标识：${cloudId}），请先上传后再下载`,
      };
    }
    if (!res.ok) {
      return { success: false, error: `下载失败（HTTP ${res.status}）` };
    }
    const data = await res.json();
    if (!data.content) {
      return { success: false, error: "云端文件内容为空" };
    }
    // Gitee 返回的 content 可能含换行符
    const b64 = (data.content as string).replace(/\s/g, "");
    const json = decodeBase64(b64);
    const count = unpackAndApply(json);
    return {
      success: true,
      message: `已从云端恢复 ${count} 项数据（标识：${cloudId}）。页面将在 2 秒后刷新...`,
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "网络错误" };
  }
}

/* ============ 自动同步：智能下载 + 尽力上传 ============ */

/**
 * 智能下载：基于文件 SHA 比对决定是否下载
 *
 * Gitee contents 接口返回的文件 SHA 是内容唯一标识 —— 内容不变则 SHA 不变。
 * 比对本地保存的 SHA 与云端 SHA：
 * - 相同 → 跳过（内容未变化，无重复刷新）
 * - 不同或本地无记录 → 下载，下载成功后保存新 SHA
 *
 * 注意：不能用「最后修改时间」比对，Gitee contents 接口不返回 last_commit / updated_at 字段，
 * 会导致每次返回 null，误判为「云端有更新」→ 无限刷新循环。
 */
export async function smartDownload(): Promise<CloudResult & { skipped?: boolean }> {
  if (!isCloudConfigured()) {
    return { success: false, error: "云存档未配置" };
  }
  const cloudId = getCloudId();
  const err = validateCloudId(cloudId);
  if (err) return { success: false, error: err };

  // 获取云端文件 SHA（内容指纹）
  const cloudSha = await getFileSha(cloudId);

  // 云端无文件 → 尝试下载（会返回 404 错误提示用户先上传）
  if (!cloudSha) {
    return downloadFromCloud();
  }

  const localSha = getLocalCloudSha();

  // SHA 相同 → 本地已是最新版本，跳过
  if (localSha && cloudSha === localSha) {
    return { success: true, message: "本地数据与云端一致，跳过下载", skipped: true };
  }

  // SHA 不同或本地无记录 → 下载云端数据
  const result = await downloadFromCloud();

  // 下载成功后保存云端 SHA，避免下次刷新重复下载
  if (result.success) {
    setLocalCloudSha(cloudSha);
  }

  return result;
}

/** 尽力上传（用于页面关闭时，使用 keepalive 确保请求发出） */
export async function uploadKeepalive(): Promise<void> {
  if (!isCloudConfigured()) return;
  const cloudId = getCloudId();
  const err = validateCloudId(cloudId);
  if (err) return;

  const content = packLocalData();
  const base64Content = encodeBase64(content);
  const path = buildFilePath(cloudId);

  try {
    const sha = await getFileSha(cloudId);
    const method = sha ? "PUT" : "POST";
    const url = `${GITEE_API}/repos/${GITEE_OWNER}/${GITEE_REPO}/contents/${path}?access_token=${GITEE_TOKEN}`;

    const body: Record<string, unknown> = {
      access_token: GITEE_TOKEN,
      content: base64Content,
      message: `chore(backup): auto-sync ${cloudId} at ${new Date().toISOString()}`,
      branch: GITEE_BRANCH,
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });

    if (res.ok) {
      // 上传成功后保存新 SHA，避免下次 smartDownload 误判
      try {
        const data = await res.json();
        const newSha = data.content?.sha || data.sha;
        if (newSha) {
          setLocalCloudSha(newSha);
        }
        setLocalLastModified();
      } catch {
        setLocalLastModified();
      }
    }
  } catch {
    // 静默失败
  }
}

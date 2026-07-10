/**
 * 有道智云 TTS 语音合成
 *
 * 接口文档：https://ai.youdao.com/DOCSIRMA/html/tts/api/yyhc/index.html
 * 签名算法：signType=v3, sign=sha256(appKey + input + salt + curtime + appSecret)
 *   其中 input = q前10字符 + q长度 + q后10字符 (q长度>20) 或 q字符串 (q长度<=20)
 *
 * 三级缓存：内存 Map → IndexedDB（持久化）→ 远程 API
 * 已合成过的单词永不重复请求，节省额度。
 */

const APP_KEY = import.meta.env.VITE_YOUDAO_APP_KEY as string;
const APP_SECRET = import.meta.env.VITE_YOUDAO_APP_SECRET as string;
const API_URL = "https://openapi.youdao.com/ttsapi";

// 词典美式发音，最适合单词朗读
const VOICE_NAME = "youmeimei";

// 内存缓存：当前页面会话内复用 blob URL
const audioCache = new Map<string, string>();

/* ============ IndexedDB 持久化缓存 ============ */
const DB_NAME = "wordgrid-tts";
const STORE_NAME = "audio";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

/** 懒加载打开 IndexedDB（浏览器不支持时返回 null） */
function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

/** 从 IndexedDB 读取音频 ArrayBuffer */
async function getFromDB(key: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as ArrayBuffer) || null);
    req.onerror = () => resolve(null);
  });
}

/** 写入音频 ArrayBuffer 到 IndexedDB（失败静默，不影响播放） */
async function saveToDB(key: string, buf: ArrayBuffer): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(buf, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/** 用浏览器 SubtleCrypto 计算 SHA256（十六进制） */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** 生成 input 字段 */
function buildInput(q: string): string {
  if (q.length <= 20) return q;
  return q.slice(0, 10) + q.length + q.slice(-10);
}

/** 生成 UUID（salt 用） */
function uuid(): string {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 合成语音并播放
 *
 * 查找顺序：内存缓存 → IndexedDB 持久化缓存 → 远程 API
 * 新合成的音频会同时写入内存和 IndexedDB，刷新页面后仍可复用。
 *
 * @param text 待朗读文本（通常是单词）
 * @returns 播放成功返回 true，失败返回 false
 */
export async function speak(text: string): Promise<boolean> {
  const cleanText = text.trim();
  if (!cleanText) return false;

  if (!APP_KEY || !APP_SECRET) {
    console.warn("[TTS] 未配置有道智云凭证，请在 .env.local 中设置 VITE_YOUDAO_APP_KEY / VITE_YOUDAO_APP_SECRET");
    return false;
  }

  try {
    // 1. 命中内存缓存 → 直接播放
    const cached = audioCache.get(cleanText);
    if (cached) {
      await playUrl(cached);
      return true;
    }

    // 2. 命中 IndexedDB → 转为 blob URL 播放，并提升到内存缓存
    const dbBuf = await getFromDB(cleanText);
    if (dbBuf) {
      const url = URL.createObjectURL(new Blob([dbBuf], { type: "audio/mp3" }));
      audioCache.set(cleanText, url);
      await playUrl(url);
      return true;
    }

    // 3. 远程合成
    const salt = uuid();
    const curtime = Math.floor(Date.now() / 1000).toString();
    const input = buildInput(cleanText);
    const signStr = APP_KEY + input + salt + curtime + APP_SECRET;
    const sign = await sha256(signStr);

    const params = new URLSearchParams({
      q: cleanText,
      appKey: APP_KEY,
      salt,
      sign,
      signType: "v3",
      curtime,
      voiceName: VOICE_NAME,
      format: "mp3",
      speed: "1",
      volume: "1.00",
    });

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const contentType = res.headers.get("Content-Type") || "";
    if (!contentType.includes("audio/")) {
      // 返回的是 JSON 错误
      const errBody = await res.text().catch(() => "");
      console.warn("[TTS] 合成失败:", errBody || contentType);
      return false;
    }

    // 取 ArrayBuffer（可同时用于播放与持久化）
    const buf = await res.arrayBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "audio/mp3" }));
    audioCache.set(cleanText, url);
    // 写入 IndexedDB（静默失败不影响功能）
    void saveToDB(cleanText, buf);
    await playUrl(url);
    return true;
  } catch (e) {
    console.warn("[TTS] 请求异常:", e);
    return false;
  }
}

/** 播放音频 URL，返回 Promise 在播放结束时 resolve */
function playUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

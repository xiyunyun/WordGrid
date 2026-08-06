/**
 * 语音合成与播放
 *
 * 单词朗读采用双源优先级策略：
 *   1. Free Dictionary API (dictionaryapi.dev) - 免费，部分单词提供真人发音
 *   2. 有道智云 TTS - 付费兜底，保证所有单词都能发音
 *
 * 有道 TTS 内部三级缓存：内存 Map → IndexedDB（持久化）→ 远程 API
 * 已合成过的单词永不重复请求，节省额度。
 */

import { lookupWord, getFirstAudio } from "@/lib/dictionary";
import { isUnlocked } from "@/lib/auth";

const APP_KEY = import.meta.env.VITE_YOUDAO_APP_KEY as string;
const APP_SECRET = import.meta.env.VITE_YOUDAO_APP_SECRET as string;
const API_URL = "https://openapi.youdao.com/ttsapi";

// 词典美式发音，最适合单词朗读
const VOICE_NAME = "youmeimei";

/** 从 settingsStore 读取 TTS 音量（懒加载避免循环依赖） */
function getTtsVolume(): number {
  try {
    // 动态 import 在模块加载时不可用，改用全局缓存引用
    // settingsStore 在首次调用时已初始化完毕（playUrl 仅在用户点击播放时调用）
    return useSettingsStoreVolume();
  } catch {
    return 1;
  }
}

// 延迟引用 settingsStore，避免 lib 层与 store 层循环依赖
let _volumeGetter: (() => number) | null = null;
export function __setVolumeGetter(fn: () => number) {
  _volumeGetter = fn;
}
function useSettingsStoreVolume(): number {
  if (_volumeGetter) return _volumeGetter();
  return 1;
}

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

  // 语音朗读为高级功能，需解锁后使用（管理员默认已解锁）
  if (!isUnlocked()) {
    console.warn("[TTS] 未解锁高级功能，语音朗读不可用");
    return false;
  }

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

/** 播放音频 URL，返回 Promise 在播放结束时 resolve
 *  音量从 settingsStore 读取，用户可在设置页面调节
 *  返回 true 表示播放成功，false 表示播放失败（用于触发回退逻辑） */
function playUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    // 从 store 读取音量设置（延迟读取，避免初始化顺序问题）
    audio.volume = getTtsVolume();
    audio.onended = () => resolve(true);
    audio.onerror = () => resolve(false);
    audio.play().catch(() => resolve(false));
  });
}

/* ============ 单词朗读：Free Dictionary API 优先 ============ */

/**
 * Free Dictionary API 音频 URL 缓存
 * key: 单词（小写）  value: 音频 URL（空字符串表示已查询过但无音频）
 */
const dictAudioCache = new Map<string, string>();

/**
 * 朗读单个单词 - 双源优先级播放
 *
 * 查找顺序：
 *   1. Free Dictionary API 的音频 URL（内存缓存避免重复查询）
 *   2. 有道智云 TTS（三级缓存兜底）
 *
 * 设计意图：最大化使用免费词典音频以节省有道 API 额度，
 * 同时保证所有单词（包括不在词典中的）都能发音。
 *
 * @param word 待朗读单词
 * @returns 播放成功返回 true，失败返回 false
 */
export async function speakWord(word: string): Promise<boolean> {
  const cleanWord = word.trim();
  if (!cleanWord) return false;

  // 语音朗读为高级功能，需解锁后使用（管理员默认已解锁）
  // 在入口处拦截，未解锁时连免费词典音频也不播放，保持"语音功能需解锁"的一致体验
  if (!isUnlocked()) {
    console.warn("[TTS] 未解锁高级功能，语音朗读不可用");
    return false;
  }

  const lower = cleanWord.toLowerCase();

  // 1. 查询 Free Dictionary API（仅首次查询，之后走缓存）
  let audioUrl = dictAudioCache.get(lower);
  if (audioUrl === undefined) {
    try {
      const entry = await lookupWord(cleanWord);
      audioUrl = getFirstAudio(entry) || "";
    } catch {
      // 网络错误或解析异常，标记为无音频，直接走 TTS
      audioUrl = "";
    }
    dictAudioCache.set(lower, audioUrl);
  }

  // 2. 有词典音频 → 直接播放，失败则回退到 TTS
  if (audioUrl) {
    const ok = await playUrl(audioUrl);
    if (ok) return true;
    // 播放失败（如 URL 失效、混合内容拦截），回退到 TTS
  }

  // 3. 无词典音频或播放失败 → 有道 TTS 兜底
  return speak(cleanWord);
}

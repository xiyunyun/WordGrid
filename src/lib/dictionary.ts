/**
 * 词典查询工具
 *
 * 基于 Free Dictionary API (https://dictionaryapi.dev/)
 * - 完全免费，无需 API key
 * - 返回音标、词性、释义、例句、音频
 * - 数据来自 Wiktionary
 *
 * 国内访问速度良好，无需代理。
 */

/** 音标项 */
export interface Phonetic {
  /** IPA 音标文本，如 "/həˈləʊ/" */
  text?: string;
  /** 音频 URL（mp3） */
  audio?: string;
}

/** 单条释义 */
export interface Definition {
  /** 释义文本 */
  definition: string;
  /** 例句（可选） */
  example?: string;
  /** 同义词 */
  synonyms: string[];
}

/** 一个词性的所有释义 */
export interface Meaning {
  /** 词性，如 "noun"、"verb"、"interjection" */
  partOfSpeech: string;
  /** 该词性下的所有释义 */
  definitions: Definition[];
  /** 同义词（词性级别） */
  synonyms: string[];
}

/** 查词结果 */
export interface DictEntry {
  /** 查询的单词 */
  word: string;
  /** 音标列表（可能多个，取第一个有 text 的） */
  phonetics: Phonetic[];
  /** 所有词性的释义 */
  meanings: Meaning[];
  /** 来源 URL */
  sourceUrl?: string;
}

/** 将 API 原始响应转换为精简的 DictEntry */
function parseEntry(raw: any): DictEntry {
  return {
    word: raw.word || "",
    phonetics: (raw.phonetics || []).map((p: any) => ({
      text: p.text || "",
      audio: p.audio || "",
    })),
    meanings: (raw.meanings || []).map((m: any) => ({
      partOfSpeech: m.partOfSpeech || "",
      definitions: (m.definitions || []).map((d: any) => ({
        definition: d.definition || "",
        example: d.example || "",
        synonyms: d.synonyms || [],
      })),
      synonyms: m.synonyms || [],
    })),
    sourceUrl: raw.sourceUrls?.[0] || "",
  };
}

/** 查询英文单词
 * @param word 要查询的单词
 * @returns 查词结果，找不到返回 null
 * @throws 网络错误时抛出异常
 */
export async function lookupWord(word: string): Promise<DictEntry | null> {
  const clean = word.trim().toLowerCase().replace(/[^a-z'-]/g, "");
  if (!clean) return null;

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`;

  const res = await fetch(url);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`查询失败（HTTP ${res.status}）`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  // 取第一个结果（通常是主词条）
  return parseEntry(data[0]);
}

/** 获取第一个有效的音标文本 */
export function getFirstPhonetic(entry: DictEntry | null): string {
  if (!entry) return "";
  for (const p of entry.phonetics) {
    if (p.text) return p.text;
  }
  return "";
}

/** 获取第一个有效的音频 URL
 *  自动将 http:// 升级为 https://，避免 HTTPS 页面下的混合内容拦截 */
export function getFirstAudio(entry: DictEntry | null): string {
  if (!entry) return "";
  for (const p of entry.phonetics) {
    if (p.audio) {
      return p.audio.replace(/^http:\/\//, "https://");
    }
  }
  return "";
}

/** 词性翻译表（英文 → 中文简写） */
const POS_CN: Record<string, string> = {
  noun: "名词",
  verb: "动词",
  adjective: "形容词",
  adverb: "副词",
  pronoun: "代词",
  preposition: "介词",
  conjunction: "连词",
  interjection: "感叹词",
  determiner: "限定词",
  exclamation: "感叹词",
};

/** 获取词性的中文翻译 */
export function getPosCN(pos: string): string {
  return POS_CN[pos.toLowerCase()] || pos;
}

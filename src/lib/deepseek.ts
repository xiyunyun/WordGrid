import type { Word } from "@/types";

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const API_URL = "https://api.deepseek.com/chat/completions";

export type Difficulty = "elementary" | "beginner" | "intermediate" | "advanced";

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  elementary:
    "适合小学生/零基础入门，使用最简单的常见词汇和极短句（主谓宾结构），时态仅一般现在时，每个句子不超过 8 个词",
  beginner:
    "适合初学者，使用简单句型和基础词汇，句子简短，时态以一般现在时为主",
  intermediate:
    "适合中级学习者，句型多样，包含从句和复合句，时态丰富",
  advanced:
    "适合高级学习者，使用复杂句型、高级词汇和修辞手法，接近母语表达",
};

/** 题目类型 */
export type QuestionType = "fill_blank" | "choice";

/** 选择题选项 */
export interface ChoiceOption {
  key: string; // A / B / C / D
  text: string;
}

/** 一道题目（填空或选择） */
export interface QuizQuestion {
  id: string;
  type: QuestionType;
  /** 题干 */
  stem: string;
  /** 填空题：原句（含空位 ___）；选择题：题干 */
  sentence?: string;
  /** 选择题选项 */
  options?: ChoiceOption[];
  /** 正确答案（填空为单词，选择为选项 key） */
  answer: string;
  /** 简短解析 */
  explanation?: string;
}

/** 通用请求封装 */
async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.8,
  maxTokens: number = 1200,
): Promise<string> {
  if (!API_KEY) {
    throw new Error("未配置 DeepSeek API Key，请在 .env.local 中设置 VITE_DEEPSEEK_API_KEY");
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API 请求失败 (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  const finishReason = data?.choices?.[0]?.finish_reason;
  if (!content || typeof content !== "string") {
    const usage = data?.usage;
    throw new Error(
      `API 返回内容为空或格式异常（finish_reason: ${finishReason || "unknown"}，usage: ${JSON.stringify(usage)}）`,
    );
  }

  return content.trim();
}

/**
 * 调用 DeepSeek API，基于选中的单词生成一篇英文文章
 * 返回纯文本文章（可能包含段落）
 *
 * @param words 选中的单词列表
 * @param difficulty 难度级别
 * @param wordCount 目标文章字数（50-300）
 */
export async function generateArticle(
  words: Word[],
  difficulty: Difficulty,
  wordCount: number = 50,
): Promise<string> {
  const wordList = words.map((w) => w.word).join(", ");
  const wordMeanings = words
    .map((w) => `${w.word} (${w.pos} ${w.meaning})`)
    .join("\n");

  const systemPrompt = `你是一位专业的英语教育内容创作者，擅长根据指定单词编写生动有趣的英语阅读文章。`;

  const userPrompt = `请基于以下单词，创作一篇英语短文。

【必须包含的单词】
${wordList}

【单词释义参考】
${wordMeanings}

【难度要求】
${DIFFICULTY_DESC[difficulty]}

【字数要求】
文章长度严格控制在 ${wordCount} 词左右（允许上下浮动 10%），不要过长也不要太短。

【写作要求】
1. 文章必须自然地使用上述所有单词，不要生硬堆砌
2. 内容应有完整的情节或论述逻辑，可读性强
3. 不要在文章中标注单词或加注中文
4. 只输出文章正文，不要加标题、不要加任何说明文字
5. 用换行符分隔段落`;

  // 根据字数动态调整 max_tokens（留出余量）
  const maxTokens = Math.min(Math.max(Math.round(wordCount * 3), 800), 4096);
  return callDeepSeek(systemPrompt, userPrompt, 0.8, maxTokens);
}

/**
 * 基于文章和选中单词生成题目
 *
 * 生成 4 道题：2 道填空 + 2 道选择。返回 JSON 数组。
 */
export async function generateQuiz(
  article: string,
  words: Word[],
): Promise<QuizQuestion[]> {
  const wordList = words.map((w) => w.word).join(", ");

  const systemPrompt = `你是一位严谨的英语阅读理解出题专家，擅长根据阅读材料设计考察词汇理解和上下文推断的题目。你必须严格按照 JSON 格式输出，不输出任何说明文字。`;

  const userPrompt = `请基于以下文章和单词，生成 4 道题目：2 道填空题 + 2 道单项选择题。

【文章】
${article}

【考察单词】
${wordList}

【出题要求】
1. 题目应考察对文章内容和指定单词的理解
2. 填空题：从文章中摘取包含目标单词的原句，将目标单词替换为空位 ___
3. 选择题：4 个选项（A/B/C/D），干扰项应合理但不正确
4. 每题附简短解析

【输出格式】
只输出 JSON 数组，不要 markdown 代码块，不要任何说明文字。格式如下：
[
  {
    "type": "fill_blank",
    "stem": "填空题题干说明",
    "sentence": "原句，包含 ___ 表示空位",
    "answer": "正确答案单词",
    "explanation": "简短解析"
  },
  {
    "type": "choice",
    "stem": "选择题题干",
    "options": [
      { "key": "A", "text": "选项A内容" },
      { "key": "B", "text": "选项B内容" },
      { "key": "C", "text": "选项C内容" },
      { "key": "D", "text": "选项D内容" }
    ],
    "answer": "B",
    "explanation": "简短解析"
  }
]`;

  const raw = await callDeepSeek(systemPrompt, userPrompt, 0.5, 2048);

  // 清理可能存在的 markdown 代码块包裹
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("题目解析失败：API 返回的 JSON 格式异常");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("题目解析失败：返回内容不是数组");
  }

  // 规范化并补全 id
  const questions: QuizQuestion[] = parsed.map((item, idx) => {
    const q = item as Partial<QuizQuestion>;
    return {
      id: `q_${Date.now()}_${idx}`,
      type: q.type === "choice" ? "choice" : "fill_blank",
      stem: q.stem || "",
      sentence: q.sentence,
      options: Array.isArray(q.options) ? q.options : undefined,
      answer: q.answer || "",
      explanation: q.explanation,
    };
  });

  if (questions.length === 0) {
    throw new Error("未生成有效题目");
  }

  return questions;
}

/**
 * 批改用户答案。
 *
 * 对于填空题：忽略大小写、去除首尾空格后与正确答案比对；
 * 允许单复数差异（简单容错：用户答案是正确答案的子串或反之即算对）。
 * 对于选择题：直接比对选项 key。
 *
 * 由本地判定，无需再次请求 API，节省额度。
 */
export function gradeAnswer(
  question: QuizQuestion,
  userAnswer: string,
): { correct: boolean; explanation: string } {
  const ua = userAnswer.trim().toLowerCase();
  const ca = question.answer.trim().toLowerCase();

  if (!ua) {
    return {
      correct: false,
      explanation: "未作答。" + (question.explanation ? ` 正解：${question.answer}。${question.explanation}` : ""),
    };
  }

  let correct: boolean;
  if (question.type === "choice") {
    correct = ua === ca;
  } else {
    // 填空题：精确匹配，或容忍单复数/时态变形（子串包含）
    correct =
      ua === ca ||
      ua.includes(ca) ||
      ca.includes(ua) ||
      // 去掉常见后缀后再比对
      ua.replace(/(s|ed|ing|es)$/, "") === ca.replace(/(s|ed|ing|es)$/, "");
  }

  return {
    correct,
    explanation: correct
      ? `正确！${question.explanation ? question.explanation : ""}`
      : `不正确。正解：${question.answer}。${question.explanation ? question.explanation : ""}`,
  };
}

/**
 * 调用 DeepSeek API 翻译英文文章为中文
 * 逐段翻译，保留原文段落结构
 */
export async function translateArticle(article: string): Promise<string> {
  const systemPrompt = `你是一位专业的英汉翻译专家，擅长将英语文章翻译成通顺自然的中文。`;

  const userPrompt = `请将以下英文文章翻译成中文。

【要求】
1. 逐段翻译，保留原文的段落结构（用换行符分隔）
2. 翻译要通顺自然，符合中文表达习惯
3. 只输出翻译结果，不要加任何说明或标注
4. 不要保留英文原文

【文章】
${article}`;

  return callDeepSeek(systemPrompt, userPrompt, 0.3, 2048);
}


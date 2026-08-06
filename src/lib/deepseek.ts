import type { Word } from "@/types";
import { isUnlocked } from "@/lib/auth";

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

/**
 * 时态倾向选项（8 种）
 * 用户可多选，AI 生成文章时会倾向于使用所选时态
 */
export type Tense =
  | "simple_present" // 一般现在时
  | "simple_past" // 一般过去时
  | "simple_future" // 一般将来时
  | "past_future" // 过去将来时
  | "present_continuous" // 现在进行时
  | "past_continuous" // 过去进行时
  | "present_perfect" // 现在完成时
  | "past_perfect"; // 过去完成时

export const TENSE_LABELS: Record<Tense, string> = {
  simple_present: "一般现在时",
  simple_past: "一般过去时",
  simple_future: "一般将来时",
  past_future: "过去将来时",
  present_continuous: "现在进行时",
  past_continuous: "过去进行时",
  present_perfect: "现在完成时",
  past_perfect: "过去完成时",
};

/** 时态对应的英文写作提示（给 AI 的指令） */
const TENSE_INSTRUCTIONS: Record<Tense, string> = {
  simple_present: "一般现在时（simple present）：表达习惯、事实或普遍真理",
  simple_past: "一般过去时（simple past）：表达过去发生的动作或状态",
  simple_future: "一般将来时（simple future）：表达将要发生的动作或状态",
  past_future: "过去将来时（past future）：从过去某时刻看将要发生的动作",
  present_continuous: "现在进行时（present continuous）：表达正在进行的动作",
  past_continuous: "过去进行时（past continuous）：表达过去某时刻正在进行的动作",
  present_perfect: "现在完成时（present perfect）：表达过去发生并对现在有影响的动作",
  past_perfect: "过去完成时（past perfect）：表达过去某时间点之前已完成的动作",
};

/**
 * 文章风格倾向选项（5 种）
 * 用户可多选，AI 生成文章时会倾向于使用所选风格
 */
export type ArticleStyle =
  | "narrative" // 记叙文
  | "expository" // 说明文
  | "argumentative" // 议论文
  | "practical" // 应用文
  | "dialogue"; // 对话模拟文

export const STYLE_LABELS: Record<ArticleStyle, string> = {
  narrative: "记叙文",
  expository: "说明文",
  argumentative: "议论文",
  practical: "应用文",
  dialogue: "对话模拟文",
};

/** 风格对应的英文写作提示（给 AI 的指令） */
const STYLE_INSTRUCTIONS: Record<ArticleStyle, string> = {
  narrative: "记叙文（narrative）：讲述事件或故事，包含人物、情节、时间、地点",
  expository: "说明文（expository）：客观说明事物或解释事理，结构清晰",
  argumentative: "议论文（argumentative）：提出观点并用论据论证，说服读者",
  practical: "应用文（practical）：实用文体，如书信、通知、日记、邮件等",
  dialogue: "对话模拟文（dialogue）：模拟两个或多个人物 ABC 切换的对话形式",
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
  // AI 文章生成为高级功能，需解锁后使用（管理员默认已解锁）
  if (!isUnlocked()) {
    throw new Error("AI 文章生成需解锁高级功能，请在设置中输入密钥");
  }
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
      // 关闭思考模式，避免推理 token 耗尽 max_tokens 预算
      thinking: { type: "disabled" },
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
 * @param tenses 时态倾向（多选，空数组表示不限）
 * @param styles 文章风格倾向（多选，空数组表示不限）
 */
export async function generateArticle(
  words: Word[],
  difficulty: Difficulty,
  wordCount: number = 50,
  tenses: Tense[] = [],
  styles: ArticleStyle[] = [],
): Promise<string> {
  const wordList = words.map((w) => w.word).join(", ");
  const wordMeanings = words
    .map((w) => `${w.word} (${w.pos} ${w.meaning})`)
    .join("\n");

  const systemPrompt = `你是一位专业的英语教育内容创作者，擅长根据指定单词编写生动有趣的英语阅读文章。`;

  // 构建时态倾向提示
  const tenseSection =
    tenses.length > 0
      ? `【时态倾向】
请在文章中倾向于使用以下时态，在需要时态的地方优先采用：
${tenses.map((t) => `- ${TENSE_INSTRUCTIONS[t]}`).join("\n")}
注意：是"倾向于"使用，不是"只能"使用。为保证文章自然，可适当穿插其他时态作为辅助。`
      : "";

  // 构建文章风格倾向提示
  const styleSection =
    styles.length > 0
      ? `【文章风格倾向】
请采用以下风格作为文章主体风格：
${styles.map((s) => `- ${STYLE_INSTRUCTIONS[s]}`).join("\n")}
${styles.includes("dialogue") ? "注意：对话模拟文使用 A/B/C 等标签前缀区分不同说话者，每行一句对话。" : ""}
${styles.length > 1 ? "如选择了多个风格，可融合多种风格特点，但应有主次。" : ""}`
      : "";

  // 组装最终 prompt
  const sections = [
    `请基于以下单词，创作一篇英语短文。`,
    `【必须包含的单词】
${wordList}`,
    `【单词释义参考】
${wordMeanings}`,
    `【难度要求】
${DIFFICULTY_DESC[difficulty]}`,
    `【字数要求】
文章长度严格控制在 ${wordCount} 词左右（允许上下浮动 10%），不要过长也不要太短。`,
    tenseSection,
    styleSection,
    `【写作要求】
1. 文章必须自然地使用上述所有单词，不要生硬堆砌
2. 内容应有完整的情节或论述逻辑，可读性强
3. 不要在文章中标注单词或加注中文
4. 只输出文章正文，不要加标题、不要加任何说明文字
5. 用换行符分隔段落`,
  ].filter(Boolean);

  const userPrompt = sections.join("\n\n");

  // 根据字数动态调整 max_tokens（留出余量）
  const maxTokens = Math.min(Math.max(Math.round(wordCount * 3), 800), 4096);
  return callDeepSeek(systemPrompt, userPrompt, 0.8, maxTokens);
}

/**
 * 基于文章和选中单词生成题目
 *
 * 生成 4 道题：2 道填空 + 2 道选择。返回 JSON 数组。
 *
 * existingStems 用于追加题目时避免与已有题目重复。
 */
export async function generateQuiz(
  article: string,
  words: Word[],
  existingStems?: string[],
): Promise<QuizQuestion[]> {
  const wordList = words.map((w) => w.word).join(", ");

  const systemPrompt = `你是一位严谨的英语阅读理解出题专家，擅长根据阅读材料设计考察词汇理解和上下文推断的题目。你必须严格按照 JSON 格式输出，不输出任何说明文字。`;

  const avoidRepeat =
    existingStems && existingStems.length > 0
      ? `\n5. 不要与以下已有题目重复（题干、考点句、考察角度都应不同）：\n${existingStems.map((s, i) => `${i + 1}. ${s}`).join("\n")}`
      : "";

  const userPrompt = `请基于以下文章和单词，生成 4 道题目：2 道填空题 + 2 道单项选择题。

【文章】
${article}

【考察单词】
${wordList}

【出题要求】
1. 题目应考察对文章内容和指定单词的理解
2. 填空题：从文章中摘取包含目标单词的原句，将目标单词替换为空位 ___
3. 选择题：4 个选项（A/B/C/D），干扰项应合理但不正确
4. 每题附简短解析${avoidRepeat}

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

/** 中文释义条目 */
export interface CnMeaning {
  /** 词性（中文，如"名词"、"动词"） */
  pos: string;
  /** 中文释义（简短，1-2 句） */
  meaning: string;
}

/**
 * 调用 DeepSeek API 查询单词的中文释义
 *
 * 返回简短的中文释义，按词性分组，每个词性 1 条释义。
 * 用于词典弹窗中补充中文意思。
 */
export async function lookupWordMeaning(word: string): Promise<CnMeaning[]> {
  const systemPrompt = `你是一位专业的英汉词典编辑，擅长用简洁准确的中文解释英语单词。你必须严格按照 JSON 格式输出，不输出任何说明文字。`;

  const userPrompt = `请查询单词 "${word}" 的中文释义。

【要求】
1. 按词性分组，每个词性给出 1 条简短中文释义（不超过 20 字）
2. 只输出最常见的 1-3 个词性
3. 释义要简洁准确，不要冗长

【输出格式】
只输出 JSON 数组，不要 markdown 代码块，不要任何说明文字。格式如下：
[
  { "pos": "名词", "meaning": "简短中文释义" },
  { "pos": "动词", "meaning": "简短中文释义" }
]`;

  const raw = await callDeepSeek(systemPrompt, userPrompt, 0.3, 512);

  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => {
      const m = item as Partial<CnMeaning>;
      return {
        pos: m.pos || "",
        meaning: m.meaning || "",
      };
    })
    .filter((m) => m.pos && m.meaning);
}


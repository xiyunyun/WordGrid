import type { Word } from "@/types";

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string;
const API_URL = "https://api.deepseek.com/chat/completions";

export type Difficulty = "beginner" | "intermediate" | "advanced";

const DIFFICULTY_DESC: Record<Difficulty, string> = {
  beginner:
    "适合初学者，使用简单句型和基础词汇，句子简短，时态以一般现在时为主",
  intermediate:
    "适合中级学习者，句型多样，包含从句和复合句，时态丰富",
  advanced:
    "适合高级学习者，使用复杂句型、高级词汇和修辞手法，接近母语表达",
};

/**
 * 调用 DeepSeek API，基于选中的单词生成一篇英文文章
 * 返回纯文本文章（可能包含段落）
 */
export async function generateArticle(
  words: Word[],
  difficulty: Difficulty,
): Promise<string> {
  if (!API_KEY) {
    throw new Error("未配置 DeepSeek API Key，请在 .env.local 中设置 VITE_DEEPSEEK_API_KEY");
  }

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

【写作要求】
1. 文章必须自然地使用上述所有单词，不要生硬堆砌
2. 文章长度 150-300 词，分为 2-4 段
3. 内容应有完整的情节或论述逻辑，可读性强
4. 不要在文章中标注单词或加注中文
5. 只输出文章正文，不要加标题、不要加任何说明文字
6. 用换行符分隔段落`;

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
      temperature: 0.8,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API 请求失败 (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("API 返回内容为空或格式异常");
  }

  return content.trim();
}

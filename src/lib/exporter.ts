/**
 * 单词本导出工具
 *
 * 支持四种格式：TXT / Markdown / CSV / Anki
 * 支持三种内容范围：仅单词 / 单词+词意 / 单词+词意+笔记
 *
 * Anki 格式说明：制表符分隔字段，正面=单词+音标+词性，背面=词意+笔记。
 *   导入 Anki 时选择"基础（含正反面的卡片）"类型，字段以制表符分隔。
 */
import type { Word } from "@/types";

/** 导出格式 */
export type ExportFormat = "txt" | "md" | "csv" | "anki";

/** 导出内容范围 */
export type ExportScope = "word_only" | "word_meaning" | "word_meaning_note";

/** CSV 字段转义：含逗号、引号、换行的需用双引号包裹，内部双引号转义为两个 */
function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/** 生成导出文件内容 */
export function buildExportContent(
  words: Word[],
  format: ExportFormat,
  scope: ExportScope,
): string {
  // 按添加时间正序导出（更自然的阅读顺序）
  const sorted = [...words].sort((a, b) => a.createdAt - b.createdAt);

  switch (format) {
    case "txt":
      return buildTxt(sorted, scope);
    case "md":
      return buildMd(sorted, scope);
    case "csv":
      return buildCsv(sorted, scope);
    case "anki":
      return buildAnki(sorted, scope);
  }
}

/** 生成文件名 */
export function buildFileName(format: ExportFormat, scope: ExportScope): string {
  const date = new Date().toISOString().slice(0, 10);
  const scopeSuffix =
    scope === "word_only"
      ? "words"
      : scope === "word_meaning"
        ? "words-meaning"
        : "words-full";
  const ext = format === "anki" ? "txt" : format;
  return `wordgrid-${scopeSuffix}-${date}.${ext}`;
}

/* ============ TXT 格式 ============ */
function buildTxt(words: Word[], scope: ExportScope): string {
  return words
    .map((w) => {
      if (scope === "word_only") return w.word;
      if (scope === "word_meaning") return `${w.word}  ${w.meaning}`;
      // word_meaning_note
      const notePart = w.note ? `  | ${w.note}` : "";
      return `${w.word}  ${w.meaning}${notePart}`;
    })
    .join("\n");
}

/* ============ Markdown 格式 ============ */
function buildMd(words: Word[], scope: ExportScope): string {
  const header = "# WordGrid 单词本导出\n\n";
  const date = `> 导出时间：${new Date().toLocaleString("zh-CN")}  \n> 单词总数：${words.length}\n\n`;

  if (scope === "word_only") {
    const list = words.map((w) => `- ${w.word}`).join("\n");
    return header + date + list + "\n";
  }

  if (scope === "word_meaning") {
    const table =
      "| 单词 | 词性 | 释义 |\n| --- | --- | --- |\n" +
      words
        .map((w) => `| ${w.word} | ${w.pos || "-"} | ${w.meaning} |`)
        .join("\n");
    return header + date + table + "\n";
  }

  // word_meaning_note
  const table =
    "| 单词 | 音标 | 词性 | 释义 | 笔记 |\n| --- | --- | --- | --- | --- |\n" +
    words
      .map(
        (w) =>
          `| ${w.word} | ${w.phonetic || "-"} | ${w.pos || "-"} | ${w.meaning} | ${w.note ? w.note.replace(/\n/g, "<br>") : "-"} |`,
      )
      .join("\n");
  return header + date + table + "\n";
}

/* ============ CSV 格式 ============ */
function buildCsv(words: Word[], scope: ExportScope): string {
  if (scope === "word_only") {
    const header = "word\n";
    const rows = words.map((w) => csvEscape(w.word)).join("\n");
    return header + rows + "\n";
  }

  if (scope === "word_meaning") {
    const header = "word,phonetic,pos,meaning\n";
    const rows = words
      .map(
        (w) =>
          `${csvEscape(w.word)},${csvEscape(w.phonetic || "")},${csvEscape(w.pos)},${csvEscape(w.meaning)}`,
      )
      .join("\n");
    return header + rows + "\n";
  }

  // word_meaning_note
  const header = "word,phonetic,pos,meaning,note\n";
  const rows = words
    .map(
      (w) =>
        `${csvEscape(w.word)},${csvEscape(w.phonetic || "")},${csvEscape(w.pos)},${csvEscape(w.meaning)},${csvEscape(w.note || "")}`,
    )
    .join("\n");
  return header + rows + "\n";
}

/* ============ Anki 格式（制表符分隔，正面↔背面） ============ */
function buildAnki(words: Word[], scope: ExportScope): string {
  // Anki 导入格式：每行一个卡片，字段以 Tab 分隔
  // 基础卡片类型：正面 \t 背面
  // 正面：单词（+音标+词性）  背面：词意（+笔记）
  return words
    .map((w) => {
      // 正面：单词 + 音标 + 词性（HTML 格式，换行用 <br>）
      const frontParts: string[] = [`<b>${w.word}</b>`];
      if (w.phonetic) frontParts.push(`<i>${w.phonetic}</i>`);
      if (w.pos) frontParts.push(`<span style="color:#888;">${w.pos}</span>`);
      const front = frontParts.join("<br>");

      // 背面：根据 scope 决定内容
      if (scope === "word_only") {
        // 仅单词模式：背面留音标+词性作为提示
        return `${front}\t${w.phonetic || w.pos || ""}`;
      }

      const backParts: string[] = [w.meaning];
      if (scope === "word_meaning_note" && w.note) {
        backParts.push(`<hr><span style="color:#555;">${w.note.replace(/\n/g, "<br>")}</span>`);
      }
      const back = backParts.join("<br>");

      return `${front}\t${back}`;
    })
    .join("\n");
}

/** 触发浏览器下载文件 */
export function downloadFile(content: string, fileName: string): void {
  // 添加 BOM 以确保 Excel 等软件正确识别 UTF-8 编码的 CSV
  const bom = fileName.endsWith(".csv") ? "\uFEFF" : "";
  const blob = new Blob([bom + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

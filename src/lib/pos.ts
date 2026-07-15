/**
 * 英语标准词性列表（含 8 大词性及常见细分）
 *
 * 添加单词抽屉的词性多选、积木造文的词性筛选等处共用此列表，
 * 保证词性选项的一致性，避免从单词数据动态提取导致多词性被当成整体。
 */
export const COMMON_POS = [
  "n.",       // noun 名词
  "v.",       // verb 动词
  "adj.",     // adjective 形容词
  "adv.",     // adverb 副词
  "pron.",    // pronoun 代词
  "prep.",    // preposition 介词
  "conj.",    // conjunction 连词
  "interj.",  // interjection 感叹词
  "art.",     // article 冠词
  "num.",     // numeral 数词
  "aux.",     // auxiliary verb 助动词
  "modal v.", // modal verb 情态动词
  "vt.",      // transitive verb 及物动词
  "vi.",      // intransitive verb 不及物动词
  "abbr.",    // abbreviation 缩写
];

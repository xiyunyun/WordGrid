import { useState, useEffect, useCallback } from "react";

interface ClipboardState {
  text: string | null;
  isWord: boolean;
  check: () => void;
  clear: () => void;
}

const WORD_REGEX = /^[a-zA-Z][a-zA-Z'-]*$/;

export function useClipboardWord(): ClipboardState {
  const [text, setText] = useState<string | null>(null);
  const [isWord, setIsWord] = useState(false);

  const check = useCallback(async () => {
    try {
      // navigator.clipboard 可能在非 HTTPS / 非聚焦时不可用
      if (!navigator.clipboard?.readText) return;
      const content = await navigator.clipboard.readText();
      if (!content) return;
      const trimmed = content.trim();
      // 只处理短文本（≤32 字符），且若为纯英文单词则识别为单词
      if (trimmed.length > 32) return;
      const looksLikeWord = WORD_REGEX.test(trimmed);
      setText(trimmed);
      setIsWord(looksLikeWord);
    } catch {
      // 用户拒绝或浏览器不支持，静默失败
    }
  }, []);

  const clear = useCallback(() => {
    setText(null);
    setIsWord(false);
  }, []);

  // 首次挂载与窗口聚焦时检测
  useEffect(() => {
    const t = setTimeout(check, 600);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  return { text, isWord, check, clear };
}

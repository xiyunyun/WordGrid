import type { Word } from "@/types";

// 首次启动时不注入任何示例数据，保持页面干净
export function buildSeedWords(): Word[] {
  return [];
}

import DatePicker from "./DatePicker";
import BackToTop from "./BackToTop";

interface FloatingActionsProps {
  onJumpDate: (date: string) => void;
}

/**
 * 浮动操作按钮组 - 固定在页面右下角
 * 上方：返回顶部按钮（滚动出现）
 * 下方：日期选择器（点击弹出二级菜单）
 */
export default function FloatingActions({ onJumpDate }: FloatingActionsProps) {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      <BackToTop />
      <DatePicker onJump={onJumpDate} />
    </div>
  );
}

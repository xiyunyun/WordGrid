import { useState, useEffect, useCallback } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AddWordDrawer from "@/components/AddWordDrawer";
import FloatingActions from "@/components/FloatingActions";
import DueTodayModal from "@/components/DueTodayModal";
import NoteModal from "@/components/NoteModal";
import UpdateNotice from "@/components/UpdateNotice";
import ImportantNoticeFloat from "@/components/ImportantNoticeFloat";
import DailyGrid from "@/pages/DailyGrid";
import Wordbook from "@/pages/Wordbook";
import ArticleBuilder from "@/pages/ArticleBuilder";
import Stats from "@/pages/Stats";
import About from "@/pages/About";
import LoginPage from "@/pages/Login";
import { useWordStore, selectDueWords, selectTomorrowWords } from "@/store/wordStore";
import { buildSeedWords } from "@/store/seedData";
import { isAuthenticated, logout, getCurrentUser } from "@/lib/auth";
import {
  isCloudConfigured,
  getCloudId,
  setCloudId,
  smartDownload,
  uploadToCloud,
  uploadKeepalive,
  setLocalLastModified,
} from "@/lib/cloudSync";
import type { Word } from "@/types";

const SEED_FLAG_KEY = "wordgrid-seeded";

/** 跳转到指定日期行 - 平滑滚动 + 高亮闪烁 */
function jumpToDate(date: string) {
  const el = document.getElementById(`date-${date}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // 短暂高亮提示
  el.classList.add("ring-2", "ring-accent-gold", "ring-offset-2", "ring-offset-paper");
  window.setTimeout(() => {
    el.classList.remove(
      "ring-2",
      "ring-accent-gold",
      "ring-offset-2",
      "ring-offset-paper",
    );
  }, 1600);
}

/** 仅在主页显示浮动按钮组的内层组件 */
function AppContent({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDate, setDrawerDate] = useState<string | undefined>(undefined);
  const [editWord, setEditWord] = useState<Word | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteWord, setNoteWord] = useState<Word | null>(null);
  const [dueModalOpen, setDueModalOpen] = useState(false);
  // 弹窗打开瞬间锁定的待复习词快照 —— 复习过程中 store 更新不会改变此列表
  const [dueModalWords, setDueModalWords] = useState<Word[]>([]);
  // 明日到期词快照 —— 用于"提前复习明日"模式
  const [dueModalTomorrowWords, setDueModalTomorrowWords] = useState<Word[]>(
    [],
  );

  const words = useWordStore((s) => s.words);
  const hydrated = useWordStore((s) => s.hydrated);

  // 首次启动注入示例数据
  useEffect(() => {
    if (!hydrated) return;
    if (words.length === 0 && !localStorage.getItem(SEED_FLAG_KEY)) {
      const seed = buildSeedWords();
      useWordStore.setState({ words: seed });
      localStorage.setItem(SEED_FLAG_KEY, "1");
    }
  }, [hydrated, words.length]);

  // 云端存档自动同步：智能下载 + debounce 上传 + 退出兜底
  useEffect(() => {
    if (!hydrated) return;
    if (!isCloudConfigured()) return;

    // 确保 cloudId 已设置（默认用登录用户名）
    if (!getCloudId()) {
      const user = getCurrentUser();
      if (user?.username) {
        setCloudId(user.username);
      } else {
        return;
      }
    }

    // 1. 打开时智能下载（比较时间戳，云端更新才下载）
    let cancelled = false;
    smartDownload().then((r) => {
      if (cancelled) return;
      if (r.success && !r.skipped) {
        // 下载了新数据，刷新页面让 Zustand 重新加载
        setTimeout(() => window.location.reload(), 1500);
      }
    }).catch(() => {});

    // 2. 订阅 store 变化，debounce 3 分钟自动上传
    //    3 分钟间隔避免频繁上传触发 Gitee API 限制（5-6 用户安全）
    let uploadTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useWordStore.subscribe((state) => {
      if (!state.hydrated) return;
      setLocalLastModified();
      if (uploadTimer) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => {
        uploadToCloud().catch(() => {});
      }, 180000);
    });

    // 3. 页面隐藏/关闭时尽力上传（keepalive 兜底）
    const handler = () => {
      if (document.visibilityState === "hidden") {
        uploadKeepalive();
      }
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("beforeunload", handler);

    return () => {
      cancelled = true;
      unsubscribe();
      if (uploadTimer) clearTimeout(uploadTimer);
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [hydrated]);

  const openDrawer = useCallback((date?: string) => {
    setEditWord(null);
    setDrawerDate(date);
    setDrawerOpen(true);
  }, []);

  const openEditDrawer = useCallback((word: Word) => {
    setEditWord(word);
    setDrawerOpen(true);
  }, []);

  const openNoteModal = useCallback((word: Word) => {
    setNoteWord(word);
    setNoteModalOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditWord(null);
  }, []);

  // 打开 Due Today 弹窗时锁定当前待复习词快照 + 明日到期词快照
  const openDueModal = useCallback(() => {
    setDueModalWords(selectDueWords(words));
    setDueModalTomorrowWords(selectTomorrowWords(words));
    setDueModalOpen(true);
  }, [words]);

  const isHomePage = location.pathname === "/";

  return (
    <>
      <AppShell onQuickAdd={() => openDrawer()} onLogout={onLogout}>
        <Routes>
          <Route
            path="/"
            element={
              <DailyGrid
                onRequestAdd={openDrawer}
                onReviewDue={openDueModal}
                onRequestEdit={openEditDrawer}
                onRequestNote={openNoteModal}
              />
            }
          />
          <Route path="/wordbook" element={<Wordbook />} />
          <Route path="/blocks" element={<ArticleBuilder />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </AppShell>

      {/* 浮动操作组 - 仅主页显示 */}
      {isHomePage && <FloatingActions onJumpDate={jumpToDate} />}

      {/* 重要更新浮窗 - 仅主页显示 */}
      {isHomePage && <ImportantNoticeFloat />}

      {/* Due Today 复习弹窗 —— 即使复习后 due 数变为 0 也不自动关闭 */}
      <DueTodayModal
        open={dueModalOpen}
        onClose={() => setDueModalOpen(false)}
        words={dueModalWords}
        tomorrowWords={dueModalTomorrowWords}
      />

      {/* 笔记查看弹窗 */}
      <NoteModal
        open={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        word={noteWord}
      />

      <AddWordDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        defaultDate={drawerDate}
        editWord={editWord}
      />
    </>
  );
}

export default function App() {
  // 认证状态：首次从 localStorage 读取
  const [authed, setAuthed] = useState(() => isAuthenticated());

  const handleLoginSuccess = () => setAuthed(true);

  const handleLogout = () => {
    logout();
    setAuthed(false);
  };

  // 未登录 → 显示登录页（不包含 Router，纯静态）
  if (!authed) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // 已登录 → 显示主应用
  return (
    <Router>
      <AppContent onLogout={handleLogout} />
      <UpdateNotice />
    </Router>
  );
}

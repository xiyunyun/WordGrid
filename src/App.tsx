import { useState, useEffect, useCallback } from "react";
import { HashRouter as Router, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import AddWordDrawer from "@/components/AddWordDrawer";
import FloatingActions from "@/components/FloatingActions";
import DueTodayModal from "@/components/DueTodayModal";
import NoteModal from "@/components/NoteModal";
import UpdateNotice from "@/components/UpdateNotice";
import ImportantNoticeFloat from "@/components/ImportantNoticeFloat";
import WordSearchModal from "@/components/WordSearchModal";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import ThemePanel from "@/components/ThemePanel";
import DailyGrid from "@/pages/DailyGrid";
import Wordbook from "@/pages/Wordbook";
import ArticleBuilder from "@/pages/ArticleBuilder";
import Stats from "@/pages/Stats";
import About from "@/pages/About";
import Essays from "@/pages/Essays";
import Settings from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import StudyTimeTracker from "@/components/StudyTimeTracker";
import { useWordStore, selectDueWords, selectTomorrowWords } from "@/store/wordStore";
import { useArticleStore } from "@/store/articleStore";
import { useDateNotesStore } from "@/store/dateNotes";
import { useEssayStore } from "@/store/essayStore";
import { useThemeStore } from "@/store/theme";
import { useSettingsStore } from "@/store/settingsStore";
import { useUnlockStore } from "@/store/unlock";
import { __setVolumeGetter } from "@/lib/tts";
import { buildSeedWords } from "@/store/seedData";
import { todayKey } from "@/lib/review";
import { isAuthenticated, logout, getCurrentUser, isGuest, isUnlocked } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  pullAll,
  pullUserSettings,
  subscribeChanges,
  subscribeUserSettings,
  migrateFromLocal,
  setMigratedToSupabase,
} from "@/lib/cloudSyncSupabase";
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
  const navigate = useNavigate();
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
  // 全局搜索结果弹窗 —— 顶部搜索栏选中单词后弹出
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchWord, setSearchWord] = useState<Word | null>(null);
  // 主题选择面板
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  // 随笔页面外部添加触发器 —— 在 Essays 页面点击全局 Add 按钮时自增
  const [essayAddTrigger, setEssayAddTrigger] = useState(0);

  const words = useWordStore((s) => s.words);
  const hydrated = useWordStore((s) => s.hydrated);

  // 主题应用：监听 themeId 和 customHue 变化，写入 CSS 变量
  const themeId = useThemeStore((s) => s.themeId);
  const customHue = useThemeStore((s) => s.customHue);
  useEffect(() => {
    useThemeStore.getState().apply();
  }, [themeId, customHue]);

  // 首次启动注入示例数据
  useEffect(() => {
    if (!hydrated) return;
    if (words.length === 0 && !localStorage.getItem(SEED_FLAG_KEY)) {
      const seed = buildSeedWords();
      useWordStore.setState({ words: seed });
      localStorage.setItem(SEED_FLAG_KEY, "1");
    }
  }, [hydrated, words.length]);

  // 云端存档同步：Supabase Realtime（替代旧的 Gitee 强制刷新方案）
  useEffect(() => {
    if (!hydrated) {
      console.log("[云同步] 等待 store hydrated...");
      return;
    }
    // 开发环境（npm run dev / localhost）禁用云同步，避免测试数据污染生产环境
    // 生产环境（构建后的版本）正常启用云同步
    // 如需在 localhost 测试云同步功能，可临时注释此判断
    if (import.meta.env.DEV) {
      console.warn(
        "[云同步] 开发模式（localhost），已禁用云同步以隔离测试数据与生产数据",
      );
      return;
    }
    if (!isSupabaseConfigured()) {
      console.warn(
        "[云同步] Supabase 未配置，URL:",
        !!import.meta.env.VITE_SUPABASE_URL,
        "KEY:",
        !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      );
      return;
    }
    // 游客模式：不参与云同步，数据完全本地化
    if (isGuest()) {
      console.log("[云同步] 游客模式，跳过云同步");
      return;
    }
    // 未解锁的注册用户：云存档不可用，仅本地使用
    if (!isUnlocked()) {
      console.log("[云同步] 未解锁高级功能，跳过云同步");
      return;
    }
    const user = getCurrentUser();
    if (!user?.username) {
      console.warn("[云同步] 用户未登录，跳过同步");
      return;
    }
    console.log("[云同步] 初始化同步，用户:", user.username);

    let unsubscribeRealtime: (() => void) | null = null;
    let unsubscribeSettings: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      // 1. 先拉取云端数据（判断云端是否已有该用户的数据）
      console.log("[云同步] 开始拉取云端数据，用户:", user.username);
      const pullRes = await pullAll();
      if (cancelled) return;

      if (!pullRes.success) {
        console.error("[云同步] 拉取失败:", pullRes.error);
      } else {
        console.log(
          "[云同步] 拉取成功，总数据量:",
          pullRes.count,
          "words:",
          pullRes.data?.words.length,
          "logs:",
          pullRes.data?.logs.length,
          "articles:",
          pullRes.data?.articles.length,
          "dateNotes:",
          pullRes.data ? Object.keys(pullRes.data.dateNotes).length : 0,
        );
      }

      // 1b. 拉取用户设置（学习时长）
      const settingsRes = await pullUserSettings();
      if (cancelled) return;
      if (settingsRes.success && typeof settingsRes.totalSeconds === "number") {
        useSettingsStore.getState().setSyncEnabled(false);
        try {
          useSettingsStore.getState().hydrateFromCloud(settingsRes.totalSeconds);
        } finally {
          useSettingsStore.getState().setSyncEnabled(true);
        }
        console.log("[云同步] 学习时长:", settingsRes.totalSeconds, "秒");
      }

      if (pullRes.success && pullRes.data && (pullRes.count ?? 0) > 0) {
        // 云端已有数据：用云端数据覆盖本地（云端是 source of truth）
        const { words, logs, articles, dateNotes, essays } = pullRes.data;
        useWordStore.getState().setSyncEnabled(false);
        useArticleStore.getState().setSyncEnabled(false);
        useDateNotesStore.getState().setSyncEnabled(false);
        useEssayStore.getState().setSyncEnabled(false);
        try {
          useWordStore.getState().hydrateFromCloud(words, logs);
          useArticleStore.getState().hydrateFromCloud(articles);
          useDateNotesStore.getState().hydrateFromCloud(dateNotes);
          useEssayStore.getState().hydrateFromCloud(essays);
        } finally {
          useWordStore.getState().setSyncEnabled(true);
          useArticleStore.getState().setSyncEnabled(true);
          useDateNotesStore.getState().setSyncEnabled(true);
          useEssayStore.getState().setSyncEnabled(true);
        }
        // 标记为已迁移（云端已有数据，本地已同步）
        setMigratedToSupabase();
        console.log(`[云同步] 已从云端拉取 ${pullRes.count} 条数据`);
      } else {
        // 云端无数据：执行首次迁移，把本地数据上传到 Supabase
        console.log("[云同步] 云端无数据，执行首次迁移");
        const migrationRes = await migrateFromLocal(
          useWordStore.getState().words,
          useWordStore.getState().logs,
          useArticleStore.getState().archives,
          useDateNotesStore.getState().notes,
          useEssayStore.getState().essays,
        );
        if (cancelled) return;
        if (migrationRes.success) {
          console.log("[云同步] 迁移结果:", migrationRes.message || "成功");
        } else {
          console.error("[云同步] 迁移失败:", migrationRes.error);
        }
      }

      // 2. 订阅 Realtime 变更（其他设备的修改会实时推送到本机）
      unsubscribeRealtime = subscribeChanges({
        onWordChange: (type, word) => {
          useWordStore.getState().applyRemoteWord(type, word);
        },
        onReviewLogChange: (type, log) => {
          useWordStore.getState().applyRemoteLog(type, log);
        },
        onArticleChange: (type, article) => {
          useArticleStore.getState().applyRemoteArticle(type, article);
        },
        onDateNoteChange: (type, date, note) => {
          useDateNotesStore.getState().applyRemoteNote(type, date, note);
        },
        onEssayChange: (type, essay) => {
          useEssayStore.getState().applyRemoteEssay(type, essay);
        },
      });

      // 2b. 订阅 user_settings 表变更（其他设备更新学习时长时实时同步）
      unsubscribeSettings = subscribeUserSettings((totalSeconds) => {
        useSettingsStore.getState().setSyncEnabled(false);
        try {
          useSettingsStore.getState().hydrateFromCloud(totalSeconds);
        } finally {
          useSettingsStore.getState().setSyncEnabled(true);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, [hydrated]);

  const openDrawer = useCallback((date?: string) => {
    setEditWord(null);
    setDrawerDate(date);
    setDrawerOpen(true);
  }, []);

  // 全局 Add 按钮分发：在 Essays 页面触发随笔添加抽屉，其他页面打开单词添加抽屉
  const handleQuickAdd = useCallback(() => {
    if (location.pathname === "/essays") {
      setEssayAddTrigger((n) => n + 1);
    } else {
      openDrawer();
    }
  }, [location.pathname, openDrawer]);

  const openEditDrawer = useCallback((word: Word) => {
    setEditWord(word);
    setDrawerOpen(true);
  }, []);

  const openNoteModal = useCallback((word: Word) => {
    setNoteWord(word);
    setNoteModalOpen(true);
  }, []);

  const openSearchModal = useCallback((word: Word) => {
    setSearchWord(word);
    setSearchModalOpen(true);
  }, []);

  const gotoWordbookFromSearch = useCallback(() => {
    const targetId = searchWord?.id;
    setSearchModalOpen(false);
    // 通过 URL query 传递目标单词 id，Wordbook 页面接收后自动定位
    navigate(targetId ? `/wordbook?focus=${targetId}` : "/wordbook");
  }, [navigate, searchWord]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditWord(null);
  }, []);

  // 打开 Due Today 弹窗时锁定当前待复习词快照 + 明日到期词快照
  // 同步生词本自我检测的「到期词 ∪ 当日新词」逻辑：
  // 当天新加的词 nextReview 是明天，isDue 返回 false，但用户当天应该先学习一次
  // 所以合并：到期词 + 今天添加的未掌握词（去重）
  // 修复：移除 fallback 到全部生词，无待复习词时显示空状态（让 SelfCheckFlow 显示完成页）
  const openDueModal = useCallback(() => {
    const dueWords = selectDueWords(words);
    const today = todayKey();
    // 当日新词只包含今天还未复习过的，与红点逻辑保持一致
    // 复习过的（lastReviewDate === today）已经推进过复习阶段，无需再计入
    const todayNewWords = words.filter(
      (w) =>
        w.date === today &&
        !w.isMastered &&
        w.lastReviewDate !== today,
    );
    const seen = new Set(dueWords.map((w) => w.id));
    const merged = [
      ...dueWords,
      ...todayNewWords.filter((w) => !seen.has(w.id)),
    ];
    setDueModalWords(merged);
    setDueModalTomorrowWords(selectTomorrowWords(words));
    setDueModalOpen(true);
  }, [words]);

  const isHomePage = location.pathname === "/";

  return (
    <>
      <AppShell
        onQuickAdd={handleQuickAdd}
        onLogout={onLogout}
        onPickWord={openSearchModal}
        onOpenTheme={() => setThemePanelOpen(true)}
      >
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
          <Route path="/wordbook" element={<Wordbook onRequestNote={openNoteModal} onRequestEdit={openEditDrawer} />} />
          <Route path="/blocks" element={<ArticleBuilder />} />
          <Route path="/stats" element={<Stats />} />
          <Route
            path="/essays"
            element={<Essays addTrigger={essayAddTrigger} />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
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

      {/* 全局搜索结果弹窗 */}
      <WordSearchModal
        open={searchModalOpen}
        word={searchWord}
        onClose={() => setSearchModalOpen(false)}
        onGotoWordbook={gotoWordbookFromSearch}
      />

      {/* 主题选择面板 */}
      <ThemePanel
        open={themePanelOpen}
        onClose={() => setThemePanelOpen(false)}
      />
    </>
  );
}

export default function App() {
  // 认证状态：首次从 localStorage 读取
  const [authed, setAuthed] = useState(() => isAuthenticated());

  // 注入 TTS 音量读取器（一次即可，settingsStore 后续变化通过 getState 实时读取）
  useEffect(() => {
    __setVolumeGetter(() => useSettingsStore.getState().ttsVolume);
  }, []);

  // 同步解锁状态到 store（登录/登出后刷新）
  const refreshUnlock = useUnlockStore((s) => s.refresh);
  useEffect(() => {
    refreshUnlock();
  }, [authed, refreshUnlock]);

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
      <StudyTimeTracker />
      <UpdateNotice />
      <PWAUpdatePrompt />
    </Router>
  );
}

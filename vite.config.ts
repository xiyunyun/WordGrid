import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 部署时需要设置 base path
// 请将 'WordGrid' 替换为你的 GitHub 仓库名
const REPO_NAME = 'WordGrid';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 项目页面 URL 为 https://用户名.github.io/仓库名/
  // base 必须设为 /仓库名/ 否则资源路径会 404
  base: `/${REPO_NAME}/`,
  build: {
    // 生产构建关闭 sourcemap：index.js.map 曾达 4.9MB，
    // 拉大 artifact 体积，导致 GitHub Pages 部署超时
    sourcemap: false,
    rollupOptions: {
      output: {
        // 代码分割：把大依赖拆成独立 chunk，减小主 bundle 体积
        // 主 bundle 曾达 1.7MB（gzip 374KB），拆分后首屏加载更快，Pages 部署也更稳
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-vendor': ['zustand', 'zustand/middleware'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      // PWA 资源路径需与 base path 保持一致
      manifest: {
        name: 'WordGrid · 词汇网格',
        short_name: 'WordGrid',
        description: '以日历网格为核心交互形态的英语词汇学习软件，基于艾宾浩斯遗忘曲线',
        theme_color: '#F5F1E8',
        background_color: '#F5F1E8',
        display: 'standalone',
        orientation: 'portrait',
        scope: `/${REPO_NAME}/`,
        start_url: `/${REPO_NAME}/`,
        lang: 'zh-CN',
        icons: [
          {
            src: `/${REPO_NAME}/pwa-192.png`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `/${REPO_NAME}/pwa-512.png`,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: `/${REPO_NAME}/pwa-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 新 SW 立即接管，避免旧 SW 持续命中 precache 导致用户看到旧版本
        // 这是「推送后网站不更新，需 Ctrl+Shift+R 才刷新」bug 的核心修复
        skipWaiting: true,
        clientsClaim: true,
        // precache 清单中的资源路径会自动加上 base path
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // 运行时缓存：API 请求采用 NetworkFirst，保证数据新鲜
        runtimeCaching: [
          {
            // 词典 API：NetworkFirst，离线时回退缓存
            urlPattern: /^https:\/\/api\.dictionaryapi\.dev\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dict-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 天
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // 词典音频：CacheFirst，音频文件大且不变
            urlPattern: /\.(?:mp3|wav|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dict-audio-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90 天
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // DeepSeek / 有道 API：不配置缓存，每次请求最新结果
        ],
      },
      devOptions: {
        // 开发环境也启用 SW，方便测试
        enabled: true,
        type: 'module',
        // dev 模式按需编译，dev-dist 中无 precache 资源，置空避免 workbox glob warning
        globPatterns: [],
      },
    }),
  ],
})

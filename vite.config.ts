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
    sourcemap: 'hidden',
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
      },
    }),
  ],
})

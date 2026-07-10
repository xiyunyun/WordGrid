import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

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
    tsconfigPaths()
  ],
})

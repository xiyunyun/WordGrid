/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY: string;
  readonly VITE_YOUDAO_APP_KEY: string;
  readonly VITE_YOUDAO_APP_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

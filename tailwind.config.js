/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // 纸张色板 - 通过 CSS 变量实现主题切换
        paper: {
          DEFAULT: "hsl(var(--c-paper) / <alpha-value>)",
          warm: "hsl(var(--c-paper-warm) / <alpha-value>)",
          card: "hsl(var(--c-paper-card) / <alpha-value>)",
          deep: "hsl(var(--c-paper-deep) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "hsl(var(--c-ink) / <alpha-value>)",
          soft: "hsl(var(--c-ink-soft) / <alpha-value>)",
          muted: "hsl(var(--c-ink-muted) / <alpha-value>)",
          light: "hsl(var(--c-ink-light) / <alpha-value>)",
        },
        accent: {
          red: "hsl(var(--c-accent-red) / <alpha-value>)",
          green: "hsl(var(--c-accent-green) / <alpha-value>)",
          gold: "hsl(var(--c-accent-gold) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        serif: ['"Lora"', '"Noto Serif SC"', "serif"],
        body: ['"Noto Serif SC"', '"Lora"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.8125rem", { lineHeight: "1.15rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        editorial: "0.02em",
        word: "0.01em",
      },
      // 扩展 line-clamp 支持超过默认 6 行（用于笔记完整显示，避免裁切到 2 行需点开弹窗）
      lineClamp: {
        7: "7",
        8: "8",
        9: "9",
        10: "10",
      },
      boxShadow: {
        // 主题色化阴影：使用 --c-paper-deep 作为发光色（每个主题中比 paper 暗一阶的色调），
        // 让阴影自然带主题色调（林间书桌→淡绿色，远洋日志→淡蓝色，玫瑰信笺→淡粉色等），
        // 而非固定的中性灰白色。--c-ink 提供深色基底层保证对比度，
        // 深色主题中 ink 是亮色，自然形成发光效果而非暗影。
        //
        // v2.3.9：重新设计发光策略
        // 设计原则：板块默认无外发光，鼠标 hover 时才显示主题对应的发光色
        //
        // - shadow-paper / card / deep：默认状态（无 shadow）
        //   卡片元素直接使用这些类，默认无发光
        // - hover:shadow-paper / hover:shadow-card / hover:shadow-deep：hover 时显示主题色发光
        //   卡片元素配合使用：className="shadow-paper hover:shadow-card" 实现默认无 + hover 发光
        // - shadow-paper-always / card-always / deep-always：持续发光（用于弹窗、抽屉等）
        //   弹窗类元素使用这些类，无论是否 hover 都显示发光
        paper: "none",
        card: "none",
        deep: "none",
        // hover 发光：主题色明显发光，opacity 提升至 0.75 让颜色清晰可见
        "paper-hover": "0 1px 2px hsl(var(--c-ink) / 0.05), 0 6px 20px -2px hsl(var(--c-paper-deep) / 0.75)",
        "card-hover": "0 1px 3px hsl(var(--c-ink) / 0.06), 0 12px 32px -6px hsl(var(--c-paper-deep) / 0.75)",
        "deep-hover": "0 2px 8px hsl(var(--c-ink) / 0.10), 0 24px 64px -10px hsl(var(--c-paper-deep) / 0.70)",
        // 持续发光（用于弹窗、抽屉等不需要 hover 触发的场景）
        "paper-always": "0 1px 2px hsl(var(--c-ink) / 0.05), 0 4px 14px hsl(var(--c-paper-deep) / 0.70)",
        "card-always": "0 1px 3px hsl(var(--c-ink) / 0.06), 0 10px 28px -8px hsl(var(--c-paper-deep) / 0.65)",
        "deep-always": "0 2px 8px hsl(var(--c-ink) / 0.10), 0 20px 56px -12px hsl(var(--c-paper-deep) / 0.60)",
      },
      backgroundImage: {
        "paper-grain":
          "radial-gradient(circle at 25% 25%, rgba(139,131,120,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(200,84,59,0.04) 0%, transparent 50%)",
        "grid-lines":
          "linear-gradient(to right, rgba(139,131,120,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,131,120,0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "shake": "shake 0.4s ease-in-out",
        "ink-bloom": "inkBloom 0.6s ease-out",
        "flip": "flip 0.5s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%, 60%": { transform: "translateX(-4px)" },
          "40%, 80%": { transform: "translateX(4px)" },
        },
        inkBloom: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "50%": { opacity: "0.4" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        flip: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(180deg)" },
        },
      },
    },
  },
  plugins: [],
};

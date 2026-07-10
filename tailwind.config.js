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
        // 纸张色板
        paper: {
          DEFAULT: "#F5F1E8", // 奶油纸张底色
          warm: "#EFE9DA",   // 略深的纸面
          card: "#FAF7F0",   // 米白卡片
          deep: "#E8E0CC",   // 深纸边
        },
        ink: {
          DEFAULT: "#1A1A1A", // 墨黑正文
          soft: "#3A3A38",   // 软墨
          muted: "#6B655C",  // 灰墨次要文字
          light: "#8B8378",  // 暖灰
        },
        accent: {
          red: "#C8543B",    // 赭石红 - 生词
          green: "#3D5A4A",  // 墨绿 - 已掌握
          gold: "#B8860B",   // 烫金 - 强调
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', "serif"],
        serif: ['"Lora"', '"Noto Serif SC"', "serif"],
        body: ['"Noto Serif SC"', '"Lora"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        editorial: "0.02em",
        word: "0.01em",
      },
      boxShadow: {
        paper: "0 1px 2px rgba(26,26,26,0.04), 0 4px 12px rgba(26,26,26,0.06)",
        card: "0 1px 3px rgba(26,26,26,0.05), 0 8px 24px -8px rgba(26,26,26,0.08)",
        deep: "0 2px 8px rgba(26,26,26,0.08), 0 16px 48px -12px rgba(26,26,26,0.12)",
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

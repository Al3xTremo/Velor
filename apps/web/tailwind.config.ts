import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        display: ["var(--font-sora)", "sans-serif"],
      },
      colors: {
        velor: {
          bg: "var(--velor-bg)",
          surface: "var(--velor-surface)",
          elevated: "var(--velor-elevated)",
          border: "var(--velor-border)",
          text: "var(--velor-text)",
          muted: "var(--velor-muted)",
          primary: "var(--velor-primary)",
          "primary-strong": "var(--velor-primary-strong)",
          success: "var(--velor-success)",
          danger: "var(--velor-danger)",
          warning: "var(--velor-warning)",
        },
      },
      boxShadow: {
        velor: "0 10px 30px -18px rgba(11, 16, 32, 0.4)",
      },
    },
  },
  plugins: [],
};

export default config;

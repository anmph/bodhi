import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#C8A96E",
        "gold-light": "#E8D5A8",
        "gold-glow": "rgba(200, 169, 110, 0.15)",
        dark: "#1A1A1A",
        "dark-surface": "#242424",
        "dark-card": "#2A2A2A",
        "dark-border": "#3A3A3A",
        "text-primary": "#F0EDE6",
        "text-secondary": "#A8A49C",
        "text-muted": "#6E6A62",
        "accent-green": "#7BA886",
        "accent-rust": "#C4785B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      keyframes: {
        fadeInDown: {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-down": "fadeInDown 0.8s ease-out",
        "fade-in": "fadeIn 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;

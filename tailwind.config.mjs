/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      /* Single source of truth is src/styles/global.css — these alias the
         CSS vars so .light overrides apply to every Tailwind color class. */
      colors: {
        bg: {
          dark: "var(--bg-dark)",
          light: "var(--bg-light)",
        },
        accent: {
          primary: "var(--accent-primary)",
          secondary: "var(--accent-secondary)",
          tertiary: "var(--accent-tertiary)",
        },
        text: {
          primary: {
            dark: "var(--text-primary)",
            light: "var(--text-primary)",
          },
          muted: "var(--text-muted)",
        },
      },
      /* Same rule as the colors above: the faces are named once, in
         global.css, and these only alias the vars. */
      fontFamily: {
        mono: "var(--font-mono)",
        sans: "var(--font-display)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "bounce-slow": "bounce 3s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};

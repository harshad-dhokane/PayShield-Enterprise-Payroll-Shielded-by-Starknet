import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-highest": "#353534",
        "surface-container-low": "#1c1b1b",
        "on-primary-fixed": "#3d0600",
        "surface": "#131313",
        "inverse-primary": "#b72301",
        "on-tertiary-fixed": "#00210d",
        "surface-container-high": "#2a2a2a",
        "error-container": "#93000a",
        "tertiary-fixed": "#6cfe9f",
        "on-secondary": "#680019",
        "primary-container": "#ff5733",
        "on-primary-container": "#580c00",
        "on-error-container": "#ffdad6",
        "surface-container": "#201f1f",
        "secondary-fixed": "#ffdada",
        "inverse-on-surface": "#313030",
        "outline": "#ab8982",
        "on-tertiary": "#00391a",
        "on-surface": "#e5e2e1",
        "surface-bright": "#3a3939",
        "surface-dim": "#131313",
        "secondary-fixed-dim": "#ffb3b6",
        "on-primary-fixed-variant": "#8c1800",
        "on-tertiary-container": "#003216",
        "on-secondary-fixed-variant": "#920027",
        "surface-tint": "#ffb4a4",
        "secondary-container": "#c70139",
        "tertiary-container": "#00a759",
        "background": "#131313",
        "on-primary": "#630e00",
        "surface-variant": "#353534",
        "on-secondary-container": "#ffd7d7",
        "primary-fixed": "#ffdad3",
        "outline-variant": "#5b403a",
        "primary-fixed-dim": "#ffb4a4",
        "secondary": "#ffb3b6",
        "on-background": "#e5e2e1",
        "tertiary": "#4be085",
        "on-tertiary-fixed-variant": "#005229",
        "primary": "#ffb4a4",
        "on-error": "#690005",
        "tertiary-fixed-dim": "#4be085",
        "on-secondary-fixed": "#40000c",
        "surface-container-lowest": "#0e0e0e",
        "inverse-surface": "#e5e2e1",
        "error": "#ffb4ab",
        "on-surface-variant": "#e4beb6"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      fontFamily: {
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;

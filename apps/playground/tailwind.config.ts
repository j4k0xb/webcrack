import daisyui from "daisyui";
import themes from "daisyui/src/theming/themes";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  daisyui: {
    logs: false,
    themes: [
      {
        light: {
          ...themes["light"],
          "primary-content": "#edf2f7",
          primary: "#409eea",
          secondary: "#6366f1",
          accent: "#34eca2",
        },
        dark: {
          ...themes["dark"],
          "base-100": "#1b1b1f",
          "base-200": "#161618",
          "base-300": "#111113",
          primary: "#409eea",
          secondary: "#6366f1",
          accent: "#34eca2",
        },
      },
    ],
  },
  plugins: [daisyui],
};

export default config;

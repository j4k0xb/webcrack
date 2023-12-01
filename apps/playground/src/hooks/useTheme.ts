import { createEffect, createRoot, createSignal } from "solid-js";

type Theme = "dark" | "light";

const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const preferredTheme = darkMediaQuery.matches ? "dark" : "light";
const savedTheme = localStorage.getItem("theme") as Theme | null;

const [theme, setTheme] = createSignal<Theme>(savedTheme ?? preferredTheme);

createRoot(() => {
  createEffect(() => {
    document.documentElement.dataset.theme = theme();
  });

  darkMediaQuery.addEventListener("change", (event) => {
    if (savedTheme === null) {
      setTheme(event.matches ? "dark" : "light");
    }
  });
});

export function useTheme() {
  return [
    theme,
    (theme: Theme) => {
      setTheme(theme);
      localStorage.setItem("theme", theme);
    },
  ] as const;
}

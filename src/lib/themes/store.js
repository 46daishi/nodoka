import { writable } from "svelte/store";

export const currentMode = writable("dark"); // "light" or "dark"
export const currentColor = writable("blue"); // e.g., "blue", "green", "purple", "orange"

export const modes = {
  light: {
    background: "#ffffff",
    surface: "#c7c7c7",
    text: "#212529",
    textSecondary: "#6c757d",
    border: "#dee2e6",
    shadow: "rgba(0, 0, 0, 0.1)",
    button: "#c7c7c7",
    buttonText: "#212529",
  },
  dark: {
    background: "#1a1a1a",
    surface: "#2d2d2d",
    text: "#ffffff",
    textSecondary: "#b3b3b3",
    border: "#404040",
    shadow: "rgba(0, 0, 0, 0.3)",
    button: "#2d2d2d",
    buttonText: "#ffffff",
  },
};

export const colors = {
  blue: {
    primary: "#36B7BD",
    primaryHover: "#17A4AB",
    accent: "#59CBD0",
  },
  green: {
    primary: "#3CD857",
    primaryHover: "#1BCD3A",
    accent: "#61E378",
  },
  purple: {
    primary: "#8A42C9",
    primaryHover: "#7423BA",
    accent: "#A364D9",
  },
  orange: {
    primary: "#D68233",
    primaryHover: "#FF8D21",
    accent: "#FFAD5E",
  },
  red: {
    primary: "#FF2C21",
    primaryHover: "#E70B00",
    accent: "#FF5047",
  },
  yellow: {
    primary: "#BAB33D",
    primaryHover: "#E7B200",
    accent: "#FFDD6C",
  },
  pink: {
    primary: "#E13E94",
    primaryHover: "#D81C7F",
    accent: "#E963AA",
  },
};

export const themeOptions = Object.entries(colors).map(([key, color]) => ({
  value: key,
  colors: color,
}));

export function applyTheme(mode, colorKey) {
  const modeColors = modes[mode];
  const color = colors[colorKey];
  if (!modeColors || !color) return;

  const root = document.documentElement;

  Object.entries(modeColors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  Object.entries(color).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  currentMode.set(mode);
  currentColor.set(colorKey);

  localStorage.setItem("nodoka-mode", mode);
  localStorage.setItem("nodoka-color", colorKey);
}

export function initializeTheme() {
  const savedMode = localStorage.getItem("nodoka-mode") || "dark";
  const savedColor = localStorage.getItem("nodoka-color") || "blue";
  applyTheme(savedMode, savedColor);
}

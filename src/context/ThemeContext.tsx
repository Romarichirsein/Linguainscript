import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("themeMode");
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved as ThemeMode;
    }
    const legacy = localStorage.getItem("theme");
    if (legacy === "dark") return "dark";
    if (legacy === "light") return "light";
    return "system";
  });

  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      let isDark = false;
      if (themeMode === "dark") {
        isDark = true;
      } else if (themeMode === "light") {
        isDark = false;
      } else if (themeMode === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      
      setDarkMode(isDark);
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    if (themeMode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const listener = (e: MediaQueryListEvent) => {
        const rootElement = window.document.documentElement;
        setDarkMode(e.matches);
        if (e.matches) {
          rootElement.classList.add("dark");
        } else {
          rootElement.classList.remove("dark");
        }
      };
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("themeMode", mode);
    // For legacy support
    if (mode === "dark") {
      localStorage.setItem("theme", "dark");
    } else if (mode === "light") {
      localStorage.setItem("theme", "light");
    } else {
      localStorage.removeItem("theme");
    }
  };

  const toggleDarkMode = () => {
    setThemeMode(darkMode ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

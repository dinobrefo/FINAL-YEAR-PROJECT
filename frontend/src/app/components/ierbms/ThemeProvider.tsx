import * as React from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      // If previously stored as light, reset to dark to match homepage
      if (stored === "light") {
        localStorage.setItem("theme", "dark");
        return "dark";
      }
      return (stored as Theme) || "dark";
    }
    return "dark";
  });

  const [effectiveTheme, setEffectiveTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    const root = window.document.documentElement;
    
    let resolvedTheme: "light" | "dark" = "dark";
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "dark";
      resolvedTheme = systemTheme;
    } else {
      resolvedTheme = theme === "light" ? "dark" : (theme as "light" | "dark");
    }

    setEffectiveTheme("dark");
    root.classList.remove("light");
    root.classList.add("dark");
    
    localStorage.setItem("theme", "dark");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName =
  | 'emerald-black'
  | 'deep-obsidian'
  | 'monochrome'
  | 'electric-blue'
  | 'premium-gold'
  | 'sunset-orange'
  | 'emerald-green'
  | 'royal-violet'
  | 'ocean-teal'
  | 'crimson-pink'
  | 'day-white'
  | 'daylight-light';

export interface ThemeOption {
  id: ThemeName;
  nameKey: string;
  accent: string;
  bg: string;
  isLight: boolean;
}

export const ALL_THEMES: ThemeOption[] = [
  { id: 'emerald-black', nameKey: 'theme.emeraldBlack', accent: '#10B981', bg: '#04100C', isLight: false },
  { id: 'deep-obsidian', nameKey: 'theme.deepObsidian', accent: '#38BDF8', bg: '#050810', isLight: false },
  { id: 'monochrome', nameKey: 'theme.monochrome', accent: '#FFFFFF', bg: '#000000', isLight: false },
  { id: 'electric-blue', nameKey: 'theme.electricBlue', accent: '#3B82F6', bg: '#050B1F', isLight: false },
  { id: 'premium-gold', nameKey: 'theme.premiumGold', accent: '#F59E0B', bg: '#0F0A02', isLight: false },
  { id: 'sunset-orange', nameKey: 'theme.sunsetOrange', accent: '#F97316', bg: '#110804', isLight: false },
  { id: 'emerald-green', nameKey: 'theme.emeraldGreen', accent: '#22C55E', bg: '#04120A', isLight: false },
  { id: 'royal-violet', nameKey: 'theme.royalViolet', accent: '#A855F7', bg: '#0A0614', isLight: false },
  { id: 'ocean-teal', nameKey: 'theme.oceanTeal', accent: '#06B6D4', bg: '#04141A', isLight: false },
  { id: 'crimson-pink', nameKey: 'theme.crimsonPink', accent: '#EC4899', bg: '#12060C', isLight: false },
  { id: 'day-white', nameKey: 'theme.dayWhite', accent: '#2563EB', bg: '#F8FAFC', isLight: true },
  { id: 'daylight-light', nameKey: 'theme.daylightLight', accent: '#0284C7', bg: '#F0F9FF', isLight: true },
];

const THEME_STORAGE_KEY = 'staff_manager_theme';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (newTheme: ThemeName) => void;
  isLight: boolean;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName;
      if (saved && ALL_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    }
    return 'emerald-black';
  });

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    const activeThemeConfig = ALL_THEMES.find((t) => t.id === newTheme);
    const metaTag = document.getElementById('theme-color-meta');
    if (metaTag && activeThemeConfig) {
      metaTag.setAttribute('content', activeThemeConfig.bg);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    const activeThemeConfig = ALL_THEMES.find((t) => t.id === theme);
    const metaTag = document.getElementById('theme-color-meta');
    if (metaTag && activeThemeConfig) {
      metaTag.setAttribute('content', activeThemeConfig.bg);
    }
  }, [theme]);

  const currentThemeConfig = ALL_THEMES.find((t) => t.id === theme);
  const isLight = !!currentThemeConfig?.isLight;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLight, themes: ALL_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

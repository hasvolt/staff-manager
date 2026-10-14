import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeName =
  | 'deep-obsidian'
  | 'electric-blue'
  | 'emerald-black'
  | 'monochrome'
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
  nameEn: string;
  accent: string;
  bg: string;
  surface: string;
  isLight: boolean;
  tag?: string;
}

export const ALL_THEMES: ThemeOption[] = [
  {
    id: 'deep-obsidian',
    nameKey: 'theme.deepObsidian',
    nameEn: 'Executive Navy Slate',
    accent: '#38BDF8',
    bg: '#0B1120',
    surface: '#111C34',
    isLight: false,
    tag: 'Recommended',
  },
  {
    id: 'electric-blue',
    nameKey: 'theme.electricBlue',
    nameEn: 'Royal Sapphire',
    accent: '#3B82F6',
    bg: '#080E24',
    surface: '#0E1738',
    isLight: false,
  },
  {
    id: 'emerald-black',
    nameKey: 'theme.emeraldBlack',
    nameEn: 'Emerald Pine',
    accent: '#10B981',
    bg: '#061512',
    surface: '#0B221D',
    isLight: false,
  },
  {
    id: 'monochrome',
    nameKey: 'theme.monochrome',
    nameEn: 'Titanium Midnight',
    accent: '#FFFFFF',
    bg: '#09090B',
    surface: '#131316',
    isLight: false,
  },
  {
    id: 'premium-gold',
    nameKey: 'theme.premiumGold',
    nameEn: 'Imperial Amber & Gold',
    accent: '#F59E0B',
    bg: '#141007',
    surface: '#1E170A',
    isLight: false,
  },
  {
    id: 'sunset-orange',
    nameKey: 'theme.sunsetOrange',
    nameEn: 'Sunset Terracotta',
    accent: '#F97316',
    bg: '#150A06',
    surface: '#20100A',
    isLight: false,
  },
  {
    id: 'emerald-green',
    nameKey: 'theme.emeraldGreen',
    nameEn: 'Vibrant Mint',
    accent: '#22C55E',
    bg: '#04140D',
    surface: '#072216',
    isLight: false,
  },
  {
    id: 'royal-violet',
    nameKey: 'theme.royalViolet',
    nameEn: 'Amethyst Violet',
    accent: '#A855F7',
    bg: '#0F081D',
    surface: '#180D2F',
    isLight: false,
  },
  {
    id: 'ocean-teal',
    nameKey: 'theme.oceanTeal',
    nameEn: 'Pacific Teal',
    accent: '#06B6D4',
    bg: '#04141A',
    surface: '#07222B',
    isLight: false,
  },
  {
    id: 'crimson-pink',
    nameKey: 'theme.crimsonPink',
    nameEn: 'Rose Crimson',
    accent: '#EC4899',
    bg: '#140710',
    surface: '#200B1A',
    isLight: false,
  },
  {
    id: 'day-white',
    nameKey: 'theme.dayWhite',
    nameEn: 'Studio Clean White',
    accent: '#2563EB',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    isLight: true,
  },
  {
    id: 'daylight-light',
    nameKey: 'theme.daylightLight',
    nameEn: 'Sky Breeze Light',
    accent: '#0284C7',
    bg: '#F0F9FF',
    surface: '#FFFFFF',
    isLight: true,
  },
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
        // Upgrade legacy emerald-black default to the fresh flagship deep-obsidian
        if (saved === 'emerald-black') {
          return 'deep-obsidian';
        }
        return saved;
      }
    }
    return 'deep-obsidian';
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

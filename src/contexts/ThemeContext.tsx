import React, { createContext, useState, useMemo, useEffect, useCallback, useContext, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
interface ThemeContextValue { theme: Theme; setTheme: (theme: Theme) => void; effectiveTheme: 'light' | 'dark'; }

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
    const effectiveTheme = useMemo(() => {
        if (theme === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return theme;
    }, [theme]);
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(effectiveTheme);
        localStorage.setItem('theme', theme);
    }, [theme, effectiveTheme]);
    const setTheme = (newTheme: Theme) => { setThemeState(newTheme); };
    const value = { theme, setTheme, effectiveTheme };
    return (<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>);
};
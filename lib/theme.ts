import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'wt-theme';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(KEY) as Theme) ?? 'system';
}

export function saveTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
}

export function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

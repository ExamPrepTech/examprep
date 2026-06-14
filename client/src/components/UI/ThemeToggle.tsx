import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/UI/Button';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="w-10 h-10 p-0">
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
};

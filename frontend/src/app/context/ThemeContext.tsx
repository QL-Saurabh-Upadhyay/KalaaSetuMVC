"use client";
import { createContext, useContext, useEffect, useState } from 'react';

interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto';
  primaryGradient: 'indigo-blue' | 'purple-pink' | 'green-teal' | 'orange-yellow' | 'red-pink';
  secondaryGradient: 'blue-green' | 'purple-blue' | 'pink-orange' | 'teal-cyan' | 'yellow-orange';
  buttonStyle: 'rounded' | 'sharp' | 'pill';
  glassEffect: 'high' | 'medium' | 'low';
  animationSpeed: 'fast' | 'normal' | 'slow';
}

interface ThemeContextType {
  theme: ThemeSettings;
  applyTheme: (theme: ThemeSettings) => void;
  loadTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>({
    colorScheme: 'auto',
    primaryGradient: 'indigo-blue',
    secondaryGradient: 'blue-green',
    buttonStyle: 'rounded',
    glassEffect: 'medium',
    animationSpeed: 'normal',
  });

  const applyThemeSettings = (themeSettings: ThemeSettings) => {
    // Apply color scheme
    if (themeSettings.colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeSettings.colorScheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Auto - check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }

    // Apply CSS custom properties for gradients
    const root = document.documentElement;
    const gradients = {
      'indigo-blue': 'from-indigo-500 to-blue-400',
      'purple-pink': 'from-purple-500 to-pink-400',
      'green-teal': 'from-green-400 to-teal-400',
      'orange-yellow': 'from-orange-400 to-yellow-400',
      'red-pink': 'from-red-400 to-pink-400'
    };
    
    const secondaryGradients = {
      'blue-green': 'from-blue-400 to-green-400',
      'purple-blue': 'from-purple-400 to-blue-400',
      'pink-orange': 'from-pink-400 to-orange-400',
      'teal-cyan': 'from-teal-400 to-cyan-400',
      'yellow-orange': 'from-yellow-400 to-orange-400'
    };

    root.style.setProperty('--primary-gradient', gradients[themeSettings.primaryGradient]);
    root.style.setProperty('--secondary-gradient', secondaryGradients[themeSettings.secondaryGradient]);
    
    // Apply animation speed
    const speeds = {
      'fast': '150ms',
      'normal': '200ms',
      'slow': '300ms'
    };
    root.style.setProperty('--animation-speed', speeds[themeSettings.animationSpeed]);

    // Apply button style classes
    root.classList.remove('button-rounded', 'button-sharp', 'button-pill');
    root.classList.add(`button-${themeSettings.buttonStyle}`);

    // Apply glass effect
    root.classList.remove('glass-low', 'glass-medium', 'glass-high');
    root.classList.add(`glass-${themeSettings.glassEffect}`);
  };

  const loadTheme = () => {
    const savedThemeSettings = localStorage.getItem('themeSettings');
    if (savedThemeSettings) {
      try {
        const parsedThemeSettings = JSON.parse(savedThemeSettings);
        setTheme(parsedThemeSettings);
        applyThemeSettings(parsedThemeSettings);
      } catch (error) {
        console.error('Error parsing saved theme settings:', error);
      }
    } else {
      // Apply default theme
      applyThemeSettings(theme);
    }
  };

  const applyTheme = (newTheme: ThemeSettings) => {
    setTheme(newTheme);
    applyThemeSettings(newTheme);
  };

  useEffect(() => {
    loadTheme();
  }, []);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme.colorScheme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyThemeSettings(theme);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, applyTheme, loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 
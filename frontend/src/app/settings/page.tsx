"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ApiSettings from "../components/ApiSettings";
import ThemeSettings from "../components/ThemeSettings";
import { useTheme } from "../context/ThemeContext";

interface ApiSettings {
  infographicBaseUrl: string;
  illustrationBaseUrl: string;
  audioBaseUrl: string;
}

interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto';
  primaryGradient: 'indigo-blue' | 'purple-pink' | 'green-teal' | 'orange-yellow' | 'red-pink';
  secondaryGradient: 'blue-green' | 'purple-blue' | 'pink-orange' | 'teal-cyan' | 'yellow-orange';
  buttonStyle: 'rounded' | 'sharp' | 'pill';
  glassEffect: 'high' | 'medium' | 'low';
  animationSpeed: 'fast' | 'normal' | 'slow';
}

interface Settings {
  api: ApiSettings;
  theme: ThemeSettings;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, applyTheme } = useTheme();
  const [settings, setSettings] = useState<Settings>({
    api: {
      infographicBaseUrl: "",
      illustrationBaseUrl: "",
      audioBaseUrl: "",
    },
    theme: {
      colorScheme: 'auto',
      primaryGradient: 'indigo-blue',
      secondaryGradient: 'blue-green',
      buttonStyle: 'rounded',
      glassEffect: 'medium',
      animationSpeed: 'normal',
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedApiSettings = localStorage.getItem('apiSettings');
    const savedThemeSettings = localStorage.getItem('themeSettings');
    
    if (savedApiSettings) {
      try {
        const parsedApiSettings = JSON.parse(savedApiSettings);
        setSettings(prev => ({
          ...prev,
          api: parsedApiSettings
        }));
      } catch (error) {
        console.error('Error parsing saved API settings:', error);
      }
    }
    
    if (savedThemeSettings) {
      try {
        const parsedThemeSettings = JSON.parse(savedThemeSettings);
        setSettings(prev => ({
          ...prev,
          theme: { ...prev.theme, ...parsedThemeSettings }
        }));
      } catch (error) {
        console.error('Error parsing saved theme settings:', error);
      }
    }
  }, []);

  // Update local state when theme context changes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: theme
    }));
  }, [theme]);

  const handleApiSettingsChange = (apiSettings: ApiSettings) => {
    setSettings(prev => ({
      ...prev,
      api: apiSettings
    }));
  };

  const handleThemeSettingsChange = (themeSettings: ThemeSettings) => {
    setSettings(prev => ({
      ...prev,
      theme: themeSettings
    }));
    // Apply theme immediately for preview
    applyTheme(themeSettings);
  };

  const handleSave = () => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Validate URLs
      if (settings.api.infographicBaseUrl && !isValidUrl(settings.api.infographicBaseUrl)) {
        throw new Error('Invalid Infographic API URL');
      }
      if (settings.api.illustrationBaseUrl && !isValidUrl(settings.api.illustrationBaseUrl)) {
        throw new Error('Invalid Illustration API URL');
      }
      if (settings.api.audioBaseUrl && !isValidUrl(settings.api.audioBaseUrl)) {
        throw new Error('Invalid Audio API URL');
      }

      // Save API settings to localStorage
      localStorage.setItem('apiSettings', JSON.stringify(settings.api));
      
      // Save theme settings to localStorage
      localStorage.setItem('themeSettings', JSON.stringify(settings.theme));
      
      // Apply theme changes globally
      applyTheme(settings.theme);
      
      setMessage({
        type: 'success',
        text: 'Settings saved successfully!'
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSettings: Settings = {
      api: {
        infographicBaseUrl: "",
        illustrationBaseUrl: "",
        audioBaseUrl: "",
      },
      theme: {
        colorScheme: 'auto',
        primaryGradient: 'indigo-blue',
        secondaryGradient: 'blue-green',
        buttonStyle: 'rounded',
        glassEffect: 'medium',
        animationSpeed: 'normal',
      }
    };
    
    setSettings(defaultSettings);
    localStorage.removeItem('apiSettings');
    localStorage.removeItem('themeSettings');
    
    // Apply default theme globally
    applyTheme(defaultSettings.theme);
    
    setMessage({
      type: 'success',
      text: 'Settings reset to defaults!'
    });
    setTimeout(() => setMessage(null), 3000);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto mt-8 p-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-400 mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Configure your API endpoints and theme preferences</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`w-full p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="w-full space-y-6">
        {/* API Settings Component */}
        <ApiSettings 
          settings={settings.api}
          onSettingsChange={handleApiSettingsChange}
          isValidUrl={isValidUrl}
        />

        {/* Theme Settings Component */}
        <ThemeSettings 
          settings={settings.theme}
          onSettingsChange={handleThemeSettingsChange}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-400 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 w-full">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Settings Overview:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700 dark:text-blue-300">
          <div>
            <h4 className="font-medium mb-1">API Settings:</h4>
            <ul className="space-y-1">
              <li>• Configure endpoints for different generation types</li>
              <li>• Settings are saved locally in your browser</li>
              <li>• No API key required - endpoints are public</li>
              <li>• Click the header to expand/collapse sections</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Theme Settings:</h4>
            <ul className="space-y-1">
              <li>• Customize appearance and styling preferences</li>
              <li>• Choose color schemes and gradient combinations</li>
              <li>• Adjust UI elements and animation speeds</li>
              <li>• Changes apply immediately across the app</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
"use client";
import { useState } from "react";

interface ThemeSettings {
  colorScheme: 'light' | 'dark' | 'auto';
  primaryGradient: 'indigo-blue' | 'purple-pink' | 'green-teal' | 'orange-yellow' | 'red-pink';
  secondaryGradient: 'blue-green' | 'purple-blue' | 'pink-orange' | 'teal-cyan' | 'yellow-orange';
  buttonStyle: 'rounded' | 'sharp' | 'pill';
  glassEffect: 'high' | 'medium' | 'low';
  animationSpeed: 'fast' | 'normal' | 'slow';
}

interface ThemeSettingsProps {
  settings: ThemeSettings;
  onSettingsChange: (settings: ThemeSettings) => void;
}

export default function ThemeSettings({ settings, onSettingsChange }: ThemeSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const handleInputChange = (field: keyof ThemeSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  const gradientOptions = [
    { value: 'indigo-blue', label: 'Indigo to Blue', preview: 'from-indigo-500 to-blue-400' },
    { value: 'purple-pink', label: 'Purple to Pink', preview: 'from-purple-500 to-pink-400' },
    { value: 'green-teal', label: 'Green to Teal', preview: 'from-green-400 to-teal-400' },
    { value: 'orange-yellow', label: 'Orange to Yellow', preview: 'from-orange-400 to-yellow-400' },
    { value: 'red-pink', label: 'Red to Pink', preview: 'from-red-400 to-pink-400' }
  ];

  const secondaryGradientOptions = [
    { value: 'blue-green', label: 'Blue to Green', preview: 'from-blue-400 to-green-400' },
    { value: 'purple-blue', label: 'Purple to Blue', preview: 'from-purple-400 to-blue-400' },
    { value: 'pink-orange', label: 'Pink to Orange', preview: 'from-pink-400 to-orange-400' },
    { value: 'teal-cyan', label: 'Teal to Cyan', preview: 'from-teal-400 to-cyan-400' },
    { value: 'yellow-orange', label: 'Yellow to Orange', preview: 'from-yellow-400 to-orange-400' }
  ];

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-400 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Theme Configuration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Customize appearance and styling</p>
          </div>
        </div>
        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 pt-0 space-y-4">
          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color Scheme
            </label>
            <select
              value={settings.colorScheme}
              onChange={(e) => handleInputChange('colorScheme', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="auto">Auto (System)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          {/* Primary Gradient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Gradient
            </label>
            <select
              value={settings.primaryGradient}
              onChange={(e) => handleInputChange('primaryGradient', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {gradientOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Secondary Gradient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Secondary Gradient
            </label>
            <select
              value={settings.secondaryGradient}
              onChange={(e) => handleInputChange('secondaryGradient', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {secondaryGradientOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Button Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Button Style
            </label>
            <select
              value={settings.buttonStyle}
              onChange={(e) => handleInputChange('buttonStyle', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="rounded">Rounded</option>
              <option value="sharp">Sharp</option>
              <option value="pill">Pill</option>
            </select>
          </div>

          {/* Glass Effect */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Glass Effect
            </label>
            <select
              value={settings.glassEffect}
              onChange={(e) => handleInputChange('glassEffect', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Animation Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Animation Speed
            </label>
            <select
              value={settings.animationSpeed}
              onChange={(e) => handleInputChange('animationSpeed', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="fast">Fast</option>
              <option value="normal">Normal</option>
              <option value="slow">Slow</option>
            </select>
          </div>

          {/* Info Section */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">Theme Configuration Guide:</h3>
            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
              <li>• Choose between light, dark, or auto color scheme</li>
              <li>• Customize primary and secondary gradients</li>
              <li>• Adjust button styles and glass effects</li>
              <li>• Control animation speed for better UX</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
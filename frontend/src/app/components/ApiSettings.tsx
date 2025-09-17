"use client";
import { useState } from "react";

interface ApiSettings {
  infographicBaseUrl: string;
  illustrationBaseUrl: string;
  audioBaseUrl: string;
}

interface ApiSettingsProps {
  settings: ApiSettings;
  onSettingsChange: (settings: ApiSettings) => void;
  isValidUrl: (url: string) => boolean;
}

export default function ApiSettings({ settings, onSettingsChange, isValidUrl }: ApiSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInputChange = (field: keyof ApiSettings, value: string) => {
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-400 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">API Configuration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your API endpoints</p>
          </div>
        </div>
        <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      <div className={`transition-all duration-300 ease-in-out ${isExpanded ? ' opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-6 pt-0 space-y-4">
          {/* Infographic API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Infographic & Graphs API URL
            </label>
            <input
              type="url"
              value={settings.infographicBaseUrl}
              onChange={(e) => handleInputChange('infographicBaseUrl', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="https://api.example.com"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Base URL for infographic and graph generation
            </p>
            {settings.infographicBaseUrl && !isValidUrl(settings.infographicBaseUrl) && (
              <p className="text-xs text-red-500 mt-1">Invalid URL format</p>
            )}
          </div>

          {/* Illustration API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Illustration & Storyboard API URL
            </label>
            <input
              type="url"
              value={settings.illustrationBaseUrl}
              onChange={(e) => handleInputChange('illustrationBaseUrl', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="https://api.example.com"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Base URL for illustration and storyboard generation
            </p>
            {settings.illustrationBaseUrl && !isValidUrl(settings.illustrationBaseUrl) && (
              <p className="text-xs text-red-500 mt-1">Invalid URL format</p>
            )}
          </div>

          {/* Audio API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Audio Generation API URL
            </label>
            <input
              type="url"
              value={settings.audioBaseUrl}
              onChange={(e) => handleInputChange('audioBaseUrl', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="https://api.example.com"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Base URL for text-to-audio generation
            </p>
            {settings.audioBaseUrl && !isValidUrl(settings.audioBaseUrl) && (
              <p className="text-xs text-red-500 mt-1">Invalid URL format</p>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">API Configuration Guide:</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Set separate base URLs for different generation types</li>
              <li>• URLs should include the protocol (https://)</li>
              <li>• Settings are saved locally in your browser</li>
              <li>• No API key required - endpoints are public</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 
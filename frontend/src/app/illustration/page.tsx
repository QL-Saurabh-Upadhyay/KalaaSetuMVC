"use client";
import { useState } from "react";
import { useGeneration } from "../hooks/useGeneration";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ResultDisplay from "../components/ResultDisplay";

export default function IllustrationPage() {
  const [prompt, setPrompt] = useState("");
  const {
    state,
    generateIllustration,
    generateStoryboard,
    clearError,
    clearResult
  } = useGeneration();

  const handleGenerate = async (generationType: 'illustration' | 'storyboard') => {
    if (!prompt.trim()) {
      alert("Please enter a prompt first.");
      return;
    }

    try {
      switch (generationType) {
        case 'illustration':
          await generateIllustration(prompt);
          break;
        case 'storyboard':
          await generateStoryboard(prompt);
          break;
      }
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  const handleGenerateNew = () => {
    clearResult();
    setPrompt("");
  };

  return (
    <div className="flex flex-col items-center justify-center gap-10 w-full max-w-2xl mx-auto mt-8 p-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-400 mb-2">Illustration & Storyboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Transform your ideas into stunning illustrations and storyboards</p>
      </div>

      <textarea
        className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 shadow-md mb-4 text-lg"
        placeholder="Describe your illustration or storyboard..."
        rows={4}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        disabled={state.loading}
      />

      {/* Error Display */}
      {state.error && (
        <ErrorMessage
          message={state.error}
          onDismiss={clearError}
          onRetry={() => handleGenerate('illustration')}
        />
      )}

      {/* Loading State */}
      {state.loading && (
        <div className="w-full flex justify-center">
          <LoadingSpinner size="large" text="Generating your image..." />
        </div>
      )}

      {/* Result Display */}
      {state.result && !state.loading && (
        <ResultDisplay
          result={state.result}
          onGenerateNew={handleGenerateNew}
        />
      )}

      {/* Generation Buttons */}
      {!state.loading && !state.result && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          <button
            className="rounded-full py-4 px-6 font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 border-none bg-gradient-to-r from-purple-500 to-pink-400 text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--button-shadow)" }}
            onClick={() => handleGenerate('illustration')}
            disabled={!prompt.trim()}
          >
            Generate Illustration
          </button>
          <button
            className="rounded-full py-4 px-6 font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 border-none bg-gradient-to-r from-pink-400 to-yellow-400 text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ boxShadow: "var(--button-shadow)" }}
            onClick={() => handleGenerate('storyboard')}
            disabled={!prompt.trim()}
          >
            Generate Storyboard
          </button>
        </div>
      )}
    </div>
  );
} 
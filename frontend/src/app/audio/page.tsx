"use client";
import { useState } from "react";
import { useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  apiService,
  EmotionDetectionResponse,
  SpeechGenerationRequest,
  SpeechGenerationResponse,
} from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

export default function AudioPage() {
  const { theme } = useTheme();
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("hi");
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [options, setOptions] = useState<{
    languages: string[];
    speakers: Record<string, string[]>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);

  // Get gradient classes based on theme
  const getGradientClass = (type: "primary" | "secondary") => {
    const gradients = {
      primary: {
        "indigo-blue": "from-indigo-500 to-blue-400",
        "purple-pink": "from-purple-500 to-pink-400",
        "green-teal": "from-green-400 to-teal-400",
        "orange-yellow": "from-orange-400 to-yellow-400",
        "red-pink": "from-red-400 to-pink-400",
      },
      secondary: {
        "blue-green": "from-blue-400 to-green-400",
        "purple-blue": "from-purple-400 to-blue-400",
        "pink-orange": "from-pink-400 to-orange-400",
        "teal-cyan": "from-teal-400 to-cyan-400",
        "yellow-orange": "from-yellow-400 to-orange-400",
      },
    };

    const gradientKey =
      type === "primary" ? theme.primaryGradient : theme.secondaryGradient;
    return (
      gradients[type][gradientKey as keyof (typeof gradients)[typeof type]] ||
      "from-indigo-500 to-blue-400"
    );
  };

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError("Please enter some text to convert to speech.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setDetectedEmotion(null);

    try {
      // Step 1: Detect emotion from text
      const genrateSpeechRequest :SpeechGenerationRequest = {
        text: text.trim(),
        target_laguage: language,
        speaker: speaker || undefined,
       

      }
      const emotionResponse: SpeechGenerationResponse =
        await apiService.generateSpeech(genrateSpeechRequest);

      if (!emotionResponse.audio_url) {
        throw new Error("Failed to detect emotion from text");
      }

      const detectedEmotion = emotionResponse.audio_url;
      setDetectedEmotion(detectedEmotion);

      // Step 2: Generate speech with the detected emotion
      const speechRequest: SpeechGenerationRequest = {
        text: text.trim(),
        emotion: detectedEmotion,
        // include optional voice/language fields the backend may use
        voice: speaker || undefined,
        language: language || undefined,
      } as any;

      const speechResponse = await apiService.generateSpeech(speechRequest);

      if (speechResponse.success && speechResponse.audio_url) {
        setAudioUrl(speechResponse.audio_url);
      } else {
        throw new Error(speechResponse.error || "Speech generation failed");
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate speech. Please try again."
      );
      console.error("Speech generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Fetch TTS options from backend on mount (via server-side proxy)
    let mounted = true;
    (async () => {
      try {
        // Call our server-side proxy which wraps the real backend. This avoids
        // coupling the client to a localStorage audioBaseUrl and centralizes the
        // error handling for ngrok/landing pages on the server side.
        const resp = await fetch("/api/tts/options", { method: "GET", headers: { Accept: "application/json" } });
        if (!resp.ok) {
          console.error("Proxy options request failed", resp.status);
          const body = await resp.text().catch(() => "");
          if (mounted) setError("Failed to load TTS options from server");
          return;
        }

        let wrapper = null;
        try {
          wrapper = await resp.json();
        } catch (err) {
          console.error("Failed to parse JSON from /api/tts/options", err);
          if (mounted) setError("Failed to parse TTS options (invalid JSON)");
          return;
        }

        if (!wrapper || !wrapper.ok || !wrapper.data) {
          console.error("/api/tts/options returned error", wrapper);
          if (mounted) setError(wrapper?.error || "Failed to load TTS options from upstream");
          return;
        }

        const data = wrapper.data;
        if (mounted) {
          setOptions(data);
          if (data.languages && data.languages.length > 0)
            setLanguage(data.languages.includes("hi") ? "hi" : data.languages[0]);
          if (data.speakers && data.speakers[language] && data.speakers[language].length > 0)
            setSpeaker(data.speakers[language][0]);
        }
      } catch (e) {
        // ignore silently
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleDownload = () => {
    if (audioUrl) {
      try {
        const link = document.createElement("a");
        link.href = audioUrl;
        link.download = `generated_speech_${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Download error:", error);
        setError("Failed to download audio file");
      }
    }
  };

  const handleClear = () => {
    setText("");
    setAudioUrl(null);
    setError(null);
    setDetectedEmotion(null);
  };

  const handleDismissError = () => {
    setError(null);
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      joy: "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20",
      sadness:
        "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20",
      anger: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20",
      fear: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20",
      surprise:
        "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20",
      disgust:
        "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20",
      neutral:
        "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20",
    };
    return colors[emotion as keyof typeof colors] || colors.neutral;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto mt-8 p-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-4">
        <h1
          className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${getGradientClass(
            "primary"
          )} mb-2`}
        >
          Text to Speech
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Convert your text into emotion-aware speech
        </p>
      </div>

      <div className="w-full space-y-6">
        {/* Text Input */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Text Input
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your text:
            </label>
            <textarea
              className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md text-base"
              placeholder="Type or paste your text here to convert it to emotion-aware speech..."
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isGenerating}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Character count: {text.length}
            </p>
          </div>

          {/* Language and Speaker selects */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  const s = options?.speakers?.[e.target.value];
                  if (s && s.length > 0) setSpeaker(s[0]);
                }}
                className="w-full p-2 rounded-lg border"
              >
                {options?.languages?.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
                {!options?.languages && <option value="hi">hi</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Speaker
              </label>
              <select
                value={speaker ?? ""}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full p-2 rounded-lg border"
              >
                {options?.speakers?.[language]?.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
                {!options?.speakers && <option value="">default</option>}
              </select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={handleDismissError}
              onRetry={handleGenerateAudio}
            />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleGenerateAudio}
              disabled={isGenerating || !text.trim()}
              className={`flex-1 rounded-full py-3 px-6 font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 border-none bg-gradient-to-r ${getGradientClass(
                "primary"
              )} text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "var(--button-shadow)" }}
            >
              {isGenerating ? "Generating Speech..." : "Generate Speech"}
            </button>
            <button
              onClick={handleClear}
              disabled={isGenerating}
              className="flex-1 bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="w-full flex justify-center">
            <LoadingSpinner
              size="large"
              text="Detecting emotion and generating speech..."
            />
          </div>
        )}

        {/* Emotion Detection Result */}
        {detectedEmotion && !isGenerating && (
          <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Detected Emotion
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${getEmotionColor(
                  detectedEmotion
                )}`}
              >
                {detectedEmotion.charAt(0).toUpperCase() +
                  detectedEmotion.slice(1)}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This emotion was used to generate the speech below
              </p>
            </div>
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && !isGenerating && (
          <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Generated Speech
            </h2>

            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <audio controls className="w-full" src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Download Audio
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Generate New
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            Emotion-Aware Speech Features:
          </h3>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>• Automatically detect emotion from your text</li>
            <li>• Generate speech that matches the detected emotion</li>
            <li>
              • Support for joy, sadness, anger, fear, surprise, disgust, and
              neutral
            </li>
            <li>• High-quality emotion-aware audio output</li>
            <li>• Download speech files in WAV format</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

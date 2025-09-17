"use client";
import { useState, useRef } from "react";
import { useGeneration } from "../hooks/useGeneration";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ResultDisplay from "../components/ResultDisplay";
import { useTheme } from "../context/ThemeContext";

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string[];
    borderColor: string[];
    borderWidth: number;
  }>;
}

interface ChartConfig {
  type: string;
  data: ChartData;
  options: any;
}

interface ChartOptions {
  chart_types: Array<{ value: string; label: string }>;
  columns: string[];
  tones: Array<{ value: string; label: string }>;
  color_schemes: Array<{ value: string; label: string }>;
  languages: Array<{ value: string; label: string }>;
  defaults: {
    chart_type: string;
    x_axis: string;
    y_axis: string;
    tone: string;
    color_scheme: string;
    language: string;
  };
}

interface Metrics {
  generation_time: number;
  cpu_usage: number;
  memory_usage: number;
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const [prompt, setPrompt] = useState("");
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [infographicUrl, setInfographicUrl] = useState<string | null>(null);
  const [infographicData, setInfographicData] = useState<any>(null);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [parameters, setParameters] = useState<any>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    state, 
    generateInfographic, 
    generateGraph, 
    generateIllustration, 
    generateStoryboard,
    clearError,
    clearResult 
  } = useGeneration();

  const getApiBaseUrl = () => {
    const settings = localStorage.getItem('apiSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.infographicBaseUrl || 'http://localhost:5000';
    }
    return 'http://localhost:5000';
  };

  // Get gradient classes based on theme
  const getGradientClass = (type: 'primary' | 'secondary') => {
    const gradients = {
      primary: {
        'indigo-blue': 'from-indigo-500 to-blue-400',
        'purple-pink': 'from-purple-500 to-pink-400',
        'green-teal': 'from-green-400 to-teal-400',
        'orange-yellow': 'from-orange-400 to-yellow-400',
        'red-pink': 'from-red-400 to-pink-400'
      },
      secondary: {
        'blue-green': 'from-blue-400 to-green-400',
        'purple-blue': 'from-purple-400 to-blue-400',
        'pink-orange': 'from-pink-400 to-orange-400',
        'teal-cyan': 'from-teal-400 to-cyan-400',
        'yellow-orange': 'from-yellow-400 to-orange-400'
      }
    };
    
    const gradientKey = type === 'primary' ? theme.primaryGradient : theme.secondaryGradient;
    return gradients[type][gradientKey as keyof typeof gradients[typeof type]] || 'from-indigo-500 to-blue-400';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${getApiBaseUrl()}/api/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCsvData(result.sample_data || []);
        setColumns(result.columns || []);
        setCurrentFilename(result.filename);
        setUploadStatus(`Uploaded: ${result.filename} (${result.row_count} rows)`);
        
        // Get chart options
        await fetchChartOptions(result.filename);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const fetchChartOptions = async (filename: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/infograph/chart-options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch chart options: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setChartOptions(result.options);
        setParameters(result.options.defaults);
      } else {
        throw new Error(result.error || 'Failed to fetch chart options');
      }
    } catch (error) {
      console.error('Chart options error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Failed to fetch chart options'}`);
    }
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGenerate = async (generationType: 'infographic' | 'graph' | 'illustration' | 'storyboard') => {
    if (generationType === 'infographic' || generationType === 'graph') {
      // Handle CSV-based generation
      if (!currentFilename) {
        alert("Please upload a CSV file first.");
        return;
      }
      
      await handleCsvGeneration(generationType);
    } else {
      // Handle prompt-based generation
      if (!prompt.trim()) {
        alert("Please enter a prompt first.");
        return;
      }
      
      await handlePromptGeneration(generationType);
    }
  };

  const handleCsvGeneration = async (generationType: 'infographic' | 'graph') => {
    setIsGenerating(true);
    setUploadStatus("Generating...");

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: currentFilename,
          parameters: {
            ...parameters,
            chart_type: generationType === 'infographic' ? 'infographic' : parameters.chart_type
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.chart_config) {
          setChartConfig(result.chart_config);
        }

        if (result.infographic) {
          // Handle Base64 infographic from Flask API
          const base64Data = result.infographic.base64;
          setInfographicUrl(base64Data);
          setInfographicData(result.infographic);
        } else if (result.chart) {
          // Handle Base64 chart from Flask API
          const base64Data = result.chart.base64;
          setInfographicUrl(base64Data);
          setInfographicData({
            dimensions: "512x512",
            format: result.chart.format,
            prompt_used: `Generated ${result.chart.type} chart`,
            type: result.chart.type
          });
        }

        if (result.metrics) {
          setMetrics(result.metrics);
        }

        setUploadStatus("Generated!");
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generate error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromptGeneration = async (generationType: 'illustration' | 'storyboard') => {
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
    setInfographicUrl(null);
    setInfographicData(null);
    setChartConfig(null);
    setMetrics(null);
    setUploadStatus("");
  };

  const renderChart = () => {
    if (!chartConfig) return null;

    return (
      <div className="w-full h-64 bg-white rounded-lg p-4">
        <canvas id="chartCanvas" className="w-full h-full"></canvas>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl mx-auto mt-8 p-8 bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-4">
        <h1 className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${getGradientClass('primary')} mb-2`}>Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Generate all types of visual content from your prompts and data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Controls */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Controls</h2>
          
          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV (for Infographics & Graphs):
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isUploading}
            />
          </div>

          {/* Upload Status */}
          {isUploading && (
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner size="small" text="Uploading..." />
            </div>
          )}
          
          {uploadStatus && (
            <p className="text-sm text-center mb-4 text-gray-600 dark:text-gray-300">
              {uploadStatus}
            </p>
          )}

          {/* Chart Options */}
          {chartOptions && (
            <div className="mb-4">
              <h3 className="font-bold mb-2 text-gray-900 dark:text-gray-100">Chart Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Chart Type
                  </label>
                  <select
                    value={parameters.chart_type || ''}
                    onChange={(e) => handleParameterChange('chart_type', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {chartOptions.chart_types.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    X-Axis
                  </label>
                  <select
                    value={parameters.x_axis || ''}
                    onChange={(e) => handleParameterChange('x_axis', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {chartOptions.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Y-Axis
                  </label>
                  <select
                    value={parameters.y_axis || ''}
                    onChange={(e) => handleParameterChange('y_axis', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {chartOptions.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tone
                  </label>
                  <select
                    value={parameters.tone || ''}
                    onChange={(e) => handleParameterChange('tone', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {chartOptions.tones.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Color Scheme
                  </label>
                  <select
                    value={parameters.color_scheme || ''}
                    onChange={(e) => handleParameterChange('color_scheme', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {chartOptions.color_schemes.map((scheme) => (
                      <option key={scheme.value} value={scheme.value}>
                        {scheme.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Generation Buttons */}
          <div className="space-y-3">
            <button
              className={`w-full rounded-full py-3 px-4 font-bold text-sm shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 border-none bg-gradient-to-r ${getGradientClass('primary')} text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "var(--button-shadow)" }}
              onClick={() => handleGenerate('infographic')}
              disabled={!currentFilename || isGenerating}
            >
              Generate Infographic
            </button>
            <button
              className={`w-full rounded-full py-3 px-4 font-bold text-sm shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 border-none bg-gradient-to-r ${getGradientClass('secondary')} text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "var(--button-shadow)" }}
              onClick={() => handleGenerate('graph')}
              disabled={!currentFilename || isGenerating}
            >
              Generate Graph
            </button>
          </div>
        </div>

        {/* Prompt Input */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Prompt Generation</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter your prompt:
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-md text-sm"
              placeholder="Describe what you want to generate..."
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              disabled={state.loading}
            />
          </div>

          {/* Generation Buttons */}
          <div className="space-y-3">
            <button
              className={`w-full rounded-full py-3 px-4 font-bold text-sm shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 border-none bg-gradient-to-r ${getGradientClass('primary')} text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "var(--button-shadow)" }}
              onClick={() => handleGenerate('illustration')}
              disabled={!prompt.trim() || state.loading}
            >
              Generate Illustration
            </button>
            <button
              className={`w-full rounded-full py-3 px-4 font-bold text-sm shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-400 border-none bg-gradient-to-r ${getGradientClass('secondary')} text-white hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "var(--button-shadow)" }}
              onClick={() => handleGenerate('storyboard')}
              disabled={!prompt.trim() || state.loading}
            >
              Generate Storyboard
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Results</h2>
          
          {/* Error Display */}
          {state.error && (
            <ErrorMessage 
              message={state.error} 
              onDismiss={clearError}
              onRetry={() => handleGenerate('illustration')}
            />
          )}

          {/* Loading State */}
          {(state.loading || isGenerating) && (
            <div className="w-full flex justify-center">
              <LoadingSpinner size="large" text="Generating..." />
            </div>
          )}

          {/* Flask API Results */}
          {infographicUrl && !isGenerating && (
            <div className="space-y-4">
              <div className="text-center">
                <img 
                  src={infographicUrl} 
                  alt="Generated content"
                  className="w-64 h-64 mx-auto object-cover rounded-lg shadow-lg"
                  style={{ width: '256px', height: '256px' }}
                />
              </div>
              
              {infographicData && (
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                  <p><strong>Type:</strong> {infographicData.type || 'Generated'}</p>
                  <p><strong>Format:</strong> {infographicData.format}</p>
                  <p><strong>Dimensions:</strong> {infographicData.dimensions}</p>
                  {infographicData.prompt_used && (
                    <p><strong>Prompt:</strong> {infographicData.prompt_used}</p>
                  )}
                </div>
              )}

              {metrics && (
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <p><strong>Generation Time:</strong> {metrics.generation_time}s</p>
                  <p><strong>CPU Usage:</strong> {metrics.cpu_usage}%</p>
                  <p><strong>Memory Usage:</strong> {metrics.memory_usage}%</p>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = infographicUrl;
                    link.download = `generated_${Date.now()}.png`;
                    link.click();
                  }}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={handleGenerateNew}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Generate New
                </button>
              </div>
            </div>
          )}

          {/* API Service Results */}
          {state.result && !state.loading && !infographicUrl && (
            <ResultDisplay 
              result={state.result} 
              onGenerateNew={handleGenerateNew}
            />
          )}
        </div>
      </div>
    </div>
  );
} 
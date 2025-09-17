"use client";
import { useState, useRef } from "react";
import { useGeneration } from "../hooks/useGeneration";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import ResultDisplay from "../components/ResultDisplay";

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

export default function InfographicPage() {
  const [csvData, setCsvData] = useState<any>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [chartOptions, setChartOptions] = useState<ChartOptions | null>(null);
  const [parameters, setParameters] = useState<any>({});
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [infographicUrl, setInfographicUrl] = useState<string>("");
  const [infographicData, setInfographicData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [metrics, setMetrics] = useState<{ generation_time: number; cpu_usage: number; memory_usage: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, clearError, clearResult } = useGeneration();

  // Get API base URL from settings
  const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:5000';
    const settings = JSON.parse(localStorage.getItem('apiSettings') || '{}');
    return settings.infographicBaseUrl || 'http://localhost:5000';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");
    clearError();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/infograph/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setCsvData(result.sample_data);
      setColumns(result.columns);
      setFilename(result.filename);

      // Get chart options
      const optionsResponse = await fetch(`${baseUrl}/infograph/chart-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: result.filename })
      });

      if (!optionsResponse.ok) {
        throw new Error(`Chart options HTTP ${optionsResponse.status}`);
      }

      const optionsResult = await optionsResponse.json();
      setChartOptions(optionsResult.options);
      setParameters(optionsResult.options.defaults);
      setUploadStatus("Ready!");
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleParameterChange = (key: string, value: string) => {
    setParameters((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleGenerate = async () => {
    if (!filename) {
      alert("Please upload a CSV file first.");
      return;
    }

    setIsGenerating(true);
    setUploadStatus("Generating...");
    clearError();

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/infograph/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filename, 
          parameters 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.chart_config) {
        setChartConfig(result.chart_config);
        // If backend embedded a PNG image in chart_config, show it in the preview column
        if (result.chart_config.image_base64) {
          setInfographicUrl(result.chart_config.image_base64);
          setInfographicData({
            dimensions: result.chart_config.dimensions || 'auto',
            format: 'PNG',
            prompt_used: 'Generated chart image',
            type: result.chart_config.type || 'chart'
          });
        }
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
    } catch (error) {
      console.error('Generate error:', error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Generation failed'}`);
    } finally {
      setIsGenerating(false);
    }
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
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-6xl mx-auto  p-8 bg-white/80 dark:bg-gray-900/80 shadow-2xl backdrop-blur-md border border-gray-200 dark:border-gray-800">
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-blue-400 mb-2">Infographic & Graphs</h1>
        <p className="text-gray-600 dark:text-gray-300">Upload CSV data and generate beautiful infographics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
        {/* Controls */}
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Controls</h2>
          
          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV:
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

          Upload Status
          {isUploading && (
            <div className="flex items-center justify-center mb-4">
              <LoadingSpinner size="small" text="" />
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
                    X-Axis Column
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
                    Y-Axis Column
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
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !filename}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          )}

          {/* Metrics */}
          {metrics && (
            <div className="mt-4 text-sm">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Metrics</h3>
              <p className="text-gray-600 dark:text-gray-300">Generation Time: {metrics.generation_time}s</p>
              <p className="text-gray-600 dark:text-gray-300">CPU: {metrics.cpu_usage}%</p>
              <p className="text-gray-600 dark:text-gray-300">Memory: {metrics.memory_usage}%</p>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-gray-800/90 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Preview</h2>
          
          <div className="min-h-[400px]">
            {/* Error Display */}
            {state.error && (
              <ErrorMessage 
                message={state.error} 
                onDismiss={clearError}
                onRetry={handleGenerate}
              />
            )}

            {/* Loading State */}
            {state.loading && (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="large" text="Generating your infographic..." />
              </div>
            )}

            {/* Result Display */}
            {state.result && !state.loading && (
              <ResultDisplay 
                result={state.result} 
                onGenerateNew={() => {
                  clearResult();
                  setChartConfig(null);
                  setMetrics(null);
                  setInfographicUrl("");
                }}
              />
            )}

            {/* Infographic Display */}
            {infographicUrl && !state.loading && !state.result && (
              <div className="w-full flex flex-col items-center">
              <div className="w-[512px] h-[512px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center shadow-md">
                <img
                src={infographicUrl.startsWith("data:") ? infographicUrl : `data:image/png;base64,${infographicUrl}`}
                alt="Generated Infographic"
                className="w-full h-full object-contain"
                onError={(e) => {
                  console.error("Failed to load infographic image");
                  e.currentTarget.style.display = "none";
                }}
                />
              </div>

              {infographicData && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg w-[512px]">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">AI Infographic Details:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Dimensions:</strong> {infographicData.dimensions}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Format:</strong> {infographicData.format}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300"></p>
                  </div>
                )}
              </div>
            )}

            {/* Chart Display */}
            {chartConfig && !state.loading && !state.result && !infographicUrl && (
              <div className="w-full">
                {renderChart()}
              </div>
            )}

            {/* Placeholder */}
            {!chartConfig && !state.loading && !state.result && !infographicUrl && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 dark:text-gray-500">Your content will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
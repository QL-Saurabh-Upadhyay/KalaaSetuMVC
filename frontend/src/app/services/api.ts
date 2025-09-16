import axios from 'axios';

// Types for API responses
export interface GenerationResponse {
  success: boolean;
  data?: {
    imageUrl: string;
    imageId: string;
    prompt: string;
    type: string;
    createdAt: string;
  };
  error?: string;
}

export interface StoryboardResponse {
  storyboard: string; // Base64 encoded image
}

export interface IllustrationResponse {
  illustration: string; // Base64 encoded image (same field name as storyboard)
}

export interface AudioResponse {
  success: boolean;
  audioUrl?: string;
  audioData?: string; // Base64 encoded audio
  duration?: number;
  format?: string;
  error?: string;
}

export interface AudioRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
}

export interface EmotionDetectionResponse {
 
  dominant_emotion: string;

}

export interface SpeechGenerationResponse {
  success: boolean;
  audio_url: string;
  filename: string;
  message: string;
  error?: string;
}

export interface SpeechGenerationRequest {
  text: string;
  target_laguage?: string;
  speaker?: string;
 
}

export interface GenerationRequest {
  prompt: string;
  type: 'infographic' | 'graph' | 'illustration' | 'storyboard';
  options?: {
    style?: string;
    size?: 'small' | 'medium' | 'large';
    quality?: 'standard' | 'high';
  };
}

interface ApiSettings {
  infographicBaseUrl: string;
  illustrationBaseUrl: string;
  audioBaseUrl: string;
}

// Get settings from localStorage
const getSettings = (): ApiSettings => {
  if (typeof window === 'undefined') {
    return {
      infographicBaseUrl: '',
      illustrationBaseUrl: '',
      audioBaseUrl: '',
    };
  }

  const savedSettings = localStorage.getItem('apiSettings');
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch (error) {
      console.error('Error parsing saved settings:', error);
    }
  }

  return {
    infographicBaseUrl: '',
    illustrationBaseUrl: '',
    audioBaseUrl: '',
  };
};

// Create axios instance with dynamic configuration
const createApiClient = (baseURL: string) => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: 300000000, // 30 seconds timeout
    withCredentials: false, // Disable credentials for CORS
  });
};

// Create axios instance for form-urlencoded endpoints (storyboard and illustration)
const createFormApiClient = (baseURL: string) => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    },
    timeout: 30000000, // 10 minutes timeout
    withCredentials: false, // Disable credentials for CORS
  });
};

// Create axios instance for audio endpoints
const createAudioApiClient = (baseURL: string) => {
  return axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, audio/*',
    },
    timeout: 60000, // 60 seconds timeout for audio generation
    withCredentials: false, // Disable credentials for CORS
  });
};

// Request interceptor for logging and error handling
const addInterceptors = (apiClient: any) => {
  apiClient.interceptors.request.use(
    (config: any) => {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
      return config;
    },
    (error: any) => {
      console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  apiClient.interceptors.response.use(
    (response: any) => {
      console.log('API Response:', response.status, response.config.url);
      return response;
    },
    (error: any) => {
      console.error('API Response Error:', error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return apiClient;
};

// Convert base64 string to blob URL
const base64ToBlobUrl = (base64String: string, mimeType: string = 'image/png'): string => {
  try {
    // Clean the base64 string
    const cleanedBase64 = base64String.replace(/[\r\n\s]/g, '');
    
    // Validate base64 format
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanedBase64)) {
      console.error('Invalid base64 string format:', base64String.substring(0, 50) + '...');
      throw new Error('Invalid base64 format');
    }
    
    // Add padding if necessary
    const paddedBase64 = cleanedBase64 + '='.repeat((4 - cleanedBase64.length % 4) % 4);
    
    // Convert to blob
    const byteCharacters = atob(paddedBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error converting base64 to blob URL:', error);
    console.error('Base64 string (first 100 chars):', base64String.substring(0, 100));
    throw new Error(`Failed to process image data: ${error instanceof Error ? error.message : 'Invalid base64 format'}`);
  }
};

// API Service functions
export const apiService = {
  // Generate infographic
  async generateInfographic(prompt: string): Promise<GenerationResponse> {
    try {
      const settings = getSettings();
      if (!settings.infographicBaseUrl) {
        throw new Error('Infographic API URL not configured');
      }

      const apiClient = addInterceptors(createApiClient(settings.infographicBaseUrl));
      const response = await apiClient.post('/generate-infographic', { prompt });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate graph
  async generateGraph(prompt: string): Promise<GenerationResponse> {
    try {
      const settings = getSettings();
      if (!settings.infographicBaseUrl) {
        throw new Error('Infographic API URL not configured');
      }

      const apiClient = addInterceptors(createApiClient(settings.infographicBaseUrl));
      const response = await apiClient.post('/generate-graph', { prompt });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate illustration
  async generateIllustration(prompt: string): Promise<IllustrationResponse> {
    try {
      const settings = getSettings();
      if (!settings.illustrationBaseUrl) {
        throw new Error('Illustration API URL not configured');
      }

      const apiClient = addInterceptors(createFormApiClient(settings.illustrationBaseUrl));
      const formData = new URLSearchParams();
      formData.append('prompt', prompt);

      const response = await apiClient.post('/generate-illustration', formData);
      
      console.log('Illustration API Response:', response.data);
      
      // Check for illustration field first, then fallback to storyboard
      const imageData = response.data.illustration || response.data.storyboard;
      
      if (!imageData) {
        throw new Error('No illustration data received from API');
      }

      // Validate that the data looks like base64
      if (typeof imageData !== 'string' || imageData.length < 100) {
        console.error('Invalid image data received:', imageData);
        throw new Error('Invalid image data received from API');
      }

      // Convert base64 to blob URL
      const blobUrl = base64ToBlobUrl(imageData, 'image/png');
      
      return {
        illustration: blobUrl
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate storyboard
  async generateStoryboard(prompt: string): Promise<StoryboardResponse> {
    try {
      const settings = getSettings();
      if (!settings.illustrationBaseUrl) {
        throw new Error('Illustration API URL not configured');
      }

      const apiClient = addInterceptors(createFormApiClient(settings.illustrationBaseUrl));
      const formData = new URLSearchParams();
      formData.append('prompt', prompt);

      const response = await apiClient.post('/generate-storyboard', formData);
      
      console.log('Storyboard API Response:', response.data);
      
      // Check for storyboard field
      const imageData = response.data.storyboard;
      
      if (!imageData) {
        throw new Error('No storyboard data received from API');
      }

      // Validate that the data looks like base64
      if (typeof imageData !== 'string' || imageData.length < 100) {
        console.error('Invalid storyboard data received:', imageData);
        throw new Error('Invalid storyboard data received from API');
      }

      // Convert base64 to blob URL
      const blobUrl = base64ToBlobUrl(imageData, 'image/png');
      
      return {
        storyboard: blobUrl
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate audio
  async generateAudio(request: AudioRequest): Promise<AudioResponse> {
    try {
      const settings = getSettings();
      if (!settings.audioBaseUrl) {
        throw new Error('Audio API URL not configured');
      }

      const apiClient = addInterceptors(createAudioApiClient(settings.audioBaseUrl));
      const response = await apiClient.post('/generate-audio', request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Audio generation failed');
      }

      // If audio data is base64, convert to blob URL
      if (response.data.audioData) {
        const blobUrl = base64ToBlobUrl(response.data.audioData, 'audio/mpeg');
        return {
          ...response.data,
          audioUrl: blobUrl
        };
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Detect emotion from text
  async detectEmotion(text: string): Promise<EmotionDetectionResponse> {
    try {
      const settings = getSettings();
      if (!settings.audioBaseUrl) {
        throw new Error('Audio API URL not configured');
      }

      const apiClient = addInterceptors(createApiClient(settings.audioBaseUrl));
      const response = await apiClient.post('/detect_emotion', { text });
      
      if (!response.data.dominant_emotion) {
        throw new Error(response.data.error || 'Emotion detection failed');
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Generate speech with emotion
  async generateSpeech(request: SpeechGenerationRequest): Promise<SpeechGenerationResponse> {
    try {
      // Use local Next.js proxy which forwards to the real backend configured
      // via AUDIO_BASE_URL on the server. This keeps client-side code simple
      // and avoids CORS/ngrok issues.
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/*, application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error(`Speech proxy failed: ${response.status} ${txt.substring(0, 300)}`);
      }

      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await response.json();
        if (!data.audio_url && !data.success) {
          throw new Error(data.error || 'Speech generation failed');
        }
        // If upstream returned JSON with audio_url, return it
        return data;
      }

      // Otherwise, assume binary audio stream was returned. Convert to blob URL.
      const ab = await response.arrayBuffer();
      const blob = new Blob([ab], { type: ct || 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const filename = `tts_${Date.now()}.wav`;
      return {
        success: true,
        audio_url: url,
        filename,
        message: 'Speech generated (proxied)'
      };
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get generation status
  async getGenerationStatus(generationId: string): Promise<any> {
    try {
      const settings = getSettings();
      const apiClient = addInterceptors(createApiClient(settings.infographicBaseUrl));
      const response = await apiClient.get(`/status/${generationId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get generation history
  async getGenerationHistory(): Promise<any[]> {
    try {
      const settings = getSettings();
      const apiClient = addInterceptors(createApiClient(settings.infographicBaseUrl));
      const response = await apiClient.get('/history');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get available voices for audio generation
  async getAvailableVoices(): Promise<string[]> {
    try {
      const settings = getSettings();
      if (!settings.audioBaseUrl) {
        throw new Error('Audio API URL not configured');
      }

      const apiClient = addInterceptors(createAudioApiClient(settings.audioBaseUrl));
      const response = await apiClient.get('/voices');
      return response.data.voices || [];
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get available languages for audio generation
  async getAvailableLanguages(): Promise<string[]> {
    try {
      const settings = getSettings();
      if (!settings.audioBaseUrl) {
        throw new Error('Audio API URL not configured');
      }

      const apiClient = addInterceptors(createAudioApiClient(settings.audioBaseUrl));
      const response = await apiClient.get('/languages');
      return response.data.languages || [];
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Error handling utility
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message || 'Unknown error';
    
    switch (status) {
      case 400:
        return `Bad request: ${message}`;
      case 401:
        return `Unauthorized: ${message}`;
      case 403:
        return `Forbidden: ${message}`;
      case 404:
        return `Not found: ${message}`;
      case 429:
        return `Rate limited: ${message}`;
      case 500:
        return `Server error: ${message}`;
      default:
        return `HTTP ${status}: ${message}`;
    }
  } else if (error.request) {
    // Request was made but no response received
    if (error.message && error.message.includes('CORS')) {
      return 'CORS error: The server is not configured to allow requests from this origin. Please check your API URL and server CORS settings.';
    }
    return 'No response from server. Please check your connection.';
  } else {
    // Something else happened
    if (error.message && error.message.includes('CORS')) {
      return 'CORS error: The server is not configured to allow requests from this origin. Please check your API URL and server CORS settings.';
    }
    return error.message || 'An unexpected error occurred';
  }
};
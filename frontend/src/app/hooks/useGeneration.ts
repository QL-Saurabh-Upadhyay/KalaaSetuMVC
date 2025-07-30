import { useState, useCallback } from 'react';
import { 
  apiService, 
  GenerationRequest, 
  GenerationResponse, 
  StoryboardResponse,
  IllustrationResponse,
  handleApiError 
} from '../services/api';

interface GenerationState {
  loading: boolean;
  error: string | null;
  result: GenerationResponse | StoryboardResponse | IllustrationResponse | null;
}

interface UseGenerationReturn {
  state: GenerationState;
  generateInfographic: (prompt: string, options?: GenerationRequest['options']) => Promise<void>;
  generateGraph: (prompt: string, options?: GenerationRequest['options']) => Promise<void>;
  generateIllustration: (prompt: string, options?: GenerationRequest['options']) => Promise<void>;
  generateStoryboard: (prompt: string, options?: GenerationRequest['options']) => Promise<void>;
  clearError: () => void;
  clearResult: () => void;
  reset: () => void;
}

export const useGeneration = (): UseGenerationReturn => {
  const [state, setState] = useState<GenerationState>({
    loading: false,
    error: null,
    result: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading, error: loading ? null : prev.error }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const setResult = useCallback((result: GenerationResponse | StoryboardResponse | IllustrationResponse) => {
    setState(prev => ({ ...prev, result, loading: false, error: null }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearResult = useCallback(() => {
    setState(prev => ({ ...prev, result: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      result: null,
    });
  }, []);

  const generateInfographic = useCallback(async (prompt: string, options?: GenerationRequest['options']) => {
    try {
      setLoading(true);
      const result = await apiService.generateInfographic(prompt);
      setResult(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    }
  }, [setLoading, setResult, setError]);

  const generateGraph = useCallback(async (prompt: string, options?: GenerationRequest['options']) => {
    try {
      setLoading(true);
      const result = await apiService.generateGraph(prompt);
      setResult(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    }
  }, [setLoading, setResult, setError]);

  const generateIllustration = useCallback(async (prompt: string, options?: GenerationRequest['options']) => {
    try {
      setLoading(true);
      const result = await apiService.generateIllustration(prompt);
      setResult(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    }
  }, [setLoading, setResult, setError]);

  const generateStoryboard = useCallback(async (prompt: string, options?: GenerationRequest['options']) => {
    try {
      setLoading(true);
      const result = await apiService.generateStoryboard(prompt);
      setResult(result);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setError(errorMessage);
    }
  }, [setLoading, setResult, setError]);

  return {
    state,
    generateInfographic,
    generateGraph,
    generateIllustration,
    generateStoryboard,
    clearError,
    clearResult,
    reset,
  };
}; 
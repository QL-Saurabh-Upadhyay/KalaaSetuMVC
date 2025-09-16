import { GenerationResponse, StoryboardResponse, IllustrationResponse } from '../services/api';
import { useEffect, useRef } from 'react';

interface ResultDisplayProps {
  result: GenerationResponse | StoryboardResponse | IllustrationResponse;
  onGenerateNew?: () => void;
}

export default function ResultDisplay({ result, onGenerateNew }: ResultDisplayProps) {
  const blobUrlRef = useRef<string | null>(null);

  // Extract data based on response type
  const getResultData = () => {
    if ('data' in result && result.data) {
      // GenerationResponse type
      return {
        imageUrl: result.data.imageUrl,
        prompt: result.data.prompt,
        type: result.data.type,
        createdAt: result.data.createdAt
      };
    } else if ('storyboard' in result) {
      // StoryboardResponse type
      return {
        imageUrl: result.storyboard,
        prompt: 'Storyboard Generation',
        type: 'storyboard',
        createdAt: new Date().toISOString()
      };
    } else if ('illustration' in result) {
      // IllustrationResponse type
      return {
        imageUrl: result.illustration,
        prompt: 'Illustration Generation',
        type: 'illustration',
        createdAt: new Date().toISOString()
      };
    }
    return null;
  };

  const resultData = getResultData();

  if (!resultData) {
    return (
      <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Invalid Result Format
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The generated result could not be displayed properly.
          </p>
        </div>
      </div>
    );
  }

  const { imageUrl, prompt, type, createdAt } = resultData;

  // Store blob URL for cleanup
  useEffect(() => {
    if (imageUrl.startsWith('blob:')) {
      blobUrlRef.current = imageUrl;
    }
    
    // Cleanup function to revoke blob URL when component unmounts
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [imageUrl]);

  const handleDownload = async () => {
    try {
      const link = document.createElement('a');
      link.download = `${type}-${Date.now()}.png`;
      
      // For blob URLs, we can use them directly
      if (imageUrl.startsWith('blob:')) {
        link.href = imageUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For regular URLs, we need to fetch and create a blob
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Generation Complete!
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Created on {formatDate(createdAt)}
        </p>
      </div>
      
      <div className="mb-4">
        <img 
          src={imageUrl} 
          alt={`Generated ${type}`}
          className="w-512 h-512 mx-auto rounded-lg shadow-md object-cover"
          style={{ width: '512px', height: '512px' }}
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.png';
          }}
        />
      </div>

      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Type:</h4>
        <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg capitalize">
          {type}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 bg-gradient-to-r from-indigo-500 to-blue-400 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all duration-200 shadow-lg"
        >
          Download Image
        </button>
        {onGenerateNew && (
          <button
            onClick={onGenerateNew}
            className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Generate New
          </button>
        )}
      </div>
    </div>
  );
} 
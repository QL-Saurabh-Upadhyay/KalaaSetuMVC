interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'medium', 
  color = 'primary',
  text = 'Generating...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'border-indigo-500',
    secondary: 'border-pink-500',
    white: 'border-white',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className={`${sizeClasses[size]} ${colorClasses[color]} border-2 border-t-transparent rounded-full animate-spin`}
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
          {text}
        </p>
      )}
    </div>
  );
} 
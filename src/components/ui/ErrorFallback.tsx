import type { FallbackProps } from 'react-error-boundary';

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-xl w-full mx-auto p-8">
        <div className="bg-red-900/50 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            Something went wrong
          </h2>
          <div className="text-gray-300 mb-6">
            <p className="mb-2">An unexpected error occurred. Please try again.</p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-4 p-4 bg-gray-800 rounded text-left overflow-auto text-sm">
                {error.message}
              </pre>
            )}
          </div>
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// Format analysis text to convert markdown bold to HTML
function formatAnalysis(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Find all **text** patterns
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      
      // Add bold text
      parts.push(
        <strong key={`${lineIndex}-${match.index}`} className="font-bold">
          {match[1]}
        </strong>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    return (
      <span key={lineIndex}>
        {parts.length > 0 ? parts : line}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
}

interface BuildAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: Array<{
    category: string;
    title: string;
    description?: string;
  }>;
  cachedAnalysis: string | null;
  onAnalysisGenerated: (analysis: string) => void;
}

export function BuildAnalysisModal({
  isOpen,
  onClose,
  components,
  cachedAnalysis,
  onAnalysisGenerated,
}: BuildAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && components.length > 0) {
      // Use cached analysis if available
      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
        setIsLoading(false);
        setError(null);
      } else {
        // Generate new analysis only if no cache
        generateAnalysis();
      }
    }
  }, [isOpen, components, cachedAnalysis]);

  const generateAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const response = await fetch('/api/analyze-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ components }),
      });

      if (!response.ok) {
        throw new Error('Error al generar el análisis');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      // Save the generated analysis to cache
      onAnalysisGenerated(data.analysis);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Error al generar el análisis. Por favor, intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white p-2 shadow-md">
                <Image
                  src="/mallwi.png"
                  alt="Mallwi"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Análisis de Build
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Análisis técnico por mallwi
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative w-28 h-28 mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                    <Image
                      src="/mallwi.png"
                      alt="Mallwi"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-contain animate-pulse"
                    />
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-28 w-28 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              </div>
              <p className="text-lg font-medium text-gray-700 mt-2">
                Analizando tu PC...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                mallwi está evaluando tu configuración
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-red-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <button
                    onClick={generateAnalysis}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && analysis && (
            <div className="prose prose-sm max-w-none">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                <div className="text-gray-800 leading-relaxed">
                  {formatAnalysis(analysis)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

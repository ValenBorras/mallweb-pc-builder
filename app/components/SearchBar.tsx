'use client';

import { useState, useEffect, useRef } from 'react';
import { getSuggestedSearchTerms, type CategoryKey } from '@/lib/catalog';

interface SearchBarProps {
  category: CategoryKey;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ category, onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = getSuggestedSearchTerms(category);

  // Reset query when category changes
  useEffect(() => {
    setQuery('');
    onSearch(''); // Clear search when category changes
  }, [category, onSearch]);

  // Update search in real-time as user types
  useEffect(() => {
    onSearch(query.trim());
  }, [query, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          {/* Search icon */}
          <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-500">
            {isLoading ? (
              <svg className="w-4 h-4 md:w-5 md:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Buscar productos..."
            className="
              w-full py-2.5 md:py-3 pl-10 md:pl-12 pr-10 md:pr-12 rounded-xl text-sm md:text-base
              bg-white border border-gray-300
              text-gray-900 placeholder-gray-500
              focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20
              transition-all
            "
          />

          {/* Clear button */}
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && !query && (
        <div className="absolute z-20 w-full mt-2 py-2 rounded-xl bg-white border border-gray-300 shadow-xl">
          <div className="px-3 py-2 text-xs text-gray-500 uppercase tracking-wider">
            Sugerencias
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.slice(0, 8).map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * Mall Web API Client
 * Handles communication with the Gestión Resellers API
 */

import type { MallWebSearchRequest, MallWebSearchResponse } from './types';

const API_BASE_URL = 'https://checkout.gestionresellers.com.ar/api';
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// In-memory cache for search results
const searchCache = new Map<string, { data: MallWebSearchResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class MallWebApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'MallWebApiError';
  }
}

function getCacheKey(request: MallWebSearchRequest): string {
  return JSON.stringify({
    keywords: request.keywords.toLowerCase().trim(),
    page: request.page ?? 1,
    results_per_page: request.results_per_page ?? 20,
  });
}

function getCachedResult(key: string): MallWebSearchResponse | null {
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) {
    searchCache.delete(key);
  }
  return null;
}

function setCachedResult(key: string, data: MallWebSearchResponse): void {
  // Limit cache size
  if (searchCache.size > 100) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { data, timestamp: Date.now() });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Search products in the Mall Web catalog using the unified API
 * This function is meant to be called from the server-side only
 */
export async function searchProducts(
  request: MallWebSearchRequest,
  apiKey: string
): Promise<MallWebSearchResponse> {
  const cacheKey = getCacheKey(request);
  const cachedResult = getCachedResult(cacheKey);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use the unified API (same as checkout)
      const api = getMallwebApi();
      
      const response = await api.viarapidaItemSearch({
        request: {
          keywords: request.keywords,
          page: request.page ?? 1,
          resultsPerPage: request.results_per_page ?? 20,
          fqs: [{ key: 'inStock', value: '1' }],
        }
      });

      // Normalize the response to match our expected format
      const normalizedResponse: MallWebSearchResponse = {
        current_page: response.page ?? 1,
        total_pages: response.totalPages ?? 1,
        total_items: response.totalItems ?? 0,
        items: response.items || [],
        request: request,
      };
      
      setCachedResult(cacheKey, normalizedResponse);
      return normalizedResponse;

    } catch (error) {
      lastError = error as Error;
      
      // Handle API errors
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: Response };
        
        if (apiError.response) {
          const status = apiError.response.status;
          
          if (status === 400) {
            throw new MallWebApiError(
              'Invalid search parameters',
              400,
              false
            );
          }
          
          if (status === 401) {
            throw new MallWebApiError(
              'Invalid API key - authentication failed',
              401,
              false
            );
          }
          
          if (status >= 500) {
            throw new MallWebApiError(
              `Server error: ${status}`,
              status,
              true
            );
          }
        }
      }

      // Don't retry on non-retryable errors
      if (error instanceof MallWebApiError && !error.isRetryable) {
        throw error;
      }

      // Check for abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new MallWebApiError('Request timeout', 408, true);
      }

      // Wait before retrying (only if we have retries left)
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error('Unknown error during API request');
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Get configured API client for Mallweb checkout
 * This function is meant to be called from the server-side only
 */
export function getMallwebApi() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Configuration, DefaultApi } = require('@/app/api');
  
  const DEFAULT_LANGUAGE = 'es';
  const API_BASE_URL = process.env.GITECOMMERCEMCP_API_BASE_URL || 'https://checkout.gestionresellers.com.ar/api';
  const apiKey = process.env.CHECKOUT_API_KEY || '';
  
  const extraHeaders = {
    'Accept-Language': DEFAULT_LANGUAGE,
    ...(apiKey ? { 'X-API-Key': apiKey } : {}),
  };
  
  const configuration = new Configuration({
    basePath: API_BASE_URL,
    apiKey: apiKey,
    headers: extraHeaders,
  });
  
  return new DefaultApi(configuration);
}

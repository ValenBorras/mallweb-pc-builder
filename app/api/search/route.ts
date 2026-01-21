/**
 * Search API Proxy
 * Securely proxies requests to the Mall Web API without exposing the API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, MallWebApiError } from '@/lib/mallweb/client';
import { normalizeItems } from '@/lib/mallweb/normalize';

// Rate limiting - simple in-memory implementation
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }

  record.count++;
  return false;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

interface SearchRequestBody {
  keywords: string;
  page?: number;
  resultsPerPage?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ?? 
               request.headers.get('x-real-ip') ?? 
               'unknown';

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    // Get API key from environment (using unified checkout API key)
    const apiKey = process.env.CHECKOUT_API_KEY || process.env.MALLWEB_API_KEY;
    if (!apiKey) {
      console.error('CHECKOUT_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body: SearchRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.keywords || typeof body.keywords !== 'string') {
      return NextResponse.json(
        { error: 'keywords is required and must be a string' },
        { status: 400 }
      );
    }

    if (body.keywords.trim().length < 2) {
      return NextResponse.json(
        { error: 'keywords must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const page = typeof body.page === 'number' && body.page > 0 
      ? body.page 
      : 1;
    
    const resultsPerPage = typeof body.resultsPerPage === 'number' && 
                           body.resultsPerPage > 0 && 
                           body.resultsPerPage <= 50
      ? body.resultsPerPage
      : 20;

    // Call the Mall Web API
    const response = await searchProducts(
      {
        keywords: body.keywords.trim(),
        page,
        results_per_page: resultsPerPage,
      },
      apiKey
    );

    // Normalize the items
    const products = normalizeItems(response.items);

    // Return the response
    return NextResponse.json({
      products,
      currentPage: response.current_page,
      totalPages: response.total_pages,
      keywords: response.request.keywords,
    });
  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof MallWebApiError) {
      if (error.statusCode === 401) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        );
      }
      
      if (error.statusCode === 400) {
        return NextResponse.json(
          { error: 'Invalid search parameters' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Search service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Also support GET for simple testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keywords = searchParams.get('q');

  if (!keywords) {
    return NextResponse.json(
      { error: 'Missing q parameter' },
      { status: 400 }
    );
  }

  // Create a new request with the keywords in the body
  const body: SearchRequestBody = {
    keywords,
    page: parseInt(searchParams.get('page') ?? '1'),
    resultsPerPage: parseInt(searchParams.get('limit') ?? '20'),
  };

  // Create a new request with the body
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(request.headers),
    },
  });

  return POST(postRequest);
}


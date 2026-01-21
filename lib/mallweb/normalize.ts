/**
 * Normalization functions to transform Mall Web API items to internal Product type
 */

import type { MallWebItem, MallWebIdentifier } from './types';

// Internal Product type (normalized)
export interface Product {
  id: string;
  title: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  imageUrl: string;
  images: string[];
  categories: Array<{ id: string; name: string }>;
  identifiers: {
    sku: string;
    upc?: string;
    ean?: string;
    mpn?: string;
  };
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    weight?: number;
  };
  rating: {
    votes: number;
    value: number;
  };
  attributeGroups?: Array<{
    name: string;
    attributes: Array<{
      name: string;
      value: string;
    }>;
  }>;
  raw?: MallWebItem; // Keep raw data for debugging
}

/**
 * Get the best available image URL from an item
 * Prefer larger thumbnails for better quality
 */
function getBestImageUrl(item: MallWebItem): string {
  if (!item.images || item.images.length === 0) {
    return '/placeholder-product.png';
  }

  const image = item.images[0];
  
  // Try to find a larger thumbnail (480px or higher)
  if (image.thumbnails && image.thumbnails.length > 0) {
    const largerThumb = image.thumbnails
      .filter((t) => t.height >= 480)
      .sort((a, b) => a.height - b.height)[0];
    
    if (largerThumb) {
      return largerThumb.url;
    }
    
    // Return the largest available thumbnail
    const sortedThumbs = [...image.thumbnails].sort((a, b) => b.height - a.height);
    return sortedThumbs[0]?.url ?? image.url;
  }

  return image.url;
}

/**
 * Get all image URLs from an item
 */
function getAllImageUrls(item: MallWebItem): string[] {
  if (!item.images || item.images.length === 0) {
    return [];
  }

  return item.images.map((img) => {
    // Try to get the best quality version
    if (img.thumbnails && img.thumbnails.length > 0) {
      const sortedThumbs = [...img.thumbnails].sort((a, b) => b.height - a.height);
      return sortedThumbs[0]?.url ?? img.url;
    }
    return img.url;
  });
}

/**
 * Extract identifier by type
 */
function getIdentifier(ids: MallWebIdentifier[], type: number): string | undefined {
  return ids.find((id) => id.id_type === type)?.id;
}

/**
 * Map currency codes to standard format
 * QVJT is a base64-encoded or internal code for ARS (Pesos Argentinos)
 */
function normalizeCurrency(currency: string): string {
  const currencyMap: Record<string, string> = {
    'QVJT': 'ARS',  // Pesos Argentinos
    'USD': 'USD',   // US Dollars
    'EUR': 'EUR',   // Euros
  };
  
  return currencyMap[currency] || currency;
}

/**
 * Normalize a Mall Web item to our internal Product type
 * Handles both snake_case (old API) and camelCase (new API) formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeItem(item: any, includeRaw = false): Product {
  // Handle both camelCase and snake_case
  const sourceId = item.sourceId || item.source_id;
  const attributeGroups = item.attributeGroups || item.attribute_groups;
  const unitDimensions = item.unitDimensions || item.unit_dimensions;
  
  const offer = item.offers?.[0];
  
  // Parse price and handle both currency formats
  const price = offer ? parseFloat(offer.price.amount) : 0;
  const rawCurrency = offer?.price.currency || 'ARS';
  const currency = normalizeCurrency(rawCurrency);
  
  return {
    id: sourceId,
    title: item.title,
    brand: item.brand || 'Sin marca',
    description: item.description || '',
    price: price,
    originalPrice: offer?.strikethroughPrice?.amount || offer?.strikethrough_price?.amount
      ? parseFloat(offer?.strikethroughPrice?.amount || offer?.strikethrough_price?.amount) 
      : undefined,
    currency: currency,
    stock: offer?.stock ?? 0,
    imageUrl: getBestImageUrl(item),
    images: getAllImageUrls(item),
    categories: item.category.map((cat: { id: string; name: string }) => ({
      id: cat.id,
      name: cat.name,
    })),
    identifiers: {
      sku: sourceId,
      upc: getIdentifier(item.ids, 2),
      ean: getIdentifier(item.ids, 3),
      mpn: getIdentifier(item.ids, 5),
    },
    dimensions: unitDimensions
      ? {
          height: unitDimensions.height,
          width: unitDimensions.width,
          depth: unitDimensions.depth,
          weight: unitDimensions.weight,
        }
      : undefined,
    rating: {
      votes: item.rating?.votes ?? 0,
      value: item.rating?.value ?? 0,
    },
    attributeGroups: attributeGroups?.map((group: { name: string; attributes: Array<{ name: string; value: string }> }) => ({
      name: group.name,
      attributes: group.attributes.map((attr: { name: string; value: string }) => ({
        name: attr.name,
        value: attr.value,
      })),
    })),
    raw: includeRaw ? item : undefined,
  };
}

/**
 * Normalize a list of Mall Web items
 */
export function normalizeItems(items: MallWebItem[], includeRaw = false): Product[] {
  return items.map((item) => normalizeItem(item, includeRaw));
}


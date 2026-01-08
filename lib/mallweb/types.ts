/**
 * Types for Mall Web API (Gestión Resellers)
 */

// Request types
export interface MallWebSearchRequest {
  keywords: string;
  page?: number;
  results_per_page?: number;
}

// Response types
export interface MallWebSearchResponse {
  current_page: number;
  total_pages: number;
  total_items: number;
  items: MallWebItem[];
  request: MallWebSearchRequest;
}

export interface MallWebItem {
  source_id: string;
  title: string;
  description: string;
  brand: string;
  category: Array<{
    id: string;
    name: string;
  }>;
  ids: MallWebIdentifier[];
  images: MallWebImage[];
  offers: MallWebOffer[];
  unit_dimensions?: MallWebDimensions;
  attribute_groups?: MallWebAttributeGroup[];
  rating?: {
    votes: number;
    value: number;
  };
}

export interface MallWebIdentifier {
  id_type: number;
  id: string;
}

export interface MallWebImage {
  url: string;
  thumbnails?: Array<{
    url: string;
    height: number;
    width: number;
  }>;
}

export interface MallWebOffer {
  price: {
    amount: string;
    currency: string;
  };
  strikethrough_price?: {
    amount: string;
    currency: string;
  };
  stock: number;
  seller?: {
    id: string;
    name: string;
  };
}

export interface MallWebDimensions {
  height?: number;
  width?: number;
  depth?: number;
  weight?: number;
  unit?: string;
}

export interface MallWebAttributeGroup {
  name: string;
  attributes: Array<{
    name: string;
    value: string;
  }>;
}


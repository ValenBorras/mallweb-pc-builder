/**
 * Query builders for searching products by category
 */

import { CATEGORIES, type CategoryKey } from './categories';

export interface SearchQuery {
  keywords: string;
  page: number;
  resultsPerPage: number;
}

/**
 * Build a search query for a specific category
 */
export function buildCategoryQuery(
  category: CategoryKey,
  customKeywords?: string,
  page = 1,
  resultsPerPage = 20
): SearchQuery {
  const categoryInfo = CATEGORIES[category];
  
  // If custom keywords provided, combine with category context
  const keywords = customKeywords
    ? `${customKeywords} ${categoryInfo.searchKeywords[0]}`
    : categoryInfo.searchKeywords[0];

  return {
    keywords,
    page,
    resultsPerPage,
  };
}

/**
 * Build a search query with custom keywords only
 */
export function buildCustomQuery(
  keywords: string,
  page = 1,
  resultsPerPage = 20
): SearchQuery {
  return {
    keywords: keywords.trim(),
    page,
    resultsPerPage,
  };
}

/**
 * Get suggested search terms for a category
 */
export function getSuggestedSearchTerms(category: CategoryKey): string[] {
  const baseTerms = CATEGORIES[category].searchKeywords;
  
  // Add brand-specific suggestions based on category
  const brandSuggestions: Record<CategoryKey, string[]> = {
    cpu: ['AMD Ryzen', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Ryzen 5', 'Ryzen 7'],
    motherboard: ['ASUS', 'Gigabyte', 'MSI', 'ASRock', 'B550', 'B650', 'Z690', 'Z790'],
    ram: ['Corsair', 'Kingston', 'G.Skill', 'Crucial', '16GB', '32GB', '3200MHz', '6000MHz'],
    gpu: ['NVIDIA RTX', 'AMD Radeon', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RX 7600', 'RX 7800'],
    storage: ['Samsung', 'WD', 'Kingston', 'Crucial', '500GB', '1TB', '2TB', 'NVMe'],
    psu: ['Corsair', 'EVGA', 'Seasonic', 'Cooler Master', '650W', '750W', '850W', '80 Plus Gold'],
    case: ['NZXT', 'Corsair', 'Cooler Master', 'Lian Li', 'ATX', 'Mid Tower'],
    cooler: ['Noctua', 'Corsair', 'be quiet!', 'DeepCool', 'AIO 240mm', 'AIO 360mm', 'Tower'],
    monitor: ['Samsung', 'LG', 'ASUS', 'AOC', '24"', '27"', '1080p', '1440p', '4K', '144Hz', '165Hz'],
    mouse: ['Logitech', 'Razer', 'SteelSeries', 'Corsair', 'Gaming', 'Inalámbrico', 'RGB'],
    headphones: ['Logitech', 'HyperX', 'Razer', 'Corsair', 'Redragon', 'Gaming', '7.1'],
    keyboard: ['Logitech', 'Razer', 'Corsair', 'Redragon', 'Mecánico', 'RGB', 'Gaming'],
    fans: ['Cooler Master', 'Corsair', 'NZXT', 'Thermaltake', '120mm', '140mm', 'RGB', 'ARGB'],
    peripherals: ['Logitech', 'Razer', 'Corsair', 'Redragon', 'Gaming', 'RGB'],
  };

  return [...baseTerms, ...(brandSuggestions[category] || [])];
}

/**
 * Parse search input to extract category hints
 */
export function parseSearchInput(input: string): {
  cleanedInput: string;
  detectedCategory?: CategoryKey;
} {
  const normalizedInput = input.toLowerCase().trim();
  
  // Check for category keywords in input
  for (const [key, category] of Object.entries(CATEGORIES)) {
    for (const keyword of category.searchKeywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        return {
          cleanedInput: input,
          detectedCategory: key as CategoryKey,
        };
      }
    }
  }

  return { cleanedInput: input };
}


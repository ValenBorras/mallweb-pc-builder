/**
 * Category Filtering Rules
 * Filters products based on their API category names
 */

import type { Product } from '../mallweb/normalize';
import type { CategoryKey } from './categories';

/**
 * Filter rules for each Arma tu PC category
 * - includePatterns: Product must have at least one category matching these patterns
 * - excludePatterns: Product is excluded if ANY category matches these patterns
 * - titleExcludePatterns: Product is excluded if title matches these patterns
 */
interface CategoryFilterRules {
  includePatterns: RegExp[];
  excludePatterns: RegExp[];
  titleExcludePatterns?: RegExp[];
  allowCombo?: boolean;
  comboNote?: string;
}

const FILTER_RULES: Record<CategoryKey, CategoryFilterRules> = {
  cpu: {
    // Match: "Microprocesadores AMD", "Microprocesadores Intel", etc.
    includePatterns: [
      /microprocesadores/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [],
  },
  motherboard: {
    // Match: "Mother para AMD", "Mother para INTEL", etc.
    includePatterns: [
      /^mother/i,
      /mother\s+para/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [
      /combo/i,
      /kit/i,
      /\+\s*micro/i,
      /\+\s*cpu/i,
      /\+\s*procesador/i,
    ],
  },
  ram: {
    // Match: "Memoria para PC"
    includePatterns: [
      /memoria\s+(para\s+)?pc/i,
      /memoria\s+ram/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit.*mother/i,
    ],
    titleExcludePatterns: [],
  },
  gpu: {
    // Match: "Placa de Video"
    includePatterns: [
      /placa\s+de\s+video/i,
      /placas\s+de\s+video/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [],
  },
  storage: {
    // Match: "Disco de Estado Solido"
    includePatterns: [
      /disco\s+de\s+estado\s+solido/i,
      /discos?\s+de\s+estado\s+solido/i,
      /ssd/i,
      /nvme/i,
      /disco\s+rigido/i,
      /discos?\s+rigidos?/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
      /externo/i,
      /externa/i,
      /portatil/i,
      /portable/i,
      /notebook/i,
    ],
    titleExcludePatterns: [
      /externo/i,
      /externa/i,
      /portatil/i,
      /portable/i,
      /notebook/i,
      /laptop/i,
    ],
  },
  psu: {
    // Match: "Fuentes de alimentacion"
    includePatterns: [
      /fuentes?\s+de\s+alimentacion/i,
      /fuentes?\s+de\s+poder/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
      /gabinete/i,
    ],
    titleExcludePatterns: [
      /combo/i,
      /gabinete/i,
      /\+\s*gabinete/i,
      /gabinete\s*\+/i,
    ],
  },
  case: {
    // Match: "Gabinetes"
    includePatterns: [
      /gabinetes?/i,
    ],
    excludePatterns: [],
    titleExcludePatterns: [],
    allowCombo: true,
    comboNote: '💡 Este gabinete puede incluir fuente de poder. Verificá las especificaciones.',
  },
  cooler: {
    // Match: "Coolers"
    includePatterns: [
      /coolers?/i,
      /refrigeracion/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
      /notebook/i,
      /laptop/i,
    ],
    titleExcludePatterns: [
      /notebook/i,
      /laptop/i,
      /base.*cooler/i,
      /cooler.*base/i,
      /pad/i,
      /stand/i,
    ],
  },
  monitor: {
    // Match: "Monitores"
    includePatterns: [
      /monitores?/i,
      /pantallas?/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
      /notebook/i,
      /laptop/i,
    ],
    titleExcludePatterns: [],
  },
  mouse: {
    // Match: "Perifericos de PC - Mouse"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [
      /auricular/i,
      /headset/i,
      /teclado/i,
      /keyboard/i,
      /parlante/i,
      /speaker/i,
      /microfono/i,
      /webcam/i,
    ],
  },
  headphones: {
    // Match: "Perifericos de PC - Auriculares"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [
      /mouse/i,
      /raton/i,
      /teclado/i,
      /keyboard/i,
      /parlante/i,
      /speaker/i,
      /microfono/i,
      /webcam/i,
    ],
  },
  keyboard: {
    // Match: "Perifericos de PC - Teclado"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [
      /mouse/i,
      /raton/i,
      /auricular/i,
      /headset/i,
      /parlante/i,
      /speaker/i,
      /microfono/i,
      /webcam/i,
    ],
  },
  peripherals: {
    // Match: All "Perifericos de PC"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
    ],
    titleExcludePatterns: [],
  },
};

/**
 * Check if a product's categories match any of the patterns
 */
function matchesPatterns(categories: Array<{ name: string }>, patterns: RegExp[]): boolean {
  return categories.some((cat) =>
    patterns.some((pattern) => pattern.test(cat.name))
  );
}

/**
 * Check if a text matches any of the patterns
 */
function textMatchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Filter a single product based on the category rules
 * Returns true if the product should be included
 */
export function shouldIncludeProduct(product: Product, categoryKey: CategoryKey): boolean {
  const rules = FILTER_RULES[categoryKey];
  const productCategories = product.categories;
  const title = product.title;

  // Must match at least one include pattern (by category name)
  const matchesInclude = matchesPatterns(productCategories, rules.includePatterns);
  if (!matchesInclude) {
    return false;
  }

  // Special logic for peripheral sub-categories: must also have keyword in title
  if (categoryKey === 'mouse') {
    const hasMouse = /mouse|rat[oó]n/i.test(title);
    if (!hasMouse) return false;
  } else if (categoryKey === 'headphones') {
    const hasHeadphones = /auricular|headset|headphone/i.test(title);
    if (!hasHeadphones) return false;
  } else if (categoryKey === 'keyboard') {
    const hasKeyboard = /teclado|keyboard/i.test(title);
    if (!hasKeyboard) return false;
  }

  // Must not match any exclude pattern (by category name)
  const matchesExclude = matchesPatterns(productCategories, rules.excludePatterns);
  if (matchesExclude && !rules.allowCombo) {
    return false;
  }

  // Must not match any title exclude pattern
  if (rules.titleExcludePatterns && rules.titleExcludePatterns.length > 0) {
    const titleMatchesExclude = textMatchesPatterns(title, rules.titleExcludePatterns);
    if (titleMatchesExclude && !rules.allowCombo) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a product is a combo (for categories that allow combos)
 */
export function isComboProduct(product: Product, categoryKey: CategoryKey): boolean {
  const rules = FILTER_RULES[categoryKey];
  if (!rules.allowCombo) return false;

  // Patterns to detect cases that include a PSU
  const comboPatterns = [
    /combo/i,
    /\+\s*fuente/i,
    /fuente\s*\+/i,
    /con\s*fuente/i,
    /c\/fuente/i,        // c/Fuente
    /fuente\s*\d+w/i,    // Fuente 500W, Fuente 600W
    /kit.*fuente/i,      // Kit...Fuente
    /fuente.*kit/i,      // Fuente...Kit
  ];
  
  const categoryMatches = matchesPatterns(product.categories, comboPatterns);
  const titleMatches = textMatchesPatterns(product.title, comboPatterns);

  return categoryMatches || titleMatches;
}

/**
 * Get combo note for a category
 */
export function getComboNote(categoryKey: CategoryKey): string | undefined {
  return FILTER_RULES[categoryKey].comboNote;
}

/**
 * Filter products for a specific category
 */
export function filterProductsByCategory(products: Product[], categoryKey: CategoryKey): Product[] {
  return products.filter((product) => shouldIncludeProduct(product, categoryKey));
}

/**
 * Debug function: Get reason why a product was excluded
 */
export function getExclusionReason(product: Product, categoryKey: CategoryKey): string | null {
  const rules = FILTER_RULES[categoryKey];
  const productCategories = product.categories;
  const title = product.title;

  const matchesInclude = matchesPatterns(productCategories, rules.includePatterns);
  if (!matchesInclude) {
    return `No match for include patterns. Categories: ${productCategories.map(c => c.name).join(', ')}`;
  }

  if (!rules.allowCombo) {
    const matchesExclude = matchesPatterns(productCategories, rules.excludePatterns);
    if (matchesExclude) {
      const matchedCat = productCategories.find((cat) =>
        rules.excludePatterns.some((pattern) => pattern.test(cat.name))
      );
      return `Matched exclude pattern in category: ${matchedCat?.name}`;
    }

    if (rules.titleExcludePatterns && rules.titleExcludePatterns.length > 0) {
      const titleMatchesExclude = textMatchesPatterns(title, rules.titleExcludePatterns);
      if (titleMatchesExclude) {
        return `Matched title exclude pattern: ${title}`;
      }
    }
  }

  return null;
}

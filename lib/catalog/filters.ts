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
    // Match: "Coolers" - Only CPU coolers, not case fans
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
      /\bfan\b(?!.*cpu)/i,           // "Fan" but not if followed by "CPU"
      /ventilador(?!.*cpu)/i,        // "Ventilador" but not if followed by "CPU"
      /cooler.*gabinete/i,           // "Cooler para gabinete"
      /gabinete.*cooler/i,           // "Gabinete cooler"
      /cooler.*case/i,               // "Cooler for case"
      /case.*fan/i,                  // "Case fan"
      /fan.*case/i,                  // "Fan case"
      /fan.*gabinete/i,              // "Fan para gabinete"
      /gabinete.*fan/i,              // "Gabinete fan"
      /\d+mm.*fan/i,                 // "120mm fan", "140mm fan" (typical case fans)
      /fan.*\d+mm/i,                 // "Fan 120mm"
      /rgb.*fan(?!.*cpu)/i,          // "RGB Fan" but not if CPU mentioned
      /fan.*rgb(?!.*cpu)/i,          // "Fan RGB"
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
    // Match: "Perifericos de PC - Mouse", "Zona gamer", "Mouse Gamer"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
      /zona\s+gamer/i,
      /mouse\s+gamer/i,
    ],
    excludePatterns: [
      /combo/i,
      /kit/i,
      /pad\s+mouse/i,
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
    // Match: "Perifericos de PC - Auriculares", "Zona gamer"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
      /zona\s+gamer/i,
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
    // Match: "Perifericos de PC - Teclado", "Zona gamer", "Teclado Gamer"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
      /zona\s+gamer/i,
      /teclado\s+gamer/i,
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
  fans: {
    // Match: "Coolers" category but filter for case fans only
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
  peripherals: {
    // Match: All "Perifericos de PC", "Zona gamer"
    includePatterns: [
      /perifericos?\s+de\s+pc/i,
      /zona\s+gamer/i,
      /mouse\s+gamer/i,
      /teclado\s+gamer/i,
      /pad\s+mouse\s+gamer/i,
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
 * Check if a cooler product is a CPU cooler (not a case fan)
 * Analyzes title, description, and attributes
 */
function isCpuCooler(product: Product): boolean {
  const text = `${product.title} ${product.description}`.toLowerCase();
  const title = product.title.toLowerCase();
  
  // ==========================================
  // STEP 1: EXCLUSION CHECKS (HIGHEST PRIORITY)
  // ==========================================
  
  // Specific fan model patterns that should ALWAYS be excluded
  const specificFanModels = [
    /\bmf\s*120/i,                 // MF120, MF 120 (MasterFan 120mm)
    /\bmf\s*140/i,                 // MF140, MF 140 (MasterFan 140mm)
    /\bsf\s*120/i,                 // SF120, SF 120 (SickleFlow 120mm)
    /\bsf\s*140/i,                 // SF140, SF 140 (SickleFlow 140mm)
    /\bll\s*120/i,                 // LL120, LL 120 (Corsair fan)
    /\bql\s*120/i,                 // QL120, QL 120 (Corsair fan)
    /\bml\s*120/i,                 // ML120, ML 120 (Corsair fan)
    /\bll\s*140/i,                 // LL140
    /\bql\s*140/i,                 // QL140
    /\bml\s*140/i,                 // ML140
  ];
  
  // Check specific models FIRST (highest priority exclusion)
  if (specificFanModels.some(pattern => pattern.test(title))) {
    return false;
  }
  
  // General case fan indicators (exclusion)
  const caseFanIndicators = [
    /ventilador\s+de\s+chasis/i,   // "ventilador de chasis" (case fan in Spanish)
    /\b120\b/i,                    // "120" or "120mm" - typical case fan size
    /\b140\b/i,                    // "140" or "140mm" - typical case fan size
    /\blite\s+(argb|rgb)/i,        // "Lite ARGB/RGB" typically case fans
    /\bfan\s+\d+mm/i,              // "Fan 120mm"
    /\d+mm\s+fan/i,                // "120mm fan"
    /ventilador.*gabinete/i,       // "Ventilador para gabinete"
    /gabinete.*ventilador/i,       // "Gabinete ventilador"
    /case\s+fan/i,                 // "Case fan"
    /fan.*case/i,                  // "Fan case"
    /pack.*fan/i,                  // "Pack 3 fans"
    /fan.*pack/i,                  // "Fan pack"
    /rgb.*fan(?!.*cpu)/i,          // "RGB Fan" (without CPU)
    /argb.*fan/i,                  // "ARGB Fan"
  ];
  
  // If it matches case fan indicators, it's NOT a CPU cooler
  if (caseFanIndicators.some(pattern => pattern.test(text))) {
    return false;
  }
  
  // ==========================================
  // STEP 2: INCLUSION CHECKS (CPU COOLER INDICATORS)
  // ==========================================
  
  // Strong CPU cooler indicators
  const cpuCoolerIndicators = [
    /\bcpu\s+cooler/i,
    /cooler\s+cpu/i,
    /cooler.*procesador/i,
    /procesador.*cooler/i,
    /disipador.*cpu/i,
    /cpu.*disipador/i,
    /\baio\b/i,                        // All-in-One liquid coolers are CPU coolers
    /refrigeraci[oó]n\s+l[ií]quida/i,  // Liquid cooling
    /water\s+cool/i,                    // Water cooler
    /torre.*cpu/i,                      // Torre CPU
    /cpu.*torre/i,                      // CPU Torre
    /socket\s+(am4|am5|lga|tr4|strx4)/i, // CPU sockets
    /compatible.*(?:am4|am5|lga\d+|intel|amd|ryzen)/i, // CPU compatibility
    /\bhyper\s+\d+/i,                   // Hyper 212, Hyper 411, etc (CPU coolers)
    /\bdark\s+rock/i,                   // Dark Rock series (CPU coolers)
    /\bnoctua\s+nh/i,                   // Noctua NH series (CPU coolers)
  ];
  
  // If it matches CPU cooler indicators, it's a CPU cooler
  if (cpuCoolerIndicators.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // Check attributes for socket compatibility (strong indicator of CPU cooler)
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        const attrText = `${attr.name} ${attr.value}`.toLowerCase();
        
        // Look for socket/compatibility attributes
        if (/socket|compatib/i.test(attr.name)) {
          if (/am4|am5|lga|tr4|strx4|intel|amd|ryzen/i.test(attr.value)) {
            return true;
          }
        }
        
        // Look for TDP rating (CPU coolers have TDP ratings)
        if (/tdp/i.test(attrText)) {
          return true;
        }
      }
    }
  }
  
  // Don't use generic "cooler" in title as indicator anymore
  // Only accept products that have explicit CPU cooler indicators
  // or socket/TDP information in attributes
  
  // Default to false for safety (better to exclude a CPU cooler than include a case fan)
  return false;
}

/**
 * Check if a product is a case fan (not a CPU cooler)
 * This is the EXACT OPPOSITE of isCpuCooler
 */
function isCaseFan(product: Product): boolean {
  // Simply return the opposite of isCpuCooler
  // If it's not a CPU cooler, it's a case fan
  return !isCpuCooler(product);
}

/**
 * Filter products for a specific category
 */
export function filterProductsByCategory(products: Product[], categoryKey: CategoryKey): Product[] {
  const filtered = products.filter((product) => shouldIncludeProduct(product, categoryKey));
  
  // Special filtering for coolers: only include CPU coolers
  if (categoryKey === 'cooler') {
    return filtered.filter((product) => isCpuCooler(product));
  }
  
  // Special filtering for fans: only include case fans (NOT CPU coolers)
  if (categoryKey === 'fans') {
    return filtered.filter((product) => isCaseFan(product));
  }
  
  return filtered;
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

/**
 * Spec Extraction Module
 * Extracts ProductSpec from product title, description, and attributes
 * 
 * NOTE: This is a best-effort extraction from unstructured data.
 * For production, you'd want a curated product_specs table.
 */

import type { Product } from '../mallweb/normalize';
import type { ProductSpec } from './types';
import type { CategoryKey } from '../catalog/categories';

// Socket patterns
const SOCKET_PATTERNS: Record<string, RegExp[]> = {
  'AM4': [/\bAM4\b/i],
  'AM5': [/\bAM5\b/i],
  'LGA1851': [
    /\bLGA\s*1851\b/i,
    /\bLga1851\b/,
    /\bSocket\s*1851\b/i,
    /\bFCLGA\s*1851\b/i,
    /(?:socket|lga|fclga)[\s-]*1851/i,
  ],
  'LGA1700': [
    /\bLGA\s*1700\b/i,
    /\bLga1700\b/,
    /\bSocket\s*1700\b/i,
    /\bFCLGA\s*1700\b/i,
    /(?:socket|lga|fclga)[\s-]*1700/i,
  ],
  'LGA1200': [
    /\bLGA\s*1200\b/i,
    /\bLga1200\b/,
    /\bSocket\s*1200\b/i,
    /\bFCLGA\s*1200\b/i,
    /(?:socket|lga|fclga)[\s-]*1200/i,  // More specific: requires "socket", "lga", or "fclga" before 1200
  ],
  'LGA1151': [
    /\bLGA\s*1151\b/i,
    /\bLga1151\b/,
    /\bSocket\s*1151\b/i,
    /\bFCLGA\s*1151\b/i,
    /(?:socket|lga|fclga)[\s-]*1151/i,
  ],
  'sTRX4': [/\bsTRX4\b/i],
  'TR4': [/\bTR4\b/i],
};

// Chipset patterns
const CHIPSET_PATTERNS: Record<string, RegExp[]> = {
  // AMD AM5
  'X670E': [/\bX670E\b/i],
  'X670': [/\bX670\b/i],
  'B650E': [/\bB650E\b/i],
  'B650': [/\bB650\b/i],
  'A620': [/\bA620\b/i],
  // AMD AM4
  'X570': [/\bX570\b/i],
  'B550': [/\bB550\b/i],
  'A520': [/\bA520\b/i],
  'X470': [/\bX470\b/i],
  'B450': [/\bB450\b/i],
  // Intel 800 series (LGA1851 - Arrow Lake)
  'Z890': [/\bZ890\b/i],
  'B860': [/\bB860\b/i],
  'H810': [/\bH810\b/i],
  // Intel 600/700 series (LGA1700 - Alder Lake, Raptor Lake)
  'Z790': [/\bZ790\b/i],
  'Z690': [/\bZ690\b/i],
  'B760': [/\bB760\b/i],
  'B660': [/\bB660\b/i],
  'H770': [/\bH770\b/i],
  'H670': [/\bH670\b/i],
  'H610': [/\bH610\b/i],
  // Intel 400/500 series (LGA1200 - Comet Lake, Rocket Lake)
  'Z590': [/\bZ590\b/i],
  'Z490': [/\bZ490\b/i],
  'B560': [/\bB560\b/i],
  'B460': [/\bB460\b/i],
  'H510': [/\bH510\b/i],
  'H470': [/\bH470\b/i],
  'H410': [/\bH410\b/i],
  'W480': [/\bW480\b/i],  // Workstation chipset
  'Q470': [/\bQ470\b/i],  // Business chipset
};

// Form factor patterns
const FORM_FACTOR_PATTERNS: Record<string, RegExp[]> = {
  'E-ATX': [/\bE-?ATX\b/i, /\bExtended ATX\b/i],
  'ATX': [/\bATX\b/i],
  'Micro-ATX': [/\bMicro-?ATX\b/i, /\bmATX\b/i, /\bM-ATX\b/i],
  'Mini-ITX': [/\bMini-?ITX\b/i, /\bITX\b/i],
};

// Memory type patterns
const MEMORY_TYPE_PATTERNS: Record<string, RegExp[]> = {
  'DDR5': [/\bDDR5\b/i],
  'DDR4': [/\bDDR4\b/i],
  'DDR3': [/\bDDR3\b/i],
};

// CPU generation/family patterns
const CPU_PATTERNS = {
  // AMD Ryzen
  amdRyzen9_7000: [/Ryzen\s*9\s*7\d{3}/i],
  amdRyzen7_7000: [/Ryzen\s*7\s*7\d{3}/i],
  amdRyzen5_7000: [/Ryzen\s*5\s*7\d{3}/i],
  amdRyzen9_5000: [/Ryzen\s*9\s*5\d{3}/i],
  amdRyzen7_5000: [/Ryzen\s*7\s*5\d{3}/i],
  amdRyzen5_5000: [/Ryzen\s*5\s*5\d{3}/i],
  amdRyzen9_3000: [/Ryzen\s*9\s*3\d{3}/i],
  amdRyzen7_3000: [/Ryzen\s*7\s*3\d{3}/i],
  amdRyzen5_3000: [/Ryzen\s*5\s*3\d{3}/i],
  // Intel Core Ultra (15th Gen - Arrow Lake)
  intelCoreUltra_15th: [/Core\s*Ultra\s*[35579]/i, /15th\s*Gen/i],
  // Intel Core (traditional naming)
  intelCore_14th: [/Core\s*i[3579]-14\d{3}/i, /14th\s*Gen/i],
  intelCore_13th: [/Core\s*i[3579]-13\d{3}/i, /13th\s*Gen/i],
  intelCore_12th: [/Core\s*i[3579]-12\d{3}/i, /12th\s*Gen/i],
  intelCore_11th: [/Core\s*i[3579]-11\d{3}/i, /11th\s*Gen/i],
  intelCore_10th: [/Core\s*i[3579]-10\d{3}/i, /10th\s*Gen/i],
};

/**
 * Extract a pattern match from text
 */
function extractPattern(
  text: string,
  patterns: Record<string, RegExp[]>
): string | undefined {
  const normText = expandSocketPrefixes(text);
  for (const [value, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(normText)) {
        return value;
      }
    }
  }
  return undefined;
}

/**
 * Extract multiple pattern matches from text
 */
function extractPatterns(
  text: string,
  patterns: Record<string, RegExp[]>
): string[] {
  const matches: string[] = [];
  const normText = expandSocketPrefixes(text);
  for (const [value, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(normText)) {
        matches.push(value);
        break;
      }
    }
  }
  return matches;
}

/**
 * Expand socket prefixes that are shared across a list.
 * Example: "LGA 1851 / 1700 / 1200" => "LGA 1851 / LGA 1700 / LGA 1200"
 */
function expandSocketPrefixes(text: string): string {
  if (!text) return text;

  // Handles patterns like "LGA 1851 / 1700 / 1200 / 115X"
  const re = /((?:\bLGA\b|\bFCLGA\b|\bSocket\b)\s*)(\d{2,4}[A-Za-z0-9]*?(?:\s*(?:\/|,)\s*\d{2,4}[A-Za-z0-9]*)+)/gi;

  return text.replace(re, (match, prefix, list) => {
    const parts = list.split(/(?:\/|,)/).map(p => p.trim()).filter(Boolean);
    const expanded = parts.map(p => `${prefix}${p}`).join(' / ');
    return expanded;
  });
}

/**
 * Extract numeric value with unit
 */
function extractNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return undefined;
}

/**
 * Infer socket from chipset
 */
function inferSocketFromChipset(chipset: string): string | undefined {
  const am5Chipsets = ['X670E', 'X670', 'B650E', 'B650', 'A620'];
  const am4Chipsets = ['X570', 'B550', 'A520', 'X470', 'B450', 'X370', 'B350', 'A320'];
  const lga1851Chipsets = ['Z890', 'B860', 'H810'];
  const lga1700Chipsets = ['Z790', 'Z690', 'B760', 'B660', 'H770', 'H670', 'H610'];
  const lga1200Chipsets = ['Z590', 'Z490', 'B560', 'B460', 'H510', 'H470', 'H410', 'W480', 'Q470'];

  if (am5Chipsets.includes(chipset)) return 'AM5';
  if (am4Chipsets.includes(chipset)) return 'AM4';
  if (lga1851Chipsets.includes(chipset)) return 'LGA1851';
  if (lga1700Chipsets.includes(chipset)) return 'LGA1700';
  if (lga1200Chipsets.includes(chipset)) return 'LGA1200';

  return undefined;
}

/**
 * Infer socket from CPU name
 */
function inferSocketFromCpu(text: string): string | undefined {
  // AMD Ryzen 7000 series = AM5
  if (/Ryzen\s*[3579]\s*7\d{3}/i.test(text)) return 'AM5';
  // AMD Ryzen 5000/3000 series = AM4
  if (/Ryzen\s*[3579]\s*[35]\d{3}/i.test(text)) return 'AM4';
  
  // Intel Core Ultra (Arrow Lake, 15th Gen) = LGA1851
  // Examples: "Core Ultra 5 225F", "Core Ultra 5 245K", "Core Ultra 7 265K"
  if (/Core\s*Ultra\s*[35579]/i.test(text)) return 'LGA1851';
  
  // Intel 12th/13th/14th Gen (Alder Lake, Raptor Lake) = LGA1700
  // Examples: "Core i5-12400", "Core i7-13700K", "Core i9-14900K"
  if (/Core\s*i[3579]-1[234]\d{3}/i.test(text)) return 'LGA1700';
  
  // Intel 10th/11th Gen (Comet Lake, Rocket Lake) = LGA1200
  // Examples: "Core i5-10400", "Core i7-11700K"
  if (/Core\s*i[3579]-1[01]\d{3}/i.test(text)) return 'LGA1200';

  return undefined;
}

/**
 * Extract CPU specs from product
 */
function extractCpuSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;
  
  let socket = extractPattern(text, SOCKET_PATTERNS);
  if (!socket) {
    socket = inferSocketFromCpu(text);
  }

  const cores = extractNumber(text, /(\d+)\s*(?:núcleos|cores|core)/i);
  const threads = extractNumber(text, /(\d+)\s*(?:hilos|threads)/i);
  const tdp = extractNumber(text, /(\d+)\s*W(?:atts?)?\s*TDP/i) 
    ?? extractNumber(text, /TDP[:\s]*(\d+)\s*W/i);

  // Detect CPU generation
  let cpuGeneration: string | undefined;
  let cpuFamily: string | undefined;

  for (const [key, patterns] of Object.entries(CPU_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        if (key.startsWith('amd')) {
          cpuGeneration = key.includes('7000') ? 'Ryzen 7000' 
            : key.includes('5000') ? 'Ryzen 5000' 
            : 'Ryzen 3000';
          cpuFamily = key.includes('Ryzen9') ? 'Ryzen 9'
            : key.includes('Ryzen7') ? 'Ryzen 7'
            : key.includes('Ryzen5') ? 'Ryzen 5'
            : 'Ryzen';
        } else if (key.includes('Ultra')) {
          // Intel Core Ultra
          cpuGeneration = key.replace('intelCoreUltra_', '') + ' Gen';
          cpuFamily = /Ultra\s*9/i.test(text) ? 'Core Ultra 9'
            : /Ultra\s*7/i.test(text) ? 'Core Ultra 7'
            : /Ultra\s*5/i.test(text) ? 'Core Ultra 5'
            : /Ultra\s*3/i.test(text) ? 'Core Ultra 3'
            : 'Core Ultra';
        } else {
          // Traditional Intel Core i3/i5/i7/i9
          cpuGeneration = key.replace('intelCore_', '') + ' Gen';
          cpuFamily = /i9/i.test(text) ? 'Core i9'
            : /i7/i.test(text) ? 'Core i7'
            : /i5/i.test(text) ? 'Core i5'
            : /i3/i.test(text) ? 'Core i3'
            : 'Core';
        }
        break;
      }
    }
  }

  // Detect integrated graphics
  // AMD: APU, Vega, models ending in 'G' (e.g., 5600G, 5700G, Athlon 3000G)
  // Intel: UHD, Iris, models NOT ending in 'F' or 'KF' (F = no graphics)
  let integratedGraphics = false;
  
  // AMD APU indicators
  if (/\b(APU|Vega)\b/i.test(text)) {
    integratedGraphics = true;
  }
  // AMD with 'G' or 'GT' suffix (e.g., Ryzen 5 5600G, Athlon 3000G, Ryzen 5 5600GT)
  // Pattern matches: "Ryzen 5 5600G", "Athlon 3000G", "Ryzen 7 5700GT"
  else if (/\b(Ryzen|Athlon)\s*(?:[3579]\s*)?\d{4}G[T]?\b/i.test(text)) {
    integratedGraphics = true;
  }
  // Intel with UHD or Iris graphics
  else if (/\b(UHD|Iris)\b/i.test(text)) {
    integratedGraphics = true;
  }
  // Intel processors WITHOUT 'F' or 'KF' suffix typically have integrated graphics
  // (F suffix means no graphics: i5-12400F, i7-13700KF)
  else if (/Core\s*i[3579]-\d{4,5}(?!F|KF)\b/i.test(text) && !/\b(F|KF)\b/i.test(text)) {
    integratedGraphics = true;
  }
  // Explicit mentions
  else if (/\b(con gráficos|integrated graphics|with graphics)\b/i.test(text)) {
    integratedGraphics = true;
  }

  // Detect if CPU includes a cooler
  const includesCooler = extractIncludesCooler(product);

  return {
    socket,
    cores,
    threads,
    tdp,
    cpuGeneration,
    cpuFamily,
    integratedGraphics,
    includesCooler,
  };
}

/**
 * Extract if CPU includes a cooler from product data
 */
function extractIncludesCooler(product: Product): boolean {
  const text = `${product.title} ${product.description}`;
  
  // Check for explicit mentions in title/description
  // Positive patterns (includes cooler)
  if (/\b(incluye|incluido|include[sd]?|con|with)\s+(cooler|disipador|ventilador)/i.test(text)) {
    return true;
  }
  if (/\b(cooler|disipador)\s+(incluido|included)/i.test(text)) {
    return true;
  }
  // Check for "Included Thermal Solution" or similar
  if (/\b(included|incluido|incluye)\s+(thermal\s+solution|solución\s+térmica)/i.test(text)) {
    return true;
  }
  if (/\b(thermal\s+solution|solución\s+térmica)\s+(included|incluido)/i.test(text)) {
    return true;
  }
  
  // Negative patterns (does NOT include cooler)
  if (/\b(sin|without|no\s+incluye|not\s+included?)\s+(cooler|disipador|ventilador)/i.test(text)) {
    return false;
  }
  if (/\b(cooler|disipador)\s+(no\s+incluido|not\s+included?)/i.test(text)) {
    return false;
  }
  // Check for "NOT included thermal solution" or similar
  if (/\b(sin|without|no\s+incluye|not\s+included?)\s+(thermal\s+solution|solución\s+térmica)/i.test(text)) {
    return false;
  }
  
  // Check in attribute groups for "Incluye cooler" attribute
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        // Look for "Incluye cooler", "Include cooler", "Thermal Solution", etc.
        if (/incluye|include[sd]?|con|with|thermal|térmica/i.test(attr.name) && /cooler|disipador|ventilador|solution|solución/i.test(attr.name)) {
          const value = attr.value.toLowerCase().trim();
          if (value === 'si' || value === 'sí' || value === 'yes' || value === 'true' || value === 'included' || value === 'incluido') {
            return true;
          }
          if (value === 'no' || value === 'false' || value === 'not included' || value === 'no incluido') {
            return false;
          }
        }
        
        // Also check if value contains cooler info
        if (/cooler|disipador|thermal\s+solution|solución\s+térmica/i.test(attr.name)) {
          const value = attr.value.toLowerCase().trim();
          if (value === 'incluido' || value === 'included' || value === 'si' || value === 'sí' || value === 'yes') {
            return true;
          }
          if (value === 'no incluido' || value === 'not included' || value === 'no' || value === 'sin cooler') {
            return false;
          }
        }
      }
    }
  }
  
  // Default: assume most CPUs do NOT include a cooler unless explicitly stated
  return false;
}

/**
 * Extract memory types from attribute groups
 */
function extractMemoryTypesFromAttributes(product: Product): string[] {
  if (!product.attributeGroups) {
    return [];
  }

  const memoryTypes: string[] = [];
  
  // Search through all attribute groups
  for (const group of product.attributeGroups) {
    for (const attr of group.attributes) {
      // Search in both attribute name and value
      const attrText = `${attr.name} ${attr.value}`;
      
      // Check for memory type patterns
      for (const [memType, regexList] of Object.entries(MEMORY_TYPE_PATTERNS)) {
        for (const regex of regexList) {
          if (regex.test(attrText) && !memoryTypes.includes(memType)) {
            memoryTypes.push(memType);
            break;
          }
        }
      }
    }
  }
  
  return memoryTypes;
}

/**
 * Extract form factor from attribute groups for motherboard
 */
function extractFormFactorFromAttributes(product: Product): string | undefined {
  if (!product.attributeGroups) {
    return undefined;
  }
  
  for (const group of product.attributeGroups) {
    for (const attr of group.attributes) {
      const attrText = `${attr.name} ${attr.value}`;
      
      // Look for form factor in attributes
      if (/form.?factor|formato|tama[ñn]o/i.test(attr.name)) {
        for (const [ff, regexList] of Object.entries(FORM_FACTOR_PATTERNS)) {
          for (const regex of regexList) {
            if (regex.test(attrText)) {
              return ff;
            }
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract motherboard specs from product
 */
function extractMotherboardSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  const chipset = extractPattern(text, CHIPSET_PATTERNS);
  let socket = extractPattern(text, SOCKET_PATTERNS);
  
  // Infer socket from chipset if not directly found
  if (!socket && chipset) {
    socket = inferSocketFromChipset(chipset);
  }

  // Try to extract form factor from title/description first
  let formFactor = extractPattern(text, FORM_FACTOR_PATTERNS);
  
  // If not found, try attribute groups
  if (!formFactor) {
    formFactor = extractFormFactorFromAttributes(product);
  }
  
  // Default to ATX if still not found
  formFactor = formFactor ?? 'ATX';
  
  // Try to extract memory types from title/description first
  let supportedMemoryTypes = extractPatterns(text, MEMORY_TYPE_PATTERNS);
  
  // If not found in title/description, search in attribute groups
  if (supportedMemoryTypes.length === 0) {
    supportedMemoryTypes = extractMemoryTypesFromAttributes(product);
  }

  const maxMemory = extractNumber(text, /(?:hasta|max|up to)\s*(\d+)\s*GB/i);
  const memorySlots = extractNumber(text, /(\d+)\s*(?:slots?|ranuras?)\s*(?:de\s*)?(?:RAM|memoria|DIMM)/i)
    ?? extractNumber(text, /(\d+)\s*x\s*DIMM/i)
    ?? extractNumber(text, /(?:posee|tiene|incluye)\s*(\d+)\s*ranuras?\s*DIMM/i);
  
  // Extract M.2 slots (for M.2 SSDs)
  const m2Slots = extractNumber(text, /(\d+)\s*(?:x\s*)?M\.?2/i);
  
  // Extract SATA ports
  // Patterns: "4x SATA", "4 SATA", "4 puertos SATA", "SATA: 4"
  const sataPorts = extractNumber(text, /(\d+)\s*(?:x\s*)?(?:puertos?\s*)?SATA/i)
    ?? extractNumber(text, /SATA[:\s]*(\d+)/i)
    ?? extractNumber(text, /(\d+)\s*(?:puertos?\s*)?SATA\s*(?:6Gb\/s|III)?/i);

  return {
    socket,
    chipset,
    formFactor,
    supportedMemoryTypes: supportedMemoryTypes.length > 0 ? supportedMemoryTypes : undefined,
    maxMemory,
    memorySlots,
    m2Slots,
    sataPorts,
  };
}

/**
 * Extract RAM specs from product
 */
function extractRamSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  const memoryType = extractPattern(text, MEMORY_TYPE_PATTERNS);
  const memorySpeed = extractNumber(text, /(\d{4,5})\s*MHz/i);
  
  // Try to extract capacity (e.g., "16GB", "2x8GB", "32GB (2x16GB)")
  let memoryCapacity: number | undefined;
  let memoryModules: number | undefined;

  const kitMatch = text.match(/(\d+)\s*x\s*(\d+)\s*GB/i);
  if (kitMatch) {
    memoryModules = parseInt(kitMatch[1]);
    memoryCapacity = parseInt(kitMatch[2]);
  } else {
    const singleMatch = text.match(/(\d+)\s*GB/i);
    if (singleMatch) {
      memoryCapacity = parseInt(singleMatch[1]);
      memoryModules = 1;
    }
  }

  const latencyMatch = text.match(/C[L]?(\d+)/i);
  const memoryLatency = latencyMatch ? `CL${latencyMatch[1]}` : undefined;

  return {
    memoryType,
    memorySpeed,
    memoryCapacity,
    memoryModules,
    memoryLatency,
  };
}

/**
 * Extract GPU length from product (in mm)
 */
function extractGpuLength(product: Product): number | undefined {
  const text = `${product.title} ${product.description}`;
  
  // Try multiple patterns for GPU length in description/title
  // Pattern 1: "longitud: 300mm", "length: 300 mm", "largo: 300mm"
  let length = extractNumber(text, /(?:longitud|length|largo|lenght)[:\s]*(\d{2,3})\s*mm/i);
  if (length) return length;
  
  // Pattern 2: "300mm de longitud/largo"
  length = extractNumber(text, /(\d{2,3})\s*mm\s*(?:de\s*)?(?:longitud|length|largo)/i);
  if (length) return length;
  
  // Pattern 3: "dimensiones: 300 x 120 x 50 mm" - take the first (length)
  length = extractNumber(text, /(?:dimensiones|dimensions)[:\s]*(\d{2,3})\s*x\s*\d+\s*x\s*\d+\s*mm/i);
  if (length) return length;
  
  // Pattern 4: Generic "300mm" or "300 mm" in text (less reliable but useful)
  const mmMatches = text.match(/(\d{2,3})\s*mm/gi);
  if (mmMatches && mmMatches.length > 0) {
    // Look for the largest value between 150-400mm (typical GPU range)
    const lengths = mmMatches
      .map(m => parseInt(m.match(/(\d{2,3})/)?.[1] || '0'))
      .filter(l => l >= 150 && l <= 450);
    if (lengths.length > 0) {
      return Math.max(...lengths);
    }
  }
  
  // Try to extract from attribute groups
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        const attrText = `${attr.name} ${attr.value}`;
        
        // Look for length/longitud in attributes
        if (/longitud|length|largo|dimensi[oó]n/i.test(attr.name)) {
          const attrLength = extractNumber(attrText, /(\d{2,3})\s*mm/i);
          if (attrLength && attrLength >= 150 && attrLength <= 450) {
            return attrLength;
          }
          // Try to extract from "300 x 120 x 50 mm" format
          const dimMatch = attrText.match(/(\d{2,3})\s*x\s*\d+\s*x\s*\d+/i);
          if (dimMatch) {
            const dimLength = parseInt(dimMatch[1]);
            if (dimLength >= 150 && dimLength <= 450) {
              return dimLength;
            }
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract GPU recommended PSU wattage from product
 */
function extractGpuRecommendedPsu(product: Product): number | undefined {
  const text = `${product.title} ${product.description}`;
  
  // Pattern 1: "Fuente recomendada: 650W", "Recommended PSU: 650W"
  let psu = extractNumber(text, /(?:fuente|PSU|power supply)\s*(?:recomendada?|m[ií]nima?|recommended|minimum|required)[:\s]*(\d{3,4})\s*W/i);
  if (psu) return psu;
  
  // Pattern 2: "Recomendada 650W", "Minimum 650W"
  psu = extractNumber(text, /(?:recomendada?|m[ií]nima?|recommended|minimum|required)[:\s]*(\d{3,4})\s*W/i);
  if (psu) return psu;
  
  // Pattern 3: "650W recomendada", "650W recommended"
  psu = extractNumber(text, /(\d{3,4})\s*W\s*(?:fuente|PSU|power supply)?\s*(?:recomendada?|m[ií]nima?|recommended|minimum|required)/i);
  if (psu) return psu;
  
  // Pattern 4: "Requiere fuente de 650W", "Requires 650W PSU"
  psu = extractNumber(text, /(?:requiere|requires?|necesita|needs?)\s*(?:fuente|PSU|power supply)?\s*(?:de|of)?\s*(\d{3,4})\s*W/i);
  if (psu) return psu;
  
  // Pattern 5: Look in attribute groups for power/fuente related attributes
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        const attrText = `${attr.name} ${attr.value}`;
        
        // Look for power/PSU related attributes
        if (/fuente|PSU|power|potencia|alimentaci[oó]n/i.test(attr.name)) {
          const attrPsu = extractNumber(attrText, /(\d{3,4})\s*W/i);
          if (attrPsu && attrPsu >= 300 && attrPsu <= 2000) {
            return attrPsu;
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract GPU specs from product
 */
function extractGpuSpecs(product: Product): ProductSpec {
  // GPU length with improved extraction
  const gpuLength = extractGpuLength(product);

  // Recommended PSU with improved extraction
  const gpuRecommendedPsu = extractGpuRecommendedPsu(product);

  return {
    gpuLength,
    gpuRecommendedPsu,
  };
}

/**
 * Extract maximum GPU length supported by case (in mm)
 */
function extractMaxGpuLength(product: Product): number | undefined {
  const text = `${product.title} ${product.description}`;
  
  // Pattern 0: "Tamaño máximo VGA: 280mm" (Mall Web specific format)
  let length = extractNumber(text, /Tama[ñn]o\s+m[aá]ximo\s+VGA:\s*(\d{2,3})\s*mm/i);
  if (length) return length;
  
  // Pattern 1: "GPU hasta 350mm", "GPU max 350mm", "VGA up to 350mm"
  length = extractNumber(text, /(?:GPU|VGA|video|gr[aá]fica|tarjeta de video)[^\d]*(?:hasta|max|up to|m[aá]ximo|soporta)[^\d]*(\d{2,3})\s*mm/i);
  if (length) return length;
  
  // Pattern 2: "soporta GPU de 350mm", "GPU length 350mm"
  length = extractNumber(text, /(?:soporta|admite|support)[^\d]*(?:GPU|VGA|video)[^\d]*(\d{2,3})\s*mm/i);
  if (length) return length;
  
  // Pattern 3: "350mm GPU", "350mm de GPU"
  length = extractNumber(text, /(\d{2,3})\s*mm\s*(?:de\s*)?(?:GPU|VGA|video|gr[aá]fica)/i);
  if (length) return length;
  
  // Try to extract from attribute groups
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        const attrText = `${attr.name} ${attr.value}`;
        
        // Look for GPU/VGA related attributes
        if (/GPU|VGA|video|gr[aá]fica|tarjeta/i.test(attrText)) {
          const attrLength = extractNumber(attrText, /(\d{2,3})\s*mm/i);
          if (attrLength && attrLength >= 150 && attrLength <= 500) {
            return attrLength;
          }
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract form factors from attribute groups
 */
function extractFormFactorsFromAttributes(product: Product): string[] {
  if (!product.attributeGroups) {
    return [];
  }

  const formFactors: string[] = [];
  
  for (const group of product.attributeGroups) {
    for (const attr of group.attributes) {
      const attrText = `${attr.name} ${attr.value}`;
      
      // Check for form factor patterns
      for (const [ff, regexList] of Object.entries(FORM_FACTOR_PATTERNS)) {
        for (const regex of regexList) {
          if (regex.test(attrText) && !formFactors.includes(ff)) {
            formFactors.push(ff);
            break;
          }
        }
      }
    }
  }
  
  return formFactors;
}

/**
 * Extract maximum CPU cooler height supported by case (in mm)
 */
function extractMaxCpuCoolerHeight(product: Product): number | undefined {
  const text = `${product.title} ${product.description}`;
  
  // Pattern 0: "Tamaño máximo CPU cooler: 165mm" (Mall Web specific format)
  let height = extractNumber(text, /Tama[ñn]o\s+m[aá]ximo\s+CPU\s+cooler:\s*(\d{2,3})\s*mm/i);
  if (height) return height;
  
  // Pattern 0b: "Soporte de disipador de torre: Hasta 160mm de altura"
  height = extractNumber(text, /Soporte\s+de\s+disipador\s+de\s+torre:\s*(?:hasta|up\s+to)\s*(\d{2,3})\s*mm/i);
  if (height) return height;
  
  // Pattern 1: "cooler hasta 165mm", "CPU cooler max 165mm", "disipador hasta 165mm"
  height = extractNumber(text, /(?:cooler|disipador|CPU)(?:\s+de\s+torre)?[^\d]*(?:hasta|max|m[aá]ximo|up\s+to)[^\d]*(\d{2,3})\s*mm/i);
  if (height) return height;
  
  // Pattern 2: "165mm CPU cooler", "165mm de cooler", "165mm de altura"
  height = extractNumber(text, /(\d{2,3})\s*mm\s*(?:de\s*)?(?:altura|cooler|disipador|CPU)/i);
  if (height) return height;
  
  // Pattern 3: Generic "cooler" or "disipador" with mm
  height = extractNumber(text, /(?:cooler|disipador)[^\d]*(\d{2,3})\s*mm/i);
  if (height) return height;
  
  return undefined;
}

/**
 * Extract water cooling / radiator support from case
 * Returns whether the case supports water cooling and which radiator sizes
 */
function extractWaterCoolingSupport(product: Product): { supportsWaterCooling: boolean; supportedRadiatorSizes: number[] } {
  const text = `${product.title} ${product.description}`;
  const supportedSizes: number[] = [];
  
  // Common radiator sizes in mm
  const radiatorSizes = [120, 140, 240, 280, 360, 420];
  
  // Check if text mentions water cooling/watercooler/AIO
  const mentionsWaterCooling = /(?:water\s*cool(?:ing|er)?|watercool(?:ing|er)?|refrigeraci[oó]n\s*l[ií]quida|AIO|radiador)/i.test(text);
  
  // Check if text explicitly says "No" or "not compatible"
  // Improved patterns to catch "Watercooler: No compatible" and variations
  const explicitlyNotSupported = 
    // Pattern 1: "No soporte/compatible ... watercooler/radiador"
    /(?:sin|without|no)\s+(?:soporte|support|compatible).*?(?:water\s*cool(?:ing|er)?|watercool(?:ing|er)?|radiador|AIO)/i.test(text) ||
    // Pattern 2: "watercooler/radiador ... no/not compatible"
    /(?:water\s*cool(?:ing|er)?|watercool(?:ing|er)?|radiador|AIO).*?(?:no|not)\s+(?:compatible|soportado)/i.test(text) ||
    // Pattern 3: "Soporte de Watercooler: No compatible" (specific format)
    /(?:soporte|support).*?(?:water\s*cool(?:ing|er)?|watercool(?:ing|er)?|radiador|AIO)\s*:?\s*(?:no|not)\s+(?:compatible|soportado)/i.test(text) ||
    // Pattern 4: Just "No compatible" after watercooler mention
    /(?:water\s*cool(?:ing|er)?|watercool(?:ing|er)?|radiador|AIO)\s*:?\s*(?:no|not)\s+(?:compatible|soportado)/i.test(text);
  
  // Patterns to detect radiator support
  // Key logic: If mentions watercooling/radiador AND provides sizes, assume compatible (unless explicitly says no)
  // IMPORTANT: Skip detection if explicitly not supported
  if (!explicitlyNotSupported) {
    for (const size of radiatorSizes) {
      const patterns = [
        // Standard patterns
        new RegExp(`(?:soporta?|soporte|admite|support|compatible)\\s*(?:para|con|with|de)?\\s*(?:radiador|radiator|AIO|water\\s*cool(?:ing|er)?|refrigeraci[oó]n\\s*l[ií]quida)\\s*(?:de|hasta|up\\s*to)?\\s*:?\\s*${size}\\s*mm`, 'i'),
        new RegExp(`(?:radiador|radiator|AIO|water\\s*cool(?:ing|er)?)\\s*(?:de)?\\s*${size}\\s*mm`, 'i'),
        new RegExp(`${size}\\s*mm\\s*(?:radiador|radiator|AIO|water\\s*cool)`, 'i'),
        // Pattern for "Soporte Watercooling: Si de 240mm"
        new RegExp(`(?:soporte|support)\\s+(?:water\\s*cool(?:ing|er)?|watercool(?:ing|er)?|refrigeraci[oó]n\\s*l[ií]quida)\\s*:?\\s*(?:si|yes|s[ií])?\\s*(?:de\\s+)?${size}\\s*mm`, 'i'),
        // Pattern for "Soporte de Watercooler: * Frontal: Hasta 240mm" (ignores asterisks and special chars)
        new RegExp(`(?:soporte|support)\\s+(?:de\\s+)?(?:water\\s*cool(?:ing|er)?|watercool(?:ing|er)?)\\s*:?\\s*[*\\s]*(?:frontal|trasero|superior|inferior|top|front|rear|back|bottom)\\s*:?\\s*(?:hasta|up\\s*to)?\\s*${size}\\s*mm`, 'i'),
        // Pattern for "Frontal: Hasta 240mm", "Trasero: 120mm" (with optional asterisk before)
        new RegExp(`[*\\s]*(?:frontal|trasero|superior|inferior|top|front|rear|back|bottom)\\s*:?\\s*(?:hasta|up\\s*to)?\\s*${size}\\s*mm`, 'i'),
        // Pattern for "Hasta Xmm" in watercooling context
        new RegExp(`(?:hasta|up\\s*to)\\s*${size}\\s*mm`, 'i'),
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          if (!supportedSizes.includes(size)) {
            supportedSizes.push(size);
          }
          break;
        }
      }
    }
  }
  
  // Additional check: If text mentions watercooling and has size numbers, try to extract them
  // This catches cases like "Soporte de Watercooler: * Frontal: Hasta 240mm"
  // IMPORTANT: Only do this if NOT explicitly unsupported
  if (mentionsWaterCooling && !explicitlyNotSupported) {
    for (const size of radiatorSizes) {
      // Look for size patterns in the text, but only in water cooling context
      // Avoid detecting sizes from other parts like "disipador de torre: 140mm"
      const wcPattern = new RegExp(`(?:water\\s*cool(?:ing|er)?|watercool(?:ing|er)?|refrigeraci[oó]n\\s*l[ií]quida|AIO|radiador|frontal|trasero|superior|inferior|top|front|rear|back|bottom)[^.]*?\\b${size}\\s*mm\\b`, 'i');
      if (wcPattern.test(text) && !supportedSizes.includes(size)) {
        supportedSizes.push(size);
      }
    }
  }
  
  // Try to extract from attribute groups (only if not explicitly unsupported)
  if (product.attributeGroups && !explicitlyNotSupported) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        const attrText = `${attr.name} ${attr.value}`;
        
        // Look for radiator/water cooling related attributes
        if (/radiador|radiator|AIO|water\s*cool(?:ing|er)?|refrigeraci[oó]n\s*l[ií]quida/i.test(attrText)) {
          for (const size of radiatorSizes) {
            // Pattern for "Si de 240mm" or "Yes 240mm" or direct "240mm"
            if (new RegExp(`(?:si|yes|s[ií])?\\s*(?:de\\s+)?${size}\\s*mm`, 'i').test(attrText)) {
              if (!supportedSizes.includes(size)) {
                supportedSizes.push(size);
              }
            }
          }
        }
      }
    }
  }
  
  // IMPORTANT: New logic
  // If the product mentions water cooling/radiador AND provides specific sizes AND doesn't explicitly say "no",
  // then it IS compatible with water cooling
  const supportsWaterCooling = supportedSizes.length > 0 && mentionsWaterCooling && !explicitlyNotSupported;
  
  return {
    supportsWaterCooling,
    supportedRadiatorSizes: supportedSizes.sort((a, b) => a - b),
  };
}

/**
 * Extract if case includes a PSU and its wattage from product data
 * IMPORTANT: Only considers PSU included if wattage is explicitly mentioned (e.g., "600w", "500W")
 */
function extractIncludesPsu(product: Product): { includesPsu: boolean; psuWattage?: number } {
  const text = `${product.title} ${product.description}`;
  
  // Try to detect wattage in patterns like "c/Fuente 600w", "con fuente 600W", "+ Fuente 500w"
  // This is the KEY check - we ONLY consider PSU included if we find a wattage pattern
  const wattagePatterns = [
    /(?:c\/|con|with|\+|incluye|incluido)\s*(?:fuente|psu|power supply)\s*(\d{3,4})\s*w/i,
    /(?:fuente|psu|power supply)\s*(?:de\s*)?(\d{3,4})\s*w/i,
    /(\d{3,4})\s*w\s*(?:fuente|psu|power supply)/i,
  ];
  
  let detectedWattage: number | undefined;
  for (const pattern of wattagePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      detectedWattage = parseInt(match[1]);
      break;
    }
  }
  
  // If no wattage is detected, the case does NOT include a PSU
  // This is the fix: we require explicit wattage to confirm PSU inclusion
  if (!detectedWattage) {
    // Check negative patterns to be explicit about cases without PSU
    if (/\b(sin|without|no\s+incluye|not\s+included?)\s+(fuente|psu|power supply)/i.test(text)) {
      return { includesPsu: false };
    }
    if (/\b(fuente|psu|power supply)\s+(no\s+incluida?|not\s+included?)/i.test(text)) {
      return { includesPsu: false };
    }
    
    // Default: no wattage found = no PSU included
    return { includesPsu: false };
  }
  
  // If wattage is found, verify it's in context of inclusion (not exclusion)
  // Check for explicit NEGATIVE mentions first
  if (/\b(sin|without|no\s+incluye|not\s+included?)\s+(?:fuente|psu|power supply)/i.test(text)) {
    return { includesPsu: false };
  }
  if (/\b(?:fuente|psu|power supply)\s+(no\s+incluida?|not\s+included?)/i.test(text)) {
    return { includesPsu: false };
  }
  
  // Check in attribute groups for explicit "Incluye fuente" = "No"
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        // Look for "Incluye fuente", "Include PSU", etc.
        if (/incluye|include[sd]?|con|with/i.test(attr.name) && /fuente|psu|power supply/i.test(attr.name)) {
          const value = attr.value.toLowerCase().trim();
          if (value === 'no' || value === 'false') {
            return { includesPsu: false };
          }
        }
        
        // Also check if value contains PSU info
        if (/fuente|psu|power supply/i.test(attr.name)) {
          const value = attr.value.toLowerCase().trim();
          if (value === 'no incluida' || value === 'not included' || value === 'no' || value === 'sin fuente') {
            return { includesPsu: false };
          }
        }
      }
    }
  }
  
  // If wattage is detected AND no negative patterns found, PSU is included
  return { includesPsu: true, psuWattage: detectedWattage };
}

/**
 * Extract case specs from product
 */
function extractCaseSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  // Try to extract form factors from title/description first
  let supportedFormFactors = extractPatterns(text, FORM_FACTOR_PATTERNS);
  
  // If not found, try attribute groups
  if (supportedFormFactors.length === 0) {
    supportedFormFactors = extractFormFactorsFromAttributes(product);
  }
  
  // Extract max GPU length with improved patterns
  const maxGpuLength = extractMaxGpuLength(product);
  
  // Extract max CPU cooler height with improved patterns
  const maxCpuCoolerHeight = extractMaxCpuCoolerHeight(product);

  // Detect if case includes a PSU and its wattage
  const psuInfo = extractIncludesPsu(product);

  // Detect water cooling / radiator support
  const waterCoolingInfo = extractWaterCoolingSupport(product);

  return {
    supportedFormFactors: supportedFormFactors.length > 0 ? supportedFormFactors : undefined,
    maxGpuLength,
    maxCpuCoolerHeight,
    includesPsu: psuInfo.includesPsu,
    includedPsuWattage: psuInfo.psuWattage,
    supportsWaterCooling: waterCoolingInfo.supportsWaterCooling,
    supportedRadiatorSizes: waterCoolingInfo.supportedRadiatorSizes.length > 0 
      ? waterCoolingInfo.supportedRadiatorSizes 
      : undefined,
  };
}

/**
 * Extract PSU specs from product
 */
function extractPsuSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  const psuWattage = extractNumber(text, /(\d{3,4})\s*W/i);
  
  let psuEfficiency: string | undefined;
  if (/80\s*\+?\s*Titanium/i.test(text)) psuEfficiency = '80+ Titanium';
  else if (/80\s*\+?\s*Platinum/i.test(text)) psuEfficiency = '80+ Platinum';
  else if (/80\s*\+?\s*Gold/i.test(text)) psuEfficiency = '80+ Gold';
  else if (/80\s*\+?\s*Silver/i.test(text)) psuEfficiency = '80+ Silver';
  else if (/80\s*\+?\s*Bronze/i.test(text)) psuEfficiency = '80+ Bronze';
  else if (/80\s*\+/i.test(text)) psuEfficiency = '80+';

  let psuModular: 'full' | 'semi' | 'no' | undefined;
  if (/full\s*modular/i.test(text)) psuModular = 'full';
  else if (/semi\s*modular/i.test(text)) psuModular = 'semi';
  else if (/modular/i.test(text)) psuModular = 'full';

  const psuFormFactor = /\bSFX\b/i.test(text) ? 'SFX' : 'ATX';

  return {
    psuWattage,
    psuEfficiency,
    psuModular,
    psuFormFactor,
  };
}

/**
 * Detect if storage is M.2 type
 * Priority:
 * 1. First check attributes for "Formato de disco" (Disk Format)
 * 2. If not found, check title and description
 * 
 * Exported for use in components that need to detect storage type
 */
export function isStorageM2(product: Product): boolean {
  // PRIORITY 1: Check in attribute groups for "Formato de disco" or similar
  if (product.attributeGroups) {
    for (const group of product.attributeGroups) {
      for (const attr of group.attributes) {
        // Look for attributes like "Formato de disco", "Formato", "Form Factor", "Disk Format", etc.
        if (/formato|form\s*factor|disk\s*format|tipo/i.test(attr.name)) {
          const value = attr.value.toLowerCase();
          
          // Check if value contains M.2 or M2
          if (/\bm\.?2\b/i.test(value)) {
            return true;
          }
          
          // Check if value contains 2.5" (SATA format) - if found, it's NOT M.2
          if (/2\.?5["']?/i.test(value) || /sata/i.test(value)) {
            return false;
          }
          
          // Check if value contains 3.5" (HDD format) - if found, it's NOT M.2
          if (/3\.?5["']?/i.test(value)) {
            return false;
          }
        }
      }
    }
  }
  
  // PRIORITY 2: If no "Formato de disco" attribute found, check in title and description
  const text = `${product.title} ${product.description}`;
  
  // Check for M.2 mentions
  if (/\bM\.?2\b/i.test(text)) {
    return true;
  }
  
  // Default: assume SATA if M.2 not found
  return false;
}

/**
 * Extract storage form factor from attributes
 * Priority: Check attributes first for "Formato de disco"
 */
function extractStorageFormFactorFromAttributes(product: Product): string | undefined {
  if (!product.attributeGroups) {
    return undefined;
  }
  
  for (const group of product.attributeGroups) {
    for (const attr of group.attributes) {
      // Look for attributes like "Formato de disco", "Formato", "Form Factor", etc.
      if (/formato|form\s*factor|disk\s*format|tipo/i.test(attr.name)) {
        const value = attr.value.toLowerCase();
        
        // Check for M.2 format
        if (/\bm\.?2\b/i.test(value)) {
          return 'M.2';
        }
        
        // Check for 2.5" format
        if (/2\.?5["']?/i.test(value)) {
          return '2.5';
        }
        
        // Check for 3.5" format
        if (/3\.?5["']?/i.test(value)) {
          return '3.5';
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract storage specs from product
 */
function extractStorageSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  let storageInterface: string | undefined;
  if (/\bNVMe\b/i.test(text)) storageInterface = 'NVMe';
  else if (/\bSATA\b/i.test(text)) storageInterface = 'SATA';

  const storageCapacity = extractNumber(text, /(\d+)\s*TB/i)
    ? (extractNumber(text, /(\d+)\s*TB/i) ?? 0) * 1000
    : extractNumber(text, /(\d+)\s*GB/i);

  // PRIORITY 1: Try to extract form factor from attributes first
  let storageFormFactor = extractStorageFormFactorFromAttributes(product);
  
  // PRIORITY 2: If not found in attributes, check in title/description
  if (!storageFormFactor) {
    if (/\bM\.?2\b/i.test(text)) storageFormFactor = 'M.2';
    else if (/2\.5["']?/i.test(text)) storageFormFactor = '2.5';
    else if (/3\.5["']?/i.test(text)) storageFormFactor = '3.5';
  }

  const storageType = /\bHDD\b/i.test(text) ? 'HDD' : 'SSD';

  const readSpeed = extractNumber(text, /lectura[^\d]*(\d{3,4})/i)
    ?? extractNumber(text, /(\d{3,4})\s*MB\/s\s*(?:lectura|read)/i);
  const writeSpeed = extractNumber(text, /escritura[^\d]*(\d{3,4})/i)
    ?? extractNumber(text, /(\d{3,4})\s*MB\/s\s*(?:escritura|write)/i);

  // Detect if storage uses M.2 connector
  const storageIsM2 = isStorageM2(product);
  
  // Determine storage connection type for compatibility checks
  // If it's M.2, it uses M.2 slots; otherwise it uses SATA ports
  const storageConnectionType: 'M.2' | 'SATA' = storageIsM2 ? 'M.2' : 'SATA';

  return {
    storageInterface,
    storageCapacity,
    storageFormFactor,
    storageType,
    storageConnectionType,
    readSpeed,
    writeSpeed,
  };
}

/**
 * Extract cooler specs from product
 */
function extractCoolerSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  const coolerSockets = extractPatterns(text, SOCKET_PATTERNS);
  // Extract cooler height - supports decimals like 164.8mm
  const coolerHeight = extractNumber(text, /(\d{2,3}(?:\.\d+)?)\s*mm/i);
  
  let coolerType: 'air' | 'aio' | undefined;
  let aioSize: number | undefined;

  // Detect AIO/water cooling
  // Look for keywords: AIO, líquida, liquid, water cooling, refrigeración líquida, watercooler
  if (/\b(AIO|all.in.one)\b/i.test(text) || 
      /\b(l[ií]quida?|liquid)\b/i.test(text) || 
      /\b(water\s*cool(?:ing|er)?)\b/i.test(text) ||
      /\b(refrigeraci[oó]n\s*l[ií]quida)\b/i.test(text)) {
    coolerType = 'aio';
    
    // Try to extract radiator size (common sizes: 120, 140, 240, 280, 360, 420 mm)
    // Pattern 1: "240mm", "360 mm"
    const sizeMatch = text.match(/\b(120|140|240|280|360|420)\s*mm\b/i);
    if (sizeMatch) {
      aioSize = parseInt(sizeMatch[1]);
    }
    
    // Pattern 2: Sometimes written as "2x120mm" = 240mm, "3x120mm" = 360mm
    const multiMatch = text.match(/\b([23])\s*x\s*120\s*mm\b/i);
    if (multiMatch && !aioSize) {
      const multiplier = parseInt(multiMatch[1]);
      aioSize = multiplier * 120; // 2x120 = 240, 3x120 = 360
    }
    
    // Try to extract from attribute groups
    if (!aioSize && product.attributeGroups) {
      for (const group of product.attributeGroups) {
        for (const attr of group.attributes) {
          const attrText = `${attr.name} ${attr.value}`;
          
          // Look for radiator size in attributes
          if (/radiador|radiator|tama[ñn]o/i.test(attrText)) {
            const attrSizeMatch = attrText.match(/\b(120|140|240|280|360|420)\s*mm\b/i);
            if (attrSizeMatch) {
              aioSize = parseInt(attrSizeMatch[1]);
              break;
            }
          }
        }
      }
    }
  } else if (/\bair\b/i.test(text) || /\btower\b/i.test(text) || /disipador/i.test(text)) {
    coolerType = 'air';
  }

  const coolerTdp = extractNumber(text, /(\d{2,3})\s*W\s*TDP/i);

  return {
    coolerSockets: coolerSockets.length > 0 ? coolerSockets : undefined,
    coolerHeight,
    coolerType,
    aioSize,
    coolerTdp,
  };
}

/**
 * Main function to extract specs based on category
 */
export function extractSpecs(product: Product, category: CategoryKey): ProductSpec {
  switch (category) {
    case 'cpu':
      return extractCpuSpecs(product);
    case 'motherboard':
      return extractMotherboardSpecs(product);
    case 'ram':
      return extractRamSpecs(product);
    case 'gpu':
      return extractGpuSpecs(product);
    case 'case':
      return extractCaseSpecs(product);
    case 'psu':
      return extractPsuSpecs(product);
    case 'storage':
      return extractStorageSpecs(product);
    case 'cooler':
      return extractCoolerSpecs(product);
    default:
      return {};
  }
}


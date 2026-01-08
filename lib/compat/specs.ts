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
  for (const [value, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(text)) {
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
  for (const [value, regexList] of Object.entries(patterns)) {
    for (const regex of regexList) {
      if (regex.test(text)) {
        matches.push(value);
        break;
      }
    }
  }
  return matches;
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

  return {
    socket,
    cores,
    threads,
    tdp,
    cpuGeneration,
    cpuFamily,
    integratedGraphics,
  };
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

  const formFactor = extractPattern(text, FORM_FACTOR_PATTERNS) ?? 'ATX';
  const supportedMemoryTypes = extractPatterns(text, MEMORY_TYPE_PATTERNS);

  const maxMemory = extractNumber(text, /(?:hasta|max|up to)\s*(\d+)\s*GB/i);
  const memorySlots = extractNumber(text, /(\d+)\s*(?:slots?|ranuras?)\s*(?:de\s*)?(?:RAM|memoria|DIMM)/i)
    ?? extractNumber(text, /(\d+)\s*x\s*DIMM/i)
    ?? extractNumber(text, /(?:posee|tiene|incluye)\s*(\d+)\s*ranuras?\s*DIMM/i);
  const m2Slots = extractNumber(text, /(\d)\s*(?:x\s*)?M\.?2/i);

  return {
    socket,
    chipset,
    formFactor,
    supportedMemoryTypes: supportedMemoryTypes.length > 0 ? supportedMemoryTypes : undefined,
    maxMemory,
    memorySlots,
    m2Slots,
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
 * Extract GPU specs from product
 */
function extractGpuSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  // GPU length
  const gpuLength = extractNumber(text, /(\d{2,3})\s*mm/i);

  // Recommended PSU
  const gpuRecommendedPsu = extractNumber(text, /(?:recomendada?|recommended)\s*(\d+)\s*W/i)
    ?? extractNumber(text, /(\d+)\s*W\s*(?:fuente|PSU|recomendad)/i);

  return {
    gpuLength,
    gpuRecommendedPsu,
  };
}

/**
 * Extract case specs from product
 */
function extractCaseSpecs(product: Product): ProductSpec {
  const text = `${product.title} ${product.description}`;

  const supportedFormFactors = extractPatterns(text, FORM_FACTOR_PATTERNS);
  const maxGpuLength = extractNumber(text, /(?:GPU|VGA|video|gráfica)[^\d]*(?:hasta|max|up to)?\s*(\d{2,3})\s*mm/i)
    ?? extractNumber(text, /(\d{2,3})\s*mm\s*(?:GPU|VGA|video)/i);
  const maxCpuCoolerHeight = extractNumber(text, /(?:cooler|disipador|CPU)[^\d]*(?:hasta|max)?\s*(\d{2,3})\s*mm/i);

  return {
    supportedFormFactors: supportedFormFactors.length > 0 ? supportedFormFactors : undefined,
    maxGpuLength,
    maxCpuCoolerHeight,
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

  let storageFormFactor: string | undefined;
  if (/\bM\.?2\b/i.test(text)) storageFormFactor = 'M.2';
  else if (/2\.5/i.test(text)) storageFormFactor = '2.5';
  else if (/3\.5/i.test(text)) storageFormFactor = '3.5';

  const storageType = /\bHDD\b/i.test(text) ? 'HDD' : 'SSD';

  const readSpeed = extractNumber(text, /lectura[^\d]*(\d{3,4})/i)
    ?? extractNumber(text, /(\d{3,4})\s*MB\/s\s*(?:lectura|read)/i);
  const writeSpeed = extractNumber(text, /escritura[^\d]*(\d{3,4})/i)
    ?? extractNumber(text, /(\d{3,4})\s*MB\/s\s*(?:escritura|write)/i);

  return {
    storageInterface,
    storageCapacity,
    storageFormFactor,
    storageType,
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
  const coolerHeight = extractNumber(text, /(\d{2,3})\s*mm/i);
  
  let coolerType: 'air' | 'aio' | undefined;
  let aioSize: number | undefined;

  if (/\bAIO\b/i.test(text) || /\blíquida?\b/i.test(text) || /liquid/i.test(text)) {
    coolerType = 'aio';
    aioSize = extractNumber(text, /(\d{3})\s*mm/i);
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


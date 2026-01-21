/**
 * Compatibility Engine Types
 * Defines the structure for specs, rules, and evaluation results
 */

import type { CategoryKey } from '../catalog/categories';
import type { Product } from '../mallweb/normalize';

/**
 * ProductSpec - Normalized technical specifications for compatibility checking
 * All fields are optional because we extract them from unstructured data
 */
export interface ProductSpec {
  // CPU specs
  socket?: string;           // e.g., "AM4", "AM5", "LGA1700", "LGA1200"
  cores?: number;
  threads?: number;
  tdp?: number;              // Watts
  cpuGeneration?: string;    // e.g., "Ryzen 5000", "Ryzen 7000", "13th Gen", "14th Gen"
  cpuFamily?: string;        // e.g., "Ryzen 5", "Ryzen 7", "Core i5", "Core i7"
  integratedGraphics?: boolean;
  includesCooler?: boolean;  // Whether CPU includes a cooler

  // Motherboard specs
  chipset?: string;          // e.g., "B550", "X570", "B650", "Z690", "Z790"
  formFactor?: string;       // e.g., "ATX", "Micro-ATX", "Mini-ITX", "E-ATX"
  supportedMemoryTypes?: string[]; // e.g., ["DDR4"], ["DDR5"], ["DDR4", "DDR5"]
  maxMemory?: number;        // GB
  memorySlots?: number;
  m2Slots?: number;
  pciExpressVersion?: string; // e.g., "4.0", "5.0"

  // RAM specs
  memoryType?: string;       // e.g., "DDR4", "DDR5"
  memorySpeed?: number;      // MHz
  memoryCapacity?: number;   // GB per module
  memoryModules?: number;    // Number of modules in kit
  memoryLatency?: string;    // e.g., "CL16", "CL36"

  // GPU specs
  gpuLength?: number;        // mm
  gpuSlots?: number;         // e.g., 2, 2.5, 3
  gpuPowerConnectors?: string[];
  gpuRecommendedPsu?: number; // Watts
  gpuInterface?: string;     // e.g., "PCIe 4.0 x16"

  // Case specs
  supportedFormFactors?: string[]; // e.g., ["ATX", "Micro-ATX", "Mini-ITX"]
  maxGpuLength?: number;     // mm
  maxCpuCoolerHeight?: number; // mm
  maxPsuLength?: number;     // mm
  drivesBays25?: number;     // 2.5" drive bays
  drivesBays35?: number;     // 3.5" drive bays
  includesPsu?: boolean;     // Whether case includes a PSU
  includedPsuWattage?: number; // Wattage of included PSU (if any)

  // PSU specs
  psuWattage?: number;       // Watts
  psuEfficiency?: string;    // e.g., "80+ Bronze", "80+ Gold", "80+ Platinum"
  psuModular?: 'full' | 'semi' | 'no';
  psuFormFactor?: string;    // e.g., "ATX", "SFX"
  psuLength?: number;        // mm

  // Storage specs
  storageInterface?: string; // "SATA", "NVMe", "PCIe"
  storageCapacity?: number;  // GB
  storageFormFactor?: string; // "2.5", "3.5", "M.2"
  storageType?: string;      // "SSD", "HDD"
  readSpeed?: number;        // MB/s
  writeSpeed?: number;       // MB/s

  // Cooler specs
  coolerSockets?: string[];  // e.g., ["AM4", "AM5", "LGA1700"]
  coolerHeight?: number;     // mm
  coolerType?: 'air' | 'aio';
  aioSize?: number;          // mm (e.g., 240, 280, 360)
  coolerTdp?: number;        // Max TDP supported
}

/**
 * Product with extracted specs
 */
export interface ProductWithSpec {
  product: Product;
  spec: ProductSpec;
  category: CategoryKey;
}

/**
 * Compatibility check result status
 */
export type CompatStatus = 'pass' | 'fail' | 'warn' | 'unknown';

/**
 * Result of a single compatibility rule evaluation
 */
export interface RuleResult {
  ruleId: string;
  status: CompatStatus;
  reason: string;
  affectedCategories: CategoryKey[];
}

/**
 * Full compatibility evaluation result for a product
 */
export interface CompatibilityResult {
  productId: string;
  allowed: boolean;
  results: RuleResult[];
  warnings: string[];
  failures: string[];
  hasUnknownChecks: boolean; // True if some compatibility checks couldn't be performed
}

/**
 * A compatibility rule definition
 */
export interface CompatibilityRule {
  id: string;
  name: string;
  description: string;
  sourceCategory: CategoryKey;
  targetCategories: CategoryKey[];
  evaluate: (
    candidate: ProductWithSpec,
    build: Map<CategoryKey, ProductWithSpec>
  ) => RuleResult;
}

/**
 * The current PC build state
 */
export type PCBuild = Map<CategoryKey, ProductWithSpec>;


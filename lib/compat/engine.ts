/**
 * Compatibility Engine
 * Evaluates products against the current build using compatibility rules
 */

import type { CategoryKey } from '../catalog/categories';
import type { Product } from '../mallweb/normalize';
import type {
  ProductWithSpec,
  CompatibilityResult,
  RuleResult,
  PCBuild,
} from './types';
import { extractSpecs } from './specs';
import { getRulesForCategory } from './rules';

/**
 * Create a ProductWithSpec from a Product and category
 */
export function createProductWithSpec(
  product: Product,
  category: CategoryKey
): ProductWithSpec {
  return {
    product,
    spec: extractSpecs(product, category),
    category,
  };
}

/**
 * Evaluate a candidate product against the current build
 */
export function evaluateCompatibility(
  candidate: Product,
  candidateCategory: CategoryKey,
  build: PCBuild
): CompatibilityResult {
  const candidateWithSpec = createProductWithSpec(candidate, candidateCategory);
  const rules = getRulesForCategory(candidateCategory);

  const results: RuleResult[] = [];
  const warnings: string[] = [];
  const failures: string[] = [];
  let hasUnknownChecks = false;

  for (const rule of rules) {
    const result = rule.evaluate(candidateWithSpec, build);
    results.push(result);

    if (result.status === 'warn') {
      warnings.push(result.reason);
    } else if (result.status === 'fail') {
      failures.push(result.reason);
    } else if (result.status === 'unknown') {
      hasUnknownChecks = true;
    }
  }

  return {
    productId: candidate.id,
    allowed: failures.length === 0,
    results,
    warnings,
    failures,
    hasUnknownChecks,
  };
}

/**
 * Filter products by compatibility
 * Returns products sorted by compatibility (compatible first, then warnings, then incompatible)
 */
export function filterByCompatibility(
  products: Product[],
  category: CategoryKey,
  build: PCBuild,
  showIncompatible = false
): Array<{ product: Product; compatibility: CompatibilityResult }> {
  const evaluated = products.map((product) => ({
    product,
    compatibility: evaluateCompatibility(product, category, build),
  }));

  // Filter out incompatible if requested
  const filtered = showIncompatible
    ? evaluated
    : evaluated.filter((item) => item.compatibility.allowed);

  // Sort: compatible first, then warnings, then incompatible
  return filtered.sort((a, b) => {
    const aScore = getCompatibilityScore(a.compatibility);
    const bScore = getCompatibilityScore(b.compatibility);
    return bScore - aScore;
  });
}

/**
 * Get a numeric score for sorting (higher = more compatible)
 */
function getCompatibilityScore(compat: CompatibilityResult): number {
  if (!compat.allowed) return 0;
  if (compat.warnings.length > 0) return 1;
  return 2;
}

/**
 * Get a compatibility summary for the entire build
 */
export function getBuildCompatibilitySummary(
  build: PCBuild
): {
  isComplete: boolean;
  isCompatible: boolean;
  warnings: string[];
  failures: string[];
} {
  const allWarnings: string[] = [];
  const allFailures: string[] = [];
  let isCompatible = true;

  // Check each part against the rest of the build
  for (const [category, part] of build.entries()) {
    const result = evaluateCompatibility(part.product, category, build);
    allWarnings.push(...result.warnings);
    
    if (!result.allowed) {
      isCompatible = false;
      allFailures.push(...result.failures);
    }
  }

  // Deduplicate messages
  const uniqueWarnings = [...new Set(allWarnings)];
  const uniqueFailures = [...new Set(allFailures)];

  // Check if build has minimum required parts
  // GPU is required only if CPU doesn't have integrated graphics
  const cpuPart = build.get('cpu');
  const cpuHasGraphics = Array.isArray(cpuPart) 
    ? cpuPart[0]?.spec.integratedGraphics 
    : cpuPart?.spec.integratedGraphics;
  const gpuRequired = !cpuHasGraphics; // GPU required if CPU has no integrated graphics
  
  // Cooler is required unless CPU explicitly includes one
  const cpuIncludesCooler = Array.isArray(cpuPart) 
    ? cpuPart[0]?.spec.includesCooler 
    : cpuPart?.spec.includesCooler;
  // IMPORTANT: If CPU doesn't explicitly say it includes a cooler (undefined or false), require one
  const coolerRequired = cpuIncludesCooler !== true; // Cooler required unless CPU explicitly includes one
  
  // Base required categories
  const baseRequired: CategoryKey[] = ['cpu', 'motherboard', 'ram', 'storage', 'psu', 'case'];
  
  // Add GPU if required
  if (gpuRequired) {
    baseRequired.push('gpu');
  }
  
  // Add cooler if required
  if (coolerRequired) {
    baseRequired.push('cooler');
  }
  
  const requiredCategories: CategoryKey[] = baseRequired;
  
  const isComplete = requiredCategories.every((cat) => build.has(cat));
  
  // Add specific error if cooler is required but not present
  if (coolerRequired && !build.has('cooler')) {
    uniqueFailures.push('El CPU seleccionado no incluye cooler. Debes agregar un cooler para CPU.');
  }

  return {
    isComplete,
    isCompatible,
    warnings: uniqueWarnings,
    failures: uniqueFailures,
  };
}

/**
 * Get compatibility status badge info
 */
export function getCompatibilityBadge(
  compatibility: CompatibilityResult
): {
  label: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
  icon: string;
} {
  // Incompatible - found real conflicts
  if (!compatibility.allowed) {
    return {
      label: 'Incompatible',
      color: 'red',
      icon: '❌',
    };
  }

  // Warnings - needs manual verification
  if (compatibility.warnings.length > 0) {
    return {
      label: 'Verificar',
      color: 'yellow',
      icon: '⚠️',
    };
  }

  // Unknown checks - couldn't verify some aspects
  if (compatibility.hasUnknownChecks) {
    return {
      label: 'No se pudo verificar',
      color: 'yellow',
      icon: '⚠',
    };
  }

  // Fully compatible - all checks passed
  return {
    label: 'Compatible',
    color: 'green',
    icon: '✓',
  };
}


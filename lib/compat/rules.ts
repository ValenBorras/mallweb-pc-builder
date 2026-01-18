/**
 * Compatibility Rules
 * Defines the rules for checking PC component compatibility
 */

import type { CategoryKey } from '../catalog/categories';
import type { CompatibilityRule, RuleResult } from './types';

/**
 * Helper to create a rule result
 */
function createResult(
  ruleId: string,
  status: 'pass' | 'fail' | 'warn' | 'unknown',
  reason: string,
  affectedCategories: CategoryKey[]
): RuleResult {
  return { ruleId, status, reason, affectedCategories };
}

/**
 * CPU ↔ Motherboard Socket Compatibility
 */
const cpuMotherboardSocketRule: CompatibilityRule = {
  id: 'cpu-mobo-socket',
  name: 'CPU/Motherboard Socket',
  description: 'El socket del CPU debe coincidir con el socket del motherboard',
  sourceCategory: 'cpu',
  targetCategories: ['motherboard'],
  evaluate: (candidate, build) => {
    const mobo = build.get('motherboard');
    if (!mobo) {
      return createResult(
        'cpu-mobo-socket',
        'pass',
        'No hay motherboard seleccionado',
        ['cpu', 'motherboard']
      );
    }

    const cpuSocket = candidate.spec.socket;
    const moboSocket = mobo.spec.socket;

    if (!cpuSocket || !moboSocket) {
      return createResult(
        'cpu-mobo-socket',
        'warn',
        'No se pudo determinar la compatibilidad de socket. Verificá manualmente.',
        ['cpu', 'motherboard']
      );
    }

    if (cpuSocket === moboSocket) {
      return createResult(
        'cpu-mobo-socket',
        'pass',
        `Socket ${cpuSocket} compatible`,
        ['cpu', 'motherboard']
      );
    }

    return createResult(
      'cpu-mobo-socket',
      'fail',
      `Socket incompatible: CPU usa ${cpuSocket}, motherboard usa ${moboSocket}`,
      ['cpu', 'motherboard']
    );
  },
};

/**
 * Motherboard ↔ CPU Socket Compatibility (reverse direction)
 */
const motherboardCpuSocketRule: CompatibilityRule = {
  id: 'mobo-cpu-socket',
  name: 'Motherboard/CPU Socket',
  description: 'El socket del motherboard debe coincidir con el socket del CPU',
  sourceCategory: 'motherboard',
  targetCategories: ['cpu'],
  evaluate: (candidate, build) => {
    const cpu = build.get('cpu');
    if (!cpu) {
      return createResult(
        'mobo-cpu-socket',
        'pass',
        'No hay CPU seleccionado',
        ['motherboard', 'cpu']
      );
    }

    const moboSocket = candidate.spec.socket;
    const cpuSocket = cpu.spec.socket;

    if (!moboSocket || !cpuSocket) {
      return createResult(
        'mobo-cpu-socket',
        'warn',
        'No se pudo determinar la compatibilidad de socket. Verificá manualmente.',
        ['motherboard', 'cpu']
      );
    }

    if (moboSocket === cpuSocket) {
      return createResult(
        'mobo-cpu-socket',
        'pass',
        `Socket ${moboSocket} compatible`,
        ['motherboard', 'cpu']
      );
    }

    return createResult(
      'mobo-cpu-socket',
      'fail',
      `Socket incompatible: Motherboard usa ${moboSocket}, CPU usa ${cpuSocket}`,
      ['motherboard', 'cpu']
    );
  },
};

/**
 * Motherboard ↔ RAM Memory Type Compatibility
 */
const motherboardRamTypeRule: CompatibilityRule = {
  id: 'mobo-ram-type',
  name: 'Motherboard/RAM Type',
  description: 'El tipo de memoria RAM debe ser soportado por el motherboard',
  sourceCategory: 'motherboard',
  targetCategories: ['ram'],
  evaluate: (candidate, build) => {
    const ram = build.get('ram');
    if (!ram) {
      return createResult(
        'mobo-ram-type',
        'pass',
        'No hay RAM seleccionada',
        ['motherboard', 'ram']
      );
    }

    const moboMemTypes = candidate.spec.supportedMemoryTypes;
    const ramType = ram.spec.memoryType;

    if (!moboMemTypes || moboMemTypes.length === 0 || !ramType) {
      return createResult(
        'mobo-ram-type',
        'warn',
        'No se pudo determinar la compatibilidad de memoria. Verificá manualmente.',
        ['motherboard', 'ram']
      );
    }

    if (moboMemTypes.includes(ramType)) {
      return createResult(
        'mobo-ram-type',
        'pass',
        `Memoria ${ramType} soportada`,
        ['motherboard', 'ram']
      );
    }

    return createResult(
      'mobo-ram-type',
      'fail',
      `Memoria incompatible: Motherboard soporta ${moboMemTypes.join('/')}, RAM es ${ramType}`,
      ['motherboard', 'ram']
    );
  },
};

/**
 * RAM ↔ Motherboard Memory Type Compatibility
 */
const ramMotherboardTypeRule: CompatibilityRule = {
  id: 'ram-mobo-type',
  name: 'RAM/Motherboard Type',
  description: 'El tipo de memoria RAM debe ser soportado por el motherboard',
  sourceCategory: 'ram',
  targetCategories: ['motherboard'],
  evaluate: (candidate, build) => {
    const mobo = build.get('motherboard');
    if (!mobo) {
      return createResult(
        'ram-mobo-type',
        'pass',
        'No hay motherboard seleccionado',
        ['ram', 'motherboard']
      );
    }

    const ramType = candidate.spec.memoryType;
    const moboMemTypes = mobo.spec.supportedMemoryTypes;

    if (!ramType || !moboMemTypes || moboMemTypes.length === 0) {
      return createResult(
        'ram-mobo-type',
        'warn',
        'No se pudo determinar la compatibilidad de memoria. Verificá manualmente.',
        ['ram', 'motherboard']
      );
    }

    if (moboMemTypes.includes(ramType)) {
      return createResult(
        'ram-mobo-type',
        'pass',
        `Memoria ${ramType} soportada por el motherboard`,
        ['ram', 'motherboard']
      );
    }

    return createResult(
      'ram-mobo-type',
      'fail',
      `Memoria incompatible: RAM es ${ramType}, motherboard soporta ${moboMemTypes.join('/')}`,
      ['ram', 'motherboard']
    );
  },
};

/**
 * Motherboard ↔ Case Form Factor Compatibility
 */
const motherboardCaseFormFactorRule: CompatibilityRule = {
  id: 'mobo-case-formfactor',
  name: 'Motherboard/Case Form Factor',
  description: 'El form factor del motherboard debe ser soportado por el gabinete',
  sourceCategory: 'motherboard',
  targetCategories: ['case'],
  evaluate: (candidate, build) => {
    const pcCase = build.get('case');
    if (!pcCase) {
      return createResult(
        'mobo-case-formfactor',
        'pass',
        'No hay gabinete seleccionado',
        ['motherboard', 'case']
      );
    }

    const moboFF = candidate.spec.formFactor;
    const caseFF = pcCase.spec.supportedFormFactors;

    // If we can't determine form factors, mark as unknown
    if (!moboFF || !caseFF || caseFF.length === 0) {
      return createResult(
        'mobo-case-formfactor',
        'unknown',
        'No se pudo verificar form factor',
        ['motherboard', 'case']
      );
    }

    // Form factor hierarchy: E-ATX > ATX > Micro-ATX > Mini-ITX
    // Larger cases can fit smaller motherboards
    const formFactorHierarchy: Record<string, number> = {
      'E-ATX': 4,
      'ATX': 3,
      'Micro-ATX': 2,
      'Mini-ITX': 1,
    };

    const moboLevel = formFactorHierarchy[moboFF] ?? 0;
    
    for (const supportedFF of caseFF) {
      const caseLevel = formFactorHierarchy[supportedFF] ?? 0;
      if (caseLevel >= moboLevel) {
        return createResult(
          'mobo-case-formfactor',
          'pass',
          `Form factor ${moboFF} compatible con gabinete`,
          ['motherboard', 'case']
        );
      }
    }

    return createResult(
      'mobo-case-formfactor',
      'fail',
      `Form factor incompatible: Motherboard es ${moboFF}, gabinete soporta ${caseFF.join('/')}`,
      ['motherboard', 'case']
    );
  },
};

/**
 * Case ↔ Motherboard Form Factor Compatibility
 */
const caseMotherboardFormFactorRule: CompatibilityRule = {
  id: 'case-mobo-formfactor',
  name: 'Case/Motherboard Form Factor',
  description: 'El gabinete debe soportar el form factor del motherboard',
  sourceCategory: 'case',
  targetCategories: ['motherboard'],
  evaluate: (candidate, build) => {
    const mobo = build.get('motherboard');
    if (!mobo) {
      return createResult(
        'case-mobo-formfactor',
        'pass',
        'No hay motherboard seleccionado',
        ['case', 'motherboard']
      );
    }

    const caseFF = candidate.spec.supportedFormFactors;
    const moboFF = mobo.spec.formFactor;

    // If we can't determine form factors, mark as unknown
    if (!caseFF || caseFF.length === 0 || !moboFF) {
      return createResult(
        'case-mobo-formfactor',
        'unknown',
        'No se pudo verificar form factor',
        ['case', 'motherboard']
      );
    }

    const formFactorHierarchy: Record<string, number> = {
      'E-ATX': 4,
      'ATX': 3,
      'Micro-ATX': 2,
      'Mini-ITX': 1,
    };

    const moboLevel = formFactorHierarchy[moboFF] ?? 0;
    
    for (const supportedFF of caseFF) {
      const caseLevel = formFactorHierarchy[supportedFF] ?? 0;
      if (caseLevel >= moboLevel) {
        return createResult(
          'case-mobo-formfactor',
          'pass',
          `Gabinete soporta motherboard ${moboFF}`,
          ['case', 'motherboard']
        );
      }
    }

    return createResult(
      'case-mobo-formfactor',
      'fail',
      `Gabinete incompatible: Soporta ${caseFF.join('/')}, motherboard es ${moboFF}`,
      ['case', 'motherboard']
    );
  },
};

/**
 * GPU ↔ Case Length Compatibility
 */
const gpuCaseLengthRule: CompatibilityRule = {
  id: 'gpu-case-length',
  name: 'GPU/Case Length',
  description: 'La GPU debe entrar en el gabinete',
  sourceCategory: 'gpu',
  targetCategories: ['case'],
  evaluate: (candidate, build) => {
    const pcCase = build.get('case');
    if (!pcCase) {
      return createResult(
        'gpu-case-length',
        'pass',
        'No hay gabinete seleccionado',
        ['gpu', 'case']
      );
    }

    const gpuLength = candidate.spec.gpuLength;
    const maxGpuLength = pcCase.spec.maxGpuLength;

    // If we can't determine dimensions, mark as unknown
    if (!gpuLength || !maxGpuLength) {
      return createResult(
        'gpu-case-length',
        'unknown',
        'No se pudieron verificar dimensiones',
        ['gpu', 'case']
      );
    }

    if (gpuLength <= maxGpuLength) {
      return createResult(
        'gpu-case-length',
        'pass',
        `GPU (${gpuLength}mm) entra en gabinete (max ${maxGpuLength}mm)`,
        ['gpu', 'case']
      );
    }

    return createResult(
      'gpu-case-length',
      'fail',
      `GPU demasiado larga: GPU es ${gpuLength}mm, gabinete soporta hasta ${maxGpuLength}mm`,
      ['gpu', 'case']
    );
  },
};

/**
 * Case ↔ GPU Length Compatibility
 */
const caseGpuLengthRule: CompatibilityRule = {
  id: 'case-gpu-length',
  name: 'Case/GPU Length',
  description: 'El gabinete debe soportar el largo de la GPU',
  sourceCategory: 'case',
  targetCategories: ['gpu'],
  evaluate: (candidate, build) => {
    const gpu = build.get('gpu');
    if (!gpu) {
      return createResult(
        'case-gpu-length',
        'pass',
        'No hay GPU seleccionada',
        ['case', 'gpu']
      );
    }

    const maxGpuLength = candidate.spec.maxGpuLength;
    const gpuLength = gpu.spec.gpuLength;

    // If we can't determine dimensions, mark as unknown
    if (!maxGpuLength || !gpuLength) {
      return createResult(
        'case-gpu-length',
        'unknown',
        'No se pudieron verificar dimensiones',
        ['case', 'gpu']
      );
    }

    if (gpuLength <= maxGpuLength) {
      return createResult(
        'case-gpu-length',
        'pass',
        `Gabinete soporta GPU de ${gpuLength}mm (max ${maxGpuLength}mm)`,
        ['case', 'gpu']
      );
    }

    return createResult(
      'case-gpu-length',
      'fail',
      `Gabinete muy chico para GPU: GPU es ${gpuLength}mm, gabinete soporta hasta ${maxGpuLength}mm`,
      ['case', 'gpu']
    );
  },
};

/**
 * PSU ↔ GPU Minimum Power Requirement
 * Checks if PSU meets the minimum wattage specified by the GPU
 */
const psuGpuMinimumPowerRule: CompatibilityRule = {
  id: 'psu-gpu-minimum',
  name: 'PSU/GPU Minimum Power',
  description: 'La fuente debe cumplir con la potencia mínima requerida por la GPU',
  sourceCategory: 'psu',
  targetCategories: ['gpu'],
  evaluate: (candidate, build) => {
    const gpu = build.get('gpu');

    if (!gpu) {
      return createResult(
        'psu-gpu-minimum',
        'pass',
        'No hay GPU seleccionada',
        ['psu', 'gpu']
      );
    }

    const psuWattage = candidate.spec.psuWattage;
    const gpuRecommendedPsu = gpu.spec.gpuRecommendedPsu;

    if (!psuWattage) {
      return createResult(
        'psu-gpu-minimum',
        'warn',
        'No se pudo determinar el wattage de la fuente. Verificá manualmente.',
        ['psu', 'gpu']
      );
    }

    // If GPU doesn't specify a minimum PSU, perform basic estimate
    if (!gpuRecommendedPsu) {
      return createResult(
        'psu-gpu-minimum',
        'warn',
        'La GPU no especifica potencia mínima requerida. Verificá manualmente.',
        ['psu', 'gpu']
      );
    }

    // Check if PSU meets GPU's minimum requirement
    if (psuWattage >= gpuRecommendedPsu) {
      return createResult(
        'psu-gpu-minimum',
        'pass',
        `Fuente de ${psuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos por la GPU`,
        ['psu', 'gpu']
      );
    }

    return createResult(
      'psu-gpu-minimum',
      'fail',
      `Fuente insuficiente: ${psuWattage}W. La GPU requiere mínimo ${gpuRecommendedPsu}W`,
      ['psu', 'gpu']
    );
  },
};

/**
 * PSU ↔ Build Power Requirements
 * Estimates total power and checks against PSU wattage
 */
const psuPowerRule: CompatibilityRule = {
  id: 'psu-power',
  name: 'PSU Wattage',
  description: 'La fuente debe proveer suficiente potencia para el build',
  sourceCategory: 'psu',
  targetCategories: ['cpu', 'gpu'],
  evaluate: (candidate, build) => {
    const cpu = build.get('cpu');
    const gpu = build.get('gpu');

    if (!cpu && !gpu) {
      return createResult(
        'psu-power',
        'pass',
        'No hay CPU ni GPU para evaluar',
        ['psu', 'cpu', 'gpu']
      );
    }

    const psuWattage = candidate.spec.psuWattage;
    if (!psuWattage) {
      return createResult(
        'psu-power',
        'warn',
        'No se pudo determinar el wattage de la fuente. Verificá manualmente.',
        ['psu', 'cpu', 'gpu']
      );
    }

    // Estimate power consumption
    let estimatedPower = 100; // Base system power (mobo, ram, storage, fans)
    
    if (cpu?.spec.tdp) {
      estimatedPower += cpu.spec.tdp;
    } else if (cpu) {
      estimatedPower += 125; // Default estimate
    }

    if (gpu?.spec.gpuRecommendedPsu) {
      // GPU recommended PSU already includes overhead
      const gpuPower = gpu.spec.gpuRecommendedPsu - 200; // Subtract base estimate
      estimatedPower += Math.max(gpuPower, 150);
    } else if (gpu) {
      estimatedPower += 200; // Default GPU estimate
    }

    // Add 20% headroom
    const recommendedPsu = Math.ceil(estimatedPower * 1.2);

    if (psuWattage >= recommendedPsu) {
      return createResult(
        'psu-power',
        'pass',
        `Fuente de ${psuWattage}W suficiente (estimado: ${estimatedPower}W, recomendado: ${recommendedPsu}W)`,
        ['psu', 'cpu', 'gpu']
      );
    }

    if (psuWattage >= estimatedPower) {
      return createResult(
        'psu-power',
        'warn',
        `Fuente de ${psuWattage}W puede ser justa. Estimado: ${estimatedPower}W, recomendado: ${recommendedPsu}W`,
        ['psu', 'cpu', 'gpu']
      );
    }

    return createResult(
      'psu-power',
      'fail',
      `Fuente insuficiente: ${psuWattage}W. Estimado: ${estimatedPower}W, recomendado: ${recommendedPsu}W`,
      ['psu', 'cpu', 'gpu']
    );
  },
};

/**
 * Cooler ↔ CPU Socket Compatibility
 */
const coolerCpuSocketRule: CompatibilityRule = {
  id: 'cooler-cpu-socket',
  name: 'Cooler/CPU Socket',
  description: 'El cooler debe soportar el socket del CPU',
  sourceCategory: 'cooler',
  targetCategories: ['cpu'],
  evaluate: (candidate, build) => {
    const cpu = build.get('cpu');
    if (!cpu) {
      return createResult(
        'cooler-cpu-socket',
        'pass',
        'No hay CPU seleccionado',
        ['cooler', 'cpu']
      );
    }

    const coolerSockets = candidate.spec.coolerSockets;
    const cpuSocket = cpu.spec.socket;

    if (!coolerSockets || coolerSockets.length === 0 || !cpuSocket) {
      return createResult(
        'cooler-cpu-socket',
        'warn',
        'No se pudo verificar compatibilidad de socket del cooler. Verificá manualmente.',
        ['cooler', 'cpu']
      );
    }

    if (coolerSockets.includes(cpuSocket)) {
      return createResult(
        'cooler-cpu-socket',
        'pass',
        `Cooler soporta socket ${cpuSocket}`,
        ['cooler', 'cpu']
      );
    }

    return createResult(
      'cooler-cpu-socket',
      'fail',
      `Cooler incompatible: Soporta ${coolerSockets.join('/')}, CPU usa ${cpuSocket}`,
      ['cooler', 'cpu']
    );
  },
};

/**
 * Cooler ↔ Case Clearance
 */
const coolerCaseClearanceRule: CompatibilityRule = {
  id: 'cooler-case-clearance',
  name: 'Cooler/Case Clearance',
  description: 'El cooler debe entrar en el gabinete',
  sourceCategory: 'cooler',
  targetCategories: ['case'],
  evaluate: (candidate, build) => {
    const pcCase = build.get('case');
    if (!pcCase) {
      return createResult(
        'cooler-case-clearance',
        'pass',
        'No hay gabinete seleccionado',
        ['cooler', 'case']
      );
    }

    const coolerHeight = candidate.spec.coolerHeight;
    const maxCoolerHeight = pcCase.spec.maxCpuCoolerHeight;

    // Only check for air coolers
    if (candidate.spec.coolerType === 'aio') {
      return createResult(
        'cooler-case-clearance',
        'pass',
        'AIO - verificá que el gabinete soporte radiadores',
        ['cooler', 'case']
      );
    }

    // If we can't determine dimensions, mark as unknown
    if (!coolerHeight || !maxCoolerHeight) {
      return createResult(
        'cooler-case-clearance',
        'unknown',
        'No se pudieron verificar dimensiones',
        ['cooler', 'case']
      );
    }

    if (coolerHeight <= maxCoolerHeight) {
      return createResult(
        'cooler-case-clearance',
        'pass',
        `Cooler (${coolerHeight}mm) entra en gabinete (max ${maxCoolerHeight}mm)`,
        ['cooler', 'case']
      );
    }

    return createResult(
      'cooler-case-clearance',
      'fail',
      `Cooler muy alto: ${coolerHeight}mm, gabinete soporta hasta ${maxCoolerHeight}mm`,
      ['cooler', 'case']
    );
  },
};

/**
 * All compatibility rules
 */
export const COMPATIBILITY_RULES: CompatibilityRule[] = [
  cpuMotherboardSocketRule,
  motherboardCpuSocketRule,
  motherboardRamTypeRule,
  ramMotherboardTypeRule,
  motherboardCaseFormFactorRule,
  caseMotherboardFormFactorRule,
  gpuCaseLengthRule,
  caseGpuLengthRule,
  psuGpuMinimumPowerRule,
  psuPowerRule,
  coolerCpuSocketRule,
  coolerCaseClearanceRule,
];

/**
 * Get rules that apply to a specific category
 */
export function getRulesForCategory(category: CategoryKey): CompatibilityRule[] {
  return COMPATIBILITY_RULES.filter(
    (rule) => rule.sourceCategory === category
  );
}


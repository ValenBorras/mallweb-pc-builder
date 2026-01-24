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
 * Case ↔ GPU PSU Compatibility (for cases with included PSU)
 * Checks if the case's included PSU is sufficient for the GPU
 */
const caseIncludedPsuGpuRule: CompatibilityRule = {
  id: 'case-included-psu-gpu',
  name: 'Case Included PSU/GPU',
  description: 'La fuente incluida en el gabinete debe ser suficiente para la GPU',
  sourceCategory: 'case',
  targetCategories: ['gpu'],
  evaluate: (candidate, build) => {
    // Only check if the case includes a PSU AND we can determine its wattage
    // If we can't determine the wattage, we can't validate, so just pass silently
    if (!candidate.spec.includesPsu || !candidate.spec.includedPsuWattage) {
      return createResult(
        'case-included-psu-gpu',
        'pass',
        '', // No message - most cases don't include PSU
        ['case', 'gpu']
      );
    }

    const gpu = build.get('gpu');
    if (!gpu) {
      return createResult(
        'case-included-psu-gpu',
        'pass',
        '', // No message needed when there's no GPU
        ['case', 'gpu']
      );
    }

    const includedPsuWattage = candidate.spec.includedPsuWattage;
    const gpuRecommendedPsu = gpu.spec.gpuRecommendedPsu;

    // If GPU doesn't specify required PSU, we can't validate properly
    // Just pass silently instead of showing a warning
    if (!gpuRecommendedPsu) {
      return createResult(
        'case-included-psu-gpu',
        'pass',
        '', // No message - can't validate without GPU requirements
        ['case', 'gpu']
      );
    }

    // Check if included PSU meets GPU's minimum requirement
    // PSU must be >= GPU requirement, no exceptions
    if (includedPsuWattage >= gpuRecommendedPsu) {
      // PSU meets or exceeds requirement
      if (includedPsuWattage === gpuRecommendedPsu) {
        return createResult(
          'case-included-psu-gpu',
          'warn',
          `Fuente incluida de ${includedPsuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos, pero está justa. Se recomienda una fuente mayor.`,
          ['case', 'gpu']
        );
      }
      return createResult(
        'case-included-psu-gpu',
        'pass',
        `Fuente incluida de ${includedPsuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos por la GPU`,
        ['case', 'gpu']
      );
    }

    // PSU is below requirement - ALWAYS fail, no tolerance
    return createResult(
      'case-included-psu-gpu',
      'fail',
      `Fuente incluida insuficiente: ${includedPsuWattage}W. La GPU requiere mínimo ${gpuRecommendedPsu}W`,
      ['case', 'gpu']
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
    // PSU must be >= GPU requirement, no exceptions
    if (psuWattage >= gpuRecommendedPsu) {
      // PSU meets or exceeds requirement
      if (psuWattage === gpuRecommendedPsu) {
        return createResult(
          'psu-gpu-minimum',
          'warn',
          `Fuente de ${psuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos, pero está justa. Se recomienda mayor potencia para mayor margen.`,
          ['psu', 'gpu']
        );
      }
      return createResult(
        'psu-gpu-minimum',
        'pass',
        `Fuente de ${psuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos por la GPU`,
        ['psu', 'gpu']
      );
    }

    // PSU is below requirement - ALWAYS fail, no tolerance
    return createResult(
      'psu-gpu-minimum',
      'fail',
      `Fuente insuficiente: ${psuWattage}W. La GPU requiere mínimo ${gpuRecommendedPsu}W`,
      ['psu', 'gpu']
    );
  },
};

/**
 * GPU ↔ PSU Minimum Power Requirement (Inverse of psuGpuMinimumPowerRule)
 * Checks if existing PSU meets the GPU's minimum wattage requirement
 */
const gpuPsuMinimumPowerRule: CompatibilityRule = {
  id: 'gpu-psu-minimum',
  name: 'GPU/PSU Minimum Power',
  description: 'La GPU requiere una fuente con suficiente potencia',
  sourceCategory: 'gpu',
  targetCategories: ['psu'],
  evaluate: (candidate, build) => {
    const psu = build.get('psu');

    if (!psu) {
      return createResult(
        'gpu-psu-minimum',
        'pass',
        'No hay fuente seleccionada',
        ['gpu', 'psu']
      );
    }

    const gpuRecommendedPsu = candidate.spec.gpuRecommendedPsu;
    const psuWattage = psu.spec.psuWattage;

    if (!gpuRecommendedPsu) {
      return createResult(
        'gpu-psu-minimum',
        'warn',
        'La GPU no especifica potencia mínima requerida. Verificá manualmente.',
        ['gpu', 'psu']
      );
    }

    if (!psuWattage) {
      return createResult(
        'gpu-psu-minimum',
        'warn',
        'No se pudo determinar el wattage de la fuente. Verificá manualmente.',
        ['gpu', 'psu']
      );
    }

    // Check if PSU meets GPU's minimum requirement
    // PSU must be >= GPU requirement, no exceptions
    if (psuWattage >= gpuRecommendedPsu) {
      // PSU meets or exceeds requirement
      if (psuWattage === gpuRecommendedPsu) {
        return createResult(
          'gpu-psu-minimum',
          'warn',
          `Fuente de ${psuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos, pero está justa. Se recomienda mayor potencia para mayor margen.`,
          ['gpu', 'psu']
        );
      }
      return createResult(
        'gpu-psu-minimum',
        'pass',
        `Fuente de ${psuWattage}W cumple con los ${gpuRecommendedPsu}W requeridos por la GPU`,
        ['gpu', 'psu']
      );
    }

    // PSU is below requirement - ALWAYS fail, no tolerance
    return createResult(
      'gpu-psu-minimum',
      'fail',
      `Fuente insuficiente: ${psuWattage}W. La GPU requiere mínimo ${gpuRecommendedPsu}W`,
      ['gpu', 'psu']
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

    // IMPORTANT: If GPU specifies a recommended PSU, that value ALREADY INCLUDES
    // the entire system (CPU, motherboard, RAM, storage, etc.)
    // We should use that value directly, NOT sum it with CPU power
    if (gpu?.spec.gpuRecommendedPsu) {
      // GPU manufacturer's recommended PSU already accounts for the full system
      const gpuRecommendedPsu = gpu.spec.gpuRecommendedPsu;
      
      if (psuWattage >= gpuRecommendedPsu) {
        return createResult(
          'psu-power',
          'pass',
          `Fuente de ${psuWattage}W cumple con el sistema completo según GPU (${gpuRecommendedPsu}W)`,
          ['psu', 'cpu', 'gpu']
        );
      }
      
      // PSU is below GPU recommendation - this is already handled by other rules
      // Just pass here to avoid duplicate failures
      return createResult(
        'psu-power',
        'pass',
        '', // Other rules (psuGpuMinimumPowerRule) will handle this
        ['psu', 'cpu', 'gpu']
      );
    }
    
    // Only estimate if GPU doesn't specify recommended PSU
    let estimatedPower = 100; // Base system power (mobo, ram, storage, fans)
    
    if (cpu?.spec.tdp) {
      estimatedPower += cpu.spec.tdp;
    } else if (cpu) {
      estimatedPower += 125; // Default estimate
    }

    if (gpu) {
      estimatedPower += 200; // Default GPU estimate (only when GPU doesn't specify)
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

    // Only check for air coolers (AIO compatibility is handled by coolerCaseWaterCoolingRule)
    if (candidate.spec.coolerType === 'aio') {
      return createResult(
        'cooler-case-clearance',
        'pass',
        '', // AIO compatibility is checked by water cooling rule
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
 * Cooler (AIO) ↔ Case Water Cooling Support
 * Checks if the case supports water cooling/AIO radiators of the cooler's size
 */
const coolerCaseWaterCoolingRule: CompatibilityRule = {
  id: 'cooler-case-watercooling',
  name: 'Cooler/Case Water Cooling',
  description: 'El gabinete debe soportar radiadores de refrigeración líquida (AIO)',
  sourceCategory: 'cooler',
  targetCategories: ['case'],
  evaluate: (candidate, build) => {
    // Only check if cooler is AIO (water cooling)
    if (candidate.spec.coolerType !== 'aio') {
      return createResult(
        'cooler-case-watercooling',
        'pass',
        '', // Not an AIO, so this rule doesn't apply
        ['cooler', 'case']
      );
    }

    const pcCase = build.get('case');
    if (!pcCase) {
      return createResult(
        'cooler-case-watercooling',
        'pass',
        'No hay gabinete seleccionado',
        ['cooler', 'case']
      );
    }

    const aioSize = candidate.spec.aioSize;
    const supportsWaterCooling = pcCase.spec.supportsWaterCooling;
    const supportedRadiatorSizes = pcCase.spec.supportedRadiatorSizes;

    // If we can't determine AIO size, warn user
    if (!aioSize) {
      return createResult(
        'cooler-case-watercooling',
        'warn',
        'No se pudo determinar el tamaño del radiador del AIO. Verificá manualmente la compatibilidad con el gabinete.',
        ['cooler', 'case']
      );
    }

    // If case explicitly supports water cooling with specific sizes
    if (supportedRadiatorSizes && supportedRadiatorSizes.length > 0) {
      // Find the maximum supported radiator size
      const maxSupportedSize = Math.max(...supportedRadiatorSizes);
      
      // Check if AIO size is less than or equal to max supported size
      // Logic: If case supports 240mm, it also supports 120mm and 140mm (smaller radiators)
      if (aioSize <= maxSupportedSize) {
        return createResult(
          'cooler-case-watercooling',
          'pass',
          `Gabinete soporta radiador de ${aioSize}mm (máximo: ${maxSupportedSize}mm)`,
          ['cooler', 'case']
        );
      }
      
      return createResult(
        'cooler-case-watercooling',
        'fail',
        `Radiador de ${aioSize}mm no compatible. Gabinete soporta hasta ${maxSupportedSize}mm`,
        ['cooler', 'case']
      );
    }

    // If case has general water cooling support but no specific sizes
    if (supportsWaterCooling) {
      return createResult(
        'cooler-case-watercooling',
        'warn',
        `Gabinete soporta water cooling, pero no se pudo verificar el tamaño del radiador (${aioSize}mm). Verificá manualmente.`,
        ['cooler', 'case']
      );
    }

    // Case doesn't mention water cooling support
    return createResult(
      'cooler-case-watercooling',
      'fail',
      `Gabinete no indica soporte para water cooling/AIO. El radiador de ${aioSize}mm podría no ser compatible.`,
      ['cooler', 'case']
    );
  },
};

/**
 * Case ↔ Cooler Water Cooling Support (reverse direction)
 */
const caseCoolerWaterCoolingRule: CompatibilityRule = {
  id: 'case-cooler-watercooling',
  name: 'Case/Cooler Water Cooling',
  description: 'El gabinete debe soportar el radiador del cooler AIO',
  sourceCategory: 'case',
  targetCategories: ['cooler'],
  evaluate: (candidate, build) => {
    const cooler = build.get('cooler');
    if (!cooler) {
      return createResult(
        'case-cooler-watercooling',
        'pass',
        'No hay cooler seleccionado',
        ['case', 'cooler']
      );
    }

    // Only check if cooler is AIO
    if (cooler.spec.coolerType !== 'aio') {
      return createResult(
        'case-cooler-watercooling',
        'pass',
        '', // Not an AIO, so this rule doesn't apply
        ['case', 'cooler']
      );
    }

    const aioSize = cooler.spec.aioSize;
    const supportsWaterCooling = candidate.spec.supportsWaterCooling;
    const supportedRadiatorSizes = candidate.spec.supportedRadiatorSizes;

    // If we can't determine AIO size, warn user
    if (!aioSize) {
      return createResult(
        'case-cooler-watercooling',
        'warn',
        'No se pudo determinar el tamaño del radiador del AIO. Verificá manualmente.',
        ['case', 'cooler']
      );
    }

    // If case explicitly supports water cooling with specific sizes
    if (supportedRadiatorSizes && supportedRadiatorSizes.length > 0) {
      // Find the maximum supported radiator size
      const maxSupportedSize = Math.max(...supportedRadiatorSizes);
      
      // Check if AIO size is less than or equal to max supported size
      // Logic: If case supports 240mm, it also supports 120mm and 140mm (smaller radiators)
      if (aioSize <= maxSupportedSize) {
        return createResult(
          'case-cooler-watercooling',
          'pass',
          `Gabinete soporta radiador de ${aioSize}mm (máximo: ${maxSupportedSize}mm)`,
          ['case', 'cooler']
        );
      }
      
      return createResult(
        'case-cooler-watercooling',
        'fail',
        `Gabinete no soporta radiador de ${aioSize}mm. Soporta hasta ${maxSupportedSize}mm`,
        ['case', 'cooler']
      );
    }

    // If case has general water cooling support but no specific sizes
    if (supportsWaterCooling) {
      return createResult(
        'case-cooler-watercooling',
        'warn',
        `Gabinete soporta water cooling, pero no se pudo verificar compatibilidad con radiador de ${aioSize}mm. Verificá manualmente.`,
        ['case', 'cooler']
      );
    }

    // Case doesn't mention water cooling support
    return createResult(
      'case-cooler-watercooling',
      'fail',
      `Gabinete no indica soporte para water cooling/AIO. El radiador de ${aioSize}mm podría no ser compatible.`,
      ['case', 'cooler']
    );
  },
};

/**
 * Storage ↔ Motherboard M.2 Slots Compatibility
 * Checks if the storage device uses M.2 and if the motherboard has M.2 slots
 */
const storageMotherboardM2Rule: CompatibilityRule = {
  id: 'storage-mobo-m2',
  name: 'Storage/Motherboard M.2',
  description: 'Los dispositivos M.2 requieren slots M.2 en la motherboard',
  sourceCategory: 'storage',
  targetCategories: ['motherboard'],
  evaluate: (candidate, build) => {
    const mobo = build.get('motherboard');
    if (!mobo) {
      return createResult(
        'storage-mobo-m2',
        'pass',
        'No hay motherboard seleccionada',
        ['storage', 'motherboard']
      );
    }

    const storageConnectionType = candidate.spec.storageConnectionType;
    
    // Only check if storage is M.2
    if (storageConnectionType !== 'M.2') {
      return createResult(
        'storage-mobo-m2',
        'pass',
        '', // Not M.2, so this rule doesn't apply
        ['storage', 'motherboard']
      );
    }

    const m2Slots = mobo.spec.m2Slots;

    if (!m2Slots || m2Slots === 0) {
      return createResult(
        'storage-mobo-m2',
        'fail',
        'La motherboard no tiene slots M.2 disponibles. Este disco M.2 no es compatible.',
        ['storage', 'motherboard']
      );
    }

    return createResult(
      'storage-mobo-m2',
      'pass',
      `Motherboard tiene ${m2Slots} slot(s) M.2`,
      ['storage', 'motherboard']
    );
  },
};

/**
 * Motherboard ↔ Storage M.2 Compatibility
 * Checks if the motherboard has M.2 slots for M.2 storage devices
 */
const motherboardStorageM2Rule: CompatibilityRule = {
  id: 'mobo-storage-m2',
  name: 'Motherboard/Storage M.2',
  description: 'La motherboard debe tener slots M.2 para dispositivos M.2',
  sourceCategory: 'motherboard',
  targetCategories: ['storage'],
  evaluate: (candidate, build) => {
    const storage = build.get('storage');
    if (!storage) {
      return createResult(
        'mobo-storage-m2',
        'pass',
        'No hay almacenamiento seleccionado',
        ['motherboard', 'storage']
      );
    }

    const storageConnectionType = storage.spec.storageConnectionType;
    
    // Only check if storage is M.2
    if (storageConnectionType !== 'M.2') {
      return createResult(
        'mobo-storage-m2',
        'pass',
        '', // Not M.2, so this rule doesn't apply
        ['motherboard', 'storage']
      );
    }

    const m2Slots = candidate.spec.m2Slots;

    if (!m2Slots || m2Slots === 0) {
      return createResult(
        'mobo-storage-m2',
        'fail',
        'La motherboard no tiene slots M.2. El almacenamiento M.2 seleccionado no es compatible.',
        ['motherboard', 'storage']
      );
    }

    return createResult(
      'mobo-storage-m2',
      'pass',
      `Motherboard soporta ${m2Slots} disco(s) M.2`,
      ['motherboard', 'storage']
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
  caseIncludedPsuGpuRule, // Validate case's included PSU against GPU
  psuGpuMinimumPowerRule,
  gpuPsuMinimumPowerRule, // Inverse rule: validate GPU against PSU
  psuPowerRule,
  coolerCpuSocketRule,
  coolerCaseClearanceRule,
  coolerCaseWaterCoolingRule, // Validate AIO cooler radiator size against case
  caseCoolerWaterCoolingRule, // Validate case water cooling support against AIO cooler
  storageMotherboardM2Rule, // Validate M.2 storage against motherboard
  motherboardStorageM2Rule, // Validate motherboard M.2 slots against storage
];

/**
 * Get rules that apply to a specific category
 */
export function getRulesForCategory(category: CategoryKey): CompatibilityRule[] {
  return COMPATIBILITY_RULES.filter(
    (rule) => rule.sourceCategory === category
  );
}


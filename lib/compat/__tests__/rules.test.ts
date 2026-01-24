/**
 * Compatibility Rules Tests
 * Tests for the core compatibility rules
 */

import { describe, it, expect } from 'vitest';
import type { Product } from '../../mallweb/normalize';
import type { ProductWithSpec, PCBuild } from '../types';
import type { CategoryKey } from '../../catalog/categories';
import { createProductWithSpec, evaluateCompatibility } from '../engine';

// Helper to create a mock product
function createMockProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-id',
    title: 'Test Product',
    brand: 'Test Brand',
    description: '',
    price: 100,
    currency: 'USD',
    stock: 10,
    imageUrl: '',
    images: [],
    categories: [],
    identifiers: { sku: 'test-id' },
    rating: { votes: 0, value: 0 },
    ...overrides,
  };
}

// Helper to create a build with specific parts
function createBuild(parts: Record<string, ProductWithSpec>): PCBuild {
  const build: PCBuild = new Map();
  for (const [key, value] of Object.entries(parts)) {
    build.set(key as CategoryKey, value);
  }
  return build;
}

describe('CPU ↔ Motherboard Socket Compatibility', () => {
  it('should PASS when CPU and motherboard have matching socket', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 5 5600X',
      description: 'Socket AM4',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS B550-F Gaming',
      description: 'Socket AM4 DDR4',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should FAIL when CPU and motherboard have different sockets', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 7 7800X3D',
      description: 'Socket AM5',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS B550-F Gaming',
      description: 'Socket AM4',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('Socket incompatible');
  });

  it('should WARN when socket cannot be determined', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'Some CPU',
      description: 'No socket info',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'Some Motherboard',
      description: 'No socket info either',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Verificá manualmente');
  });

  it('should PASS when no motherboard is selected', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 5 5600X',
      description: 'Socket AM4',
    });

    const build: PCBuild = new Map();
    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

describe('Motherboard ↔ RAM Type Compatibility', () => {
  it('should PASS when RAM type matches motherboard support', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS B650 Gaming',
      description: 'DDR5 Support, Socket AM5',
    });

    const ram = createMockProduct({
      id: 'ram-1',
      title: 'Corsair Vengeance DDR5 32GB 6000MHz',
    });

    const ramWithSpec = createProductWithSpec(ram, 'ram');
    const build = createBuild({ ram: ramWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should FAIL when RAM type does not match motherboard support', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS B650 Gaming',
      description: 'DDR5 Support Only',
    });

    const ram = createMockProduct({
      id: 'ram-1',
      title: 'Corsair Vengeance DDR4 16GB 3200MHz',
    });

    const ramWithSpec = createProductWithSpec(ram, 'ram');
    const build = createBuild({ ram: ramWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('Memoria incompatible');
  });
});

describe('RAM ↔ Motherboard Type Compatibility', () => {
  it('should PASS when RAM DDR4 is added to DDR4 motherboard', () => {
    const ram = createMockProduct({
      id: 'ram-1',
      title: 'Kingston Fury DDR4 16GB 3200MHz',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'MSI B550 Tomahawk',
      description: 'DDR4 Support, Socket AM4',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(ram, 'ram', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should FAIL when DDR5 RAM is added to DDR4 motherboard', () => {
    const ram = createMockProduct({
      id: 'ram-1',
      title: 'G.Skill Trident DDR5 32GB 6000MHz',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'MSI B550 Tomahawk',
      description: 'DDR4 Support, Socket AM4',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(ram, 'ram', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

describe('Motherboard ↔ Case Form Factor Compatibility', () => {
  it('should PASS when ATX motherboard fits in ATX case', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS ROG Strix B550-F',
      description: 'ATX Form Factor',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'NZXT H510',
      description: 'Mid Tower ATX Case, supports ATX, Micro-ATX, Mini-ITX',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should PASS when Micro-ATX motherboard fits in ATX case', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS Prime B550M-A',
      description: 'Micro-ATX Form Factor',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Corsair 4000D',
      description: 'Mid Tower, supports ATX motherboards',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    // Micro-ATX should fit in ATX case (smaller fits in bigger)
    expect(result.allowed).toBe(true);
  });

  it('should FAIL when ATX motherboard does not fit in Mini-ITX case', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS ROG Strix B550-F ATX',
      description: 'ATX Form Factor',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'NZXT H1',
      description: 'Mini-ITX Case',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('Form factor incompatible');
  });
});

describe('Case ↔ Motherboard Form Factor Compatibility', () => {
  it('should FAIL when Mini-ITX case is added to ATX motherboard build', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'NZXT H1',
      description: 'Mini-ITX Case only',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS ROG Strix B550-F',
      description: 'ATX Form Factor',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(pcCase, 'case', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

describe('Socket Detection from CPU Model', () => {
  it('should detect AM5 socket from Ryzen 7000 series', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 9 7950X',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS X670E',
      description: 'Socket AM5',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
  });

  it('should detect AM4 socket from Ryzen 5000 series', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 7 5800X',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'MSI B550 Gaming',
      description: 'Socket AM4',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
  });

  it('should detect LGA1700 from Intel 12th/13th/14th gen', () => {
    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'Intel Core i7-13700K',
    });

    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS Z690 Hero',
      description: 'Socket LGA1700',
    });

    const moboWithSpec = createProductWithSpec(mobo, 'motherboard');
    const build = createBuild({ motherboard: moboWithSpec });

    const result = evaluateCompatibility(cpu, 'cpu', build);

    expect(result.allowed).toBe(true);
  });
});

describe('Socket Detection from Chipset', () => {
  it('should infer AM5 socket from X670 chipset', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'ASUS ROG X670E-I Gaming',
    });

    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'AMD Ryzen 9 7950X',
      description: 'Socket AM5',
    });

    const cpuWithSpec = createProductWithSpec(cpu, 'cpu');
    const build = createBuild({ cpu: cpuWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(true);
  });

  it('should infer LGA1700 socket from Z790 chipset', () => {
    const mobo = createMockProduct({
      id: 'mobo-1',
      title: 'MSI MEG Z790 ACE',
    });

    const cpu = createMockProduct({
      id: 'cpu-1',
      title: 'Intel Core i9-14900K',
      description: 'Socket LGA1700',
    });

    const cpuWithSpec = createProductWithSpec(cpu, 'cpu');
    const build = createBuild({ cpu: cpuWithSpec });

    const result = evaluateCompatibility(mobo, 'motherboard', build);

    expect(result.allowed).toBe(true);
  });
});

describe('Cooler (AIO) ↔ Case Water Cooling Compatibility', () => {
  it('should PASS when AIO 240mm cooler is added to case with 240mm radiator support', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Corsair iCUE H100i RGB Elite',
      description: 'AIO Water Cooling 240mm Radiador Socket AM4 AM5 LGA1700',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'NZXT H510 Elite',
      description: 'Mid Tower ATX. Soporte para radiador 240mm y 280mm water cooling',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should FAIL when AIO 360mm cooler is added to case that only supports 240mm', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Corsair H150i Elite LCD',
      description: 'AIO Refrigeración líquida 360mm Socket AM4 AM5 LGA1700',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Cooler Master Q300L',
      description: 'Micro ATX Case. Soporte para radiador 240mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('no compatible');
  });

  it('should FAIL when AIO cooler is added to case without water cooling support', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'NZXT Kraken X53',
      description: 'AIO Liquid Cooler 240mm RGB',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Basic Budget Case',
      description: 'ATX Mid Tower, max CPU cooler height 160mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('no indica soporte para water cooling');
  });

  it('should PASS when air cooler is added (water cooling rule should not apply)', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Cooler Master Hyper 212',
      description: 'Air Tower Cooler 159mm height',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Basic Case',
      description: 'ATX, max CPU cooler 160mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    // Air cooler should not be checked by water cooling rule
    expect(result.allowed).toBe(true);
  });

  it('should WARN when AIO size cannot be determined', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Some AIO Liquid Cooler',
      description: 'AIO Water Cooling',
    });

    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Case with radiator support',
      description: 'Soporte para radiador 240mm y 360mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    expect(result.allowed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Verificá manualmente');
  });

  it('should PASS when no case is selected', () => {
    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Corsair H100i AIO 240mm',
      description: 'Water cooling 240mm',
    });

    const build: PCBuild = new Map();
    const result = evaluateCompatibility(cooler, 'cooler', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

describe('Case ↔ Cooler Water Cooling Compatibility (Reverse)', () => {
  it('should PASS when case with 360mm support is added to build with 240mm AIO', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Lian Li O11 Dynamic',
      description: 'Soporte para radiador 240mm, 280mm, 360mm water cooling',
    });

    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'NZXT Kraken X53 240mm AIO',
      description: 'Refrigeración líquida 240mm',
    });

    const coolerWithSpec = createProductWithSpec(cooler, 'cooler');
    const build = createBuild({ cooler: coolerWithSpec });

    const result = evaluateCompatibility(pcCase, 'case', build);

    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should FAIL when case only supports 240mm but AIO is 360mm', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Small Case',
      description: 'Soporte radiador 240mm',
    });

    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Arctic Liquid Freezer II 360mm',
      description: 'AIO 360mm water cooling',
    });

    const coolerWithSpec = createProductWithSpec(cooler, 'cooler');
    const build = createBuild({ cooler: coolerWithSpec });

    const result = evaluateCompatibility(pcCase, 'case', build);

    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it('should PASS when air cooler is selected (water cooling rule should not apply)', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Any Case',
      description: 'ATX Mid Tower',
    });

    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'Noctua NH-D15',
      description: 'Air cooler tower 165mm',
    });

    const coolerWithSpec = createProductWithSpec(cooler, 'cooler');
    const build = createBuild({ cooler: coolerWithSpec });

    const result = evaluateCompatibility(pcCase, 'case', build);

    expect(result.allowed).toBe(true);
  });
});

describe('Mall Web Specific Format Detection', () => {
  it('should correctly detect "Soporte Watercooling: Si de 240mm" format', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Gabinete Gaming ATX',
      description: 'Soporte Watercooling: Si de 240mm en el top',
    });

    const cooler120 = createMockProduct({
      id: 'cooler-0',
      title: 'Corsair H60 AIO 120mm',
      description: 'Water cooling 120mm',
    });

    const cooler240 = createMockProduct({
      id: 'cooler-1',
      title: 'Corsair H100i AIO 240mm',
      description: 'Water cooling 240mm',
    });

    const cooler360 = createMockProduct({
      id: 'cooler-2',
      title: 'Corsair H150i AIO 360mm',
      description: 'Water cooling 360mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');

    // Test 120mm cooler - should PASS (smaller than 240mm)
    const build120 = createBuild({ case: caseWithSpec });
    const result120 = evaluateCompatibility(cooler120, 'cooler', build120);

    expect(result120.allowed).toBe(true);
    expect(result120.failures).toHaveLength(0);

    // Test 240mm cooler - should PASS (equal to max)
    const build240 = createBuild({ case: caseWithSpec });
    const result240 = evaluateCompatibility(cooler240, 'cooler', build240);

    expect(result240.allowed).toBe(true);
    expect(result240.failures).toHaveLength(0);

    // Test 360mm cooler - should FAIL (larger than 240mm)
    const build360 = createBuild({ case: caseWithSpec });
    const result360 = evaluateCompatibility(cooler360, 'cooler', build360);

    expect(result360.allowed).toBe(false);
    expect(result360.failures.length).toBeGreaterThan(0);
    expect(result360.failures[0]).toContain('no compatible');
    expect(result360.failures[0]).toContain('hasta 240mm');
  });

  it('should FAIL when case mentions watercooling but no specific size', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Gabinete con ventanas',
      description: 'Compatible con water cooling',
    });

    const cooler = createMockProduct({
      id: 'cooler-1',
      title: 'NZXT Kraken X53 240mm',
      description: 'AIO 240mm water cooling',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');
    const build = createBuild({ case: caseWithSpec });

    const result = evaluateCompatibility(cooler, 'cooler', build);

    // Should FAIL because case mentions water cooling but no specific sizes detected
    expect(result.allowed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.failures[0]).toContain('no indica soporte');
  });

  it('should detect "Soporte de Watercooler: * Frontal: Hasta 240mm" format with asterisk', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'LNZ Y11 Mid-Tower',
      description: 'Soporte de Watercooler: * Frontal: Hasta 240mm. Trasero: 120mm. Soporte de disipador de torre: Hasta 160mm de altura.',
    });

    const cooler120 = createMockProduct({
      id: 'cooler-1',
      title: 'AIO 120mm',
      description: 'Water cooling 120mm',
    });

    const cooler240 = createMockProduct({
      id: 'cooler-2',
      title: 'AIO 240mm',
      description: 'Water cooling 240mm',
    });

    const cooler360 = createMockProduct({
      id: 'cooler-3',
      title: 'AIO 360mm',
      description: 'Water cooling 360mm',
    });

    const airCooler160 = createMockProduct({
      id: 'cooler-4',
      title: 'Air Cooler 160mm',
      description: 'Tower air cooler 160mm height',
    });

    const airCooler165 = createMockProduct({
      id: 'cooler-5',
      title: 'Air Cooler 164.8mm',
      description: 'Tower air cooler 164.8mm height',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');

    // Test AIO 120mm - should PASS (smaller than max 240mm)
    const build120 = createBuild({ case: caseWithSpec });
    const result120 = evaluateCompatibility(cooler120, 'cooler', build120);
    expect(result120.allowed).toBe(true);

    // Test AIO 240mm - should PASS (equal to max)
    const build240 = createBuild({ case: caseWithSpec });
    const result240 = evaluateCompatibility(cooler240, 'cooler', build240);
    expect(result240.allowed).toBe(true);

    // Test AIO 360mm - should FAIL (larger than max 240mm)
    const build360 = createBuild({ case: caseWithSpec });
    const result360 = evaluateCompatibility(cooler360, 'cooler', build360);
    expect(result360.allowed).toBe(false);
    expect(result360.failures[0]).toContain('hasta 240mm');

    // Test Air Cooler 160mm - should PASS (equal to max height)
    const buildAir160 = createBuild({ case: caseWithSpec });
    const resultAir160 = evaluateCompatibility(airCooler160, 'cooler', buildAir160);
    expect(resultAir160.allowed).toBe(true);

    // Test Air Cooler 164.8mm - should FAIL (exceeds max height of 160mm)
    const buildAir165 = createBuild({ case: caseWithSpec });
    const resultAir165 = evaluateCompatibility(airCooler165, 'cooler', buildAir165);
    expect(resultAir165.allowed).toBe(false);
    expect(resultAir165.failures[0]).toContain('muy alto');
  });

  it('should correctly handle multiple size formats in same text', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'NZXT H710',
      description: 'Soporte Watercooling: Si de 240mm en el top, 360mm en el frontal',
    });

    const cooler120 = createMockProduct({
      id: 'cooler-0',
      title: 'AIO 120mm',
      description: 'Water cooling 120mm',
    });

    const cooler240 = createMockProduct({
      id: 'cooler-1',
      title: 'AIO 240mm',
      description: 'Water cooling 240mm',
    });

    const cooler280 = createMockProduct({
      id: 'cooler-1b',
      title: 'AIO 280mm',
      description: 'Water cooling 280mm',
    });

    const cooler360 = createMockProduct({
      id: 'cooler-2',
      title: 'AIO 360mm',
      description: 'Water cooling 360mm',
    });

    const cooler420 = createMockProduct({
      id: 'cooler-3',
      title: 'AIO 420mm',
      description: 'Water cooling 420mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');

    // Test 120mm - should PASS (smaller than max 360mm)
    const build120 = createBuild({ case: caseWithSpec });
    const result120 = evaluateCompatibility(cooler120, 'cooler', build120);
    expect(result120.allowed).toBe(true);

    // Test 240mm - should PASS (explicitly listed)
    const build240 = createBuild({ case: caseWithSpec });
    const result240 = evaluateCompatibility(cooler240, 'cooler', build240);
    expect(result240.allowed).toBe(true);

    // Test 280mm - should PASS (smaller than max 360mm)
    const build280 = createBuild({ case: caseWithSpec });
    const result280 = evaluateCompatibility(cooler280, 'cooler', build280);
    expect(result280.allowed).toBe(true);

    // Test 360mm - should PASS (max supported)
    const build360 = createBuild({ case: caseWithSpec });
    const result360 = evaluateCompatibility(cooler360, 'cooler', build360);
    expect(result360.allowed).toBe(true);

    // Test 420mm - should FAIL (larger than max 360mm)
    const build420 = createBuild({ case: caseWithSpec });
    const result420 = evaluateCompatibility(cooler420, 'cooler', build420);
    expect(result420.allowed).toBe(false);
    expect(result420.failures[0]).toContain('hasta 360mm');
  });

  it('should support smaller radiators when case supports larger ones', () => {
    const pcCase = createMockProduct({
      id: 'case-1',
      title: 'Gabinete XL',
      description: 'Soporte Watercooling: Si de 360mm',
    });

    const cooler120 = createMockProduct({
      id: 'cooler-1',
      title: 'AIO 120mm',
      description: 'Water cooling 120mm',
    });

    const cooler140 = createMockProduct({
      id: 'cooler-2',
      title: 'AIO 140mm',
      description: 'Water cooling 140mm',
    });

    const cooler240 = createMockProduct({
      id: 'cooler-3',
      title: 'AIO 240mm',
      description: 'Water cooling 240mm',
    });

    const caseWithSpec = createProductWithSpec(pcCase, 'case');

    // All smaller radiators should be compatible
    const build120 = createBuild({ case: caseWithSpec });
    const result120 = evaluateCompatibility(cooler120, 'cooler', build120);
    expect(result120.allowed).toBe(true);

    const build140 = createBuild({ case: caseWithSpec });
    const result140 = evaluateCompatibility(cooler140, 'cooler', build140);
    expect(result140.allowed).toBe(true);

    const build240 = createBuild({ case: caseWithSpec });
    const result240 = evaluateCompatibility(cooler240, 'cooler', build240);
    expect(result240.allowed).toBe(true);
  });
});


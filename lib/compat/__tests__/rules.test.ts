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


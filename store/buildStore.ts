/**
 * Build Store
 * Zustand store for managing the PC build state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CategoryKey } from '../lib/catalog/categories';
import type { Product } from '../lib/mallweb/normalize';
import type { ProductWithSpec, PCBuild } from '../lib/compat/types';
import { createProductWithSpec, getBuildCompatibilitySummary } from '../lib/compat/engine';

// Categories that allow multiple selections
const MULTI_SELECT_CATEGORIES: CategoryKey[] = ['ram', 'storage'];

// Special ID for "use included cooler" option
export const USE_INCLUDED_COOLER_ID = '__use_included_cooler__';

// Special ID for "use included PSU" option
export const USE_INCLUDED_PSU_ID = '__use_included_psu__';

// Helper type for items with quantity (used in multi-select categories)
export interface ProductWithQuantity {
  product: ProductWithSpec;
  quantity: number;
}

// Helper type for parts that can be single or multiple
type PartValue = ProductWithSpec | ProductWithQuantity[] | null;
type PartsRecord = Record<CategoryKey, PartValue>;

interface BuildState {
  // The current build (parts selected)
  // RAM and Storage can have multiple items (arrays), others are single
  parts: PartsRecord;
  
  // Currently active category in the builder
  activeCategory: CategoryKey;
  
  // Actions
  setPart: (category: CategoryKey, product: Product) => void;
  addPart: (category: CategoryKey, product: Product) => void;
  removePart: (category: CategoryKey, productId?: string) => void;
  incrementQuantity: (category: CategoryKey, productId: string) => void;
  decrementQuantity: (category: CategoryKey, productId: string) => void;
  clearBuild: () => void;
  setActiveCategory: (category: CategoryKey) => void;
  
  // Computed helpers (accessed as functions to avoid stale closures)
  getBuild: () => PCBuild;
  getTotalPrice: () => number;
  getPartCount: () => number;

  getCompatibilitySummary: () => ReturnType<typeof getBuildCompatibilitySummary>;
}

const INITIAL_PARTS: PartsRecord = {
  cpu: null,
  motherboard: null,
  ram: [], // Array for multiple RAM sticks
  gpu: null,
  storage: [], // Array for multiple storage devices
  psu: null,
  case: null,
  cooler: null,
  monitor: null,
  mouse: null,
  headphones: null,
  keyboard: null,
  fans: null,
  peripherals: null,
};

export const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      parts: { ...INITIAL_PARTS },
      activeCategory: 'cpu',

      setPart: (category, product) => {
        const productWithSpec = createProductWithSpec(product, category);
        
        // Special handling for cases with included PSU
        if (category === 'case' && productWithSpec.spec.includesPsu) {
          const currentPsu = get().parts.psu;
          
          // If there's already a PSU selected and it's not the included one
          if (currentPsu && !Array.isArray(currentPsu) && currentPsu.product.id !== USE_INCLUDED_PSU_ID) {
            // Show alert
            if (typeof window !== 'undefined') {
              alert('Este gabinete incluye fuente de poder. La fuente seleccionada anteriormente será reemplazada por la fuente incluida.');
            }
          }
          
          // Set the case
          set((state) => ({
            parts: {
              ...state.parts,
              [category]: productWithSpec,
            },
          }));
          
          // Auto-select the included PSU with the wattage from the case
          const includedPsu = createIncludedPsuProduct(productWithSpec.spec.includedPsuWattage);
          const includedPsuWithSpec = createProductWithSpec(includedPsu, 'psu');
          // Override the wattage in the spec to ensure compatibility checks work
          includedPsuWithSpec.spec.psuWattage = productWithSpec.spec.includedPsuWattage;
          set((state) => ({
            parts: {
              ...state.parts,
              psu: includedPsuWithSpec,
            },
          }));
          
          return;
        }
        
        // Special handling for cases WITHOUT included PSU
        if (category === 'case' && !productWithSpec.spec.includesPsu) {
          const currentPsu = get().parts.psu;
          
          // If the current PSU is the "use included PSU" option, remove it
          // because the new case doesn't have an included PSU
          if (currentPsu && !Array.isArray(currentPsu) && currentPsu.product.id === USE_INCLUDED_PSU_ID) {
            // Set the case and clear the PSU
            set((state) => ({
              parts: {
                ...state.parts,
                [category]: productWithSpec,
                psu: null,
              },
            }));
            
            if (typeof window !== 'undefined') {
              alert('El nuevo gabinete no incluye fuente de poder. Debes seleccionar una fuente por separado.');
            }
            
            return;
          }
        }
        
        // Special handling for PSU: check if case has included PSU
        if (category === 'psu') {
          const currentCase = get().parts.case;
          
          // If there's a case with included PSU selected
          if (currentCase && !Array.isArray(currentCase) && currentCase.spec.includesPsu) {
            // Show alert that the case includes a PSU
            if (typeof window !== 'undefined') {
              alert('El gabinete actual incluye una fuente de poder. Si seleccionas esta fuente, se usará en lugar de la incluida.');
            }
          }
        }
        
        // Special handling for CPU: remove "use included cooler" if new CPU doesn't include one
        if (category === 'cpu') {
          const currentCooler = get().parts.cooler;
          const newCpuIncludesCooler = productWithSpec.spec.includesCooler;
          
          // If there's a cooler selected and it's the "use included cooler" option
          if (currentCooler && !Array.isArray(currentCooler) && currentCooler.product.id === USE_INCLUDED_COOLER_ID) {
            // If the new CPU doesn't include a cooler, remove the "use included cooler" option
            if (!newCpuIncludesCooler) {
              set((state) => ({
                parts: {
                  ...state.parts,
                  cpu: productWithSpec,
                  cooler: null, // Remove the included cooler option
                },
              }));
              
              if (typeof window !== 'undefined') {
                alert('El nuevo CPU no incluye cooler. Debes seleccionar un cooler por separado.');
              }
              
              return;
            }
          }
        }
        
        // Special handling for Motherboard: adjust RAM if it exceeds new slot count
        if (category === 'motherboard') {
          const newMotherboardSlots = productWithSpec.spec.memorySlots ?? 4; // Default to 4 if not specified
          const currentRam = get().parts.ram;
          
          let ramAdjusted = false;
          let adjustedRam: ProductWithQuantity[] = [];
          
          if (Array.isArray(currentRam) && currentRam.length > 0) {
            // Count total RAM sticks (considering kits)
            const totalRamSticks = currentRam.reduce((sum, item) => {
              const modulesInKit = item.product.spec.memoryModules ?? 1;
              return sum + (item.quantity * modulesInKit);
            }, 0);
            
            // If current RAM exceeds new motherboard's slots
            if (totalRamSticks > newMotherboardSlots) {
              ramAdjusted = true;
              if (typeof window !== 'undefined') {
                alert(`La nueva motherboard tiene ${newMotherboardSlots} slots de RAM, pero tienes ${totalRamSticks} módulos. Se ajustará automáticamente.`);
              }
              
              // Adjust RAM to fit within new slot count
              let slotsUsed = 0;
              
              for (const ramItem of currentRam) {
                const modulesInKit = ramItem.product.spec.memoryModules ?? 1;
                const slotsAvailable = newMotherboardSlots - slotsUsed;
                if (slotsAvailable <= 0) break;
                
                // Calculate how many kits can fit
                const maxKits = Math.floor(slotsAvailable / modulesInKit);
                const quantityToKeep = Math.min(ramItem.quantity, maxKits);
                
                if (quantityToKeep > 0) {
                  adjustedRam.push({
                    ...ramItem,
                    quantity: quantityToKeep,
                  });
                  slotsUsed += quantityToKeep * modulesInKit;
                }
              }
            } else {
              adjustedRam = currentRam;
            }
          }
          
          // Also adjust Storage if it exceeds new slot/port count
          const newM2Slots = productWithSpec.spec.m2Slots ?? 1;
          const newSataPorts = productWithSpec.spec.sataPorts ?? 4;
          const currentStorage = get().parts.storage;
          
          let storageAdjusted = false;
          let adjustedStorage: ProductWithQuantity[] = [];
          
          if (Array.isArray(currentStorage) && currentStorage.length > 0) {
            // Separate M.2 and SATA storage
            const m2Storage = currentStorage.filter(item => item.product.spec.storageConnectionType === 'M.2');
            const sataStorage = currentStorage.filter(item => item.product.spec.storageConnectionType === 'SATA');
            
            // Count totals
            const totalM2 = m2Storage.reduce((sum, item) => sum + item.quantity, 0);
            const totalSata = sataStorage.reduce((sum, item) => sum + item.quantity, 0);
            
            // Check if adjustment is needed
            const m2NeedsAdjustment = totalM2 > newM2Slots;
            const sataNeedsAdjustment = totalSata > newSataPorts;
            
            if (m2NeedsAdjustment || sataNeedsAdjustment) {
              storageAdjusted = true;
              const messages: string[] = [];
              
              if (m2NeedsAdjustment) {
                messages.push(`${newM2Slots} slot(s) M.2 (tienes ${totalM2} disco(s))`);
              }
              if (sataNeedsAdjustment) {
                messages.push(`${newSataPorts} puerto(s) SATA (tienes ${totalSata} disco(s))`);
              }
              
              if (typeof window !== 'undefined') {
                alert(`La nueva motherboard tiene ${messages.join(' y ')}. El almacenamiento se ajustará automáticamente.`);
              }
              
              // Adjust M.2 storage
              let m2SlotsUsed = 0;
              for (const storageItem of m2Storage) {
                const slotsAvailable = newM2Slots - m2SlotsUsed;
                if (slotsAvailable <= 0) break;
                
                const quantityToKeep = Math.min(storageItem.quantity, slotsAvailable);
                if (quantityToKeep > 0) {
                  adjustedStorage.push({
                    ...storageItem,
                    quantity: quantityToKeep,
                  });
                  m2SlotsUsed += quantityToKeep;
                }
              }
              
              // Adjust SATA storage
              let sataPortsUsed = 0;
              for (const storageItem of sataStorage) {
                const portsAvailable = newSataPorts - sataPortsUsed;
                if (portsAvailable <= 0) break;
                
                const quantityToKeep = Math.min(storageItem.quantity, portsAvailable);
                if (quantityToKeep > 0) {
                  adjustedStorage.push({
                    ...storageItem,
                    quantity: quantityToKeep,
                  });
                  sataPortsUsed += quantityToKeep;
                }
              }
            } else {
              adjustedStorage = currentStorage;
            }
          }
          
          // Apply changes if either RAM or Storage was adjusted
          if (ramAdjusted || storageAdjusted) {
            set((state) => ({
              parts: {
                ...state.parts,
                motherboard: productWithSpec,
                ram: ramAdjusted ? adjustedRam : state.parts.ram,
                storage: storageAdjusted ? adjustedStorage : state.parts.storage,
              },
            }));
            return;
          }
        }
        
        // For multi-select categories, replace the array with a single item with quantity 1
        if (MULTI_SELECT_CATEGORIES.includes(category)) {
          set((state) => ({
            parts: {
              ...state.parts,
              [category]: [{ product: productWithSpec, quantity: 1 }],
            },
          }));
        } else {
          set((state) => ({
            parts: {
              ...state.parts,
              [category]: productWithSpec,
            },
          }));
        }
      },

      addPart: (category, product) => {
        const productWithSpec = createProductWithSpec(product, category);
        
        if (MULTI_SELECT_CATEGORIES.includes(category)) {
          set((state) => {
            const currentParts = state.parts[category];
            const partsArray = Array.isArray(currentParts) ? currentParts : [];
            
            // Check if product already exists
            const existingIndex = partsArray.findIndex(p => p.product.product.id === product.id);
            
            if (existingIndex !== -1) {
              // Product exists, increment quantity
              const updatedParts = [...partsArray];
              updatedParts[existingIndex] = {
                ...updatedParts[existingIndex],
                quantity: updatedParts[existingIndex].quantity + 1,
              };
              
              return {
                parts: {
                  ...state.parts,
                  [category]: updatedParts,
                },
              };
            }
            
            // Product doesn't exist, add it with quantity 1
            return {
              parts: {
                ...state.parts,
                [category]: [...partsArray, { product: productWithSpec, quantity: 1 }],
              },
            };
          });
        } else {
          // For single-select categories, just set the part
          set((state) => ({
            parts: {
              ...state.parts,
              [category]: productWithSpec,
            },
          }));
        }
      },

      removePart: (category, productId) => {
        if (MULTI_SELECT_CATEGORIES.includes(category) && productId) {
          // Remove specific item from array
          set((state) => {
            const currentParts = state.parts[category];
            if (Array.isArray(currentParts)) {
              const filtered = currentParts.filter(p => p.product.product.id !== productId);
              return {
                parts: {
                  ...state.parts,
                  [category]: filtered.length > 0 ? filtered : [],
                },
              };
            }
            return state;
          });
        } else {
          // Special handling for cases with included PSU
          if (category === 'case') {
            const currentCase = get().parts.case;
            const currentPsu = get().parts.psu;
            
            // If case includes PSU and the current PSU is the included one, remove both
            if (currentCase && !Array.isArray(currentCase) && currentCase.spec.includesPsu) {
              if (currentPsu && !Array.isArray(currentPsu) && currentPsu.product.id === USE_INCLUDED_PSU_ID) {
                set((state) => ({
                  parts: {
                    ...state.parts,
                    case: null,
                    psu: null,
                  },
                }));
                return;
              }
            }
          }
          
          // Special handling for PSU removal
          if (category === 'psu') {
            const currentCase = get().parts.case;
            
            // If there's a case with included PSU, restore the included PSU instead of removing completely
            if (currentCase && !Array.isArray(currentCase) && currentCase.spec.includesPsu) {
              const includedPsu = createIncludedPsuProduct(currentCase.spec.includedPsuWattage);
              const includedPsuWithSpec = createProductWithSpec(includedPsu, 'psu');
              // Override the wattage in the spec to ensure compatibility checks work
              includedPsuWithSpec.spec.psuWattage = currentCase.spec.includedPsuWattage;
              
              set((state) => ({
                parts: {
                  ...state.parts,
                  psu: includedPsuWithSpec,
                },
              }));
              return;
            }
          }
          
          // Remove entire category
          set((state) => ({
            parts: {
              ...state.parts,
              [category]: MULTI_SELECT_CATEGORIES.includes(category) ? [] : null,
            },
          }));
        }
      },

      incrementQuantity: (category, productId) => {
        if (!MULTI_SELECT_CATEGORIES.includes(category)) return;
        
        set((state) => {
          const currentParts = state.parts[category];
          if (!Array.isArray(currentParts)) return state;
          
          const updatedParts = currentParts.map(item => 
            item.product.product.id === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
          
          return {
            parts: {
              ...state.parts,
              [category]: updatedParts,
            },
          };
        });
      },

      decrementQuantity: (category, productId) => {
        if (!MULTI_SELECT_CATEGORIES.includes(category)) return;
        
        set((state) => {
          const currentParts = state.parts[category];
          if (!Array.isArray(currentParts)) return state;
          
          const updatedParts = currentParts
            .map(item => 
              item.product.product.id === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
            .filter(item => item.quantity > 0);
          
          return {
            parts: {
              ...state.parts,
              [category]: updatedParts.length > 0 ? updatedParts : [],
            },
          };
        });
      },

      clearBuild: () => {
        set({ parts: { ...INITIAL_PARTS } });
      },

      setActiveCategory: (category) => {
        set({ activeCategory: category });
      },

      getBuild: () => {
        const { parts } = get();
        const build: PCBuild = new Map();
        
        for (const [key, value] of Object.entries(parts)) {
          const categoryKey = key as CategoryKey;
          
          if (MULTI_SELECT_CATEGORIES.includes(categoryKey)) {
            // For multi-select categories, only add if array has items
            if (Array.isArray(value) && value.length > 0) {
              // For compatibility checks, use the first item's product
              build.set(categoryKey, value[0].product);
            }
          } else if (value !== null && !Array.isArray(value)) {
            build.set(categoryKey, value);
          }
        }
        
        return build;
      },

      getTotalPrice: () => {
        const { parts } = get();
        let total = 0;
        
        for (const part of Object.values(parts)) {
          if (Array.isArray(part)) {
            // Sum all items in array, multiplied by quantity
            total += part.reduce((sum, item) => sum + (item.product.product.price * item.quantity), 0);
          } else if (part !== null) {
            total += part.product.price;
          }
        }
        
        return total;
      },




      getPartCount: () => {
        const { parts } = get();
        let count = 0;
        
        for (const [category, part] of Object.entries(parts)) {
          if (Array.isArray(part)) {
            // For RAM, count each module in kits
            if (category === 'ram') {
              count += part.reduce((sum, item) => {
                const modulesInKit = item.product.spec.memoryModules ?? 1;
                return sum + (item.quantity * modulesInKit);
              }, 0);
            } else {
              // For other categories, count total units (items * quantity)
              count += part.reduce((sum, item) => sum + item.quantity, 0);
            }
          } else if (part !== null) {
            count++;
          }
        }
        
        return count;
      },

      getCompatibilitySummary: () => {
        const build = get().getBuild();
        return getBuildCompatibilitySummary(build);
      },
    }),
    {
      name: 'pc-build-storage',
      partialize: (state) => ({
        parts: state.parts,
        activeCategory: state.activeCategory,
      }),
    }
  )
);

/**
 * Hook to get a specific part (returns single item or array)
 */
export function usePart(category: CategoryKey) {
  return useBuildStore((state) => state.parts[category]);
}

/**
 * Hook to check if a category has a part selected
 */
export function useHasPart(category: CategoryKey) {
  return useBuildStore((state) => {
    const part = state.parts[category];
    if (Array.isArray(part)) {
      return part.length > 0;
    }
    return part !== null;
  });
}

/**
 * Hook to check if a specific product is selected in a category
 */
export function useIsProductSelected(category: CategoryKey, productId: string) {
  return useBuildStore((state) => {
    const part = state.parts[category];
    if (Array.isArray(part)) {
      return part.some(p => p.product.product.id === productId);
    }
    return part?.product.id === productId;
  });
}

/**
 * Hook to get the quantity of a specific product in a category
 */
export function useProductQuantity(category: CategoryKey, productId: string): number {
  return useBuildStore((state) => {
    const part = state.parts[category];
    if (Array.isArray(part)) {
      const item = part.find(p => p.product.product.id === productId);
      return item?.quantity ?? 0;
    }
    return 0;
  });
}

/**
 * Hook to get the total quantity of items in a multi-select category
 * For RAM, accounts for kits (e.g., 2x24GB counts as 2 modules)
 */
export function useTotalQuantity(category: CategoryKey): number {
  return useBuildStore((state) => {
    const part = state.parts[category];
    if (Array.isArray(part)) {
      // For RAM, multiply by number of modules in kit
      if (category === 'ram') {
        return part.reduce((sum, item) => {
          const modulesInKit = item.product.spec.memoryModules ?? 1;
          return sum + (item.quantity * modulesInKit);
        }, 0);
      }
      // For other categories, just sum quantities
      return part.reduce((sum, item) => sum + item.quantity, 0);
    }
    return 0;
  });
}

/**
 * Hook to get the maximum RAM slots available from the selected motherboard
 */
export function useMaxRamSlots(): number {
  return useBuildStore((state) => {
    const motherboard = state.parts.motherboard;
    if (motherboard && !Array.isArray(motherboard)) {
      return motherboard.spec.memorySlots ?? 4; // Default to 4 if not specified
    }
    return 4; // Default to 4 slots if no motherboard selected
  });
}

/**
 * Hook to get the maximum M.2 slots available from the selected motherboard
 */
export function useMaxM2Slots(): number {
  return useBuildStore((state) => {
    const motherboard = state.parts.motherboard;
    if (motherboard && !Array.isArray(motherboard)) {
      return motherboard.spec.m2Slots ?? 1; // Default to 1 if not specified
    }
    return 1; // Default to 1 slot if no motherboard selected
  });
}

/**
 * Hook to get the maximum SATA ports available from the selected motherboard
 */
export function useMaxSataPorts(): number {
  return useBuildStore((state) => {
    const motherboard = state.parts.motherboard;
    if (motherboard && !Array.isArray(motherboard)) {
      return motherboard.spec.sataPorts ?? 4; // Default to 4 if not specified
    }
    return 4; // Default to 4 ports if no motherboard selected
  });
}

/**
 * Hook to get the maximum total storage slots available (M.2 + SATA) from the selected motherboard
 */
export function useMaxStorageSlots(): number {
  return useBuildStore((state) => {
    const motherboard = state.parts.motherboard;
    if (motherboard && !Array.isArray(motherboard)) {
      const m2Slots = motherboard.spec.m2Slots ?? 1;
      const sataPorts = motherboard.spec.sataPorts ?? 4;
      return m2Slots + sataPorts; // Total storage slots
    }
    return 5; // Default to 5 slots (1 M.2 + 4 SATA) if no motherboard selected
  });
}

/**
 * Hook to get the total quantity of M.2 storage devices
 */
export function useTotalM2Storage(): number {
  return useBuildStore((state) => {
    const storage = state.parts.storage;
    if (Array.isArray(storage)) {
      return storage
        .filter(item => item.product.spec.storageConnectionType === 'M.2')
        .reduce((sum, item) => sum + item.quantity, 0);
    }
    return 0;
  });
}

/**
 * Hook to get the total quantity of SATA storage devices
 */
export function useTotalSataStorage(): number {
  return useBuildStore((state) => {
    const storage = state.parts.storage;
    if (Array.isArray(storage)) {
      return storage
        .filter(item => item.product.spec.storageConnectionType === 'SATA')
        .reduce((sum, item) => sum + item.quantity, 0);
    }
    return 0;
  });
}

/**
 * Hook to check if the selected CPU includes a cooler
 */
export function useCpuIncludesCooler(): boolean {
  return useBuildStore((state) => {
    const cpu = state.parts.cpu;
    if (cpu && !Array.isArray(cpu)) {
      return cpu.spec.includesCooler ?? false;
    }
    return false;
  });
}/**
 * Hook to check if "use included cooler" option is selected
 */
export function useIsUsingIncludedCooler(): boolean {
  return useBuildStore((state) => {
    const cooler = state.parts.cooler;
    if (cooler && !Array.isArray(cooler)) {
      return cooler.product.id === USE_INCLUDED_COOLER_ID;
    }
    return false;
  });
}/**
 * Create a dummy product representing "use included cooler"
 */
export function createIncludedCoolerProduct(): Product {
  return {
    id: USE_INCLUDED_COOLER_ID,
    title: 'Usar cooler incluido con CPU',
    description: 'Utilizar el cooler que viene incluido con el procesador',
    brand: '',
    price: 0,
    currency: 'USD',
    stock: 999,
    imageUrl: 'COOLER_ICON',
    images: [],
    categories: [],
    identifiers: {
      sku: USE_INCLUDED_COOLER_ID,
    },
    rating: {
      votes: 0,
      value: 0,
    },
    attributeGroups: [],
  };
}

/**
 * Hook to check if the selected case includes a PSU
 */
export function useCaseIncludesPsu(): boolean {
  return useBuildStore((state) => {
    const caseProduct = state.parts.case;
    if (caseProduct && !Array.isArray(caseProduct)) {
      return caseProduct.spec.includesPsu ?? false;
    }
    return false;
  });
}

/**
 * Hook to check if "use included PSU" option is selected
 */
export function useIsUsingIncludedPsu(): boolean {
  return useBuildStore((state) => {
    const psu = state.parts.psu;
    if (psu && !Array.isArray(psu)) {
      return psu.product.id === USE_INCLUDED_PSU_ID;
    }
    return false;
  });
}

/**
 * Create a dummy product representing "use included PSU"
 */
export function createIncludedPsuProduct(wattage?: number): Product {
  const wattageText = wattage ? ` (${wattage}W)` : '';
  return {
    id: USE_INCLUDED_PSU_ID,
    title: `Usar fuente incluida con gabinete${wattageText}`,
    description: wattage 
      ? `Utilizar la fuente de poder de ${wattage}W que viene incluida con el gabinete`
      : 'Utilizar la fuente de poder que viene incluida con el gabinete',
    brand: '',
    price: 0,
    currency: 'USD',
    stock: 999,
    imageUrl: 'PSU_ICON',
    images: [],
    categories: [],
    identifiers: {
      sku: USE_INCLUDED_PSU_ID,
    },
    rating: {
      votes: 0,
      value: 0,
    },
    attributeGroups: [],
  };
}

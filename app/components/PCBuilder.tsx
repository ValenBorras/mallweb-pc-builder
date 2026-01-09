'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { CategorySelector } from './CategorySelector';
import { SearchBar } from './SearchBar';
import { ProductList } from './ProductList';
import { SubCategoryTabs } from './SubCategoryTabs';
import { useBuildStore, useMaxRamSlots } from '@/store/buildStore';
import { CATEGORIES, hasSubCategories, getMainCategories, isGpuRequired, type CategoryKey } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import { filterProductsByCategory } from '@/lib/catalog/filters';
import type { Product } from '@/lib/mallweb/normalize';
import type { CompatibilityResult } from '@/lib/compat/types';
import { filterByCompatibility } from '@/lib/compat/engine';

interface SearchResult {
  products: Product[];
  currentPage: number;
  totalPages: number;
}

export function PCBuilder() {
  const activeCategory = useBuildStore((state) => state.activeCategory);
  const setActiveCategory = useBuildStore((state) => state.setActiveCategory);
  const setPart = useBuildStore((state) => state.setPart);
  const addPart = useBuildStore((state) => state.addPart);
  const removePart = useBuildStore((state) => state.removePart);
  const incrementQuantity = useBuildStore((state) => state.incrementQuantity);
  const decrementQuantity = useBuildStore((state) => state.decrementQuantity);
  const parts = useBuildStore((state) => state.parts);
  const getBuild = useBuildStore((state) => state.getBuild);

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Array<{ product: Product; compatibility: CompatibilityResult }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [showIncompatible, setShowIncompatible] = useState(false);

  const selectedPart = parts[activeCategory];
  const category = CATEGORIES[activeCategory];
  const maxRamSlots = useMaxRamSlots();
  
  // Determine the parent category and if we should show sub-tabs
  const parentCategory = category.parentCategory || activeCategory;
  // Show sub-tabs if we're in the peripherals context (either peripherals itself or one of its sub-categories)
  const showSubTabs = parentCategory === 'peripherals' && hasSubCategories('peripherals');
  const effectiveCategory = category.parentCategory ? CATEGORIES[parentCategory] : category;
  
  // Get selected product IDs for the active category
  const selectedProductIds = Array.isArray(selectedPart) 
    ? selectedPart.map(p => p.product.product.id)
    : selectedPart 
      ? [selectedPart.product.id] 
      : [];

  // Create a Map of product quantities for multi-select categories
  const productQuantities = new Map<string, number>();
  if (Array.isArray(selectedPart)) {
    selectedPart.forEach(item => {
      productQuantities.set(item.product.product.id, item.quantity);
    });
  }

  // Search function
  const performSearch = useCallback(async (query: string, page: number = 1) => {
    const searchQuery = query || category.searchKeywords[0];
    
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: searchQuery,
          page,
          resultsPerPage: 50, // Fetch more since we filter by category
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error en la búsqueda');
      }

      const data = await response.json();
      setSearchResults({
        products: data.products,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
      });
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [category.searchKeywords]);

  // Filter products by category and compatibility when search results or build changes
  useEffect(() => {
    if (!searchResults) {
      setFilteredProducts([]);
      return;
    }

    // First, filter by category rules (include/exclude patterns based on product categories)
    const categoryFiltered = filterProductsByCategory(searchResults.products, activeCategory);
    
    // Then apply compatibility filtering
    const build = getBuild();
    const compatFiltered = filterByCompatibility(
      categoryFiltered,
      activeCategory,
      build,
      showIncompatible
    );
    
    // Sort by price (cheapest first)
    const sorted = compatFiltered.sort((a, b) => a.product.price - b.product.price);
    
    setFilteredProducts(sorted);
  }, [searchResults, activeCategory, parts, showIncompatible, getBuild]);

  // Load initial products when category changes
  useEffect(() => {
    performSearch('', 1);
  }, [activeCategory, performSearch]);

  const handleSearch = (query: string) => {
    performSearch(query, 1);
  };

  const handlePageChange = (page: number) => {
    performSearch('', page);
  };

  // Get next required category that doesn't have a part selected
  const getNextRequiredCategory = (): CategoryKey | null => {
    const mainCategories = getMainCategories();
    const currentIndex = mainCategories.findIndex(cat => cat.key === activeCategory);
    
    // Check categories after current one
    for (let i = currentIndex + 1; i < mainCategories.length; i++) {
      const cat = mainCategories[i];
      const part = parts[cat.key];
      const hasPart = Array.isArray(part) ? part.length > 0 : part !== null;
      
      // Check if category is required
      let isRequired = cat.required;
      if (cat.key === 'gpu') {
        const cpuPart = parts.cpu;
        const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
        isRequired = isGpuRequired(cpuHasGraphics);
      }
      
      if (isRequired && !hasPart) {
        return cat.key;
      }
    }
    
    // If no category found after current, check from beginning
    for (let i = 0; i < currentIndex; i++) {
      const cat = mainCategories[i];
      const part = parts[cat.key];
      const hasPart = Array.isArray(part) ? part.length > 0 : part !== null;
      
      let isRequired = cat.required;
      if (cat.key === 'gpu') {
        const cpuPart = parts.cpu;
        const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
        isRequired = isGpuRequired(cpuHasGraphics);
      }
      
      if (isRequired && !hasPart) {
        return cat.key;
      }
    }
    
    return null;
  };

  const handleSelectProduct = (product: Product) => {
    // For RAM, add to array and check if slots are full
    if (activeCategory === 'ram') {
      addPart(activeCategory, product);
      
      // Check if we've reached the maximum RAM slots after adding
      // We need to use a timeout to allow the state to update
      setTimeout(() => {
        const updatedRamQuantity = useBuildStore.getState().parts.ram;
        const totalRamItems = Array.isArray(updatedRamQuantity) 
          ? updatedRamQuantity.reduce((sum, item) => sum + item.quantity, 0)
          : 0;
        
        if (totalRamItems >= maxRamSlots) {
          // Auto-advance to next required category
          const nextCategory = getNextRequiredCategory();
          if (nextCategory) {
            setActiveCategory(nextCategory);
          }
        }
      }, 100);
    } 
    // For Storage, add to array and auto-advance immediately
    else if (activeCategory === 'storage') {
      addPart(activeCategory, product);
      
      // Auto-advance to next required category
      const nextCategory = getNextRequiredCategory();
      if (nextCategory) {
        setActiveCategory(nextCategory);
      }
    } 
    // For all other categories, replace and auto-advance
    else {
      setPart(activeCategory, product);
      
      // Auto-advance to next required category
      const nextCategory = getNextRequiredCategory();
      if (nextCategory) {
        setActiveCategory(nextCategory);
      }
    }
  };

  const handleRemoveProduct = (productId: string) => {
    removePart(activeCategory, productId);
  };

  const handleIncrementQuantity = (productId: string) => {
    incrementQuantity(activeCategory, productId);
  };

  const handleDecrementQuantity = (productId: string) => {
    decrementQuantity(activeCategory, productId);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/95 border-b border-gray-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Image
                src="/241_12-10-2022-02-10-45-mallweb.png"
                alt="Mall Web Logo"
                width={120}
                height={48}
                className="h-8 sm:h-12 w-auto object-contain"
                priority
              />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-white">
                  PC Builder
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-300">Powered by Mall Web</p>
              </div>
            </div>
            
            {/* Show/hide incompatible toggle */}
            <label className="hidden sm:flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIncompatible}
                onChange={(e) => setShowIncompatible(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-red-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white" />
              <span className="text-sm text-white">
                Mostrar incompatibles
              </span>
            </label>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 xl:px-24 py-4 lg:py-8">
        <div className="flex gap-6 lg:gap-12">
          {/* Left sidebar - Categories */}
          <aside className="w-72 shrink-0 hidden lg:block">
            <div className="sticky top-28">
              <CategorySelector
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0 pb-24 lg:pb-0">
            {/* Category header */}
            <div className="mb-4 sm:mb-6 hidden lg:block">
              <div className="flex items-center gap-4 mb-2">
                {(() => {
                  const IconComponent = getCategoryIcon(parentCategory);
                  return <IconComponent className="w-10 h-10 text-red-600" />;
                })()}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{effectiveCategory.name}</h2>
                  <p className="text-gray-600 mt-1">{effectiveCategory.description}</p>
                </div>
              </div>
            </div>

            {/* Sub-category tabs - Show before SearchBar */}
            {showSubTabs && (
              <div className="mb-6">
                <SubCategoryTabs
                  parentCategory="peripherals"
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </div>
            )}

            {/* Search */}
            <div className="mb-8">
              <SearchBar
                category={activeCategory}
                onSearch={handleSearch}
                isLoading={isLoading}
              />
            </div>

            {/* Products */}
            <ProductList
              products={filteredProducts}
              selectedProductIds={selectedProductIds}
              productQuantities={productQuantities}
              onSelectProduct={handleSelectProduct}
              onRemoveProduct={handleRemoveProduct}
              onIncrementQuantity={handleIncrementQuantity}
              onDecrementQuantity={handleDecrementQuantity}
              isLoading={isLoading}
              error={error}
              currentPage={currentPage}
              totalPages={searchResults?.totalPages ?? 1}
              onPageChange={handlePageChange}
              categoryKey={activeCategory}
            />
          </div>
        </div>
      </main>

      {/* Mobile category selector (floating) */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
        <MobileCategorySelector
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>
    </div>
  );
}

// Mobile category selector component
function MobileCategorySelector({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: CategoryKey;
  onCategoryChange: (category: CategoryKey) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const getTotalPrice = useBuildStore((state) => state.getTotalPrice);
  const getPartCount = useBuildStore((state) => state.getPartCount);
  const clearBuild = useBuildStore((state) => state.clearBuild);
  const parts = useBuildStore((state) => state.parts);
  const cpuPart = useBuildStore((state) => state.parts.cpu);

  const totalPrice = getTotalPrice();
  const partCount = getPartCount();
  const mainCategories = getMainCategories();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div className={`
        fixed left-6 right-6 z-50 transition-all duration-300 ease-out
        ${isOpen ? 'bottom-6' : 'bottom-6'}
      `}>
        {isOpen ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl bg-white max-h-[70vh] flex flex-col">
            {/* Header */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 border-b-2 border-red-200/50 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Componentes</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{partCount} seleccionados</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {partCount > 0 && (
                <button
                  onClick={() => {
                    clearBuild();
                    setIsOpen(false);
                  }}
                  className="w-full py-2 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Limpiar Build
                </button>
              )}
            </div>
            
            {/* Category grid */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin-gray">
              <div className="grid grid-cols-2 gap-3">
                {mainCategories.map((category) => {
                  const part = parts[category.key];
                  const isMultiSelect = category.key === 'ram' || category.key === 'storage';
                  const hasPart = isMultiSelect 
                    ? (Array.isArray(part) && part.length > 0)
                    : part !== null;
                  
                  const itemCount = isMultiSelect && Array.isArray(part) 
                    ? part.reduce((sum, item) => sum + item.quantity, 0)
                    : 0;
                  
                  let isDynamicallyRequired = category.required;
                  if (category.key === 'gpu') {
                    const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
                    isDynamicallyRequired = isGpuRequired(cpuHasGraphics);
                  }

                  let productImage: string | null = null;
                  let productTitle: string | null = null;
                  
                  if (hasPart) {
                    if (Array.isArray(part) && part.length > 0) {
                      productImage = part[0].product.product.imageUrl;
                      productTitle = part[0].product.product.title;
                    } else if (!Array.isArray(part) && part?.product) {
                      productImage = part.product.imageUrl;
                      productTitle = part.product.title;
                    }
                  }

                  const IconComponent = getCategoryIcon(category.key);
                  const isActive = activeCategory === category.key;

                  return (
                    <button
                      key={category.key}
                      onClick={() => {
                        onCategoryChange(category.key);
                        setIsOpen(false);
                      }}
                      className={`
                        aspect-square flex flex-col items-center justify-center gap-2 p-3 rounded-lg text-center transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-red-50 border-2 border-red-300 shadow-lg shadow-red-500/10' 
                          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {/* Icon/Product Image */}
                      <div className={`
                        w-20 h-20 rounded-lg flex items-center justify-center shrink-0 overflow-hidden
                        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
                      `}>
                        {productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={productImage}
                            alt={productTitle || category.shortName}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <IconComponent className="w-10 h-10" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col items-center justify-center min-w-0 w-full">
                        <span className={`font-medium text-xs ${isActive ? 'text-red-600' : 'text-gray-900'} line-clamp-3 leading-tight text-center`}>
                          {productTitle || category.shortName}
                        </span>
                        {isDynamicallyRequired && !hasPart && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-medium whitespace-nowrap mt-1">
                            Req.
                          </span>
                        )}
                        {hasPart && isMultiSelect && (
                          <p className="text-[9px] text-gray-600 mt-1 leading-tight">
                            {itemCount} items
                          </p>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className={`
                        absolute top-1.5 right-1.5 w-2 h-2 rounded-full
                        ${hasPart ? 'bg-green-500' : 'bg-gray-400'}
                      `} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100/50 border-t-2 border-red-200/50 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Total del Build
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-bold text-red-600">
                      ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-gray-600 font-medium">USD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="w-full p-5 rounded-2xl bg-red-600 shadow-lg shadow-red-500/25 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Image
                src="/241_12-10-2022-02-10-45-mallweb.png"
                alt="Mall Web Logo"
                width={60}
                height={24}
                className="h-6 w-auto object-contain"
              />
              <div className="text-left">
                <div className="text-sm font-medium text-white/90">Tu Build</div>
                <div className="text-xs text-white/70">{partCount} componente{partCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">
                ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/70">USD</div>
            </div>
          </button>
        )}
      </div>
    </>
  );
}

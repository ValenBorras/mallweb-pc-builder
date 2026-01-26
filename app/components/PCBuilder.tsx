'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { CategorySelector } from './CategorySelector';
import { SearchBar } from './SearchBar';
import { ProductList } from './ProductList';
import { SubCategoryTabs } from './SubCategoryTabs';
import { BuildSummary } from './BuildSummary';
import { useBuildStore, useMaxRamSlots, useCpuIncludesCooler, createIncludedCoolerProduct } from '@/store/buildStore';
import { CATEGORIES, hasSubCategories, getMainCategories, getSubCategories, isGpuRequired, isCoolerRequired, type CategoryKey } from '@/lib/catalog/categories';
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
  const getPartCount = useBuildStore((state) => state.getPartCount);
  const partCount = getPartCount();

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Array<{ product: Product; compatibility: CompatibilityResult }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [isMobileCategorySticky, setIsMobileCategorySticky] = useState(false);
  const [mobileSelectorHeight, setMobileSelectorHeight] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);
  const mobileSelectorRef = useRef<HTMLDivElement | null>(null);
  const mobileSelectorPlaceholderRef = useRef<HTMLDivElement | null>(null);
  const mobileSelectorTopRef = useRef<number | null>(null);

  const selectedPart = parts[activeCategory];
  const category = CATEGORIES[activeCategory];
  const maxRamSlots = useMaxRamSlots();
  const cpuIncludesCooler = useCpuIncludesCooler();
  
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
    let sorted = compatFiltered.sort((a, b) => a.product.price - b.product.price);
    
    // Special handling for cooler category: Add "use included cooler" option if CPU includes one
    if (activeCategory === 'cooler' && cpuIncludesCooler) {
      const includedCoolerProduct = createIncludedCoolerProduct();
      // Create a perfect compatibility result for the included cooler
      const includedCoolerCompatibility: CompatibilityResult = {
        productId: includedCoolerProduct.id,
        allowed: true,
        results: [],
        warnings: [],
        failures: [],
        hasUnknownChecks: false,
      };
      
      // Add the "use included cooler" option at the beginning
      sorted = [
        { product: includedCoolerProduct, compatibility: includedCoolerCompatibility },
        ...sorted
      ];
    }
    
    setFilteredProducts(sorted);
  }, [searchResults, activeCategory, parts, showIncompatible, getBuild, cpuIncludesCooler]);

  // Load initial products when category changes and reset to page 1
  useEffect(() => {
    setCurrentPage(1);
    performSearch('', 1);
  }, [activeCategory, performSearch]);

  useEffect(() => {
    const selector = mobileSelectorRef.current;
    const placeholder = mobileSelectorPlaceholderRef.current;
    if (!selector || !placeholder) return;

    const getHeaderOffset = () => headerRef.current?.offsetHeight ?? 56;

    const measure = () => {
      const headerOffset = getHeaderOffset();
      mobileSelectorTopRef.current = placeholder.getBoundingClientRect().top + window.scrollY;
      const height = selector.offsetHeight;
      setMobileSelectorHeight(height);
    };

    let rafId: number | null = null;
    const updateSticky = () => {
      if (mobileSelectorTopRef.current === null) return;
      const headerOffset = getHeaderOffset();
      const shouldStick = window.scrollY + headerOffset > mobileSelectorTopRef.current;
      setIsMobileCategorySticky(shouldStick);
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateSticky();
      });
    };

    const onResize = () => {
      measure();
      updateSticky();
    };

    measure();
    updateSticky();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);


  const handleSearch = (query: string) => {
    performSearch(query, 1);
  };

  const handlePageChange = (page: number) => {
    performSearch('', page);
  };

  // Calculate effective total pages based on filtered products
  // If we have fewer filtered products than the page size, we're on the last page
  const effectiveTotalPages = () => {
    if (!searchResults) return 1;
    
    // If we have very few filtered products (less than would fit in one page)
    // and we're on page 1, don't show pagination
    const RESULTS_PER_PAGE = 50;
    if (filteredProducts.length < RESULTS_PER_PAGE && currentPage === 1) {
      return 1;
    }
    
    // If we're on a page beyond 1 and have no products, we've gone too far
    if (filteredProducts.length === 0 && currentPage > 1) {
      return currentPage - 1;
    }
    
    // Otherwise use the API's totalPages
    return searchResults.totalPages;
  };

  // Get next category in order (regardless of whether it's required or already has a part)
  const getNextCategory = (): CategoryKey | null => {
    const currentCategory = CATEGORIES[activeCategory];
    
    // Special handling for peripherals sub-categories
    if (currentCategory.parentCategory === 'peripherals') {
      const parentCategory = CATEGORIES['peripherals'];
      const subCategories = parentCategory.subCategories || [];
      const currentSubIndex = subCategories.findIndex(key => key === activeCategory);
      
      // If there's a next sub-category, return it
      if (currentSubIndex >= 0 && currentSubIndex < subCategories.length - 1) {
        return subCategories[currentSubIndex + 1];
      }
      
      // If we're at the last sub-category, return null (don't advance)
      return null;
    }
    
    // For main categories, return the next category in the list
    const mainCategories = getMainCategories();
    const currentIndex = mainCategories.findIndex(cat => cat.key === activeCategory);
    
    // Simply return the next category in the list
    if (currentIndex >= 0 && currentIndex < mainCategories.length - 1) {
      return mainCategories[currentIndex + 1].key;
    }
    
    // If we're at the last category, return null (don't loop back)
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
          // Auto-advance to next category
          const nextCategory = getNextCategory();
          if (nextCategory) {
            setActiveCategory(nextCategory);
          }
        }
      }, 100);
    } 
    // For Storage, add to array and auto-advance immediately
    else if (activeCategory === 'storage') {
      addPart(activeCategory, product);
      
      // Auto-advance to next category
      const nextCategory = getNextCategory();
      if (nextCategory) {
        setActiveCategory(nextCategory);
      }
    } 
    // For all other categories, replace and auto-advance
    else {
      setPart(activeCategory, product);
      
      // Auto-advance to next category
      const nextCategory = getNextCategory();
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
    
    // For RAM, check if we've reached the maximum slots after incrementing
    if (activeCategory === 'ram') {
      setTimeout(() => {
        const updatedRamQuantity = useBuildStore.getState().parts.ram;
        const totalRamItems = Array.isArray(updatedRamQuantity) 
          ? updatedRamQuantity.reduce((sum, item) => sum + item.quantity, 0)
          : 0;
        
        if (totalRamItems >= maxRamSlots) {
          // Auto-advance to next category
          const nextCategory = getNextCategory();
          if (nextCategory) {
            setActiveCategory(nextCategory);
          }
        }
      }, 100);
    }
  };

  const handleDecrementQuantity = (productId: string) => {
    decrementQuantity(activeCategory, productId);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/95 border-b border-gray-800">
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
                  Arma tu PC
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

      {/* Mobile sticky category selector */}
      <div
        ref={mobileSelectorPlaceholderRef}
        className="lg:hidden w-full"
        style={{ height: isMobileCategorySticky ? mobileSelectorHeight : 0 }}
        aria-hidden="true"
      />
      <div
        ref={mobileSelectorRef}
        className={`lg:hidden w-full px-4 sm:px-6 py-4 transition-[background-color,box-shadow,backdrop-filter,transform] duration-200 ease-out will-change-transform ${
          isMobileCategorySticky
            ? 'fixed left-0 right-0 z-40 bg-gradient-to-b from-slate-100/95 via-slate-100/85 to-slate-100/70 backdrop-blur-sm shadow-sm animate-[slide-down_180ms_ease-out]'
            : 'relative z-30'
        }`}
        style={isMobileCategorySticky ? { top: 0 } : undefined}
      >
        <div className="max-w-[1600px] mx-auto">
          <button
            onClick={() => setShowCategories(true)}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all active:scale-98 shadow-md"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {(() => {
                const IconComponent = getCategoryIcon(parentCategory);
                return <IconComponent className="w-7 h-7 text-red-600 shrink-0" />;
              })()}
              <div className="text-left flex-1 min-w-0">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Categoría</div>
                <h2 className="text-base font-bold text-gray-900 truncate">{effectiveCategory.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {partCount > 0 && (
                <div className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-semibold">
                  {partCount}
                </div>
              )}
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 lg:py-8 pb-24 lg:pb-40">
        <div className="flex gap-6 lg:gap-8">
          {/* Left sidebar - Categories */}
          <aside className="w-64 xl:w-72 shrink-0 hidden lg:block">
            <div className="sticky top-28">
              <CategorySelector
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Category header - Desktop only */}
            <div className="mb-4 sm:mb-6 hidden lg:block">
              <div className="flex items-center gap-3 mb-2">
                {(() => {
                  const IconComponent = getCategoryIcon(parentCategory);
                  return <IconComponent className="w-8 h-8 lg:w-10 lg:h-10 text-red-600" />;
                })()}
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{effectiveCategory.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">{effectiveCategory.description}</p>
                </div>
              </div>
            </div>

            {/* Sub-category tabs - Show before SearchBar */}
            {showSubTabs && (
              <div className="mb-4 lg:mb-6">
                <SubCategoryTabs
                  parentCategory="peripherals"
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              </div>
            )}

            {/* Search */}
            <div className="mb-6 lg:mb-8">
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
              totalPages={effectiveTotalPages()}
              onPageChange={handlePageChange}
              categoryKey={activeCategory}
            />
          </div>
        </div>
      </main>

      {/* Bottom bar with total and checkout - ALL SCREENS */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 pointer-events-none">
          <BottomCheckoutBar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            showCategories={showCategories}
            setShowCategories={setShowCategories}
          />
        </div>
      </div>
    </div>
  );
}

// Bottom checkout bar - shows on all screens
function BottomCheckoutBar({
  activeCategory,
  onCategoryChange,
  showCategories,
  setShowCategories,
}: {
  activeCategory: CategoryKey;
  onCategoryChange: (category: CategoryKey) => void;
  showCategories: boolean;
  setShowCategories: (show: boolean) => void;
}) {
  const [showSummary, setShowSummary] = useState(false);
  const [selectedParentForSub, setSelectedParentForSub] = useState<CategoryKey | null>(null);
  const getTotalPrice = useBuildStore((state) => state.getTotalPrice);
  const getPartCount = useBuildStore((state) => state.getPartCount);
  const getCompatibilitySummary = useBuildStore((state) => state.getCompatibilitySummary);
  const clearBuild = useBuildStore((state) => state.clearBuild);
  const parts = useBuildStore((state) => state.parts);
  const cpuPart = useBuildStore((state) => state.parts.cpu);

  const totalPrice = getTotalPrice();
  const partCount = getPartCount();
  const summary = getCompatibilitySummary();
  const mainCategories = getMainCategories();

  // Check if build is complete and compatible
  const canCheckout = summary.isComplete && summary.isCompatible;

  // Reset sub-category view when modal closes
  useEffect(() => {
    if (!showCategories) {
      setSelectedParentForSub(null);
    }
  }, [showCategories]);

  return (
    <>
      {/* Overlay for categories */}
      {showCategories && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 pointer-events-auto"
          onClick={() => setShowCategories(false)}
        />
      )}

      {/* Bottom bar */}
      <div className="w-full lg:w-64 xl:w-72">
        {/* Mobile: Single compact button */}
        <div className="lg:hidden  pt-6 pb-2 pointer-events-none">
          <button
            onClick={() => setShowSummary(true)}
            disabled={partCount === 0}
            className={`
              w-full p-3 rounded-xl font-bold text-sm transition-all pointer-events-auto shadow-lg flex items-center justify-between
              ${canCheckout
                ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-gray-500/25 hover:shadow-xl hover:shadow-gray-500/30'
                : partCount > 0
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-500/25'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Image
                src="/241_12-10-2022-02-10-45-mallweb.png"
                alt="Mall Web Logo"
                width={50}
                height={20}
                className="h-4 w-auto object-contain"
              />
              <span>
                {partCount === 0 ? (
                  'Agregá componentes'
                ) : canCheckout ? (
                  'Finalizar Compra'
                ) : (
                  'Ver Build'
                )}
              </span>
            </div>
            <div className="text-right">
              <div className="text-base font-bold whitespace-nowrap">
                ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[9px] opacity-80">ARS</div>
            </div>
          </button>
        </div>

        {/* Desktop: Stacked layout - Total on top, Checkout below */}
        <div className="hidden lg:flex flex-col gap-3 pointer-events-none">
          {/* Total display (non-clickable) */}
          <div className="w-full p-4 rounded-2xl bg-gray-800 shadow-lg shadow-gray-800/25 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <Image
                src="/241_12-10-2022-02-10-45-mallweb.png"
                alt="Mall Web Logo"
                width={60}
                height={24}
                className="h-6 w-auto object-contain"
              />
              <div className="text-left">
                <div className="text-sm font-medium text-white/90">Tu Build</div>
                <div className="text-xs text-white/70">{partCount} comp{partCount !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white whitespace-nowrap">
                ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-white/70">ARS</div>
            </div>
          </div>

          {/* Checkout button (below) */}
          <button
            onClick={() => setShowSummary(true)}
            disabled={partCount === 0}
            className={`
              w-full p-4 rounded-2xl font-bold text-base transition-all pointer-events-auto
              ${canCheckout
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30'
                : partCount > 0
                  ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-lg shadow-yellow-500/25'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {partCount === 0 ? (
              'Agregá componentes'
            ) : canCheckout ? (
              <span className="flex items-center justify-center gap-2">
                🛒 Finalizar Compra
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                📋 Ver Build
              </span>
            )}
          </button>
        </div>

        {/* Categories Modal (Mobile) */}
        {showCategories && (
          <div className="fixed bottom-20 left-4 right-4 rounded-2xl overflow-hidden shadow-2xl bg-white max-h-[75vh] flex flex-col z-50 pointer-events-auto">
            {/* Header */}
            <div className="p-3 md:p-4 bg-gradient-to-br from-red-50 to-red-100/50 border-b-2 border-red-200/50 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {selectedParentForSub && (
                    <button
                      onClick={() => setSelectedParentForSub(null)}
                      className="p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-gray-900">
                      {selectedParentForSub ? CATEGORIES[selectedParentForSub].name : 'Componentes'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {selectedParentForSub ? 'Selecciona una opción' : `${partCount} seleccionado${partCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCategories(false)}
                  className="p-1.5 md:p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {partCount > 0 && !selectedParentForSub && (
                <button
                  onClick={() => {
                    clearBuild();
                    setShowCategories(false);
                  }}
                  className="w-full py-2 px-3 md:px-4 rounded-lg bg-red-600 text-white text-xs md:text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Limpiar Build
                </button>
              )}
            </div>
            
            {/* Category grid or Sub-category list */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin-gray">
              {selectedParentForSub ? (
                // Show sub-categories as a list
                <div className="space-y-2">
                  {getSubCategories(selectedParentForSub).map((subCategory) => {
                    const part = parts[subCategory.key];
                    const isMultiSelect = subCategory.key === 'ram' || subCategory.key === 'storage';
                    const hasPart = isMultiSelect 
                      ? (Array.isArray(part) && part.length > 0)
                      : part !== null;

                    const itemCount = isMultiSelect && Array.isArray(part) 
                      ? part.reduce((sum, item) => sum + item.quantity, 0)
                      : 0;

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

                    const IconComponent = getCategoryIcon(subCategory.key);
                    const isActive = activeCategory === subCategory.key;

                    return (
                      <button
                        key={subCategory.key}
                        onClick={() => {
                          onCategoryChange(subCategory.key);
                          setShowCategories(false);
                          setSelectedParentForSub(null);
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                          ${isActive 
                            ? 'bg-red-50 border-2 border-red-300' 
                            : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        {/* Icon/Product Image */}
                        <div className={`
                          w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden
                          ${isActive ? 'bg-red-100' : 'bg-gray-100'}
                        `}>
                          {productImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={productImage}
                              alt={productTitle || subCategory.shortName}
                              className="w-full h-full object-contain p-1.5"
                            />
                          ) : (
                            <IconComponent className="w-6 h-6" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium text-sm ${isActive ? 'text-red-600' : 'text-gray-900'} block truncate`}>
                            {productTitle || (subCategory.key === 'peripherals' ? 'Todos' : subCategory.shortName)}
                          </span>
                          {hasPart && isMultiSelect && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </p>
                          )}
                          {!hasPart && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              No seleccionado
                            </p>
                          )}
                        </div>

                        {/* Status indicator */}
                        <div className={`
                          w-2.5 h-2.5 rounded-full shrink-0
                          ${hasPart ? 'bg-green-500' : 'bg-gray-400'}
                        `} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Show main categories grid
                <div className="grid grid-cols-2 gap-2 md:gap-3 pb-2">
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
                  } else if (category.key === 'cooler') {
                    const cpuHasCooler = !Array.isArray(cpuPart) && cpuPart?.spec.includesCooler;
                    isDynamicallyRequired = isCoolerRequired(cpuHasCooler);
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
                        // Check if this category has sub-categories
                        if (hasSubCategories(category.key)) {
                          // Show sub-categories instead of closing
                          setSelectedParentForSub(category.key);
                        } else {
                          // No sub-categories, select and close
                          onCategoryChange(category.key);
                          setShowCategories(false);
                        }
                      }}
                      className={`
                        aspect-square flex flex-col items-center justify-center gap-1.5 md:gap-2 p-2 md:p-3 rounded-lg text-center transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-red-50 border-2 border-red-300 shadow-md shadow-red-500/10' 
                          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {/* Icon/Product Image */}
                      <div className={`
                        w-14 h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden
                        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
                      `}>
                        {productImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={productImage}
                            alt={productTitle || category.shortName}
                            className="w-full h-full object-contain p-1.5"
                          />
                        ) : (
                          <IconComponent className="w-7 h-7 md:w-8 md:h-8" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex flex-col items-center justify-center min-w-0 w-full min-h-[2.5rem]">
                        <span className={`font-medium text-[10px] md:text-xs ${isActive ? 'text-red-600' : 'text-gray-900'} line-clamp-2 leading-tight text-center px-1`}>
                          {productTitle || category.shortName}
                        </span>
                        {isDynamicallyRequired && !hasPart && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-medium whitespace-nowrap mt-0.5">
                            Req.
                          </span>
                        )}
                        {hasPart && isMultiSelect && (
                          <p className="text-[8px] md:text-[9px] text-gray-600 mt-0.5 leading-tight">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </p>
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className={`
                        absolute top-1.5 right-1.5 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full
                        ${hasPart ? 'bg-green-500' : 'bg-gray-400'}
                      `} />
                    </button>
                  );
                })}
              </div>
              )}
            </div>

            {/* Total - only show in main view */}
            {!selectedParentForSub && (
              <div className="p-3 md:p-4 bg-gradient-to-br from-red-50 to-red-100/50 border-t-2 border-red-200/50 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Total del Build
                    </span>
                    <div className="flex items-baseline gap-1 md:gap-1.5 mt-1">
                      <span className="text-xl md:text-2xl font-bold text-red-600">
                        ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-600 font-medium">ARS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Build Summary Modal */}
        {showSummary && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4 pointer-events-auto" onClick={() => setShowSummary(false)}>
            <div 
              className="w-full max-w-2xl md:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-800 flex items-center justify-between shrink-0">
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2 md:gap-3">
                  <Image
                    src="/241_12-10-2022-02-10-45-mallweb.png"
                    alt="Mall Web Logo"
                    width={60}
                    height={24}
                    className="h-5 md:h-6 w-auto object-contain"
                  />
                  <span className="hidden sm:inline">Resumen de tu Build</span>
                  <span className="sm:hidden">Tu Build</span>
                </h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="p-1.5 md:p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <BuildSummary />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

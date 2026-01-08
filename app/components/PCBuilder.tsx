'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { CategorySelector } from './CategorySelector';
import { SearchBar } from './SearchBar';
import { ProductList } from './ProductList';
import { BuildSummary } from './BuildSummary';
import { SubCategoryTabs } from './SubCategoryTabs';
import { useBuildStore } from '@/store/buildStore';
import { CATEGORIES, hasSubCategories, type CategoryKey } from '@/lib/catalog/categories';
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

  const handleSelectProduct = (product: Product) => {
    // For RAM and Storage, add to array; for others, replace
    if (activeCategory === 'ram' || activeCategory === 'storage') {
      addPart(activeCategory, product);
    } else {
      setPart(activeCategory, product);
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
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/241_12-10-2022-02-10-45-mallweb.png"
                alt="Mall Web Logo"
                width={120}
                height={48}
                className="h-12 w-auto object-contain"
                priority
              />
              <div>
                <h1 className="text-xl font-bold text-white">
                  PC Builder
                </h1>
                <p className="text-xs text-gray-300">Powered by Mall Web</p>
              </div>
            </div>
            
            {/* Show/hide incompatible toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
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
      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left sidebar - Categories */}
          <aside className="w-72 flex-shrink-0 hidden lg:block">
            <div className="sticky top-28">
              <CategorySelector
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </div>
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Mobile category selector */}
            <div className="lg:hidden mb-6">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value as CategoryKey)}
                className="w-full p-4 rounded-xl bg-white border border-gray-300 text-gray-900"
              >
                {Object.values(CATEGORIES).map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category header */}
            <div className="mb-6">
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

          {/* Right sidebar - Build summary */}
          <aside className="w-[340px] flex-shrink-0 hidden xl:block">
            <div className="sticky top-28">
              <BuildSummary />
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile build summary (floating) */}
      <div className="xl:hidden fixed bottom-6 left-6 right-6 z-50">
        <MobileBuildSummary />
      </div>
    </div>
  );
}

// Mobile build summary component
function MobileBuildSummary() {
  const [isOpen, setIsOpen] = useState(false);
  const getTotalPrice = useBuildStore((state) => state.getTotalPrice);
  const getPartCount = useBuildStore((state) => state.getPartCount);

  const totalPrice = getTotalPrice();
  const partCount = getPartCount();

  if (partCount === 0) return null;

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
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <BuildSummary />
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-4 bg-gray-200 text-gray-700 text-sm font-medium"
            >
              Cerrar
            </button>
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

'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES, getMainCategories, getSubCategories, hasSubCategories, isGpuRequired, type CategoryKey } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import { usePart, useBuildStore } from '@/store/buildStore';

interface CategorySelectorProps {
  activeCategory: CategoryKey;
  onCategoryChange: (category: CategoryKey) => void;
}

function SubCategoryItem({
  subCategoryKey,
  isActive,
  onClick,
}: {
  subCategoryKey: CategoryKey;
  isActive: boolean;
  onClick: () => void;
}) {
  const part = usePart(subCategoryKey);
  const category = CATEGORIES[subCategoryKey];
  const SubIconComponent = getCategoryIcon(subCategoryKey);
  const hasSubPart = Array.isArray(part) ? part.length > 0 : part !== null;
  const [imageError, setImageError] = useState(false);
  
  // Get product image and title if part is selected
  let productImage: string | null = null;
  let productTitle: string | null = null;
  
  if (hasSubPart) {
    if (Array.isArray(part) && part.length > 0) {
      // Multi-select: show first item
      productImage = part[0].product.product.imageUrl;
      productTitle = part[0].product.product.title;
    } else if (!Array.isArray(part) && part?.product) {
      // Single-select
      productImage = part.product.imageUrl;
      productTitle = part.product.title;
    }
  }

  // Reset image error when product changes
  useEffect(() => {
    if (productImage) {
      setImageError(false);
    }
  }, [productImage]);

  const showImage = productImage && !imageError;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-all duration-200
        ${isActive 
          ? 'bg-red-50 border border-red-300' 
          : 'bg-white border border-transparent hover:bg-gray-50 hover:border-gray-200'
        }
      `}
    >
      <div className={`
        w-7 h-7 rounded flex items-center justify-center text-sm shrink-0 overflow-hidden
        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
      `}>
        {showImage && productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImage}
            alt={productTitle || category.shortName}
            className="w-full h-full object-contain p-0.5"
            onError={() => setImageError(true)}
          />
        ) : (
          <SubIconComponent className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${isActive ? 'text-red-600' : 'text-gray-700'} truncate block`}>
          {productTitle || (subCategoryKey === 'peripherals' ? 'Todos' : category.shortName)}
        </span>
      </div>
      <div className={`
        w-2 h-2 rounded-full shrink-0
        ${hasSubPart ? 'bg-green-500' : 'bg-gray-300'}
      `} />
    </button>
  );
}

function CategoryItem({ 
  categoryKey, 
  isActive,
  onClick 
}: { 
  categoryKey: CategoryKey; 
  isActive: boolean;
  onClick: () => void;
}) {
  const part = usePart(categoryKey);
  const cpuPart = usePart('cpu');
  const category = CATEGORIES[categoryKey];
  const IconComponent = getCategoryIcon(categoryKey);
  const [imageError, setImageError] = useState(false);
  
  const isMultiSelect = categoryKey === 'ram' || categoryKey === 'storage';
  const hasPart = isMultiSelect 
    ? (Array.isArray(part) && part.length > 0)
    : part !== null;
  // For multi-select, sum up all quantities
  const itemCount = isMultiSelect && Array.isArray(part) 
    ? part.reduce((sum, item) => sum + item.quantity, 0)
    : 0;
  
  // Determine if this category is dynamically required
  let isDynamicallyRequired = category.required;
  if (categoryKey === 'gpu') {
    // GPU is required only if CPU doesn't have integrated graphics
    const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
    isDynamicallyRequired = isGpuRequired(cpuHasGraphics);
  }

  // Get product image and title if part is selected
  let productImage: string | null = null;
  let productTitle: string | null = null;
  
  if (hasPart) {
    if (Array.isArray(part) && part.length > 0) {
      // Multi-select: show first item
      productImage = part[0].product.product.imageUrl;
      productTitle = part[0].product.product.title;
    } else if (!Array.isArray(part) && part?.product) {
      // Single-select
      productImage = part.product.imageUrl;
      productTitle = part.product.title;
    }
  }

  // Reset image error when product changes
  useEffect(() => {
    if (productImage) {
      setImageError(false);
    }
  }, [productImage]);

  const showImage = productImage && !imageError;

  return (
    <button
      onClick={onClick}
      className={`
        w-full aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-lg text-center transition-all duration-200 relative
        ${isActive 
          ? 'bg-red-50 border-2 border-red-300 shadow-lg shadow-red-500/10' 
          : 'bg-white border-2 border-transparent hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      {/* Icon/Product Image */}
      <div className={`
        w-16 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden
        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
      `}>
        {showImage && productImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={productImage}
            alt={productTitle || category.shortName}
            className="w-full h-full object-contain p-1.5"
            onError={() => setImageError(true)}
          />
        ) : (
          <IconComponent className="w-8 h-8" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 w-full">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <span className={`font-medium text-xs ${isActive ? 'text-red-600' : 'text-gray-900'} line-clamp-2 leading-tight`}>
            {productTitle || category.shortName}
          </span>
          {isDynamicallyRequired && !hasPart && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium whitespace-nowrap">
              Requerido
            </span>
          )}
        </div>
        {hasPart ? (
          isMultiSelect ? (
            <p className="text-[10px] text-gray-600 mt-1 leading-tight">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          ) : (
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">
              {category.shortName}
            </p>
          )
        ) : (
          <p className="text-[10px] text-gray-500 mt-1">
            No seleccionado
          </p>
        )}
      </div>

      {/* Status indicator */}
      <div className={`
        absolute top-2 right-2 w-2.5 h-2.5 rounded-full
        ${hasPart ? 'bg-green-500' : 'bg-gray-400'}
      `} />
    </button>
  );
}

export function CategorySelector({ activeCategory, onCategoryChange }: CategorySelectorProps) {
  const mainCategories = getMainCategories();
  const showSubTabs = hasSubCategories(activeCategory);
  const subCategories = showSubTabs ? getSubCategories(activeCategory) : [];
  const getTotalPrice = useBuildStore((state) => state.getTotalPrice);
  const getPartCount = useBuildStore((state) => state.getPartCount);
  const clearBuild = useBuildStore((state) => state.clearBuild);
  const totalPrice = getTotalPrice();
  const partCount = getPartCount();

  // Determine the effective active category (if activeCategory is a sub-category, use its parent)
  const effectiveActiveCategory = CATEGORIES[activeCategory]?.parentCategory || activeCategory;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Componentes
          </h2>
          {partCount > 0 && (
            <button
              onClick={clearBuild}
              className="text-xs text-red-600 hover:text-red-700 font-semibold transition-colors"
              title="Limpiar todo"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
      
      {/* Scrollable grid area */}
      <div className="flex-1 overflow-y-auto pr-2 min-h-0 scrollbar-thin-gray">
        <div className="grid grid-cols-2 gap-3">
          {mainCategories.map((category) => (
            <div key={category.key} className="relative">
              <CategoryItem
                categoryKey={category.key}
                isActive={effectiveActiveCategory === category.key}
                onClick={() => {
                  // If clicking on a category with sub-tabs, activate the first sub-tab
                  if (hasSubCategories(category.key)) {
                    const subs = getSubCategories(category.key);
                    if (subs.length > 0) {
                      onCategoryChange(subs[0].key);
                    } else {
                      onCategoryChange(category.key);
                    }
                  } else {
                    onCategoryChange(category.key);
                  }
                }}
              />
              
              {/* Show sub-tabs if this category is active and has sub-categories */}
              {effectiveActiveCategory === category.key && showSubTabs && subCategories.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 space-y-1.5">
                  {subCategories.map((subCategory) => (
                    <SubCategoryItem
                      key={subCategory.key}
                      subCategoryKey={subCategory.key}
                      isActive={activeCategory === subCategory.key}
                      onClick={() => onCategoryChange(subCategory.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Total Price - Always visible */}
      <div className="mt-6 shrink-0">
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-5 border-2 border-red-200/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Total de tu PC
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600">
              ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-gray-600 font-medium">USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

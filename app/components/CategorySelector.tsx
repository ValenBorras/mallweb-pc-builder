'use client';

import { CATEGORIES, getMainCategories, getSubCategories, hasSubCategories, isGpuRequired, type CategoryKey } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import { usePart } from '@/store/buildStore';

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
        w-7 h-7 rounded flex items-center justify-center text-sm shrink-0
        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
      `}>
        <SubIconComponent className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-medium ${isActive ? 'text-red-600' : 'text-gray-700'}`}>
          {subCategoryKey === 'peripherals' ? 'Todos' : category.shortName}
        </span>
      </div>
      <div className={`
        w-2 h-2 rounded-full flex-shrink-0
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

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200
        ${isActive 
          ? 'bg-red-50 border border-red-300 shadow-lg shadow-red-500/10' 
          : 'bg-white border border-transparent hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      {/* Icon */}
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0
        ${isActive ? 'bg-red-100' : 'bg-gray-100'}
      `}>
        <IconComponent className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${isActive ? 'text-red-600' : 'text-gray-900'}`}>
            {category.shortName}
          </span>
          {isDynamicallyRequired && !hasPart && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
              Requerido
            </span>
          )}
        </div>
        {hasPart ? (
          isMultiSelect ? (
            <p className="text-xs text-gray-600 mt-1 leading-tight">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} seleccionado{itemCount === 1 ? '' : 's'}
            </p>
          ) : (
            <p className="text-xs text-gray-600 truncate mt-1 leading-tight">
              {!Array.isArray(part) && part?.product.title}
            </p>
          )
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            No seleccionado
          </p>
        )}
      </div>

      {/* Status indicator */}
      <div className={`
        w-2.5 h-2.5 rounded-full flex-shrink-0
        ${hasPart ? 'bg-green-500' : 'bg-gray-400'}
      `} />
    </button>
  );
}

export function CategorySelector({ activeCategory, onCategoryChange }: CategorySelectorProps) {
  const mainCategories = getMainCategories();
  const showSubTabs = hasSubCategories(activeCategory);
  const subCategories = showSubTabs ? getSubCategories(activeCategory) : [];

  // Determine the effective active category (if activeCategory is a sub-category, use its parent)
  const effectiveActiveCategory = CATEGORIES[activeCategory]?.parentCategory || activeCategory;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-1 mb-4">
        Componentes
      </h2>
      <div className="space-y-2">
        {mainCategories.map((category) => (
          <div key={category.key}>
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
              <div className="ml-4 mt-2 space-y-1.5 border-l-2 border-gray-200 pl-3">
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
  );
}

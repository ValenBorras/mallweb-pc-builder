'use client';

import { getSubCategories, hasSubCategories, CATEGORIES, type CategoryKey } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import { usePart } from '@/store/buildStore';

interface SubCategoryTabsProps {
  parentCategory: CategoryKey;
  activeCategory: CategoryKey;
  onCategoryChange: (category: CategoryKey) => void;
}

function SubCategoryTabItem({
  subCategoryKey,
  isActive,
  onClick,
}: {
  subCategoryKey: CategoryKey;
  isActive: boolean;
  onClick: () => void;
}) {
  const part = usePart(subCategoryKey);
  const hasPart = Array.isArray(part) ? part.length > 0 : part !== null;
  const IconComponent = getCategoryIcon(subCategoryKey);
  const category = CATEGORIES[subCategoryKey];
  
  // Show "Todos" for peripherals sub-category
  const displayName = subCategoryKey === 'peripherals' ? 'Todos' : category.shortName;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-t-lg md:border-b-2 border transition-all duration-200 whitespace-nowrap
        ${isActive 
          ? 'bg-red-50 md:border-red-500 border-red-300 md:border-transparent md:border-b-red-500 text-red-600 shadow-sm md:shadow-none' 
          : 'bg-white border-gray-200 md:border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300'
        }
      `}
    >
      <IconComponent className={`w-4 h-4 md:w-5 md:h-5 ${isActive ? 'text-red-600' : 'text-gray-500'}`} />
      <span className="text-xs md:text-sm font-medium">{displayName}</span>
      {/* Only show green dot for main categories, not sub-categories */}
      {hasPart && !category.parentCategory && (
        <span className={`
          w-1.5 h-1.5 md:w-2 md:h-2 rounded-full
          ${isActive ? 'bg-red-500' : 'bg-green-500'}
        `} />
      )}
    </button>
  );
}

export function SubCategoryTabs({
  parentCategory,
  activeCategory,
  onCategoryChange,
}: SubCategoryTabsProps) {
  if (!hasSubCategories(parentCategory)) return null;

  const subCategories = getSubCategories(parentCategory);

  return (
    <div className="border-b border-gray-200 -mx-1 px-1">
      <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-0 md:pb-0 scrollbar-hide">
        {subCategories.map((subCategory) => (
          <SubCategoryTabItem
            key={subCategory.key}
            subCategoryKey={subCategory.key}
            isActive={activeCategory === subCategory.key}
            onClick={() => onCategoryChange(subCategory.key)}
          />
        ))}
      </div>
    </div>
  );
}


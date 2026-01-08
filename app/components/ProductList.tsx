'use client';

import { ProductCard } from './ProductCard';
import type { Product } from '@/lib/mallweb/normalize';
import type { CompatibilityResult } from '@/lib/compat/types';
import type { CategoryKey } from '@/lib/catalog/categories';

interface ProductWithCompatibility {
  product: Product;
  compatibility: CompatibilityResult;
}

interface ProductListProps {
  products: ProductWithCompatibility[];
  selectedProductIds: string[]; // Changed to array to support multiple selections
  productQuantities: Map<string, number>; // Map of productId to quantity
  onSelectProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onIncrementQuantity: (productId: string) => void;
  onDecrementQuantity: (productId: string) => void;
  isLoading: boolean;
  error?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  categoryKey?: CategoryKey;
}

export function ProductList({
  products,
  selectedProductIds,
  productQuantities,
  onSelectProduct,
  onRemoveProduct,
  onIncrementQuantity,
  onDecrementQuantity,
  isLoading,
  error,
  currentPage,
  totalPages,
  onPageChange,
  categoryKey,
}: ProductListProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-300 bg-white p-5 animate-pulse"
          >
            <div className="aspect-square bg-gray-200 rounded-lg mb-5" />
            <div className="h-3 bg-gray-200 rounded w-1/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-5" />
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-5" />
            <div className="h-11 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">😵</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Error de búsqueda</h3>
        <p className="text-gray-600 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No hay resultados</h3>
        <p className="text-gray-600 text-sm max-w-md">
          Probá con otros términos de búsqueda o seleccioná una categoría diferente.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-600">
          {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(({ product, compatibility }) => (
          <ProductCard
            key={product.id}
            product={product}
            compatibility={compatibility}
            isSelected={selectedProductIds.includes(product.id)}
            quantity={productQuantities.get(product.id) ?? 0}
            onSelect={onSelectProduct}
            onRemove={() => onRemoveProduct(product.id)}
            onIncrement={() => onIncrementQuantity(product.id)}
            onDecrement={() => onDecrementQuantity(product.id)}
            categoryKey={categoryKey}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-10">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-3 rounded-lg bg-white border border-gray-300 text-gray-600
              hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-11 h-11 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === pageNum
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-3 rounded-lg bg-white border border-gray-300 text-gray-600
              hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

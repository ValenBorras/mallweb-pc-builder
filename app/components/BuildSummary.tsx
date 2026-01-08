'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useBuildStore, useTotalQuantity, useMaxRamSlots } from '@/store/buildStore';
import { getCategoriesArray } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import type { ProductWithQuantity } from '@/store/buildStore';

export function BuildSummary() {
  const [isClient, setIsClient] = useState(false);
  const parts = useBuildStore((state) => state.parts);
  const getTotalPrice = useBuildStore((state) => state.getTotalPrice);
  const getPartCount = useBuildStore((state) => state.getPartCount);
  const getCompatibilitySummary = useBuildStore((state) => state.getCompatibilitySummary);
  const removePart = useBuildStore((state) => state.removePart);
  const incrementQuantity = useBuildStore((state) => state.incrementQuantity);
  const decrementQuantity = useBuildStore((state) => state.decrementQuantity);
  const clearBuild = useBuildStore((state) => state.clearBuild);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const categories = getCategoriesArray();
  const totalPrice = getTotalPrice();
  const partCount = getPartCount();
  const summary = getCompatibilitySummary();

  const selectedParts = categories.filter((cat) => {
    const part = parts[cat.key];
    if (Array.isArray(part)) {
      return part.length > 0;
    }
    // For single-select, check that part exists and has a product
    return part !== null && part !== undefined && part.product !== undefined;
  });

  // Check if CPU has integrated graphics
  const cpuPart = parts.cpu;
  const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
  const gpuPart = parts.gpu;
  const hasGpu = Array.isArray(gpuPart) ? gpuPart.length > 0 : gpuPart !== null;

  // Get RAM slot limits
  const totalRamQuantity = useTotalQuantity('ram');
  const maxRamSlots = useMaxRamSlots();

  return (
    <div className="bg-white border border-gray-300 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-300 bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-3">
            <Image
              src="/241_12-10-2022-02-10-45-mallweb.png"
              alt="Mall Web Logo"
              width={60}
              height={24}
              className="h-6 w-auto object-contain"
            />
            Tu Build
          </h2>
          {isClient && partCount > 0 && (
            <button
              onClick={clearBuild}
              className="text-xs text-white hover:bg-red-700 transition-colors px-2 py-1 bg-red-600 font-semibold rounded-md"
            >
              Limpiar todo
            </button>
          )}
        </div>
        {isClient && (
          <p className="text-sm text-white mt-2">
            {partCount} componente{partCount !== 1 ? 's' : ''} seleccionado{partCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Parts list */}
      {isClient && (
        <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto">
          {selectedParts.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-4">🔧</div>
            <p className="text-gray-600 text-sm">
              Empezá eligiendo un componente
            </p>
          </div>
        ) : (
          selectedParts.map((category) => {
            const part = parts[category.key];
            const isMultiSelect = category.key === 'ram' || category.key === 'storage';
            
            // Safety check: skip if part is null or undefined
            if (!part) return null;
            
            // For multi-select with quantities, items are ProductWithQuantity[]
            // For single-select, item is ProductWithSpec
            if (isMultiSelect && Array.isArray(part)) {
              const IconComponent = getCategoryIcon(category.key);
              return (
                <div key={category.key} className="space-y-2">
                  {part.map((item: ProductWithQuantity, index: number) => (
                    <div
                      key={`${category.key}-${item.product.product.id}`}
                      className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200"
                    >
                      {/* Icon */}
                      {index === 0 && (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                      )}
                      {index > 0 && (
                        <div className="w-9 h-9 flex items-center justify-center text-base shrink-0">
                          {/* Empty space for alignment */}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        {index === 0 && (
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                            {category.shortName}
                          </div>
                        )}
                        <div className="text-xs text-gray-900 truncate leading-tight">
                          {item.product.product.title}
                        </div>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => decrementQuantity(category.key, item.product.product.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors"
                          title="Decrementar"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-xs font-medium text-gray-900 w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => incrementQuantity(category.key, item.product.product.id)}
                          disabled={
                            item.product.product.stock <= item.quantity ||
                            (category.key === 'ram' && totalRamQuantity >= maxRamSlots)
                          }
                          className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            category.key === 'ram' && totalRamQuantity >= maxRamSlots
                              ? `Máximo ${maxRamSlots} módulos`
                              : "Incrementar"
                          }
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ${(item.product.product.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => removePart(category.key, item.product.product.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                        title="Quitar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              );
            } else if (!Array.isArray(part) && part !== null && part.product) {
              // Single-select item
              const IconComponent = getCategoryIcon(category.key);
              return (
                <div
                  key={category.key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base shrink-0">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                      {category.shortName}
                    </div>
                    <div className="text-xs text-gray-900 truncate leading-tight">
                      {part.product.title}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      ${part.product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removePart(category.key)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Quitar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            }
            return null;
          })
        )}
        </div>
      )}

      {/* GPU requirement info */}
      {isClient && cpuPart && !Array.isArray(cpuPart) && (
        <div className="px-4 pb-2">
          {cpuHasGraphics && !hasGpu && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700 leading-relaxed">
              💡 Tu CPU tiene gráficos integrados. La GPU es opcional.
            </div>
          )}
          {!cpuHasGraphics && !hasGpu && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700 leading-relaxed">
              ⚠️ Tu CPU no tiene gráficos integrados. Necesitás una GPU dedicada.
            </div>
          )}
        </div>
      )}

      {/* Compatibility summary */}
      {isClient && partCount > 1 && (summary.warnings.length > 0 || summary.failures.length > 0) && (
        <div className="px-4 pb-4 space-y-2">
          {summary.failures.map((failure, i) => (
            <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              ❌ {failure}
            </div>
          ))}
          {summary.warnings.map((warning, i) => (
            <div key={i} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-700 leading-relaxed">
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {isClient && (
        <div className="p-5 border-t border-gray-300 bg-gray-50">
          <div className="flex items-center justify-between mb-5">
            <span className="text-gray-600">Total</span>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">USD</div>
            </div>
          </div>

          {/* Build status */}
          <div className={`
            p-4 rounded-xl text-center text-sm font-medium
            ${summary.isComplete && summary.isCompatible 
              ? 'bg-green-50 text-green-700 border border-green-300' 
              : !summary.isCompatible 
                ? 'bg-red-50 text-red-700 border border-red-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }
          `}>
            {summary.isComplete && summary.isCompatible ? (
              <>✓ Build completo y compatible</>
            ) : !summary.isCompatible ? (
              <>⚠️ Hay problemas de compatibilidad</>
            ) : (
              <>Faltan componentes requeridos</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

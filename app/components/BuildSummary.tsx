'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useBuildStore, useTotalQuantity, useMaxRamSlots, USE_INCLUDED_COOLER_ID } from '@/store/buildStore';
import { getCategoriesArray, getRequiredCategories, isGpuRequired, isCoolerRequired } from '@/lib/catalog/categories';
import { getCategoryIcon } from '@/lib/catalog/icons';
import type { ProductWithQuantity } from '@/store/buildStore';
import { CheckoutModal, type CheckoutFormData } from './CheckoutModal';

export function BuildSummary() {
  const [isClient, setIsClient] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  
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

  // Check if all required components are present
  const checkRequiredComponents = (): { complete: boolean; missing: string[] } => {
    const missing: string[] = [];
    const requiredCategories = getRequiredCategories();
    
    for (const category of requiredCategories) {
      const part = parts[category.key];
      const hasPart = Array.isArray(part) ? part.length > 0 : part !== null;
      
      if (!hasPart) {
        missing.push(category.shortName);
      }
    }
    
    // Check GPU requirement based on CPU
    const cpuPart = parts.cpu;
    const cpuHasGraphics = !Array.isArray(cpuPart) && cpuPart?.spec.integratedGraphics;
    if (isGpuRequired(cpuHasGraphics)) {
      const gpuPart = parts.gpu;
      const hasGpu = Array.isArray(gpuPart) ? gpuPart.length > 0 : gpuPart !== null;
      if (!hasGpu) {
        missing.push('GPU');
      }
    }
    
    // Check Cooler requirement based on CPU
    const cpuIncludesCooler = !Array.isArray(cpuPart) && cpuPart?.spec.includesCooler;
    if (isCoolerRequired(cpuIncludesCooler)) {
      const coolerPart = parts.cooler;
      const hasCooler = Array.isArray(coolerPart) ? coolerPart.length > 0 : coolerPart !== null;
      if (!hasCooler) {
        missing.push('Cooler');
      }
    }
    
    return { complete: missing.length === 0, missing };
  };

  const requiredComponentsStatus = checkRequiredComponents();
  const canCheckout = requiredComponentsStatus.complete && summary.isCompatible;

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (canCheckout) {
      setCheckoutError(null);
      setShowCheckoutModal(true);
    }
  };

  // Handle checkout with form data
  const handleCheckoutSubmit = async (formData: CheckoutFormData) => {
    setIsCheckingOut(true);
    setCheckoutError(null);
    
    try {
      // Prepare cart items
      const cartItems: Array<{ productId: string; quantity: number }> = [];
      
      // Iterate through all parts
      for (const [categoryKey, part] of Object.entries(parts)) {
        if (Array.isArray(part) && part.length > 0) {
          // Multi-select categories (RAM, Storage)
          for (const item of part) {
            cartItems.push({
              productId: item.product.product.id,
              quantity: item.quantity,
            });
          }
        } else if (part !== null && !Array.isArray(part)) {
          // Single-select categories
          // Skip the "use included cooler" virtual product
          if (part.product.id !== USE_INCLUDED_COOLER_ID) {
            cartItems.push({
              productId: part.product.id,
              quantity: 1,
            });
          }
        }
      }
      
      // Prepare customer data from form
      const customerData = {
        customerType: formData.customerType,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        isPickup: formData.isPickup,
        ...(formData.customerType === 'person' ? {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dni: formData.dni,
        } : {
          legalName: formData.legalName,
          cuit: formData.cuit,
        }),
        ...(!formData.isPickup ? {
          streetName: formData.streetName,
          streetNumber: formData.streetNumber,
          floor: formData.floor,
          department: formData.department,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
        } : {}),
      };
      
      // Call checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartItems,
          customerData,
          shippingAmount: '0.00', // Por ahora sin costo de envío
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al crear el checkout');
      }
      
      const data = await response.json();
      
      // Redirect to checkout
      if (data.checkoutLink) {
        window.location.href = data.checkoutLink;
      } else {
        throw new Error('No se recibió el link de checkout');
      }
      
    } catch (error) {
      console.error('Checkout error:', error);
      setCheckoutError(error instanceof Error ? error.message : 'Error desconocido');
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="bg-white overflow-hidden h-full flex flex-col">
      {/* Parts list */}
      {isClient && (
        <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex-1 overflow-y-auto">
          {selectedParts.length === 0 ? (
          <div className="text-center py-8 md:py-10">
            <div className="text-4xl md:text-5xl mb-3 md:mb-4">🔧</div>
            <p className="text-gray-600 text-xs md:text-sm">
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
                      className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200"
                    >
                      {/* Top row: Image + Title */}
                      <div className="flex items-start gap-2 md:gap-3 mb-2">
                        {/* Product Image */}
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {item.product.product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.product.product.imageUrl}
                              alt={item.product.product.title}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                if (target.nextElementSibling) {
                                  (target.nextElementSibling as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div className="w-full h-full flex items-center justify-center text-gray-400 hidden">
                            <IconComponent className="w-6 h-6" />
                          </div>
                        </div>

                        {/* Info - Full width */}
                        <div className="flex-1 min-w-0">
                          {index === 0 && (
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                              {category.shortName}
                            </div>
                          )}
                          <div className="text-xs font-medium text-gray-900 leading-tight">
                            {item.product.product.title}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Quantity controls + Price + Remove button */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-2">
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

                        {/* Price and Remove button */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                              ${(item.product.product.price * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
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
                      </div>
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
                  className="p-2 md:p-3 rounded-lg md:rounded-xl bg-gray-50 border border-gray-200"
                >
                  {/* Top row: Image + Title */}
                  <div className="flex items-start gap-2 md:gap-3 mb-2">
                    {/* Product Image */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {part.product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={part.product.imageUrl}
                          alt={part.product.title}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (target.nextElementSibling) {
                              (target.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className="w-full h-full flex items-center justify-center text-gray-400 hidden">
                        <IconComponent className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Info - Full width */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        {category.shortName}
                      </div>
                      <div className="text-xs font-medium text-gray-900 leading-tight">
                        {part.product.title}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: Price + Remove button */}
                  <div className="flex items-center justify-end gap-3 mt-2 pt-2 border-t border-gray-200">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        ${part.product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
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
        <div className="px-3 md:px-4 pb-2">
          {cpuHasGraphics && !hasGpu && (
            <div className="p-2 md:p-3 rounded-lg bg-blue-50 border border-blue-200 text-[10px] md:text-xs text-blue-700 leading-relaxed">
              💡 Tu CPU tiene gráficos integrados. La GPU es opcional.
            </div>
          )}
          {!cpuHasGraphics && !hasGpu && (
            <div className="p-2 md:p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-[10px] md:text-xs text-yellow-700 leading-relaxed">
              ⚠️ Tu CPU no tiene gráficos integrados. Necesitás una GPU dedicada.
            </div>
          )}
        </div>
      )}

      {/* Compatibility summary */}
      {isClient && partCount > 1 && (summary.warnings.length > 0 || summary.failures.length > 0) && (
        <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-2">
          {summary.failures.map((failure, i) => (
            <div key={i} className="p-2 md:p-3 rounded-lg bg-red-50 border border-red-200 text-[10px] md:text-xs text-red-700 leading-relaxed">
              ❌ {failure}
            </div>
          ))}
          {summary.warnings.map((warning, i) => (
            <div key={i} className="p-2 md:p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-[10px] md:text-xs text-yellow-700 leading-relaxed">
              ⚠️ {warning}
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {isClient && (
        <div className="p-3 md:p-4 lg:p-5 border-t border-gray-300 bg-gray-50 shrink-0">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <span className="text-sm md:text-base text-gray-600 font-medium">Total</span>
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                ${totalPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 md:mt-1">ARS</div>
            </div>
          </div>

          {/* Build status */}
          <div className={`
            p-3 md:p-4 rounded-lg md:rounded-xl text-center text-xs md:text-sm font-medium mb-3 md:mb-4
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

          {/* Missing components warning */}
          {!requiredComponentsStatus.complete && (
            <div className="mb-3 md:mb-4 p-2 md:p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-[10px] md:text-xs text-yellow-700 font-medium mb-1">
                Componentes faltantes:
              </p>
              <p className="text-[10px] md:text-xs text-yellow-600">
                {requiredComponentsStatus.missing.join(', ')}
              </p>
            </div>
          )}

          {/* Checkout error */}
          {checkoutError && (
            <div className="mb-3 md:mb-4 p-2 md:p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] md:text-xs text-red-700 font-medium mb-1">
                Error al procesar checkout:
              </p>
              <p className="text-[10px] md:text-xs text-red-600">
                {checkoutError}
              </p>
            </div>
          )}

          {/* Checkout button */}
          <button
            onClick={handleOpenCheckout}
            disabled={!canCheckout || partCount === 0}
            className={`
              w-full py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl font-bold text-sm md:text-base transition-all duration-200
              ${canCheckout
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transform hover:scale-[1.02]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {partCount === 0 ? (
              'Agregá componentes'
            ) : !canCheckout ? (
              'Completá tu Build'
            ) : (
              '🛒 Finalizar Compra'
            )}
          </button>

          <p className="text-[10px] md:text-xs text-gray-500 text-center mt-2 md:mt-3">
            Completá tus datos para continuar
          </p>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => !isCheckingOut && setShowCheckoutModal(false)}
        onSubmit={handleCheckoutSubmit}
        isProcessing={isCheckingOut}
        totalAmount={totalPrice}
      />
    </div>
  );
}

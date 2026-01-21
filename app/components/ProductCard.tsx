'use client';

import { useState } from 'react';
import { GrFanOption } from 'react-icons/gr';
import type { Product } from '@/lib/mallweb/normalize';
import type { CompatibilityResult } from '@/lib/compat/types';
import type { CategoryKey } from '@/lib/catalog/categories';
import { getCompatibilityBadge } from '@/lib/compat/engine';
import { isComboProduct, getComboNote } from '@/lib/catalog/filters';
import { useTotalQuantity, useMaxRamSlots, USE_INCLUDED_COOLER_ID } from '@/store/buildStore';
import { ProductModal } from './ProductModal';

interface ProductCardProps {
  product: Product;
  compatibility?: CompatibilityResult;
  isSelected?: boolean;
  quantity?: number; // For multi-select categories
  onSelect: (product: Product) => void;
  onRemove?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  categoryKey?: CategoryKey;
  isMobile?: boolean;
}

export function ProductCard({
  product,
  compatibility,
  isSelected = false,
  quantity = 0,
  onSelect,
  onRemove,
  onIncrement,
  onDecrement,
  categoryKey,
  isMobile = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const badge = compatibility ? getCompatibilityBadge(compatibility) : null;
  
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;

  // Check if this is a combo product (e.g., case + PSU)
  const isCombo = categoryKey ? isComboProduct(product, categoryKey) : false;
  const comboNote = categoryKey && isCombo ? getComboNote(categoryKey) : null;

  // Check if this category supports multiple quantities
  const isMultiSelect = categoryKey === 'ram' || categoryKey === 'storage';

  // Get RAM slot limits if this is a RAM product
  const totalRamQuantity = useTotalQuantity('ram');
  const maxRamSlots = useMaxRamSlots();
  const isRam = categoryKey === 'ram';
  const ramLimitReached = isRam && totalRamQuantity >= maxRamSlots;

  const badgeColorClasses = {
    green: 'bg-green-500/20 text-green-600 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-600 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  };

  if (isMobile) {
    // Mobile horizontal layout
    return (
      <div
        className={`
          group relative rounded-xl border transition-all duration-200 overflow-hidden
          ${isSelected 
            ? 'border-red-500 bg-red-50 shadow-lg shadow-red-500/20' 
            : 'border-gray-300 bg-white hover:border-red-400 hover:bg-red-50/50'
          }
          ${!compatibility?.allowed ? 'opacity-60' : ''}
        `}
      >
        {/* Compatibility Badge */}
        {badge && (
          <div className={`
            absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-medium
            border backdrop-blur-sm ${badgeColorClasses[badge.color]}
          `}>
            <span className="mr-1">{badge.icon}</span>
            {badge.label}
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
            -{discountPercent}%
          </div>
        )}

        <div className="p-3 flex flex-row gap-3">
          {/* Image */}
          <div 
            onClick={() => setIsModalOpen(true)}
            className="relative w-24 h-24 rounded-lg bg-gray-100 overflow-hidden cursor-pointer shrink-0"
          >
            {product.id === USE_INCLUDED_COOLER_ID ? (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <GrFanOption className="w-12 h-12" />
              </div>
            ) : !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-contain p-2"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div 
              onClick={() => setIsModalOpen(true)}
              className="cursor-pointer flex-1"
            >
              {/* Brand */}
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                {product.brand}
              </div>

              {/* Title */}
              <h3 className="text-xs font-medium text-gray-900 line-clamp-2 mb-2 leading-tight">
                {product.title}
              </h3>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-base font-bold text-black">
                  ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-gray-500 line-through">
                    ${product.originalPrice!.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                )}
                <span className="text-[10px] text-gray-500">{product.currency}</span>
              </div>

              {/* Warnings/Messages - Compact */}
              {comboNote && (
                <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-[10px] text-blue-700 leading-relaxed">{comboNote}</p>
                </div>
              )}
              
              {compatibility && compatibility.warnings.length > 0 && (
                <div className="mb-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-[10px] text-yellow-700 leading-relaxed">⚠️ {compatibility.warnings[0]}</p>
                </div>
              )}

              {compatibility && !compatibility.allowed && (
                <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-[10px] text-red-700 leading-relaxed">❌ {compatibility.failures[0]}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-2">
              {isSelected && isMultiSelect && onIncrement && onDecrement ? (
                // Multi-select with quantity controls
                <>
                  <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2">
                    <button
                      onClick={onDecrement}
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors"
                      title="Decrementar"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="text-xs font-semibold text-gray-900 min-w-[2ch] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={onIncrement}
                      disabled={product.stock <= quantity || ramLimitReached}
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={ramLimitReached ? `Máximo ${maxRamSlots} módulos (slots de la motherboard)` : "Incrementar"}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={onRemove}
                    className="px-3 py-2 rounded-lg text-xs font-medium
                      bg-gray-200 text-gray-700 hover:bg-gray-300
                      transition-colors"
                  >
                    Quitar
                  </button>
                </>
              ) : isSelected ? (
                // Single-select remove button
                <button
                  onClick={onRemove}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium
                    bg-gray-200 text-gray-700 hover:bg-gray-300
                    transition-colors"
                >
                  Quitar
                </button>
              ) : (
                // Add button
                <button
                  onClick={() => onSelect(product)}
                  disabled={product.stock === 0 || (compatibility && !compatibility.allowed) || ramLimitReached}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-medium
                    bg-red-600 text-white
                    hover:bg-red-700
                    disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed
                    transition-all"
                >
                  {product.stock === 0 ? 'Sin stock' : ramLimitReached ? 'Límite alcanzado' : 'Agregar'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Product Detail Modal */}
        <ProductModal
          product={product}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSelect={onSelect}
          onRemove={onRemove}
          isSelected={isSelected}
        />
      </div>
    );
  }

  // Desktop vertical layout
  return (
    <div
      className={`
        group relative rounded-xl border transition-all duration-200 overflow-hidden
        ${isSelected 
          ? 'border-red-500 bg-red-50 shadow-lg shadow-red-500/20' 
          : 'border-gray-300 bg-white hover:border-red-400 hover:bg-red-50/50'
        }
        ${!compatibility?.allowed ? 'opacity-60' : ''}
      `}
    >
      {/* Compatibility Badge - positioned inside card with proper margin */}
      {badge && (
        <div className={`
          absolute top-3 right-3 z-10 px-2 py-1 rounded-full text-xs font-medium
          border backdrop-blur-sm ${badgeColorClasses[badge.color]}
        `}>
          <span className="mr-1">{badge.icon}</span>
          {badge.label}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-xs font-bold bg-rose-500 text-white">
          -{discountPercent}%
        </div>
      )}

      <div className="p-4">
        {/* Clickable area to open modal */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer"
        >
          {/* Image */}
          <div className="relative aspect-square mb-4 rounded-lg bg-gray-100 overflow-hidden">
            {product.id === USE_INCLUDED_COOLER_ID ? (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <GrFanOption className="w-20 h-20" />
              </div>
            ) : !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-contain p-4 transition-transform group-hover:scale-105"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Brand */}
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            {product.brand}
          </div>

          {/* Title */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-3 min-h-[2.5rem] leading-tight">
            {product.title}
          </h3>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-lg font-bold text-black">
              ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">
                ${product.originalPrice!.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            )}
            <span className="text-xs text-gray-500">{product.currency}</span>
          </div>
        </div>

        {/* Combo note (e.g., case includes PSU) */}
        {comboNote && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700 leading-relaxed">
              {comboNote}
            </p>
          </div>
        )}

        {/* Compatibility warnings */}
        {compatibility && compatibility.warnings.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-xs text-yellow-700 leading-relaxed">
              ⚠️ {compatibility.warnings[0]}
            </p>
          </div>
        )}

        {/* Compatibility failures */}
        {compatibility && !compatibility.allowed && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700 leading-relaxed">
              ❌ {compatibility.failures[0]}
            </p>
          </div>
        )}

        {/* RAM slots info */}
        {isRam && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-700 leading-relaxed">
              📊 Slots RAM: {totalRamQuantity}/{maxRamSlots} ocupados
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {isSelected && isMultiSelect && onIncrement && onDecrement ? (
            // Multi-select with quantity controls
            <>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3">
                <button
                  onClick={onDecrement}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors"
                  title="Decrementar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm font-semibold text-gray-900 min-w-[2ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={onIncrement}
                  disabled={product.stock <= quantity || ramLimitReached}
                  className="w-7 h-7 rounded flex items-center justify-center text-gray-600 hover:text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={ramLimitReached ? `Máximo ${maxRamSlots} módulos (slots de la motherboard)` : "Incrementar"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              <button
                onClick={onRemove}
                className="px-4 py-2.5 rounded-lg text-sm font-medium
                  bg-gray-200 text-gray-700 hover:bg-gray-300
                  transition-colors"
              >
                Quitar
              </button>
            </>
          ) : isSelected ? (
            // Single-select remove button
            <button
              onClick={onRemove}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
                bg-gray-200 text-gray-700 hover:bg-gray-300
                transition-colors"
            >
              Quitar
            </button>
          ) : (
            // Add button
            <button
              onClick={() => onSelect(product)}
              disabled={product.stock === 0 || (compatibility && !compatibility.allowed) || ramLimitReached}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
                bg-red-600 text-white
                hover:bg-red-700
                disabled:bg-gray-400 disabled:text-gray-200 disabled:cursor-not-allowed
                transition-all"
              title={ramLimitReached ? `Máximo ${maxRamSlots} módulos alcanzado` : undefined}
            >
              {product.stock === 0 ? 'Sin stock' : ramLimitReached ? 'Límite alcanzado' : 'Agregar'}
            </button>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={onSelect}
        onRemove={onRemove}
        isSelected={isSelected}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/mallweb/normalize';

interface ProductModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (product: Product) => void;
  onRemove?: () => void;
  isSelected?: boolean;
}

export function ProductModal({
  product,
  isOpen,
  onClose,
  onSelect,
  onRemove,
  isSelected = false,
}: ProductModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const availableImages = product.images.length > 0 ? product.images : [product.imageUrl];
  const currentImage = availableImages[selectedImageIndex] || product.imageUrl;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">{product.brand}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            title="Cerrar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid md:grid-cols-2 gap-8 p-6">
            {/* Left column - Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-xl bg-gray-100 overflow-hidden">
                {!imageError ? (
                  <Image
                    src={currentImage}
                    alt={product.title}
                    fill
                    className="object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnail gallery */}
              {availableImages.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {availableImages.map((imgUrl, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setImageError(false);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? 'border-red-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <Image
                        src={imgUrl}
                        alt={`${product.title} - imagen ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Price and stock */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-3xl font-bold text-gray-900">
                    ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                  {hasDiscount && (
                    <span className="text-lg text-gray-500 line-through">
                      ${product.originalPrice!.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{product.currency}</span>
                </div>


                {/* Action buttons */}
                <div className="flex gap-3">
                  {isSelected ? (
                    <button
                      onClick={onRemove}
                      className="flex-1 py-3 px-6 rounded-lg text-sm font-medium
                        bg-gray-200 text-gray-700 hover:bg-gray-300
                        transition-colors"
                    >
                      Quitar de la PC
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelect?.(product)}
                      disabled={product.stock === 0}
                      className="flex-1 py-3 px-6 rounded-lg text-sm font-medium
                        bg-red-600 text-white hover:bg-red-700
                        disabled:bg-gray-400 disabled:cursor-not-allowed
                        transition-colors"
                    >
                      {product.stock === 0 ? 'Sin stock' : 'Agregar al build'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right column - Details */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {product.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">SKU:</span>
                  <span className="text-sm text-gray-700 font-mono">{product.identifiers.sku}</span>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h4>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                    {product.description}
                  </div>
                </div>
              )}

              {/* Attribute Groups */}
              {product.attributeGroups && product.attributeGroups.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Especificaciones Técnicas</h4>
                  <div className="space-y-4">
                    {product.attributeGroups.map((group, groupIndex) => (
                      <div key={groupIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-900">{group.name}</h5>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {group.attributes.map((attr, attrIndex) => (
                            <div
                              key={attrIndex}
                              className="grid grid-cols-2 gap-4 px-4 py-2 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-sm text-gray-600">{attr.name}</span>
                              <span className="text-sm text-gray-900 font-medium">{attr.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {product.categories.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Categorías</h4>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {product.dimensions && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Dimensiones</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {product.dimensions.height && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Alto</span>
                        <span className="text-sm text-gray-900 font-medium">{product.dimensions.height} cm</span>
                      </div>
                    )}
                    {product.dimensions.width && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Ancho</span>
                        <span className="text-sm text-gray-900 font-medium">{product.dimensions.width} cm</span>
                      </div>
                    )}
                    {product.dimensions.depth && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Profundidad</span>
                        <span className="text-sm text-gray-900 font-medium">{product.dimensions.depth} cm</span>
                      </div>
                    )}
                    {product.dimensions.weight && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="text-xs text-gray-500 block mb-1">Peso</span>
                        <span className="text-sm text-gray-900 font-medium">{product.dimensions.weight} g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rating */}
              {product.rating.votes > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Valoración</h4>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{product.rating.value.toFixed(1)}</span>
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm text-gray-500">({product.rating.votes} votos)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


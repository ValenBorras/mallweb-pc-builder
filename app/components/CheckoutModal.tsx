'use client';

import { useState, useEffect } from 'react';

export interface CheckoutFormData {
  customerType: 'person' | 'company';
  email: string;
  phoneNumber: string;
  isPickup: boolean;
  
  // Person fields
  firstName?: string;
  lastName?: string;
  dni?: string;
  
  // Company fields
  legalName?: string;
  cuit?: string;
  
  // Delivery address fields (only if !isPickup)
  streetName?: string;
  streetNumber?: string;
  floor?: string;
  department?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CheckoutFormData) => void;
  isProcessing: boolean;
  totalAmount: number;
}

export function CheckoutModal({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
  totalAmount,
}: CheckoutModalProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    customerType: 'person',
    email: '',
    phoneNumber: '',
    isPickup: false,
    firstName: '',
    lastName: '',
    dni: '',
    streetName: '',
    streetNumber: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrors({});
    }
  }, [isOpen]);

  const updateField = (field: keyof CheckoutFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Phone validation
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'El teléfono es requerido';
    }

    // Person validation
    if (formData.customerType === 'person') {
      if (!formData.firstName?.trim()) {
        newErrors.firstName = 'El nombre es requerido';
      }
      if (!formData.lastName?.trim()) {
        newErrors.lastName = 'El apellido es requerido';
      }
      if (!formData.dni?.trim()) {
        newErrors.dni = 'El DNI es requerido';
      } else if (!/^\d{7,8}$/.test(formData.dni)) {
        newErrors.dni = 'DNI inválido (7-8 dígitos)';
      }
    }

    // Company validation
    if (formData.customerType === 'company') {
      if (!formData.legalName?.trim()) {
        newErrors.legalName = 'La razón social es requerida';
      }
      if (!formData.cuit?.trim()) {
        newErrors.cuit = 'El CUIT es requerido';
      } else if (!/^\d{11}$/.test(formData.cuit.replace(/-/g, ''))) {
        newErrors.cuit = 'CUIT inválido (11 dígitos)';
      }
    }

    // Delivery address validation (only if not pickup)
    if (!formData.isPickup) {
      if (!formData.streetName?.trim()) {
        newErrors.streetName = 'La calle es requerida';
      }
      if (!formData.streetNumber?.trim()) {
        newErrors.streetNumber = 'La altura es requerida';
      }
      if (!formData.city?.trim()) {
        newErrors.city = 'La ciudad es requerida';
      }
      if (!formData.province?.trim()) {
        newErrors.province = 'La provincia es requerida';
      }
      if (!formData.postalCode?.trim()) {
        newErrors.postalCode = 'El código postal es requerido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-red-100/50 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Finalizar Compra</h2>
              <p className="text-sm text-gray-600 mt-1">
                Total: <span className="font-bold text-red-600">${totalAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span> USD
              </p>
            </div>
            {!isProcessing && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/50 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Cliente *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('customerType', 'person')}
                  className={`
                    p-4 rounded-xl border-2 font-medium transition-all
                    ${formData.customerType === 'person'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  👤 Particular
                </button>
                <button
                  type="button"
                  onClick={() => updateField('customerType', 'company')}
                  className={`
                    p-4 rounded-xl border-2 font-medium transition-all
                    ${formData.customerType === 'company'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  🏢 Empresa
                </button>
              </div>
            </div>

            {/* Person Fields */}
            {formData.customerType === 'person' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName || ''}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className={`
                      w-full px-4 py-3 rounded-lg border-2 transition-colors
                      ${errors.firstName 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-200 focus:border-red-500'
                      }
                      focus:outline-none
                    `}
                    placeholder="Juan"
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName || ''}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className={`
                      w-full px-4 py-3 rounded-lg border-2 transition-colors
                      ${errors.lastName 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-200 focus:border-red-500'
                      }
                      focus:outline-none
                    `}
                    placeholder="Pérez"
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    DNI *
                  </label>
                  <input
                    type="text"
                    value={formData.dni || ''}
                    onChange={(e) => updateField('dni', e.target.value.replace(/\D/g, ''))}
                    maxLength={8}
                    className={`
                      w-full px-4 py-3 rounded-lg border-2 transition-colors
                      ${errors.dni 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-200 focus:border-red-500'
                      }
                      focus:outline-none
                    `}
                    placeholder="12345678"
                  />
                  {errors.dni && (
                    <p className="text-xs text-red-600 mt-1">{errors.dni}</p>
                  )}
                </div>
              </div>
            )}

            {/* Company Fields */}
            {formData.customerType === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.legalName || ''}
                    onChange={(e) => updateField('legalName', e.target.value)}
                    className={`
                      w-full px-4 py-3 rounded-lg border-2 transition-colors
                      ${errors.legalName 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-200 focus:border-red-500'
                      }
                      focus:outline-none
                    `}
                    placeholder="Mi Empresa S.A."
                  />
                  {errors.legalName && (
                    <p className="text-xs text-red-600 mt-1">{errors.legalName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CUIT *
                  </label>
                  <input
                    type="text"
                    value={formData.cuit || ''}
                    onChange={(e) => updateField('cuit', e.target.value.replace(/\D/g, ''))}
                    maxLength={11}
                    className={`
                      w-full px-4 py-3 rounded-lg border-2 transition-colors
                      ${errors.cuit 
                        ? 'border-red-300 bg-red-50 focus:border-red-500' 
                        : 'border-gray-200 focus:border-red-500'
                      }
                      focus:outline-none
                    `}
                    placeholder="20123456789"
                  />
                  {errors.cuit && (
                    <p className="text-xs text-red-600 mt-1">{errors.cuit}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={`
                    w-full px-4 py-3 rounded-lg border-2 transition-colors
                    ${errors.email 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-200 focus:border-red-500'
                    }
                    focus:outline-none
                  `}
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  className={`
                    w-full px-4 py-3 rounded-lg border-2 transition-colors
                    ${errors.phoneNumber 
                      ? 'border-red-300 bg-red-50 focus:border-red-500' 
                      : 'border-gray-200 focus:border-red-500'
                    }
                    focus:outline-none
                  `}
                  placeholder="+54 9 11 1234-5678"
                />
                {errors.phoneNumber && (
                  <p className="text-xs text-red-600 mt-1">{errors.phoneNumber}</p>
                )}
              </div>
            </div>

            {/* Delivery Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Método de Entrega *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField('isPickup', false)}
                  className={`
                    p-4 rounded-xl border-2 font-medium transition-all
                    ${!formData.isPickup
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  🚚 Envío a Domicilio
                </button>
                <button
                  type="button"
                  onClick={() => updateField('isPickup', true)}
                  className={`
                    p-4 rounded-xl border-2 font-medium transition-all
                    ${formData.isPickup
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  🏪 Retiro en Sucursal
                </button>
              </div>
            </div>

            {/* Delivery Address (only if not pickup) */}
            {!formData.isPickup && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Dirección de Entrega
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calle *
                    </label>
                    <input
                      type="text"
                      value={formData.streetName || ''}
                      onChange={(e) => updateField('streetName', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${errors.streetName 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-gray-200 focus:border-red-500'
                        }
                        focus:outline-none
                      `}
                      placeholder="Avenida Corrientes"
                    />
                    {errors.streetName && (
                      <p className="text-xs text-red-600 mt-1">{errors.streetName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Altura *
                    </label>
                    <input
                      type="text"
                      value={formData.streetNumber || ''}
                      onChange={(e) => updateField('streetNumber', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${errors.streetNumber 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-gray-200 focus:border-red-500'
                        }
                        focus:outline-none
                      `}
                      placeholder="1234"
                    />
                    {errors.streetNumber && (
                      <p className="text-xs text-red-600 mt-1">{errors.streetNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Piso
                    </label>
                    <input
                      type="text"
                      value={formData.floor || ''}
                      onChange={(e) => updateField('floor', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Depto
                    </label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => updateField('department', e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                      placeholder="A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad *
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => updateField('city', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${errors.city 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-gray-200 focus:border-red-500'
                        }
                        focus:outline-none
                      `}
                      placeholder="Buenos Aires"
                    />
                    {errors.city && (
                      <p className="text-xs text-red-600 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provincia *
                    </label>
                    <input
                      type="text"
                      value={formData.province || ''}
                      onChange={(e) => updateField('province', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${errors.province 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-gray-200 focus:border-red-500'
                        }
                        focus:outline-none
                      `}
                      placeholder="CABA"
                    />
                    {errors.province && (
                      <p className="text-xs text-red-600 mt-1">{errors.province}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código Postal *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode || ''}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                      className={`
                        w-full px-4 py-3 rounded-lg border-2 transition-colors
                        ${errors.postalCode 
                          ? 'border-red-300 bg-red-50 focus:border-red-500' 
                          : 'border-gray-200 focus:border-red-500'
                        }
                        focus:outline-none
                      `}
                      placeholder="1000"
                    />
                    {errors.postalCode && (
                      <p className="text-xs text-red-600 mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {formData.isPickup && (
              <div className="p-4 bg-green-50 rounded-xl border-2 border-green-200">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-900">Retiro en Sucursal</p>
                    <p className="text-sm text-green-700 mt-1">
                      Recibirás un email con la dirección de la sucursal y los horarios de retiro una vez confirmada la compra.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-6 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className={`
                  px-8 py-3 rounded-lg font-bold text-white transition-all
                  ${isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30'
                  }
                `}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  '🛒 Confirmar Compra'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

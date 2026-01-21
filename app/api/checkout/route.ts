import { NextRequest, NextResponse } from 'next/server';
import { getMallwebApi } from '@/lib/mallweb/client';
import type { CartItem } from '@/app/api/models/CartItem';

export const runtime = 'nodejs';

interface CheckoutRequestBody {
  cartItems: Array<{
    productId: string;
    quantity: number;
  }>;
  customerData: {
    customerType: string;
    email: string;
    phoneNumber: string;
    isPickup: boolean;
    firstName?: string;
    lastName?: string;
    dni?: string;
    legalName?: string;
    cuit?: string;
    streetName?: string;
    streetNumber?: string;
    floor?: string;
    department?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  shippingAmount: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequestBody = await request.json();
    
    // Validate required fields
    if (!body.cartItems || body.cartItems.length === 0) {
      return NextResponse.json(
        { error: 'El carrito no puede estar vacío' },
        { status: 400 }
      );
    }
    
    if (!body.customerData) {
      return NextResponse.json(
        { error: 'Faltan datos del cliente' },
        { status: 400 }
      );
    }
    
    // Validate customer data required fields
    const { customerType, email, phoneNumber, isPickup } = body.customerData;
    if (!customerType || !email || !phoneNumber || isPickup === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos en los datos del cliente' },
        { status: 400 }
      );
    }
    
    // Get API client
    const api = getMallwebApi();
    
    // Prepare cart items for API
    const cartItems: CartItem[] = body.cartItems.map(item => ({
      sourceId: item.productId,
      quantity: item.quantity,
    }));
    
    // Call create_checkout API
    const response = await api.ecommercemcpOrderCreateCheckout({
      request: {
        cartItems,
        customerData: {
          customerType: body.customerData.customerType,
          email: body.customerData.email,
          phoneNumber: body.customerData.phoneNumber,
          isPickup: body.customerData.isPickup,
          firstName: body.customerData.firstName,
          lastName: body.customerData.lastName,
          dni: body.customerData.dni,
          legalName: body.customerData.legalName,
          cuit: body.customerData.cuit,
          streetName: body.customerData.streetName,
          streetNumber: body.customerData.streetNumber,
          floor: body.customerData.floor,
          department: body.customerData.department,
          city: body.customerData.city,
          province: body.customerData.province,
          postalCode: body.customerData.postalCode,
        },
        shippingAmount: body.shippingAmount,
      },
    });
    
    return NextResponse.json({
      checkoutLink: response.checkoutLink,
    });
    
  } catch (error: unknown) {
    console.error('Error creating checkout:', error);
    
    // Handle API errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: Response };
      
      if (apiError.response) {
        const status = apiError.response.status;
        
        if (status === 400) {
          return NextResponse.json(
            { error: 'Parámetros inválidos en la solicitud de checkout' },
            { status: 400 }
          );
        }
        
        if (status === 401) {
          return NextResponse.json(
            { error: 'Error de autenticación con la API de Mallweb' },
            { status: 401 }
          );
        }
      }
    }
    
    return NextResponse.json(
      { error: 'Error al crear el checkout. Por favor, intenta nuevamente.' },
      { status: 500 }
    );
  }
}

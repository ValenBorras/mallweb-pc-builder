# Arma tu PC - Mall Web

Un clon de "Armá tu PC" de CompraGamer, usando el catálogo de productos de Mall Web (Gestión Resellers) con verificación de compatibilidad de componentes.

![Arma tu PC](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?logo=tailwindcss)

## Características

- 🔍 **Búsqueda de productos** - Acceso al catálogo completo de Mall Web
- ✅ **Verificación de compatibilidad** - Reglas automáticas para validar compatibilidad entre componentes
- 💾 **Persistencia local** - Tu build se guarda automáticamente en el navegador
- 📱 **Diseño responsive** - Funciona en desktop y mobile
- ⚡ **Rendimiento optimizado** - Server Components, caching, y lazy loading

## Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript (strict mode)
- **Estilos**: TailwindCSS 4
- **Estado**: Zustand
- **Testing**: Vitest

## Estructura del Proyecto

```
├── app/
│   ├── api/search/          # Proxy seguro a la API de Mall Web
│   ├── components/          # Componentes de UI reutilizables
│   ├── pc-builder/          # Página principal del armador
│   └── page.tsx             # Landing page
├── lib/
│   ├── mallweb/             # Cliente API, tipos, normalización
│   ├── catalog/             # Categorías y helpers de búsqueda
│   └── compat/              # Motor de compatibilidad
└── store/
    └── buildStore.ts        # Estado global del build (Zustand)
```

## Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Editá el archivo y agregá tu API key:

```env
MALLWEB_API_KEY=tu_api_key_aqui
```

> ⚠️ **Importante**: Nunca commitees tu API key. El archivo `.env.local` ya está en `.gitignore`.

### Instalación

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build de producción
npm run build
npm start

# Tests
npm test
```

## Motor de Compatibilidad

El motor de compatibilidad verifica automáticamente la compatibilidad entre componentes basándose en specs extraídas del título y descripción de los productos.

### Reglas Implementadas

| Regla | Descripción |
|-------|-------------|
| CPU ↔ Motherboard | Socket debe coincidir (AM4, AM5, LGA1700, etc.) |
| Motherboard ↔ RAM | Tipo de memoria debe coincidir (DDR4, DDR5) |
| Motherboard ↔ Case | Form factor debe ser compatible (ATX, Micro-ATX, Mini-ITX) |
| GPU ↔ Case | Largo de GPU debe entrar en el gabinete |
| PSU ↔ Build | Wattage debe ser suficiente para el build |
| Cooler ↔ CPU | Socket del cooler debe soportar el CPU |
| Cooler ↔ Case | Altura del cooler debe entrar en el gabinete |

### Estados de Compatibilidad

- ✅ **PASS**: Componentes compatibles
- ⚠️ **WARN**: No se pudo verificar, requiere verificación manual
- ❌ **FAIL**: Componentes incompatibles

### Extender Reglas

Para agregar nuevas reglas de compatibilidad, editá `lib/compat/rules.ts`:

```typescript
const myNewRule: CompatibilityRule = {
  id: 'my-new-rule',
  name: 'My New Rule',
  description: 'Descripción de la regla',
  sourceCategory: 'cpu',
  targetCategories: ['motherboard'],
  evaluate: (candidate, build) => {
    // Tu lógica aquí
    return {
      ruleId: 'my-new-rule',
      status: 'pass', // 'pass' | 'fail' | 'warn' | 'unknown'
      reason: 'Explicación',
      affectedCategories: ['cpu', 'motherboard'],
    };
  },
};

// Agregá la regla al array de reglas
export const COMPATIBILITY_RULES: CompatibilityRule[] = [
  // ... otras reglas
  myNewRule,
];
```

### Extender Extracción de Specs

Para mejorar la extracción de specs de productos, editá `lib/compat/specs.ts`:

```typescript
// Agregar nuevos patrones para detectar sockets
const SOCKET_PATTERNS: Record<string, RegExp[]> = {
  'AM4': [/\bAM4\b/i],
  'AM5': [/\bAM5\b/i],
  // Agregá más patrones aquí
};
```

## API Reference

### POST /api/search

Busca productos en el catálogo de Mall Web.

**Request:**
```json
{
  "keywords": "ryzen 5600",
  "page": 1,
  "resultsPerPage": 20
}
```

**Response:**
```json
{
  "products": [...],
  "currentPage": 1,
  "totalPages": 5,
  "keywords": "ryzen 5600"
}
```

## Modelo de Datos

### Product (Normalizado)

```typescript
interface Product {
  id: string;           // source_id del API
  title: string;
  brand: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  stock: number;
  imageUrl: string;
  images: string[];
  categories: Array<{ id: string; name: string }>;
  identifiers: {
    sku: string;
    upc?: string;
    ean?: string;
    mpn?: string;
  };
  dimensions?: {
    height: number;
    width: number;
    depth: number;
    weight: number;
  };
  rating: {
    votes: number;
    value: number;
  };
}
```

### ProductSpec (Extraído)

```typescript
interface ProductSpec {
  // CPU
  socket?: string;
  cores?: number;
  tdp?: number;
  cpuGeneration?: string;
  
  // Motherboard
  chipset?: string;
  formFactor?: string;
  supportedMemoryTypes?: string[];
  
  // RAM
  memoryType?: string;
  memorySpeed?: number;
  memoryCapacity?: number;
  
  // GPU
  gpuLength?: number;
  gpuRecommendedPsu?: number;
  
  // Case
  supportedFormFactors?: string[];
  maxGpuLength?: number;
  maxCpuCoolerHeight?: number;
  
  // PSU
  psuWattage?: number;
  psuEfficiency?: string;
  
  // ... más specs
}
```

## Limitaciones Conocidas

1. **Extracción de specs**: Las specs se extraen de texto no estructurado (título/descripción), por lo que pueden faltar datos. El sistema está diseñado para mostrar warnings cuando no puede verificar compatibilidad.

2. **Datos curados**: Para producción, se recomienda implementar una tabla de specs curadas por producto para mejorar la precisión.

3. **Categorización**: Los productos se buscan por keywords, no por categorías exactas del API.

## Roadmap

- [ ] Tabla de specs curadas para productos populares
- [ ] Exportar build a PDF/imagen
- [ ] Compartir build por link
- [ ] Comparar múltiples builds
- [ ] Historial de precios
- [ ] Alertas de stock

## Licencia

MIT

---

Powered by [Mall Web](https://www.gestionresellers.com.ar) (Gestión Resellers)

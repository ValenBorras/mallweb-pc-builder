# Ejemplos Prácticos de Detección de Water Cooling

Este documento muestra ejemplos reales de cómo el sistema detecta y valida la compatibilidad de water cooling.

## Ejemplos de Detección en Coolers

### ✅ Ejemplo 1: Corsair iCUE H100i RGB Elite
```
Título: "Corsair iCUE H100i RGB Elite Refrigeración Líquida 240mm"
Detección:
  - coolerType: 'aio' (detectado por "Refrigeración Líquida")
  - aioSize: 240 (detectado por "240mm")
  - coolerSockets: ['AM4', 'AM5', 'LGA1700'] (si está en la descripción)
```

### ✅ Ejemplo 2: NZXT Kraken X63
```
Título: "NZXT Kraken X63 AIO Water Cooler 280mm RGB"
Detección:
  - coolerType: 'aio' (detectado por "AIO" y "Water Cooler")
  - aioSize: 280 (detectado por "280mm")
```

### ✅ Ejemplo 3: Arctic Liquid Freezer II
```
Título: "Arctic Liquid Freezer II 360mm All-in-One"
Detección:
  - coolerType: 'aio' (detectado por "Liquid" y "All-in-One")
  - aioSize: 360 (detectado por "360mm")
```

### ✅ Ejemplo 4: Cooler Master MasterLiquid
```
Título: "Cooler Master MasterLiquid ML240L V2 RGB"
Descripción: "Watercooler 2x120mm fans"
Detección:
  - coolerType: 'aio' (detectado por "Watercooler")
  - aioSize: 240 (detectado por "2x120mm" = 2 × 120 = 240)
```

### ❌ Ejemplo 5: Air Cooler (NO es AIO)
```
Título: "Cooler Master Hyper 212 Black Edition"
Descripción: "Tower Air Cooler 159mm height"
Detección:
  - coolerType: 'air' (detectado por "Tower" y "Air Cooler")
  - aioSize: undefined (no es AIO)
```

## Ejemplos de Detección en Gabinetes

### ✅ Ejemplo 1: NZXT H510 Elite
```
Título: "NZXT H510 Elite Mid Tower ATX"
Descripción: "Soporte para radiador 240mm y 280mm en el frontal"
Detección:
  - supportsWaterCooling: true
  - supportedRadiatorSizes: [240, 280]
```

### ✅ Ejemplo 2: Lian Li O11 Dynamic
```
Título: "Lian Li O11 Dynamic XL Full Tower"
Descripción: "Soporta radiadores 240mm, 280mm, 360mm y 420mm. Compatible con AIO water cooling"
Detección:
  - supportsWaterCooling: true
  - supportedRadiatorSizes: [240, 280, 360, 420]
```

### ✅ Ejemplo 3: Corsair 4000D Airflow
```
Descripción: "Gabinete Mid Tower. Soporte radiador hasta 360mm. Water cooling compatible"
Detección:
  - supportsWaterCooling: true
  - supportedRadiatorSizes: [360] (podría detectar más si están mencionados)
```

### ⚠️ Ejemplo 4: Gabinete sin información específica
```
Título: "Gabinete ATX Gaming RGB"
Descripción: "Mid tower con ventiladores RGB"
Detección:
  - supportsWaterCooling: false
  - supportedRadiatorSizes: []
  
Nota: El sistema marcará como incompatible si intentas usar AIO
```

### ✅ Ejemplo 5: Mención general de water cooling
```
Descripción: "Gabinete compatible con water cooling y AIO"
Detección:
  - supportsWaterCooling: true
  - supportedRadiatorSizes: [] (tamaños no especificados)
  
Nota: El sistema dará WARNING pidiendo verificación manual del tamaño
```

## Escenarios de Validación

### Escenario 1: Build Exitoso ✅
```
BUILD:
  CPU: AMD Ryzen 7 7800X3D
  Cooler: Corsair H100i RGB Elite (AIO 240mm)
  Gabinete: NZXT H510 Elite (soporta 240mm, 280mm)
  
VALIDACIÓN:
  ✅ Gabinete soporta radiador de 240mm
  
RESULTADO: Compatible, build válido
```

### Escenario 2: Incompatibilidad por Tamaño ❌
```
BUILD:
  CPU: Intel Core i9-14900K
  Cooler: Arctic Liquid Freezer II 360 (AIO 360mm)
  Gabinete: Cooler Master Q300L (soporta solo 240mm)
  
VALIDACIÓN:
  ❌ Radiador de 360mm no compatible. Gabinete soporta: 240mm
  
RESULTADO: Incompatible, usuario debe cambiar cooler o gabinete
```

### Escenario 3: Gabinete sin soporte ❌
```
BUILD:
  CPU: AMD Ryzen 5 5600X
  Cooler: NZXT Kraken X53 (AIO 240mm)
  Gabinete: Gabinete Básico (sin mención de water cooling)
  
VALIDACIÓN:
  ❌ Gabinete no indica soporte para water cooling/AIO
  
RESULTADO: Incompatible, usuario debe elegir gabinete con soporte AIO
```

### Escenario 4: Necesita Verificación Manual ⚠️
```
BUILD:
  CPU: Intel Core i7-13700K
  Cooler: Cooler AIO sin tamaño especificado
  Gabinete: NZXT H510 (soporta 240mm, 280mm)
  
VALIDACIÓN:
  ⚠️ No se pudo determinar el tamaño del radiador. Verificá manualmente
  
RESULTADO: Permitido con advertencia
```

### Escenario 5: Air Cooler (no aplica regla) ✅
```
BUILD:
  CPU: AMD Ryzen 5 7600X
  Cooler: Cooler Master Hyper 212 (Air Tower 159mm)
  Gabinete: Cualquier gabinete con altura >= 159mm
  
VALIDACIÓN:
  ✅ Cooler (159mm) entra en gabinete (max 160mm)
  Nota: Regla de water cooling NO aplica (es air cooler)
  
RESULTADO: Compatible
```

## Patrones de Texto Detectados

### Para identificar AIO/Water Cooling:
- "AIO"
- "all-in-one", "all in one"
- "liquid", "líquida", "liquida"
- "water cooling", "watercooler", "water cooler"
- "refrigeración líquida"

### Para identificar tamaños de radiador:
- "120mm", "120 mm"
- "140mm", "140 mm"
- "240mm", "240 mm"
- "280mm", "280 mm"
- "360mm", "360 mm"
- "420mm", "420 mm"
- "2x120mm" (= 240mm)
- "3x120mm" (= 360mm)

### Para identificar soporte en gabinetes:
- "soporte para radiador"
- "soporta radiador"
- "compatible con AIO"
- "water cooling support"
- "radiador hasta Xmm"
- "admite radiadores"

## Notas de Implementación

1. **Extracción robusta**: El sistema busca en título, descripción Y atributos del producto
2. **Prioridad de patrones**: Se intenta extraer información más específica primero
3. **Fallback inteligente**: Si no puede determinar tamaño exacto, avisa al usuario
4. **Bidireccional**: Valida al agregar cooler O al agregar gabinete
5. **No invasivo**: Air coolers no son afectados por estas reglas

## Mejoras Futuras Sugeridas

1. **Base de datos de specs**: Mantener una tabla curada con especificaciones exactas
2. **OCR de imágenes**: Extraer specs de imágenes del producto
3. **Machine Learning**: Mejorar detección con entrenamiento en productos reales
4. **Validación cruzada**: Verificar con múltiples fuentes de datos
5. **API de fabricantes**: Integrar APIs oficiales cuando estén disponibles

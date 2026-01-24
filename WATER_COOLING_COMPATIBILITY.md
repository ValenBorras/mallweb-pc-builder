# Compatibilidad de Water Cooling / AIO

## Resumen

Se implementó un sistema completo para detectar y validar la compatibilidad entre coolers de refrigeración líquida (AIO/Water Cooling) y gabinetes.

## Funcionalidades Implementadas

### 1. Detección en Gabinetes

El sistema ahora detecta automáticamente si un gabinete soporta water cooling y qué tamaños de radiadores acepta:

- **Tamaños detectados**: 120mm, 140mm, 240mm, 280mm, 360mm, 420mm
- **Patrones de detección**:
  - "soporte para radiador 240mm"
  - "soporta AIO 360mm"
  - "water cooling 280mm"
  - "refrigeración líquida 240mm"

**Campos agregados en `ProductSpec` para gabinetes:**
```typescript
supportsWaterCooling?: boolean;        // Si soporta water cooling
supportedRadiatorSizes?: number[];     // Tamaños de radiadores soportados (ej: [240, 280, 360])
```

### 2. Detección Mejorada en Coolers

Se mejoró la detección de coolers AIO y sus tamaños de radiador:

- **Tipos detectados**: Air cooler, AIO (All-In-One water cooling)
- **Palabras clave detectadas**:
  - AIO, all-in-one
  - líquida, liquid
  - water cooling, watercooler
  - refrigeración líquida

**Detección de tamaño de radiador:**
- Formato directo: "240mm", "360mm"
- Formato múltiple: "2x120mm" = 240mm, "3x120mm" = 360mm
- Búsqueda en atributos del producto

### 3. Reglas de Compatibilidad

Se agregaron dos nuevas reglas de compatibilidad bidireccionales:

#### `coolerCaseWaterCoolingRule`
Valida al seleccionar un **cooler AIO**:
- ✅ **PASS**: El gabinete soporta el tamaño de radiador del AIO
- ❌ **FAIL**: El gabinete no soporta el tamaño de radiador
- ⚠️ **WARN**: No se pudo determinar compatibilidad (verificar manualmente)

#### `caseCoolerWaterCoolingRule`
Valida al seleccionar un **gabinete** (regla inversa):
- ✅ **PASS**: El gabinete soporta el AIO previamente seleccionado
- ❌ **FAIL**: El gabinete no soporta el tamaño del AIO seleccionado
- ⚠️ **WARN**: No se pudo verificar compatibilidad

## Ejemplos de Uso

### Ejemplo 1: Compatibilidad Exitosa ✅
```
Cooler: Corsair iCUE H100i RGB Elite (AIO 240mm)
Gabinete: NZXT H510 Elite (soporta radiadores 240mm y 280mm)
Resultado: ✅ COMPATIBLE - "Gabinete soporta radiador de 240mm"
```

### Ejemplo 2: Incompatibilidad ❌
```
Cooler: Corsair H150i Elite LCD (AIO 360mm)
Gabinete: Cooler Master Q300L (soporta radiador 240mm)
Resultado: ❌ INCOMPATIBLE - "Radiador de 360mm no compatible. Gabinete soporta: 240mm"
```

### Ejemplo 3: Gabinete sin soporte de water cooling ❌
```
Cooler: NZXT Kraken X53 (AIO 240mm)
Gabinete: Basic Budget Case (sin mención de water cooling)
Resultado: ❌ INCOMPATIBLE - "Gabinete no indica soporte para water cooling/AIO"
```

### Ejemplo 4: Air Cooler (regla no aplica) ✅
```
Cooler: Cooler Master Hyper 212 (Air Tower)
Gabinete: Cualquier gabinete
Resultado: ✅ La regla de water cooling no aplica, se valida solo altura
```

## Archivos Modificados

1. **`lib/compat/types.ts`**
   - Agregados campos `supportsWaterCooling` y `supportedRadiatorSizes` en `ProductSpec`

2. **`lib/compat/specs.ts`**
   - Nueva función `extractWaterCoolingSupport()` para detectar soporte en gabinetes
   - Mejora en `extractCoolerSpecs()` para detectar mejor AIO y tamaños de radiador
   - Actualizado `extractCaseSpecs()` para incluir detección de water cooling

3. **`lib/compat/rules.ts`**
   - Nueva regla `coolerCaseWaterCoolingRule` (cooler → case)
   - Nueva regla `caseCoolerWaterCoolingRule` (case → cooler)
   - Actualizado `coolerCaseClearanceRule` para no duplicar validación de AIO

4. **`lib/compat/__tests__/rules.test.ts`**
   - 12 tests nuevos para validar compatibilidad de water cooling
   - Cobertura completa: casos exitosos, fallos, warnings, edge cases

## Tests

Se agregaron 12 tests automatizados que cubren:
- ✅ AIO compatible con gabinete
- ❌ AIO incompatible por tamaño
- ❌ Gabinete sin soporte de water cooling
- ✅ Air cooler (regla no aplica)
- ⚠️ Tamaño de AIO no determinado
- ✅ Sin gabinete seleccionado
- Validación bidireccional (cooler→case y case→cooler)

**Resultado**: 26/26 tests pasando ✅

## Consideraciones

- La detección es basada en texto (títulos, descripciones, atributos)
- En casos donde no se puede determinar compatibilidad, el sistema avisa al usuario
- Los coolers air (torre) NO son validados por estas reglas
- Las reglas son bidireccionales para validar en ambas direcciones

## Mensajes al Usuario

Los mensajes son claros y en español:
- ✅ "Gabinete soporta radiador de 240mm"
- ❌ "Radiador de 360mm no compatible. Gabinete soporta: 240, 280mm"
- ❌ "Gabinete no indica soporte para water cooling/AIO"
- ⚠️ "No se pudo determinar el tamaño del radiador. Verificá manualmente"

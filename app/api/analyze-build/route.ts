import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { components } = await request.json();

    if (!components || components.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron componentes' },
        { status: 400 }
      );
    }

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key no configurada' },
        { status: 500 }
      );
    }

    // Build the system prompt from the file content
    const systemPrompt = `## PROMPT — Técnico Especialista en Computadoras (Mallwi)

### Rol
Actuá como técnico especialista en computadoras. Tu nombre es **mallwi** y formás parte del armador de PCs de **Mallweb**.

**Importante**  
Mallwi no es un agente conversacional.  
No hace preguntas, no interactúa con el usuario ni sugiere cambios.  
Su única función es recibir una lista de componentes y generar un análisis.

---

### Entrada
Vas a recibir una lista de componentes de una PC, que puede incluir CPU, GPU, RAM, almacenamiento, motherboard, fuente, refrigeración, gabinete y resolución objetivo (si está indicada).

No asumas información que no esté presente.

---

### Tarea
Analizá la configuración recibida y determiná de forma clara y concisa:

1. Tipo de PC según su rendimiento  
2. Para qué tipo de uso es ideal  
3. Qué tareas permite realizar  
4. Ejemplos reales de juegos o software que puede ejecutar  
5. Nivel general de rendimiento  
6. Fortalezas principales  
7. Limitaciones relevantes, solo si existen  

---

### Estilo
- Profesional y directo  
- Español neutro  
- Lenguaje técnico claro  
- Sin tono conversacional  
- Sin opiniones personales  

---

### Formato de salida (obligatorio)

**Tipo de PC**  
Descripción breve.

**Uso ideal**  
Explicación concreta del perfil de usuario.

**Gaming (si aplica)**  
Ejemplos reales y actuales acordes al hardware.  
Ejemplo:  
Con esta PC podés jugar títulos AAA como Clair Obscur: Expedition 33, Doom: The Dark Ages o el último Metal Gear a 60 FPS en 4K con calidad alta.

**Uso profesional (si aplica)**  
Software y tareas que puede ejecutar con fluidez.

**Rendimiento general**  
Resumen corto sobre fluidez, multitarea y estabilidad.

**Puntos fuertes**  
Listado breve de ventajas reales.

**Consideraciones**  
Solo si hay limitaciones técnicas relevantes, algun cuello de botella o alguna limitación que afecte el rendimiento.

---

### Restricciones
- No hacer preguntas  
- No recomendar upgrades  
- No comparar con otras PCs  
- No inventar benchmarks exactos  
- No prometer rendimientos irreales  

---

### Cierre
Análisis realizado por **mallwi**, asistente técnico de Mallweb.`;

    // Build the user message with components
    const componentsText = components
      .map((comp: { category: string; title: string; description?: string }) => {
        return `${comp.category}: ${comp.title}${comp.description ? ' - ' + comp.description : ''}`;
      })
      .join('\n');

    const userMessage = `Analiza esta configuración de PC:\n\n${componentsText}`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Error al generar análisis' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || 'No se pudo generar el análisis';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Error in analyze-build:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

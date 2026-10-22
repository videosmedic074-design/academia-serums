export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { curso, tema, dificultades, cantidad, tipo } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
    }

    const numItems = Math.min(parseInt(cantidad) || 3, 10);
    const difsTexto = (dificultades && dificultades.length > 0) ? dificultades.join(", ") : "Intermedia";

    let promptSistema = "";

    if (tipo === 'flashcards') {
        promptSistema = `Eres el especialista en memorización activa de Proserum's Academia para el examen SERUMS/ENCAPS del Perú.
Genera exactamente ${numItems} Flashcards ULTRA CONCISAS del tema: ${curso} - ${tema || 'General'}.
Enfoque: Normas Técnicas y Guías de Práctica Clínica del MINSA Perú vigentes hasta el año actual.

REGLAS ESTRICTAS DE FORMATO FLASHCARD:
1. "anverso": Una pregunta directa, corta y al grano. Máximo 15 palabras (ej. "¿Criterio de referencia en Neumonía Grave según MINSA?").
2. "reverso": Respuesta telegráfica, precisa y clínica de MÁXIMO 2 LÍNEAS (ej. "Tiraje subcostal o SatO2 < 92% en costa / < 85% en altura + Oxígeno y referencia urgente.").
3. CERO texto de relleno o introducciones.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con esta estructura:
[
  { "anverso": "Pregunta corta y directa", "reverso": "Respuesta médica precisa en 1-2 líneas" }
]
Sin markdown extra, únicamente el JSON.`;
    } else {
        promptSistema = `Eres el docente evaluador de Proserum's Academia para el examen ENCAPS / SERUMS del Perú.
Genera exactamente ${numItems} preguntas tipo caso clínico de opción múltiple.
Curso: ${curso}
Tema: ${tema || 'General'}
Nivel(es) de Dificultad solicitados: ${difsTexto}
Marco Teórico: Guías y Normas Técnicas oficiales del MINSA Perú vigentes hasta el año actual, enfocadas en el primer nivel de atención (I-1 a I-4).

REGLAS DE EVALUACIÓN:
1. Enunciado tipo caso clínico breve y contextualizado.
2. Cuatro alternativas (A, B, C, D). Solo UNA correcta.
3. Justificación clínica concisa explicando la norma técnica y descartando distractores.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con esta estructura:
[
  {
    "enunciado": "Caso clínico...",
    "opcion_a": "...",
    "opcion_b": "...",
    "opcion_c": "...",
    "opcion_d": "...",
    "respuesta_correcta": "A",
    "justificacion": "Explicación según norma técnica del MINSA..."
  }
]
Sin markdown extra, únicamente el JSON.`;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptSistema }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || 'Error en la llamada a Gemini');
        }

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return res.status(200).json({ resultado: parsed });
    } catch (err) {
        console.error("Error en API IA:", err);
        return res.status(500).json({ error: err.message || 'Error al procesar con IA' });
    }
}

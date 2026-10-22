export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { curso, tema, dificultad, tipo } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
    }

    // Prompt invisible médico especializado en ENCAPS / MINSA Perú
    let promptSistema = "";

    if (tipo === 'flashcards') {
        promptSistema = `Eres el especialista académico de Proserum's Academia.
Genera exactamente 4 Flashcards de alta rentabilidad para el examen SERUMS/ENCAPS del Perú.
Tema: ${curso} - ${tema || 'General'}.
Enfoque: Normas Técnicas del MINSA vigentes hasta el año actual, dosis pediátricas, criterios de referencia y conductas de emergencia.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con este formato:
[
  { "anverso": "Pregunta o Criterio Clínico clave", "reverso": "Respuesta médica precisa y conducta MINSA" }
]
Sin rodeos, sin formato markdown adicional, solo el JSON.`;
    } else {
        promptSistema = `Eres el docente evaluador de Proserum's Academia para el examen ENCAPS / SERUMS del Perú.
Genera exactamente 3 preguntas tipo caso clínico de opción múltiple.
Curso: ${curso}
Tema: ${tema || 'General'}
Nivel de Dificultad: ${dificultad || 'Intermedia'}
Marco Teórico: Normas Técnicas y Guías de Práctica Clínica del MINSA Perú vigentes hasta el año actual.

Reglas:
1. Casos clínicos contextualizados en el primer nivel de atención (Puesto o Centro de Salud I-1 a I-4).
2. Cuatro alternativas (A, B, C, D). Solo UNA correcta.
3. Justificación clínica clara explicando el porqué de la clave y descartando los distractores.

Devuelve EXCLUSIVAMENTE un arreglo JSON válido con este formato:
[
  {
    "enunciado": "Texto del caso clínico...",
    "opcion_a": "...",
    "opcion_b": "...",
    "opcion_c": "...",
    "opcion_d": "...",
    "respuesta_correcta": "A",
    "justificacion": "Explicación médica según norma técnica..."
  }
]
Sin rodeos, sin markdown adicional, solo el JSON.`;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
        // Limpiar posibles etiquetas ```json de la respuesta
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return res.status(200).json({ resultado: parsed });
    } catch (err) {
        console.error("Error en API IA:", err);
        return res.status(500).json({ error: err.message || 'Error al procesar con IA' });
    }
}

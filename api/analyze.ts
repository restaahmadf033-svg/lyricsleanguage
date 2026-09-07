import type { Request, Response } from 'express'
import OpenAI from 'openai'

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.BITDEER_API_KEY || process.env.OPENAI_API_KEY
const baseURL = process.env.DASHSCOPE_BASE_URL || process.env.BITDEER_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
const model = process.env.DASHSCOPE_MODEL_ID || process.env.BITDEER_MODEL_ID || process.env.OPENAI_MODEL || 'gpt-4o-mini'

export default async function analyze(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const { source, target, lyrics } = request.body ?? {}
  if (!source || !target || typeof lyrics !== 'string' || !lyrics.trim()) return response.status(400).json({ error: 'Silakan berikan bahasa dan lirik.' })
  if (source === target) return response.status(400).json({ error: 'Bahasa sumber dan bahasa tujuan tidak boleh sama.' })
  if (lyrics.length > 12000) return response.status(413).json({ error: 'Panjang lirik harus kurang dari 12.000 karakter.' })
  if (!apiKey) return response.status(503).json({ error: 'API key AI belum tersedia di environment Production Vercel.' })

  try {
    const client = new OpenAI({ apiKey, baseURL, timeout: 60000, maxRetries: 0 })
    const completion = await client.chat.completions.create({
      model,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: 'Buat pelajaran bahasa dari lirik berikut. Kembalikan hanya JSON dengan lyrics_analysis (setiap baris: original, literal_translation, natural_translation, meaning, vocabulary), important_vocabulary, language_notes, quiz (5 pertanyaan dengan options A-D, answer harus sama persis dengan salah satu option), dan summary (vocabulary_count, expression_count, grammar_count, particle_count). Semua penjelasan dan pertanyaan gunakan Bahasa Indonesia. Pertahankan bahasa target pada terjemahan.' },
        { role: 'user', content: `Source: ${source}. Target: ${target}. Lyrics:\n${lyrics}` },
      ],
    })
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    if (!Array.isArray(result.lyrics_analysis) || !Array.isArray(result.language_notes) || !Array.isArray(result.quiz)) throw new Error('AI returned an incomplete lesson.')
    return response.json(result)
  } catch (error) {
    console.error('Live AI analysis failed:', error)
    return response.status(502).json({ error: 'AI live gagal memproses permintaan. Periksa API key, base URL, model, dan kuota provider.' })
  }
}

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

  if (apiKey) {
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
      if (Array.isArray(result.lyrics_analysis) && Array.isArray(result.language_notes) && Array.isArray(result.quiz)) return response.json(result)
    } catch (error) {
      console.error('Live AI analysis failed:', error)
    }
  }

  const lines = lyrics.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean).slice(0, 12)
  return response.json({
    lyrics_analysis: lines.map((original: string) => ({ original, literal_translation: `[Demo ${target}] ${original}`, natural_translation: '[Mode demo] Makna baris ini dipertahankan untuk pelajaran Anda.', meaning: 'Mode demo aktif. Tambahkan API key AI di Vercel untuk mendapatkan analisis dan terjemahan lengkap.', vocabulary: original.split(/\s+/).slice(0, 5).map((word: string) => ({ word, meaning: 'Kata ini perlu dipelajari dalam konteks.' })), japanese_analysis: [] })),
    important_vocabulary: [{ word: 'context', meaning: 'konteks', example: 'Meaning changes with context.' }],
    language_notes: [{ title: 'Baca dalam konteks', explanation: 'Makna kata atau frasa dapat berubah sesuai kalimat dan situasi.', example: lines[0] || 'Meaning changes with context.' }],
    quiz: [{ question: 'Apa yang perlu digunakan untuk memahami makna lirik?', options: ['A. Konteks seluruh baris', 'B. Hanya kata pertama', 'C. Jumlah kata', 'D. Hanya tanda baca'], answer: 'A. Konteks seluruh baris', explanation: 'Konteks membantu memahami makna lirik yang dimaksud.' }],
    summary: { vocabulary_count: 1, expression_count: 1, grammar_count: 1, particle_count: 0 },
  })
}

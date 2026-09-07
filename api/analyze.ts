import type { Request, Response } from 'express'

export default function analyze(request: Request, response: Response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed.' })
  const { source, target, lyrics } = request.body ?? {}
  if (!source || !target || typeof lyrics !== 'string' || !lyrics.trim()) return response.status(400).json({ error: 'Silakan berikan bahasa dan lirik.' })
  if (source === target) return response.status(400).json({ error: 'Bahasa sumber dan bahasa tujuan tidak boleh sama.' })
  if (lyrics.length > 12000) return response.status(413).json({ error: 'Panjang lirik harus kurang dari 12.000 karakter.' })

  const lines = lyrics.split(/\r?\n/).map((line: string) => line.trim()).filter(Boolean).slice(0, 12)
  return response.json({
    lyrics_analysis: lines.map((original: string) => ({ original, literal_translation: `[Demo ${target}] ${original}`, natural_translation: '[Mode demo] Makna baris ini dipertahankan untuk pelajaran Anda.', meaning: 'Mode demo aktif. Tambahkan API key AI di Vercel untuk mendapatkan analisis dan terjemahan lengkap.', vocabulary: original.split(/\s+/).slice(0, 5).map((word: string) => ({ word, meaning: 'Kata ini perlu dipelajari dalam konteks.' })), japanese_analysis: [] })),
    important_vocabulary: [{ word: 'context', meaning: 'konteks', example: 'Meaning changes with context.' }],
    language_notes: [{ title: 'Baca dalam konteks', explanation: 'Makna kata atau frasa dapat berubah sesuai kalimat dan situasi.', example: lines[0] || 'Meaning changes with context.' }],
    quiz: [{ question: 'Apa yang perlu digunakan untuk memahami makna lirik?', options: ['A. Konteks seluruh baris', 'B. Hanya kata pertama', 'C. Jumlah kata', 'D. Hanya tanda baca'], answer: 'A. Konteks seluruh baris', explanation: 'Konteks membantu memahami makna lirik yang dimaksud.' }],
    summary: { vocabulary_count: 1, expression_count: 1, grammar_count: 1, particle_count: 0 },
  })
}

import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
app.use(express.json({ limit: '200kb' }))
const port = Number(process.env.PORT || 8787)
const apiKey = process.env.DASHSCOPE_API_KEY || process.env.BITDEER_API_KEY
const baseURL = process.env.DASHSCOPE_BASE_URL || process.env.BITDEER_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
const model = process.env.DASHSCOPE_MODEL_ID || process.env.BITDEER_MODEL_ID || 'qwen-plus'
const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const schema = `Return only valid JSON matching this shape: {"lyrics_analysis":[{"original":"string","literal_translation":"string","natural_translation":"string","meaning":"simple explanation","vocabulary":[{"word":"string","meaning":"string"}],"japanese_analysis":[{"japanese":"string","romaji":"string","meaning":"string","breakdown":"string"}]}],"important_vocabulary":[{"word":"string","meaning":"string","example":"string","romaji":"string"}],"language_notes":[{"title":"string","explanation":"string","example":"string"}],"quiz":[{"question":"string","options":["A. string","B. string","C. string","D. string"],"answer":"exact option string","explanation":"short explanation"}],"summary":{"vocabulary_count":0,"expression_count":0,"grammar_count":0,"particle_count":0}}`
type NoticedWord = { word: string; meaning: string }
type ImportantWord = { word: string; meaning: string; example: string; romaji?: string }

app.use(express.static(path.join(serverDirectory, '../dist')))

function createDemoAnalysis(lyrics: string, target: string) {
  const lines = lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12)
  const lineAnalysis = lines.map((original, index) => ({
    original,
    literal_translation: `[Demo ${target} translation] ${original}`,
    natural_translation: `[Demo meaning] Line ${index + 1} kept in context for your lesson.`,
    meaning: 'Mode demo aktif karena API key AI belum dikonfigurasi. Tambahkan DASHSCOPE_API_KEY atau BITDEER_API_KEY untuk mendapatkan terjemahan dan penjelasan konteks yang sebenarnya.',
      vocabulary: original.split(/\s+/).slice(0, 5).map((word) => ({ word: word.replace(/[^\p{L}'-]/gu, ''), meaning: 'Kata ini perlu dipelajari dalam konteks.' })),
  }))
  return {
    lyrics_analysis: lineAnalysis,
    important_vocabulary: [{ word: 'context', meaning: 'konteks', example: 'Meaning changes with context.' }, { word: 'expression', meaning: 'ungkapan', example: 'Songs often use expressions.' }, { word: 'meaning', meaning: 'arti atau makna', example: 'Look for the meaning in context.' }],
    language_notes: [{ title: 'Context', explanation: 'Makna sebuah kata dapat berubah sesuai kalimat dan situasi.', example: 'Meaning changes with context.' }, { title: 'Expressions', explanation: 'Lirik lagu sering memakai ungkapan yang tidak diterjemahkan kata demi kata.', example: 'Songs often use expressions.' }],
    quiz: [{ question: 'Mode apa yang sedang membuat pelajaran ini?', options: ['A. Mode tutor demo', 'B. Mode pemutar musik', 'C. Mode scraping', 'D. Mode kamus offline'], answer: 'A. Mode tutor demo', explanation: 'Mode demo lokal aktif karena API key belum dikonfigurasi.' }],
    summary: { vocabulary_count: 2, expression_count: 1, grammar_count: 0, particle_count: 0 },
  }
}

function createMaterialFallback(lineAnalysis: { original: string; meaning: string }[]) {
  const firstLine = lineAnalysis[0]?.original || 'Review the lesson above.'
  return {
    language_notes: [
      { title: 'Read the line in context', explanation: 'Makna sebuah kata atau frasa dapat berubah sesuai kalimat dan situasi.', example: firstLine },
      { title: 'Notice the expression', explanation: 'Perhatikan frasa yang menyampaikan makna, bukan hanya arti setiap kata secara terpisah.', example: firstLine },
    ],
    quiz: [{
      question: 'Apa yang perlu digunakan untuk memahami makna lirik?',
      options: ['A. Konteks seluruh baris', 'B. Hanya kata pertama', 'C. Jumlah kata', 'D. Hanya tanda baca'],
      answer: 'A. Konteks seluruh baris',
      explanation: 'Konteks membantu memahami makna lirik yang dimaksud.',
    }],
    summary: { vocabulary_count: 0, expression_count: 1, grammar_count: 1, particle_count: 0 },
  }
}

function normalizeQuiz(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const question = item as { question?: unknown; options?: unknown; answer?: unknown; explanation?: unknown }
    const options = Array.isArray(question.options) ? question.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0) : []
    if (typeof question.question !== 'string' || options.length < 2) return []
    const answer = typeof question.answer === 'string' ? question.answer : ''
    const answerIndex = options.findIndex((option) => option.trim().toLowerCase() === answer.trim().toLowerCase() || option.trim().toLowerCase().startsWith(`${answer.trim().toLowerCase()}.`))
    return [{ question: question.question, options, answer: answerIndex >= 0 ? options[answerIndex] : options[0], explanation: typeof question.explanation === 'string' ? question.explanation : '' }]
  })
}

app.post('/api/analyze', async (req, res) => {
  const { source, target, lyrics } = req.body ?? {}
  if (!source || !target || !lyrics?.trim()) return res.status(400).json({ error: 'Please provide languages and lyrics.' })
  if (source === target) return res.status(400).json({ error: 'Source and target language cannot be the same.' })
  if (lyrics.length > 12000) return res.status(413).json({ error: 'Please keep your lyrics under 12,000 characters.' })
  if (!apiKey) return res.json(createDemoAnalysis(lyrics, target))
  try {
    const inputLines = lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const client = new OpenAI({ apiKey, baseURL, timeout: 70000, maxRetries: 0 })
    const lineBatches = Array.from({ length: Math.ceil(inputLines.length / 5) }, (_, index) => inputLines.slice(index * 5, index * 5 + 5))
    const analyzeBatch = async (batch: string[], batchIndex: number) => {
        const japaneseRule = source === 'Japanese' || target === 'Japanese' ? 'Japanese is involved: if Japanese is the source, preserve the original Japanese and provide romaji; if Japanese is the target, both literal_translation and natural_translation must be Japanese. In every item, japanese_analysis must be a non-empty array with Japanese text, romaji, Indonesian meaning, word breakdown, and particle notes when relevant.' : 'Japanese is not involved: japanese_analysis may be an empty array.'
        const request = client.chat.completions.create({ model, max_tokens: 3000, response_format: { type: 'json_object' }, temperature: 0.2, messages: [{ role: 'system', content: `Analyze every line in this batch. Return only JSON in this shape: {"lyrics_analysis":[{"original":"string","literal_translation":"string","natural_translation":"string","meaning":"Indonesian explanation","vocabulary":[{"word":"string","meaning":"Indonesian meaning"}],"japanese_analysis":[{"japanese":"string","romaji":"string","meaning":"Indonesian meaning","breakdown":"Indonesian word breakdown"}]}]}. This batch contains ${batch.length} lines, so return exactly ${batch.length} items in the same order. Copy each original line exactly; never merge or skip lines. Select up to five useful vocabulary words or expressions from each line for Word to notice. Source: ${source}. Target: ${target}. Translations use the target language. All explanations use Bahasa Indonesia. ${japaneseRule}` }, { role: 'user', content: `Batch ${batchIndex + 1}:\n${batch.join('\n')}` }] })
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error('AI provider timeout'), { code: 'APIConnectionTimeoutError' })), 50000))
      const completion = await Promise.race([request, timeout])
      const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
      if (!Array.isArray(result.lyrics_analysis) || result.lyrics_analysis.length !== batch.length) throw new Error(`Invalid response for batch ${batchIndex + 1}`)
      return result
    }
    const materialRequest = client.chat.completions.create({ model, max_tokens: 4200, response_format: { type: 'json_object' }, temperature: 0.2, messages: [{ role: 'system', content: 'Create language-learning materials from these lyrics. Return only JSON with important_vocabulary (10-15 items), language_notes (6-8 items), quiz (5 items), and summary with vocabulary_count, expression_count, grammar_count, particle_count. Important vocabulary must be selected from useful words or expressions that appear in the lyrics. Write all explanations, quiz questions, quiz options, quiz answers, and quiz explanations in Bahasa Indonesia, but keep example sentences in the source or target language when useful. Use only words and patterns that appear in the lyrics.' }, { role: 'user', content: `Source: ${source}. Target: ${target}. Lyrics:\n${lyrics}` }] })
    const materialPromise = materialRequest.then((completion) => JSON.parse(completion.choices[0]?.message?.content || '{}')).catch(() => null)
    const [results, materials] = await Promise.all([Promise.all(lineBatches.map(analyzeBatch)), materialPromise])
      const lineAnalysis = results.flatMap((result) => result.lyrics_analysis)
      const normalizedQuiz = normalizeQuiz(materials?.quiz)
      const materialData = materials && Array.isArray(materials.language_notes) && materials.language_notes.length > 0 && normalizedQuiz.length > 0
        ? { ...materials, quiz: normalizedQuiz }
        : createMaterialFallback(lineAnalysis)
      const noticedWords = lineAnalysis.flatMap((line) => (line.vocabulary || []) as NoticedWord[])
      const noticedVocabulary: ImportantWord[] = Array.from(new Map(noticedWords.filter((item) => item.word).map((item) => [item.word.toLowerCase(), { word: item.word, meaning: item.meaning, example: lineAnalysis.find((line) => line.original.toLowerCase().includes(item.word.toLowerCase()))?.original || '' }])).values())
      const modelVocabulary = Array.isArray(materialData.important_vocabulary) ? materialData.important_vocabulary as ImportantWord[] : []
      const importantVocabulary = Array.from(new Map([...noticedVocabulary, ...modelVocabulary].filter((item) => item.word).map((item) => [item.word.toLowerCase(), item])).values()).slice(0, 15)
      res.json({ lyrics_analysis: lineAnalysis, important_vocabulary: importantVocabulary, language_notes: materialData.language_notes, quiz: materialData.quiz, summary: materialData.summary || { vocabulary_count: importantVocabulary.length, expression_count: 0, grammar_count: 0, particle_count: 0 } })
  } catch (error) {
    console.error(error)
    const apiError = error as { status?: number; code?: string }
    if (apiError.status === 429 || apiError.code === 'credit_balance_exhausted' || apiError.code === 'insufficient_quota') return res.status(429).json({ error: 'The configured AI service rejected the request because its quota or credits are exhausted.' })
    if (apiError.code === 'APIConnectionTimeoutError' || apiError.code === 'ETIMEDOUT') return res.status(504).json({ error: 'The live AI service took too long to respond. No demo result was used.' })
    res.status(500).json({ error: 'Something went wrong while analyzing the lyrics. Please try again.' })
  }
})

app.get('/{*splat}', (_req, res) => res.sendFile(path.join(serverDirectory, '../dist/index.html')))
app.listen(port, () => console.log(`API server running on http://localhost:${port}`))

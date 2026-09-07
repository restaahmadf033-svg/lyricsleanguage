import { useState } from 'react'
import { ArrowRight, BookOpen, Check, CircleHelp, Moon, RotateCcw, Sun, Volume2 } from 'lucide-react'
import './App.css'

type Language = 'Indonesian' | 'English' | 'Japanese'
type LineAnalysis = { original: string; literal_translation: string; natural_translation: string; meaning: string; vocabulary: { word: string; meaning: string }[]; japanese_analysis?: { japanese: string; romaji: string; meaning: string; breakdown: string }[] }
type Analysis = { lyrics_analysis: LineAnalysis[]; important_vocabulary: { word: string; meaning: string; example: string; romaji?: string }[]; language_notes: { title: string; explanation: string; example: string }[]; quiz: { question: string; options: string[]; answer: string; explanation: string }[]; summary: { vocabulary_count: number; expression_count: number; grammar_count: number; particle_count: number } }
const sampleLyrics = `I don't know where I'm going
But I'm trying to find my way
Maybe someday I'll understand
Why I feel this way`

function answersMatch(selected: unknown, expected: unknown, options: unknown[]) {
  const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/^[a-d][.)\s-]+/, '').replace(/[.!?]+$/, '').trim()
  const selectedIndex = options.findIndex((option) => String(option ?? '') === String(selected ?? ''))
  const expectedIndex = options.findIndex((option) => normalize(option) === normalize(expected))
  if (expectedIndex >= 0) return selectedIndex === expectedIndex

  const expectedLetter = String(expected ?? '').trim().match(/^([a-d])(?:[.)\s-]|$)/i)?.[1].toLowerCase()
  if (expectedLetter) return selectedIndex === expectedLetter.charCodeAt(0) - 'a'.charCodeAt(0)
  return normalize(selected) === normalize(expected)
}

function App() {
  const [source, setSource] = useState<Language>('English')
  const [target, setTarget] = useState<Language>('Indonesian')
  const [lyrics, setLyrics] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dark, setDark] = useState(false)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  async function analyzeLyrics() {
    if (!lyrics.trim()) return setError('Silakan tempelkan lirik terlebih dahulu.')
    if (source === target) return setError('Bahasa sumber dan bahasa tujuan tidak boleh sama.')
    if (lyrics.length > 12000) return setError('Panjang lirik harus kurang dari 12.000 karakter.')
    setLoading(true); setError(''); setAnalysis(null)
    try { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 70000); const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source, target, lyrics }), signal: controller.signal }); window.clearTimeout(timeout); const raw = await response.text(); let data: Analysis & { error?: string }; try { data = raw ? JSON.parse(raw) : {} as Analysis & { error?: string } } catch { throw new Error(`Server returned an invalid response (${response.status}).`) } if (!response.ok) throw new Error(data.error || `Analysis failed with status ${response.status}.`); setAnalysis(data) }
    catch (err) { setError(err instanceof DOMException && err.name === 'AbortError' ? 'Layanan AI terlalu lama merespons. Coba lirik yang lebih pendek atau ulangi lagi.' : err instanceof Error ? err.message : 'Terjadi kesalahan saat menganalisis lirik.') }
    finally { setLoading(false) }
  }

  return <main className={dark ? 'app dark' : 'app'}>
    <nav className="topbar"><div className="brand"><span>LYRICS LANGUAGE <em>LEARN</em></span></div><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Ganti tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button></nav>
    <header className="hero"><div className="eyebrow"><span className="pulse" /> BELAJAR BAHASA MELALUI MUSIK</div><h1>Pahami kata-katanya.<br /><span>Rasakan maknanya.</span></h1><p>Ubah lirik apa pun menjadi pelajaran bahasa pribadi.<br className="desktop-only" /> Pelajari kosakata, konteks, dan pola yang tersembunyi di antara baris lirik.</p></header>
    <section className="workspace"><div className="section-label"><span className="section-marker" aria-hidden="true" /><div><strong>Siapkan pelajaran</strong><small>Pilih bahasa, lalu tempelkan bait lirik di bawah.</small></div></div><div className="controls"><label>Bahasa sumber<select value={source} onChange={(e) => setSource(e.target.value as Language)}>{['Indonesian', 'English', 'Japanese'].map((language) => <option key={language} value={language}>{language === 'Indonesian' ? 'Bahasa Indonesia' : language === 'English' ? 'Bahasa Inggris' : 'Bahasa Jepang'}</option>)}</select></label><div className="swap"><ArrowRight size={16} /></div><label>Pelajari dalam<select value={target} onChange={(e) => setTarget(e.target.value as Language)}>{['Indonesian', 'English', 'Japanese'].map((language) => <option key={language} value={language}>{language === 'Indonesian' ? 'Bahasa Indonesia' : language === 'English' ? 'Bahasa Inggris' : 'Bahasa Jepang'}</option>)}</select></label></div><div className="input-card"><div className="input-heading"><span><BookOpen size={17} /> Lirik Anda</span><span className="character-count">{lyrics.length.toLocaleString()} / 12.000</span></div><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Tempelkan lirik di sini..." /><div className="input-footer"><button className="sample-button" onClick={() => setLyrics(sampleLyrics)}><RotateCcw size={14} /> Coba contoh</button><button className="analyze-button" onClick={analyzeLyrics} disabled={loading}>{loading ? 'Menganalisis...' : <>Analisis lirik <ArrowRight size={16} /></>}</button></div></div>{error && <div className="error"><CircleHelp size={17} /> {error}</div>}</section>
    {analysis && <section className="results"><div className="result-heading"><div className="section-label"><span className="section-marker" aria-hidden="true" /><div><strong>Pelajaran Anda</strong><small>Baca dengan saksama. Perhatikan perubahan antara kata dan makna.</small></div></div></div><div className="line-list">{analysis.lyrics_analysis.map((line, index) => <article className="line-card" key={index}><div className="line-number">{String(index + 1).padStart(2, '0')}</div><div><div className="original-line">{line.original}<button className="speak" aria-label="Bacakan lirik" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(line.original))}><Volume2 size={15} /></button></div><div className="translations"><div><small>Harfiah</small><p>{line.literal_translation}</p></div><div className="natural"><small>Makna alami</small><p>{line.natural_translation}</p></div></div><div className="meaning"><strong>Makna & konteks</strong><p>{line.meaning}</p></div>{line.vocabulary.length > 0 && <div className="mini-vocab"><strong>Kata yang perlu diperhatikan</strong>{line.vocabulary.map((word) => <span key={word.word}><b>{word.word}</b> {word.meaning}</span>)}</div>}{line.japanese_analysis?.map((japanese) => <div className="japanese-note" key={japanese.japanese}><strong>{japanese.japanese}</strong><span>{japanese.romaji}</span><p>{japanese.meaning} · {japanese.breakdown}</p></div>)}</div></article>)}</div>
      <div className="two-columns"><section><div className="block-title"><span className="section-marker" aria-hidden="true" /><h2>Kosakata penting</h2></div><div className="vocab-table">{analysis.important_vocabulary.map((word) => <div className="vocab-row" key={word.word}><strong>{word.word}</strong>{word.romaji && <span>{word.romaji}</span>}<span>{word.meaning}</span><small>{word.example}</small></div>)}</div></section><section><div className="block-title"><span className="section-marker" aria-hidden="true" /><h2>Catatan bahasa</h2></div>{analysis.language_notes.map((note) => <div className="language-note" key={note.title}><h3>{note.title}</h3><p>{note.explanation}</p><code>{note.example}</code></div>)}</section></div>
      <section className="summary"><div><div className="block-title"><span className="section-marker" aria-hidden="true" /><h2>Apa yang Anda pelajari?</h2></div><p className="summary-copy">Pelajaran singkat yang dibuat dari lirik pilihan Anda.</p></div><div className="stats">{Object.entries({ kata: analysis.summary.vocabulary_count, ungkapan: analysis.summary.expression_count, pola: analysis.summary.grammar_count, partikel: analysis.summary.particle_count }).map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></section>
      <section className="quiz"><div className="block-title"><span className="section-marker" aria-hidden="true" /><div><h2>Cek pemahaman</h2><p>Uji pemahaman Anda sebelum melanjutkan.</p></div></div>{analysis.quiz.map((question, index) => <div className="question" key={index}><div className="question-top"><span>Pertanyaan {index + 1}</span><CircleHelp size={16} /></div><h3>{question.question}</h3><div className="options">{question.options.map((option) => <button className={answers[index] === option ? 'selected' : ''} key={option} onClick={() => !checked[index] && setAnswers({ ...answers, [index]: option })}>{option}{answers[index] === option && <Check size={15} />}</button>)}</div><button className="check-button" onClick={() => setChecked({ ...checked, [index]: true })} disabled={!answers[index]}>Periksa jawaban</button>{checked[index] && <div className={answersMatch(answers[index], question.answer, question.options) ? 'feedback correct' : 'feedback incorrect'}>{answersMatch(answers[index], question.answer, question.options) ? 'Benar.' : `Belum tepat. Jawaban yang benar adalah ${question.answer}.`} {question.explanation}</div>}</div>)}</section></section>}
    <footer><span>LYRICS LANGUAGE LEARN</span><span>Belajar lebih dalam, satu baris setiap kali.</span></footer>
  </main>
}
export default App

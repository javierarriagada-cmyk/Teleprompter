import Fuse from 'fuse.js'
import { useEffect, useRef, useState } from 'react'
import { alignWords } from '../lib/alignment'

export default function useVoiceTrack() {
  const [script, setScript] = useState('')
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  const fuseRef = useRef<Fuse<string> | null>(null)

  useEffect(() => {
    const lines = script.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    fuseRef.current = new Fuse(lines, { includeScore: true, threshold: 0.4 })
  }, [script])

  function updateTranscript(transcript: string) {
    // simple strategy: take last ~200 chars, search via Fuse for best line
    const fuse = fuseRef.current
    if (!fuse) return
    const windowText = transcript.slice(-200)
    const results = fuse.search(windowText)
    if (results.length > 0) {
      const best = results[0].item
      const lines = script.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      const idx = lines.indexOf(best)
      if (idx >= 0) setCurrentLineIndex(idx)
      // attempt word-level alignment
      const wordsTrans = transcript.replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/g, '').split(/\s+/).filter(Boolean)
      const wordsLine = best.replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/g, '').split(/\s+/).filter(Boolean)
      const mapping = alignWords(wordsLine, wordsTrans)
      // mapping gives index of current spoken word in line
      const mapped = mapping.length ? mapping[mapping.length - 1] : null
      if (mapped != null) setCurrentWordIndex(mapped)
    }
  }

  return { script, setScript, updateTranscript, currentLineIndex, currentWordIndex }
}

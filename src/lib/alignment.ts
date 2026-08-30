/**
 * alignment.ts
 * Provides a simple word-level alignment using Levenshtein to map spoken words to line words.
 */

export function alignWords(lineWords: string[], transWords: string[]) {
  // naive approach: find subsequence of transWords that best matches lineWords
  // We'll compute for each trans word the best matching index in line
  const mapping: number[] = []
  let li = 0
  for (let ti = 0; ti < transWords.length && li < lineWords.length; ti++) {
    const t = normalize(transWords[ti])
    const l = normalize(lineWords[li])
    if (t === l) {
      mapping.push(li)
      li++
    } else {
      // try to find t in the next few line words
      let found = -1
      for (let k = li + 1; k < Math.min(lineWords.length, li + 4); k++) {
        if (normalize(lineWords[k]) === t) { found = k; break }
      }
      if (found >= 0) {
        mapping.push(found)
        li = found + 1
      } else {
        // no match, assume same word index
        mapping.push(li)
      }
    }
  }
  return mapping
}

function normalize(s: string) {
  return s.replace(/[^\wáéíóúñü]/gi, '').toLowerCase()
}

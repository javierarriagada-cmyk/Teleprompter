/**
 * Simple TeleprompterView component
 * Props: script (string), currentLineIndex, currentWordIndex, speed, mirror
 */
import React, { useEffect, useRef } from 'react'

interface TeleprompterViewProps {
  script: string
  currentLineIndex: number
  currentWordIndex: number
  speed?: number
  mirror?: boolean
}

export default function TeleprompterView({ script, currentLineIndex, currentWordIndex, speed = 1.0, mirror = false }: TeleprompterViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // auto-scroll to current line
    const el = containerRef.current
    if (!el) return
    const lines = Array.from(el.querySelectorAll('.line'))
    const target = lines[currentLineIndex] as HTMLElement
    if (target) {
      // smooth scroll so target is centered
      const top = target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2
      el.scrollTo({ top, behavior: 'smooth' })
    }
  }, [currentLineIndex])

  return (
    <div style={{ overflow: 'hidden', height: 360, background: '#000', color: '#fff', padding: 16 }}>
      <div ref={containerRef} style={{ height: '100%', overflowY: 'auto', transform: mirror ? 'scaleX(-1)' : 'none' }}>
        {script.split(/\r?\n/).map((line: string, i: number) => {
          const isCurrent = i === currentLineIndex
          return (
            <div key={i} className="line" style={{ fontSize: isCurrent ? 28 : 18, opacity: isCurrent ? 1 : 0.5, margin: '12px 0', transition: 'all 200ms' }}>
              {renderHighlightedLine(line, isCurrent ? currentWordIndex : -1)}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function renderHighlightedLine(line: string, highlightIndex: number) {
  if (highlightIndex < 0) return <>{line}</>
  const words = line.split(/(\s+)/)
  // build words only positions
  let idx = 0
  return (
    <>
      {words.map((w, i) => {
        if (/\s+/.test(w)) return <span key={i}>{w}</span>
        const is = idx === highlightIndex
        idx++
        return (
          <span key={i} style={{ background: is ? 'yellow' : 'transparent', color: is ? '#000' : 'inherit', padding: is ? '2px 4px' : 0 }}>{w}</span>
        )
      })}
    </>
  )
}

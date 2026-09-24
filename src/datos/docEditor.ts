import type { JSONContent } from '@tiptap/react'
import { TramoFormato } from './modelo'

// EL GUION SE GUARDA IGUAL QUE ANTES: texto plano + tramos por caracter.
// El editor con formato -Tiptap, 24-09-2026- trabaja con un documento de
// parrafos y marcas, y estas dos funciones traducen en los dos sentidos. El
// motor de voz, la lectura y todo lo guardado siguen viendo solo texto y
// tramos: el editor es lo unico que cambio.
//
// Un parrafo del editor es una linea del texto: se unen con '\n'. Una linea
// vacia es un parrafo vacio.
//
// La vuelta NORMALIZA los tramos: los que se pisan se aplanan, los que
// cruzan un salto de linea se parten en dos, y los que no ponen ni negrita,
// ni color, ni destacado se descartan. Se ve exactamente igual -la lectura
// pinta caracter por caracter, renglones.tsx-, pero la lista no queda identica a la de
// entrada. El texto si vuelve identico, caracter por caracter.

type Marcas = { negrita: boolean; destacado: boolean; color?: TramoFormato['color'] }

function marcasEn(pos: number, tramos: TramoFormato[]): Marcas {
  let negrita = false
  let destacado = false
  let color: TramoFormato['color'] = undefined
  for (const t of tramos) {
    if (pos >= t.desde && pos < t.hasta) {
      if (t.negrita) negrita = true
      if (t.destacado) destacado = true
      if (t.color) color = t.color
    }
  }
  return { negrita, destacado, color }
}

export function aDocumento(texto: string, tramos: TramoFormato[] = []): JSONContent {
  const lineas = (texto || '').split('\n')
  let inicio = 0
  const parrafos: JSONContent[] = lineas.map((linea) => {
    const ini = inicio
    inicio += linea.length + 1
    if (linea.length === 0) return { type: 'paragraph' }

    const cortes = new Set<number>([0, linea.length])
    for (const t of tramos) {
      for (const p of [t.desde - ini, t.hasta - ini]) {
        if (p > 0 && p < linea.length) cortes.add(p)
      }
    }
    const orden = [...cortes].sort((a, b) => a - b)

    const nodos: JSONContent[] = []
    for (let i = 0; i < orden.length - 1; i++) {
      const a = orden[i]
      const b = orden[i + 1]
      const { negrita, destacado, color } = marcasEn(ini + a, tramos)
      const marks: JSONContent['marks'] = []
      if (negrita) marks.push({ type: 'bold' })
      if (destacado) marks.push({ type: 'destacado' })
      if (color) marks.push({ type: 'colorTramo', attrs: { color } })
      const nodo: JSONContent = { type: 'text', text: linea.slice(a, b) }
      if (marks.length > 0) nodo.marks = marks
      nodos.push(nodo)
    }
    return { type: 'paragraph', content: nodos }
  })
  return { type: 'doc', content: parrafos }
}

export function deDocumento(doc: JSONContent): { texto: string; tramos: TramoFormato[] } {
  const lineas: string[] = []
  const tramos: TramoFormato[] = []
  let inicio = 0

  for (const parrafo of doc.content || []) {
    let linea = ''
    for (const nodo of parrafo.content || []) {
      if (nodo.type !== 'text' || !nodo.text) continue
      const desde = inicio + linea.length
      linea += nodo.text
      const hasta = inicio + linea.length

      const negrita = (nodo.marks || []).some((m) => m.type === 'bold')
      const destacado = (nodo.marks || []).some((m) => m.type === 'destacado')
      const marcaColor = (nodo.marks || []).find((m) => m.type === 'colorTramo')
      const color = marcaColor?.attrs?.color as TramoFormato['color'] | undefined
      if (!negrita && !destacado && !color) continue

      const previo = tramos[tramos.length - 1]
      if (
        previo && previo.hasta === desde &&
        Boolean(previo.negrita) === negrita && Boolean(previo.destacado) === destacado && previo.color === color
      ) {
        previo.hasta = hasta
      } else {
        const t: TramoFormato = { desde, hasta }
        if (negrita) t.negrita = true
        if (destacado) t.destacado = true
        if (color) t.color = color
        tramos.push(t)
      }
    }
    lineas.push(linea)
    inicio += linea.length + 1
  }

  return { texto: lineas.join('\n'), tramos }
}

// Llave para comparar dos estados sin que importe como venian escritos los
// tramos: se pasan los dos por la misma normalizacion.
export function llaveGuion(texto: string, tramos: TramoFormato[] = []): string {
  const n = deDocumento(aDocumento(texto, tramos))
  return n.texto + '\u0000' + JSON.stringify(n.tramos)
}

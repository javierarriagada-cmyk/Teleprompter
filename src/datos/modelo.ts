export type TramoFormato = {
  desde: number
  hasta: number
  negrita?: boolean
  color?: 'ambar' | 'celeste' | 'salvia'
}

// LAS TRES PAREJAS DE FONDO Y LETRA DE LA LECTURA, y los tres colores con que se
// puede pintar un tramo de texto.
//
// Viven aca y no en styles.css a proposito: NO SON TEMA, SON DATO. El usuario los
// elige, se guardan con sus ajustes y se dibujan sobre la superficie de lectura,
// que esta exceptuada del sistema visual justamente porque sus colores son suyos.
//
// PAREJAS_COLOR estaba en App.tsx hasta la tarea 46 y se movio aca porque tambien
// la necesita EditorView para dibujar los cuadraditos donde se eligen. Una sola
// fuente de la verdad: si se agrega una pareja, se agrega aca y en ningun otro
// lado. sanitizarColores, en App.tsx, la usa para descartar combinaciones viejas.
export const PAREJAS_COLOR = [
  { fondo: '#000000', letra: '#FFFFFF' },
  { fondo: '#000000', letra: '#F5C24B' },
  { fondo: '#FFFFFF', letra: '#000000' }
]

export const COLORES_TRAMO = {
  ambar: '#F0C070',
  celeste: '#8FB8DE',
  salvia: '#9CC5A1'
}

export type Bloque = {
  id: string        // uuid
  nombre: string    // puede ir vacio
  texto: string
  tramos?: TramoFormato[]
}

export type Guion = {
  id: string
  titulo: string
  idioma: string    // 'es', 'en', 'pt'... codigo corto. NUNCA cablear 'es'.
  creado: number    // epoch ms
  modificado: number
  archivado?: boolean
  bloques: Bloque[]
}

export type ResumenGuion = {
  id: string
  titulo: string
  idioma: string
  modificado: number
  palabras: number
  archivado?: boolean
}

function generarUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function guionNuevo(idioma: string): Guion {
  const ahora = Date.now()
  return {
    id: generarUuid(),
    titulo: 'Sin título',
    idioma,
    creado: ahora,
    modificado: ahora,
    archivado: false,
    bloques: [
      {
        id: generarUuid(),
        nombre: '',
        texto: ''
      }
    ]
  }
}

import { REGEX_ACOTACION } from '../lib/acotaciones'

export function contarPalabras(g: Guion): number {
  let total = 0
  if (!g || !g.bloques) return 0
  for (const b of g.bloques) {
    if (!b.texto) continue
    const sinAcotaciones = b.texto
      .replace(new RegExp(REGEX_ACOTACION.source, REGEX_ACOTACION.flags), ' ')
      .replace(/[\[\(].*$/g, ' ')
    const palabras = sinAcotaciones.trim().split(/\s+/).filter(Boolean)
    total += palabras.length
  }
  return total
}

export function calcularDuracionTexto(palabras: number, ppm: number = 150): string {
  if (palabras <= 0) return '0:00'
  const totalSegundos = Math.round((palabras / ppm) * 60)
  const mins = Math.floor(totalSegundos / 60)
  const segs = totalSegundos % 60
  return `${mins}:${segs.toString().padStart(2, '0')}`
}

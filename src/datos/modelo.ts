export interface TramoFormato {
  desde: number
  hasta: number
  negrita?: boolean
  color?: 'ambar' | 'celeste' | 'salvia'
}

export interface Bloque {
  id: string
  nombre: string
  texto: string
  tramos?: TramoFormato[]
}

export interface Guion {
  id: string
  titulo: string
  idioma: string
  creado: number
  modificado: number
  archivado?: boolean
  bloques: Bloque[]
}

export interface ResumenGuion {
  id: string
  titulo: string
  idioma: string
  modificado: number
  palabras: number
  archivado?: boolean
}

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

export function guionNuevo(idioma = 'es'): Guion {
  const ahora = Date.now()
  return {
    id: 'g-' + ahora + '-' + Math.random().toString(36).substring(2, 7),
    titulo: 'Sin título',
    idioma,
    creado: ahora,
    modificado: ahora,
    archivado: false,
    bloques: [
      {
        id: 'b-' + ahora + '-1',
        nombre: '',
        texto: ''
      }
    ]
  }
}

export function contarPalabras(guion: Guion): number {
  if (!guion || !guion.bloques) return 0
  let total = 0
  for (const b of guion.bloques) {
    if (b && b.texto) {
      const palabras = b.texto.trim().split(/\s+/).filter((p) => p.length > 0)
      total += palabras.length
    }
  }
  return total
}

export function calcularDuracionTexto(palabras: number, ppm = 150): number {
  if (palabras <= 0) return 0
  return Math.round((palabras / ppm) * 60)
}

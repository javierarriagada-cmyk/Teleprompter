// -cobro-visible avisos, 2026-10-28- Parte un texto en (antes, «Sigo+», después)
// para pintar «Sigo+» en negrita y el resto en peso 400. Si no hay «Sigo+», null.

export type PartesResalteSigo = {
  antes: string
  resalte: string
  despues: string
}

export function partirResalteSigo(texto: string): PartesResalteSigo | null {
  const marca = 'Sigo+'
  const i = texto.indexOf(marca)
  if (i < 0) return null
  return {
    antes: texto.slice(0, i),
    resalte: marca,
    despues: texto.slice(i + marca.length)
  }
}

// SELECCIÓN DE TOMAS -tarea 94, 05-10-2026-. TypeScript puro.
//
// Mantener apretada una toma entra al modo. Tocar agrega o quita. Cero
// seleccionadas sale del modo. El tacho saca las tomas de la lista al tiro y
// los archivos esperan 5 s, el mismo plazo del borrado de guiones. Si llega
// otra tanda mientras el aviso sigue, la anterior se confirma: el aviso es uno
// solo y el nuevo lo reemplaza. A segundo plano se confirma al tiro.

export const MS_DESHACER_TOMA = 5000

export function entrarSeleccion(id: string): string[] {
  return [id]
}

export function alternarSeleccion(actual: string[], id: string): string[] {
  return actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]
}

export function seleccionarTodas(ids: string[]): string[] {
  return [...ids]
}

// null: no queda ninguna, y el modo se cierra.
export function trasAlternar(actual: string[], id: string): string[] | null {
  const siguiente = alternarSeleccion(actual, id)
  return siguiente.length === 0 ? null : siguiente
}

export type LoteTomas = { ids: string[]; venceEn: number }

export function loteNuevo(ids: string[], ahora: number): LoteTomas {
  return { ids: [...ids], venceEn: ahora + MS_DESHACER_TOMA }
}

// Los archivos se borran cuando se cumple el plazo, o al tiro si la app deja
// de estar delante. Antes de eso, Deshacer todavía puede devolverlas.
export function debeBorrarArchivos(lote: LoteTomas, ahora: number, aSegundoPlano: boolean): boolean {
  return aSegundoPlano || ahora >= lote.venceEn
}

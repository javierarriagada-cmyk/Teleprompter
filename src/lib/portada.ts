// LA PORTADA Y LOS ARCHIVADOS -guia-sigo, 18-10-2026-. Archivar llama a guardar, que pone
// modificado = ahora -datos/RepositorioIndexedDB.ts-, y la lista llega ordenada por modificado: el
// recién archivado quedaba primero y subía a la tarjeta de la portada y al acceso «Grabar «título»».
// Las dos cosas usan esta función -BibliotecaView y App-, para que no vuelvan a separarse.
export function guionDeLaTarjeta<T extends { archivado?: boolean }>(guiones: T[]): T | undefined {
  return guiones.find((g) => !g.archivado)
}

// EL AVISO AL ARCHIVAR -guia-sigo-: el mismo del borrado -«Deshacer» durante 5 s, App.tsx,
// handleBorrarGuion-, y solo al pasar de no archivado a archivado. Desarchivar, que es también lo que
// hace el Deshacer, no avisa.
export function avisoAlArchivar(
  antes: boolean | undefined,
  ahora: boolean,
  desarchivar: () => void
): { texto: 'guionArchivado'; accionTexto: 'deshacer'; duracionMs: number; alEjecutarAccion: () => void } | null {
  if (!ahora || antes) return null
  return { texto: 'guionArchivado', accionTexto: 'deshacer', duracionMs: 5000, alEjecutarAccion: desarchivar }
}

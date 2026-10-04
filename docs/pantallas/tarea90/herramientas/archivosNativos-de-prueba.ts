// LOS ARCHIVOS DE MENTIRA PARA LAS CAPTURAS DE LA APP REAL -tarea 90-. NO es código de la app: lo usa solo
// el vite de las capturas -ver capturas-app-real.cjs, el plugin que cambia src/lib/archivosNativos.ts por
// este-. Todo lo demás es el de verdad; aquí se cambia lo que en Chrome no hay -la carpeta de las tomas-:
// leerTexto entrega el registro del motor de una toma real del corpus, para que haya subtítulos.
export * from '../../../../src/lib/archivosNativos?original'
import registro from '../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

export async function directorioGrabaciones(): Promise<string> {
  return '/grabaciones'
}
export async function leerTexto(ruta: string): Promise<string> {
  if (ruta.endsWith('.motor.txt')) return registro
  throw new Error('no existe ' + ruta)
}
export async function escribirTexto(): Promise<void> {}

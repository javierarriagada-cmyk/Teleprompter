// LOS ARCHIVOS DE MENTIRA PARA LAS LÁMINAS DE LA TAREA 96 -copia de la idea de la tarea 90-. NO es código
// de la app: lo usa solo el vite de las láminas. Todo lo demás es el de verdad; aquí se cambia lo que en
// Chrome no hay -la carpeta de las tomas-: leerTexto entrega el registro del motor de una toma real del
// corpus, para que haya subtítulos.
export * from '../../../../src/lib/archivosNativos.ts'
import registro from '../../../../src/pruebas/corpus/toma-008a7133-palabras.motor.txt?raw'

export async function directorioGrabaciones(): Promise<string> {
  return '/grabaciones'
}
export async function leerTexto(ruta: string): Promise<string> {
  if (ruta.endsWith('.motor.txt')) return registro
  throw new Error('no existe ' + ruta)
}
export async function analizarVideo(): Promise<never> {
  throw new Error('sin análisis en Chrome')
}

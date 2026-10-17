import { directorioGrabaciones, juntos, leerTexto } from './archivosNativos'

// LOS ARCHIVOS DE UNA TOMA QUE NO SON EL VIDEO -banco-largo, 17-10-2026-, junto al json y el jpg en
// files/grabaciones.
//   <id>.palabras.txt  las palabras con su hora y los calces, de los que salen los subtítulos. Va en
//                      todas las versiones y no se corta -diagnostico.ts, abrirPalabrasDeToma-.
//   <id>.motor.txt     la bitácora del motor, para medir: solo en la APK de prueba -HERRAMIENTAS-.
// Los escribe y los borra tomaVideo.ts.
export const nombrePalabras = (id: string) => `${id}.palabras.txt`
export const nombreBitacora = (id: string) => `${id}.motor.txt`

// DE DÓNDE SALEN LOS SUBTÍTULOS DE UNA TOMA: de su <id>.palabras.txt; una toma de antes, que no lo
// tiene, de su <id>.motor.txt, como hasta el 17-10-2026. null si no hay ninguno -toma de antes del
// registro, o de la versión web-. Los dos tienen el mismo formato y los lee armarSubtitulos. Lo usan el
// visor -ReproductorGrabacion- y el panel de mediciones.
export async function textoDeSubtitulos(id: string): Promise<string | null> {
  const dir = await directorioGrabaciones()
  for (const nombre of [nombrePalabras(id), nombreBitacora(id)]) {
    try {
      const texto = await leerTexto(juntos(dir, nombre))
      if (texto && texto.trim()) return texto
    } catch (e) {
      // no está: se prueba el siguiente
    }
  }
  return null
}

// ESTADOS FORZADOS PARA SACAR LAS CAPTURAS DE LA TAREA 104 -06-10-2026-. SOLO EN `npm run dev`.
//
// Las láminas a, b y c -docs/pantallas/tarea104/programado/- se sacan de la app real en Chrome, sin
// el plugin nativo ni Play. Para eso, con el servidor de desarrollo, la dirección puede llevar:
//   ?t104voz=bajando     la voz queda bajando en 70 % para siempre -lámina a-
//   ?t104voz=sinred      la voz responde "sin conexión" -lámina b-
//   ?t104gestos=bajando  el modelo de gestos queda bajando en 70 % -lámina c-
//   ?t104gestos=sinred   el modelo de gestos responde "sin conexión" -lámina c-
//
// NO VIAJA A NINGUNA CONSTRUCCIÓN. import.meta.env.DEV vale true solo con el servidor de Vite -y en
// las pruebas, donde la dirección no lleva nada-. En vite build -la APK de prueba y la de Play- vale
// false: la función devuelve null siempre y Rollup saca las ramas que la miran.
import type { ResultadoVoz } from '../motor/MotorDeVoz'

export function forzado104(clave: 't104voz' | 't104gestos'): string | null {
  if (!import.meta.env.DEV) return null
  if (typeof location === 'undefined') return null
  return new URLSearchParams(location.search).get(clave)
}

// La respuesta forzada de una descarga -voz o gestos-, o null si no hay nada forzado.
export function descargaForzada(
  clave: 't104voz' | 't104gestos',
  alProgreso: (fraccion: number) => void
): Promise<ResultadoVoz> | null {
  const f = forzado104(clave)
  if (f === 'bajando') {
    alProgreso(0.7)
    return new Promise<ResultadoVoz>(() => {})
  }
  if (f === 'sinred') return Promise.resolve('sin-conexion')
  return null
}

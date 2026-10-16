// Salio de App.tsx el 29-09-2026, tarea 81: el guion vacio y los ajustes guardados al arrancar
// -leerlos de localStorage y descartar lo que no sea valido: colores, motor, tamano de letra-.
// Funciones puras, no dependen del estado de App.
import { Capacitor } from '@capacitor/core'
import { IdMotor } from '../motor/MotorDeVoz'
import { Guion, PAREJAS_COLOR } from '../datos/modelo'
import { PASOS_LETRA } from '../components/estiloLectura'

export const GUION_VACIO: Guion = {
  id: 'vacio',
  titulo: '',
  idioma: 'es',
  creado: 0,
  modificado: 0,
  archivado: false,
  bloques: []
}

// PASOS_LETRA vive en estiloLectura.ts desde el 28-09-2026: LISTO y el editor
// usan el mismo arreglo. Antes estaba aca.
const MOTORES_VALIDOS: IdMotor[] = ['vosk', 'nativo', 'fake']

export function sanitizarColores(rawFondo: any, rawLetra: any): { colorFondo: string; colorLetra: string } {
  if (typeof rawFondo === 'string' && typeof rawLetra === 'string') {
    const f = rawFondo.toUpperCase()
    const l = rawLetra.toUpperCase()
    const coincide = PAREJAS_COLOR.find((p) => p.fondo.toUpperCase() === f && p.letra.toUpperCase() === l)
    if (coincide) {
      return { colorFondo: coincide.fondo, colorLetra: coincide.letra }
    }
  }
  return { colorFondo: PAREJAS_COLOR[0].fondo, colorLetra: PAREJAS_COLOR[0].letra }
}

export function sanitizarEngine(rawEngine: any): IdMotor {
  if (rawEngine && MOTORES_VALIDOS.includes(rawEngine)) {
    return rawEngine
  }
  return Capacitor.isNativePlatform() ? 'nativo' : 'vosk'
}

export function cargarAjustesGuardados() {
  try {
    const raw = localStorage.getItem('teleprompter_ajustes')
    if (raw) {
      return JSON.parse(raw)
    }
  } catch (e) {
  }
  return null
}

// EL RECUADRO EN 0,0 SE CORRIGE UNA SOLA VEZ -recuadro-arrastre, 15-10-2026-. En la 0.9.1 arrastrar el
// recuadro en LISTO terminaba guardando recuadroX 0 y recuadroY 0 -arriba a la izquierda, y de ahí no se
// movía-: ver RecuadroCamara.tsx, «LA CAUSA DEL 0,0». Al abrir esta versión, si los dos están exactamente
// en 0, vuelven a los de fábrica -0.64 y 0.52, los de App.tsx- y se guarda en teleprompter_ajustes. Pasa
// UNA vez: la marca queda puesta, haya o no corrección, y quien después lleve el recuadro a esa esquina a
// propósito no se lo cambia nadie.
export const MARCA_RECUADRO_CORREGIDO = 'sigo_recuadro_cero_corregido'
export const RECUADRO_DE_FABRICA = { x: 0.64, y: 0.52 }
export function corregirRecuadroEnCero(ajustes: any): any {
  try {
    if (localStorage.getItem(MARCA_RECUADRO_CORREGIDO) === '1') return ajustes
    localStorage.setItem(MARCA_RECUADRO_CORREGIDO, '1')
    if (ajustes && ajustes.recuadroX === 0 && ajustes.recuadroY === 0) {
      const corregidos = { ...ajustes, recuadroX: RECUADRO_DE_FABRICA.x, recuadroY: RECUADRO_DE_FABRICA.y }
      localStorage.setItem('teleprompter_ajustes', JSON.stringify(corregidos))
      return corregidos
    }
  } catch (e) {
  }
  return ajustes
}

export function ajustarFuenteValida(val: any): number {
  const num = Number(val)
  if (isNaN(num)) return 24
  if (PASOS_LETRA.includes(num)) return num
  const masCercano = PASOS_LETRA.reduce((prev, curr) =>
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  )
  return masCercano
}

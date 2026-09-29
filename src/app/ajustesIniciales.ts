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

export function ajustarFuenteValida(val: any): number {
  const num = Number(val)
  if (isNaN(num)) return 24
  if (PASOS_LETRA.includes(num)) return num
  const masCercano = PASOS_LETRA.reduce((prev, curr) =>
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  )
  return masCercano
}

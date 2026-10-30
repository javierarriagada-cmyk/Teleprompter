import { pruebaPorTerminar, suscripcionSinVerificar } from './suscripcion'

// AVISOS DE LA PORTADA -orden 2, punto 8, 26-10-2026-. Prueba por terminar y sin conexión para
// verificar Sigo+. Solo lógica; App decide cuándo mostrarlos -al volver a la portada después de
// leer o grabar, nunca al abrir la app-.

const CLAVE_PRUEBA = 'sigo_aviso_fin_prueba_vence'
const CLAVE_SIN_CONEXION_DIA = 'sigo_aviso_sin_conexion_dia'

function diaDe(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function yaAvisoFinPruebaPara(vence: string): boolean {
  try { return localStorage.getItem(CLAVE_PRUEBA) === vence } catch { return false }
}
export function marcarAvisoFinPrueba(vence: string) {
  try { localStorage.setItem(CLAVE_PRUEBA, vence) } catch { /* */ }
}

export function yaAvisoSinConexionHoy(ahoraMs: number = Date.now()): boolean {
  try { return localStorage.getItem(CLAVE_SIN_CONEXION_DIA) === diaDe(ahoraMs) } catch { return false }
}
export function marcarAvisoSinConexionHoy(ahoraMs: number = Date.now()) {
  try { localStorage.setItem(CLAVE_SIN_CONEXION_DIA, diaDe(ahoraMs)) } catch { /* */ }
}
export function olvidarAvisosPortada() {
  try {
    localStorage.removeItem(CLAVE_PRUEBA)
    localStorage.removeItem(CLAVE_SIN_CONEXION_DIA)
  } catch { /* */ }
}

// ¿Mostrar avisoFinPrueba? Una vez por expirationDate, con ≤2 días de prueba.
export function tocaAvisoFinPrueba(ahoraMs: number = Date.now()): { vence: string } | null {
  const p = pruebaPorTerminar(ahoraMs)
  if (!p) return null
  if (yaAvisoFinPruebaPara(p.vence)) return null
  return p
}

// ¿Mostrar sinConexionVerificar? Con Sigo+, requestDate >3 días, como máximo una vez al día.
export function tocaAvisoSinConexion(ahoraMs: number = Date.now()): boolean {
  if (!suscripcionSinVerificar(ahoraMs)) return false
  if (yaAvisoSinConexionHoy(ahoraMs)) return false
  return true
}

// Fecha de vencimiento en el idioma de la app -Intl-.
export function fechaPruebaEnIdioma(venceIso: string, idioma: 'es' | 'en' | 'pt'): string {
  const ms = Date.parse(venceIso)
  if (!Number.isFinite(ms)) return venceIso
  const loc = idioma === 'en' ? 'en' : idioma === 'pt' ? 'pt-BR' : 'es'
  return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' }).format(ms)
}

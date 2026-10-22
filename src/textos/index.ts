import { useSyncExternalStore } from 'react'
import { es, ClaveTexto } from './es'
import { en } from './en'
import { IdiomaApp, idiomaApp, suscribirIdioma } from '../lib/idioma'

export type { ClaveTexto } from './es'
export type { IdiomaApp } from '../lib/idioma'

const TEXTOS = { es, en }

// t(clave, variables?): el texto en el idioma de la app, con {nombre} reemplazado por su
// variable. Una clave sin su variable queda con la llave a la vista -"{n}"- en vez de
// comerse el hueco: un texto roto se ve y se arregla; uno mudo no.
export function t(clave: ClaveTexto, variables?: Record<string, string | number>): string {
  const texto = TEXTOS[idiomaApp()][clave]
  if (!variables) return texto
  return texto.replace(/\{(\w+)\}/g, (llave, nombre) =>
    nombre in variables ? String(variables[nombre]) : llave
  )
}

// EL GANCHO: el componente que lo llama se redibuja cuando cambia el idioma. Todo el que
// llama t() al dibujarse lo usa, aunque su padre ya se redibuje: un componente memorizado
// o uno que cuelga de un portal no se entera por el padre. Devuelve el idioma porque
// algunos lo necesitan para Intl -fechas, numeros-.
export function useTextos(): IdiomaApp {
  return useSyncExternalStore(suscribirIdioma, idiomaApp, idiomaApp)
}

// "Sin título" es tambien un DATO: guionNuevo -modelo.ts- lo guarda como titulo de un guion
// que nadie nombro, y App.tsx y EditorView lo comparan para saber si el guion esta sin
// escribir. Se guarda siempre asi, en espanol, en los dos idiomas: si se guardara traducido,
// cambiar el idioma dejaria guiones "Untitled" que ya nadie reconoce como sin nombre. Para
// mostrarlo se pasa por aca.
export const TITULO_SIN_NOMBRE = 'Sin título'

export function tituloVisible(titulo: string | null | undefined): string {
  const limpio = (titulo || '').trim()
  return limpio === '' || limpio === TITULO_SIN_NOMBRE ? t('sinTitulo') : limpio
}

// El nombre de un guion en la portada -28-09-2026-: su titulo si lo tiene; si no, sus primeras
// palabras -ResumenGuion.inicio-; "Sin titulo" solo cuando el guion esta vacio.
export function tituloOInicio(titulo: string | null | undefined, inicio?: string): string {
  const limpio = (titulo || '').trim()
  if (limpio !== '' && limpio !== TITULO_SIN_NOMBRE) return limpio
  const primeras = (inicio || '').trim()
  return primeras !== '' ? primeras : t('sinTitulo')
}

// Las fechas por idioma, con Intl. En espanol quedan como estaban -27/9 y 27/09-; en
// ingles, el mes escrito corto -Sep 27-, que es como se lee una fecha suelta en una lista.
export function fechaCorta(ts: number, idioma: IdiomaApp = idiomaApp()): string {
  const opciones: Intl.DateTimeFormatOptions = idioma === 'es'
    ? { day: 'numeric', month: 'numeric' }
    : { month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat(idioma === 'es' ? 'es' : 'en-US', opciones).format(new Date(ts))
}

// La de las tomas, que en espanol lleva dos cifras -07/09-. OJO: Intl con 'es' y '2-digit'
// devuelve "7/9" en Node -medido el 27-09-2026-, asi que las cifras se completan a mano sobre
// las partes que entrega Intl.
export function fechaCortaDosDigitos(ts: number, idioma: IdiomaApp = idiomaApp()): string {
  if (idioma !== 'es') return fechaCorta(ts, idioma)
  const partes = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'numeric' }).formatToParts(new Date(ts))
  const parte = (tipo: string) => (partes.find((p) => p.type === tipo)?.value || '').padStart(2, '0')
  return `${parte('day')}/${parte('month')}`
}

export function numeroLocal(n: number, idioma: IdiomaApp = idiomaApp()): string {
  return n.toLocaleString(idioma === 'es' ? 'es' : 'en-US')
}

// -portugues-voz, punto 6, 2026-10-22- Los nombres de los idiomas del guion, en un mapa: el de la
// lista, con mayúscula, y el que va dentro de una frase, en minúscula. Antes cada lugar elegía con
// un ternario de dos idiomas: t(idioma === 'en' ? 'idiomaEn' : 'idiomaEs') -App, EditorView,
// IndicadorPrecarga- y NOMBRE_IDIOMA vivía en EditorView. Con el portugués son tres y el ternario
// mandaba pt a español.
export const NOMBRE_IDIOMA: Record<'es' | 'en' | 'pt', ClaveTexto> = {
  es: 'idiomaEspanol',
  en: 'idiomaIngles',
  pt: 'idiomaPortugues'
}
export const IDIOMA_EN_FRASE: Record<'es' | 'en' | 'pt', ClaveTexto> = {
  es: 'idiomaEs',
  en: 'idiomaEn',
  pt: 'idiomaPt'
}

// El nombre en frase de un idioma cualquiera: si no está en el mapa, el del español, como hacía el
// ternario de antes.
export function idiomaEnFrase(idioma: string | null | undefined): string {
  const clave = IDIOMA_EN_FRASE[(idioma || 'es') as 'es' | 'en' | 'pt'] || IDIOMA_EN_FRASE.es
  return t(clave)
}

// Cada idioma del guion nombrado en su propio idioma, para el menú del editor -como «Español» y
// «English» del selector de Ajustes, que no se traducen-.
export const ENDONIMO_IDIOMA: Record<'es' | 'en' | 'pt', string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português'
}

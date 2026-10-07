// MARCAS DE GUÍA DE PRIMERA VEZ -tarea 105, PASO 2, 06-10-2026-.
//
// Tres marcas, una vez en la vida cada una. Un usuario nuevo: la primera vez que
// usa cada opción sale esa marca; si encuentra las tres en su primera sesión, en
// las tres le sale. Nunca dos a la vista a la vez: si hay una abierta, la otra
// espera a que se cierre; luego al hacer su acción sale.
//
// Cada una queda vista en localStorage para siempre SOLO con «Entendido» o al usar
// el control señalado -mismo try/catch que teleprompter_bienvenida_puesta-. Tocar
// afuera la cierra pero NO la gasta. Idioma: vuelve al pegar/blur de nuevo. Recuadro y
// palma: no vuelven mientras la condición siga igual — recuadro solo si el fondo sale
// de Recuadro y se vuelve a elegir; palma solo si se apagan gestos y se vuelven a encender.
// Antes: afuera no gastaba pero el efecto las volvía a sacar al instante (condición igual).
//
// La lógica es pura para probarla sin montar la UI. MarcaGuia solo dibuja.

export type IdMarcaGuia = 'idioma' | 'recuadro' | 'palma'

export const CLAVE_MARCA_IDIOMA = 'teleprompter_marca_idioma'
export const CLAVE_MARCA_RECUADRO = 'teleprompter_marca_recuadro'
export const CLAVE_MARCA_PALMA = 'teleprompter_marca_palma'

// Id del bloque molde del guion Hola -bienvenida.ts-. No es id de guion.
export const ID_BLOQUE_HOLA = 'b-bienvenida-1'

const CLAVES: Record<IdMarcaGuia, string> = {
  idioma: CLAVE_MARCA_IDIOMA,
  recuadro: CLAVE_MARCA_RECUADRO,
  palma: CLAVE_MARCA_PALMA
}

// Mientras hay una marca a la vista, no sale otra. No se persiste.
// Antes: tope de «una marca por apertura/sesión» — al salir una quedaba true y
// bloqueaba las demás aunque se hubiera cerrado con Entendido.
let marcaALaVista = false

// Tras tocar afuera, recuadro/palma no vuelven mientras la condición siga.
// No se persisten. Idioma no usa esto: su disparo es por acción (pegar/blur).
let suspenderRecuadroHastaSalir = false
let suspenderPalmaHastaApagar = false

export function hayMarcaALaVista(): boolean {
  return marcaALaVista
}

// Antes: nombre hayMarcaEnSesion; el flag ya no es tope de sesión.
export function hayMarcaEnSesion(): boolean {
  return marcaALaVista
}

export function registrarMarcaEnSesion(): void {
  marcaALaVista = true
}

// Al cerrar (Entendido, afuera, usar el control o desmontar): libera para que otra
// pueda salir al hacer su acción en la misma sesión.
// Antes: solo se llamaba al desmontar o tocar afuera; con Entendido o al usar el
// control no se liberaba y las demás quedaban bloqueadas.
export function liberarMarcaEnSesion(): void {
  marcaALaVista = false
}

// Tocar afuera: no gasta forever, pero recuadro/palma no reaparecen con la misma
// condición. Se limpia al salir de Recuadro / apagar gestos (ver debeMostrar*).
export function registrarCierreAfuera(id: IdMarcaGuia): void {
  if (id === 'recuadro') suspenderRecuadroHastaSalir = true
  else if (id === 'palma') suspenderPalmaHastaApagar = true
}

export function marcaYaVista(id: IdMarcaGuia): boolean {
  try {
    return localStorage.getItem(CLAVES[id]) === 'true'
  } catch (e) {
    return false
  }
}

// Queda vista para siempre: «Entendido» o usar el control -ES/EN, arrastrar el recuadro,
// interruptor-. Antes: también al tocar afuera.
export function marcarComoVista(id: IdMarcaGuia): void {
  try {
    localStorage.setItem(CLAVES[id], 'true')
  } catch (e) {}
}

// Solo para las pruebas: deja la marca a la vista y el almacenamiento como al abrir.
export function reiniciarMarcasGuiaParaPruebas(): void {
  marcaALaVista = false
  suspenderRecuadroHastaSalir = false
  suspenderPalmaHastaApagar = false
  try {
    localStorage.removeItem(CLAVE_MARCA_IDIOMA)
    localStorage.removeItem(CLAVE_MARCA_RECUADRO)
    localStorage.removeItem(CLAVE_MARCA_PALMA)
  } catch (e) {}
}

// El Hola: id del GUION que empieza con 'bienvenida-' -App.tsx- O el molde de bloque
// b-bienvenida-1. Antes: solo el id del guion; b-bienvenida-1 se descartaba porque no es
// id de guion, pero el molde también identifica al Hola.
export function esGuionHola(
  idGuion: string | null | undefined,
  idsBloques?: Array<string | null | undefined> | null
): boolean {
  if (typeof idGuion === 'string' && idGuion.startsWith('bienvenida-')) return true
  if (idsBloques && idsBloques.some((id) => id === ID_BLOQUE_HOLA)) return true
  return false
}

// Condiciones comunes: ni durante lectura/toma, ni encima de aviso de voz o diálogo de
// permiso, ni si ya hay otra marca a la vista.
// Antes: también rechazaban el Hola. Eso solo tiene sentido para la marca del idioma.
export type CondicionesComunes = {
  idGuion?: string | null
  idsBloques?: Array<string | null | undefined> | null
  enLecturaOToma: boolean
  hayAvisoVoz: boolean
  hayDialogoPermiso: boolean
}

export function condicionesComunesOk(c: CondicionesComunes): boolean {
  if (c.enLecturaOToma) return false
  if (c.hayAvisoVoz) return false
  if (c.hayDialogoPermiso) return false
  if (marcaALaVista) return false
  return true
}

// Idioma: pegar/importar con al menos una palabra, o blur con ≥12 -mismo umbral que
// detectarIdioma-. Pegado vacío no sale. Si ya tocó ES/EN, no sale -marca vista afuera-.
export type DisparoIdioma = 'pegar' | 'blur'

export function debeMostrarMarcaIdioma(opts: {
  yaVista: boolean
  disparo: DisparoIdioma
  palabras: number
  umbralPalabras: number
} & CondicionesComunes): boolean {
  if (opts.yaVista) return false
  if (esGuionHola(opts.idGuion, opts.idsBloques)) return false
  if (!condicionesComunesOk(opts)) return false
  // Pegar/importar sin texto: no sale.
  if (opts.disparo === 'pegar' && opts.palabras < 1) return false
  if (opts.disparo === 'blur' && opts.palabras < opts.umbralPalabras) return false
  return true
}

// Recuadro: primera vez que el fondo pasa a 'recuadro' con estadoToma listo.
// Si ya arrastró, no sale.
export function debeMostrarMarcaRecuadro(opts: {
  yaVista: boolean
  fondoEsRecuadro: boolean
  estadoListo: boolean
  yaArrastro: boolean
} & CondicionesComunes): boolean {
  // Si el fondo ya no es Recuadro, se puede volver a elegir después.
  // Antes: sin esta suspensión; al tocar afuera el efecto la sacaba otra vez al instante.
  if (!opts.fondoEsRecuadro) {
    suspenderRecuadroHastaSalir = false
  } else if (suspenderRecuadroHastaSalir) {
    return false
  }
  if (opts.yaVista) return false
  if (opts.yaArrastro) return false
  if (!opts.fondoEsRecuadro || !opts.estadoListo) return false
  if (!condicionesComunesOk(opts)) return false
  return true
}

// Palma: primera vez que se enciende Control por gestos con motivoSinGestos nulo.
// Espera mientras el modelo baja -estado === 'bajando'-; preparandoGestos es solo la clave i18n.
// También espera con diálogo de Play -pidiendoGestos- o de permiso.
export function debeMostrarMarcaPalma(opts: {
  yaVista: boolean
  gestosEncendidos: boolean
  motivoSinGestos: 'soloFrontal' | 'noDisponible' | null
  modeloBajando: boolean
  pidiendoGestos: boolean
} & CondicionesComunes): boolean {
  // Si los gestos se apagan, se pueden volver a encender después.
  // Antes: sin esta suspensión; al tocar afuera el efecto la sacaba otra vez al instante.
  if (!opts.gestosEncendidos) {
    suspenderPalmaHastaApagar = false
  } else if (suspenderPalmaHastaApagar) {
    return false
  }
  if (opts.yaVista) return false
  if (!opts.gestosEncendidos) return false
  if (opts.motivoSinGestos != null) return false
  if (opts.modeloBajando) return false
  if (opts.pidiendoGestos) return false
  if (!condicionesComunesOk(opts)) return false
  return true
}

// Si puede salir: marca que hay una a la vista. NO la deja vista: eso solo con
// Entendido o el control. Antes: marcarComoVista(id) al abrir; y el tope era de
// sesión (no se liberaba con Entendido).
export function abrirMarcaSiCorresponde(id: IdMarcaGuia, puede: boolean): boolean {
  if (!puede) return false
  if (marcaYaVista(id)) return false
  if (marcaALaVista) return false
  registrarMarcaEnSesion()
  return true
}

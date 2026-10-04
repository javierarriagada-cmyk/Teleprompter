// LAS MEDICIONES DE EXPORTACIÓN -tarea 87, paso 0, 03-10-2026-.
//
// Antes de programar "Para redes" y "Guardar y compartir" hay que medir en el moto g86 lo que hoy
// no está en ninguna parte: cuánto tarda guardar con subtítulos, qué forma real tiene el archivo,
// qué rotación le pone capgo, y si lo que se ve en LISTO es lo que se graba. Javier usa la APK de
// prueba; Claude lee el registro. Por eso el registro tiene UN formato fijo, el de
// docs/tarea87.txt, P0-5:
//
//   SigoExport v=1 evento=<evento> t_ms=<epoch en ms> clave=valor clave=valor ...
//
// "SigoExport" es la etiqueta del logcat; el mensaje empieza en "v=1". En el panel y al copiar,
// cada línea lleva la etiqueta delante, para que se vea igual que en el encargo. Los valores no
// llevan espacios -se escapan-, la unidad va en el nombre de la clave -_ms, _bytes, _px, _grados,
// _fps, _bps, _hz- y un dato que no se pudo leer es NA. El nativo -MedicionExport.java- arma sus
// líneas con las MISMAS reglas: si se cambia una, se cambia la otra.
//
// Nada de esto viaja a Play: el panel vive detrás de HERRAMIENTAS -lib/herramientas.ts- y el
// nativo solo escribe al logcat si la app es depurable.

export const ETIQUETA_SIGOEXPORT = 'SigoExport'
// El aviso dentro de la página cuando llega una línea del nativo: el panel vuelve a leer el registro.
export const EVENTO_DOM_MEDICION = 'sigo-medicion'
export const VERSION_FORMATO = 1

export type ValorMedicion = string | number | boolean | null | undefined

// Lo que no deja leer la línea de corrido se escapa: el porcentaje primero -para que se pueda
// deshacer-, después el espacio, el igual y los saltos.
export function escaparValor(v: ValorMedicion): string {
  if (v === null || v === undefined) return 'NA'
  if (typeof v === 'number' && !Number.isFinite(v)) return 'NA'
  if (typeof v === 'boolean') return v ? '1' : '0'
  const texto = String(v)
  if (texto === '') return 'NA'
  return texto
    .replace(/%/g, '%25')
    .replace(/ /g, '%20')
    .replace(/=/g, '%3D')
    .replace(/\t/g, '%09')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
}

// El mensaje del logcat, SIN la etiqueta: "v=1 evento=... t_ms=... k=v ...". Las claves van en el
// orden en que llegan: el orden de cada evento lo fija EVENTOS, abajo.
export function lineaSigoExport(evento: string, campos: Array<[string, ValorMedicion]>, tMs: number = Date.now()): string {
  const partes = [`v=${VERSION_FORMATO}`, `evento=${escaparValor(evento)}`, `t_ms=${escaparValor(Math.round(tMs))}`]
  for (const [clave, valor] of campos) partes.push(`${clave}=${escaparValor(valor)}`)
  return partes.join(' ')
}

// Como se ve en el panel y al copiar: con la etiqueta delante.
export function conEtiqueta(mensaje: string): string {
  return `${ETIQUETA_SIGOEXPORT} ${mensaje}`
}

// Para leer una línea de vuelta -lo usan las pruebas y le sirve a Claude-.
export function leerLineaSigoExport(linea: string): Record<string, string> {
  const sinEtiqueta = linea.startsWith(ETIQUETA_SIGOEXPORT + ' ') ? linea.slice(ETIQUETA_SIGOEXPORT.length + 1) : linea
  const out: Record<string, string> = {}
  for (const parte of sinEtiqueta.trim().split(' ')) {
    const i = parte.indexOf('=')
    if (i <= 0) continue
    const crudo = parte.slice(i + 1)
    try {
      out[parte.slice(0, i)] = decodeURIComponent(crudo)
    } catch {
      out[parte.slice(0, i)] = crudo
    }
  }
  return out
}

// El orden de las claves de cada evento -docs/tarea87.txt, P0-5-. Los del nativo -guardado_inicio,
// guardado_fin, capa- se arman en Java con este mismo orden.
export const EVENTOS = {
  equipo: ['modelo', 'android', 'app', 'web'],
  camara: ['aspecto_pedido', 'calidad_pedida', 'calidad_capgo', 'calidades', 'vista_ancho_px', 'vista_alto_px'],
  ensayo: ['id', 'ensayo'],
  forma: ['id', 'dur_ms', 'bytes', 'ancho_px', 'alto_px', 'rot_grados', 'fps', 'bitrate_bps', 'mime_video', 'mime_audio', 'audio_hz', 'audio_canales', 'calidad_toma'],
  guardado_inicio: ['id', 'modo', 'estilo', 'margen', 'dur_toma_ms', 'bytes_entrada', 'rot_grados'],
  capa: ['id', 'H_px', 'W_px', 'letra_px', 'alto_renglon_px', 'renglones', 'base_px', 'ascent_px', 'descent_px', 'contorno_px', 'caja_abajo_px', 'pintado_abajo_px', 'pintado_arriba_px',
    // -tarea 87, subtítulos en horizontal- La letra antes del ajuste, el renglón más ancho a esa letra,
    // el ancho útil -88 %- y el largo de renglón de la forma del cuadro -32 o 47-.
    'letra_base_px', 'renglon_ancho_px', 'util_px', 'letras_renglon'],
  guardado_fin: ['id', 'resultado', 'msTransformer', 'msCopia', 'msGuardado', 'bytes_salida', 'cuadros', 'bitrate_salida_bps', 'error'],
  copias_borradas: ['pedidas', 'borradas', 'fallidas']
} as const

export type EventoMedicion = keyof typeof EVENTOS

// Arma la línea de un evento conocido, con sus claves en el orden fijo. Una clave que no viene
// queda NA: así todas las líneas de un evento tienen las mismas columnas.
export function lineaDeEvento(evento: EventoMedicion, datos: Partial<Record<string, ValorMedicion>>, tMs: number = Date.now()): string {
  const claves = EVENTOS[evento] as readonly string[]
  return lineaSigoExport(evento, claves.map((c) => [c, datos[c]] as [string, ValorMedicion]), tMs)
}

// LOS DIEZ ENSAYOS DEL MOTO G86 -docs/tarea87.txt, P0-6-. Los nombres son los del encargo: Claude
// cruza por ellos.
export const ENSAYOS = [
  'v1080-10s',
  'v720-10s',
  'v480-10s',
  'h1080-10s',
  'giro-30s',
  'acostado-10s',
  'vista-4x3',
  't1min',
  't5min',
  't20min'
] as const
export type Ensayo = typeof ENSAYOS[number]

// EL ENSAYO SE MARCA ANTES DE GRABAR. "La toma siguiente que se corte queda anotada con ese
// ensayo": se guarda cuándo se eligió, y la primera toma creada DESPUÉS de eso -que todavía no
// tenga ensayo- se lo lleva. No se toca el corte de la toma -tomaVideo.ts-: se resuelve al mirar
// la lista, con la hora de creación de cada toma.
export type EnsayoPendiente = { ensayo: Ensayo; desdeMs: number }
export type EstadoEnsayos = { pendiente: EnsayoPendiente | null; asignados: Record<string, Ensayo> }

export function asignarEnsayoPendiente(
  tomas: Array<{ id: string; creado: number }>,
  estado: EstadoEnsayos
): { estado: EstadoEnsayos; asignada: { id: string; ensayo: Ensayo } | null } {
  const p = estado.pendiente
  if (!p) return { estado, asignada: null }
  const candidatas = tomas
    .filter((t) => t.creado >= p.desdeMs && !(t.id in estado.asignados))
    .sort((a, b) => a.creado - b.creado)
  const primera = candidatas[0]
  if (!primera) return { estado, asignada: null }
  return {
    estado: { pendiente: null, asignados: { ...estado.asignados, [primera.id]: p.ensayo } },
    asignada: { id: primera.id, ensayo: p.ensayo }
  }
}

// LO QUE QUEDA ENTRE APERTURAS DEL PANEL -localStorage, solo de este panel-: el registro, el
// ensayo pendiente y los asignados, y las copias de medición que el panel dejó en la galería -para
// poder borrarlas después, y solo esas-.
const CLAVE_REGISTRO = 'sigo_mediciones_registro'
const CLAVE_ENSAYOS = 'sigo_mediciones_ensayos'
const CLAVE_COPIAS = 'sigo_mediciones_copias'
// Un tope para que un registro olvidado no crezca sin fin: miles de líneas alcanzan para los diez
// ensayos varias veces.
export const MAX_LINEAS_REGISTRO = 5000

function leerJson<T>(clave: string, omision: T): T {
  try {
    const crudo = localStorage.getItem(clave)
    if (!crudo) return omision
    const v = JSON.parse(crudo)
    return v ?? omision
  } catch {
    return omision
  }
}

function escribirJson(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // sin almacenamiento, el panel sigue andando con lo que tiene en memoria
  }
}

export function registroGuardado(): string[] {
  const v = leerJson<unknown>(CLAVE_REGISTRO, [])
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function agregarAlRegistro(lineaConEtiqueta: string): string[] {
  const lineas = [...registroGuardado(), lineaConEtiqueta].slice(-MAX_LINEAS_REGISTRO)
  escribirJson(CLAVE_REGISTRO, lineas)
  return lineas
}

export function vaciarRegistro(): void {
  escribirJson(CLAVE_REGISTRO, [])
}

export function estadoEnsayosGuardado(): EstadoEnsayos {
  const v = leerJson<any>(CLAVE_ENSAYOS, null)
  const asignados: Record<string, Ensayo> = {}
  if (v && v.asignados && typeof v.asignados === 'object') {
    for (const [id, e] of Object.entries(v.asignados)) {
      if ((ENSAYOS as readonly string[]).includes(e as string)) asignados[id] = e as Ensayo
    }
  }
  const p = v && v.pendiente
  const pendiente = p && (ENSAYOS as readonly string[]).includes(p.ensayo) && typeof p.desdeMs === 'number'
    ? { ensayo: p.ensayo as Ensayo, desdeMs: p.desdeMs }
    : null
  return { pendiente, asignados }
}

export function guardarEstadoEnsayos(e: EstadoEnsayos): void {
  escribirJson(CLAVE_ENSAYOS, e)
}

export type CopiaDeMedicion = { uri: string; id: string; tMs: number }

export function copiasDeMedicion(): CopiaDeMedicion[] {
  const v = leerJson<unknown>(CLAVE_COPIAS, [])
  if (!Array.isArray(v)) return []
  return v.filter((c: any) => c && typeof c.uri === 'string' && c.uri !== '' && typeof c.id === 'string')
}

export function anotarCopiaDeMedicion(c: CopiaDeMedicion): CopiaDeMedicion[] {
  const lista = [...copiasDeMedicion().filter((x) => x.uri !== c.uri), c]
  escribirJson(CLAVE_COPIAS, lista)
  return lista
}

// Deja en la lista solo las que NO se pudieron borrar: así se pueden reintentar.
export function quitarCopiasDeMedicion(uris: string[]): CopiaDeMedicion[] {
  const fuera = new Set(uris)
  const lista = copiasDeMedicion().filter((c) => !fuera.has(c.uri))
  escribirJson(CLAVE_COPIAS, lista)
  return lista
}

// LAS LÍNEAS DEL NATIVO -guardado_inicio, capa, guardado_fin- llegan por el evento "medicion" del
// plugin. Las junta App mientras la app está abierta -aunque el panel esté cerrado: el guardado
// desde el visor también se mide-, y las deja en el registro.
export function recibirLineaNativa(mensaje: string): void {
  if (!mensaje) return
  agregarAlRegistro(conEtiqueta(mensaje))
  try {
    window.dispatchEvent(new Event(EVENTO_DOM_MEDICION))
  } catch {
    // sin ventana -pruebas de Node- no hay a quién avisar
  }
}

// El nombre del archivo al descargar el registro: sigoexport-2026-10-03-2310.txt.
export function nombreDescarga(f: Date = new Date()): string {
  const dd = (n: number) => String(n).padStart(2, '0')
  return `sigoexport-${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}-${dd(f.getHours())}${dd(f.getMinutes())}.txt`
}

// Igual que descargar() de lib/diagnostico.ts, con otro texto y otro nombre. No se toca
// diagnostico.ts: ese es el registro de la lectura.
export function descargarTexto(texto: string, nombre: string = nombreDescarga()): void {
  const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

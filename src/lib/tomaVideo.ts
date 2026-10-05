import { Capacitor } from '@capacitor/core'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'
import { RepositorioGrabaciones } from '../datos/RepositorioGrabaciones'
import {
  camaraEncendida,
  empezarGrabacionVideo,
  cortarGrabacionVideo,
  errorDelUltimoCorte,
  grabacionNativaEnCurso
} from './camara'
import {
  analizarVideo,
  borrarArchivo,
  buscarMp4Recientes,
  bytesDe,
  directorioGrabaciones,
  existeEnGaleria,
  extraerMiniatura,
  escribirTexto,
  juntos,
  leerTexto,
  listarDirectorio,
  moverArchivo
} from './archivosNativos'
import type { AnalisisVideo } from './archivosNativos'
import { orientacionDeToma } from './orientacion'
import { anotarOrientacion } from './medicionesTarea87'
import {
  SidecarToma,
  sidecarInicial,
  parsearSidecar,
  marcarLista,
  marcarIncompleta,
  emparejarMp4PorTiempo
} from './sidecar'
import { veredictoMudo } from './detectorMudo'
import { tramosACortar, tramosQueQuedan, type PausaToma } from './tramos'
import type { OrigenPausa } from './pausaToma'
import { activarDiagnostico, diagnosticoActivo, comoTexto } from './diagnostico'

const MS_HEARTBEAT = 2000

type SesionToma = {
  sidecar: SidecarToma
  dir: string
  rutaSidecar: string
  heartbeat: ReturnType<typeof setInterval> | null
  // EL REGISTRO DEL MOTOR DE ESTA TOMA -24-09-2026-. Se enciende cuando empieza el
  // video y se escribe al lado del mp4 como <id>.motor.txt: lo que oyo el
  // reconocedor con el tiempo de cada palabra, donde lo ubico el seguidor, que
  // renglon mostraba la pantalla y que palabras tenia cada renglon. Es la vara del
  // plan del motor, medida en el telefono y con el reconocedor nativo, que es el que
  // va en la aplicacion. No cambia nada de la lectura.
  cabeceraMotor: string
  diagnosticoAntes: boolean
  inicioVideoEpochMs: number
}

let sesion: SesionToma | null = null

export function tomaEnCurso(): boolean {
  return sesion !== null
}

export function idTomaEnCurso(): string | null {
  return sesion ? sesion.sidecar.id : null
}

export function anotarFraseOida(): void {
  if (sesion) sesion.sidecar.frasesOidas += 1
}

async function persistirSidecar(s: SesionToma): Promise<void> {
  try {
    await escribirTexto(s.rutaSidecar, JSON.stringify(s.sidecar))
  } catch (e) {
    console.warn('[tomaVideo] no se pudo escribir sidecar:', e)
  }
}

// LAS PAUSAS DE LA TOMA -tarea 88, 04-10-2026, docs/tarea88.txt, sección 4-. App las abre y las cierra
// con la hora de Date.now() -la máquina de pausaToma.ts-; aquí pasan al RELOJ DEL VIDEO -el mismo cero
// que el registro del motor, inicioVideoEpochMs- y se escriben al tiro en el sidecar, además del
// latido. Sin toma andando -Leer sin cámara- no hacen nada: Pausa solo pausa la voz.
export function abrirPausa(desdeEpochMs: number, origen: OrigenPausa): void {
  const s = sesion
  if (!s || !s.inicioVideoEpochMs) return
  const pausas = s.sidecar.pausas || []
  if (pausas.some((p) => p.hastaMs === null)) return
  s.sidecar.pausas = [...pausas, { desdeMs: Math.round(desdeEpochMs - s.inicioVideoEpochMs), hastaMs: null, origen }]
  persistirSidecar(s)
}

export function cerrarPausa(hastaEpochMs: number): void {
  const s = sesion
  if (!s || !s.sidecar.pausas) return
  const abierta = s.sidecar.pausas.findIndex((p) => p.hastaMs === null)
  if (abierta < 0) return
  const p = s.sidecar.pausas[abierta]
  const hastaMs = Math.max(p.desdeMs, Math.round(hastaEpochMs - s.inicioVideoEpochMs))
  s.sidecar.pausas = s.sidecar.pausas.map((x, i) => (i === abierta ? { ...x, hastaMs } : x))
  persistirSidecar(s)
}

// La hora de Date.now() en el reloj del video, para los registros Sigo88 de App. Sin toma andando, null.
export function msDelVideo(epochMs: number): number | null {
  const s = sesion
  if (!s || !s.inicioVideoEpochMs) return null
  return Math.round(epochMs - s.inicioVideoEpochMs)
}

// Una pausa abierta se cierra en el final de la toma: Parar en pausa termina donde se pausó.
function cerrarAbiertas(pausas: PausaToma[] | undefined, duracionMs: number): PausaToma[] | undefined {
  if (!pausas || pausas.length === 0) return pausas
  return pausas.map((p) => (p.hastaMs === null ? { ...p, hastaMs: Math.max(p.desdeMs, duracionMs) } : p))
}

// La miniatura sale del primer tramo que queda: a 1 s de su comienzo, o en su medio si dura menos de
// 2 s. Sin pausas, a 1 s como siempre.
export function msDeMiniatura(pausas: PausaToma[] | undefined, duracionMs: number): number {
  if (!pausas || pausas.length === 0) return 1000
  const primero = tramosQueQuedan(tramosACortar(pausas, duracionMs), duracionMs)[0]
  if (!primero) return 1000
  const largo = primero.hastaMs - primero.desdeMs
  return Math.round(largo < 2000 ? primero.desdeMs + largo / 2 : primero.desdeMs + 1000)
}

function detenerHeartbeat(): void {
  if (sesion && sesion.heartbeat) {
    clearInterval(sesion.heartbeat)
    sesion.heartbeat = null
  }
}

export async function iniciarTomaVideo(opts: {
  id: string
  guionId?: string
  tituloGuion: string
  calidad?: string
  // Lo que hace falta para leer el registro despues: motor, letra, ancho, guion.
  cabeceraMotor?: string
}): Promise<boolean> {
  if (sesion) return true
  if (!Capacitor.isNativePlatform()) return false
  if (!camaraEncendida()) return false

  let dir = ''
  try {
    dir = await directorioGrabaciones()
  } catch (e) {
    console.warn('[tomaVideo] sin directorio de grabaciones:', e)
    return false
  }

  const rutaSidecar = juntos(dir, `${opts.id}.json`)
  const rutaPart = juntos(dir, `${opts.id}.mp4.part`)
  const sidecar = sidecarInicial({
    id: opts.id,
    guionId: opts.guionId,
    tituloGuion: opts.tituloGuion,
    rutaPart,
    calidad: opts.calidad
  })

  const s: SesionToma = {
    sidecar,
    dir,
    rutaSidecar,
    heartbeat: null,
    cabeceraMotor: opts.cabeceraMotor || '',
    diagnosticoAntes: diagnosticoActivo(),
    inicioVideoEpochMs: 0
  }
  sesion = s
  await persistirSidecar(s)

  try {
    await empezarGrabacionVideo()
  } catch (e) {
    console.warn('[tomaVideo] startRecordVideo fallo; la lectura sigue:', e)
    s.sidecar = marcarIncompleta(s.sidecar)
    await persistirSidecar(s)
    sesion = null
    return false
  }

  // El cero del registro es el arranque del video: el milisegundo N del registro es,
  // con el error de lo que tarda la camara en empezar a escribir, el N del mp4.
  s.inicioVideoEpochMs = Date.now()
  activarDiagnostico(true)

  s.heartbeat = setInterval(() => {
    if (!sesion) return
    sesion.sidecar.milisegundos = Date.now() - sesion.sidecar.creado
    persistirSidecar(sesion)
  }, MS_HEARTBEAT)

  return true
}

export async function cortarTomaVideo(opts?: {
  incompleta?: boolean
}): Promise<ResumenGrabacion | null> {
  if (!sesion) return null
  const s = sesion
  detenerHeartbeat()
  s.sidecar.milisegundos = Math.max(s.sidecar.milisegundos, Date.now() - s.sidecar.creado)

  let rutaPlugin: string | null = null
  let motivoCorte: string | null = null
  if (grabacionNativaEnCurso()) {
    rutaPlugin = await cortarGrabacionVideo()
    if (!rutaPlugin) motivoCorte = errorDelUltimoCorte() || 'sin ruta'
  } else {
    motivoCorte = 'la grabacion ya no estaba en curso al cortar'
  }

  // EL VIDEO QUE EL CORTE NO DEVOLVIO -24-09-2026-. El plugin de la camara rechaza
  // stopRecordVideo cuando CameraX termina el archivo con un error que no sea de limite
  // -CameraXView.handleRecordingFinalized-, pero el archivo muchas veces queda ENTERO en su
  // carpeta: el de la toma a4371d2b de Javier, 96 MB, 15:42. Y si alguien corto la grabacion
  // antes -apagarCamara la corta y descarta la ruta- tampoco hay ruta. En los dos casos la toma
  // se guardaba "lista" con 0 bytes y un .part que no existe; como "lista", la recuperacion
  // del arranque no la volvia a mirar, y dejo de aparecer la toma "incompleta" de siempre. Aca
  // se busca el video_<epoch> por la hora, igual que en recuperarTomasPendientes, y la toma
  // queda INCOMPLETA: con su video si se encontro, y si no, para que el arranque lo reintente.
  let recuperadoPorHora = false
  if (!rutaPlugin) {
    try {
      const pareja = emparejarMp4PorTiempo({
        creado: s.sidecar.creado,
        milisegundos: s.sidecar.milisegundos,
        candidatos: await buscarMp4Recientes()
      })
      if (pareja) {
        rutaPlugin = pareja
        recuperadoPorHora = true
      }
    } catch (e) {
      console.warn('[tomaVideo] no se pudo buscar el video por la hora:', e)
    }
    console.warn('[tomaVideo] el corte no devolvio el video:', motivoCorte, recuperadoPorHora ? '- recuperado por la hora: ' + rutaPlugin : '- no se encontro')
  }
  if (rutaPlugin) s.sidecar.rutaPlugin = rutaPlugin

  const incompleta = Boolean(opts?.incompleta) || motivoCorte !== null
  let rutaFinal = juntos(s.dir, incompleta ? `${s.sidecar.id}.mp4.part` : `${s.sidecar.id}.mp4`)

  const origen = rutaPlugin || s.sidecar.rutaPart
  if (origen) {
    try {
      rutaFinal = await moverArchivo(origen, rutaFinal)
    } catch (e) {
      console.warn('[tomaVideo] no se pudo mover el mp4:', e)
      rutaFinal = origen
    }
  }

  let analisis = {
    duracionMs: s.sidecar.milisegundos,
    bytes: 0,
    tienePistaAudio: null as boolean | null,
    nivelRmsDb: null as number | null
  }
  try {
    analisis = await analizarVideo(rutaFinal)
  } catch (e) {
    console.warn('[tomaVideo] analisis no disponible:', e)
    try {
      analisis.bytes = await bytesDe(rutaFinal)
    } catch {}
  }

  // -tarea 88- La pausa que quedó abierta se cierra en la duración medida.
  if (s.sidecar.pausas) s.sidecar.pausas = cerrarAbiertas(s.sidecar.pausas, analisis.duracionMs || s.sidecar.milisegundos)

  let rutaMiniatura = juntos(s.dir, `${s.sidecar.id}.jpg`)
  try {
    // Antes: extraerMiniatura(rutaFinal, rutaMiniatura, 1000). Sin pausas sigue en 1000.
    rutaMiniatura = await extraerMiniatura(rutaFinal, rutaMiniatura, msDeMiniatura(s.sidecar.pausas, analisis.duracionMs || s.sidecar.milisegundos))
  } catch (e) {
    console.warn('[tomaVideo] miniatura no se pudo extraer:', e)
    rutaMiniatura = ''
  }

  const veredicto = veredictoMudo({
    tienePistaAudio: analisis.tienePistaAudio,
    nivelRmsDb: analisis.nivelRmsDb ?? null,
    frasesOidas: s.sidecar.frasesOidas
  })

  // El registro del motor, junto al mp4. Si no se puede escribir, la toma sigue
  // igual: es un instrumento, no parte de la toma.
  try {
    const texto = [
      '# REGISTRO DEL MOTOR DE UNA TOMA',
      `# toma: ${s.sidecar.id}`,
      ...(motivoCorte ? [`# corte con problema: ${motivoCorte}${recuperadoPorHora ? ' (video recuperado por la hora)' : ' (sin video)'}`] : []),
      `# inicio del video (epoch ms): ${s.inicioVideoEpochMs}`,
      // -tarea 88- Una línea por pausa, en el reloj del video. El resto del registro no cambia.
      ...(s.sidecar.pausas || []).map((p) => `# pausa desdeMs=${p.desdeMs} hastaMs=${p.hastaMs} origen=${p.origen}`),
      s.cabeceraMotor,
      '',
      comoTexto()
    ].join('\n')
    await escribirTexto(juntos(s.dir, `${s.sidecar.id}.motor.txt`), texto)
  } catch (e) {
    console.warn('[tomaVideo] no se pudo escribir el registro del motor:', e)
  }
  activarDiagnostico(s.diagnosticoAntes)

  s.sidecar.bytes = analisis.bytes
  s.sidecar.milisegundos = analisis.duracionMs || s.sidecar.milisegundos
  s.sidecar.tienePistaAudio = analisis.tienePistaAudio
  s.sidecar.rutaMp4 = rutaFinal
  // -tarea 87, parte C, 04-10-2026- Cómo se ve la toma. Un APK viejo no manda ancho ni alto: queda
  // sin el dato y el visor la analiza al abrirla.
  const orientacion = orientacionDeToma(analisis as Partial<AnalisisVideo>) ?? undefined
  if (orientacion) s.sidecar.orientacion = orientacion
  anotarOrientacion(s.sidecar.id, analisis as Partial<AnalisisVideo>, s.sidecar.calidad, 'corte')
  s.sidecar = incompleta ? marcarIncompleta(s.sidecar) : marcarLista(s.sidecar)
  await persistirSidecar(s)

  const resumen = grabacionNueva({
    id: s.sidecar.id,
    guionId: s.sidecar.guionId,
    tituloGuion: s.sidecar.tituloGuion,
    creado: s.sidecar.creado,
    duracionMs: s.sidecar.milisegundos,
    bytes: s.sidecar.bytes,
    ruta: rutaFinal,
    rutaMiniatura,
    tieneAudio: analisis.tienePistaAudio === true && !veredicto.mudo,
    incompleta,
    avisoMudo: veredicto.aviso || undefined,
    errorMudo: veredicto.errorDuro || undefined,
    calidad: s.sidecar.calidad,
    orientacion,
    pausas: s.sidecar.pausas
  })

  sesion = null
  return resumen
}

async function sidecarDeNombre(dir: string, nombre: string): Promise<SidecarToma | null> {
  if (!nombre.endsWith('.json')) return null
  try {
    return parsearSidecar(await leerTexto(juntos(dir, nombre)))
  } catch {
    return null
  }
}

export async function recuperarTomasPendientes(
  repo: RepositorioGrabaciones
): Promise<ResumenGrabacion[]> {
  const existentes = await repo.listar()
  if (!Capacitor.isNativePlatform()) return existentes

  let dir = ''
  try {
    dir = await directorioGrabaciones()
  } catch {
    return existentes
  }

  let nombres: string[] = []
  try {
    nombres = await listarDirectorio(dir)
  } catch {
    return existentes
  }

  // HUERFANOS SIN SIDECAR: no se adoptan.
  //
  // El sidecar se escribe ANTES de startRecordVideo. El agujero que queda
  // es mas chico que "murio entre el start y el json": persistirSidecar
  // traga un error de escritura y recien despues el plugin crea el mp4.
  // Adoptar cualquier mp4 reciente sin sidecar mezclaria tomas de la
  // pantalla de prueba, basura de Capgo y archivos de otra sesion.
  // Queda como sabido: un mp4 huerfano sin json no entra al indice.
  const porId = new Map(existentes.map((g) => [g.id, g]))
  const sidecars: SidecarToma[] = []
  for (const n of nombres) {
    const s = await sidecarDeNombre(dir, n)
    if (s) sidecars.push(s)
  }

  const recientes = await buscarMp4Recientes()
  const ocupadas = new Set<string>()
  for (const g of existentes) {
    if (g.ruta && g.bytes > 0) ocupadas.add(g.ruta)
  }

  for (const s of sidecars) {
    if (s.estado === 'lista' && porId.has(s.id)) {
      const ya = porId.get(s.id)!
      const acusacionDudosa =
        (ya.errorMudo || ya.avisoMudo || ya.tieneAudio === false) &&
        (ya.bytes === 0 || (ya.ruta || '').startsWith('file:'))
      if (!acusacionDudosa) continue
    }

    const enCarpetaPropia =
      nombres.includes(`${s.id}.mp4`) || nombres.includes(`${s.id}.mp4.part`)
    let ruta = s.rutaMp4 || s.rutaPart || juntos(dir, `${s.id}.mp4.part`)
    if (nombres.includes(`${s.id}.mp4`)) ruta = juntos(dir, `${s.id}.mp4`)
    else if (nombres.includes(`${s.id}.mp4.part`)) ruta = juntos(dir, `${s.id}.mp4.part`)
    else if (s.rutaPlugin) ruta = s.rutaPlugin
    else {
      // Cinco mp4 de prueba en la carpeta del plugin: "hay uno solo"
      // se rinde. La marca video_<epoch> cae ~100 ms despues de creado.
      const pareja = emparejarMp4PorTiempo({
        creado: s.creado,
        milisegundos: s.milisegundos,
        candidatos: recientes,
        ocupadas
      })
      if (pareja) ruta = pareja
    }

    let analisis = {
      duracionMs: s.milisegundos,
      bytes: s.bytes,
      // bytes=0 + false es el rastro del analisis que no encontro el
      // archivo (URI file://). No se reusa como acusacion.
      tienePistaAudio: s.bytes > 0 && typeof s.tienePistaAudio === 'boolean' ? s.tienePistaAudio : null,
      nivelRmsDb: null as number | null
    }
    try {
      analisis = await analizarVideo(ruta)
    } catch {
      try {
        analisis.bytes = await bytesDe(ruta)
      } catch {}
    }

    // .part fantasma o rutaPlugin que stop nunca devolvio: 0 bytes.
    // El huerfano video_<epoch> sigue en la carpeta del plugin.
    if (!enCarpetaPropia && analisis.bytes === 0) {
      const pareja = emparejarMp4PorTiempo({
        creado: s.creado,
        milisegundos: s.milisegundos,
        candidatos: recientes,
        ocupadas
      })
      if (pareja && pareja !== ruta) {
        ruta = pareja
        try {
          analisis = await analizarVideo(ruta)
        } catch {
          try {
            analisis.bytes = await bytesDe(ruta)
          } catch {}
        }
      }
    }

    // -tarea 88- Una pausa abierta -la app murió en pausa- se cierra en el final del archivo.
    const pausas = cerrarAbiertas(s.pausas, analisis.duracionMs || s.milisegundos)

    let rutaMiniatura = juntos(dir, `${s.id}.jpg`)
    try {
      // Antes: extraerMiniatura(ruta, rutaMiniatura, 1000). Sin pausas sigue en 1000.
      rutaMiniatura = await extraerMiniatura(ruta, rutaMiniatura, msDeMiniatura(pausas, analisis.duracionMs || s.milisegundos))
    } catch {
      rutaMiniatura = nombres.includes(`${s.id}.jpg`) ? juntos(dir, `${s.id}.jpg`) : ''
    }

    const incompleta = s.estado !== 'lista'
    const veredicto = veredictoMudo({
      tienePistaAudio: analisis.tienePistaAudio,
      nivelRmsDb: analisis.nivelRmsDb ?? null,
      frasesOidas: s.frasesOidas
    })
    // -tarea 87, parte C- La orientación, también al recuperar: la del análisis de ahora o, si el
    // APK no la da, la que ya traía el sidecar.
    const orientacion = orientacionDeToma(analisis as Partial<AnalisisVideo>) ?? s.orientacion
    if (orientacionDeToma(analisis as Partial<AnalisisVideo>)) anotarOrientacion(s.id, analisis as Partial<AnalisisVideo>, s.calidad, 'recuperada')

    const resumen = grabacionNueva({
      id: s.id,
      guionId: s.guionId,
      tituloGuion: s.tituloGuion,
      creado: s.creado,
      duracionMs: analisis.duracionMs || s.milisegundos,
      bytes: analisis.bytes || s.bytes,
      ruta,
      rutaMiniatura,
      tieneAudio: analisis.tienePistaAudio === true && !veredicto.mudo,
      incompleta,
      avisoMudo: veredicto.aviso || undefined,
      errorMudo: veredicto.errorDuro || undefined,
      calidad: s.calidad,
      orientacion,
      pausas
    })
    await repo.guardar(resumen)
    porId.set(resumen.id, resumen)
    if (ruta && resumen.bytes > 0) ocupadas.add(ruta)

    try {
      await escribirTexto(
        juntos(dir, `${s.id}.json`),
        // -tarea 87- Con la orientación. Antes: marcarIncompleta(s, ...) : marcarLista(s).
        // -tarea 88- Y con las pausas cerradas, si había. Antes: { ...s, orientacion }.
        JSON.stringify(incompleta ? marcarIncompleta({ ...s, orientacion, ...(pausas ? { pausas } : {}) }, { rutaMp4: ruta, bytes: resumen.bytes, milisegundos: resumen.duracionMs }) : marcarLista({ ...s, orientacion, ...(pausas ? { pausas } : {}) }))
      )
    } catch {}
  }

  const lista = Array.from(porId.values())
  lista.sort((a, b) => b.creado - a.creado)
  return lista
}

// LAS TOMAS CUYO VIDEO SE BORRO DESDE LA GALERIA, FUERA -24-09-2026-. Una toma
// guardada vive solo en la galeria -una sola copia por toma-. Si alguien la borra
// desde ahi, en Sigo "solo no aparece" -Javier-: sin aviso. Se quitan del indice
// y se limpia lo que quedaba de ellas en la carpeta de Sigo -miniatura, sidecar,
// registro-. Si no se puede preguntar -version web, o falla la consulta-, la toma
// se queda: nunca se borra algo por no haber podido mirar.
export async function quitarTomasSinVideo(repo: RepositorioGrabaciones): Promise<ResumenGrabacion[]> {
  const todas = await repo.listar()
  if (!Capacitor.isNativePlatform()) return todas
  const quedan: ResumenGrabacion[] = []
  for (const g of todas) {
    // TAMBIÉN LAS QUE NUNCA SE GUARDARON EN LA GALERÍA -tarea 85, 29-09-2026-. Antes una toma
    // sin galeriaUri se quedaba siempre. Tras restaurar un respaldo -tarea 84: la base IndexedDB
    // vuelve, files/grabaciones no- esas tomas volvían a la lista sin su video, y tocarlas no
    // mostraba nada. Decisión de Javier: no aparecen. Para mirarlas basta bytesDe: el lado nativo
    // responde 0 si el archivo no existe. Sin ruta, o con una ruta content:// -que bytesDe no
    // sabe abrir y daría 0 aunque el video esté-, no se puede mirar, y la toma se queda.
    if (!g.galeriaUri) {
      if (!g.ruta || g.ruta.startsWith('content:')) { quedan.push(g); continue }
      let bytes = 1
      try {
        bytes = await bytesDe(g.ruta)
      } catch {
        bytes = 1
      }
      if (bytes > 0) { quedan.push(g); continue }
      try {
        await borrarGrabacionEnDisco(g)
        await repo.borrar(g.id)
      } catch {
        quedan.push(g)
      }
      continue
    }
    let existe = true
    try {
      existe = await existeEnGaleria(g.galeriaUri)
    } catch {
      existe = true
    }
    if (existe) { quedan.push(g); continue }
    try {
      await borrarGrabacionEnDisco(g)
      await repo.borrar(g.id)
    } catch {
      quedan.push(g)
    }
  }
  return quedan
}

export async function borrarGrabacionEnDisco(g: ResumenGrabacion): Promise<void> {
  // g.ruta puede ser file://.../Movies/CameraPreview/video_*.mp4 si el
  // mover no corrio. archivoDe del lado nativo lo resuelve; aca se manda
  // la ruta tal cual. El json y el jpg viven en files/grabaciones/{id}.*
  // aunque el mp4 se haya quedado en la carpeta del plugin.
  await borrarArchivo(g.ruta)
  await borrarArchivo(g.rutaMiniatura)
  try {
    const dir = await directorioGrabaciones()
    await borrarArchivo(juntos(dir, `${g.id}.json`))
    await borrarArchivo(juntos(dir, `${g.id}.mp4`))
    await borrarArchivo(juntos(dir, `${g.id}.mp4.part`))
    await borrarArchivo(juntos(dir, `${g.id}.jpg`))
    // El registro del motor -24-09-2026-: se quedaba huerfano al borrar la toma.
    await borrarArchivo(juntos(dir, `${g.id}.motor.txt`))
  } catch {}
  if (g.ruta) {
    const base = g.ruta.replace(/\.mp4(\.part)?$/, '')
    await borrarArchivo(base + '.json')
    await borrarArchivo(base + '.mp4.part')
    await borrarArchivo(base + '.jpg')
  }
}


import { Capacitor } from '@capacitor/core'
import { grabacionNueva, ResumenGrabacion } from '../datos/modelo'
import { RepositorioGrabaciones } from '../datos/RepositorioGrabaciones'
import {
  camaraEncendida,
  empezarGrabacionVideo,
  cortarGrabacionVideo,
  grabacionNativaEnCurso
} from './camara'
import {
  analizarVideo,
  borrarArchivo,
  buscarMp4Recientes,
  bytesDe,
  directorioGrabaciones,
  extraerMiniatura,
  escribirTexto,
  juntos,
  leerTexto,
  listarDirectorio,
  moverArchivo
} from './archivosNativos'
import {
  SidecarToma,
  sidecarInicial,
  parsearSidecar,
  reconocerPendiente,
  marcarLista,
  marcarIncompleta,
  emparejarMp4PorTiempo
} from './sidecar'
import { veredictoMudo } from './detectorMudo'

const MS_HEARTBEAT = 2000

type SesionToma = {
  sidecar: SidecarToma
  dir: string
  rutaSidecar: string
  heartbeat: ReturnType<typeof setInterval> | null
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

  const s: SesionToma = { sidecar, dir, rutaSidecar, heartbeat: null }
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
  if (grabacionNativaEnCurso()) {
    rutaPlugin = await cortarGrabacionVideo()
  }
  if (rutaPlugin) s.sidecar.rutaPlugin = rutaPlugin

  const incompleta = Boolean(opts?.incompleta)
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

  let rutaMiniatura = juntos(s.dir, `${s.sidecar.id}.jpg`)
  try {
    rutaMiniatura = await extraerMiniatura(rutaFinal, rutaMiniatura, 1000)
  } catch (e) {
    console.warn('[tomaVideo] miniatura no se pudo extraer:', e)
    rutaMiniatura = ''
  }

  const veredicto = veredictoMudo({
    tienePistaAudio: analisis.tienePistaAudio,
    nivelRmsDb: analisis.nivelRmsDb ?? null,
    frasesOidas: s.sidecar.frasesOidas
  })

  s.sidecar.bytes = analisis.bytes
  s.sidecar.milisegundos = analisis.duracionMs || s.sidecar.milisegundos
  s.sidecar.tienePistaAudio = analisis.tienePistaAudio
  s.sidecar.rutaMp4 = rutaFinal
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
    calidad: s.sidecar.calidad
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

    let rutaMiniatura = juntos(dir, `${s.id}.jpg`)
    try {
      rutaMiniatura = await extraerMiniatura(ruta, rutaMiniatura, 1000)
    } catch {
      rutaMiniatura = nombres.includes(`${s.id}.jpg`) ? juntos(dir, `${s.id}.jpg`) : ''
    }

    const incompleta = s.estado !== 'lista'
    const veredicto = veredictoMudo({
      tienePistaAudio: analisis.tienePistaAudio,
      nivelRmsDb: analisis.nivelRmsDb ?? null,
      frasesOidas: s.frasesOidas
    })

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
      calidad: s.calidad
    })
    await repo.guardar(resumen)
    porId.set(resumen.id, resumen)
    if (ruta && resumen.bytes > 0) ocupadas.add(ruta)

    try {
      await escribirTexto(
        juntos(dir, `${s.id}.json`),
        JSON.stringify(incompleta ? marcarIncompleta(s, { rutaMp4: ruta, bytes: resumen.bytes, milisegundos: resumen.duracionMs }) : marcarLista(s))
      )
    } catch {}
  }

  const lista = Array.from(porId.values())
  lista.sort((a, b) => b.creado - a.creado)
  return lista
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
  } catch {}
  if (g.ruta) {
    const base = g.ruta.replace(/\.mp4(\.part)?$/, '')
    await borrarArchivo(base + '.json')
    await borrarArchivo(base + '.mp4.part')
    await borrarArchivo(base + '.jpg')
  }
}

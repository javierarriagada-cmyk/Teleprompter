// EL PANEL "MEDICIÓN / EXPORTACIÓN" -tarea 87, paso 0, 03-10-2026-.
//
// Antes de programar "Para redes" y "Guardar y compartir" -docs/tarea87.txt- se mide en el moto g86
// lo que hoy no está medido: cuánto tarda guardar con subtítulos, qué forma real tiene el archivo,
// qué rotación le pone capgo y si LISTO muestra lo que se graba. Javier toca; Claude lee el
// registro. Cada medición es una línea SigoExport con formato fijo -lib/medicionesExport.ts-, que
// va al logcat y queda también acá, para copiarla o descargarla sin adb.
//
// Vive dentro de las herramientas de diagnóstico -PanelDiagnostico.tsx, "Medición / Exportación"-
// y solo en la APK de prueba: App lo monta detrás de HERRAMIENTAS. Medir NO cambia ninguna toma:
// "Medir guardado" deja una copia en la galería, sin borrar el original ni tocar el índice, y la
// anota para que "Borrar copias de medición" la saque después -solo esas-.
import React from 'react'
import type { ResumenGrabacion } from '../datos/modelo'
import { anotarCamara } from '../lib/medicionesCamara'
import {
  medirToma,
  anotarMedicion,
  equipoMedicion,
  borrarCopiasDeMedicion,
  guardarEnGaleriaConSubtitulos,
  leerTexto,
  listarDirectorio,
  directorioGrabaciones,
  juntos
} from '../lib/archivosNativos'
import { armarSubtitulos } from '../lib/subtitulos'
import { textoDeSubtitulos } from '../lib/archivosDeToma'
import {
  ENSAYOS,
  Ensayo,
  lineaDeEvento,
  conEtiqueta,
  agregarAlRegistro,
  registroGuardado,
  vaciarRegistro,
  estadoEnsayosGuardado,
  guardarEstadoEnsayos,
  asignarEnsayoPendiente,
  copiasDeMedicion,
  anotarCopiaDeMedicion,
  quitarCopiasDeMedicion,
  descargarTexto,
  EVENTO_DOM_MEDICION,
  EventoMedicion,
  ValorMedicion
} from '../lib/medicionesExport'

const estiloBoton: React.CSSProperties = {
  padding: 'var(--aire-2) var(--aire-3)',
  fontSize: 'var(--texto-meta)',
  borderRadius: 'var(--redondeo)',
  border: '1px solid var(--color-borde)',
  backgroundColor: 'var(--bg-superficie)',
  color: 'var(--color-texto)',
  cursor: 'pointer'
}

const estiloTituloApartado: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 'var(--texto-meta)',
  color: 'var(--color-apagado)',
  marginTop: 'var(--aire-4)',
  marginBottom: 'var(--aire-2)'
}

const estiloNota: React.CSSProperties = {
  fontSize: 'var(--texto-meta)',
  color: 'var(--color-apagado)',
  marginTop: 'var(--aire-1)'
}

// Lo que se ve de cada toma: el id corto y la hora, como para reconocerla.
function rotuloDeToma(g: ResumenGrabacion): string {
  const f = new Date(g.creado)
  const dd = (n: number) => String(n).padStart(2, '0')
  const seg = Math.round((g.duracionMs || 0) / 1000)
  return `${g.id.slice(0, 8)} · ${dd(f.getHours())}:${dd(f.getMinutes())} · ${Math.floor(seg / 60)}:${dd(seg % 60)} · ${g.calidad || 'calidad NA'}`
}

export function PanelMediciones({
  grabaciones,
  calidadPedida,
  camaraActiva
}: {
  grabaciones: ResumenGrabacion[]
  calidadPedida: string
  camaraActiva: boolean
}) {
  const [registro, setRegistro] = React.useState<string[]>(() => registroGuardado())
  const [ensayos, setEnsayos] = React.useState(() => estadoEnsayosGuardado())
  const [copias, setCopias] = React.useState(() => copiasDeMedicion())
  const [conRegistro, setConRegistro] = React.useState<Record<string, boolean>>({})
  const [ocupado, setOcupado] = React.useState<string | null>(null)
  const [avance, setAvance] = React.useState<number | null>(null)
  const [aviso, setAviso] = React.useState<string | null>(null)

  // Una línea armada acá: al registro del panel y al logcat.
  const registrar = React.useCallback((evento: EventoMedicion, datos: Partial<Record<string, ValorMedicion>>) => {
    const mensaje = lineaDeEvento(evento, datos)
    setRegistro(agregarAlRegistro(conEtiqueta(mensaje)))
    void anotarMedicion(mensaje)
  }, [])

  // Las líneas del nativo las junta App -escucharMediciones- aunque el panel esté cerrado; acá
  // solo se vuelve a leer el registro cuando llega una.
  React.useEffect(() => {
    const refrescar = () => setRegistro(registroGuardado())
    window.addEventListener(EVENTO_DOM_MEDICION, refrescar)
    return () => window.removeEventListener(EVENTO_DOM_MEDICION, refrescar)
  }, [])

  // evento=equipo, una vez al abrir el panel.
  React.useEffect(() => {
    let vigente = true
    ;(async () => {
      const eq = await equipoMedicion()
      if (!vigente) return
      // web: el build no lleva su commit -no hay nada que lo inyecte-; queda NA.
      registrar('equipo', { modelo: eq?.modelo, android: eq?.android, app: eq?.app, web: null })
    })()
    return () => { vigente = false }
  }, [registrar])

  // El ensayo pendiente se lo lleva la primera toma creada después de elegirlo.
  React.useEffect(() => {
    const { estado, asignada } = asignarEnsayoPendiente(grabaciones, ensayos)
    if (!asignada) return
    guardarEstadoEnsayos(estado)
    setEnsayos(estado)
    registrar('ensayo', { id: asignada.id, ensayo: asignada.ensayo })
  }, [grabaciones, ensayos, registrar])

  // Qué tomas tienen registro de palabras: sin él no hay subtítulos que quemar.
  React.useEffect(() => {
    let vigente = true
    ;(async () => {
      try {
        const dir = await directorioGrabaciones()
        const nombres = await listarDirectorio(dir)
        if (!vigente) return
        const mapa: Record<string, boolean> = {}
        for (const g of grabaciones) mapa[g.id] = nombres.includes(`${g.id}.motor.txt`)
        setConRegistro(mapa)
      } catch {
        if (vigente) setConRegistro({})
      }
    })()
    return () => { vigente = false }
  }, [grabaciones])

  const elegirEnsayo = (e: Ensayo) => {
    const estado = { ...ensayos, pendiente: { ensayo: e, desdeMs: Date.now() } }
    guardarEstadoEnsayos(estado)
    setEnsayos(estado)
  }

  const leerCamara = async () => {
    if (!camaraActiva) {
      // Con la cámara encendida detrás, la franja de diagnóstico se esconde -PanelDiagnostico.tsx,
      // display-: por eso App anota evento=camara solo cada vez que la cámara se enciende.
      setAviso('La cámara está apagada. Cada vez que se enciende en LISTO, evento=camara se anota solo.')
      return
    }
    await anotarCamara(calidadPedida)
    setRegistro(registroGuardado())
    setAviso(null)
  }

  const medirForma = async (g: ResumenGrabacion) => {
    setOcupado(g.id)
    try {
      const f = await medirToma(g.ruta)
      registrar('forma', {
        id: g.id,
        dur_ms: f.existe ? f.duracionMs : null,
        bytes: f.existe ? f.bytes : null,
        ancho_px: f.anchoPx || null,
        alto_px: f.altoPx || null,
        rot_grados: f.existe ? f.rotacion : null,
        fps: f.fps ? f.fps.toFixed(2) : null,
        bitrate_bps: f.bitrateBps || null,
        mime_video: f.mimeVideo || null,
        mime_audio: f.mimeAudio || null,
        audio_hz: f.audioHz || null,
        audio_canales: f.audioCanales || null,
        calidad_toma: g.calidad
      })
      setAviso(f.existe ? null : 'El archivo de esa toma no está en el teléfono.')
    } catch (e) {
      setAviso('No se pudo medir la forma: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setOcupado(null)
    }
  }

  // MEDIR GUARDADO: la misma llamada que el visor -guardarEnGaleriaConSubtitulos, amarillo-, pero
  // sin borrar el original ni avisar a App: la toma y el índice quedan como estaban. Las líneas
  // guardado_inicio, capa y guardado_fin las escribe el nativo.
  const medirGuardado = async (g: ResumenGrabacion) => {
    setOcupado(g.id)
    setAvance(0)
    try {
      // -tarea 87, subtítulos en horizontal- Con la forma de la toma, como el visor. Antes sin forma.
      // -banco-largo- Del mismo lugar que el visor -textoDeSubtitulos-. Antes:
      // const dir = await directorioGrabaciones()
      // const subs = armarSubtitulos(await leerTexto(juntos(dir, `${g.id}.motor.txt`)), g.orientacion ?? 'vertical')
      const subs = armarSubtitulos((await textoDeSubtitulos(g.id)) ?? '', g.orientacion ?? 'vertical')
      if (!subs.length) {
        setAviso('El registro de esa toma no da subtítulos: no hay qué quemar.')
        return
      }
      const res = await guardarEnGaleriaConSubtitulos(g.ruta, subs, 'amarillo', (p) => setAvance(p))
      if (res.ok && res.uri) {
        setCopias(anotarCopiaDeMedicion({ uri: res.uri, id: g.id, tMs: Date.now() }))
        setAviso('Listo. Quedó una copia en la galería: bórrala con "Borrar copias de medición".')
      } else {
        setAviso('El guardado no devolvió la copia.')
      }
    } catch (e) {
      setAviso('No se pudo medir el guardado: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setOcupado(null)
      setAvance(null)
    }
  }

  const borrarCopias = async () => {
    const uris = copias.map((c) => c.uri)
    setOcupado('copias')
    try {
      const r = await borrarCopiasDeMedicion(uris)
      setCopias(quitarCopiasDeMedicion(r.borradas))
      registrar('copias_borradas', { pedidas: uris.length, borradas: r.borradas.length, fallidas: r.fallidas.length })
      setAviso(r.fallidas.length
        ? `Se borraron ${r.borradas.length}; ${r.fallidas.length} no se dejaron borrar y siguen en la lista.`
        : `Se borraron ${r.borradas.length} copias de medición.`)
    } catch (e) {
      setAviso('No se pudieron borrar las copias: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setOcupado(null)
    }
  }

  const copiarTodo = async () => {
    const texto = registro.join('\n')
    try {
      await navigator.clipboard.writeText(texto)
      setAviso(`Copiadas ${registro.length} líneas.`)
    } catch {
      try {
        const { Clipboard } = await import('@capacitor/clipboard')
        await Clipboard.write({ string: texto })
        setAviso(`Copiadas ${registro.length} líneas.`)
      } catch {
        setAviso('No se pudo copiar: usa "Descargar".')
      }
    }
  }

  const tomas = [...grabaciones].sort((a, b) => b.creado - a.creado)

  return (
    <div data-testid="panel-mediciones" style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-texto)' }}>
      <div style={estiloNota}>
        Cada medición es una línea SigoExport. Va al logcat -adb logcat -s SigoExport- y queda abajo,
        para copiarla o descargarla.
      </div>

      {aviso && (
        <div data-testid="aviso-mediciones" style={{ marginTop: 'var(--aire-2)', color: 'var(--color-acento)' }}>
          {aviso}
        </div>
      )}

      <div style={estiloTituloApartado}>Cámara</div>
      <button type="button" data-testid="btn-leer-camara" style={estiloBoton} onClick={leerCamara}>
        Leer cámara
      </button>

      <div style={estiloTituloApartado}>Ensayo -se marca ANTES de grabar-</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--aire-1)' }}>
        {ENSAYOS.map((e) => (
          <button
            key={e}
            type="button"
            data-testid={`btn-ensayo-${e}`}
            aria-pressed={ensayos.pendiente?.ensayo === e}
            style={{
              ...estiloBoton,
              borderColor: ensayos.pendiente?.ensayo === e ? 'var(--color-acento)' : 'var(--color-borde)'
            }}
            onClick={() => elegirEnsayo(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <div style={estiloNota} data-testid="ensayo-pendiente">
        {ensayos.pendiente
          ? `Pendiente: ${ensayos.pendiente.ensayo}. La próxima toma que grabes queda anotada así.`
          : 'Sin ensayo pendiente.'}
      </div>

      <div style={estiloTituloApartado}>Tomas</div>
      {tomas.length === 0 && <div style={estiloNota}>Todavía no hay tomas.</div>}
      {tomas.map((g) => {
        const sinRegistro = conRegistro[g.id] === false
        const ensayo = ensayos.asignados[g.id]
        return (
          <div
            key={g.id}
            data-testid={`toma-medicion-${g.id}`}
            style={{ paddingTop: 'var(--aire-2)', paddingBottom: 'var(--aire-2)', borderBottom: '1px solid var(--color-separador)' }}
          >
            <div>{rotuloDeToma(g)}{ensayo ? ` · ${ensayo}` : ''}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--aire-2)', marginTop: 'var(--aire-1)' }}>
              <button
                type="button"
                data-testid={`btn-medir-forma-${g.id}`}
                style={estiloBoton}
                disabled={ocupado !== null}
                onClick={() => medirForma(g)}
              >
                Medir forma
              </button>
              <button
                type="button"
                data-testid={`btn-medir-guardado-${g.id}`}
                style={estiloBoton}
                disabled={ocupado !== null || sinRegistro}
                onClick={() => medirGuardado(g)}
              >
                {ocupado === g.id && avance !== null ? `Guardando… ${Math.round(avance)} %` : 'Medir guardado con subtítulos'}
              </button>
            </div>
            {sinRegistro && (
              <div style={estiloNota} data-testid={`sin-registro-${g.id}`}>
                Sin registro de palabras: no hay subtítulos que quemar.
              </div>
            )}
          </div>
        )
      })}

      <div style={estiloTituloApartado}>Copias de medición en la galería</div>
      <button
        type="button"
        data-testid="btn-borrar-copias-medicion"
        style={estiloBoton}
        disabled={ocupado !== null || copias.length === 0}
        onClick={borrarCopias}
      >
        Borrar copias de medición ({copias.length})
      </button>
      <div style={estiloNota}>Borra de la galería solo las copias que dejó este panel.</div>

      <div style={estiloTituloApartado}>Registro ({registro.length} líneas)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--aire-2)', marginBottom: 'var(--aire-2)' }}>
        <button type="button" data-testid="btn-copiar-registro" style={estiloBoton} onClick={copiarTodo}>
          Copiar todo
        </button>
        <button
          type="button"
          data-testid="btn-descargar-registro"
          style={estiloBoton}
          onClick={() => descargarTexto(registro.join('\n'))}
        >
          Descargar
        </button>
        <button
          type="button"
          data-testid="btn-vaciar-registro"
          style={estiloBoton}
          onClick={() => { vaciarRegistro(); setRegistro([]) }}
        >
          Vaciar registro
        </button>
      </div>
      <pre
        data-testid="registro-mediciones"
        style={{
          margin: 0,
          padding: 'var(--aire-2)',
          maxHeight: 240,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          fontSize: 'var(--texto-etiqueta)',
          backgroundColor: 'var(--bg-suelo)',
          border: '1px solid var(--color-borde)',
          borderRadius: 'var(--redondeo)'
        }}
      >
        {registro.slice(-200).join('\n')}
      </pre>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import {
  listarLecturas,
  ResumenLectura
} from '../lib/almacenCorpus'
import {
  detenerGrabacion,
  estadoGrabador
} from '../lib/grabadorCorpus'

interface PanelCorpusProps {
  medir: boolean
  setMedir: (medir: boolean) => void
}

export function PanelCorpus({ medir, setMedir }: PanelCorpusProps) {
  const [archivos, setArchivos] = useState<ResumenLectura[]>([])
  const [cargando, setCargando] = useState<boolean>(true)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [grabandoActual, setGrabandoActual] = useState<boolean>(estadoGrabador() === 'grabando')

  async function actualizarLista() {
    setCargando(true)
    try {
      const lista = await listarLecturas()
      setArchivos(lista)
    } catch (e: any) {
      setMensaje('Error al listar lecturas de corpus: ' + (e?.message || e))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    actualizarLista()
    const interval = setInterval(() => {
      setGrabandoActual(estadoGrabador() === 'grabando')
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleForzarGuardado() {
    setMensaje('Guardando corpus en segundo plano...')
    try {
      await detenerGrabacion()
      setMensaje('Corpus guardado exitosamente.')
      await actualizarLista()
    } catch (e: any) {
      setMensaje('Error al guardar corpus: ' + (e?.message || e))
    }
  }

  return (
    <div
      data-testid="panel-corpus"
      style={{
        border: '1px solid var(--color-borde)',
        borderRadius: 'var(--redondeo)',
        padding: 'var(--aire-3)',
        marginBottom: 'var(--aire-4)',
        backgroundColor: 'var(--bg-suelo)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-2)' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--texto-titulo)', color: 'var(--color-texto)' }}>
          Panel de Medición y Corpus
        </h4>
        {grabandoActual && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--aire-1)',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-grabando)',
              padding: 'var(--aire-1) var(--aire-2)',
              borderRadius: 'var(--redondeo-pildora)',
              fontSize: 'var(--texto-meta)',
              fontWeight: 'bold',
              border: '1px solid var(--color-borde)'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--color-grabando)',
                display: 'inline-block'
              }}
            />
            GRABANDO CORPUS
          </span>
        )}
      </div>

      <div style={{ marginBottom: 'var(--aire-3)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--aire-2)', cursor: 'pointer', fontSize: 'var(--texto-cuerpo)', color: 'var(--color-texto)' }}>
          <input
            type="checkbox"
            checked={medir}
            onChange={(e) => setMedir(e.target.checked)}
          />
          <strong>Medir y guardar audio/eventos automáticamente al leer</strong>
        </label>
        <div style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)', marginTop: 'var(--aire-1)', marginLeft: 'var(--aire-4)' }}>
          Al estar activo, cada lectura grabará audio PCM y métricas de avance para evaluar el motor offline.
        </div>
      </div>

      {mensaje && (
        <div
          style={{
            padding: 'var(--aire-2)',
            backgroundColor: 'var(--bg-suelo)',
            border: '1px solid var(--color-borde)',
            borderRadius: 'var(--redondeo)',
            marginBottom: 'var(--aire-2)',
            fontSize: 'var(--texto-meta)',
            color: 'var(--color-texto)'
          }}
        >
          {mensaje}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--aire-2)', marginBottom: 'var(--aire-3)' }}>
        <button
          onClick={handleForzarGuardado}
          style={{
            padding: 'var(--aire-2) var(--aire-3)',
            fontSize: 'var(--texto-meta)',
            borderRadius: 'var(--redondeo)',
            border: '1px solid var(--color-borde)',
            backgroundColor: 'var(--bg-superficie)',
            color: 'var(--color-texto)',
            cursor: 'pointer'
          }}
        >
          Forzar Procesado y Guardado
        </button>
        <button
          onClick={actualizarLista}
          style={{
            padding: 'var(--aire-2) var(--aire-3)',
            fontSize: 'var(--texto-meta)',
            borderRadius: 'var(--redondeo)',
            border: '1px solid var(--color-borde)',
            backgroundColor: 'var(--bg-superficie)',
            color: 'var(--color-texto)',
            cursor: 'pointer'
          }}
        >
          Refrescar Lista ({archivos.length})
        </button>
      </div>

      <div>
        <div style={{ fontWeight: 'bold', fontSize: 'var(--texto-meta)', marginBottom: 'var(--aire-1)', color: 'var(--color-texto)' }}>
          Lecturas guardadas en IndexedDB ({archivos.length}):
        </div>
        {cargando ? (
          <div style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)' }}>Cargando lista...</div>
        ) : archivos.length === 0 ? (
          <div style={{ fontSize: 'var(--texto-meta)', color: 'var(--color-apagado)' }}>No hay lecturas de corpus guardadas aún.</div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 'var(--aire-4)', fontSize: 'var(--texto-meta)', color: 'var(--color-texto)', maxHeight: 150, overflowY: 'auto' }}>
            {archivos.map((rec) => (
              <li key={rec.id} style={{ marginBottom: 'var(--aire-1)' }}>
                <code>{rec.guionTitulo} ({rec.segundos}s, {rec.motor})</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

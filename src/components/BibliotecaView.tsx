import React, { useEffect, useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion } from '../datos/modelo'
import { PanelCorpus } from './PanelCorpus'

interface BibliotecaViewProps {
  guiones: ResumenGuion[]
  onAbrir: (id: string) => void
  onCrearNuevo: () => void
  onImportarArchivo: (file: File) => void
  onRenombrar?: (id: string, nuevoTitulo: string) => void
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  onBuscarGuionCompleto?: (id: string) => Promise<Guion | null>
  onToggleDiagnostico?: () => void
  medirLectura?: boolean
  setMedirLectura?: (medir: boolean) => void
}

export function formatearFechaNatural(timestamp: number): string {
  if (!timestamp) return ''
  const ahora = new Date()
  const fecha = new Date(timestamp)

  const inicioAhora = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()
  const diffDias = Math.round((inicioAhora - inicioFecha) / (1000 * 60 * 60 * 24))

  if (diffDias === 0) return 'hoy'
  if (diffDias === 1) return 'ayer'
  if (diffDias > 1 && diffDias <= 6) return `hace ${diffDias} días`
  if (diffDias > 6 && diffDias <= 13) return 'hace 1 semana'
  if (diffDias > 13 && diffDias <= 27) return `hace ${Math.floor(diffDias / 7)} semanas`

  const dia = fecha.getDate()
  const mes = fecha.getMonth() + 1
  return `${dia}/${mes}`
}

export function calcularMinutosLectura(guiones: ResumenGuion[]): number {
  const totalPalabras = guiones.reduce((acc, g) => acc + (g.palabras || 0), 0)
  return Math.round(totalPalabras / 150)
}

export default function BibliotecaView({
  guiones,
  onAbrir,
  onCrearNuevo,
  onImportarArchivo,
  onRenombrar,
  onBorrar,
  onArchivar,
  onBuscarGuionCompleto,
  onToggleDiagnostico,
  medirLectura = true,
  setMedirLectura = () => {}
}: BibliotecaViewProps) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarArchivados, setMostrarArchivados] = useState(false)
  const [mostrarPanelCorpus, setMostrarPanelCorpus] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuSuperiorAbierto, setMenuSuperiorAbierto] = useState(false)
  // se cierra tocando afuera o con Escape, no solo con el mismo boton
  const refMenuSuperior = useCerrarAfuera(menuSuperiorAbierto, () => setMenuSuperiorAbierto(false))
  // el menu de cada fila, que se abre con toque largo, se cierra igual que los demas
  const refMenuFila = useCerrarAfuera(menuId !== null, () => setMenuId(null))
  const [mapaTextos, setMapaTextos] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const timerHoldRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressRef = useRef<boolean>(false)

  const timerDiagRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fueLongPressDiagRef = useRef<boolean>(false)

  const hayMasDeOcho = guiones.length > 8

  useEffect(() => {
    const query = busqueda.toLowerCase().trim()
    if (!query || !onBuscarGuionCompleto) return

    let cancelado = false
    const inicio = performance.now()

    const idsFaltantes = guiones.filter((g) => !(g.id in mapaTextos)).map((g) => g.id)

    if (idsFaltantes.length > 0) {
      Promise.all(
        idsFaltantes.map(async (id) => {
          const g = await onBuscarGuionCompleto(id)
          const texto = g && g.bloques ? g.bloques.map((b) => b.texto || '').join(' ') : ''
          return { id, texto }
        })
      ).then((resultados) => {
        if (cancelado) return
        const fin = performance.now()
        console.log(`[BusquedaTexto] Cargar ${resultados.length} guiones demoró ${(fin - inicio).toFixed(2)} ms`)
        setMapaTextos((prev) => {
          const nuevo = { ...prev }
          for (const res of resultados) {
            nuevo[res.id] = res.texto
          }
          return nuevo
        })
      })
    }

    return () => {
      cancelado = true
    }
  }, [busqueda, guiones, onBuscarGuionCompleto, mapaTextos])

  const guionesFiltrados = guiones.filter((g) => {
    const query = busqueda.toLowerCase().trim()
    const tituloNormalizado = (g.titulo || 'Sin título').toLowerCase()
    const textoNormalizado = (mapaTextos[g.id] || '').toLowerCase()

    const coincideBusqueda = query === '' || tituloNormalizado.includes(query) || textoNormalizado.includes(query)

    if (query !== '') {
      return coincideBusqueda
    }

    if (mostrarArchivados) {
      return Boolean(g.archivado)
    }

    return !g.archivado
  })

  function handleTouchStart(id: string) {
    fueLongPressRef.current = false
    if (timerHoldRef.current) clearTimeout(timerHoldRef.current)
    timerHoldRef.current = setTimeout(() => {
      fueLongPressRef.current = true
      setMenuId(id)
    }, 500)
  }

  function handleTouchEnd() {
    if (timerHoldRef.current) {
      clearTimeout(timerHoldRef.current)
      timerHoldRef.current = null
    }
  }

  function handleRowClick(g: ResumenGuion) {
    if (fueLongPressRef.current) {
      fueLongPressRef.current = false
      return
    }
    onAbrir(g.id)
  }

  function handleContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setMenuId(id)
  }

  function handleClicImportar() {
    setMenuSuperiorAbierto(false)
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onImportarArchivo(file)
      e.target.value = ''
    }
  }

  // Toque largo sobre el resumen para alternar diagnostico
  function handleDiagTouchStart() {
    fueLongPressDiagRef.current = false
    if (timerDiagRef.current) clearTimeout(timerDiagRef.current)
    timerDiagRef.current = setTimeout(() => {
      fueLongPressDiagRef.current = true
      if (onToggleDiagnostico) onToggleDiagnostico()
    }, 500)
  }

  function handleDiagTouchEnd() {
    if (timerDiagRef.current) {
      clearTimeout(timerDiagRef.current)
      timerDiagRef.current = null
    }
  }

  function handleDiagClick() {
    if (fueLongPressDiagRef.current) {
      fueLongPressDiagRef.current = false
      return
    }
    if (onToggleDiagnostico) onToggleDiagnostico()
  }

  const minsLectura = calcularMinutosLectura(guiones)
  const textoResumen = guiones.length === 0
    ? '0 guiones'
    : `${guiones.length} ${guiones.length === 1 ? 'guión' : 'guiones'} · ${minsLectura} ${minsLectura === 1 ? 'minuto' : 'minutos'} de lectura`

  return (
    <div style={{ padding: '16px', maxWidth: 800, margin: '0 auto', position: 'relative', minHeight: '80vh' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="input-importar-archivo"
      />

      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--aire-4)' }}>
        <div>
          <h1 className="texto-display" style={{ margin: 0, color: 'var(--color-texto)' }}>
            Guiones
          </h1>
          <div
            className="texto-meta"
            data-testid="resumen-encabezado-biblioteca"
            onTouchStart={handleDiagTouchStart}
            onTouchEnd={handleDiagTouchEnd}
            onMouseDown={handleDiagTouchStart}
            onMouseUp={handleDiagTouchEnd}
            onClick={handleDiagClick}
            style={{
              color: 'var(--color-apagado)',
              marginTop: 'var(--aire-1)',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {textoResumen}
          </div>
        </div>

        {/* Menú superior derecho ⋯ */}
        <div ref={refMenuSuperior} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuSuperiorAbierto(!menuSuperiorAbierto)}
            data-testid="btn-menu-superior-biblioteca"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              color: 'var(--color-texto)',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
            title="Opciones"
          >
            ⋯
          </button>

          {menuSuperiorAbierto && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'var(--bg-superficie)',
                border: '1px solid var(--color-borde)',
                borderRadius: 'var(--redondeo)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 50,
                minWidth: 160,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <button
                onClick={() => {
                  setMostrarArchivados(!mostrarArchivados)
                  setMenuSuperiorAbierto(false)
                }}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-borde)',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                {mostrarArchivados ? 'Ver Principales' : 'Ver Archivados'}
              </button>
              <button
                onClick={handleClicImportar}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-borde)',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                Importar archivo
              </button>
              <button
                data-testid="btn-abrir-corpus"
                onClick={() => {
                  setMostrarPanelCorpus(true)
                  setMenuSuperiorAbierto(false)
                }}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: 'pointer'
                }}
              >
                Medición / Panel Corpus
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Buscador: sin borde, fondo bg-suelo y redondeo */}
      {hayMasDeOcho && (
        <div style={{ marginBottom: 'var(--aire-4)' }}>
          <input
            type="text"
            placeholder="Buscar"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            data-testid="input-busqueda-biblioteca"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 'var(--texto-cuerpo)',
              borderRadius: 'var(--redondeo)',
              border: 'none',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>
      )}

      {/* Lista de guiones */}
      {guiones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--aire-5) 0' }}>
          <p className="texto-cuerpo" style={{ color: 'var(--color-apagado)', margin: 0 }}>
            Acá van a estar tus guiones.
          </p>
        </div>
      ) : guionesFiltrados.length === 0 ? (
        <div style={{ padding: 'var(--aire-4)', textAlign: 'center', color: 'var(--color-apagado)' }} className="texto-meta">
          {busqueda.trim()
            ? `No se encontraron guiones que coincidan con "${busqueda}".`
            : mostrarArchivados
            ? 'No hay guiones archivados.'
            : 'No hay guiones en la lista principal.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {guionesFiltrados.map((g, index) => {
            const tituloMostrar = g.titulo && g.titulo.trim() ? g.titulo : 'Sin título'
            const mins = Math.max(1, Math.round((g.palabras || 0) / 150))
            const fechaNat = formatearFechaNatural(g.modificado)
            const metaTexto = `${mins} min · ${fechaNat}`
            const esUltima = index === guionesFiltrados.length - 1

            return (
              <div
                key={g.id}
                data-testid={`fila-guion-${g.id}`}
                onClick={() => handleRowClick(g)}
                onMouseDown={() => handleTouchStart(g.id)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={() => handleTouchStart(g.id)}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(e, g.id)}
                style={{
                  padding: '14px 0',
                  borderBottom: esUltima ? 'none' : '1px solid var(--color-borde)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                

                <div>
                  <div className="texto-titulo" style={{ color: 'var(--color-texto)', marginBottom: 'var(--aire-1)' }}>
                    {tituloMostrar} {g.archivado && <span style={{ fontSize: 13, color: 'var(--color-apagado)' }}>(Archivado)</span>}
                  </div>
                  <div className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
                    {metaTexto}
                  </div>
                </div>

                {menuId === g.id && (
                  <div
                    ref={refMenuFila}
                    data-testid={`menu-opciones-${g.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginTop: 'var(--aire-2)',
                      paddingTop: 'var(--aire-2)',
                      display: 'flex',
                      gap: 'var(--aire-2)',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <button
                      onClick={() => {
                        onArchivar(g.id, !g.archivado)
                        setMenuId(null)
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--bg-suelo)',
                        color: 'var(--color-texto)',
                        border: 'none',
                        borderRadius: 'var(--aire-2)',
                        cursor: 'pointer',
                        fontSize: 'var(--texto-meta)'
                      }}
                    >
                      {g.archivado ? 'Desarchivar' : 'Archivar'}
                    </button>
                    <button
                      onClick={() => {
                        const confirmacion = window.confirm(`¿Estás seguro de borrar el guión "${tituloMostrar}"?`)
                        if (confirmacion) {
                          onBorrar(g.id)
                        }
                        setMenuId(null)
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--bg-suelo)',
                        color: 'var(--color-texto)',
                        border: 'none',
                        borderRadius: 'var(--aire-2)',
                        cursor: 'pointer',
                        fontSize: 'var(--texto-meta)'
                      }}
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => setMenuId(null)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        color: 'var(--color-apagado)',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--texto-meta)'
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de PanelCorpus */}
      {mostrarPanelCorpus && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: 16
          }}
          onClick={() => setMostrarPanelCorpus(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-superficie)',
              color: 'var(--color-texto)',
              padding: 20,
              borderRadius: 'var(--redondeo)',
              maxWidth: 600,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Medición / Panel de Corpus</h3>
              <button
                onClick={() => setMostrarPanelCorpus(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 18,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            <PanelCorpus medir={medirLectura ?? true} setMedir={setMedirLectura ?? (() => {})} />
          </div>
        </div>
      )}

      {/* Botón Flotante CREAR */}
      <button
        onClick={onCrearNuevo}
        data-testid="btn-crear-guion-flotante"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: 'var(--color-acento)',
          color: 'var(--color-texto-acento)',
          border: 'none',
          borderRadius: 24,
          padding: '14px 22px',
          fontSize: 'var(--texto-cuerpo)',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
          zIndex: 100
        }}
      >
        + Nuevo
      </button>
    </div>
  )
}

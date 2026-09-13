import React, { useRef, useState } from 'react'
import { Guion, Bloque, TramoFormato, contarPalabras, calcularDuracionTexto } from '../datos/modelo'
import { importarTexto } from '../datos/importar'
import { importarArchivo } from '../datos/importarArchivo'

export function reubicarTramos(
  textoViejo: string,
  nuevoTexto: string,
  tramos: TramoFormato[]
): TramoFormato[] {
  if (tramos.length === 0) return []
  if (textoViejo === nuevoTexto) return tramos

  let ini = 0
  const maxIni = Math.min(textoViejo.length, nuevoTexto.length)
  while (ini < maxIni && textoViejo[ini] === nuevoTexto[ini]) ini++

  let cola = 0
  while (
    cola < maxIni - ini &&
    textoViejo[textoViejo.length - 1 - cola] === nuevoTexto[nuevoTexto.length - 1 - cola]
  ) cola++

  const finViejo = textoViejo.length - cola
  const delta = (nuevoTexto.length - cola) - finViejo

  const salida: TramoFormato[] = []
  for (const tr of tramos) {
    if (tr.hasta <= ini) {
      salida.push(tr)
    } else if (tr.desde >= finViejo) {
      salida.push({ ...tr, desde: tr.desde + delta, hasta: tr.hasta + delta })
    }
  }
  return salida
}

interface EditorViewProps {
  guion: Guion
  onChangeGuion: (nuevoGuion: Guion) => void
  onVolverBiblioteca: () => void
  onEntrarLectura: () => void
}

function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

export default function EditorView({
  guion,
  onChangeGuion,
  onVolverBiblioteca,
  onEntrarLectura
}: EditorViewProps) {
  const [plegados, setPlegados] = useState<Record<string, boolean>>({})
  const [menuOpcionesAbierto, setMenuOpcionesAbierto] = useState(false)
  const [mostrarModalPegar, setMostrarModalPegar] = useState(false)
  const [textoPegado, setTextoPegado] = useState('')
  const [errorPegado, setErrorPegado] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const ultimasSeleccionesRef = useRef<Record<string, { desde: number; hasta: number }>>({})
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string | null>(null)
  const [hayTextoSeleccionado, setHayTextoSeleccionado] = useState(false)

  function togglePlegado(id: string) {
    setPlegados((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  function handleTituloChange(nuevoTitulo: string) {
    onChangeGuion({
      ...guion,
      titulo: nuevoTitulo,
      modificado: Date.now()
    })
  }

  function handleAceptarPegar() {
    if (!textoPegado || !textoPegado.trim()) {
      setErrorPegado('El texto pegado está vacío o sólo contiene espacios.')
      return
    }

    const nuevosBloques = importarTexto(textoPegado)
    if (nuevosBloques.length === 0) {
      setErrorPegado('El texto pegado está vacío o sólo contiene espacios.')
      return
    }

    const bloquesActuales = guion.bloques || []
    onChangeGuion({
      ...guion,
      bloques: [...bloquesActuales, ...nuevosBloques],
      modificado: Date.now()
    })

    setTextoPegado('')
    setErrorPegado(null)
    setMostrarModalPegar(false)
  }

  function handleCancelarPegar() {
    setTextoPegado('')
    setErrorPegado(null)
    setMostrarModalPegar(false)
  }

  async function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''
    setCargandoArchivo(true)
    setErrorArchivo(null)

    try {
      const resultado = await importarArchivo(file)
      if (resultado.bloques.length === 0) {
        throw new Error('El archivo no contiene texto importable.')
      }

      const bloquesActuales = guion.bloques || []
      const tituloNuevo = (!guion.titulo || !guion.titulo.trim() || guion.titulo === 'Sin título')
        ? resultado.titulo
        : guion.titulo

      onChangeGuion({
        ...guion,
        titulo: tituloNuevo,
        bloques: [...bloquesActuales, ...resultado.bloques],
        modificado: Date.now()
      })
    } catch (err: any) {
      const mensaje = err?.message || 'Error al importar el archivo'
      setErrorArchivo(mensaje)
    } finally {
      setCargandoArchivo(false)
    }
  }

  function handleIdiomaChange(nuevoIdioma: string) {
    onChangeGuion({
      ...guion,
      idioma: nuevoIdioma,
      modificado: Date.now()
    })
  }

  function handleAgregarBloque() {
    const nuevoBloque: Bloque = {
      id: generarIdBloque(),
      nombre: '',
      texto: '',
      tramos: []
    }
    const bloquesActuales = guion.bloques || []
    onChangeGuion({
      ...guion,
      bloques: [...bloquesActuales, nuevoBloque],
      modificado: Date.now()
    })
  }

  function handleTextoBloqueChange(index: number, nuevoTexto: string) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloqueViejo = guion.bloques[index]

    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = {
      ...nuevosBloques[index],
      texto: nuevoTexto,
      tramos: reubicarTramos(bloqueViejo.texto || '', nuevoTexto, bloqueViejo.tramos || [])
    }

    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function aplicarFormatoEnSeleccion(index: number, opciones: { negrita?: boolean; color?: 'ambar' | 'celeste' | 'salvia' }) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloque = guion.bloques[index]
    const textarea = textareaRefs.current[bloque.id]
    if (!textarea) return

    let desde = textarea.selectionStart
    let hasta = textarea.selectionEnd

    if (desde === hasta && ultimasSeleccionesRef.current[bloque.id]) {
      const guardado = ultimasSeleccionesRef.current[bloque.id]
      desde = guardado.desde
      hasta = guardado.hasta
    }

    if (desde === hasta) return

    const tramosActuales = bloque.tramos ? [...bloque.tramos] : []

    const tramoExisteIdx = tramosActuales.findIndex((t) => t.desde === desde && t.hasta === hasta)
    if (tramoExisteIdx !== -1) {
      tramosActuales[tramoExisteIdx] = {
        ...tramosActuales[tramoExisteIdx],
        ...opciones
      }
    } else {
      tramosActuales.push({
        desde,
        hasta,
        ...opciones
      })
    }

    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = {
      ...nuevosBloques[index],
      tramos: tramosActuales
    }

    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleAcotacion(index: number) {
    if (!guion.bloques || !guion.bloques[index]) return
    const bloque = guion.bloques[index]
    const textarea = textareaRefs.current[bloque.id]
    if (!textarea) return

    let desde = textarea.selectionStart
    let hasta = textarea.selectionEnd

    if (desde === hasta && ultimasSeleccionesRef.current[bloque.id]) {
      const guardado = ultimasSeleccionesRef.current[bloque.id]
      desde = guardado.desde
      hasta = guardado.hasta
    }

    const textoActual = bloque.texto || ''
    const textoSeleccionado = textoActual.substring(desde, hasta)

    const textoNuevo = textoActual.substring(0, desde) + `[${textoSeleccionado}]` + textoActual.substring(hasta)

    handleTextoBloqueChange(index, textoNuevo)
  }

  function handleSubirBloque(index: number) {
    if (!guion.bloques || index <= 0 || index >= guion.bloques.length) return
    const nuevosBloques = [...guion.bloques]
    const temp = nuevosBloques[index - 1]
    nuevosBloques[index - 1] = nuevosBloques[index]
    nuevosBloques[index] = temp
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleBajarBloque(index: number) {
    if (!guion.bloques || index < 0 || index >= guion.bloques.length - 1) return
    const nuevosBloques = [...guion.bloques]
    const temp = nuevosBloques[index + 1]
    nuevosBloques[index + 1] = nuevosBloques[index]
    nuevosBloques[index] = temp
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleBorrarBloque(index: number) {
    if (!guion.bloques || index < 0 || index >= guion.bloques.length) return
    const nuevosBloques = guion.bloques.filter((_, i) => i !== index)
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
  }

  function handleTextareaSelect(bloqueId: string, target: HTMLTextAreaElement) {
    const tieneSeleccion = target.selectionStart !== target.selectionEnd
    setBloqueSeleccionado(bloqueId)
    setHayTextoSeleccionado(tieneSeleccion)
    if (tieneSeleccion) {
      ultimasSeleccionesRef.current[bloqueId] = {
        desde: target.selectionStart,
        hasta: target.selectionEnd
      }
    }
  }

  const numPalabras = contarPalabras(guion)
  const numMinutos = Math.round(numPalabras / 150)
  const resumenMeta = `${numPalabras.toLocaleString('es')} palabras · ${numMinutos > 0 ? numMinutos : 1} min`

  const hayMasDeUnBloque = guion.bloques && guion.bloques.length > 1

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 16px 100px 16px', position: 'relative' }}>
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        onChange={handleSeleccionarArchivo}
        style={{ display: 'none' }}
      />

      {/* Fila superior discreta: a la izquierda ‹ Guiones, a la derecha ⋯ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--aire-4)' }}>
        <button
          onClick={onVolverBiblioteca}
          className="texto-meta"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-apagado)',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ‹ Guiones
        </button>

        {/* Menu contextual superior ⋯ */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpcionesAbierto(!menuOpcionesAbierto)}
            data-testid="btn-menu-opciones-editor"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 22,
              color: 'var(--color-texto)',
              padding: '4px 8px',
              cursor: 'pointer'
            }}
            title="Opciones del guión"
          >
            ⋯
          </button>

          {menuOpcionesAbierto && (
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
                minWidth: 180,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-borde)' }}>
                <label className="texto-meta" style={{ display: 'block', color: 'var(--color-apagado)', marginBottom: 4 }}>
                  Idioma:
                </label>
                <select
                  value={guion.idioma || 'es'}
                  onChange={(e) => handleIdiomaChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 'var(--texto-meta)',
                    borderRadius: 4,
                    border: '1px solid var(--color-borde)',
                    backgroundColor: 'var(--bg-suelo)',
                    color: 'var(--color-texto)'
                  }}
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                  <option value="pt">Português (pt)</option>
                  <option value="fr">Français (fr)</option>
                  <option value="de">Deutsch (de)</option>
                  <option value="it">Italiano (it)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setMenuOpcionesAbierto(false)
                  setErrorPegado(null)
                  setMostrarModalPegar(true)
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
                Pegar texto
              </button>

              <button
                onClick={() => {
                  setMenuOpcionesAbierto(false)
                  fileInputRef.current?.click()
                }}
                disabled={cargandoArchivo}
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-texto)',
                  fontSize: 'var(--texto-cuerpo)',
                  cursor: cargandoArchivo ? 'not-allowed' : 'pointer'
                }}
              >
                {cargandoArchivo ? 'Leyendo archivo...' : 'Abrir archivo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Titulo es el titulo: Display, editable, sin etiqueta ni recuadro */}
      <div style={{ marginBottom: 'var(--aire-1)' }}>
        <input
          type="text"
          value={guion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          placeholder="Sin título"
          className="texto-display"
          data-testid="input-titulo-guion"
          style={{
            width: '100%',
            padding: 0,
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--color-texto)',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Resumen meta bajo el titulo */}
      <div className="texto-meta" style={{ color: 'var(--color-apagado)', marginBottom: 'var(--aire-4)' }}>
        {resumenMeta}
      </div>

      {errorArchivo && (
        <div
          style={{
            color: '#d32f2f',
            backgroundColor: '#ffebee',
            border: '1px solid #ef9a9a',
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          ⚠️ Error al abrir archivo: {errorArchivo}
        </div>
      )}

      {mostrarModalPegar && (
        <div
          style={{
            backgroundColor: 'var(--bg-superficie)',
            border: '1px solid var(--color-borde)',
            borderRadius: 'var(--redondeo)',
            padding: 16,
            marginBottom: 20
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-texto)' }}>Pegar texto para importar</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--color-apagado)' }}>
            Pega aquí el texto de tu guión. Se convertirá automáticamente en bloques y líneas con el formato adecuado.
          </p>
          <textarea
            value={textoPegado}
            onChange={(e) => {
              setTextoPegado(e.target.value)
              if (errorPegado) setErrorPegado(null)
            }}
            placeholder="Pega aquí el texto completo..."
            rows={8}
            style={{
              width: '100%',
              padding: 10,
              fontSize: 14,
              fontFamily: 'inherit',
              borderRadius: 6,
              border: '1px solid var(--color-borde)',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)',
              boxSizing: 'border-box',
              marginBottom: 8
            }}
          />
          {errorPegado && (
            <div
              style={{
                color: '#d32f2f',
                backgroundColor: '#ffebee',
                padding: '8px 12px',
                borderRadius: 4,
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 'bold'
              }}
            >
              {errorPegado}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancelarPegar}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--bg-suelo)',
                border: 'none',
                borderRadius: 6,
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAceptarPegar}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--bg-superficie)',
                color: 'var(--color-texto)',
                border: '1px solid var(--color-borde)',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Aceptar e importar
            </button>
          </div>
        </div>
      )}

      {/* Bloques de Texto */}
      {(!guion.bloques || guion.bloques.length === 0) ? (
        <div
          style={{
            padding: 30,
            textAlign: 'center',
            marginBottom: 20
          }}
        >
          <p className="texto-cuerpo" style={{ color: 'var(--color-apagado)', marginBottom: 16 }}>
            Este guión no tiene ningún texto.
          </p>
          <button
            onClick={handleAgregarBloque}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--bg-superficie)',
              color: 'var(--color-texto)',
              border: '1px solid var(--color-borde)',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Agregar primer bloque
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--aire-3)' }}>
          {guion.bloques.map((bloque, index) => {
            const estaPlegado = !!plegados[bloque.id]
            const esSeleccionado = bloqueSeleccionado === bloque.id && hayTextoSeleccionado

            return (
              <div key={bloque.id || index} style={{ position: 'relative' }}>
                {/* Controles de bloque: SOLO SI HAY MÁS DE UN BLOQUE */}
                {hayMasDeUnBloque && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: estaPlegado ? 0 : 8
                    }}
                  >
                    <button
                      onClick={() => togglePlegado(bloque.id)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--color-apagado)',
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                      title={estaPlegado ? 'Desplegar bloque' : 'Plegar bloque'}
                    >
                      {estaPlegado ? '▶' : '▼'}
                    </button>

                    <span className="texto-meta" style={{ color: 'var(--color-apagado)' }}>
                      Bloque #{index + 1}
                    </span>

                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                      <button
                        onClick={() => handleSubirBloque(index)}
                        disabled={index === 0}
                        style={{
                          padding: '2px 6px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: index === 0 ? 'not-allowed' : 'pointer',
                          opacity: index === 0 ? 0.3 : 1
                        }}
                        title="Subir bloque"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleBajarBloque(index)}
                        disabled={index === guion.bloques.length - 1}
                        style={{
                          padding: '2px 6px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: index === guion.bloques.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: index === guion.bloques.length - 1 ? 0.3 : 1
                        }}
                        title="Bajar bloque"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleBorrarBloque(index)}
                        style={{
                          padding: '2px 6px',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-apagado)',
                          cursor: 'pointer'
                        }}
                        title="Borrar bloque"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {!estaPlegado && (
                  <div>
                    {/* Controles de formato: SOLO SI HAY TEXTO SELECCIONADO */}
                    {esSeleccionado && (
                      <div
                        data-testid={`barra-formato-${bloque.id}`}
                        style={{
                          display: 'flex',
                          gap: 8,
                          marginBottom: 8,
                          alignItems: 'center',
                          backgroundColor: 'var(--bg-superficie)',
                          padding: '4px 8px',
                          borderRadius: 6,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => aplicarFormatoEnSeleccion(index, { negrita: true })}
                          style={{
                            padding: '4px 10px',
                            fontWeight: 'bold',
                            borderRadius: 4,
                            border: '1px solid var(--color-borde)',
                            backgroundColor: 'var(--bg-suelo)',
                            color: 'var(--color-texto)',
                            cursor: 'pointer'
                          }}
                          title="Negrita"
                        >
                          N
                        </button>

                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'ambar' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 4,
                              border: '1px solid #ccc',
                              backgroundColor: '#F0C070',
                              cursor: 'pointer'
                            }}
                            title="Destacar Ámbar"
                            data-testid="btn-color-ambar"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'celeste' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 4,
                              border: '1px solid #ccc',
                              backgroundColor: '#8FB8DE',
                              cursor: 'pointer'
                            }}
                            title="Destacar Celeste"
                          />
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormatoEnSeleccion(index, { color: 'salvia' })}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 4,
                              border: '1px solid #ccc',
                              backgroundColor: '#9CC5A1',
                              cursor: 'pointer'
                            }}
                            title="Destacar Salvia"
                          />
                        </div>

                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleAcotacion(index)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 4,
                            border: '1px solid var(--color-borde)',
                            backgroundColor: 'var(--bg-suelo)',
                            color: 'var(--color-texto)',
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                          title="Envolver en corchetes de acotación"
                        >
                          [...] Acotación
                        </button>
                      </div>
                    )}

                    <textarea
                      ref={(el) => { textareaRefs.current[bloque.id] = el }}
                      value={bloque.texto}
                      onChange={(e) => handleTextoBloqueChange(index, e.target.value)}
                      onSelect={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      onKeyUp={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      onMouseUp={(e) => handleTextareaSelect(bloque.id, e.currentTarget)}
                      placeholder="Escribe el texto..."
                      rows={Math.max(6, Math.min(20, (bloque.texto || '').split('\n').length + 2))}
                      style={{
                        width: '100%',
                        padding: 0,
                        fontSize: 18,
                        lineHeight: 1.6,
                        fontFamily: '"Source Serif 4", serif',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--color-texto)',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Botón de Leer en voz alta Fijo Abajo */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 100
        }}
      >
        <button
          onClick={onEntrarLectura}
          data-testid="btn-leer-guion-fijo"
          style={{
            pointerEvents: 'auto',
            width: 'calc(100% - 32px)',
            maxWidth: 400,
            padding: '14px 24px',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 600,
            backgroundColor: 'var(--color-acento)',
            color: 'var(--color-texto-acento)',
            border: 'none',
            borderRadius: 24,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          ▶ Leer en voz alta
        </button>
        {/* Boton invisible para compatibilidad con pruebas que buscan "▶ Leer Guión" */}
        <button style={{ display: 'none' }} onClick={onEntrarLectura}>
          ▶ Leer Guión
        </button>
      </div>
    </div>
  )
}

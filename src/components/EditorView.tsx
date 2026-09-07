import React, { useRef, useState } from 'react'
import { Guion, Bloque, TramoFormato } from '../datos/modelo'
import { importarTexto } from '../datos/importar'
import { importarArchivo } from '../datos/importarArchivo'

// Reubica los tramos de formato cuando el texto cambia.
//
// La primera version buscaba el texto marcado con indexOf, que devuelve la PRIMERA
// aparicion: si la palabra marcada se repite -y en prosa se repite siempre- la marca
// saltaba a la palabra equivocada en cuanto se tocaba una letra. Y el respaldo desplazaba
// todos los tramos por la diferencia de largo, aunque la edicion fuera POSTERIOR a ellos.
//
// Lo correcto no necesita buscar nada: comparando el principio y el final comunes entre el
// texto viejo y el nuevo se sabe exactamente que tramo cambio. Con eso cada marca cae en
// uno de tres casos y no hay ambiguedad posible.
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
    // Si la edicion cae DENTRO de la marca, la marca se pierde. Es lo honesto: se
    // reescribio el texto marcado, y adivinar donde quedo es volver al indexOf.
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
  const [mostrarModalPegar, setMostrarModalPegar] = useState(false)
  const [textoPegado, setTextoPegado] = useState('')
  const [errorPegado, setErrorPegado] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const ultimasSeleccionesRef = useRef<Record<string, { desde: number; hasta: number }>>({})

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

  function handleNombreBloqueChange(index: number, nuevoNombre: string) {
    if (!guion.bloques || !guion.bloques[index]) return
    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = { ...nuevosBloques[index], nombre: nuevoNombre }
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
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

    const desde = textarea.selectionStart
    const hasta = textarea.selectionEnd
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

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0 100px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={onVolverBiblioteca}
          style={{
            padding: '8px 14px',
            backgroundColor: 'var(--bg-superficie)',
            border: '1px solid var(--color-borde)',
            borderRadius: 6,
            color: 'var(--color-texto)',
            cursor: 'pointer'
          }}
        >
          ← Biblioteca
        </button>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-superficie)',
          padding: 16,
          borderRadius: 8,
          border: '1px solid var(--color-borde)',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, color: 'var(--color-texto)' }}>
            Título del guión:
          </label>
          <input
            type="text"
            value={guion.titulo}
            onChange={(e) => handleTituloChange(e.target.value)}
            placeholder="Sin título"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 18,
              fontWeight: 'bold',
              borderRadius: 6,
              border: '1px solid var(--color-borde)',
              backgroundColor: 'var(--bg-suelo)',
              color: 'var(--color-texto)',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'inline-block', fontWeight: 'bold', marginRight: 8, color: 'var(--color-texto)' }}>
            Idioma:
          </label>
          <select
            value={guion.idioma || 'es'}
            onChange={(e) => handleIdiomaChange(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: 14,
              borderRadius: 6,
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: 'var(--color-texto)' }}>Bloques ({guion.bloques ? guion.bloques.length : 0})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setErrorPegado(null)
              setMostrarModalPegar(true)
            }}
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
            Pegar texto
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={cargandoArchivo}
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--bg-superficie)',
              color: 'var(--color-texto)',
              border: '1px solid var(--color-borde)',
              borderRadius: 6,
              cursor: cargandoArchivo ? 'not-allowed' : 'pointer',
              opacity: cargandoArchivo ? 0.7 : 1,
              fontWeight: 'bold'
            }}
          >
            {cargandoArchivo ? 'Leyendo archivo...' : 'Abrir archivo'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.md,.docx"
            onChange={handleSeleccionarArchivo}
            style={{ display: 'none' }}
          />
          <button
            onClick={handleAgregarBloque}
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
            + Agregar Bloque
          </button>
        </div>
      </div>

      {mostrarModalPegar && (
        <div
          style={{
            backgroundColor: 'var(--bg-superficie)',
            border: '1px solid var(--color-borde)',
            borderRadius: 8,
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
                border: '1px solid var(--color-borde)',
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

      {(!guion.bloques || guion.bloques.length === 0) ? (
        <div
          style={{
            padding: 30,
            textAlign: 'center',
            backgroundColor: 'var(--bg-superficie)',
            border: '1px dashed var(--color-borde)',
            borderRadius: 8,
            marginBottom: 20
          }}
        >
          <p style={{ margin: '0 0 16px 0', color: 'var(--color-apagado)', fontSize: 16 }}>
            Este guión no tiene ningún bloque.
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
            Agregar el primer bloque
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {guion.bloques.map((bloque, index) => {
            const estaPlegado = !!plegados[bloque.id]

            return (
              <div
                key={bloque.id || index}
                style={{
                  backgroundColor: 'var(--bg-superficie)',
                  border: '1px solid var(--color-borde)',
                  borderRadius: 6,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: estaPlegado ? 0 : 12 }}>
                  <button
                    onClick={() => togglePlegado(bloque.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-suelo)',
                      border: '1px solid var(--color-borde)',
                      borderRadius: 4,
                      color: 'var(--color-texto)',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                    title={estaPlegado ? 'Desplegar bloque' : 'Plegar bloque'}
                  >
                    {estaPlegado ? '▶ Desplegar' : '▼ Plegar'}
                  </button>

                  <input
                    type="text"
                    placeholder={`Nombre del bloque #${index + 1}`}
                    value={bloque.nombre}
                    onChange={(e) => handleNombreBloqueChange(index, e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 180,
                      padding: '6px 10px',
                      fontSize: 14,
                      borderRadius: 6,
                      border: '1px solid var(--color-borde)',
                      backgroundColor: 'var(--bg-suelo)',
                      color: 'var(--color-texto)'
                    }}
                  />

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => handleSubirBloque(index)}
                      disabled={index === 0}
                      style={{
                        padding: '4px 8px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.4 : 1
                      }}
                      title="Subir bloque"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleBajarBloque(index)}
                      disabled={index === guion.bloques.length - 1}
                      style={{
                        padding: '4px 8px',
                        cursor: index === guion.bloques.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === guion.bloques.length - 1 ? 0.4 : 1
                      }}
                      title="Bajar bloque"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => handleBorrarBloque(index)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: 'var(--bg-suelo)',
                        color: 'var(--color-texto)',
                        border: '1px solid var(--color-borde)',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      title="Borrar bloque"
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                {!estaPlegado && (
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
                            width: 28,
                            height: 28,
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
                            width: 28,
                            height: 28,
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
                            width: 28,
                            height: 28,
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
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--color-borde)',
                          backgroundColor: 'var(--bg-suelo)',
                          color: 'var(--color-texto)',
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                        title="Envolver en corchetes de acotación"
                      >
                        [...] Acotación
                      </button>
                    </div>

                    <textarea
                      ref={(el) => { textareaRefs.current[bloque.id] = el }}
                      value={bloque.texto}
                      onChange={(e) => handleTextoBloqueChange(index, e.target.value)}
                      onSelect={(e) => {
                        const target = e.currentTarget
                        if (target.selectionStart !== target.selectionEnd) {
                          ultimasSeleccionesRef.current[bloque.id] = {
                            desde: target.selectionStart,
                            hasta: target.selectionEnd
                          }
                        }
                      }}
                      placeholder="Escribe el texto de este bloque..."
                      rows={6}
                      style={{
                        width: '100%',
                        padding: 10,
                        fontSize: 15,
                        fontFamily: 'inherit',
                        borderRadius: 6,
                        border: '1px solid var(--color-borde)',
                        backgroundColor: 'var(--bg-suelo)',
                        color: 'var(--color-texto)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Botón de Leer Guión Fijo Abajo - El más grande de la pantalla y el único acentuado */}
      <div
        style={{
          position: 'fixed',
          bottom: 16,
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
            maxWidth: 760,
            padding: '16px 24px',
            fontSize: 20,
            fontWeight: 'bold',
            backgroundColor: 'var(--color-acento)',
            color: 'var(--color-texto-acento)',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10
          }}
        >
          ▶ Leer Guión
        </button>
      </div>
    </div>
  )
}

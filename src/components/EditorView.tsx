import React, { useRef, useState } from 'react'
import { Guion, Bloque } from '../datos/modelo'
import { importarTexto } from '../datos/importar'
import { importarArchivo } from '../datos/importarArchivo'

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
  // Estado local para los bloques plegados (true = plegado, false = desplegado)
  const [plegados, setPlegados] = useState<Record<string, boolean>>({})
  // Estado para el modal/sección de pegar texto
  const [mostrarModalPegar, setMostrarModalPegar] = useState(false)
  const [textoPegado, setTextoPegado] = useState('')
  const [errorPegado, setErrorPegado] = useState<string | null>(null)

  // Estado y ref para importar desde archivo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

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
      texto: ''
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
    const nuevosBloques = [...guion.bloques]
    nuevosBloques[index] = { ...nuevosBloques[index], texto: nuevoTexto }
    onChangeGuion({
      ...guion,
      bloques: nuevosBloques,
      modificado: Date.now()
    })
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0' }}>
      {/* Barra superior de navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button
          onClick={onVolverBiblioteca}
          style={{
            padding: '8px 14px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          ← Biblioteca
        </button>

        <button
          onClick={onEntrarLectura}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2e7d32',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold'
          }}
        >
          ▶ Leer Guión
        </button>
      </div>

      {/* Encabezado editable del guión */}
      <div
        style={{
          backgroundColor: '#fff',
          padding: 16,
          borderRadius: 8,
          border: '1px solid #e0e0e0',
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4, color: '#333' }}>
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
              borderRadius: 4,
              border: '1px solid #ccc',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div>
          <label style={{ display: 'inline-block', fontWeight: 'bold', marginRight: 8, color: '#333' }}>
            Idioma:
          </label>
          <select
            value={guion.idioma || 'es'}
            onChange={(e) => handleIdiomaChange(e.target.value)}
            style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #ccc' }}
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

      {/* Alerta de error al importar archivo */}
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

      {/* Lista de Bloques */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Bloques ({guion.bloques ? guion.bloques.length : 0})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              setErrorPegado(null)
              setMostrarModalPegar(true)
            }}
            style={{
              padding: '6px 14px',
              backgroundColor: '#0288d1',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
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
              backgroundColor: '#7b1fa2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
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
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            + Agregar Bloque
          </button>
        </div>
      </div>

      {/* Interfaz para pegar texto */}
      {mostrarModalPegar && (
        <div
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #0288d1',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', color: '#0288d1' }}>Pegar texto para importar</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#555' }}>
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
              borderRadius: 4,
              border: '1px solid #ccc',
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
                backgroundColor: '#e0e0e0',
                border: '1px solid #ccc',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAceptarPegar}
              style={{
                padding: '6px 14px',
                backgroundColor: '#0288d1',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
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
            backgroundColor: '#fff3e0',
            border: '1px dashed #ffe0b2',
            borderRadius: 8,
            marginBottom: 20
          }}
        >
          <p style={{ margin: '0 0 16px 0', color: '#e65100', fontSize: 16 }}>
            Este guión no tiene ningún bloque.
          </p>
          <button
            onClick={handleAgregarBloque}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e65100',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
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
                  backgroundColor: '#fff',
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  padding: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {/* Cabecera del bloque */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: estaPlegado ? 0 : 12 }}>
                  <button
                    onClick={() => togglePlegado(bloque.id)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ccc',
                      borderRadius: 4,
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
                      borderRadius: 4,
                      border: '1px solid #ccc'
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
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: '1px solid #ef9a9a',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      title="Borrar bloque"
                    >
                      Borrar
                    </button>
                  </div>
                </div>

                {/* Contenido del texto del bloque */}
                {!estaPlegado && (
                  <div>
                    <textarea
                      value={bloque.texto}
                      onChange={(e) => handleTextoBloqueChange(index, e.target.value)}
                      placeholder="Escribe el texto de este bloque..."
                      rows={6}
                      style={{
                        width: '100%',
                        padding: 10,
                        fontSize: 15,
                        fontFamily: 'inherit',
                        borderRadius: 4,
                        border: '1px solid #ccc',
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
    </div>
  )
}

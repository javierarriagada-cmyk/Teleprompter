import React, { useState } from 'react'
import { Guion, Bloque } from '../datos/modelo'

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

  const tituloMostrar = guion.titulo && guion.titulo.trim() ? guion.titulo : 'Sin título'

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

      {/* Lista de Bloques */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Bloques ({guion.bloques ? guion.bloques.length : 0})</h3>
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

import React, { useState } from 'react'
import { ResumenGuion } from '../datos/modelo'

interface BibliotecaViewProps {
  guiones: ResumenGuion[]
  onAbrir: (id: string) => void
  onCrearNuevo: () => void
  onRenombrar: (id: string, nuevoTitulo: string) => void
  onBorrar: (id: string) => void
}

export default function BibliotecaView({
  guiones,
  onAbrir,
  onCrearNuevo,
  onRenombrar,
  onBorrar
}: BibliotecaViewProps) {
  const [busqueda, setBusqueda] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [tituloEditado, setTituloEditado] = useState('')

  const guionesFiltrados = guiones.filter((g) => {
    const tituloNormalizado = (g.titulo || 'Sin título').toLowerCase()
    return tituloNormalizado.includes(busqueda.toLowerCase())
  })

  function iniciarEdicion(g: ResumenGuion) {
    setEditandoId(g.id)
    setTituloEditado(g.titulo)
  }

  function guardarEdicion(id: string) {
    onRenombrar(id, tituloEditado)
    setEditandoId(null)
  }

  function handleBorrar(g: ResumenGuion) {
    const titulo = g.titulo && g.titulo.trim() ? g.titulo : 'Sin título'
    if (window.confirm(`¿Estás seguro de borrar el guión "${titulo}"?`)) {
      onBorrar(g.id)
    }
  }

  return (
    <div style={{ padding: '16px 0', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Biblioteca de Guiones</h2>
        <button
          onClick={onCrearNuevo}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Crear Guión
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Buscar por título..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 16,
            borderRadius: 4,
            border: '1px solid #ccc',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {guiones.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            border: '1px dashed #ccc',
            marginTop: 20
          }}
        >
          <p style={{ fontSize: 18, color: '#666', marginBottom: 20 }}>
            No hay ningún guión guardado.
          </p>
          <button
            onClick={onCrearNuevo}
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
            Crear el primer guión
          </button>
        </div>
      ) : guionesFiltrados.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>
          No se encontraron guiones que coincidan con "{busqueda}".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {guionesFiltrados.map((g) => {
            const tituloMostrar = g.titulo && g.titulo.trim() ? g.titulo : 'Sin título'
            const fechaMod = new Date(g.modificado).toLocaleString('es', {
              dateStyle: 'short',
              timeStyle: 'short'
            })

            return (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#fff',
                  borderRadius: 6,
                  border: '1px solid #e0e0e0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ flex: 1, marginRight: 16 }}>
                  {editandoId === g.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={tituloEditado}
                        onChange={(e) => setTituloEditado(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: 16, flex: 1 }}
                        autoFocus
                      />
                      <button
                        onClick={() => guardarEdicion(g.id)}
                        style={{ padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        style={{ padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3
                        onClick={() => onAbrir(g.id)}
                        style={{
                          margin: '0 0 6px 0',
                          cursor: 'pointer',
                          color: '#1976d2',
                          display: 'inline-block'
                        }}
                      >
                        {tituloMostrar}
                      </h3>
                      <div style={{ fontSize: 13, color: '#666', display: 'flex', gap: 16 }}>
                        <span>Palabras: <strong>{g.palabras}</strong></span>
                        <span>Idioma: <strong>{g.idioma}</strong></span>
                        <span>Modificado: {fechaMod}</span>
                      </div>
                    </div>
                  )}
                </div>

                {editandoId !== g.id && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onAbrir(g.id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                        border: '1px solid #90caf9',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => iniciarEdicion(g)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Renombrar
                    </button>
                    <button
                      onClick={() => handleBorrar(g)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        border: '1px solid #ef9a9a',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                    >
                      Borrar
                    </button>
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

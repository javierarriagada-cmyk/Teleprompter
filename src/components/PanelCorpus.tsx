// EL PANEL DE LA MEDICION. Paso 1 del plan del motor.
//
// Muestra las lecturas que YA ESTAN GUARDADAS, no la que se acaba de hacer. Eso es a
// proposito y viene de un error caro: el 13 de septiembre de 2026 Javier grabo dos o tres
// lecturas y se perdieron todas, porque vivian en memoria y el unico boton para bajarlas
// estaba adentro de los controles, que se escondian al leer y no volvian nunca.
//
// Una lectura en voz alta cuesta minutos de una persona y no se repite a voluntad. Asi que
// ahora se guarda sola al terminar, sobrevive a recargas y a cerrar la pestana, y este
// panel solo sirve para bajarla cuando se pueda. Si alguien no baja nada, no se pierde
// nada.
//
// No va a la version que se publique: es la herramienta con la que se junta el material
// para medir el motor.

import React from 'react'
import { errorGrabador, estadoGrabador } from '../lib/grabadorCorpus'
import { borrarLectura, leerLectura, listarLecturas, ResumenLectura } from '../lib/almacenCorpus'

type Props = {
  medir: boolean
  setMedir: (v: boolean) => void
}

function bajar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function nombreDe(l: ResumenLectura): string {
  const f = new Date(l.fecha)
  const dd = (n: number) => String(n).padStart(2, '0')
  return `lectura-${f.getFullYear()}-${dd(f.getMonth() + 1)}-${dd(f.getDate())}-${dd(f.getHours())}${dd(f.getMinutes())}`
}

export function PanelCorpus({ medir, setMedir }: Props) {
  const [lecturas, setLecturas] = React.useState<ResumenLectura[]>([])
  const estado = estadoGrabador()

  const refrescar = React.useCallback(() => {
    listarLecturas().then(setLecturas).catch(() => setLecturas([]))
  }, [])

  // El estado del grabador vive fuera de React -lo cambian los eventos del navegador-, asi
  // que se consulta a ritmo lento. Cada segundo alcanza para un cartel y no compite con el
  // lazo de animacion de la lectura, que corre a sesenta por segundo.
  React.useEffect(() => {
    refrescar()
    const id = setInterval(refrescar, 1000)
    return () => clearInterval(id)
  }, [refrescar])

  const grabando = estado === 'grabando' || estado === 'pidiendo-permiso' || estado === 'guardando'

  async function bajarPar(l: ResumenLectura) {
    const completa = await leerLectura(l.id)
    if (!completa) return
    const base = nombreDe(l)
    bajar(completa.audio, `${base}.${completa.extension}`)
    bajar(new Blob([completa.registro], { type: 'text/plain;charset=utf-8' }), `${base}.txt`)
  }

  async function borrar(l: ResumenLectura) {
    await borrarLectura(l.id)
    refrescar()
  }

  return (
    <div
      data-testid="panel-corpus"
      style={{ border: '1px solid #444', borderRadius: 6, padding: 12, marginBottom: 16, background: '#1a1a1a' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            data-testid="medir-lectura"
            type="checkbox"
            checked={medir}
            onChange={(e) => setMedir(e.target.checked)}
            disabled={grabando}
          />
          <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa' }}>
            Medir esta lectura
          </span>
        </label>

        <span data-testid="estado-corpus" style={{ fontSize: 13, color: grabando ? '#e66' : '#9aa' }}>
          {estado === 'grabando' && '● Grabando junto con la lectura'}
          {estado === 'pidiendo-permiso' && 'Pidiendo el micrófono…'}
          {estado === 'guardando' && 'Guardando la lectura…'}
          {estado === 'error' && `No se pudo grabar: ${errorGrabador()}. La lectura funciona igual.`}
          {(estado === 'inactivo' || estado === 'listo') &&
            'Al apretar Iniciar se graba junto con lo que el motor va mostrando. Se guarda sola.'}
        </span>
      </div>

      {lecturas.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa', marginBottom: 6 }}>
            Lecturas guardadas ({lecturas.length})
          </div>
          <div data-testid="lista-lecturas" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lecturas.map((l) => (
              <div
                key={l.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                  padding: '6px 8px',
                  borderRadius: 4,
                  background: '#222'
                }}
              >
                <span style={{ fontSize: 13, color: '#ddd', flex: 1, minWidth: 160 }}>
                  {new Date(l.fecha).toLocaleString()} · {l.segundos}s ·{' '}
                  {Math.round(l.bytesAudio / 1024)} kB · {l.motor}
                </span>
                <button
                  data-testid="boton-descargar-corpus"
                  onClick={() => bajarPar(l)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 4,
                    border: '1px solid #2a7',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#2a7',
                    fontWeight: 600
                  }}
                >
                  Bajar los dos archivos
                </button>
                <button
                  onClick={() => borrar(l)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 4,
                    border: '1px solid #666',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: '#999'
                  }}
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

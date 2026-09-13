// EL PANEL DE LA MEDICION. Paso 1 del plan del motor.
//
// NO tiene boton de grabar, y eso es a proposito. Al principio si lo tenia, separado del
// boton de iniciar la lectura, y era una trampa: grabar sin arrancar el motor da audio sin
// nada que medir, y arrancar el motor sin grabar deja el cero del reloj tarde y pierde el
// comienzo. Las dos maneras de equivocarse dan una grabacion inutil, y eso solo se descubre
// al ir a analizarla, cuando ya no se puede repetir.
//
// Javier lo vio al toque: "por que el boton de grabar con el de iniciar no son el mismo".
// Ahora empezar a leer ES empezar a medir, y este panel solo muestra en que quedo y deja
// bajar el resultado.
//
// Esto no va a la version que se publique: es la herramienta para juntar el material con
// el que se mide el motor.

import React from 'react'
import {
  descargarCorpus,
  errorGrabador,
  estadoGrabador,
  hayCorpus
} from '../lib/grabadorCorpus'

type Props = {
  medir: boolean
  setMedir: (v: boolean) => void
}

export function PanelCorpus({ medir, setMedir }: Props) {
  const [, redibujar] = React.useState(0)
  const estado = estadoGrabador()

  // El estado del grabador vive fuera de React -lo cambian los eventos del navegador-, asi
  // que se consulta a ritmo lento. Cada medio segundo alcanza para un cartel y no compite
  // con el lazo de animacion de la lectura, que corre a sesenta por segundo.
  React.useEffect(() => {
    const id = setInterval(() => redibujar((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])

  const grabando = estado === 'grabando' || estado === 'pidiendo-permiso'

  return (
    <div
      data-testid="panel-corpus"
      style={{
        border: '1px solid #444',
        borderRadius: 6,
        padding: 12,
        marginBottom: 16,
        background: '#1a1a1a'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
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

        {grabando && (
          <span data-testid="estado-corpus" style={{ color: '#e66', fontSize: 13 }}>
            ● Grabando junto con la lectura
          </span>
        )}
        {!grabando && estado === 'listo' && (
          <span data-testid="estado-corpus" style={{ color: '#2a7', fontSize: 13 }}>
            Lectura grabada. Bajá los dos archivos y mandalos juntos.
          </span>
        )}
        {!grabando && estado === 'error' && (
          <span data-testid="estado-corpus" style={{ color: '#e66', fontSize: 13 }}>
            No se pudo grabar: {errorGrabador()}. La lectura funciona igual.
          </span>
        )}
        {!grabando && estado === 'inactivo' && (
          <span data-testid="estado-corpus" style={{ color: '#9aa', fontSize: 13 }}>
            Al apretar Iniciar se graba el audio junto con lo que el motor va mostrando.
          </span>
        )}
      </div>

      {hayCorpus() && !grabando && (
        <button
          data-testid="boton-descargar-corpus"
          onClick={() => descargarCorpus()}
          style={{
            padding: '10px 16px',
            borderRadius: 4,
            border: '1px solid #2a7',
            cursor: 'pointer',
            background: 'transparent',
            color: '#2a7',
            fontWeight: 600
          }}
        >
          Descargar los dos archivos
        </button>
      )}
    </div>
  )
}

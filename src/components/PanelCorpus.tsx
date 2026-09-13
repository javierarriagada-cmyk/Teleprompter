// EL PANEL PARA GRABAR UNA LECTURA DE MEDICION. Paso 1 del plan del motor.
//
// No es una funcion del producto y no va a estar en la version que se publique: es la
// herramienta con la que se junta el material para medir el motor. Por eso vive en su
// propio archivo y no dentro de la barra de controles, que es compartida y tiene pruebas
// encima.
//
// Lo que se espera de quien graba: apretar GRABAR, leer el guion de corrido, y apretar
// DETENER. Salen dos archivos con el mismo nombre -uno de audio y uno de texto- que hay
// que mandar juntos. El del texto no sirve sin el audio ni el audio sin el texto.

import React from 'react'
import {
  descargarCorpus,
  detenerGrabacion,
  errorGrabador,
  estadoGrabador,
  hayCorpus,
  iniciarGrabacion
} from '../lib/grabadorCorpus'

type Props = {
  guionTitulo: string
  guionTexto: string
  motor: string
}

export function PanelCorpus({ guionTitulo, guionTexto, motor }: Props) {
  const [, redibujar] = React.useState(0)
  const estado = estadoGrabador()

  // El estado del grabador vive fuera de React -lo cambian los eventos del navegador-, asi
  // que se consulta a ritmo lento. Cada medio segundo alcanza para un boton y no compite
  // con el lazo de animacion de la lectura, que corre a sesenta por segundo.
  React.useEffect(() => {
    const id = setInterval(() => redibujar((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])

  const grabando = estado === 'grabando'
  const pidiendo = estado === 'pidiendo-permiso'

  async function alApretar() {
    if (grabando) {
      await detenerGrabacion()
    } else {
      try {
        await iniciarGrabacion({ guionTitulo, guionTexto, motor })
      } catch (e) {
        // El estado ya quedo en 'error' y el motivo se muestra abajo.
      }
    }
    redibujar((n) => n + 1)
  }

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
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#9aa', marginBottom: 8 }}>
        Grabar lectura para medir el motor
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          data-testid="boton-grabar-corpus"
          onClick={alApretar}
          disabled={pidiendo}
          style={{
            padding: '10px 16px',
            borderRadius: 4,
            border: 'none',
            cursor: pidiendo ? 'default' : 'pointer',
            background: grabando ? '#a33' : '#2a7',
            color: '#fff',
            fontWeight: 600
          }}
        >
          {grabando ? 'Detener' : pidiendo ? 'Pidiendo micrófono…' : 'Grabar'}
        </button>

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

        <span data-testid="estado-corpus" style={{ color: grabando ? '#e66' : '#9aa', fontSize: 13 }}>
          {grabando && '● Grabando. Leé de corrido y apretá Detener al terminar.'}
          {estado === 'listo' && 'Listo. Descargá los dos archivos y mandalos juntos.'}
          {estado === 'error' && `No se pudo grabar: ${errorGrabador()}`}
          {estado === 'inactivo' && 'Graba el audio y, en el mismo reloj, lo que el motor fue mostrando.'}
        </span>
      </div>

      {grabando && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          Empezá a leer recién después de apretar Grabar: el milisegundo cero es este instante.
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { familiaLectura, colorLetraEfectiva, columnaLectura, INTERLINEADO_LECTURA } from './estiloLectura'

// LA MUESTRA VIVA DEL PANEL Aa. Tarea 72, 23-09-2026.
//
// Tamano, ancho, tipografia y colores se aplican en la LECTURA, no en el
// editor: el editor tiene su propia letra, comoda para escribir. Hasta la
// 72 el panel no mostraba ningun cambio -se tocaba "Serif" y no pasaba
// nada a la vista-. El dueno: "si las personas apretan un ajuste y no
// pasa nada, lo que asumen es que eso es falso".
//
// La muestra son las primeras palabras del guion dibujadas con LAS MISMAS
// reglas que la lectura -estiloLectura.ts- y al tamano real. Ocupa el
// ancho entero de la hoja, que en un telefono es el ancho de la pantalla,
// y le aplica el mismo margen en % y la misma columna que la lectura: los
// renglones se cortan donde los va a cortar la lectura. En una pantalla
// de mas de 500 px la hoja no llega al borde y la muestra queda algo mas
// angosta; se acepta, el producto es el telefono.
//
// Se ven tres renglones y el resto se desvanece: a 42 px tres renglones ya
// son 176 px, y una muestra mas alta empuja los controles fuera de la hoja.
const TEXTO_SI_VACIO = 'Así se va a ver tu guion cuando lo leas frente a la cámara.'
const MAX_CARACTERES = 220

export function MuestraLectura({
  texto,
  fontSize,
  tipoFuente,
  colorFondo,
  colorLetra,
  columnaAngosta,
  marginPercent
}: {
  texto: string
  fontSize: number
  tipoFuente: 'sans' | 'serif'
  colorFondo: string
  colorLetra: string
  columnaAngosta: boolean
  marginPercent: number
}) {
  const limpio = (texto || '').replace(/\s+/g, ' ').trim()
  const muestra = limpio.length > 0 ? limpio.slice(0, MAX_CARACTERES) : TEXTO_SI_VACIO
  const columna = columnaLectura(columnaAngosta)
  return (
    <div
      data-testid="muestra-lectura"
      aria-label="Así se va a ver al leer"
      style={{
        margin: '0 calc(-1 * var(--aire-4)) var(--aire-3)',
        backgroundColor: colorFondo,
        paddingLeft: `${marginPercent}%`,
        paddingRight: `${marginPercent}%`,
        paddingTop: 'var(--aire-3)',
        paddingBottom: 'var(--aire-3)',
        borderTop: '1px solid var(--color-borde)',
        borderBottom: '1px solid var(--color-borde)'
      }}
    >
      <div
        data-testid="muestra-lectura-columna"
        style={{
          fontSize,
          lineHeight: INTERLINEADO_LECTURA,
          fontFamily: familiaLectura(tipoFuente),
          color: colorLetraEfectiva(colorFondo, colorLetra),
          maxWidth: columna.maxWidth,
          textAlign: columna.textAlign,
          margin: '0 auto',
          height: fontSize * INTERLINEADO_LECTURA * 3,
          overflow: 'hidden',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)',
          maskImage: 'linear-gradient(to bottom, #000 55%, transparent)'
        }}
      >
        {muestra}
      </div>
    </div>
  )
}

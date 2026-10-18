// MEDIR UNA TOMA: A CUANTAS PALABRAS Y A CUANTOS RENGLONES VA LA PANTALLA DE LA VOZ.
//
//   node scripts/medir-toma.mjs <archivo.motor.txt> [mas archivos...]
//
// Paso 2 del plan del motor -memoria plan-del-motor-medir-antes-de-tocar-: una
// definicion numerica de bueno, medida sobre lecturas reales. 24-09-2026.
//
// DE DONDE SALE CADA COSA, todo en el mismo reloj -el del registro, cero al empezar
// el video-:
//
//   CUANDO SE DIJO CADA PALABRA DEL GUION. De las lineas 'palabras FINAL': Vosk
//   nativo entrega cada palabra reconocida con el milisegundo en que empezo y
//   termino en el audio. Se alinean contra el guion -programacion dinamica, con la
//   misma tolerancia de letras que el seguidor- y cada palabra del guion que quedo
//   emparejada tiene su tiempo. Las que el reconocedor no oyo se interpolan entre
//   sus vecinas. Esta es la vara: no depende de lo que hizo el motor.
//
//   QUE MOSTRABA LA PANTALLA. De las lineas 'cuadro': la posicion del motor -en
//   palabras- y el renglon vivo -trabado-.
//
//   QUE PALABRAS TIENE CADA RENGLON. De la linea 'renglones'.
//
// LAS CIFRAS:
//
//   atraso en palabras   palabra que se esta diciendo menos palabra que muestra el
//                        motor. Positivo: la pantalla va atrasada.
//   atraso en renglones  renglon de la palabra que se dice menos renglon vivo. El
//                        renglon vivo se dibuja segundo en la ventana -un renglon de
//                        holgura arriba, MARGEN_RENGLONES_ARRIBA-, asi que el renglon
//                        de la ventana donde se lee es 2 + este atraso.
//   retraso del reconocedor   cuanto tarda una palabra en APARECER EN UN PARCIAL
//                        desde que termino de decirse. Los parciales son lo que
//                        mueve la pantalla. Se toma del texto de los parciales: la
//                        palabra k de la frase aparecio cuando el parcial llego a
//                        tener k palabras; y termino de decirse cuando dice el
//                        final. Medirlo con la llegada del FINAL -la primera
//                        version- daba 8 a 11 s: el final llega al cerrar la frase,
//                        a veces 20 s despues.
//   cruce a JavaScript   de las lineas 'llegada': lo que tarda un resultado desde
//                        que Vosk lo entrega hasta que la aplicacion lo recibe.
//   microfono y proceso  con el oido propio -24-09-2026-: cuanto pasa desde que
//                        termina el audio de un trozo hasta que se lee, y cuanto
//                        tarda Vosk en procesarlo. Lo que sobra del retraso es lo que
//                        Vosk se guarda las palabras antes de mostrarlas.
//
// Se mide cada 100 ms mientras hay voz -entre la primera y la ultima palabra dicha-.

import fs from 'fs'

// -13-10-2026, banco del motor-: normalizar, leven, similar, tokensDelGuion, leer, CERCANIA,
// alinear y percentil se movieron TAL CUAL, con sus comentarios, a src/pruebas/alinearToma.js,
// para que el banco del motor -scripts/banco-motor.ts- use la misma alineacion sin copiarla.
// Antes: estaban definidas aqui, entre "import fs" y "const f1".
import { leerRegistro, tokensDelGuion, percentil, medirContraLaVoz } from '../src/pruebas/alinearToma.js'

function leer(ruta) {
  return leerRegistro(fs.readFileSync(ruta, 'utf8'))
}

const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-')

for (const ruta of process.argv.slice(2)) {
  const { cab, oidas, cuadros, retrasos, cruces, capturas, procesos, oido } = leer(ruta)
  // -13-10-2026, banco del motor-: la alineacion y el bucle de muestras cada 100 ms se movieron
  // TAL CUAL a medirContraLaVoz -src/pruebas/alinearToma.js-, que usa tambien el banco.
  // Antes: aqui estaban calceEn, alinear, dicho, conocidos, tokenDichoEn, renglonDe, el bucle
  // que llenaba atrasoPal y atrasoRen, y primerMov y dichoAntes.
  const reg = leer(ruta)
  const { tokens, pares, atrasoPal, atrasoRen, primerMov, dichoAntes } = medirContraLaVoz(reg)
  console.log(`\n=== ${ruta.split(/[\\/]/).pop()}`)
  console.log(`letra ${cab.letra || '?'} | columna ${cab.columna || '?'} | motor ${cab['motor de voz'] || '?'}`)
  console.log(`guion ${tokens.length} palabras | oidas ${oidas.length} | emparejadas con el guion ${pares.length}`)
  if (pares.length < 5 || cuadros.length === 0) { console.log('muy pocos datos para medir'); continue }

  console.log(`retraso del reconocedor, ms      mediana ${percentil(retrasos, 50)}  p90 ${percentil(retrasos, 90)}`)
  if (capturas.length) console.log(`  de eso, microfono, ms           mediana ${percentil(capturas, 50)}  p90 ${percentil(capturas, 90)}`)
  if (procesos.length) console.log(`  de eso, proceso de Vosk, ms     mediana ${percentil(procesos, 50)}  p90 ${percentil(procesos, 90)}`)
  if (cruces.length) console.log(`  de eso, cruce a JavaScript, ms  mediana ${percentil(cruces, 50)}  p90 ${percentil(cruces, 90)}`)
  if (oido) console.log(`oido: ${oido}`)
  console.log(`atraso de la pantalla, palabras  mediana ${f1(percentil(atrasoPal, 50))}  p90 ${f1(percentil(atrasoPal, 90))}`)
  if (atrasoRen.length) {
    const ventana = atrasoRen.map((x) => x + 2)
    console.log(`atraso en renglones              mediana ${f1(percentil(atrasoRen, 50))}  p90 ${f1(percentil(atrasoRen, 90))}`)
    console.log(`renglon de la ventana donde se lee: mediana ${f1(percentil(ventana, 50))}  (el objetivo es 2)`)
    const reparto = {}
    for (const v of ventana) reparto[v] = (reparto[v] || 0) + 1
    console.log('  reparto: ' + Object.keys(reparto).sort((a, b) => a - b).map((k) => `${k}: ${Math.round((100 * reparto[k]) / ventana.length)}%`).join('  '))
  } else console.log('sin renglones en el registro: solo se mide en palabras')
  if (primerMov) console.log(`arranque: la pantalla se movio a los ${primerMov.ms} ms, con ${dichoAntes === null ? '?' : dichoAntes + 1} palabras ya dichas`)
  // -banco-largo, 17-10-2026- La bitacora nueva escribe 'cuadro' solo cuando cambia y resume los cuadros
  // cada 5 s -filas 'cuadros'-: todo lo de arriba sale igual de las dos formas. Esto, solo en la nueva.
  if (reg.tramosCuadros.length) {
    const t = reg.tramosCuadros
    console.log(`cuadros (bitacora nueva): ${t.reduce((s, x) => s + x.n, 0)} en ${t.length} tramos de 5 s | max ${t.reduce((m, x) => Math.max(m, x.max), 0)} ms | ${t.reduce((s, x) => s + x.sobre50, 0)} pasan de 50 ms`)
  }
}

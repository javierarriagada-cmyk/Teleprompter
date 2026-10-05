// LAS CAPTURAS DE LA FICHA, EN SU ORDEN -tarea 86, puesta al día del 05-10-2026-. Un solo lugar
// para qué se captura, en qué pantalla, con qué persona y cómo se llama el archivo: lo leen
// capturar.cjs, componer.cjs, lamina.cjs y comprobar.cjs. Antes el orden estaba repetido en los
// cuatro -LISTA, NOMBRES_TEL, el "n === 4" de la horizontal- y cambiar una escena pedía tocarlos todos.
//
// EL ORDEN DEL TELÉFONO es el que pidió Javier el 05-10-2026: leer siguiendo la voz, el guion con
// formatos, grabar con la cámara detrás, la pausa, los subtítulos en el visor, la tira de filtros
// abierta y de lado. Play acepta entre 2 y 8; son 7. La primera es la que más se ve.
// -Javier, 05-10-2026, más tarde- Vuelve el recuadro, como la 08: grabar con la cámara en el recuadro
// chico y el texto leyéndose al lado. Con la C, que en el teléfono no salía y en el recuadro chico no
// se nota blanda. Son 8, el máximo de Play.
// Antes -29-09-2026-: 01 leer, 02 grabar detrás, 03 recuadro, 04 de lado, 05 editor,
// 06 subtítulos, 07 portada, 08 ajustes.
//
// Las personas -fuente/LICENCIA-personas.txt, todas generadas-: A mujer de 30, B hombre de 60,
// C hombre de 25, D mujer de 55 en la cocina -la toma del visor, por el guion del pan-, E mujer de
// 40. A, B y D son verticales; C y E, horizontales: van en las pantallas de lado.
//
// LAS TABLETAS, de pie y de lado, con el diseño de tableta de la tarea 83 -ya en main-. Cuatro por
// tamaño: Play pide al menos cuatro para mostrar la app en pantallas grandes. Sin titulares: para
// pantallas grandes Play pide no agregar texto que no sea de la app -answer/9866151-.
// La cuarta es el visor con la tira de filtros, de pie: en la tableta el video se ve grande y caben
// los seis filtros. Se probaron y quedaron fuera -05-10-2026-: leer de lado -casi igual a leer de
// pie-, el editor -la barra de formato tapa la cabecera y Leer y Grabar tapan el final del texto,
// igual que antes- y el visor de lado -con la toma vertical, la tarjeta queda chica junto al video-.
// Antes -tableta provisional, 29-09-2026-: leer, grabar detrás, de lado y el editor.
const TELEFONO = [
  { nombre: '01-leer', escena: 'leer', pantalla: 'tel-v' },
  { nombre: '02-editor', escena: 'editor', pantalla: 'tel-v' },
  { nombre: '03-grabar-detras', escena: 'grabar-detras', pantalla: 'tel-v', persona: 'A' },
  { nombre: '04-pausa', escena: 'pausa', pantalla: 'tel-v', persona: 'B' },
  { nombre: '05-subtitulos', escena: 'visor', pantalla: 'tel-v' },
  { nombre: '06-filtros', escena: 'filtros', pantalla: 'tel-v' },
  { nombre: '07-de-lado', escena: 'grabar-detras', pantalla: 'tel-h', persona: 'E' },
  { nombre: '08-recuadro', escena: 'grabar-recuadro', pantalla: 'tel-v', persona: 'C' }
]

const TABLETA = {
  7: [
    { nombre: '01-leer', escena: 'leer', pantalla: 'tab7-v' },
    { nombre: '02-grabar-detras', escena: 'grabar-detras', pantalla: 'tab7-v', persona: 'B' },
    { nombre: '03-de-lado', escena: 'grabar-detras', pantalla: 'tab7-h', persona: 'C' },
    { nombre: '04-filtros', escena: 'filtros', pantalla: 'tab7-v' }
  ],
  10: [
    { nombre: '01-leer', escena: 'leer', pantalla: 'tab10-v' },
    { nombre: '02-grabar-detras', escena: 'grabar-detras', pantalla: 'tab10-v', persona: 'D' },
    { nombre: '03-de-lado', escena: 'grabar-detras', pantalla: 'tab10-h', persona: 'C' },
    { nombre: '04-filtros', escena: 'filtros', pantalla: 'tab10-v' }
  ]
}

// De lado: la pantalla termina en -h.
const deLado = (e) => e.pantalla.endsWith('-h')

module.exports = { TELEFONO, TABLETA, deLado }

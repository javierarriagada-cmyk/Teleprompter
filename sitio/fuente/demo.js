// LA PAGINA: lo que corre en el navegador. 27-09-2026, docs/el-sitio.md v2.
//
// ESTE ES EL CODIGO QUE SE PUBLICA, y todo JavaScript publicado se puede leer. No trae nada de
// la aplicacion: ni el seguidor, ni el avance, ni la conduccion, ni el destacado, ni la banda,
// ni copias reescritas -Javier, 27-09-2026-. Lo que la pagina muestra sale del JSON que arma
// sitio/fuente/lectura.js al armar el sitio. armar.mjs se para si este archivo, o lo que
// importa, trae algo de fuera de sitio/fuente o a lectura.js.
//
// GSAP, ScrollTrigger y Lenis llegan antes, cada uno en su <script>, desde /vendor.

import { iniciarEscenas } from './escenas.js'

function iniciar() {
  const datosEl = document.getElementById('demo-datos')
  if (!datosEl) return
  const datos = JSON.parse(datosEl.textContent)
  // Las palabras se miden con la letra verdadera: con la de reemplazo los renglones cortarian
  // en otro lado.
  const fuentes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
  fuentes.then(() => iniciarEscenas(datos), () => iniciarEscenas(datos))
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar)
else iniciar()

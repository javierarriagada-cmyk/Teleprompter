// LOS BORDES SEGUROS EN PX -07-10-2026, revision de la tarea 102-.
//
// La app dibuja de borde a borde: window.innerHeight incluye lo que queda bajo la barra de estado y
// bajo la barra de botones de Android. CSS los conoce -env(safe-area-inset-*)- y JS no, asi que se
// leen de un elemento invisible. Sin borde -navegador de escritorio, pruebas- dan 0.
// Lo usan los menus pegados -PantallaAjustes, BibliotecaView- para no abrirse debajo de una barra:
// medido en el moto g86, el menu de Idioma tapaba "English" con la barra de botones.
export function bordesSeguros(): { arriba: number; abajo: number } {
  if (typeof document === 'undefined' || !document.body) return { arriba: 0, abajo: 0 }
  const sonda = document.createElement('div')
  sonda.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)'
  document.body.appendChild(sonda)
  const cs = getComputedStyle(sonda)
  const r = { arriba: parseFloat(cs.paddingTop) || 0, abajo: parseFloat(cs.paddingBottom) || 0 }
  sonda.remove()
  return r
}

// Donde va un menu pegado a un ancla: abajo si cabe, si no arriba, y siempre dentro de la pantalla
// util. Funcion pura para poder probarla sin navegador.
export function colocarMenu(
  ancla: { top: number; bottom: number; left: number; right: number },
  menu: { alto: number; ancho: number },
  pantalla: { alto: number; ancho: number },
  borde: { arriba: number; abajo: number },
  alinear: 'derecha' | 'izquierda',
  sangria = 0
): { top: number; left: number; arriba: boolean } {
  const gap = 4
  const limiteAbajo = pantalla.alto - borde.abajo
  const espacioAbajo = limiteAbajo - ancla.bottom - gap
  const arriba = menu.alto > espacioAbajo && ancla.top - gap - borde.arriba >= espacioAbajo
  let top = arriba ? ancla.top - menu.alto - gap : ancla.bottom + gap
  top = Math.max(borde.arriba + 8, Math.min(top, limiteAbajo - menu.alto - 8))
  let left = alinear === 'derecha' ? ancla.right - menu.ancho : ancla.left + sangria
  left = Math.max(8, Math.min(left, pantalla.ancho - menu.ancho - 8))
  return { top, left, arriba }
}

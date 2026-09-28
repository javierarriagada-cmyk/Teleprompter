import { fireEvent } from '@testing-library/react'

// LA LISTA DE LA PORTADA SE PLIEGA -tarea 76, 28-09-2026-. Muestra los 3 guiones más recientes
// -GUIONES_A_LA_VISTA, BibliotecaView.tsx- y "Ver todos". La búsqueda y "Archivados" viven en
// la lista desplegada. Una prueba que busca la fila de un guion que queda cuarto o más abajo, la
// búsqueda o "Archivados" despliega primero con esto, tocando el mismo botón que toca la
// persona.
//
// NO se arregla subiendo el límite ni apagando el plegado en pruebas: eso probaría una app que
// nadie usa.
//
// Si la lista ya está desplegada -el estado se recuerda en la sesión- no toca nada. Si no hay
// "Ver todos" lo dice: la lista tiene 3 guiones o menos, o no es la portada, y la prueba que
// lo llamó está mirando otra cosa que la que cree.
export function desplegarGuiones(raiz: ParentNode = document): void {
  const boton = raiz.querySelector('[data-testid="btn-ver-todos-guiones"]') as HTMLElement | null
  if (!boton) {
    throw new Error('No está "Ver todos" -data-testid="btn-ver-todos-guiones"-: la lista tiene 3 guiones o menos, o no es la portada')
  }
  if (boton.getAttribute('aria-expanded') === 'true') return
  fireEvent.click(boton)
}

import React from 'react'
import { describe, test, expect } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import 'fake-indexeddb/auto'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { Guion } from '../datos/modelo'

// BAJAR LA PANTALLA SOBRE UN GUION NO LO ABRE -28-09-2026-. Al desplazar empezando sobre una fila,
// Android cancela el puntero -el gesto es de la pagina- y despues llega el touchend. La fila
// escuchaba los dos y el touchend abria el guion. Ahora solo abre el click, que el navegador no
// dispara cuando hubo desplazamiento.
describe('Desplazar sobre la lista de guiones', () => {
  async function portadaConUnGuion() {
    const repo = new RepositorioMemoria()
    const g: Guion = {
      id: 'g-despl',
      titulo: 'Guion para desplazar',
      idioma: 'es',
      creado: Date.now(),
      modificado: Date.now(),
      bloques: [{ id: 'b', nombre: '', texto: 'Texto del guion para desplazar' }]
    }
    await repo.guardar(g)
    let container!: HTMLElement
    await act(async () => {
      container = render(<App repoOverride={repo} />).container
      await new Promise((r) => setTimeout(r, 600))
    })
    const fila = () => container.querySelector('[data-testid="fila-guion-g-despl"]') as HTMLElement | null
    return { fila }
  }

  test('D1 Un desplazamiento que el telefono cancela -pointercancel y touchend- no abre el guion', async () => {
    const { fila } = await portadaConUnGuion()
    const f = fila()!
    await act(async () => {
      fireEvent.pointerDown(f, { clientX: 100, clientY: 300 })
      fireEvent.touchStart(f, { touches: [{ clientX: 100, clientY: 300 }] })
      fireEvent.pointerCancel(f)
      fireEvent.touchEnd(f)
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(fila(), 'la portada se fue: el guion se abrio al desplazar').not.toBeNull()
  })

  test('D2 La fila deja el gesto vertical a la pagina, y un toque normal si abre', async () => {
    const { fila } = await portadaConUnGuion()
    expect(fila()!.style.touchAction).toBe('pan-y')
    await act(async () => {
      fireEvent.click(fila()!)
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(fila()).toBeNull()
  })
})

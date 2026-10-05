// AYUDA DE LAS PRUEBAS DE LA TAREA 87 -04-10-2026-. El CamaraNativa fingido -lo que llega al
// nativo queda anotado- está en ayudaTarea87Nativo.ts; aquí, cómo abrir una toma en el visor a través de <App>, como lo hace la
// persona: portada -> guion -> banda de tomas -> la toma. No es una prueba: lo importan las de la 87.
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion, ResumenGrabacion, grabacionNueva } from '../datos/modelo'

export { TOMA_REGISTRO, estadoNativoNuevo, camaraNativaFingida, recetaQueLlego } from './ayudaTarea87Nativo'
export type { EstadoNativo } from './ayudaTarea87Nativo'

export function guionDePrueba(): Guion {
  return {
    id: 'g-87', titulo: 'Larralde', idioma: 'es', creado: 1_000_000, modificado: 1_000_000, archivado: false,
    bloques: [{ id: 'b-87', nombre: '', texto: 'Texto del guion de la tarea 87, para leer en voz alta.' }]
  }
}

export function tomaDePrueba(extra: Partial<ResumenGrabacion> = {}): ResumenGrabacion {
  return grabacionNueva({
    id: '008a7133',
    guionId: 'g-87',
    tituloGuion: 'Larralde',
    ruta: '/grabaciones/008a7133.mp4',
    rutaMiniatura: '',
    duracionMs: 50_000,
    creado: 2_000_000,
    ...extra
  })
}

// Portada -> guion -> la toma de la banda. Devuelve cuando el visor tiene su ficha de Subtítulos.
export async function abrirTomaEnApp(id: string, conFicha = true) {
  const repo = new RepositorioMemoria()
  await repo.guardar(guionDePrueba())
  await act(async () => {
    render(<App repoOverride={repo} motor={new MotorFake()} />)
    await new Promise((r) => setTimeout(r, 600))
  })
  await act(async () => {
    fireEvent.click(screen.getByTestId('fila-guion-g-87'))
    await new Promise((r) => setTimeout(r, 100))
  })
  await act(async () => {
    fireEvent.click(screen.getByTestId(`toma-banda-${id}`))
    await new Promise((r) => setTimeout(r, 50))
  })
  if (conFicha) await screen.findByTestId('btn-subtitulos')
}

// Elige un estilo en la ficha, como la persona: abre el panel y toca la opción.
export async function elegirEstilo(nombre: string) {
  await act(async () => { fireEvent.click(screen.getByTestId('btn-subtitulos')) })
  await act(async () => { fireEvent.click(screen.getByLabelText(nombre)) })
}

export async function esperar(ms = 30) {
  await act(async () => { await new Promise((r) => setTimeout(r, ms)) })
}

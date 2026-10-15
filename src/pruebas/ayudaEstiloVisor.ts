// AYUDA DE LAS PRUEBAS DEL VISOR -tomas-largas-. No es una prueba.
import { fireEvent, act } from '@testing-library/react'

// -tomas-largas, 15-10-2026- Cada toma parte en «No» y el estilo ya no se trae de lo recordado: las
// pruebas que antes ponían 'sigo_subtitulos_estilo' antes de abrir el visor eligen ahora el estilo en
// el visor, como la persona -el botón Subtítulos y la opción por su nombre: 'Amarillo', 'Rojo'...-.
export async function elegirEstiloEnVisor(nombre: string) {
  await act(async () => { fireEvent.click(document.querySelector('[data-testid="btn-subtitulos"]') as HTMLElement) })
  await act(async () => { fireEvent.click(document.querySelector(`[data-testid="opciones-subtitulos"] button[aria-label="${nombre}"]`) as HTMLElement) })
}

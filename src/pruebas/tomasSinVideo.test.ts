import { describe, expect, test, vi } from 'vitest'

// Que videos siguen en la galeria del telefono, para esta prueba.
const enGaleria = new Set<string>(['content://media/1'])
const borrados: string[] = []

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    existeEnGaleria: async (uri: string) => {
      if (uri === 'content://media/falla') throw new Error('no se pudo consultar')
      return enGaleria.has(uri)
    },
    borrarArchivo: async (ruta: string) => { borrados.push(ruta) },
    directorioGrabaciones: async () => '/grabaciones'
  }
})

import { quitarTomasSinVideo } from '../lib/tomaVideo'
import { RepositorioGrabacionesMemoria } from '../datos/RepositorioGrabacionesMemoria'
import { grabacionNueva } from '../datos/modelo'

describe('Una toma guardada cuyo video se borro desde la galeria deja de aparecer', () => {
  test('se quita la que ya no esta; quedan la que esta, la no guardada y la que no se pudo consultar', async () => {
    const repo = new RepositorioGrabacionesMemoria()
    await repo.guardar(grabacionNueva({ id: 'sigue', tituloGuion: 'A', ruta: 'content://media/1', galeriaUri: 'content://media/1' }))
    await repo.guardar(grabacionNueva({ id: 'borrada', tituloGuion: 'B', ruta: 'content://media/2', galeriaUri: 'content://media/2' }))
    await repo.guardar(grabacionNueva({ id: 'sin-guardar', tituloGuion: 'C', ruta: '/grabaciones/sin-guardar.mp4' }))
    await repo.guardar(grabacionNueva({ id: 'dudosa', tituloGuion: 'D', ruta: 'content://media/falla', galeriaUri: 'content://media/falla' }))

    const quedan = await quitarTomasSinVideo(repo)
    expect(quedan.map((g) => g.id).sort()).toEqual(['dudosa', 'sigue', 'sin-guardar'])
    expect((await repo.listar()).map((g) => g.id).sort()).toEqual(['dudosa', 'sigue', 'sin-guardar'])
    // Lo que quedaba de ella en la carpeta de Sigo tambien se limpia.
    expect(borrados).toContain('/grabaciones/borrada.motor.txt')
    expect(borrados).toContain('/grabaciones/borrada.jpg')
  })
})

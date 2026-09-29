import { describe, expect, test, vi } from 'vitest'

// TAREA 85 -29-09-2026-: AL RESTAURAR UN RESPALDO, LAS TOMAS SIN VIDEO NO SE MUESTRAN.
//
// El respaldo de la tarea 84 lleva la base IndexedDB -ahí está el índice de las tomas- y deja
// fuera files/grabaciones, donde viven los videos que no se guardaron en la galería: pesan
// cientos de MB y Android respalda 25 como mucho. Al reinstalar vuelve la lista y no vuelven
// los videos. Decisión de Javier: esas tomas no aparecen. quitarTomasSinVideo ya las quitaba
// cuando el video guardado en la galería se borraba desde ahí; no miraba las que nunca se
// guardaron -sin galeriaUri-, y esas eran justo las que el respaldo deja sin video.

// Qué hay en el teléfono restaurado, para esta prueba.
const enGaleria = new Set<string>(['content://media/1'])
const bytesEnDisco = new Map<string, number>([['/grabaciones/local.mp4', 5_000_000]])
const borrados: string[] = []

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual: any = await importOriginal()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('../lib/archivosNativos', async (importOriginal) => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    existeEnGaleria: async (uri: string) => enGaleria.has(uri),
    bytesDe: async (ruta: string) => {
      if (ruta === '/grabaciones/dudosa.mp4') throw new Error('no se pudo consultar')
      return bytesEnDisco.get(ruta) ?? 0
    },
    borrarArchivo: async (ruta: string) => { borrados.push(ruta) },
    directorioGrabaciones: async () => '/grabaciones'
  }
})

import { quitarTomasSinVideo } from '../lib/tomaVideo'
import { RepositorioGrabacionesMemoria } from '../datos/RepositorioGrabacionesMemoria'
import { grabacionNueva } from '../datos/modelo'

describe('Tarea 85 - Tras restaurar un respaldo, las tomas cuyo video no volvió no aparecen', () => {
  test('T85e Sale la toma sin guardar cuyo archivo no está y la de la galería del teléfono anterior; quedan las que tienen video y las que no se pudieron mirar.', async () => {
    const repo = new RepositorioGrabacionesMemoria()
    await repo.guardar(grabacionNueva({ id: 'en-galeria', tituloGuion: 'A', ruta: 'content://media/1', galeriaUri: 'content://media/1' }))
    await repo.guardar(grabacionNueva({ id: 'galeria-anterior', tituloGuion: 'B', ruta: 'content://media/9', galeriaUri: 'content://media/9' }))
    await repo.guardar(grabacionNueva({ id: 'local', tituloGuion: 'C', ruta: '/grabaciones/local.mp4' }))
    await repo.guardar(grabacionNueva({ id: 'restaurada', tituloGuion: 'D', ruta: '/grabaciones/restaurada.mp4', rutaMiniatura: '/grabaciones/restaurada.jpg' }))
    await repo.guardar(grabacionNueva({ id: 'dudosa', tituloGuion: 'E', ruta: '/grabaciones/dudosa.mp4' }))
    await repo.guardar(grabacionNueva({ id: 'sin-ruta', tituloGuion: 'F', ruta: '' }))

    const quedan = await quitarTomasSinVideo(repo)
    const esperadas = ['dudosa', 'en-galeria', 'local', 'sin-ruta']
    expect(quedan.map((g) => g.id).sort()).toEqual(esperadas)
    expect((await repo.listar()).map((g) => g.id).sort()).toEqual(esperadas)
    // Lo que quedaba de ella en la carpeta de Sigo -la miniatura, que tampoco volvió- se limpia.
    expect(borrados).toContain('/grabaciones/restaurada.jpg')
  })
})

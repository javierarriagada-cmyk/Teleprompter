import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { grabacionNueva, ResumenGrabacion, guionNuevo } from '../datos/modelo'
import { RepositorioGrabacionesIndexedDB } from '../datos/RepositorioGrabacionesIndexedDB'
import { RepositorioGrabacionesMemoria } from '../datos/RepositorioGrabacionesMemoria'
import { RepositorioIndexedDB } from '../datos/RepositorioIndexedDB'
import { olvidarDb } from '../datos/abrirDb'
import {
  sidecarInicial,
  parsearSidecar,
  reconocerPendiente,
  marcarLista,
  marcarIncompleta
} from '../lib/sidecar'
import { veredictoMudo, UMBRAL_RMS_DB } from '../lib/detectorMudo'

describe('Tarea 64 - indice, sidecar y mudo', () => {
  beforeEach(() => {
    olvidarDb()
    indexedDB.deleteDatabase('teleprompter_db')
  })

  it('el indice de grabaciones se escribe y se lee, en un almacen aparte de guiones', async () => {
    const repoG = new RepositorioIndexedDB()
    const repoT = new RepositorioGrabacionesIndexedDB()
    const guion = guionNuevo('es')
    guion.titulo = 'Guion de prueba'
    await repoG.guardar(guion)

    const toma = grabacionNueva({
      tituloGuion: 'Guion de prueba',
      guionId: guion.id,
      duracionMs: 4300,
      bytes: 12345,
      ruta: '/grabaciones/a.mp4',
      rutaMiniatura: '/grabaciones/a.jpg',
      tieneAudio: true
    })
    await repoT.guardar(toma)

    const leida = await repoT.abrir(toma.id)
    expect(leida).not.toBeNull()
    expect(leida!.tituloGuion).toBe('Guion de prueba')
    expect(leida!.duracionMs).toBe(4300)
    expect(leida!.ruta).toBe('/grabaciones/a.mp4')

    const listaT = await repoT.listar()
    expect(listaT.map((g) => g.id)).toContain(toma.id)

    const listaG = await repoG.listar()
    expect(listaG.map((g) => g.id)).toContain(guion.id)
    expect(listaG.map((g) => g.id)).not.toContain(toma.id)
  })

  it('una grabacion incompleta se reconoce al arrancar desde el sidecar', () => {
    const s = sidecarInicial({
      id: 'toma-caida',
      tituloGuion: 'Hola',
      rutaPart: '/grabaciones/toma-caida.mp4.part'
    })
    s.milisegundos = 2500
    s.bytes = 80000

    expect(reconocerPendiente(s)).toBe(true)
    expect(reconocerPendiente(marcarLista(s))).toBe(false)
    expect(reconocerPendiente(marcarIncompleta(s))).toBe(true)

    const parseado = parsearSidecar(JSON.stringify(s))
    expect(parseado).not.toBeNull()
    expect(reconocerPendiente(parseado)).toBe(true)

    const resumen: ResumenGrabacion = grabacionNueva({
      id: parseado!.id,
      tituloGuion: parseado!.tituloGuion,
      duracionMs: parseado!.milisegundos,
      bytes: parseado!.bytes,
      ruta: parseado!.rutaPart || '',
      incompleta: true
    })
    expect(resumen.incompleta).toBe(true)
    expect(resumen.duracionMs).toBe(2500)
  })

  it('el cruce del mudo marca error duro cuando hubo voz y no hay pista', () => {
    const duro = veredictoMudo({
      tienePistaAudio: false,
      nivelRmsDb: null,
      frasesOidas: 4
    })
    expect(duro.errorDuro).toBe(true)
    expect(duro.aviso).toBe(false)
    expect(duro.mudo).toBe(true)

    const aviso = veredictoMudo({
      tienePistaAudio: false,
      nivelRmsDb: null,
      frasesOidas: 0
    })
    expect(aviso.errorDuro).toBe(false)
    expect(aviso.aviso).toBe(true)

    const bien = veredictoMudo({
      tienePistaAudio: true,
      nivelRmsDb: -25,
      frasesOidas: 3
    })
    expect(bien.mudo).toBe(false)
    expect(bien.errorDuro).toBe(false)

    const pistaVacia = veredictoMudo({
      tienePistaAudio: true,
      nivelRmsDb: -60.2,
      frasesOidas: 2
    })
    expect(pistaVacia.errorDuro).toBe(true)
    expect(pistaVacia.mudo).toBe(true)
    expect(UMBRAL_RMS_DB).toBe(-50)
  })

  it('rompe a proposito el cruce: si se ignora frasesOidas, el error duro desaparece y la prueba lo pesca', () => {
    const senales = { tienePistaAudio: false, nivelRmsDb: null, frasesOidas: 5 }
    const correcto = veredictoMudo(senales)
    expect(correcto.errorDuro).toBe(true)

    const malHecho = {
      mudo: senales.tienePistaAudio === false,
      errorDuro: false,
      aviso: senales.tienePistaAudio === false
    }
    expect(malHecho.errorDuro).not.toBe(correcto.errorDuro)
  })

  it('RepositorioGrabacionesMemoria guarda y borra', async () => {
    const repo = new RepositorioGrabacionesMemoria()
    const g = grabacionNueva({ tituloGuion: 'X', ruta: '/x.mp4' })
    await repo.guardar(g)
    expect((await repo.listar()).length).toBe(1)
    await repo.borrar(g.id)
    expect((await repo.listar()).length).toBe(0)
    expect(await repo.abrir(g.id)).toBeNull()
  })
})

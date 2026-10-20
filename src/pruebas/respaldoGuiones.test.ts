// -orden B, respaldo de los guiones, 20-10-2026- Solo lógica, con Firestore simulado. Nada de posiciones.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sim = vi.hoisted(() => ({
  orden: [] as string[],
  docsEnNube: 0,
  falla: false,
  usuario: null as any,
  pluginEntrar: vi.fn(),
  reauth: vi.fn()
}))

// Firestore simulado para borrar la cuenta: getDocs trae sim.docsEnNube documentos y cada lote anota.
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ruta: string) => ({ ruta }),
  getDocs: async () => ({ docs: Array.from({ length: sim.docsEnNube }, (_, i) => ({ ref: 'd' + i })) }),
  writeBatch: () => {
    let n = 0
    return {
      delete: () => { n++ },
      commit: async () => {
        if (sim.falla) throw new Error('sin permiso')
        sim.orden.push('lote:' + n)
      }
    }
  }
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<any>()),
  Capacitor: { ...(await original<any>()).Capacitor, isPluginAvailable: (n: string) => n === 'CuentaGoogle' },
  registerPlugin: () => ({ entrar: sim.pluginEntrar, salir: async () => {} })
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => {
  const auth: any = { get currentUser() { return sim.usuario } }
  return {
    getAuth: () => auth,
    onAuthStateChanged: vi.fn(),
    GoogleAuthProvider: { credential: (idToken: string) => ({ idToken }) },
    signInWithCredential: vi.fn(),
    signOut: async () => {},
    reauthenticateWithCredential: sim.reauth
  }
})

import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { DocumentoGuion, NubeGuiones, RepositorioSincronizado, MAXIMO_BYTES } from '../datos/RepositorioSincronizado'
import { Guion } from '../datos/modelo'
import { borrarGuionesDeLaNube } from '../lib/respaldo'
import { borrarCuenta, registrarAntesDeBorrar } from '../lib/cuenta'

function guion(id: string, modificado: number, texto = 'hola'): Guion {
  return { id, titulo: 'T ' + id, idioma: 'es', creado: 1, modificado, bloques: [{ id: 'b', nombre: '', texto }] }
}

// La nube simulada: guarda lo subido y deja mandar fotos de la colección a mano.
function nubeSimulada() {
  const subidos: DocumentoGuion[] = []
  let oyente: ((docs: DocumentoGuion[], primera: boolean) => void) | null = null
  const nube: NubeGuiones = {
    subir: async (d) => { subidos.push(d) },
    escuchar: (f) => { oyente = f; return () => { oyente = null } }
  }
  return { nube, subidos, mandar: (docs: DocumentoGuion[], primera = false) => oyente?.(docs, primera) }
}

async function esperar() {
  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0))
}

describe('RepositorioSincronizado', () => {
  let local: RepositorioMemoria
  beforeEach(() => { local = new RepositorioMemoria() })

  it('guardar guarda en el teléfono y sube; borrar borra y deja la marca de borrado', async () => {
    const { nube, subidos } = nubeSimulada()
    const repo = new RepositorioSincronizado(local, nube)
    const g = guion('a', 0)
    await repo.guardar(g)
    expect((await local.abrir('a'))?.titulo).toBe('T a')
    expect(subidos).toHaveLength(1)
    expect(subidos[0]).toMatchObject({ id: 'a', modificado: g.modificado })
    // Sin campos undefined: Firestore no los acepta.
    expect(JSON.stringify(subidos[0])).not.toContain('undefined')
    expect(Object.values(subidos[0]).includes(undefined)).toBe(false)
    await repo.borrar('a')
    expect(await local.abrir('a')).toBeNull()
    expect(subidos[1]).toMatchObject({ id: 'a', borrado: true })
    expect((subidos[1] as any).modificado).toBeGreaterThan(0)
  })

  it('remoto más nuevo → se escribe en el teléfono con SU modificado, y no vuelve a subir', async () => {
    await local.guardarTal(guion('a', 100, 'viejo'))
    const cambios = vi.fn()
    const { nube, subidos, mandar } = nubeSimulada()
    const repo = new RepositorioSincronizado(local, nube, cambios)
    repo.iniciar()
    mandar([guion('a', 200, 'nuevo')])
    await esperar()
    const g = await local.abrir('a')
    expect(g?.modificado).toBe(200)
    expect(g?.bloques[0].texto).toBe('nuevo')
    expect(subidos).toHaveLength(0)
    expect(cambios).toHaveBeenCalled()
    // El eco del mismo documento no hace nada.
    mandar([guion('a', 200, 'nuevo')])
    await esperar()
    expect(subidos).toHaveLength(0)
  })

  it('local más nuevo → sube el del teléfono', async () => {
    await local.guardarTal(guion('a', 300, 'mío'))
    const { nube, subidos, mandar } = nubeSimulada()
    new RepositorioSincronizado(local, nube).iniciar()
    mandar([guion('a', 200, 'otro')])
    await esperar()
    expect(subidos).toHaveLength(1)
    expect((subidos[0] as Guion).bloques[0].texto).toBe('mío')
    expect((await local.abrir('a'))?.modificado).toBe(300)
  })

  it('borrado remoto → se borra en el teléfono; si el del teléfono es más nuevo, sube', async () => {
    await local.guardarTal(guion('a', 100))
    await local.guardarTal(guion('b', 500))
    const { nube, subidos, mandar } = nubeSimulada()
    new RepositorioSincronizado(local, nube).iniciar()
    mandar([{ id: 'a', borrado: true, modificado: 200 }, { id: 'b', borrado: true, modificado: 400 }])
    await esperar()
    expect(await local.abrir('a')).toBeNull()
    expect(await local.abrir('b')).not.toBeNull()
    expect(subidos.map((d) => d.id)).toEqual(['b'])
  })

  it('el guion de bienvenida no sube', async () => {
    const { nube, subidos, mandar } = nubeSimulada()
    const repo = new RepositorioSincronizado(local, nube)
    await repo.guardar(guion('bienvenida-123', 0))
    await repo.borrar('bienvenida-123')
    await local.guardarTal(guion('bienvenida-9', 50))
    repo.iniciar()
    mandar([], true)
    await esperar()
    expect(subidos).toHaveLength(0)
  })

  it('el de más de 900 KB no sube y avisa', async () => {
    const estados = vi.fn()
    const { nube, subidos } = nubeSimulada()
    const repo = new RepositorioSincronizado(local, nube, () => {}, estados)
    await repo.guardar(guion('grande', 0, 'x'.repeat(MAXIMO_BYTES + 10)))
    expect(subidos).toHaveLength(0)
    expect(await local.abrir('grande')).not.toBeNull()
    expect(repo.estado().demasiadoLargos).toEqual(['grande'])
    expect(estados).toHaveBeenLastCalledWith({ pendientes: 0, demasiadoLargos: ['grande'] })
  })

  it('al entrar por primera vez se juntan los dos lados: mismo id, gana el modificado mayor', async () => {
    await local.guardarTal(guion('solo-aqui', 10))
    await local.guardarTal(guion('ambos-aqui-gana', 900, 'teléfono'))
    await local.guardarTal(guion('ambos-nube-gana', 100, 'teléfono'))
    const { nube, subidos, mandar } = nubeSimulada()
    new RepositorioSincronizado(local, nube).iniciar()
    mandar([guion('solo-alla', 20), guion('ambos-aqui-gana', 800, 'nube'), guion('ambos-nube-gana', 700, 'nube')], true)
    await esperar()
    expect((await local.abrir('solo-alla'))?.modificado).toBe(20)
    expect((await local.abrir('ambos-nube-gana'))?.bloques[0].texto).toBe('nube')
    expect((await local.abrir('ambos-aqui-gana'))?.bloques[0].texto).toBe('teléfono')
    expect(subidos.map((d) => d.id).sort()).toEqual(['ambos-aqui-gana', 'solo-aqui'])
  })
})

describe('borrar la cuenta', () => {
  beforeEach(() => {
    sim.orden = []
    sim.falla = false
    sim.usuario = { uid: 'u1', email: 'j@e.cl', delete: vi.fn(async () => { sim.orden.push('user.delete') }) }
    sim.pluginEntrar.mockReset().mockResolvedValue({ idToken: 't' })
    sim.reauth.mockReset().mockResolvedValue(undefined)
  })

  it('borra TODOS los documentos, en lotes de hasta 500, antes del usuario', async () => {
    sim.docsEnNube = 1201
    const quitar = registrarAntesDeBorrar(() => borrarGuionesDeLaNube({} as any, 'u1'))
    expect(await borrarCuenta()).toEqual({ ok: true })
    quitar()
    expect(sim.orden).toEqual(['lote:500', 'lote:500', 'lote:201', 'user.delete'])
  })

  it('si borrar los documentos falla, el usuario no se borra', async () => {
    sim.docsEnNube = 3
    sim.falla = true
    const quitar = registrarAntesDeBorrar(() => borrarGuionesDeLaNube({} as any, 'u1'))
    const r = await borrarCuenta()
    quitar()
    expect('error' in r).toBe(true)
    expect(sim.usuario.delete).not.toHaveBeenCalled()
  })
})

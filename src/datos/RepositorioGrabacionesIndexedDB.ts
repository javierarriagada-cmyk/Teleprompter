import { RepositorioGrabaciones } from './RepositorioGrabaciones'
import { ResumenGrabacion } from './modelo'
import { abrirDb, STORE_GRABACIONES } from './abrirDb'

export class RepositorioGrabacionesIndexedDB implements RepositorioGrabaciones {
  async listar(): Promise<ResumenGrabacion[]> {
    const db = await abrirDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GRABACIONES, 'readonly')
      const store = tx.objectStore(STORE_GRABACIONES)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result: ResumenGrabacion[] = request.result || []
        result.sort((a, b) => b.creado - a.creado)
        resolve(result)
      }
    })
  }

  async abrir(id: string): Promise<ResumenGrabacion | null> {
    const db = await abrirDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GRABACIONES, 'readonly')
      const store = tx.objectStore(STORE_GRABACIONES)
      const request = store.get(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async guardar(g: ResumenGrabacion): Promise<void> {
    const db = await abrirDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GRABACIONES, 'readwrite')
      const store = tx.objectStore(STORE_GRABACIONES)
      const request = store.put(g)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async borrar(id: string): Promise<void> {
    const db = await abrirDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GRABACIONES, 'readwrite')
      const store = tx.objectStore(STORE_GRABACIONES)
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }
}

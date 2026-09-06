import { RepositorioGuiones } from './RepositorioGuiones'
import { Guion, ResumenGuion, contarPalabras } from './modelo'

const DB_NAME = 'teleprompter_db'
const DB_VERSION = 1
const STORE_NAME = 'guiones'

export class RepositorioIndexedDB implements RepositorioGuiones {
  private dbPromise: Promise<IDBDatabase> | null = null
  private ultimoModificado = 0

  private obtenerDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no está disponible en este entorno'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(request.error || new Error('Error al abrir IndexedDB'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
    })

    return this.dbPromise
  }

  async listar(): Promise<ResumenGuion[]> {
    try {
      const db = await this.obtenerDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.getAll()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const result: Guion[] = request.result || []
          const resumenes: ResumenGuion[] = result.map((g) => ({
            id: g.id,
            titulo: g.titulo || 'Sin título',
            idioma: g.idioma,
            modificado: g.modificado,
            palabras: contarPalabras(g)
          }))
          resumenes.sort((a, b) => b.modificado - a.modificado)
          resolve(resumenes)
        }
      })
    } catch (e) {
      console.warn('[RepositorioIndexedDB] Error en listar:', e)
      throw e
    }
  }

  async abrir(id: string): Promise<Guion | null> {
    try {
      const db = await this.obtenerDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const request = store.get(id)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          resolve(request.result || null)
        }
      })
    } catch (e) {
      console.warn('[RepositorioIndexedDB] Error en abrir:', e)
      throw e
    }
  }

  async guardar(g: Guion): Promise<void> {
    try {
      const db = await this.obtenerDb()
      let ahora = Date.now()
      if (ahora <= this.ultimoModificado) {
        ahora = this.ultimoModificado + 1
      }
      this.ultimoModificado = ahora
      g.modificado = ahora
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.put(g)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (e) {
      console.warn('[RepositorioIndexedDB] Error en guardar:', e)
      throw e
    }
  }

  async borrar(id: string): Promise<void> {
    try {
      const db = await this.obtenerDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })
    } catch (e) {
      console.warn('[RepositorioIndexedDB] Error en borrar:', e)
      throw e
    }
  }
}

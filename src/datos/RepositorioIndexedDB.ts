import { RepositorioGuiones } from './RepositorioGuiones'
import { Guion, ResumenGuion, contarPalabras } from './modelo'
import { abrirDb, STORE_GUIONES } from './abrirDb'

export class RepositorioIndexedDB implements RepositorioGuiones {
  private ultimoModificado = 0

  private obtenerDb(): Promise<IDBDatabase> {
    return abrirDb()
  }

  async listar(): Promise<ResumenGuion[]> {
    try {
      const db = await this.obtenerDb()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GUIONES, 'readonly')
        const store = tx.objectStore(STORE_GUIONES)
        const request = store.getAll()

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const result: Guion[] = request.result || []
          const resumenes: ResumenGuion[] = result.map((g) => ({
            id: g.id,
            titulo: g.titulo || 'Sin título',
            idioma: g.idioma,
            modificado: g.modificado,
            palabras: contarPalabras(g),
            archivado: Boolean(g.archivado)
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
        const tx = db.transaction(STORE_GUIONES, 'readonly')
        const store = tx.objectStore(STORE_GUIONES)
        const request = store.get(id)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const g: Guion | undefined = request.result
          if (!g) {
            resolve(null)
            return
          }
          resolve({
            ...g,
            archivado: Boolean(g.archivado)
          })
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
      g.archivado = Boolean(g.archivado)
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_GUIONES, 'readwrite')
        const store = tx.objectStore(STORE_GUIONES)
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
        const tx = db.transaction(STORE_GUIONES, 'readwrite')
        const store = tx.objectStore(STORE_GUIONES)
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

import { RepositorioGuiones } from './RepositorioGuiones'
import { Guion, ResumenGuion, contarPalabras, inicioDelTexto } from './modelo'
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
            inicio: inicioDelTexto(g),
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

  // GUARDAR TAL CUAL -orden B, respaldo de los guiones, 20-10-2026-. Como guardar, pero SIN tocar
  // modificado: lo usa RepositorioSincronizado para escribir aquí un guion que bajó de la nube con el
  // modificado que trae. Si se usara guardar, el modificado cambiaría, el guion parecería más nuevo que el
  // de la nube y volvería a subir: los guiones irían y vendrían para siempre.
  async guardarTal(g: Guion): Promise<void> {
    const db = await this.obtenerDb()
    const copia: Guion = { ...g, archivado: Boolean(g.archivado) }
    // El reloj de guardar no debe quedar detrás de un modificado que llegó de otro aparato.
    if (copia.modificado > this.ultimoModificado) this.ultimoModificado = copia.modificado
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_GUIONES, 'readwrite')
      const request = tx.objectStore(STORE_GUIONES).put(copia)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
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

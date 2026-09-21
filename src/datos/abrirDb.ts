// Una sola conexion a teleprompter_db.
//
// Hasta la tarea 63 la version era 1 y solo existia el almacen `guiones`.
// La tarea 64 suma `grabaciones` y por eso la version pasa a 2. Si cada
// repositorio abriera la base por su cuenta, el segundo open con otra
// version se peleaba con el primero. Por eso la conexion vive aca.

const DB_NAME = 'teleprompter_db'
export const DB_VERSION = 2
export const STORE_GUIONES = 'guiones'
export const STORE_GRABACIONES = 'grabaciones'

let dbPromise: Promise<IDBDatabase> | null = null

export function abrirDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible en este entorno'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      dbPromise = null
      reject(request.error || new Error('Error al abrir IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_GUIONES)) {
        db.createObjectStore(STORE_GUIONES, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_GRABACIONES)) {
        db.createObjectStore(STORE_GRABACIONES, { keyPath: 'id' })
      }
    }
  })

  return dbPromise
}

export function olvidarDb(): void {
  dbPromise = null
}

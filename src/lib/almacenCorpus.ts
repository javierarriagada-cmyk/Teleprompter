// DONDE QUEDAN GUARDADAS LAS LECTURAS GRABADAS.
//
// Esto existe porque el 13 de septiembre de 2026 se perdieron dos o tres lecturas de Javier
// y no habia forma de recuperarlas. Dos descuidos mios a la vez:
//
//   1. La grabacion vivia SOLO EN MEMORIA. Cualquier recarga se la llevaba. Y justo ese dia
//      yo habia agregado la recarga automatica al actualizar, asi que una entrega mia le
//      podia borrar el trabajo sin que el hiciera nada.
//
//   2. Cada lectura nueva PISABA la anterior. Javier hizo dos o tres seguidas y solo podia
//      existir la ultima.
//
// Ahora cada lectura se guarda en IndexedDB apenas termina, con su audio y su registro
// juntos, y se quedan hasta que se borran a mano. Sobreviven a recargas, a cerrar la
// pestana y a apagar el telefono.
//
// Es una base aparte, chiquita, a proposito: los guiones son del usuario y esto es material
// de medicion. No se mezclan, y el dia que dejemos de medir se borra entera sin tocar nada
// del producto.

const BASE = 'teleprompter-corpus'
const ALMACEN = 'lecturas'
const VERSION = 1

export type LecturaGuardada = {
  id: string
  fecha: number
  guionTitulo: string
  motor: string
  audio: Blob
  extension: string
  registro: string
  segundos: number
}

export type ResumenLectura = {
  id: string
  fecha: number
  guionTitulo: string
  motor: string
  segundos: number
  bytesAudio: number
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'))
      return
    }
    const req = indexedDB.open(BASE, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function guardarLectura(l: LecturaGuardada): Promise<void> {
  const db = await abrir()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, 'readwrite')
    tx.objectStore(ALMACEN).put(l)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listarLecturas(): Promise<ResumenLectura[]> {
  let db: IDBDatabase
  try {
    db = await abrir()
  } catch (e) {
    return []
  }
  const todas = await new Promise<LecturaGuardada[]>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, 'readonly')
    const req = tx.objectStore(ALMACEN).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
  db.close()
  return todas
    .map((l) => ({
      id: l.id,
      fecha: l.fecha,
      guionTitulo: l.guionTitulo,
      motor: l.motor,
      segundos: l.segundos,
      bytesAudio: l.audio ? l.audio.size : 0
    }))
    .sort((a, b) => b.fecha - a.fecha)
}

export async function leerLectura(id: string): Promise<LecturaGuardada | null> {
  const db = await abrir()
  const l = await new Promise<LecturaGuardada | null>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, 'readonly')
    const req = tx.objectStore(ALMACEN).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return l
}

export async function borrarLectura(id: string): Promise<void> {
  const db = await abrir()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, 'readwrite')
    tx.objectStore(ALMACEN).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

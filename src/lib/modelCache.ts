/**
 * modelCache helper using idb-keyval (simple wrapper). We'll keep API minimal: get/set
 */
import { set, get } from 'idb-keyval'

export async function cacheModel(key: string, data: ArrayBuffer) {
  try {
    await set(key, data)
    return true
  } catch (e) {
    console.warn('cacheModel failed', e)
    return false
  }
}

export async function getModel(key: string) {
  try {
    return await get(key)
  } catch (e) {
    return null
  }
}

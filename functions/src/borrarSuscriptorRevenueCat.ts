// -borrar-cuenta-suscripcion, 31-10-2026- Borra el registro del cliente en RevenueCat.
// No cancela la suscripción de Google Play: eso lo hace la persona en Play.
// Función pura (uid, clave, fetch) para poder probarla sin Firebase.

export type FetchComo = (
  input: string,
  init?: { method?: string; headers?: Record<string, string> }
) => Promise<{ status: number }>

/**
 * DELETE https://api.revenuecat.com/v1/subscribers/{uid}
 * 200 y 404 cuentan como hecho (404: el cliente no existía).
 * Cualquier otra respuesta lanza error para que failurePolicy reintente.
 */
export async function borrarSuscriptorRevenueCat(
  uid: string,
  clave: string,
  fetchImpl: FetchComo = fetch
): Promise<void> {
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`
  const res = await fetchImpl(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${clave}` }
  })
  if (res.status === 200 || res.status === 404) return
  throw new Error(`RevenueCat DELETE subscribers respondió ${res.status}`)
}

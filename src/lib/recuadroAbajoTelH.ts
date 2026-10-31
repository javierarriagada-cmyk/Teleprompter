import type { Layout } from '../hooks/useLayout'

/**
 * Teléfono de lado, recuadro en una esquina de abajo: sin carril lateral.
 * 31-10-2026, aprobado por Javier en el Redmi en vivo. Con el recuadro arriba el
 * carril sigue: ahí el renglón vivo cruzaría la imagen. Tableta no entra.
 */
export function sinCarrilRecuadroTelH(
  layout: Layout,
  conRecuadro: boolean,
  esquina: string
): boolean {
  return layout === 'tel-h' && conRecuadro && esquina.endsWith('abajo')
}

/** Si el aviso de lado debe sumar el carril a izquierda o derecha. */
export function ladosCarrilAviso(p: {
  layout: Layout
  conRecuadro: boolean
  esquina: string
}): { izquierda: boolean; derecha: boolean } {
  const conCarril = p.conRecuadro && !sinCarrilRecuadroTelH(p.layout, p.conRecuadro, p.esquina)
  const izquierda = conCarril && p.esquina.startsWith('izq')
  return { izquierda, derecha: conCarril && !izquierda }
}

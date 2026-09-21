import React, { useEffect, useRef } from 'react'
import { MotorDeAvance, EstadoModo } from '../lib/avance'
import { tokenizarGuion, Token } from '../lib/seguidor'
import { Guion } from '../datos/modelo'
import { agruparEnRenglones, indiceDeRenglon, pixelDePosicion, pixelDeRenglon, Renglon, MedidaToken } from '../lib/renglones'
import { renderFormattedLine } from './renglones'
import { anotar } from '../lib/diagnostico'

export const PALABRAS_DE_SEGURIDAD = 2

export function avanzarTrabado(
  trabado: number | null,
  idxAncla: number,
  anclaRenglon: number,
  renglones: Renglon[],
  palabrasDeSeguridad = PALABRAS_DE_SEGURIDAD
): number {
  if (trabado === null) return idxAncla
  if (idxAncla < trabado) return idxAncla
  if (idxAncla - trabado >= 2) return idxAncla - 1
  if (idxAncla === trabado + 1) {
    const rSiguiente = renglones[trabado + 1]
    if (!rSiguiente) return idxAncla
    const palabrasRenglon = rSiguiente.hastaToken + 1 - rSiguiente.desdeToken
    const palabrasAdentro = Math.floor(anclaRenglon) - rSiguiente.desdeToken
    const umbral = Math.min(palabrasDeSeguridad, palabrasRenglon - 1)
    if (palabrasAdentro >= umbral) {
      return idxAncla
    }
  }
  return trabado
}

import { AnclajeZona, calcularBanda, calcularBgVelo, opacidadDeLinea } from './banda'
import { RecuadroCamara } from './RecuadroCamara'
import { FondoToma } from '../App'

export const MARGEN_RENGLONES_ARRIBA = 1

export const MS_DESLIZAR = 70

// EL BANCO LARGO AL ABRIR LA APP -motor-largo, 15-10-2026-, SOLO CON HERRAMIENTAS.
//
// Si scripts/banco-largo.mjs dejó un pedido -files/banco-largo/pedido.json-, se arma un guion con el
// texto del pedido, se entra a Grabar con la cámara a 1080p como en una toma, y a los segundos se
// aprieta Empezar con las MISMAS funciones de los botones -handleGrabarDirecto,
// handleEmpezarDesdeListo-. Al terminar los minutos del pedido el lazo avisa y se aprieta Parar
// -handleStop-: la toma se guarda con su .motor.txt, como cualquiera. En la versión de Play
// HERRAMIENTAS es false, el efecto vuelve al instante y Rollup saca todo.
import { useEffect, useRef } from 'react'
import { HERRAMIENTAS } from '../lib/herramientas'
import { activarBancoLargo, PedidoBancoLargo } from '../lib/bancoLargo'
import { tomarPedidoBancoLargo } from '../motor/MotorNativo'
import { guionNuevo, Guion } from '../datos/modelo'

// Lo que se pide a App, puesto al día en cada render.
export type AccionesBancoLargo = {
  guardarGuion: (g: Guion) => Promise<void>
  grabarDirecto: (id: string) => Promise<void>
  empezar: () => Promise<void>
  parar: () => Promise<unknown>
  calidadVideo: string
  fijarCalidad: (c: string) => void
}

// Lo que tarda LISTO en tener la cámara andando antes de apretar Empezar.
const MS_ANTES_DE_EMPEZAR = 4000

export function useBancoLargo(cargado: boolean, acciones: AccionesBancoLargo) {
  const ref = useRef(acciones)
  ref.current = acciones
  const tomado = useRef(false)
  useEffect(() => {
    if (!HERRAMIENTAS || !cargado || tomado.current) return
    tomado.current = true
    let vivo = true
    void (async () => {
      const pedido: PedidoBancoLargo | null = await tomarPedidoBancoLargo()
      if (!pedido || !vivo) return
      const g = guionNuevo(pedido.idioma)
      g.titulo = `Banco largo ${pedido.minutos} min`
      g.bloques[0].texto = pedido.guion
      await ref.current.guardarGuion(g)
      if (ref.current.calidadVideo !== '1080p') ref.current.fijarCalidad('1080p')
      activarBancoLargo(pedido, () => { void ref.current.parar() })
      await ref.current.grabarDirecto(g.id)
      setTimeout(() => { if (vivo) void ref.current.empezar() }, MS_ANTES_DE_EMPEZAR)
    })()
    return () => { vivo = false }
  }, [cargado])
}

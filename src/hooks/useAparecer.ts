import { useEffect, useRef, useState } from 'react'
import { movimientoApagado } from '../lib/movimientoApagado'

// APARECER Y DESVANECERSE -controles-que-se-desvanecen, 14-10-2026-. El patrón del símbolo grande de
// pausa -'visible' | 'saliendo' | null en App-, sacado aquí para usarlo en los controles de la toma.
// Javier: «en vez que desaparezca a los 4 segundos, comience a desaparecer».
//
// Las fases:
//   null       no se dibuja;
//   'entrando' recién montado, todavía transparente -un cuadro, para que la transición tenga desde
//              dónde partir-;
//   'visible'  a la vista;
//   'saliendo' se está yendo -msSalida-; recién al terminar pasa a null y se desmonta.
// Si vuelve a pedirse mientras sale, pasa a 'visible' sin pasar por null: con una transición de
// opacidad -no un keyframe que vuelve a empezar- sube desde donde estaba, sin salto.
// Con movimientoApagado() -quitar animaciones- no hay 'entrando' ni 'saliendo': aparece y se va, como antes.
export type FaseAparecer = 'entrando' | 'visible' | 'saliendo' | null

export function useAparecer(visible: boolean, msSalida: number): FaseAparecer {
  const [fase, setFase] = useState<FaseAparecer>(visible ? 'visible' : null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const sinMovimiento = movimientoApagado()
    if (visible) {
      setFase((f) => {
        if (sinMovimiento || f === 'saliendo' || f === 'visible') return 'visible'
        return 'entrando'
      })
      if (!sinMovimiento) {
        const id = window.requestAnimationFrame(() => setFase((f) => (f === 'entrando' ? 'visible' : f)))
        return () => window.cancelAnimationFrame(id)
      }
      return
    }
    if (sinMovimiento) {
      setFase(null)
      return
    }
    setFase((f) => (f === null ? null : 'saliendo'))
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setFase(null)
    }, msSalida)
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [visible, msSalida])

  return fase
}

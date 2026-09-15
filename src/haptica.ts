import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export function vibracionHabilitada(): boolean {
  try {
    const raw = localStorage.getItem('teleprompter_vibracion')
    if (raw !== null) {
      return JSON.parse(raw) === true
    }
  } catch (e) {
  }
  return true
}

export function guardarVibracionHabilitada(habilitada: boolean): void {
  try {
    localStorage.setItem('teleprompter_vibracion', JSON.stringify(habilitada))
  } catch (e) {
  }
}

export function hapticaSeleccion(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.selectionChanged().catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueSuave(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueMedio(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
  } catch (e) {
  }
}

export function hapticaToqueFuerte(): void {
  if (!vibracionHabilitada() || !Capacitor.isNativePlatform()) return
  try {
    Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {})
  } catch (e) {
  }
}

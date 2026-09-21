import React, { useEffect, useRef, useState } from 'react'
import { useCerrarAfuera } from '../hooks/useCerrarAfuera'
import { Guion, ResumenGuion, ResumenGrabacion, PAREJAS_COLOR } from '../datos/modelo'
import TiraGrabaciones from './TiraGrabaciones'
import { IdMotor } from '../motor/MotorDeVoz'
import { PanelCorpus } from './PanelCorpus'
import TarjetaLectura from './TarjetaLectura'
import { IconoEngranaje } from './IconosApp'
import { vibracionHabilitada, guardarVibracionHabilitada, hapticaToqueSuave } from '../haptica'
import { movimientoApagado, MS_PANTALLA, MS_CHICO, MS_PANEL, CURVA_ENTRA, CURVA_NORMAL, CURVA_RESORTE } from './movimiento'

interface BibliotecaViewProps {
  guiones: ResumenGuion[]
  onAbrir: (id: string) => void
  onLeerDirecto?: (id: string, rect?: DOMRect) => void
  onCrearNuevo: () => void
  onImportarArchivo: (file: File) => void
  onRenombrar?: (id: string, nuevoTitulo: string) => void
  onBorrar: (id: string) => void
  onArchivar: (id: string, archivado: boolean) => void
  onBuscarGuionCompleto?: (id: string) => Promise<Guion | null>
  onToggleDiagnostico?: () => void
  onAbrirPruebaCamaraNativa?: () => void
  medirLectura?: boolean
  setMedirLectura?: (medir: boolean) => void
  engine?: IdMotor
  setEngine?: (engine: IdMotor) => void
  verTranscripcion?: boolean
  setVerTranscripcion?: (ver: boolean) => void
  tema?: 'sistema' | 'claro' | 'oscuro'
  setTema?: (tema: 'sistema' | 'claro' | 'oscuro') => void
  tipoFuente?: 'sans' | 'serif'
  colorFondo?: string
  colorLetra?: string
  onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  grabaciones?: ResumenGrabacion[]
  onAbrirGrabacion?: (g: ResumenGrabacion) => void
  onBorrarGrabacion?: (id: string) => void
  'data-pantalla-direccion'?: string
  style?: React.CSSProperties
  onAnimationEnd?: (e: React.AnimationEvent) => void
}

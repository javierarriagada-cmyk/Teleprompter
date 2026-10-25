// AJUSTES ESCONDE LO DE ATRÁS, SOLO PARA LA ACCESIBILIDAD -ajustes-accesible, 25-10-2026-. Solo lógica, a través
// de <App>: con el panel de Ajustes abierto desde la portada o el editor, el contenedor de atrás lleva
// aria-hidden="true" y el panel es role="dialog" con aria-modal="true"; al cerrar, el aria-hidden se va; y un
// menú de Ajustes abierto no tiene ningún ancestro con aria-hidden. Sin medidas ni posiciones -jsdom no mide-.
import React from 'react'
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import 'fake-indexeddb/auto'

vi.mock('@capgo/camera-preview', () => ({
  CameraPreview: {
    start: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 }),
    stop: vi.fn().mockResolvedValue(undefined),
    setOpacity: vi.fn().mockResolvedValue(undefined),
    setPreviewSize: vi.fn().mockResolvedValue({ width: 360, height: 640, x: 0, y: 0 })
  }
}))

import App from '../App'
import { RepositorioMemoria } from '../datos/RepositorioMemoria'
import { MotorFake } from '../motor/MotorFake'
import { Guion } from '../datos/modelo'
import { esDialogoDeAjustes } from '../components/PanelAjustes'

const guion: Guion = {
  id: 'g-aa', titulo: 'Accesible', idioma: 'es', creado: 0, modificado: 0, archivado: false,
  bloques: [{ id: 'b1', nombre: '', texto: 'una dos tres cuatro cinco' }]
}
const esperar = (ms = 50) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

async function montar() {
  const repo = new RepositorioMemoria()
  await repo.guardar(guion)
  render(<App repoOverride={repo} motor={new MotorFake()} />)
  await screen.findByTestId('btn-menu-superior-biblioteca')
  await esperar(80)
}

// El contenedor de la portada: la raíz de BibliotecaView. El del editor: el hueco que envuelve al editor.
const portada = () => document.querySelector('.portada') as HTMLElement
// La raíz de App es la madre de la franja de la hora; el contenedor del editor es su hijo que lo contiene.
const editor = () => {
  const raiz = (document.querySelector('.franja-hora') as HTMLElement).parentElement
  let c: HTMLElement | null = screen.getByTestId('input-titulo-guion')
  while (c && c.parentElement !== raiz) c = c.parentElement
  return c as HTMLElement
}
const ancestroOculto = (el: Element) => {
  for (let p = el.parentElement; p; p = p.parentElement) if (p.getAttribute('aria-hidden') === 'true') return p
  return null
}
const elPanel = () => screen.getByTestId('panel-ajustes-toma')

function panelEsDialogo() {
  const panel = elPanel()
  expect(panel.getAttribute('role')).toBe('dialog')
  expect(panel.getAttribute('aria-modal')).toBe('true')
  expect(panel.getAttribute('aria-labelledby')).toBeTruthy()
  expect(ancestroOculto(panel)).toBeNull()
}

describe('Ajustes esconde lo de atrás para los lectores', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  test('las puertas: portada y editor son diálogo; Leer y Grabar no cambian', () => {
    expect(esDialogoDeAjustes('portada')).toBe(true)
    expect(esDialogoDeAjustes('editor')).toBe(true)
    expect(esDialogoDeAjustes('leer')).toBe(false)
    expect(esDialogoDeAjustes('grabar')).toBe(false)
  })

  test('DESDE LA PORTADA: la portada queda aria-hidden y el panel es dialog modal; al cerrar se va', async () => {
    await montar()
    expect(portada().getAttribute('aria-hidden')).toBeNull()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    await screen.findByTestId('panel-ajustes-toma')
    expect(portada().getAttribute('aria-hidden')).toBe('true')
    panelEsDialogo()
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(portada().getAttribute('aria-hidden')).toBeNull()
  })

  test('DESDE EL EDITOR: el editor queda aria-hidden y el panel es dialog modal; al cerrar se va', async () => {
    await montar()
    fireEvent.click(await screen.findByTestId('fila-guion-g-aa'))
    await screen.findByTestId('input-titulo-guion')
    const contenedor = editor()
    expect(ancestroOculto(screen.getByTestId('input-titulo-guion'))).toBeNull()
    fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
    await screen.findByTestId('panel-ajustes-toma')
    expect(contenedor.getAttribute('aria-hidden')).toBe('true')
    expect(ancestroOculto(screen.getByTestId('input-titulo-guion'))).not.toBeNull()
    panelEsDialogo()
    fireEvent.click(screen.getByTestId('btn-cerrar-ajustes-toma'))
    expect(screen.queryByTestId('panel-ajustes-toma')).toBeNull()
    expect(contenedor.getAttribute('aria-hidden')).toBeNull()
    expect(ancestroOculto(screen.getByTestId('input-titulo-guion'))).toBeNull()
  })

  test('UN MENÚ DE AJUSTES ABIERTO NO TIENE NINGÚN ANCESTRO CON aria-hidden, desde la portada y el editor', async () => {
    await montar()
    fireEvent.click(screen.getByTestId('btn-menu-superior-biblioteca'))
    fireEvent.click(await screen.findByTestId('fila-tema'))
    const menuTema = await screen.findByTestId('dialogo-tema')
    expect(portada().getAttribute('aria-hidden')).toBe('true')
    expect(ancestroOculto(menuTema)).toBeNull()
    cleanup()
    await montar()
    fireEvent.click(await screen.findByTestId('fila-guion-g-aa'))
    fireEvent.click(await screen.findByTestId('btn-menu-opciones-editor'))
    fireEvent.click(await screen.findByTestId('fila-tipo-letra'))
    const menuTipo = await screen.findByTestId('dialogo-tipo')
    expect(ancestroOculto(screen.getByTestId('input-titulo-guion'))).not.toBeNull()
    expect(ancestroOculto(menuTipo)).toBeNull()
  })
})

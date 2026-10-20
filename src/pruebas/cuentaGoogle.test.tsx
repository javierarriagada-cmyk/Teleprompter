// -cuenta-google, orden A «Entrar con Google», 20-10-2026- Solo lógica, con el plugin CuentaGoogle y
// Firebase simulados. Nada de posiciones ni medidas.
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const sim = vi.hoisted(() => ({
  lista: true,
  orden: [] as string[],
  usuario: null as any,
  respuestaEntrar: { idToken: 'tok-1', correo: 'javier@ejemplo.cl', nombre: 'Javier' } as any,
  pluginEntrar: vi.fn(),
  pluginSalir: vi.fn(),
  signInWithCredential: vi.fn(),
  signOut: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  borrarUsuario: vi.fn()
}))

vi.mock('../lib/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'k', authDomain: 'd', projectId: 'p', appId: 'a' },
  idClienteWeb: 'web-123',
  configuracionLista: () => sim.lista
}))
vi.mock('@capacitor/core', async (original) => ({
  ...(await original<any>()),
  Capacitor: { ...(await original<any>()).Capacitor, isPluginAvailable: (n: string) => n === 'CuentaGoogle' },
  registerPlugin: (n: string) => n === 'CuentaGoogle'
    ? { entrar: sim.pluginEntrar, salir: sim.pluginSalir }
    : {}
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => {
  const auth: any = { get currentUser() { return sim.usuario } }
  return {
    getAuth: () => auth,
    onAuthStateChanged: vi.fn(),
    GoogleAuthProvider: { credential: (idToken: string) => ({ idToken }) },
    signInWithCredential: sim.signInWithCredential,
    signOut: sim.signOut,
    reauthenticateWithCredential: sim.reauthenticateWithCredential
  }
})

import { entrar, salir, borrarCuenta, registrarAntesDeBorrar, estadoCuenta } from '../lib/cuenta'
import { PanelAjustes } from '../components/PanelAjustes'

beforeEach(() => {
  sim.lista = true
  sim.orden = []
  sim.respuestaEntrar = { idToken: 'tok-1', correo: 'javier@ejemplo.cl', nombre: 'Javier' }
  sim.pluginEntrar.mockReset().mockImplementation(async (o: any) => { sim.orden.push('plugin.entrar:' + o.idClienteWeb); return sim.respuestaEntrar })
  sim.pluginSalir.mockReset().mockImplementation(async () => { sim.orden.push('plugin.salir') })
  sim.borrarUsuario.mockReset().mockImplementation(async () => { sim.orden.push('user.delete') })
  sim.usuario = { email: 'javier@ejemplo.cl', delete: sim.borrarUsuario }
  sim.signInWithCredential.mockReset().mockImplementation(async (_a: any, c: any) => { sim.orden.push('signIn:' + c.idToken); return { user: sim.usuario } })
  sim.signOut.mockReset().mockImplementation(async () => { sim.orden.push('signOut') })
  sim.reauthenticateWithCredential.mockReset().mockImplementation(async (_u: any, c: any) => { sim.orden.push('reauth:' + c.idToken) })
})
afterEach(cleanup)

describe('cuenta: entrar', () => {
  it('con un token llama a signInWithCredential con ese token y deja la sesión con el correo', async () => {
    expect(await entrar()).toEqual({ ok: true })
    expect(sim.orden).toEqual(['plugin.entrar:web-123', 'signIn:tok-1'])
    expect(estadoCuenta()).toEqual({ tipo: 'conSesion', correo: 'javier@ejemplo.cl' })
  })
  it('cancelado no deja error ni entra', async () => {
    await salir()
    sim.respuestaEntrar = { cancelado: true }
    expect(await entrar()).toEqual({ cancelado: true })
    expect(sim.signInWithCredential).not.toHaveBeenCalled()
    expect(estadoCuenta()).toEqual({ tipo: 'sinSesion' })
  })
  it('sinCuenta deja su error, y la falta de red de Firebase se reconoce', async () => {
    sim.respuestaEntrar = { error: 'sinCuenta' }
    expect(await entrar()).toEqual({ error: 'sinCuenta' })
    sim.respuestaEntrar = { idToken: 'tok-1' }
    sim.signInWithCredential.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
    expect(await entrar()).toEqual({ error: 'sinRed' })
  })
})

describe('cuenta: salir', () => {
  it('cierra la sesión de Firebase y llama al salir() del plugin', async () => {
    await entrar()
    expect(await salir()).toEqual({ ok: true })
    expect(sim.orden.slice(-2)).toEqual(['signOut', 'plugin.salir'])
    expect(estadoCuenta()).toEqual({ tipo: 'sinSesion' })
  })
})

describe('cuenta: borrarCuenta', () => {
  it('reautentica con un token nuevo, corre los pasos en orden, borra el usuario y sale', async () => {
    sim.respuestaEntrar = { idToken: 'tok-nuevo' }
    const q1 = registrarAntesDeBorrar(async () => { sim.orden.push('paso1') })
    const q2 = registrarAntesDeBorrar(() => { sim.orden.push('paso2') })
    expect(await borrarCuenta()).toEqual({ ok: true })
    q1(); q2()
    expect(sim.orden).toEqual(['plugin.entrar:web-123', 'reauth:tok-nuevo', 'paso1', 'paso2', 'user.delete', 'signOut', 'plugin.salir'])
  })
  it('si un paso falla, NO borra el usuario y devuelve el error', async () => {
    const quitar = registrarAntesDeBorrar(async () => { throw new Error('falló la nube') })
    const r = await borrarCuenta()
    quitar()
    expect('error' in r && r.error).toBe('otro')
    expect(sim.borrarUsuario).not.toHaveBeenCalled()
    expect(sim.signOut).not.toHaveBeenCalled()
  })
  it('si la persona cancela la reautenticación, no se borra nada', async () => {
    sim.respuestaEntrar = { cancelado: true }
    expect(await borrarCuenta()).toEqual({ cancelado: true })
    expect(sim.reauthenticateWithCredential).not.toHaveBeenCalled()
    expect(sim.borrarUsuario).not.toHaveBeenCalled()
  })
})

describe('Ajustes: la sección Cuenta', () => {
  const ajustes: any = {
    fontSize: 24, setFontSize: vi.fn(), columnaAngosta: false, setColumnaAngosta: vi.fn(), marginPercent: 5,
    setMarginPercent: vi.fn(), colorFondo: '#151312', setColorFondo: vi.fn(), colorLetra: '#E7E1DE',
    setColorLetra: vi.fn(), tipoFuente: 'sans', setTipoFuente: vi.fn(), mirror: false, setMirror: vi.fn(),
    mostrarTiempo: true, setMostrarTiempo: vi.fn(), letraBase: 24
  }
  const panel = (origen: 'portada' | 'editor') => render(
    <PanelAjustes origen={origen} ajustesLectura={ajustes} onCerrar={vi.fn()} hostMenus={null} animar={false} />
  )
  it('con configuracionLista() en false, la sección Cuenta no está', () => {
    sim.lista = false
    panel('portada')
    expect(screen.queryByTestId('seccion-cuenta')).toBeNull()
    expect(screen.getByTestId('fila-ayuda')).toBeTruthy()
  })
  it('lista, está en las mismas puertas que Ayuda y en ninguna otra', () => {
    panel('portada')
    expect(screen.getByTestId('seccion-cuenta')).toBeTruthy()
    cleanup()
    panel('editor')
    expect(screen.queryByTestId('fila-ayuda')).toBeNull()
    expect(screen.queryByTestId('seccion-cuenta')).toBeNull()
  })
})

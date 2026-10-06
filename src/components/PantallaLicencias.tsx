import React, { useEffect, useState } from 'react'
import { t } from '../textos'
import { IconoAtras } from './IconosApp'

type Componente = {
  nombre: string
  version: string
  licencia: string
  texto: string
  fuente?: string
  nota?: string
}

type Archivo = { apache: string; componentes: Componente[] }

export function PantallaLicencias({ onCerrar }: { onCerrar: () => void }) {
  const [archivo, setArchivo] = useState<Archivo | null>(null)
  const [elegido, setElegido] = useState<Componente | null>(null)

  useEffect(() => {
    let vigente = true
    fetch('/licencias.json')
      .then((r) => r.json())
      .then((j) => { if (vigente) setArchivo(j) })
      .catch(() => { if (vigente) setArchivo({ apache: '', componentes: [] }) })
    return () => { vigente = false }
  }, [])

  const texto = (c: Componente) => c.licencia === 'Apache-2.0' ? (archivo?.apache || '') : c.texto

  return (
    <div className="pantalla-ajustes" role="dialog" aria-modal="true" aria-label={t('licencias')} data-testid="pantalla-licencias">
      <header className="barra-ajustes">
        <button type="button" className="btn-atras-ajustes" aria-label={t('volver')} onClick={elegido ? () => setElegido(null) : onCerrar}>
          <IconoAtras tamano={22} />
        </button>
        <h1 className="titulo-ajustes">{elegido ? elegido.nombre : t('licencias')}</h1>
      </header>
      <div className="cuerpo-ajustes">
        {!elegido && (archivo?.componentes || []).map((c) => (
          <button key={c.nombre + c.version} type="button" className="fila-ajuste" onClick={() => setElegido(c)}>
            <div className="fila-ajuste-textos">
              <div className="fila-ajuste-nombre">{c.nombre}</div>
              <div className="fila-ajuste-explicacion">{c.version} · {c.licencia}</div>
            </div>
          </button>
        ))}
        {elegido && (
          <pre className="fila-ajuste-explicacion" style={{ whiteSpace: 'pre-wrap' }}>
            {elegido.nota ? elegido.nota + '\n\n' : ''}
            {elegido.fuente ? elegido.fuente + '\n\n' : ''}
            {texto(elegido) || t('licenciaSinTexto')}
          </pre>
        )}
      </div>
    </div>
  )
}

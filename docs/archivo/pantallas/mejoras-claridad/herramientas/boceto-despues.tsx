// EL BOCETO -mejoras de claridad, 21-10-2026-. NO es código de la app. Viste la app real con UNA mejora
// -mejora=1..5-: la hoja boceto-despues.css, que se activa con la clase boceto-m<n> en <html>, y, para lo
// que una hoja no alcanza -textos nuevos, el ícono del engranaje, la línea roja-, un observador que retoca
// lo que React dibuja. Los íconos son los de la app -IconosApp.tsx-. En el paso 2 esto va en src/, con
// los textos en src/textos/es.ts y en.ts.
import { renderToStaticMarkup } from 'react-dom/server'
import './boceto-despues.css'
import { IconoEngranaje, IconoMas } from '../../../../../src/components/IconosApp'

const q = new URLSearchParams(location.search)
const mejora = q.get('mejora') || '0'
const en = document.documentElement
en.classList.add(`boceto-m${mejora}`)

// «≈18 min»: los minutos redondeados de la MISMA estimación -duracionDeLectura, modelo.ts-, con ≈ delante.
function aproximado(texto: string): string {
  return texto.replace(/(?<!≈)(\d+):(\d{2}) min|(?<![:≈\d])(\d+) min/, (_, m, s, solo) => {
    const minutos = solo ? Number(solo) : Math.max(1, Math.round(Number(m) + Number(s) / 60))
    return `≈${minutos} min`
  })
}
function cambiarTexto(el: Element | null, nuevo: (viejo: string) => string) {
  if (!el) return
  // Solo el último nodo de texto: en la tarjeta el primero es el ícono del reloj.
  const nodos = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim())
  const n = nodos[nodos.length - 1]
  if (!n) return
  const v = nuevo(n.textContent!)
  if (v !== n.textContent) n.textContent = v
}

function retocar() {
  if (mejora === '1') {
    const lema = document.querySelector('[data-testid="lema-entrada"]') as SVGElement | null
    if (lema && !document.querySelector('.boceto-linea-roja')) {
      const linea = document.createElement('div')
      linea.className = 'boceto-linea-roja'
      lema.parentElement!.appendChild(linea)
    }
  }
  if (mejora === '2') {
    cambiarTexto(document.querySelector('[data-testid="time-code-tarjeta"]'), aproximado)
    document.querySelectorAll('.fila-guion-cara .texto-meta').forEach((el) => cambiarTexto(el, aproximado))
    document.querySelectorAll('[data-testid="meta-editor"], .meta-editor').forEach((el) => cambiarTexto(el, aproximado))
    // La línea «2631 palabras · 17:32 min» del editor.
    document.querySelectorAll('div, span').forEach((el) => {
      if (el.childElementCount === 0 && /palabras · /.test(el.textContent || '')) cambiarTexto(el, aproximado)
    })
  }
  if (mejora === '3') {
    const titulo = document.querySelector('[data-testid="titulo-tarjeta-lectura"]')
    if (titulo && !document.querySelector('.boceto-continuar')) {
      const etiqueta = document.createElement('span')
      etiqueta.className = 'boceto-continuar'
      etiqueta.textContent = 'Continuar con este guion'
      titulo.parentElement!.insertBefore(etiqueta, titulo)
    }
    const mas = document.querySelector('[data-testid="btn-crear-guion"]')
    if (mas && !mas.classList.contains('boceto-nuevo-guion')) {
      mas.classList.add('boceto-nuevo-guion')
      mas.innerHTML = `<span>${renderToStaticMarkup(<IconoMas tamano={18} />)}<span class="boceto-nuevo-guion-texto">Nuevo guion</span></span>`
    }
  }
  if (mejora === '5') {
    const muestra = document.querySelector('[data-testid="muestra-lectura-ajustes"]')
    if (muestra && !document.querySelector('.boceto-vista-previa')) {
      const etiqueta = document.createElement('div')
      etiqueta.className = 'dock-seccion boceto-vista-previa'
      etiqueta.textContent = 'Vista previa'
      muestra.parentElement!.insertBefore(etiqueta, muestra)
    }
    const aa = document.querySelector('[data-testid="btn-menu-opciones-editor"]')
    if (aa && !aa.classList.contains('boceto-engranaje')) {
      aa.classList.add('boceto-engranaje')
      aa.innerHTML = renderToStaticMarkup(<IconoEngranaje tamano={22} />)
    }
  }
}
new MutationObserver(retocar).observe(document.documentElement, { childList: true, subtree: true, characterData: true })

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Guion, Bloque, TramoFormato, ResumenGrabacion, contarPalabras, duracionDeLectura, PAREJAS_COLOR, COLORES_TRAMO } from '../datos/modelo'
import { consolidarGuion } from '../datos/consolidar'
import { importarArchivo } from '../datos/importarArchivo'
import { hapticaSeleccion } from '../haptica'
import { movimientoApagado, MS_DEDO, MS_CHICO, MS_PANTALLA, CURVA_ENTRA, CURVA_SALE, CURVA_RESORTE } from './movimiento'
import { IconoEmpezar } from './IconosApp'
import { EditorCabecera } from './EditorCabecera'
import { BarraEditorVacio, pegarTextoEnEditor } from './BarraEditorVacio'
import { BarraLeerGrabar } from './BarraLeerGrabar'
import { EditorGuion } from './EditorGuion'
import type { Editor } from '@tiptap/react'
import { t, useTextos, numeroLocal, TITULO_SIN_NOMBRE, ClaveTexto } from '../textos'
import { detectarIdioma, PALABRAS_MINIMAS_PARA_DETECTAR } from '../lib/detectarIdioma'
import {
  abrirMarcaSiCorresponde,
  debeMostrarMarcaIdioma,
  liberarMarcaEnSesion,
  marcarComoVista,
  marcaYaVista
} from '../lib/marcasGuia'
import { MarcaGuia } from './MarcaGuia'

// reubicarTramos vivia aca: con el <textarea>, cada tecla llegaba como un
// texto nuevo entero y habia que adivinar donde habia quedado cada marca
// comparando el viejo con el nuevo. Tiptap lleva las marcas pegadas al texto,
// asi que ya no hay nada que adivinar. Se fue el 24-09-2026; su guardiana,
// T101, ahora prueba lo mismo sobre el editor -pruebas.test.tsx-.

interface EditorViewProps {
  guion: Guion
  onChangeGuion: (nuevoGuion: Guion) => void
  onVolverBiblioteca: () => void
  onEntrarLectura: (rect?: DOMRect) => void
  fontSize?: number
  onLetraMenos?: () => void
  onLetraMas?: () => void
  marginPercent?: number
  setMarginPercent?: (m: number) => void
  // Espejo, "donde lees" y "mostrar tiempo" YA NO ESTAN ACA. Son de la toma
  // -cambian entre una toma y otra- y viven en el engranaje del lienzo. El
  // panel del editor es del TEXTO: tamano, ancho, tipografia y parejas de
  // color. Si alguno vuelve a aparecer en los dos lados, se rompe la regla de
  // las tres familias y "donde lees" vuelve a estar duplicado, que es de donde
  // salio esta tarea.
  columnaAngosta?: boolean
  setColumnaAngosta?: (v: boolean) => void
  colorFondo?: string
  setColorFondo?: (c: string) => void
  colorLetra?: string
  setColorLetra?: (c: string) => void
  tipoFuente?: 'sans' | 'serif'
  setTipoFuente?: (f: 'sans' | 'serif') => void
  // El Tema tampoco esta aca, y por el mismo motivo: no es del texto, es de la
  // aplicacion. Vive en el menu de la portada, junto a idioma y vibracion.
  // -24-09-2026: la vibracion salio de ese menu; la decide el telefono.-
  onEntrarGrabar?: (rect?: DOMRect) => void
  onRegistrarCerrarModal?: (fn: (() => boolean) | null) => void
  // 28-09-2026, tarea 77: el Aa abre la pantalla de Ajustes de App, la misma de la portada y de
  // LISTO. Javier: "ya ni siquiera tenemos coherencia dentro de los ajustes de la app".
  onAbrirAjustes?: () => void
  // LAS TOMAS DE ESTE GUION -tarea 76, 28-09-2026-: App.tsx las filtra por guionId y las
  // ordena de la más nueva a la más vieja. Van en la banda de abajo -BandaTomas.tsx-, y un
  // toque abre el reproductor, que App dibuja encima de cualquier vista.
  tomas?: ResumenGrabacion[]
  onAbrirToma?: (g: ResumenGrabacion) => void
  'data-pantalla-direccion'?: string
  style?: React.CSSProperties
  onAnimationEnd?: (e: React.AnimationEvent) => void
  editorRef?: React.MutableRefObject<Editor | null>
}


function generarIdBloque(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'b-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

// Los nombres de idioma salen de aca para el boton ES / EN del guion. Hasta la
// Tarea 72 el panel Aa tenia un <select> para elegir el idioma del guion,
// y se quito: en el APK el motor nativo ignora el idioma -MotorNativo.ts,
// iniciar()- porque el unico modelo de voz que viaja es el de espanol.
// Elegir otro idioma no cambiaba lo que escucha el motor: era un control
// falso. El producto es para hablantes de espanol -decision del dueno,
// 23-09-2026-. Guion.idioma se sigue guardando: si algun dia viajan otros
// modelos, el dato ya esta y el control vuelve.
// EL CONTROL VOLVIO -tarea 75, 27-09-2026-: el modelo ingles viaja en el APK -D3 de
// docs/ingles.txt- y el guion lleva su idioma, detectado solo al escribir -D2-. Son dos
// idiomas y un toque los alterna: no hace falta un <select> ni un cajon. Hasta que Claude
// conecte MotorNativo con el modelo ingles en el telefono, elegir EN todavia no cambia lo
// que escucha el motor.
// La linea de meta ya no lleva el nombre del idioma: lo dice el boton, a la vista.
const NOMBRE_IDIOMA: Record<string, ClaveTexto> = {
  es: 'idiomaEspanol',
  en: 'idiomaIngles'
}

export default function EditorView({
  guion,
  onChangeGuion,
  onVolverBiblioteca,
  onEntrarLectura,
  fontSize = 24,
  onLetraMenos,
  onLetraMas,
  marginPercent = 5,
  setMarginPercent,
  columnaAngosta = false,
  setColumnaAngosta,
  colorFondo = PAREJAS_COLOR[0].fondo,
  setColorFondo,
  colorLetra = PAREJAS_COLOR[0].letra,
  setColorLetra,
  tipoFuente = 'sans',
  setTipoFuente,
  onEntrarGrabar,
  onRegistrarCerrarModal,
  onAbrirAjustes,
  tomas = [],
  onAbrirToma,
  'data-pantalla-direccion': dataPantallaDireccion,
  style,
  onAnimationEnd,
  editorRef: editorRefExternal
}: EditorViewProps) {
  useTextos()
  // 28-09-2026, tarea 77: el cajon Aa del editor -CajonAaEditor, mostrarModalAjustes, su Escape y
  // su registro para el atras del telefono- se fue. El Aa abre la pantalla de Ajustes: un solo
  // estilo de ajustes en toda la app, con la muestra viva arriba.

  const idGuionLimpioRef = useRef<string | null>(null)

  // Auto-consolidar y limpiar guiones SOLO AL ABRIR UN GUION NUEVO (por id)
  useEffect(() => {
    if (!guion || !guion.id) return
    if (idGuionLimpioRef.current === guion.id) {
      return
    }
    idGuionLimpioRef.current = guion.id
    if (guion.bloques && guion.bloques.length > 0) {
      const consolidado = consolidarGuion(guion)
      if (consolidado !== guion) {
        onChangeGuion(consolidado)
      }
    }
  }, [guion, onChangeGuion])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cargandoArchivo, setCargandoArchivo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)

  // Antes: const editorRef = useRef<Editor | null>(null)
  const editorRefLocal = useRef<Editor | null>(null)
  const editorRef = editorRefExternal || editorRefLocal
  const [hayTextoSeleccionado, setHayTextoSeleccionado] = useState(false)
  const [tituloEnfocado, setTituloEnfocado] = useState(false)
  // El texto del guion tiene el foco -tarea 76-: mientras se escribe, en el título o en el
  // texto, la banda de tomas se esconde para devolverle el espacio al texto y al teclado.
  const [textoEnfocado, setTextoEnfocado] = useState(false)
  // -tarea 105- Marca de guía del idioma: 'base' o 'detectado' (1-bis) mientras está a la vista.
  const [marcaIdioma, setMarcaIdioma] = useState<'base' | 'detectado' | null>(null)
  const [idiomaAnclaEl, setIdiomaAnclaEl] = useState<HTMLElement | null>(null)
  const idiomaBtnRef = useRef<HTMLButtonElement | null>(null)
  // Si idiomaSegunTexto acaba de cambiar el idioma, la marca usa el texto 1-bis.
  const idiomaAutoCambiadoRef = useRef(false)
  const montadoEditorRef = useRef(true)
  const marcaIdiomaRef = useRef(marcaIdioma)
  marcaIdiomaRef.current = marcaIdioma
  const blurMarcaTimerRef = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (marcaIdioma) setIdiomaAnclaEl(idiomaBtnRef.current)
    else setIdiomaAnclaEl(null)
  }, [marcaIdioma])
  // Si se desmonta con la marca a la vista: no queda vista y se libera la de la sesión.
  // El disparo blur espera MS_PANTALLA y se cancela aquí si ya no hay editor.
  useEffect(() => {
    montadoEditorRef.current = true
    return () => {
      montadoEditorRef.current = false
      if (blurMarcaTimerRef.current != null) {
        window.clearTimeout(blurMarcaTimerRef.current)
        blurMarcaTimerRef.current = null
      }
      if (marcaIdiomaRef.current) {
        liberarMarcaEnSesion()
      }
    }
  }, [])
  const [barraLeerVisible, setBarraLeerVisible] = useState(true)
  const ultimoScrollTopRef = useRef<number>(0)
  const timerScrollStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleScroll() {
      const currentScrollTop = window.scrollY || document.documentElement.scrollTop || 0
      const diff = currentScrollTop - ultimoScrollTopRef.current

      if (diff > 5) {
        setBarraLeerVisible(false)
      } else if (diff < -5) {
        setBarraLeerVisible(true)
      }

      ultimoScrollTopRef.current = currentScrollTop

      if (timerScrollStopRef.current) clearTimeout(timerScrollStopRef.current)
      timerScrollStopRef.current = setTimeout(() => {
        setBarraLeerVisible(true)
      }, 300)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timerScrollStopRef.current) clearTimeout(timerScrollStopRef.current)
    }
  }, [])

  function handleTituloChange(nuevoTitulo: string) {
    onChangeGuion({
      ...guion,
      titulo: nuevoTitulo,
      modificado: Date.now()
    })
  }

  async function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''
    setCargandoArchivo(true)
    setErrorArchivo(null)

    try {
      // El formato se mira antes de importar para poder decirlo en el idioma de la app: el
      // mensaje de importarArchivo esta en espanol -es de la capa de datos-. Es la misma lista
      // que acepta importarArchivo: .txt, .md y .docx.
      if (!/\.(txt|md|docx)$/i.test(file.name || '')) {
        setErrorArchivo(t('archivoNoSoportado', { nombre: file.name }))
        return
      }
      const resultado = await importarArchivo(file)
      if (resultado.bloques.length === 0) {
        setErrorArchivo(t('archivoSinTexto'))
        return
      }

      const textoAInsertar = resultado.bloques.map((b) => b.texto).join('\n\n')
      const b0 = (guion.bloques && guion.bloques[0])
        ? guion.bloques[0]
        : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }

      const textoExistente = b0.texto || ''
      const textoNuevo = !textoExistente.trim()
        ? textoAInsertar
        : textoExistente + '\n\n' + textoAInsertar

      const tituloNuevo = (!guion.titulo || !guion.titulo.trim() || guion.titulo === TITULO_SIN_NOMBRE)
        ? resultado.titulo
        : guion.titulo

      onChangeGuion({
        ...guion,
        ...idiomaSegunTexto(textoNuevo),
        titulo: tituloNuevo,
        bloques: [{ ...b0, texto: textoNuevo }],
        modificado: Date.now()
      })
      // -tarea 105- Justo después de importar con «Abrir archivo».
      // El guion del props aún no se actualizó: se cuentan las palabras del texto nuevo.
      const palabrasImport = textoNuevo.trim().split(/\s+/).filter(Boolean).length
      queueMicrotask(() => intentarMarcaIdioma('pegar', palabrasImport))
    } catch (err: any) {
      // El detalle de importarArchivo -en espanol, capa de datos- va a la consola; en la
      // pantalla, la frase en el idioma de la app.
      console.warn('[EditorView] no se pudo importar el archivo:', err)
      setErrorArchivo(t('archivoNoSeImporto'))
    } finally {
      setCargandoArchivo(false)
    }
  }

  // El formato se aplica sobre el editor, que lo dibuja en el acto y avisa el
  // cambio por onCambio -texto y tramos, como se guarda-. Negrita y color van
  // y vuelven: tocar de nuevo el mismo lo saca.
  function aplicarFormatoEnSeleccion(opciones: { negrita?: boolean; destacado?: boolean; color?: 'ambar' | 'celeste' | 'salvia' }) {
    const editor = editorRef.current
    if (!editor || editor.state.selection.empty) return
    if (opciones.negrita) {
      editor.chain().focus().toggleBold().run()
    }
    if (opciones.destacado) {
      editor.chain().focus().toggleMark('destacado').run()
    }
    if (opciones.color) {
      if (editor.isActive('colorTramo', { color: opciones.color })) {
        editor.chain().focus().unsetMark('colorTramo').run()
      } else {
        editor.chain().focus().setMark('colorTramo', { color: opciones.color }).run()
      }
    }
  }

  function handleAcotacion() {
    const editor = editorRef.current
    if (!editor) return
    const { from, to } = editor.state.selection
    editor.chain().focus().insertContentAt(to, ']').insertContentAt(from, '[').run()
  }

  // EL IDIOMA DEL GUION SE DETECTA AL ESCRIBIR O PEGAR -D2, tarea 75-. Si el texto dice
  // otro idioma que el guardado, se cambia; si la persona lo eligio a mano -idiomaElegido-,
  // se queda como lo dejo. Con menos de 12 palabras o un texto mezclado, detectarIdioma no
  // decide y el guion se queda con el que tenia.
  function idiomaSegunTexto(texto: string): { idioma?: string } {
    if (guion.idiomaElegido) {
      idiomaAutoCambiadoRef.current = false
      return {}
    }
    const detectado = detectarIdioma(texto)
    if (detectado && detectado !== guion.idioma) {
      idiomaAutoCambiadoRef.current = true
      return { idioma: detectado }
    }
    idiomaAutoCambiadoRef.current = false
    return {}
  }

  // -tarea 105- Intenta sacar la marca de idioma. disparo 'pegar' = pegar/importar;
  // 'blur' exige ≥12 palabras -mismo umbral que detectarIdioma-.
  function intentarMarcaIdioma(disparo: 'pegar' | 'blur', palabrasOverride?: number) {
    // Tras pegar, el guion del props puede estar viejo: se lee el editor o el override.
    let palabras = palabrasOverride
    if (palabras === undefined) {
      if (disparo === 'pegar' && editorRef.current) {
        const texto = editorRef.current.getText()
        palabras = texto.trim() ? texto.trim().split(/\s+/).filter(Boolean).length : 0
      } else {
        palabras = contarPalabras(guion)
      }
    }
    const puede = debeMostrarMarcaIdioma({
      yaVista: marcaYaVista('idioma'),
      disparo,
      palabras,
      umbralPalabras: PALABRAS_MINIMAS_PARA_DETECTAR,
      idGuion: guion.id,
      idsBloques: (guion.bloques || []).map((b) => b.id),
      enLecturaOToma: false,
      hayAvisoVoz: false,
      hayDialogoPermiso: false
    })
    if (!abrirMarcaSiCorresponde('idioma', puede)) return
    setMarcaIdioma(idiomaAutoCambiadoRef.current ? 'detectado' : 'base')
  }

  // Expone pegar(texto) por el editorRef: pega con el onPegado propio del editor,
  // el que detecta el idioma del guion. Antes: el acceso pegaba desde App con un
  // onPegado vacío y reescribía los bloques a mano.
  if (editorRefExternal) {
    (editorRefExternal as React.MutableRefObject<Editor | null> & { pegar?: (texto: string) => void }).pegar =
      (texto: string) => {
        pegarTextoEnEditor(editorRef.current, texto, () => {
          queueMicrotask(() => intentarMarcaIdioma('pegar'))
        })
      }
  }

    function cerrarMarcaIdioma(motivo: 'entendido' | 'afuera') {
    if (motivo === 'entendido') {
      marcarComoVista('idioma')
    } else {
      // Antes: marcarComoVista('idioma') también al tocar afuera.
    }
    // Antes: liberar solo con afuera/desmontar; Entendido dejaba el tope de sesión
    // y bloqueaba recuadro/palma en la misma apertura.
    liberarMarcaEnSesion()
    setMarcaIdioma(null)
  }

  function handleAlternarIdioma() {
    hapticaSeleccion()
    // -tarea 105- Tocar ES/EN cuenta como marca vista, aunque no hubiera salido.
    marcarComoVista('idioma')
    // Liberar por si la marca estaba a la vista: otra puede salir en esta sesión.
    liberarMarcaEnSesion()
    setMarcaIdioma(null)
    onChangeGuion({
      ...guion,
      idioma: guion.idioma === 'en' ? 'es' : 'en',
      idiomaElegido: true,
      modificado: Date.now()
    })
  }

  function handleEditorCambio(nuevoTexto: string, nuevosTramos: TramoFormato[]) {
    const b0 = (guion.bloques && guion.bloques[0])
      ? guion.bloques[0]
      : { id: generarIdBloque(), nombre: '', texto: '', tramos: [] }
    onChangeGuion({
      ...guion,
      ...idiomaSegunTexto(nuevoTexto),
      bloques: [{ ...b0, texto: nuevoTexto, tramos: nuevosTramos }],
      modificado: Date.now()
    })
  }

  const numPalabras = contarPalabras(guion)
  // LA DURACION ES UNA SOLA EN TODA LA APP -28-09-2026-. Aca se redondeaba a minutos enteros
  // -Math.round, y minimo 1-: con 5 palabras decia "1 min" arriba y "2 s" abajo, y el guion Hola
  // "3 min" en el editor y "2:34 min" en la portada. Lo mostraron las capturas del agente de
  // pruebas de Firebase. Ahora sale de duracionDeLectura, la misma de la portada y de la tarjeta.
  const idiomaGuion = guion.idioma || 'es'
  const nombreIdioma = NOMBRE_IDIOMA[idiomaGuion] ? t(NOMBRE_IDIOMA[idiomaGuion]) : idiomaGuion
  const resumenMeta = t('metaEditor', { palabras: numeroLocal(numPalabras), duracion: duracionDeLectura(numPalabras) })


  const btnLeerRef = useRef<HTMLButtonElement>(null)

  // LA BANDA DE TOMAS -tarea 76-. Vive con Leer y Grabar, así que existe cuando ellos existen:
  // con el guion vacío -Pegar texto y Abrir archivo- no hay banda. Mientras se escribe no se
  // ve. hayBanda, y no bandaVisible, es lo que agranda el relleno de abajo: si el relleno se
  // achicara al tomar el foco, con la página al fondo el navegador recortaría el desplazamiento
  // y el texto saltaría justo cuando se empieza a escribir.
  const hayBanda = tomas.length > 0 && numPalabras > 0 && !!onAbrirToma
  const bandaVisible = hayBanda && !tituloEnfocado && !textoEnfocado

  const bloqueUnico: Bloque = (guion.bloques && guion.bloques[0])
    ? guion.bloques[0]
    : { id: 'b-inicial', nombre: '', texto: '', tramos: [] }

  return (
    <div
      data-pantalla-direccion={dataPantallaDireccion}
      onAnimationEnd={onAnimationEnd}
      style={{
        maxWidth: 800,
        margin: '0 auto',
        // Con la banda de tomas, el relleno de abajo crece lo que mide la banda y su aire hasta
        // los botones -var(--alto-banda-tomas) y var(--aire-3)-: el final del guion no queda
        // tapado. Tarea 76, 28-09-2026.
        // ARRIBA, SIN LA BARRA DE ESTADO -28-09-2026-. Era calc(20px + env(safe-area-inset-top)), y
        // el marco de App.tsx ya suma 16px + esa misma area segura: en el editor se contaba DOS
        // veces y quedaba una franja negra de ~80 px sobre "Guiones". Javier, en el telefono: "ese
        // espacio deberia ser la mitad". La portada no la suma: queda igual que ella.
        padding: hayBanda
          ? 'var(--aire-4) var(--aire-4) calc(130px + var(--alto-banda-tomas) + var(--aire-3) + env(safe-area-inset-bottom, 0px)) var(--aire-4)'
          : 'var(--aire-4) var(--aire-4) calc(130px + env(safe-area-inset-bottom, 0px)) var(--aire-4)',
        position: 'relative',
        ...style
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.docx"
        onChange={handleSeleccionarArchivo}
        style={{ display: 'none' }}
      />

      <EditorCabecera
        guion={guion}
        onVolverBiblioteca={onVolverBiblioteca}
        idiomaGuion={idiomaGuion}
        nombreIdioma={nombreIdioma}
        onAlternarIdioma={handleAlternarIdioma}
        onAbrirAjustes={() => onAbrirAjustes?.()}
        editorRef={editorRef}
        idiomaBtnRef={idiomaBtnRef}
        idiomaDescribedBy={marcaIdioma ? 'marca-guia-idioma-desc' : undefined}
      />

      {/* Titulo es el titulo: Display, editable, sin etiqueta ni recuadro.
          El placeholder dice "Título del guion" y no "Sin título": el primero
          dice QUE HACER, el segundo solo describe un estado y se lee como una
          etiqueta puesta por el sistema. Ojo con la linea de abajo: la
          comparacion con 'Sin título' es contra el titulo GUARDADO en el
          modelo, no contra este placeholder. Son dos cosas distintas que hasta
          hoy decian la misma frase. Se cambio el 23 de septiembre de 2026. */}
      <div style={{ marginBottom: 'var(--aire-2)' }}>
        <input
          type="text"
          value={guion.titulo === TITULO_SIN_NOMBRE ? '' : guion.titulo}
          onChange={(e) => handleTituloChange(e.target.value)}
          onFocus={() => setTituloEnfocado(true)}
          onBlur={() => setTituloEnfocado(false)}
          placeholder={t('tituloDelGuion')}
          // EL NOMBRE PARA EL LECTOR -tarea 84, G3, 29-09-2026-. El placeholder no es un nombre:
          // desaparece al escribir y TalkBack decía solo "cuadro de edición". Clave aparte y no
          // la del placeholder: el placeholder dice qué hacer, el nombre dice qué es.
          aria-label={t('nombreCampoTitulo')}
          className="texto-display"
          data-testid="input-titulo-guion"
          style={{
            width: '100%',
            padding: 'var(--aire-1) var(--aire-2)',
            border: 'none',
            outline: 'none',
            backgroundColor: tituloEnfocado ? 'var(--bg-fila)' : 'transparent',
            color: 'var(--color-texto)',
            boxSizing: 'border-box',
            borderRadius: 'var(--redondeo)',
            transition: `background-color ${MS_CHICO}ms ${CURVA_ENTRA}`
          }}
        />
      </div>

      {/* Resumen meta bajo el titulo - solo si numPalabras > 0 */}
      {numPalabras > 0 && (
        <div
          data-testid="contador-palabras-editor"
          className="texto-meta"
          style={{
            color: 'var(--color-apagado)',
            marginTop: 'calc(-1 * var(--aire-1))',
            marginBottom: 'var(--aire-4)',
            paddingLeft: 'var(--aire-2)',
            paddingBottom: 'var(--aire-3)',
            // La linea separa el NOMBRE del guion de lo que se va a LEER. Las dos
            // cosas estan en Source Serif 4 y se funden sin nada en el medio.
            // Va en var(--bg-panel) y no en var(--color-borde): el borde a fuerza
            // completa sobre var(--bg-suelo) es una raya que grita. Esta tiene que
            // separar, no anunciarse.
            // Aparece con la misma condicion que el contador -numPalabras > 0- y
            // no con una propia: con el guion vacio no hay nada que separar, y el
            // dibujo del estado vacio que aprobo Javier no tiene linea.
            borderBottom: '1px solid var(--bg-panel)'
          }}
        >
          {resumenMeta}
        </div>
      )}


      {errorArchivo && (
        <div
          style={{
            color: 'var(--color-grabando)',
            backgroundColor: 'var(--bg-suelo)',
            border: '1px solid var(--color-borde)',
            padding: 'var(--aire-2) var(--aire-3)',
            borderRadius: 'var(--redondeo)',
            marginBottom: 'var(--aire-4)',
            fontSize: 'var(--texto-cuerpo)',
            fontWeight: 'bold'
          }}
        >
          {t('errorAbrirArchivo', { detalle: errorArchivo })}
        </div>
      )}

      {/* Hoja Única de Texto */}
      {/* onFocus y onBlur escuchan el foco del editor -Tiptap, contenteditable- desde afuera:
          en React suben como focusin y focusout. Tarea 76: la banda de tomas se esconde
          mientras se escribe. La barra de formato no le quita el foco al editor -sus botones
          hacen preventDefault-, así que no la hace volver. */}
      <div
        style={{ position: 'relative' }}
        onFocus={() => setTextoEnfocado(true)}
        onBlur={() => {
          setTextoEnfocado(false)
          // -tarea 105- Teclado cerrado y guion con ≥12 palabras. Espera lo que dura el
          // cambio de pantalla: el toque que quita el foco suele ser Leer/Grabar/«‹ Guiones»
          // y desmonta el editor; si ya no estamos montados, no sale la marca.
          // Antes: intentarMarcaIdioma('blur') al tiro.
          if (blurMarcaTimerRef.current != null) {
            window.clearTimeout(blurMarcaTimerRef.current)
          }
          blurMarcaTimerRef.current = window.setTimeout(() => {
            blurMarcaTimerRef.current = null
            if (!montadoEditorRef.current) return
            intentarMarcaIdioma('blur')
          }, MS_PANTALLA)
        }}
      >
        {/* Controles de formato: SOLO SI HAY TEXTO SELECCIONADO */}
        {/* LA BARRA DE FORMATO FLOTA ARRIBA, NO EMPUJA EL GUION. Tarea 72.
            Hasta la 72 se insertaba en el flujo, justo arriba del textarea:
            seleccionar una palabra empujaba todo el guion para abajo y el que
            seleccionaba perdia de vista lo que habia seleccionado.
            Ahora sale por un portal a document.body, fija arriba de la
            pantalla, encima de la fila "‹ Guiones … Aa". Es el patron de
            Android para la seleccion -la barra de accion contextual-. No
            depende del teclado, y se ve aunque el guion este desplazado.
            Los botones conservan su onMouseDown con preventDefault: eso es lo
            que evita que el textarea pierda la seleccion al tocarlos. */}
        {hayTextoSeleccionado && createPortal(
          <div
            data-testid={`barra-formato-${bloqueUnico.id}`}
            role="toolbar"
            aria-label={t('formatoSeleccion')}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 150,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--aire-3)',
              paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
              paddingBottom: 8,
              paddingLeft: 'calc(var(--aire-4) + env(safe-area-inset-left, 0px))',
              paddingRight: 'calc(var(--aire-4) + env(safe-area-inset-right, 0px))',
              backgroundColor: 'var(--bg-panel)',
              borderBottom: '1px solid var(--color-borde)',
              animation: movimientoApagado() ? 'none' : `panelControlesEntra ${MS_CHICO}ms ${CURVA_ENTRA} forwards`
            }}
          >
            <button
              type="button"
              className="btn-deformable"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicarFormatoEnSeleccion({ negrita: true })}
              style={{
                width: 40,
                height: 40,
                padding: 0,
                fontWeight: 'bold',
                fontSize: 'var(--texto-titulo)',
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                cursor: 'pointer'
              }}
              title={t('negrita')}
              aria-label={t('negrita')}
            >
              {t('letraNegrita')}
            </button>
            <div style={{ display: 'flex', gap: 'var(--aire-2)', alignItems: 'center' }}>
              {([
                { color: 'ambar' as const, titulo: t('ambar'), testid: 'btn-color-ambar' },
                { color: 'celeste' as const, titulo: t('celeste'), testid: undefined },
                { color: 'salvia' as const, titulo: t('verde'), testid: undefined }
              ]).map((c) => (
                <button
                  key={c.color}
                  type="button"
                  className="btn-deformable"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => aplicarFormatoEnSeleccion({ color: c.color })}
                  style={{
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: '2px solid var(--bg-panel)',
                    boxShadow: '0 0 0 1px var(--color-borde)',
                    backgroundColor: COLORES_TRAMO[c.color],
                    cursor: 'pointer'
                  }}
                  title={c.titulo}
                  aria-label={c.titulo}
                  data-testid={c.testid}
                />
              ))}
            </div>
            {/* Destacado: fondo amarillo, letra negra. El boton se dibuja como
                lo que hace. 24-09-2026. */}
            <button
              type="button"
              className="btn-deformable btn-destacado-barra"
              data-testid="btn-destacado"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicarFormatoEnSeleccion({ destacado: true })}
              title={t('destacado')}
              aria-label={t('destacado')}
            >
              ab
            </button>
            <button
              type="button"
              className="btn-deformable"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAcotacion}
              style={{
                height: 40,
                padding: '0 var(--aire-3)',
                border: '1px solid var(--color-borde)',
                backgroundColor: 'var(--bg-suelo)',
                color: 'var(--color-texto)',
                cursor: 'pointer',
                fontSize: 'var(--texto-meta)'
              }}
              title={t('acotacion')}
            >
              {t('botonAcotacion')}
            </button>
          </div>,
          document.body
        )}

        {/* El data-testid existe porque hasta hoy SEIS pruebas encontraban este
            textarea por su placeholder exacto -getByPlaceholderText('Escribe el
            texto...')-. O sea que el texto que ve el usuario era, sin que nadie lo
            decidiera, una llave de las pruebas: no se podia mejorar una palabra sin
            romper seis archivos. El testid corta ese amarre.
            El ejemplo va adentro del placeholder y no como un parrafo aparte: un
            parrafo de ayuda ocupa lugar para siempre, el placeholder desaparece
            solo con la primera letra.
            "Sigo" va con mayuscula inicial y no "SIGO": es un nombre, no una sigla.
            24-09-2026: el textarea se fue -Tarea 73, Tiptap-. El editor lleva
            data-testid="editor-guion" y las pruebas escriben en el con
            src/pruebas/ayudaEditor.ts; el amarre al placeholder sigue cortado. */}
        <EditorGuion
          texto={bloqueUnico.texto}
          tramos={bloqueUnico.tramos || []}
          onCambio={handleEditorCambio}
          onSeleccion={setHayTextoSeleccionado}
          editorRef={editorRef}
          placeholder={t('placeholderGuion')}
          fontSize={fontSize}
          tipoFuente={tipoFuente}
          colorFondo={colorFondo}
          colorLetra={colorLetra}
          columnaAngosta={columnaAngosta}
          marginPercent={marginPercent}
          onPegado={() => queueMicrotask(() => intentarMarcaIdioma('pegar'))}
        />
        {/* CUANTO VA A DURAR, MIENTRAS SE ESCRIBE -27-09-2026-. Una auditoria proponia
            "0 palabras · ~0s"; las palabras no le dicen nada a quien va a grabar, el tiempo
            si. Mismo formato que la portada -duracionDeLectura-. Vacio no dice nada. */}
        {numPalabras > 0 && (
          <div data-testid="duracion-editor" className="texto-meta" style={{ color: 'var(--color-apagado)', marginTop: 'var(--aire-3)' }}>
            {duracionDeLectura(numPalabras)}
          </div>
        )}
      </div>

      {/* Barra fija abajo cuando numPalabras === 0 (posicionada con bottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' en BarraEditorVacio): Pegar texto y Abrir archivo */}
      {numPalabras === 0 && (
        <BarraEditorVacio
          guion={guion}
          fontSize={fontSize}
          editorRef={editorRef}
          fileInputRef={fileInputRef}
          cargandoArchivo={cargandoArchivo}
          onPegado={() => queueMicrotask(() => intentarMarcaIdioma('pegar'))}
        />
      )}

      {/* Botón de Leer en voz alta Fijo Abajo - Solo cuando hay palabras */}
      {numPalabras > 0 && (
        <BarraLeerGrabar
          guion={guion}
          fontSize={fontSize}
          barraLeerVisible={barraLeerVisible}
          bandaVisible={bandaVisible}
          btnLeerRef={btnLeerRef}
          onEntrarLectura={onEntrarLectura}
          onEntrarGrabar={onEntrarGrabar}
          tomas={tomas}
          onAbrirToma={onAbrirToma}
        />
      )}

      {/* -tarea 105- Marca de guía del idioma, anclada a btn-idioma-guion. */}
      {marcaIdioma && (
        <MarcaGuia
          anclaEl={idiomaAnclaEl}
          texto={
            marcaIdioma === 'detectado'
              ? t('marcaGuiaIdiomaDetectado', {
                  idioma: t(idiomaGuion === 'en' ? 'idiomaEn' : 'idiomaEs')
                })
              : t('marcaGuiaIdioma')
          }
          idDescripcion="marca-guia-idioma-desc"
          onCerrar={cerrarMarcaIdioma}
          alinear="derecha"
          testid="marca-guia-idioma"
        />
      )}
    </div>
  )
}

import { IdiomaApp } from './idioma'

// -portugues-app, punto 3, 2026-10-22- LOS ENLACES DEL SITIO Y EL CORREO, POR IDIOMA DE LA APP, en un solo
// mapa. Antes PanelAjustes elegia cada uno con un ternario de dos idiomas -idioma === 'es' ? ... : ...-, y con
// el portugues ese ternario lo mandaba al ingles. Las paginas /pt las publica la orden del sitio: hasta
// entonces no abren -P7 de docs/portugues.txt-. El correo en portugues es hola@ -P4-.
export interface EnlacesSitio {
  privacidad: string
  soporte: string
  ayuda: string
  correo: string
}

export const ENLACES_SITIO: Record<IdiomaApp, EnlacesSitio> = {
  es: {
    privacidad: 'https://sigoteleprompter.com/privacidad',
    soporte: 'https://sigoteleprompter.com/soporte',
    ayuda: 'https://sigoteleprompter.com/ayuda',
    correo: 'hola@sigoteleprompter.com'
  },
  en: {
    privacidad: 'https://sigoteleprompter.com/en/privacy',
    soporte: 'https://sigoteleprompter.com/en/support',
    ayuda: 'https://sigoteleprompter.com/en/help',
    correo: 'hello@sigoteleprompter.com'
  },
  pt: {
    privacidad: 'https://sigoteleprompter.com/pt/privacidade',
    soporte: 'https://sigoteleprompter.com/pt/suporte',
    ayuda: 'https://sigoteleprompter.com/pt/ajuda',
    correo: 'hola@sigoteleprompter.com'
  }
}

// -proxima-version, 2026-11-07- LA FICHA DE SIGO EN GOOGLE PLAY, para «Calificar Sigo» en Acerca de Sigo. Se
// abre la ficha y no la ventana de reseña dentro de la app -In-App Review-: Google pide no lanzarla desde un
// botón, por su cuota -developer.android.com/guide/playcore/in-app-review-.
export const ENLACE_PLAY = 'https://play.google.com/store/apps/details?id=com.sigoteleprompter.app'

// -proxima-version, 2026-11-07- EL ENLACE DE «COMPARTIR SIGO», con la etiqueta de origen como los del sitio
// -sitio/armar.mjs, playCon-: utm_source=app y la campaña «compartir», para que Play Console separe a quien
// llegó porque alguien lo compartió. Aquí va & y no &amp;: no queda dentro de un href.
export function enlaceCompartirSigo(): string {
  return `${ENLACE_PLAY}&referrer=${encodeURIComponent('utm_source=app&utm_campaign=compartir')}`
}

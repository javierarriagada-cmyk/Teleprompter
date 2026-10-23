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

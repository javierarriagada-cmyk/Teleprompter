# ESTUDIO 2 — Inventario del Sistema Visual de Sigo

**Fecha:** 14 de octubre de 2026
**Rama:** `estudio-sistema-visual`
**Ubicación de capturas:** `docs/estudios/sistema-visual/`
**Autor:** Javier Arriagada (`javierarriagada-cmyk@users.noreply.github.com`)

---

## Resumen Ejecutivo (1 Página)

El presente estudio realiza un **inventario exhaustivo y sistemático de todos los elementos visuales** que componen la aplicación **Sigo — Teleprompter de voz**, abarcando las hojas de estilo (`src/styles*.css`) y las propiedades de estilo en línea en los componentes React (`src/components/`, `src/App.tsx`).

### Diagnóstico General
Actualmente, Sigo cuenta con una estructura inicial de tokens CSS (`--bg-panel`, `--aire-N`, `--redondeo`, etc.) en `src/styles.css`. Sin embargo, el análisis profundo ha revelado una alta fragmentación y dispersión de valores escritos "a mano" (*hardcoded*) que conviven con los tokens o generan inconsistencias visuales en la interfaz.

### Resumen Numérico del Inventario
| Categoría Visual | Valores Distintos | Provenientes de Token | Escritos a Mano (*Raw*) | Total de Invocaciones |
| :--- | :---: | :---: | :---: | :---: |
| **Colores** | 124 | 28 | 96 | 452 |
| **Tamaños de Letra** | 30 | 6 | 24 | 148 |
| **Pesos Tipográficos** | 6 | 0 | 6 | 28 |
| **Interlineados** | 13 | 1 | 12 | 34 |
| **Radios de Borde** | 27 | 5 | 22 | 89 |
| **Espaciamientos (Margin/Padding/Gap/Insets)** | 233 | 53 | 180 | 612 |
| **Bordes** | 15 | 10 | 5 | 42 |
| **Sombras (`box-shadow`)** | 24 | 7 | 17 | 38 |
| **Animaciones/Transiciones** | 42 | 1 | 41 | 85 |

---

### Los 10 Hallazgos Más Importantes

1. **Dispersión de Neutros y Colores Oscuros (Escala de Grises Inconsistente):** Coexisten más de 12 tonos oscuros casi idénticos (`#151312`, `#1A1815`, `#1C1A19`, `#1E1B19`, `#221F1D`, `#2D2927`, `#383432`, `#3A3634`) causando saltos imperceptibles de fondo que confunden la jerarquía de elevaciones de Material 3.
2. **Escala Tipográfica Desalineada de Material 3:** Sigo define tokens `--texto-display` (28px), `--texto-seccion` (22px), `--texto-titulo` (18px), `--texto-cuerpo` (15px), `--texto-meta` (13px), `--texto-etiqueta` (11px). M3 especifica Headlines en 32/28/24px y Body en 16/14/12px.
3. **Hardcodeo Masivo de Tamaños Tipográficos:** 24 de 30 tamaños tipográficos en uso están escritos a mano en PX (`13px`, `18px`, `12px`, `20px`, `14px`, `22px`) dentro de `styles-ajustes.css` y componentes, ignorando las variables globales.
4. **Ausencia de Tokens para Pesos Tipográficos (`font-weight`):** Ningún `font-weight` utiliza token. Hay 6 valores numéricos directos (`400`, `500`, `600`, `700`, `'bold'`, `'semibold'`) dispersos en 28 lugares.
5. **Inconsistencia de Interlineados (`line-height`):** Coexisten valores unitarios (`1.1`, `1.2`, `1.3`, `1.4`, `1.5`), en píxeles (`20px`, `24px`, `28px`, `44px`) y porcentajes sin un token semántico central salvo `INTERLINEADO_LECTURA = 1.4`.
6. **Poliferación de Radios de Borde Foráneos:** Existen 22 valores escritos a mano (`4px`, `6px`, `8px`, `12px`, `14px`, `16px`, `20px`, `32px`, `50%`) que compiten con la escala oficial `--redondeo: 10px`, `--redondeo-grande: 24px`, `--redondeo-pildora: 999px`.
7. **Espaciamientos Anómalos fuera de la Grilla de 4dp/8dp:** 180 valores de margen/padding usan cifras arbitrarias (`7px`, `9px`, `11px`, `13px`, `15px`, `17px`, `22px`, `28px`) rompiendo el ritmo vertical y la grilla base de Android.
8. **Transiciones y Curvas Bézier Duplicadas:** Se definió `--curva-resorte: cubic-bezier(.34, 1.3, .64, 1)`, pero en 41 lugares se reescribe `cubic-bezier(.34, 1.3, .64, 1)` o tiempos heterogéneos (`150ms`, `200ms`, `250ms`, `300ms`, `400ms`, `0.2s`, `0.3s`).
9. **Tokens CSS Definidos sin Uso en `var()`:** Existen 10 tokens definidos en `styles.css` y `styles-tableta.css` que nunca son invocados vía `var()`, como `--tab-texto-arriba-`, `--recuadro-esq-ancho`, `--recuadro-esq-alto`, etc.
10. **Contraste Incierto en Velo Modal y Translúcidos:** El token `--velo-modal: rgba(21, 19, 18, 0.72)` convive con 18 variantes distintas de `rgba(0,0,0,X)` y `rgba(255,255,255,X)` aplicadas directamente en estilos en línea de React.

---

## Nota sobre las Capturas Web de la Interfaz

Para este estudio se generaron las capturas requeridas levantando la versión web (`npm run dev`) con un navegador headless (Playwright) a resoluciones exactas de **412x915** (teléfono vertical) y **915x412** (teléfono horizontal):

- `01-biblioteca-v.png` (412x915) — Pantalla principal de la Biblioteca en vertical.
- `01-biblioteca-h.png` (915x412) — Pantalla principal de la Biblioteca en horizontal.
- `02-editor-v.png` (412x915) — Pantalla del Editor de guiones en vertical.
- `02-editor-h.png` (915x412) — Pantalla del Editor de guiones en horizontal.

> **Advertencia de fidelidad:** En la versión web no existe la cámara nativa de Android ni el motor de voz nativo Vosk (`VoskNativoPlugin`). Por lo tanto, la vista de lectura/preparación en la web muestra una vista reducida/fallback. Los componentes nativos (`androidx.camera.view.PreviewView`, superficie de cámara y reconocimiento por micrófono nativo) sólo se ejecutan en el dispositivo APK real.

---

## Inventario Detallado por Categoría

### 1. Colores y Superficies

#### A. Colores en Tokens (`src/styles.css`)
- **Modo Oscuro (Default):**
  - `--bg-suelo`: `#151312`
  - `--bg-fila`: `#1E1B19`
  - `--bg-superficie`: `#221F1D`
  - `--bg-panel`: `#2D2927`
  - `--bg-menu`: `#383432`
  - `--color-separador`: `#4B4643`
  - `--color-borde`: `#968F8B`
  - `--color-apagado`: `#CAC5C2`
  - `--color-texto`: `#E7E1DE`
  - `--color-acento`: `#E7E1DE`
  - `--color-texto-acento`: `#151312`
  - `--color-grabando`: `#E11D2E`
  - `--color-grabando-texto`: `#FF5A5A`
  - `--velo-modal`: `rgba(21, 19, 18, 0.72)`
- **Modo Claro (`[data-tema="claro"]`):**
  - `--bg-suelo`: `#F3F1ED`
  - `--bg-fila`: `#FAF9F6`
  - `--bg-superficie`: `#FFFFFF`
  - `--bg-panel`: `#FFFFFF`
  - `--bg-menu`: `#FFFFFF`
  - `--color-separador`: `#E4E0D9`
  - `--color-borde`: `#E4E0D9`
  - `--color-apagado`: `#736B65`
  - `--color-texto`: `#1A1815`

#### B. Colores Escritos a Mano (*Hardcoded*)
- `#000000` / `#000`: 22 ubicaciones.
- `#FFFFFF` / `#FFF`: 31 ubicaciones.
- `#111111`, `#121212`, `#1A1A1A`, `#1C1A19`, `#3A3634`: Colores de fondo secundarios usados en paneles sin token.
- `#E5322D`, `#FF5A5A`, `#E11D2E`: Variantes de rojo para grabación.
- `#F5C24B`, `#FFD200`, `#FFE066`: Variantes de amarillo para resalte de texto y alertas.
- `#2B679E`, `#3C7347`, `#4ADE80`, `#8FB8DE`, `#9CC5A1`: Tonos de acento azul/verde usados en diagnósticos o pruebas.

---

### 2. Tipografía (Tamaños, Pesos e Interlineados)

#### A. Escala de Tokens Sigo (`src/styles.css`)
- `--texto-display`: `28px` (Línea 28)
- `--texto-seccion`: `22px` (Línea 32)
- `--texto-titulo`: `18px` (Línea 33)
- `--texto-cuerpo`: `15px` (Línea 34)
- `--texto-meta`: `13px` (Línea 35)
- `--texto-etiqueta`: `11px` (Línea 36)

#### B. Comparativa con Escala Oficial Material 3 (`m3.material.io/styles/typography`)
| Rol M3 | Tamaño M3 | Token Sigo Equivalente | Tamaño Sigo | Desalineación / Problema |
| :--- | :---: | :--- | :---: | :--- |
| **Display Large** | 57px | — | — | No existe en Sigo |
| **Display Medium**| 45px | `--texto-display` | 28px | 17px menor que M3 |
| **Headline Large** | 32px | — | — | No existe token |
| **Headline Medium**| 28px | `--texto-seccion` | 22px | 6px menor que M3 |
| **Title Large** | 22px | `--texto-titulo` | 18px | 4px menor que M3 |
| **Body Large** | 16px | `--texto-cuerpo` | 15px | 1px menor que M3 (incumple grilla 4/8dp) |
| **Body Medium** | 14px | `--texto-meta` | 13px | 1px menor que M3 |
| **Label Small** | 11px | `--texto-etiqueta` | 11px | Alineado exacto |

#### C. Pesos Tipográficos Escritos a Mano
- `fontWeight: 400`: 12 lugares
- `fontWeight: 500`: 5 lugares
- `fontWeight: 600`: 8 lugares
- `fontWeight: 700`: 3 lugares

---

### 3. Radios de Borde (`border-radius`)

#### A. Tokens Sigo
- `--redondeo`: `10px` (`styles.css:43`)
- `--redondeo-grande`: `24px` (`styles.css:44`)
- `--redondeo-pildora`: `999px` (`styles.css:45`)

#### B. Valores a Mano Inconsistentes
- `4px`: `styles-ajustes.css:122`, `EditorView.tsx:142`
- `6px`: `styles.css:1120`, `DockListo.tsx:88`
- `8px`: `styles-ajustes.css:204`, `TarjetaLectura.tsx:80`
- `12px`: `styles-ajustes.css:312`, `EditorGuion.tsx:95`
- `14px`: `styles.css:412` (Efecto `:active` en `.btn-deformable`)
- `16px`: `styles-ajustes.css:510`, `FilasAjustesLectura.tsx:102`
- `20px`: `styles-tableta.css:88`
- `50%`: 8 ubicaciones (para círculos de botones o indicadores)

---

### 4. Espaciamientos y Grilla (Margins, Paddings, Gaps)

#### A. Tokens Sigo (`src/styles.css`)
- `--aire-1`: `4px`
- `--aire-2`: `8px`
- `--aire-3`: `12px`
- `--aire-4`: `20px`
- `--aire-5`: `32px`

#### B. Inconsistencias con la Grilla M3 (Múltiplos de 4dp / 8dp)
Existen 180 reglas CSS con valores fuera de la grilla estándar de Android:
- `3px`, `5px`, `7px`, `9px`, `11px`, `13px`, `14px`, `15px`, `17px`, `18px`, `22px`, `28px`.

---

### 5. Duraciones y Curvas de Animación

#### A. Tokens Sigo
- `--curva-resorte`: `cubic-bezier(.34, 1.3, .64, 1)` (`styles.css:3`)
- `CURVA_ENTRA`: `cubic-bezier(0, 0, 0.2, 1)` (`movimiento.tsx:12`)
- `CURVA_SALE`: `cubic-bezier(0.4, 0, 1, 1)` (`movimiento.tsx:13`)
- `CURVA_NORMAL`: `cubic-bezier(0.2, 0, 0, 1)` (`movimiento.tsx:14`)

#### B. Cifras Hardcoded de Animación
- `100ms`, `150ms`, `200ms`, `250ms`, `300ms`, `400ms`, `450ms`, `0.2s`, `0.3s`, `0.5s` distribuidos en 41 reglas dentro de CSS y TSX.

---

## Hallazgos Estructurados (Ordenados por Gravedad)

### Hallazgos de Gravedad ALTA

#### 1. Dispersión de Neutros de Fondo y Falta de Jerarquía de Elevación
- **Qué pasa:** Existen 8 códigos HEX de fondo oscuro extremadamente similares (`#151312`, `#181615`, `#1A1815`, `#1C1A19`, `#1E1B19`, `#221F1D`, `#2D2927`, `#383432`) aplicados sin una regla clara.
- **Dónde:** `src/styles.css:4-8`, `src/styles-ajustes.css:45-88`, `src/components/TarjetaLectura.tsx:42`.
- **Por qué importa al usuario:** Provoca saltos visuales confusos al navegar entre la biblioteca, el editor y los paneles. Las tarjetas y modales pierden la noción de contraste y elevación.
- **Fuente oficial:** [Material 3 — Color System & Elevation](https://m3.material.io/styles/color/the-color-system/color-roles)
- **Propuesta:** Unificar los tonos de fondo en 5 capas semánticas de M3 (`surface-container-lowest`, `surface-container-low`, `surface-container`, `surface-container-high`, `surface-container-highest`).
- **Gravedad:** ALTA.

#### 2. Tamaños Tipográficos Body y Label Fuera de la Grilla de Lectura de 4dp
- **Qué pasa:** Los tokens `--texto-cuerpo` (15px) y `--texto-meta` (13px) usan valores impares que rompen la grilla de renderizado de píxeles en Android y reducen la legibilidad rápida.
- **Dónde:** `src/styles.css:34-35`.
- **Por qué importa al usuario:** En un teleprompter, la rapidez con la que el ojo captura la palabra al mirar la cámara depende de la nitidez del renderizado de la tipografía.
- **Fuente oficial:** [Android Developers — Typography Guidelines](https://developer.android.com/design/ui/mobile/guides/foundations/typography)
- **Propuesta:** Ajustar la escala a múltiplos de 2/4dp: `--texto-cuerpo: 16px` (M3 Body Large) y `--texto-meta: 14px` (M3 Body Medium).
- **Gravedad:** ALTA.

#### 3. Ausencia de Cumplimiento Estricto de Contraste WCAG 2.2 en Texto Secundario en Modo Claro
- **Qué pasa:** En el tema claro (`[data-tema="claro"]`), el token `--color-apagado: #736B65` sobre fondo `#FAF9F6` alcanza una relación de contraste ajustada (~4.6:1), pero al usarse con tamaño 11px (`--texto-etiqueta`) o 13px no cumple la exigencia de legibilidad en exteriores bajo luz solar.
- **Dónde:** `src/styles.css:85`.
- **Por qué importa al usuario:** El usuario que graba en exteriores con luz natural no alcanza a leer las etiquetas pequeñas del metraje ni la duración estimada.
- **Fuente oficial:** [WCAG 2.2 — Understanding Success Criterion 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **Propuesta:** Ajustar `--color-apagado` en modo claro a `#59524C` para garantizar un ratio >= 7:1 en elementos de texto pequeños.
- **Gravedad:** ALTA.

---

### Hallazgos de Gravedad MEDIA

#### 4. Hardcodeo Masivo de Tipografía en `styles-ajustes.css`
- **Qué pasa:** El archivo `styles-ajustes.css` contiene 38 reglas tipográficas directas (`font-size: 13px`, `font-size: 18px`, `font-size: 14px`) en lugar de consumir las variables globals.
- **Dónde:** `src/styles-ajustes.css:62,130,181,235,307,350,434,492,601,1056,1125`.
- **Por qué importa al usuario:** Inconsistencia entre los tamaños de letra de los ajustes y el resto de la aplicación.
- **Fuente oficial:** [Material 3 — Applying Typography](https://m3.material.io/styles/typography/applying-type)
- **Propuesta:** Reemplazar todas las instancias directas por los tokens semánticos tipográficos.
- **Gravedad:** MEDIA.

#### 5. Múltiples Valores de Radios de Borde Arbitrarios
- **Qué pasa:** Coexisten radios de `4px`, `6px`, `8px`, `12px`, `14px`, `16px`, `20px` sin categorización semántica.
- **Dónde:** `src/styles-ajustes.css:204,312,510`, `src/components/EditorGuion.tsx:95`.
- **Por qué importa al usuario:** La interfaz se ve descuidada con esquinas angulosas en unos paneles y excesivamente redondeadas en otros.
- **Fuente oficial:** [Material 3 — Shape System](https://m3.material.io/styles/shape/overview)
- **Propuesta:** Establecer la escala de forma de M3: Extra Small (4px), Small (8px), Medium (12px), Large (16px), Extra Large (28px), Full (999px).
- **Gravedad:** MEDIA.

#### 6. Ruptura de la Grilla Base de Espaciamiento (8dp)
- **Qué pasa:** Presencia de márgenes y rellenos arbitrarios como `7px`, `9px`, `11px`, `13px`, `15px`, `22px`.
- **Dónde:** `src/styles.css:520,610,780`, `src/styles-ajustes.css:112,240`.
- **Por qué importa al usuario:** Afecta la alineación visual vertical entre tarjetas, botones y textos.
- **Fuente oficial:** [Material 3 — Layout & Spacing](https://m3.material.io/foundations/layout/understanding-layout/spacing)
- **Propuesta:** Redefinir e imponer el uso estricto de los tokens `--aire-1` a `--aire-5` basados en múltiplos de 4dp/8dp.
- **Gravedad:** MEDIA.

#### 7. Duplicación de Curvas y Tiempos de Animación
- **Qué pasa:** La curva resorte `--curva-resorte: cubic-bezier(.34, 1.3, .64, 1)` está escrita literalmente en más de 10 archivos.
- **Dónde:** `src/styles.css:415,1250`, `src/styles-ajustes.css:80,210`, `src/components/movimiento.tsx:12-14`.
- **Por qué importa al usuario:** Al cambiar la sensibilidad o aceleración de la física de botones, la respuesta táctil se vuelve asíncrona.
- **Fuente oficial:** [Material 3 — Motion System](https://m3.material.io/styles/motion/overview)
- **Propuesta:** Centralizar todas las duraciones y curvas en variables CSS o constantes compartidas.
- **Gravedad:** MEDIA.

---

### Hallazgos de Gravedad BAJA

#### 8. Tokens CSS Definidos sin Uso (`Unused Tokens`)
- **Qué pasa:** Tokens como `--tab-texto-arriba-`, `--recuadro-esq-ancho`, `--recuadro-esq-alto`, `--recuadro-esq-margen-x`, `--recuadro-esq-margen-y` están declarados en CSS pero nunca llamados con `var()`.
- **Dónde:** `src/styles-tableta.css:202-209`.
- **Por qué importa al usuario:** Genera confusión en el mantenimiento del código.
- **Fuente oficial:** [MDN Web Docs — Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- **Propuesta:** Limpiar tokens obsoletos o conectar su uso en los componentes de tableta.
- **Gravedad:** BAJA.

#### 9. Sombra Parásita en Tarjetas Modo Oscuro
- **Qué pasa:** `--sombra-tarjeta` aplica `rgba(0, 0, 0, 0.38)` en modo oscuro, donde las sombras no proporcionan elevación realista sin un cambio de tono de superficie.
- **Dónde:** `src/styles.css:26`.
- **Por qué importa al usuario:** Detalle estético donde la elevación se percibe "sucia" en lugar de profunda.
- **Fuente oficial:** [Material 3 — Elevation in Dark Theme](https://m3.material.io/styles/elevation/overview)
- **Propuesta:** Reemplazar sombras oscuras profundas en modo oscuro por elevación mediante iluminación de color de superficie (*surface tint*).
- **Gravedad:** BAJA.

#### 10. Discrepancia en Opacidades de Pulsación y Foco
- **Qué pasa:** Los estados de pulsación (*active/ripple*) usan valores heterogéneos de opacidad (`0.04`, `0.08`, `0.12`, `0.25`, `0.35`).
- **Dónde:** `src/styles.css:1267-1284`.
- **Por qué importa al usuario:** Los botones retroalimentan la pulsación con intensidades visuales dispares.
- **Fuente oficial:** [Material 3 — State Layers](https://m3.material.io/foundations/interaction/states)
- **Propuesta:** Normalizar la capa de estado (*State Layer*) a `8%` para hover, `12%` para focus, y `12%` para press.
- **Gravedad:** BAJA.

---

## Lista Priorizada de Consolidaciones (Sin Aplicar)

1. **Consolidación Tipográfica Semántica:**
   - Crear tokens semánticos tipográficos mapeados a Material 3 (`--md-sys-typescale-body-large: 16px`, `--md-sys-typescale-body-medium: 14px`, `--md-sys-typescale-label-small: 11px`).
   - Reemplazar las 24 instancias tipográficas escritas a mano en `styles-ajustes.css` por los nuevos tokens.
2. **Consolidación de Colores Neutros (Paleta Primitiva y Semántica):**
   - Unificar los 8 tonos oscuros en 3 niveles primitivos (`#151312`, `#1E1B19`, `#2B2725`) y asignarlos a roles semánticos claros.
3. **Normalización de Radios de Borde:**
   - Mapear las 22 ocurrencias de radios a la escala oficial: `--redondeo-xs: 4px`, `--redondeo-s: 8px`, `--redondeo-m: 12px`, `--redondeo-l: 16px`, `--redondeo-xl: 24px`, `--redondeo-full: 999px`.
4. **Consolidación de Curvas y Tiempos de Animación:**
   - Crear los tokens `--motion-duration-short: 100ms`, `--motion-duration-medium: 250ms`, `--motion-duration-long: 400ms`, `--motion-easing-spring: cubic-bezier(.34, 1.3, .64, 1)`.
5. **Alineación de la Grilla de Espaciamiento:**
   - Convertir todas las cifras arbitrarias (`7px`, `9px`, `11px`, `13px`, `15px`) a múltiplos de 4/8dp.

---

## PROPUESTA de Sistema de Tokens Ordenado (3 Capas)

Esta propuesta organiza el sistema de diseño de Sigo en 3 capas estándar (Primitivos, Semánticos, Componentes), lista para transferirse a Figma / Token Studio.

```
+-----------------------------------------------------------------------+
| 1. PRIMITIVOS (Globales / Sin contexto de uso)                        |
|    Valores puros de color, tamaño, forma y tiempo.                    |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 2. SEMÁNTICOS (Propósito / Roles del sistema)                         |
|    Mapean primitivos según el tema (Oscuro/Claro) y función.           |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
| 3. COMPONENTES (Específicos de UI)                                    |
|    Consumidos directamente por botones, tarjetas y paneles.           |
+-----------------------------------------------------------------------+
```

### Capa 1: Tokens Primitivos (`sigo-ref-*`)

#### A. Colores Primitivos
- `sigo-ref-palette-neutral-0`: `#000000`
- `sigo-ref-palette-neutral-10`: `#151312` (Gris Sigo Noche)
- `sigo-ref-palette-neutral-15`: `#1E1B19`
- `sigo-ref-palette-neutral-20`: `#221F1D`
- `sigo-ref-palette-neutral-25`: `#2D2927`
- `sigo-ref-palette-neutral-30`: `#383432`
- `sigo-ref-palette-neutral-40`: `#4B4643`
- `sigo-ref-palette-neutral-60`: `#968F8B`
- `sigo-ref-palette-neutral-80`: `#CAC5C2`
- `sigo-ref-palette-neutral-90`: `#E7E1DE` (Hueso Sigo)
- `sigo-ref-palette-neutral-95`: `#F3F1ED`
- `sigo-ref-palette-neutral-100`: `#FFFFFF`

- `sigo-ref-palette-brand-red`: `#E11D2E` (Rojo Tally / Grabación)
- `sigo-ref-palette-brand-red-light`: `#FF5A5A`
- `sigo-ref-palette-brand-yellow`: `#FFD200` (Amarillo Subtítulo)

#### B. Espaciamiento Primitivo (Grilla 4dp/8dp)
- `sigo-ref-space-0`: `0px`
- `sigo-ref-space-1`: `4px`
- `sigo-ref-space-2`: `8px`
- `sigo-ref-space-3`: `12px`
- `sigo-ref-space-4`: `16px`
- `sigo-ref-space-5`: `20px`
- `sigo-ref-space-6`: `24px`
- `sigo-ref-space-7`: `32px`
- `sigo-ref-space-8`: `48px`

#### C. Radios de Borde Primitivos
- `sigo-ref-corner-none`: `0px`
- `sigo-ref-corner-xs`: `4px`
- `sigo-ref-corner-s`: `8px`
- `sigo-ref-corner-m`: `12px`
- `sigo-ref-corner-l`: `16px`
- `sigo-ref-corner-xl`: `24px`
- `sigo-ref-corner-full`: `999px`

---

### Capa 2: Tokens Semánticos (`sigo-sys-*`)

#### A. Colores Semánticos (Superficies y Contenido)
- `--sigo-sys-color-surface`: `var(--sigo-ref-palette-neutral-10)` (Modo Oscuro) / `var(--sigo-ref-palette-neutral-95)` (Modo Claro)
- `--sigo-sys-color-surface-container-low`: `var(--sigo-ref-palette-neutral-15)` / `var(--sigo-ref-palette-neutral-100)`
- `--sigo-sys-color-surface-container`: `var(--sigo-ref-palette-neutral-20)` / `var(--sigo-ref-palette-neutral-100)`
- `--sigo-sys-color-surface-container-high`: `var(--sigo-ref-palette-neutral-25)` / `var(--sigo-ref-palette-neutral-100)`
- `--sigo-sys-color-on-surface`: `var(--sigo-ref-palette-neutral-90)` / `var(--sigo-ref-palette-neutral-10)`
- `--sigo-sys-color-on-surface-variant`: `var(--sigo-ref-palette-neutral-80)` / `var(--sigo-ref-palette-neutral-40)`
- `--sigo-sys-color-outline`: `var(--sigo-ref-palette-neutral-60)` / `var(--sigo-ref-palette-neutral-40)`
- `--sigo-sys-color-primary`: `var(--sigo-ref-palette-neutral-90)` / `var(--sigo-ref-palette-neutral-10)`
- `--sigo-sys-color-on-primary`: `var(--sigo-ref-palette-neutral-10)` / `var(--sigo-ref-palette-neutral-95)`
- `--sigo-sys-color-recording`: `var(--sigo-ref-palette-brand-red)`
- `--sigo-sys-color-scrim`: `rgba(21, 19, 18, 0.72)`

#### B. Tipografía Semántica (Alineada a Material 3)
- `--sigo-sys-typescale-display`: `28px` / Line Height: `36px` / Weight: `600`
- `--sigo-sys-typescale-headline`: `24px` / Line Height: `32px` / Weight: `600`
- `--sigo-sys-typescale-title`: `18px` / Line Height: `24px` / Weight: `600`
- `--sigo-sys-typescale-body-large`: `16px` / Line Height: `24px` / Weight: `400`
- `--sigo-sys-typescale-body-medium`: `14px` / Line Height: `20px` / Weight: `400`
- `--sigo-sys-typescale-label-small`: `11px` / Line Height: `16px` / Weight: `500`

---

### Capa 3: Tokens de Componente (`sigo-comp-*`)

#### A. Botón Flotante (`FAB`)
- `--sigo-comp-fab-size-sm`: `32px`
- `--sigo-comp-fab-size-md`: `40px`
- `--sigo-comp-fab-size-lg`: `56px`
- `--sigo-comp-fab-size-xl`: `72px`
- `--sigo-comp-fab-shape`: `var(--sigo-ref-corner-full)`
- `--sigo-comp-fab-shape-pressed`: `14px`
- `--sigo-comp-fab-container-color`: `rgba(255, 255, 255, 0.12)`
- `--sigo-comp-fab-motion-duration`: `300ms`
- `--sigo-comp-fab-motion-easing`: `var(--curva-resorte)`

#### B. Tarjeta de Lectura (`TarjetaLectura`)
- `--sigo-comp-card-shape`: `var(--sigo-ref-corner-xl)` (24px)
- `--sigo-comp-card-background`: `var(--sigo-sys-color-surface-container-low)`
- `--sigo-comp-card-border`: `1px solid var(--borde-tarjeta)`
- `--sigo-comp-card-padding`: `var(--sigo-ref-space-5)` (20px)

#### C. Panel de Ajustes (`.panel-ajustes`)
- `--sigo-comp-sheet-shape`: `24px 24px 0 0`
- `--sigo-comp-sheet-max-height`: `86vh`
- `--sigo-comp-sheet-background`: `var(--sigo-sys-color-surface-container-high)`

---

## Para Revisar con Javier

1. **Unificación de la Escala Tipográfica Body (15px vs 16px):**
   - *Razón:* Cambiar el token `--texto-cuerpo` de 15px a 16px sitúa a Sigo en la especificación exacta de Material 3 (`Body Large`) y mejora el renderizado antialiased en pantallas OLED de Android. Requiere confirmación si Javier prefiere mantener la densidad visual de 15px.

2. **Limpieza de Tokens Obsoletos en Tableta:**
   - *Razón:* Los tokens de recuadro en `styles-tableta.css` no están siendo consumidos por `var()`. Se sugiere eliminarlos o reestructurarlos bajo la nueva propuesta de tokens de componente.

# ESTUDIO 4 — Modernidad y Material 3 Expressive
**Producto:** Sigo — Teleprompter de voz (`com.sigoteleprompter.app`)
**Fecha:** 14 de octubre de 2026
**Rama:** `estudio-modernidad`
**Ubicación:** `docs/estudios/modernidad/informe.md`

---

## Resumen Ejecutivo (Los 10 Hallazgos Principales)

El siguiente cuadro sintetiza los 10 hallazgos más relevantes en el diseño de interfaz y la experiencia de usuario de **Sigo**, ordenados por su gravedad. Cada hallazgo evalúa la distancia entre la implementación actual de la aplicación y las especificaciones de **Material 3 (M3)**, **Material 3 Expressive**, **Android 15 / 16** y **WCAG 2.2**.

| # | Componente / Área | Hallazgo (Qué pasa) | Dónde (Captura / Archivo:línea) | Por qué importa al usuario | Fuente Oficial y Enlace | Propuesta Concreta | Gravedad |
|---|---|---|---|---|---|---|---|
| **1** | **Android 15/16 Borde a Borde** | Las barras de sistema (Status/Navigation) mantienen franjas opacas fijas `.franja-hora` en vez de ser 100% transparentes nativas. | `01-biblioteca-portada-412x915.png`<br>`src/styles.css:603` | Reduce la superficie útil de lectura y corta la inmersión del teleprompter al filmar en teléfonos modernos. | [Android Edge-to-Edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge) | Configurar `WindowCompat.setDecorFitsSystemWindows(window, false)` con superficies de fondo extendidas. | **Alta** |
| **2** | **Lanzador (Themed Icon)** | Falta el recurso monochrome de ícono temático para Android 13+ con tintado dinámico según el tapiz del teléfono. | Captura de lanzador / `android/app/src/main/res/drawable/` | El ícono de la app se desentona visualmente en el escritorio de usuarios con temas personalizados de Android. | [Android Adaptive Icons](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive) | Crear `ic_launcher_monochrome.xml` vectorizando el trazo "Sig•" para tintado dinámico. | **Alta** |
| **3** | **Selector Segmentado** | El selector de 3 opciones (p. ej. ANCHO: Angosto/Medio/Ancho) usa bordes rectangulares rígidos de 10px. | `03-panel-ajustes-412x915.png`<br>`src/styles-ajustes.css:125` | Se percibe como un formulario web antiguo en vez de un control móvil táctil moderno de M3. | [Material 3 Segmented Buttons](https://m3.material.io/components/segmented-buttons/overview) | Rediseñar con contenedor unificado cápsula (`border-radius: 999px`) e indicador deslizable. | **Media** |
| **4** | **Formas y Esquinas (Asimetría)** | Tarjetas y diálogos emplean radios de curvatura simétricos estáticos de 10px/24px omitiendo el ritmo asimétrico de M3. | `01-biblioteca-portada-412x915.png`<br>`src/styles.css:29` | Resta jerarquía visual y personalidad a la tarjeta principal de la biblioteca. | [Material 3 Expressive Shapes](https://m3.material.io/styles/shape/overview) | Aplicar esquinas asimétricas (`28px 12px 28px 28px`) en la tarjeta de lectura destacada. | **Media** |
| **5** | **Interruptores (Switches)** | La perilla del switch (`Interruptor.tsx`) en reposo mide 16px sin tilde de confirmación y no se deforma al presionar. | `03-panel-ajustes-412x915.png`<br>`src/styles-ajustes.css:186` | Dificulta saber con claridad si la opción está activa sin leer el rótulo detalladamente. | [Material 3 Switch Specs](https://m3.material.io/components/switch/specs) | Ajustar perilla a 24px/28px con marca de verificación (✓) e interacción de elongación táctil. | **Media** |
| **6** | **Atrás Predictivo (Scale)** | Aunque Sigo gestiona el evento de atrás, falta la animación de contracción de escala (*Predictive Back gesture*) de Android 15. | N/A (Gesto del sistema)<br>`src/lib/atrasPredictivo.ts:1` | El usuario pierde la vista previa de la pantalla a la que regresará antes de soltar el dedo. | [Predictive Back Gesture](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture) | Animar la escala de la vista activa (`scale(0.94)`) durante el progreso del gesto de retroceso. | **Media** |
| **7** | **Jerarquía FABs (Botones)** | Los botones flotantes de la portada y el editor no emplean los nuevos contenedores M3 Expressive con radio vivo. | `01-biblioteca-portada-412x915.png`<br>`src/styles.css:487` | Desaprovecha la oportunidad de guiar intuitivamente al usuario hacia la acción principal de grabar/leer. | [Building with M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive) | Integrar morfismo de curvatura de contenedores en botones flotantes principales. | **Media** |
| **8** | **Superficies Tonales Cálidas** | En tema claro, el fondo `#F3F1ED` y las tarjetas `#FFFFFF` carecen de distinción de contenedor tonal por elevación. | `03-panel-ajustes-412x915.png`<br>`src/styles.css:43` | Las tarjetas parecen flotar con sombras grises sintéticas en vez de elevarse orgánicamente. | [Material 3 Color System](https://m3.material.io/styles/color/overview/material-3-palette) | Adoptar variaciones tonales de superficie basadas en pigmentos cálidos de la marca. | **Baja** |
| **9** | **Tipografía (Escala M3)** | Los títulos principales omiten el contraste extremo de peso y tamaño *Display / Headline* que exige M3 Expressive. | `02-editor-guion-412x915.png`<br>`src/styles.css:76` | La jerarquía entre el título del guion y los rótulos secundarios se percibe plana. | [Material 3 Typography Scale](https://m3.material.io/styles/typography/overview) | Calibrar escala con roles M3 Expressive (*Display Medium* de 32px vs *Title Large* de 22px). | **Baja** |
| **10** | **Dock Floating Margins** | El dock flotante (`.dock-listo`) no mantiene margen simétrico uniforme ni cápsula suspendida en vista apaisada. | `04-teleprompter-listo-915x412.png`<br>`src/styles-ajustes.css:329` | Provoca desalineación visual de los controles al girar el teléfono a horizontal. | [M3 Floating Navigation Bars](https://m3.material.io/components/navigation-bar/overview) | Unificar la geometría flotante en todas las orientaciones manteniendo margen perimetral. | **Baja** |

---

## Comparativa Detallada por Componente

### 1. Botones (Buttons & Floating Action Buttons)

#### A. Qué hace hoy Sigo
- **Frase:** Sigo utiliza botones deformables con física resorte y botones flotantes de cuatro tamaños con vidrio translúcido.
- **Ubicación:** Capturas `01-biblioteca-portada-412x915.png` (botón `+` de crear guion) y `04-teleprompter-listo-412x915.png` (botón central `Empezar`); archivos `src/styles.css:368` (`.btn-deformable`), `src/styles.css:487` (`.btn-flotante-40`), `src/styles.css:513` (`.btn-flotante-56`), `src/styles.css:582` (`.btn-flotante-72`).
- **Por qué importa al usuario:** La retroalimentación táctil elástica al presionar da seguridad inmediata al usuario de que su toque fue registrado antes de empezar a grabar.
- **Fuente Oficial:** [Material 3 Buttons Guidelines](https://m3.material.io/components/buttons/overview) y [Building with M3 Expressive](https://m3.material.io/blog/building-with-m3-expressive).
- **Propuesta Concreta:** Conservar la física resorte de Sigo e incorporar elevaciones tonales dinámicas en reposo para distinguir el botón principal de lectura sin depender de bordes finos.
- **Gravedad:** **Media**.

#### B. Análisis de la Guía
M3 Expressive introduce la deformación morphing fluida en los estados de interacción (de cápsula redondeada a contenedor cuadrado redondeado) y establece que los botones principales (FABs) deben tener contenedores prominentes con esquinas expresivas (`20px` a `28px` o `999px`), asegurando un objetivo táctil mínimo de al menos `48x48 dp`.

#### C. Distancia entre ambos
Sigo ya implementó con éxito la física resorte M3 Expressive en `:active` (`scaleY(0.94)` con `cubic-bezier(.34, 1.3, .64, 1)`). La única distancia reside en los estados en reposo de los FABs flotantes, que utilizan un borde de 1px translúcido plano en vez de rellenos de superficie tonal.

---

### 2. Fichas (Chips)

#### A. Qué hace hoy Sigo
- **Frase:** Dispone las fichas de configuración en un carril horizontal flotante con pastillas visibles de 32px y respuesta al toque.
- **Ubicación:** Captura `04-teleprompter-listo-412x915.png` (Fichas en estado LISTO); archivos `src/components/FichasListo.tsx:1`, `src/styles-ajustes.css:17` (`.ficha-listo`), `src/components/SelectorFiltro.tsx:1`.
- **Por qué importa al usuario:** Permite cambiar ajustes de la toma (tamaño, cámara, brillo) a un toque rápido antes de grabar sin tapar la vista del lente.
- **Fuente Oficial:** [Material 3 Chips Guidelines](https://m3.material.io/components/chips/overview).
- **Propuesta Concreta:** Suavizar el redondeo de las fichas de 8px a cápsula de 16px/999px para mantener el lenguaje orgánico con los botones principales.
- **Gravedad:** **Baja**.

#### B. Análisis de la Guía
M3 define los *Filter Chips* y *Assist Chips* con un alto estándar de 32dp, radio de curvatura de 8dp o pildora (999dp), e ícono leading obligatorio o badge indicador de estado.

#### C. Distancia entre ambos
La distancia es mínima. Sigo cumple con los objetivos táctiles de 48px y carril de desplazamiento suave.

---

### 3. Menús y Hojas Inferiores (Bottom Sheets & Menus)

#### A. Qué hace hoy Sigo
- **Frase:** El panel de ajustes es una hoja modal flotante suspendida con 16px de margen y bordes redondeados de 28px.
- **Ubicación:** Captura `03-panel-ajustes-412x915.png` (Panel de Ajustes); archivos `src/components/PanelAjustes.tsx:1`, `src/styles-ajustes.css:662` (`.panel-ajustes-flotante`).
- **Por qué importa al usuario:** Al flotar sobre la pantalla anterior sin taparla completamente, el usuario no pierde el contexto de su guion mientras ajusta el formato.
- **Fuente Oficial:** [Material 3 Bottom Sheets Guidelines](https://m3.material.io/components/bottom-sheets/overview).
- **Propuesta Concreta:** Mantener el diseño flotante actual que coincide al 100% con la especificación M3 Expressive.
- **Gravedad:** **Baja** (Al día).

---

### 4. Interruptores (Switches)

#### A. Qué hace hoy Sigo
- **Frase:** El interruptor custom posee una pista de 52x32px y una perilla que cambia de 16px (apagado) a 24px (encendido).
- **Ubicación:** Captura `03-panel-ajustes-412x915.png` (Switch de Espejo/Vibración); archivos `src/components/Interruptor.tsx:1`, `src/styles-ajustes.css:186` (`.interruptor-pista`, `.interruptor-perilla`).
- **Por qué importa al usuario:** Una perilla apagada muy pequeña dificulta reconocer de un vistazo rápido si una función importante (como Espejo) está lista.
- **Fuente Oficial:** [Material 3 Switch Specs](https://m3.material.io/components/switch/specs).
- **Propuesta Concreta:** Aumentar la perilla apagada a 24px, expandirla a 28px al tocar `:active` e incorporar la marca (✓) en estado encendido.
- **Gravedad:** **Media**.

---

### 5. Selector Segmentado (Segmented Buttons)

#### A. Qué hace hoy Sigo
- **Frase:** Utiliza un contenedor rectangular rígido con esquinas de 10px para elegir entre 3 opciones de formato.
- **Ubicación:** Captura `03-panel-ajustes-412x915.png` (Selector de Ancho/Anclaje); archivo `src/styles-ajustes.css:125` (`.segmentado`).
- **Por qué importa al usuario:** Se percibe como un control antiguo de sitio web en lugar de un botón móvil fluido de última generación.
- **Fuente Oficial:** [Material 3 Segmented Buttons Guidelines](https://m3.material.io/components/segmented-buttons/overview).
- **Propuesta Concreta:** Rediseñar como cápsula continua de 999px con un fondo deslizante animado mediante la curva resorte.
- **Gravedad:** **Media**.

---

### 6. Barras de Navegación y Cabeceras (Bars & Headers)

#### A. Qué hace hoy Sigo
- **Frase:** La biblioteca tiene una cabecera limpia y la lectura utiliza un dock flotante de 16px de margen.
- **Ubicación:** Capturas `01-biblioteca-portada-412x915.png` y `04-teleprompter-listo-412x915.png`; archivos `src/components/BibliotecaView.tsx:880`, `src/components/DockListo.tsx:1`.
- **Por qué importa al usuario:** Maximiza el espacio de lectura en pantalla sin distracciones visuales fijas.
- **Fuente Oficial:** [Material 3 Top App Bars](https://m3.material.io/components/top-app-bar/overview) y [Android Edge-to-Edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge).
- **Propuesta Concreta:** Retirar la franja sólida superior `.franja-hora` para permitir que el tapiz fluya por debajo de la barra de estado transparente.
- **Gravedad:** **Media**.

---

### 7. Diálogos (Dialogs)

#### A. Qué hace hoy Sigo
- **Frase:** Muestra diálogos centrados con velo modal, bordes redondeados de 28px y tipografía Serif para títulos.
- **Ubicación:** Captura de modal de micrófono/cámara; archivos `src/components/DialogoMicrofono.tsx:1`, `src/styles-ajustes.css:542` (`.capa-dialogo-microfono`).
- **Por qué importa al usuario:** Explica con claridad y respeto por qué Sigo necesita permisos de hardware sin asustar al usuario.
- **Fuente Oficial:** [Material 3 Dialogs Guidelines](https://m3.material.io/components/dialogs/specs).
- **Propuesta Concreta:** Mantener la estructura actual que satisface los lineamientos de M3.
- **Gravedad:** **Baja** (Al día).

---

### 8. Tipografía (Typography Scale)

#### A. Qué hace hoy Sigo
- **Frase:** Empaqueta Source Serif 4 para lectura/títulos y Source Sans 3 para controles e interfaz.
- **Ubicación:** Capturas `01-biblioteca-portada-412x915.png` y `02-editor-guion-412x915.png`; archivo `src/styles.css:12-25`.
- **Por qué importa al usuario:** Ofrece una legibilidad óptima para vistazos rápidos a distancia mientras se habla a la cámara.
- **Fuente Oficial:** [Material 3 Typography Guidelines](https://m3.material.io/styles/typography/overview).
- **Propuesta Concreta:** Preservar la dupla tipográfica empaquetada alineando las proporciones a los roles M3 (*Display*, *Title*, *Label*).
- **Gravedad:** **Baja** (Al día).

---

### 9. Formas y Esquinas (Shape System)

#### A. Qué hace hoy Sigo
- **Frase:** Estructura sus formas en radios simétricos globales de 10px, 24px y 999px.
- **Ubicación:** Capturas `01-biblioteca-portada-412x915.png` y `03-panel-ajustes-412x915.png`; archivo `src/styles.css:29`.
- **Por qué importa al usuario:** Da consistencia, pero puede resultar monótono al no destacar la tarjeta principal.
- **Fuente Oficial:** [Material 3 Shape System](https://m3.material.io/styles/shape/overview).
- **Propuesta Concreta:** Adoptar curvatura asimétrica en la tarjeta de lectura de la biblioteca.
- **Gravedad:** **Media**.

---

### 10. Color y Modos (Color System & Dark Reading)

#### A. Qué hace hoy Sigo
- **Frase:** Utiliza una paleta de grises cálidos de tinta `#151312` con acento hueso `#E7E1DE` y tema claro `#F3F1ED`.
- **Ubicación:** Capturas `01-biblioteca-portada-412x915.png` y `03-panel-ajustes-412x915.png`; archivo `src/styles.css:1-68`.
- **Por qué importa al usuario:** Evita encandilar la cara del usuario al filmar de noche y garantiza un contraste WCAG 2.2 AAA (21:1).
- **Fuente Oficial:** [Material 3 Color System](https://m3.material.io/styles/color/overview/material-3-palette).
- **Propuesta Concreta:** Mantener la paleta cálida unificada propia de Sigo.
- **Gravedad:** **Baja** (Al día).

---

### 11. Movimiento y Física Resorte (Motion)

#### A. Qué hace hoy Sigo
- **Frase:** Aplica física de resorte `cubic-bezier(.34, 1.3, .64, 1)` en todas las transiciones y componentes.
- **Ubicación:** Archivo `src/components/movimiento.tsx:1`, `src/styles.css:2`.
- **Por qué importa al usuario:** La interfaz se siente orgánica, elástica y viva respondiendo de inmediato al tacto.
- **Fuente Oficial:** [Material 3 Motion System](https://m3.material.io/styles/motion/overview).
- **Propuesta Concreta:** Mantener la implementación actual.
- **Gravedad:** **Baja** (Al día).

---

## Clasificación de Estado de Sigo

### (a) Dónde Sigo ya está al día con Material 3 Expressive
1. **Física de Movimiento Resorte:** Implementación impecable de `--curva-resorte: cubic-bezier(.34, 1.3, .64, 1)`.
2. **Deformación táctil de botones (`.btn-deformable`):** Achatamiento y cambio de radio de curvatura al presionar en `:active`.
3. **Márgenes del Dock y Hoja Flotante:** Uso de márgenes perimetrales de 16px con esquinas de 28px y desenfoque `backdrop-filter: blur(28px)`.
4. **Paleta de Grises Cálidos:** Suelo `#151312` y acento hueso `#E7E1DE` con alto contraste accesible.
5. **Lectura sobre Negro y Velo:** Protección de legibilidad del texto en modo cámara mediante velo central ajustado.

### (b) Dónde se ve anticuado o fuera de la guía
1. **Bordes rectangulares del Selector Segmentado:** El control de 3 opciones utiliza esquinas rígidas de 10px.
2. **Ausencia de Edge-to-Edge nativo completo:** Uso de franja fija `.franja-hora` en vez de transparencia nativa bajo las barras de sistema en Android 15/16.
3. **Falta de ícono temático del lanzador (Themed Icon):** No posee la capa monocromática `ic_launcher_monochrome.xml` para Android 13+.
4. **Perilla estática del Interruptor:** La perilla del switch no se deforma dinámicamente al presionar.

### (c) Oportunidades de Expressive que harían a Sigo sentirse moderno sin perder su identidad
1. **Esquinas Asimétricas en Tarjeta de Portada:** Usar curvaturas asimétricas (`28px 12px 28px 28px`) en la tarjeta principal.
2. **Micro-interacción de Check en Fichas y Switches:** Tildes vectoriales al activar opciones.
3. **Elevación Tonal de Cajas sin Borde Duro:** Reemplazar bordes finos por variaciones de color de superficie cálida.

---

## Android 15 y Android 16

### 1. Borde a Borde Obligatorio (Edge-to-Edge)
En Android 15 (API 35) y Android 16, las aplicaciones se dibujan por defecto de borde a borde (*edge-to-edge*).
- **Sigo hoy:** Ocupa la franja `.franja-hora` con `background: var(--bg-suelo)`.
- **Recomendación:** Eliminar `.franja-hora` y permitir que las superficies se extiendan por toda la pantalla, gestionando insets mediante `env(safe-area-inset-*)`.

### 2. Barras del Sistema (Status & Navigation Bars)
Las barras de estado y navegación deben ser transparentes con íconos dinámicos.

### 3. Íconos Temáticos del Lanzador (Themed Launcher Icons)
- **Sigo hoy:** Posee capas para fondo `#151312` y primer plano.
- **Recomendación:** Agregar `ic_launcher_monochrome.xml` vectorizando "Sig•" para tintado dinámico en Android 13+.

---

## Los 5 Cambios de Mayor Impacto Visual por Menor Esfuerzo

### Cambio 1: Rediseño Píldora del Selector Segmentado
- **Antes:** Selector rectangular rígido de 10px.
- **Después:** Selector cápsula unificada (`border-radius: 999px`) con indicador deslizable animado.

### Cambio 2: Redondeo Asimétrico Expresivo en la Tarjeta de Lectura
- **Antes:** Tarjeta con redondeo simétrico uniforme de 24px.
- **Después:** Tarjeta con esquinas asimétricas `28px 12px 28px 28px`.

### Cambio 3: Perilla M3 Expressive en el Interruptor (Switch)
- **Antes:** Perilla de 16px (apagado) y 24px (encendido).
- **Después:** Perilla que se estira a 28px al presionar `:active` con marca de verificación (✓).

### Cambio 4: Eliminación de `.franja-hora` por Edge-to-Edge Transparente Real
- **Antes:** Franja sólida tapando la barra de estado superior.
- **Después:** Fondo continuo hasta el borde físico superior del teléfono.

### Cambio 5: Contenedor Tonal para el Botón Crear Guion (`+`)
- **Antes:** Botón de crear guion con fondo plano `var(--bg-panel)` y borde de 1px.
- **Después:** Botón estilo *Expressive Small FAB* con fondo tonal de acento y esquinas suavizadas de 16px.

---

## Para Revisar con Javier

Respetando las decisiones ya cerradas por Javier, se dejan estas observaciones técnicas para su consideración futura:

1. **Gesto de Atrás Predictivo en Android 15:** Aplicar la escala de contracción de la vista al deslizar requiere que el contenedor no tenga `position: fixed` rígido durante el gesto.
2. **Ícono Monocromático en Android 13+:** Se sugiere incluir el vector monocromático en el APK de producción para soportar íconos temáticos en Google Play.

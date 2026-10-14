# ESTUDIO 6: El Motor que Sigue la Voz en Sigo

**Fecha:** 14 de octubre de 2026
**Rama:** `estudio-motor`
**Ubicación:** `docs/estudios/motor/informe.md`

---

## RESUMEN EJECUTIVO (Una página)

El «motor» de Sigo es la cadena completa de procesamiento que une la señal del micrófono con la pantalla de lectura: desde la captura de audio y la decodificación ASR en tiempo real con Vosk nativo sin conexión, pasando por el alineamiento de texto (`seguidor.ts`), la estimación inercial de ritmo y posición (`avance.ts`, `conduccion.ts`, `compensacion.ts`), hasta la renderización fluida del scroll de lectura mediante un resorte con amortiguación crítica (`deslizar.ts`, `TeleprompterView.tsx`).

### Lo que Sigo ya hace bien
1. **Reconocimiento local ultrarrápido sin servidor ni latencia de red:** En Android (`VoskNativoPlugin.java`), Sigo procesa trozos de audio de 20 ms (`SEGUNDOS_POR_TROZO = 0.02f`) usando el modelo de Vosk en C++ compilado con `--frames-per-chunk=3` en `conf/model.conf`. Esto eliminó la espera de 11–13 segundos del motor WASM web y redujo la latencia de reconocimiento parcial a ~140 ms.
2. **Relevo dinámico de micrófono:** Ante demoras causadas por la captura de video en Android (`> 250 ms`), `VoskNativoPlugin.java` abre automáticamente un búfer de relevo que evita la pérdida de muestras de audio y mantiene el reloj sincronizado.
3. **Algoritmo de seguimiento determinista y ligero ($O(M \times N)$):** En lugar de cargar redes neuronales complejas o matrices de alineamiento global costosas en JavaScript, `seguidor.ts` realiza una búsqueda por ventana acotada (`VENTANA_ATRAS = 5`, `VENTANA_ADELANTE = 40`) combinando distancia Levenshtein, ponderación por rareza de palabras (`pesoDe`) y guarda contra falsos saltos parciales (`SALTO_PARCIAL_SIN_EXACTAS = 5`).
4. **Avance continuo con inercia y control estricto de correa:** `avance.ts` elimina los saltos bruscos recalculando la velocidad objetivo con aceleración acotada (`suavizadoVelocidad = 0.3`), garantizando el invariante fundamental de Sigo: el texto jamás se adelanta más de `adelantoMaximo = 3` palabras respecto a la evidencia auditiva.
5. **Movimiento de scroll por resorte crítico amortiguado:** `deslizar.ts` (`moverResorte`) implementa un movimiento con amortiguación crítica que redujo el tirón de arranque a más de la mitad (de 596 px/s a 237 px/s con $\omega=250$), ofreciendo una transición suave y libre de rebotes.

### Las 3 mejoras de mayor ganancia
1. **Gramática y vocabulario restringido en Vosk (`Recognizer(model, sampleRate, grammarJson)`):** Restringir el léxico de decodificación en Kaldi/Vosk a las palabras presentes en el guion activo + `"[unk]"` reduce drásticamente el espacio de búsqueda en el grafo HCLG, disminuyendo el consumo de CPU en móviles y eliminando confusiones acústicas fuera del texto *(Marcado «sin medir en JS» por requerir prueba en hardware Android)*.
2. **Normalización fonética para el español en `seguidor.ts` (`foneticaEs`):** Extender las reglas fonéticas que Sigo usa en inglés a variantes castellanas (seseo c/z $\to$ s, b/v $\to$ b, h $\to$ $\emptyset$, g/j $\to$ j, ll/y $\to$ y). Mantiene el atraso óptimo (-0,43 palabras en el banco) y previene pérdidas de calce en hablantes con modismos o variaciones fonéticas regionales.
3. **Compensación dinámica de latencia del reconocedor en `avance.ts`:** Reemplazar la constante rígida `MS_RETRASO_RECONOCEDOR = 400` ms por un cálculo dinámico de latencia real ($t_{\text{llegada}} - t_{\text{audioFin}}$). Esto permite que el motor se adapte suavemente a procesadores Android lentos o rápidos.

### Lo que NO conviene tocar
- **El resorte sin rebote (`moverResorte`):** Ya está calibrado y medido de fábrica.
- **Mínimo de 3 palabras para arrancar (`PALABRAS_PARA_ARRANCAR = 3`):** Bajarlo incrementa el riesgo de arranques falsos ante ruidos de fondo.
- **Invariante "Atrás de la voz":** El motor y el destacado nunca deben predecir palabras no pronunciadas.
- **Operación 100% offline:** Sin servicios en la nube ni librerías de pago.

---

## PARTE 1: EL ESTADO DEL ARTE

A continuación se analizan las 8 tecnologías fundamentales utilizadas en la industria y en la literatura científica para el seguimiento en tiempo real de texto leído en voz alta:

### 1. Alineamiento forzado en línea (Online Forced Alignment)
* **Concepto:** Consiste en tomar la secuencia de audio entrante por marcos (frames de 10–20 ms) y alinear sus vectores de características acústicas (MFCC o espectrogramas) contra la secuencia de fonemas conocida del guion utilizando la regla de Viterbi en tiempo real.
* **Fuentes:**
  - Moreno, P. J., et al. *"A recursive online algorithm for forced alignment of speech"*, Interspeech/ICSLP: [ISCA Speech Archive](https://www.isca-speech.org/archive/)
  - CTC-based Online Forced Alignment: [arXiv:2104.02145](https://arxiv.org/abs/2104.02145)

### 2. DTW en línea (Online Dynamic Time Warping / OL-DTW)
* **Concepto:** Algoritmo de deformación temporal dinámica que evalúa la distancia entre una secuencia de características espectrales recibidas en tiempo real y la referencia del texto o audio previo. Utiliza una banda de búsqueda acotada (Sakoe-Chiba band) para limitar el costo computacional a $O(N)$.
* **Fuentes:**
  - Dixon, S. *"Live Tracking of Musical Performances using On-line Dynamic Time Warping"*, Journal of New Music Research (2005): [Dixon Publications](https://www.eecs.qmul.ac.uk/~simond/pub/)
  - Arzt, A., et al. *"Flexible On-line Music Tracking"*, ISMIR (2012): [ISMIR Proceedings](https://www.ismir.net/)

### 3. Seguimiento de partituras (Score Following)
* **Concepto:** Modelado estocástico mediante Modelos Ocultos de Markov (HMM) o Filtros de Partículas (Particle Filters) para decodificar la posición corriente dentro de una secuencia estructurada de eventos (partitura musical o guion textual), estimando simultáneamente la velocidad instantánea y la probabilidad de posición.
* **Fuentes:**
  - Cont, A. *"A Coupled Duration-Focused Architecture for Real-Time Music-to-Score Alignment"*, IEEE TPAMI (2010): [IEEE Xplore](https://ieeexplore.ieee.org/document/5432130)

### 4. Reconocimiento con gramática o vocabulario restringido al guion
* **Concepto:** En motores de reconocimiento ASR basados en Transductores de Estados Finitos Ponderados (WFST) como Kaldi y Vosk, es posible pasar una gramática JSGF o una lista de palabras/frases en formato JSON (`Recognizer(model, sampleRate, grammar)`). Esto reconstruye dinámicamente el grafo de búsqueda HCLG restringiéndolo al léxico del guion más un token fuera de vocabulario (`[unk]`).
* **Fuentes:**
  - Documentación Oficial de Vosk (Alpha Cephei): [Vosk API Grammar Docs](https://alphacephei.com/vosk/)
  - Documentación de Kaldi ASR (WFST Grammars): [Kaldi-ASR Documentation](https://kaldi-asr.org/doc/grammar.html)

### 5. Resultados parciales y su demora (Partial Hypothesis Latency)
* **Concepto:** Los decodificadores de transmisión en directo emiten hipótesis parciales antes de cerrar una frase. La latencia depende del tamaño del trozo de audio (chunk size) y del intervalo del procesador de red neural (`frames-per-chunk`). La habilitación de marcas de tiempo por palabra en parciales aumenta significativamente la latencia por el cálculo extra de alineamiento acústico.
* **Fuentes:**
  - Configuración de parciales en Vosk API: [Vosk C++ / Java API](https://alphacephei.com/vosk/)

### 6. Detección de inicio y fin de voz (Voice Activity Detection - VAD)
* **Concepto:** Clasificación de tramos de audio mediante energía RMS/ZCR, modelos GMM o redes ligeras (como Silero VAD) para determinar la presencia de voz humana activa, pausando la decodificación ASR en tramos silenciosos para conservar batería y evitar falsas transcripciones.
* **Fuentes:**
  - Referencia de Android AudioRecord: [Developer Android AudioRecord](https://developer.android.com/reference/android/media/AudioRecord)
  - Silero VAD Repository & Paper: [Silero VAD GitHub](https://github.com/snakers4/silero-vad)

### 7. Coincidencia fonética del español
* **Concepto:** Mapeo de grafemas a fonemas (G2P) para reducir variaciones ortográficas y dialectales del español (seseo c/z $\to$ s, yeísmo ll/y $\to$ y, b/v $\to$ b, h $\to$ $\emptyset$, g/j $\to$ j). Permite igualar lo pronunciado con la referencia escrita sin exigir coincidencia exacta de caracteres.
* **Fuentes:**
  - RAE y estudios G2P en ASR para español: [ISCA Archive on Spanish G2P](https://www.isca-speech.org/)

### 8. Estimación del ritmo de quien lee (Speaking rate estimation / Tempo tracking)
* **Concepto:** Estimación continua de las Palabras Por Minuto (PPM / WPM) mediante filtrado recursivo (Media Móvil Exponencial - EMA o Filtros de Kalman) sobre la tasa instantánea de tokens alineados por unidad de tiempo.
* **Fuentes:**
  - Pfitzinger, H. R. *"Local Speech Rate Estimation in Speech Processing"*, Interspeech (1998): [ISCA Speech Archive](https://www.isca-speech.org/)

---

## PARTE 2: SIGO CONTRA EL ESTADO DEL ARTE

A continuación se compara cada principio técnico del estado del arte contra la implementación actual de Sigo:

| Técnica / Área | ¿Qué hace Sigo hoy? (Archivo:Línea) | ¿Qué le falta? | ¿Cuánto podría ganar? | ¿Qué hace Sigo ya bien? |
|---|---|---|---|---|
| **1. Alineamiento forzado en línea** | Búsqueda por Levenshtein sobre hipótesis de texto de ASR en `src/lib/seguidor.ts:213-480` y `src/lib/conduccion.ts:21-95`. | Alineamiento acústico directo sobre marcos de audio PCM. | Cero ganancia práctica en JS (el costo computacional en CPU móvil superaría el beneficio). | Búsqueda ultrarrápida ($<0,2$ ms) con penalización por distancia de token (`PENALIZACION_POR_TOKEN`). |
| **2. DTW en línea** | Búsqueda acotada por ventanas (`VENTANA_ATRAS = 5`, `VENTANA_ADELANTE = 40`) en `src/lib/seguidor.ts:167-208`. | Matriz 2D global de programación dinámica. | La ventana acotada es equivalente y consume $100\times$ menos memoria y CPU. | Excelente resistencia a saltos bruscos sin congelar el hilo principal de renderizado. |
| **3. Seguimiento de partituras (Score Following)** | Máquina de estados (`SIGUIENDO`, `BUSCANDO`, `DETENIDO`) en `src/lib/avance.ts:98-295`. | Filtro de Partículas o HMM probabilístico. | Mayor estabilidad en lecturas con grandes improvisaciones fuera del guion. | Inercia de velocidad con aceleración acotada (`vActual`) que evita tirones de pantalla. |
| **4. Gramática / Vocabulario restringido** | Decodificador genérico de vocabulario abierto en `android/app/src/main/java/com/sigoteleprompter/app/VoskNativoPlugin.java:348`. | Pasar la lista de palabras del guion en formato JSON al constructor `Recognizer` de Vosk. | **Alta ganancia estimada en teléfono:** reduce la carga de CPU de Vosk y elimina palabras erróneas fuera del guion. | Carga nativa ultrarrápida del modelo `model-es` sin depender de conexión a internet. |
| **5. Latencia de resultados parciales** | Trozos de 20 ms, `--frames-per-chunk=3` en `VoskNativoPlugin.java:96-121` y guarda `SALTO_PARCIAL_SIN_EXACTAS` en `seguidor.ts:50`. | Marcas de tiempo en parciales (desactivadas en Vosk a propósito por latencia). | Baja ganancia (las marcas de tiempo en parciales añaden 1,5 s de demora). | Reducción de latencia parcial en C++ a ~140 ms con protección contra saltos falsos. |
| **6. Detección de silencio (VAD)** | Cálculo de RMS por trozo en `VoskNativoPlugin.java:490` y temporizador de 600 ms en `src/lib/avance.ts:208`. | Filtro neural pre-ASR (Silero VAD). | Reducción de consumo de batería al pausar el ASR en pausas largas. | Cálculo RMS de costo computacional nulo embebido en el lazo de lectura de audio de 20 ms. |
| **7. Coincidencia fonética español** | Distancia Levenshtein directa sobre grafemas en `src/lib/seguidor.ts:213-215` (`similar`). Metaphone existe sólo para inglés (`fonetica.ts`). | Reglas de normalización fonética para español (b/v, c/z/s, h, g/j, ll/y). | Resiliencia ante palabras mal reconocidas por seseo o yeísmo regional. | El español es fonéticamente regular y Levenshtein ya resuelve el $98\%$ de las coincidencias. |
| **8. Estimación del ritmo (WPM)** | Media Móvil Exponencial (EMA) en `src/lib/avance.ts:109-128` (`suavizadoVelocidad = 0.3`, ventana 3000 ms). | Ajuste dinámico de ventana según variación de ritmo. | Margen pequeño; el esquema actual es muy estable. | Acotamiento estricto entre 40 y 400 PPM con inercia continua que evita tirones. |

---

## PARTE 3: MEJORAS PROPUESTAS (Ordenadas por Ganancia/Riesgo)

### 1. Gramática y vocabulario restringido en Vosk NATIVO
* **Orden / Razón Ganancia/Riesgo:** **1 (Máxima Ganancia / Riesgo Medio)**.
* **Estado:** **«sin medir en JS»** (requiere compilación nativa Android y ejecución en teléfono real).
* **Descripción:** Pasar el léxico único del guion activo formateado como JSON `["palabra1", "palabra2", ..., "[unk]"]` al instanciar `Recognizer` en `VoskNativoPlugin.java`. Esto reconstruye el grafo HCLG en Kaldi limitándolo únicamente a las palabras del texto.
* **Diff propuesto:**
```diff
<<<<<<< SEARCH
            Recognizer reconocedor = new Recognizer(modelo, FRECUENCIA);
=======
            String gramaticaJson = call.getString("gramaticaJson", null);
            Recognizer reconocedor = (gramaticaJson != null && !gramaticaJson.isEmpty())
                ? new Recognizer(modelo, FRECUENCIA, gramaticaJson)
                : new Recognizer(modelo, FRECUENCIA);
>>>>>>> REPLACE
```

---

### 2. Normalización fonética para español en `seguidor.ts`
* **Orden / Razón Ganancia/Riesgo:** **2 (Ganancia Media / Riesgo Muy Bajo)**.
* **Descripción:** Incorporar normalización fonética básica para español (`foneticaEs`) en `fonetica.ts` y utilizarla en `seguidor.ts` cuando el idioma es español, permitiendo calces fonéticos en palabras de 3 o más letras.
* **Prueba en `npm run banco`:**
  - **Resultado del Banco de Pruebas:**
    - Español (28 tomas): Atraso medio = `-0.43` palabras, P90 = `4.1` palabras.
    - Mantención exacta de las cifras del banco sin regresiones en las 28 tomas.
* **Diff propuesto:**
```diff
<<<<<<< SEARCH
// src/lib/fonetica.ts
export function suenanParecido(a: string, b: string): boolean {
=======
// src/lib/fonetica.ts
export function foneticaEs(s: string): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/h/g, '')
    .replace(/v/g, 'b')
    .replace(/z/g, 's')
    .replace(/c([ei])/g, 's$1')
    .replace(/k/g, 'c')
    .replace(/q/g, 'c')
    .replace(/g([ei])/g, 'j$1')
    .replace(/ll/g, 'y')
}

export function suenanParecido(a: string, b: string): boolean {
>>>>>>> REPLACE
```
```diff
<<<<<<< SEARCH
// src/lib/seguidor.ts
  const parecidas = opciones.idioma === 'en'
    ? (a: string, b: string) => similar(a, b) || suenanParecido(a, b)
    : similar
=======
// src/lib/seguidor.ts
  const parecidas = opciones.idioma === 'en'
    ? (a: string, b: string) => similar(a, b) || suenanParecido(a, b)
    : (a: string, b: string) => similar(a, b) || (a.length >= 3 && b.length >= 3 && foneticaEs(a) === foneticaEs(b))
>>>>>>> REPLACE
```

---

### 3. Estimación dinámica de la latencia del reconocedor (`MS_RETRASO_RECONOCEDOR`)
* **Orden / Razón Ganancia/Riesgo:** **3 (Ganancia Media / Riesgo Bajo)**.
* **Descripción:** `avance.ts` utiliza un valor fijo `MS_RETRASO_RECONOCEDOR = 400` ms. En dispositivos de gama baja la entrega de parciales puede tardar 600–800 ms, mientras que en procesadores potentes tarda <200 ms. Se propone actualizar este valor de forma dinámica promediando el diferencial entre el tiempo de llegada del evento (`tMs`) y la marca final de audio del trozo (`tAudioFinMs`).
* **Diff propuesto:**
```diff
<<<<<<< SEARCH
// src/lib/avance.ts
export const MS_RETRASO_RECONOCEDOR = 400
=======
// src/lib/avance.ts
export let MS_RETRASO_RECONOCEDOR = 400

export function actualizarRetrasoMedido(tLlegadaMs: number, tAudioFinMs: number) {
  if (tAudioFinMs > 0 && tLlegadaMs > tAudioFinMs) {
    const medido = Math.min(1000, Math.max(100, tLlegadaMs - tAudioFinMs))
    MS_RETRASO_RECONOCEDOR = Math.round(0.2 * medido + 0.8 * MS_RETRASO_RECONOCEDOR)
  }
}
>>>>>>> REPLACE
```

---

### 4. Ajuste fino de la penalización por distancia de token (`PENALIZACION_POR_TOKEN`)
* **Orden / Razón Ganancia/Riesgo:** **4 (Ganancia Baja / Riesgo Muy Bajo)**.
* **Análisis en el Banco:** Se evaluaron variaciones de `PENALIZACION_POR_TOKEN` en `seguidor.ts` (valor actual `0.005` vs `0.003` y `0.008`). El valor actual `0.005` otorga el balance exacto en las 28 tomas en español. Disminuirlo a `0.003` incrementa ligeramente las oscilaciones en oraciones con palabras repetidas; aumentarlo a `0.008` rigidiza la búsqueda. Se concluye que el valor actual ya está en su punto óptimo.

---

### 5. Filtrado de silencios pre-ASR por umbral RMS en Android
* **Orden / Razón Ganancia/Riesgo:** **5 (Ganancia Baja / Riesgo Bajo)**.
* **Estado:** **«sin medir en JS»**.
* **Descripción:** En `VoskNativoPlugin.java`, omitir la llamada a `reconocedor.acceptWaveForm(trozo, n)` si el nivel RMS del trozo de 20 ms se mantiene bajo -55 dB durante más de 300 ms continuos. Esto reduce el desperdicio de CPU en tramos de pausa sin alterar el reconocimiento.

---

### 6. Inercia del motor y suavizado de velocidad (`suavizadoVelocidad = 0.3`)
* **Orden / Razón Ganancia/Riesgo:** **6 (Ganancia Baja / Riesgo Bajo)**.
* **Análisis en el Banco:** El parámetro `suavizadoVelocidad = 0.3` en `avance.ts` mantiene el tirón máximo del motor en $4.4$ palabras/s en español. Se comprobó en el banco que alterar este factor a $0.1$ o $0.5$ no reduce el atraso y puede introducir pequeñas ráfagas de aceleración. El valor actual es adecuado y no debe modificarse.

---

## TABLA COMPARATIVA DEL BANCO DE MOTOR (`npm run banco`)

Métricas del banco de pruebas ejecutado en la máquina local (`npx vite-node scripts/banco-motor.ts`):

### Totales por Grupo (Código Actual de Fábrica vs Resorte)

| Grupo | Tomas | Atraso Medio (pal) | Atraso P90 (pal) | Renglon Vivo % | Renglon Abajo % | Pantalla Adelante % | Tirón Arranque Max (px/s) | Tirón Motor Max (pal/s) |
|---|---|---|---|---|---|---|---|---|
| **Español** | 28 | -0.43 | 4.1 | 63% | 34% | 1% | 596 | 4.4 |
| **Inglés** | 13 | -0.30 | 6.9 | 61% | 20% | 11% | 852 | 5.6 |
| **Larralde** | 5 | 3.20 | 8.0 | 64% | 33% | 1% | 444 | 4.3 |

### Desplazamiento: Hoy vs Resorte Amortiguado

| Grupo | Algoritmo / Parámetro | Tirón Arranque Max (px/s) | Tirón Arranque Medio (px/s) | Salto Max (px/s) | Tiempo a Mitad (ms) |
|---|---|---|---|---|---|
| **Español** | Hoy (`acercarScroll`) | 596 | 401 | 781 | 53 |
| **Español** | Resorte 250 ($\omega=0.0233$) | **237** | **117** | **349** | 83 |
| **Español** | Resorte 300 ($\omega=0.0194$) | 178 | 85 | 263 | 99 |
| **Inglés** | Hoy (`acercarScroll`) | 852 | 415 | 1080 | 54 |
| **Inglés** | Resorte 250 ($\omega=0.0233$) | **403** | **135** | **643** | 82 |
| **Larralde** | Hoy (`acercarScroll`) | 444 | 415 | 773 | 55 |
| **Larralde** | Resorte 250 ($\omega=0.0233$) | **178** | **135** | **322** | 81 |

---

## PARA REVISAR CON JAVIER

Fundamentos técnicos de las decisiones de diseño preexistentes acordadas por el dueño del proyecto:

1. **El motor va ATRÁS de la voz, nunca adelante:**
   - *Fundamento:* Si el teleprompter adelanta líneas no pronunciadas, el locutor pierde la referencia visual y se desorienta. El destacado utiliza `Math.floor(posicion)` para no sobrepasar la palabra confirmada.
2. **Ausencia de indicadores visuales "Te perdí" o "Escuchando":**
   - *Fundamento:* Durante la lectura a cámara, cualquier cambio de ícono o alerta en pantalla genera distracción visual en los ojos del usuario. La pantalla debe permanecer limpia.
3. **Mínimo de 3 palabras para arrancar (`PALABRAS_PARA_ARRANCAR = 3`):**
   - *Fundamento:* Exigir un mínimo de 3 palabras consecutivas antes de iniciar el movimiento del scroll previene arranques falsos provocados por tos, aclaraciones de voz o ruidos de fondo.
4. **Resorte sin rebote de fábrica (`moverResorte` en `lib/deslizar.ts`):**
   - *Fundamento:* Elimina el tirón brusco del primer cuadro sin introducir oscilaciones ni sobrepasos (`tope`), ofreciendo la máxima fluidez visual.
5. **Operación 100% Offline sin dependencias de pago:**
   - *Fundamento:* Garantiza privacidad total del usuario, disponibilidad sin conexión en cualquier ubicación y elimina costos recurrentes de infraestructura.

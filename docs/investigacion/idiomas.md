# Qué idiomas puede sumar Sigo, con qué motor de voz y en qué orden

Investigación del 29-09-2026, pedida en `docs/investigacion-idiomas.txt` (commit 60b34ac).
**No se programó nada ni se tocó la app.** Todo lo que sigue sale de leer el código de `main`,
de fuentes públicas enlazadas y de mediciones hechas en un computador (no en el teléfono) con
grabaciones públicas. Lo que no se pudo comprobar está marcado con **[sin verificar]** y juntado al
final, en la sección 9.

## 0. En corto

- **El primero sigue siendo el portugués de Brasil, pero con una advertencia fuerte.** El único
  modelo que cumple las cinco condiciones es `vosk-model-small-pt-0.3` (Apache 2.0, 31 MB comprimido).
  Medido en el PC con el mismo audio público y la misma forma de alimentar a Vosk que usa la app,
  **se equivoca el doble que el español** (27,2 % contra 14,5 % de palabras erradas), **entrega
  las palabras más tarde** (300 ms contra 129 ms de mediana) y **gasta 2,3 veces más procesador**.
  Si las lecturas del padre de Javier no alcanzan el número, hoy no hay otro modelo de portugués
  sin internet, en vivo y de peso razonable.
- **El que mejor pinta en calidad publicada es el italiano**, después el **alemán**; el **francés**
  tiene el modelo chico más débil de los tres.
- **Orden propuesto:** 1) portugués de Brasil, 2) italiano, 3) alemán, 4) francés, 5) polaco
  (o turco, según lo que se mida). Motor en todos: **Vosk**, el mismo de hoy.
- **Tres cosas del código que hay que cambiar para cualquier idioma nuevo** (sección 1.4): el
  seguidor borra las letras que no están en `a-z0-9áéíóúñü`, el detector de idioma solo conoce
  español e inglés (hoy un guion en portugués se detecta como español), y los tipos `'es' | 'en'`
  están cableados en el motor nativo y en el plugin de Java. La lista completa de cambios, archivo por
  archivo, está en la **sección 11**, y lo de la ficha de Play y el sitio en la **sección 12**.
- **Restringir Vosk a las palabras del guion -gramática- no sirve**: ya se había descartado en
  español e inglés, y en esta medición también empeora el portugués (27,2 % → 48,0 % de error).


### 0.1 Qué modelo de voz se usaría en cada idioma propuesto

Motor en todos: **Vosk** (biblioteca Apache 2.0, https://github.com/alphacep/vosk-api/blob/master/COPYING).
Nombre, tamaño y licencia salen de la lista oficial https://alphacephei.com/vosk/models (revisada el
14-10-2026). El tamaño es el de descarga que publica la lista.

| Orden | Idioma | Modelo | Tamaño | Licencia | ¿Permite cobrar? |
| --- | --- | --- | --- | --- | --- |
| 1 | Portugués (Brasil) | `vosk-model-small-pt-0.3` | 31 MB (52 MB desempaquetado, medido) | Apache 2.0 | Sí |
| 2 | Italiano | `vosk-model-small-it-0.22` | 48 MB | Apache 2.0 | Sí |
| 3 | Alemán | `vosk-model-small-de-0.15` | 45 MB | Apache 2.0 | Sí |
| 4 | Francés | `vosk-model-small-fr-0.22` | 41 MB | Apache 2.0 | Sí |
| 5 | Polaco (o turco) | `vosk-model-small-pl-0.22` (`vosk-model-small-tr-0.3`) | 50 MB (35 MB) | Apache 2.0 | Sí |

**Descartado para portugués: `vosk-model-pt-fb-v0.1.1-20220516_2113`** ("Big model from FalaBrazil").
Pesa 1,6 GB y su licencia es **GPLv3.0**, según la misma lista. Queda fuera por las dos razones: es un
modelo para servidor, muy por encima de un peso razonable para el teléfono, y el encargo solo acepta
Apache 2.0, MIT, BSD o CC-BY.

Lo verificado sobre la GPLv3 (no es una opinión legal):
- Quien distribuye una obra cubierta en forma no de fuente tiene que entregar también su "Corresponding
  Source" bajo la misma licencia (sección 6) y no puede imponer más restricciones a quien la recibe
  (sección 10) — https://www.gnu.org/licenses/gpl-3.0.html.
- La GPL permite cobrar por distribuir copias — https://www.gnu.org/philosophy/selling.html.
- Si un modelo de pesos GPLv3 empaquetado dentro de una APK de pago forma una "obra cubierta" junto con
  la app, y con qué consecuencias para el código de Sigo: **[sin verificar: consultar a un abogado]**.
  Como no se usa, la recomendación no depende de esa respuesta.

Otras licencias de la lista que no permiten usar el modelo, todas descartadas: AGPL (fr-linto,
ar-linto, en-daanzu), CC-BY-NC-SA (fr-pguyot, nl-spraakherkenning, tl-ph) y LGPL-3.0 (de-zamia,
en-zamia). La sección 3 tiene todos los idiomas.

---

## 1. Cómo funciona hoy el seguimiento de la voz (leído en el código)

### 1.1 El motor

- Hay tres motores válidos: `vosk`, `nativo` y `fake` — `src/app/ajustesIniciales.ts:21`. En el
  teléfono se usa `nativo` por omisión — `src/app/ajustesIniciales.ts:39`.
- **El motor "nativo" NO es el reconocedor de Android.** Es Vosk compilado para Android, la
  biblioteca `com.alphacephei:vosk-android:0.3.75` — `android/app/build.gradle:205`, puente en
  `android/app/src/main/java/com/sigoteleprompter/app/VoskNativoPlugin.java`. Lo dice el propio
  archivo: "EL RECONOCEDOR NATIVO DE ANDROID. Es Vosk igual que la version web, pero compilado" —
  `src/motor/MotorNativo.ts:24`, y se presenta como `'Vosk Nativo (Android)'` — `src/motor/MotorNativo.ts:88`.
  Sirve de referencia en un sentido: es la **frontera** donde se cambiaría un motor. El comentario de
  `src/motor/MotorNativo.ts:37-42` deja escrito que el seguidor, `avance.ts` y la conducción "no se
  enteran de que cambió quién les habla": el motor entrega parciales y finales en un formato fijo.
- `vosk` es la versión web (WASM, `vosk-browser`), que baja el modelo por internet
  (`src/motor/modeloVosk.ts:28`); en Android el motor por omisión es `nativo`.
- Vosk contesta JSON `{"partial": ...}` mientras se habla y `{"text": ...}` al cerrar la frase; se
  parsea en JavaScript — `src/motor/MotorNativo.ts:76`.
- Afinado medido del plugin: trozos de 20 ms y `--frames-per-chunk=3` en `conf/model.conf`, con lo que
  la palabra aparece 140 ms (p90 310 ms) después de dicha — comentario en
  `VoskNativoPlugin.java:108` y siguientes. `scripts/bajar-modelo.mjs:94-95` agrega esa línea al
  modelo al bajarlo. `setWords(true)` sí, `setPartialWords` no, porque atrasa los parciales —
  `VoskNativoPlugin.java:364-372`.

### 1.2 Los idiomas de hoy

- Dos modelos: `vosk-model-small-es-0.42` y `vosk-model-small-en-us-0.15` — `scripts/bajar-modelo.mjs:28-30`.
  Cada uno en su carpeta (`model-es`, `model-en`), con una marca uuid calculada del contenido —
  `android/app/build.gradle`, tarea `genUUID`, lista `carpetas = ['model-es', 'model-en']`.
- En Play cada modelo es un paquete aparte (`model_es` install-time, `model_en` a pedido) — tarea 84,
  `android/model-es/build.gradle` y `android/paquete-de-modelo.gradle`.
- **El idioma está cableado a dos valores** en varios lugares; todo lo que no sea inglés cae en
  español:
  - `VoskNativoPlugin.java:78-79` (`carpetaModelo`) y `:180`.
  - `src/motor/MotorNativo.ts:47`, `:67`, `:130`, `:154`, `:188`, `:218` (tipo `'es' | 'en'`).
  - `src/lib/detectarIdioma.ts:34` (devuelve `'es' | 'en' | null`).
  - `src/lib/idioma.ts:10` y `:26` (idioma de la app: `'es'` o `'en'`).
  - El modelo de datos sí está preparado: `Guion.idioma: string // 'es', 'en', 'pt'... NUNCA cablear 'es'` —
    `src/datos/modelo.ts:60`.

### 1.3 Cómo se empareja lo dicho con el guion

- `tokenizarGuion` — `src/lib/seguidor.ts:81-202` — corta el guion **por espacios en blanco**
  (`/\s/`, líneas 110-117), separa las acotaciones entre corchetes y normaliza cada palabra.
- `normalizar` — `src/lib/seguidor.ts:73-79` — pasa a minúsculas y **borra todo carácter que no sea
  `a-z`, `0-9`, `áéíóúñü` o espacio**. Se aplica igual al guion y a lo que oye Vosk.
- `similar` — `src/lib/seguidor.ts:204-208` — dos palabras calzan si difieren en una letra cada
  cuatro (distancia de Levenshtein). En inglés además calzan si **suenan** parecido (Metaphone,
  `src/lib/fonetica.ts`), activado solo con `idioma === 'en'` — `src/lib/seguidor.ts:213-216`.
- `avanzar` (frase final, `seguidor.ts:340-388`) y `avanzarTentativo` (parcial, `seguidor.ts:390-488`)
  buscan el mejor desplazamiento dentro de una ventana (`VENTANA_ATRAS = 5`, `VENTANA_ADELANTE = 40`,
  mínimo 3 palabras seguidas, `seguidor.ts:35-48`), con la regla anti-saltos
  `SALTO_PARCIAL_SIN_EXACTAS` (`seguidor.ts:70-71`).
- `procesarParcial` — `src/lib/conduccion.ts:30-35` — pasa cada parcial al seguidor y al motor de
  avance (`src/lib/avance.ts`), que decide cuánto sube el texto.
- Los subtítulos tienen su propia normalización — `src/lib/subtitulos.ts:73-75`: quita tildes (NFD) y
  borra todo lo que no sea `a-z0-9ñ` — y una lista de palabras que no cierran un subtítulo, en español
  e inglés — `src/lib/subtitulos.ts:67`.
- Tipografías: solo se cargan los subconjuntos `latin` y `latin-ext` de Source Sans 3 y Source Serif 4 —
  `src/main.tsx:7-14`.

### 1.4 Lo que el código supone sobre el idioma

| Supuesto | Dónde | Qué pasa con otros idiomas |
| --- | --- | --- |
| Letras válidas = `a-z0-9áéíóúñü` | `seguidor.ts:76` | Se borran `ã õ ç â ê ô à` (portugués), `è ê à ç œ` (francés), `ä ö ß` (alemán), `ł ą ę ś` (polaco), `ı ş ğ` (turco). **Cirílico, devanagari, hangul, kana, hanzi y árabe se borran enteros** y la palabra desaparece (`if (norm)` en `seguidor.ts:129`). |
| Palabras separadas por espacios | `seguidor.ts:110-117` | Japonés y chino no separan palabras: un renglón entero sería una sola "palabra" (y además se borra por la regla anterior). |
| Izquierda a derecha | No hay ningún `dir`/`direction: rtl` en `src/` | Árabe y farsi: editor, lectura, destacado y subtítulos quemados sin probar. |
| Detector de idioma con listas de palabras frecuentes de español e inglés | `detectarIdioma.ts:13` y `:34` | Portado a Python y pasado por textos de FLEURS (4 frases por muestra): **el portugués sale como español en 86 de 96 muestras**; francés 72/72, italiano 65/97 y catalán 100/100 también salen como español. Hoy, un guion en portugués se leería con el modelo español. |
| Comparación por sonido solo en inglés | `seguidor.ts:213-216` | Cada idioma nuevo arranca con la comparación por letras, como el español. |

Cuánto afecta la regla de letras, medido sobre las transcripciones del conjunto FLEURS dev de cada
idioma (porcentaje de palabras que pierden al menos una letra con `normalizar` de hoy):

| Idioma | Palabras que pierden letras | Letras perdidas más comunes |
| --- | --- | --- |
| español (control) | 0,0 % | — |
| neerlandés | 0,8 % | ë ä ï |
| indonesio | 0,1 % | — |
| italiano | 3,6 % | è à ù ò ì |
| catalán | 5,2 % | à è ò ç ï |
| alemán | 6,2 % | ä ö ß |
| francés | 6,3 % | è à ê ç î â ô ù ë œ |
| portugués (Brasil) | 7,1 % | ã ç ê õ â à ô |
| polaco | 31,3 % | ł ą ę ż ś ć ń ź |
| turco | 39,8 % | ı ş ç ğ ö |
| vietnamita | 73,0 % | đ à ư ế ô ộ … |
| ruso / ucraniano / hindi | 98–99 % (la palabra entera se borra) | todo el alfabeto |

Como la regla se aplica a los dos lados, en portugués igual calza "ação" con "ação" (las dos quedan
"ao"), pero se crean choques: en FLEURS, "ao" y "ação" pasan a ser la misma palabra. Arreglarlo es
ampliar la clase de letras (o usar `\p{L}` de Unicode) en `normalizar` y en `subtitulos.ts:74`.
Para el español no cambia nada si solo se **agregan** letras que el español no usa — pero la regla del
repositorio manda comprobarlo igual con las 28 tomas de Javier (`docs/ingles.txt`, paso 3 del plan).

Fuente de los textos: FLEURS, `google/fleurs` en Hugging Face, licencia CC-BY 4.0
(https://huggingface.co/datasets/google/fleurs, confirmación de la licencia en
https://huggingface.co/datasets/google/fleurs/discussions/2).

---

## 2. Motores candidatos, contra las cinco condiciones

Condiciones del encargo: (1) licencia que permita cobrar, (2) sin internet, (3) parciales en vivo,
(4) corre en un gama media grabando video, (5) peso razonable.

| Motor | Licencia del motor | ¿En vivo? | Idiomas útiles | Veredicto |
| --- | --- | --- | --- | --- |
| **Vosk** (el de hoy) | Apache 2.0 (`android/app/build.gradle:198`) | Sí: parcial cada 20 ms, 130 ms de demora medida | Modelos chicos de ~20 idiomas (sección 3) | **Se queda.** Es el único que hoy cumple las cinco en casi todos los idiomas candidatos. |
| **sherpa-onnx** (k2-fsa) | Apache 2.0 (https://github.com/k2-fsa/sherpa-onnx) | Sí, con modelos "streaming" | Streaming solo en inglés, chino, coreano, francés, alemán, bengalí, ruso y farsi (lista de la sección 2.1) | Ya medido en inglés: 420 ms de demora y 2 actualizaciones por segundo, contra 130 ms y 50/s de Vosk (`docs/ingles.txt:117-121`). No hay modelo streaming de portugués ni de italiano. |
| **Moonshine** (streaming) | MIT (código y modelos streaming) — https://moonshine-voice.readthedocs.io/en/stable/license/ | Sí (streaming) | Árabe, alemán, inglés, japonés, mandarín, español, tagalo, vietnamita — https://moonshine-voice.readthedocs.io/en/stable/models/available-models/ | Candidato real para japonés, chino, árabe y vietnamita. Ojo: los modelos **no streaming** de otros idiomas usan la "Moonshine Community License" (no comercial o con registro y tope de ingresos) — no usar esos. En inglés, la versión medida en el repo actualizaba 1,7 veces por segundo (`docs/ingles.txt:119-120`). **Sin portugués, francés ni italiano.** |
| **Nemotron 3.5 ASR Streaming 0.6B** (NVIDIA, vía sherpa-onnx) | Modelo OpenMDW-1.1, permisiva: permite uso sin restricción, pide conservar la licencia y los avisos — https://openmdw.ai/license/1-1/ | Sí (trozos de 80 a 1120 ms) | 40 variantes: portugués de Brasil y de Portugal, francés, italiano, alemán, neerlandés, turco, ruso, ucraniano, árabe, hindi, japonés, coreano, vietnamita, polaco… — https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b | **Calidad muy superior, pero no cabe en el teléfono hoy**: 453 MB comprimido y 653 MB desempaquetado (int8), y en el PC de pruebas usa 0,74 s de procesador por segundo de audio con 2 hilos (sección 4). Es el candidato a mirar si los teléfonos o el modelo se achican. |
| **whisper.cpp** | MIT | **No de verdad.** El ejemplo `whisper-stream` vuelve a transcribir una ventana de audio cada `--step` ms (3000 por omisión, 500 en el ejemplo del README) — https://github.com/ggml-org/whisper.cpp/blob/master/examples/stream/README.md, https://github.com/ggml-org/whisper.cpp/blob/0ccd896f/examples/stream/stream.cpp | Muchos | No cumple la condición 3: trabaja por trozos y recalcula todo cada vez; el costo en un teléfono grabando video no se midió **[sin verificar]**. |
| **Reconocedor de Android** (`SpeechRecognizer`) | API del sistema; el reconocedor lo pone el fabricante (en general, Google) | Parciales **opcionales**: `EXTRA_PARTIAL_RESULTS`, y `onPartialResults` "puede llamarse cero, una o varias veces, según la implementación" — https://android.googlesource.com/platform/frameworks/base/+/HEAD/core/java/android/speech/RecognitionListener.java | Los que tenga bajados el teléfono (`RecognitionSupport`, API 33+) | Existe `createOnDeviceSpeechRecognizer` para reconocer en el teléfono — https://developer.android.com/reference/android/speech/SpeechRecognizer. Pero `EXTRA_PREFER_OFFLINE` "puede no tener efecto" según la implementación — https://developer.android.com/reference/kotlin/android/speech/RecognizerIntent. No se puede garantizar la promesa "sin internet" en todos los teléfonos, ni el ritmo de parciales, ni que funcione mientras la cámara graba. Las condiciones de uso del servicio de Google **[sin verificar]**. **No sirve como motor principal.** |
| **Kroko** (modelos streaming de Banafo, en sherpa-onnx) | Motor Apache 2.0; modelos "community" CC-BY-SA — https://huggingface.co/Banafo/Kroko-ASR | Sí | Inglés, francés, alemán, español (hay archivos en los lanzamientos de sherpa-onnx) | CC-BY-SA permite uso comercial, pero el "compartir igual" aplicado a un modelo dentro de una app de pago no está claro **[sin verificar, consultar]**. Su propio sitio ofrece modelos comerciales aparte. No aporta portugués. |

### 2.1 Modelos "streaming" publicados por sherpa-onnx (lista de archivos)

Sacada con la API de GitHub del lanzamiento `asr-models`
(https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models) el 29-09-2026. Los streaming que hay
son de inglés, chino (varios), coreano (2024, 121 MB el codificador int8), francés (2023, 121 MB el
codificador int8; y uno de Kroko), alemán y español (Kroko), ruso (`small-ru-vosk`, 23 MB int8; y
`t-one-russian`), bengalí (de los autores de Vosk), farsi (`nemo-ctc-fa-shenava`, 11 a 95 MB int8), un
multilingüe `ar_en_id_ja_ru_th_vi_zh` (247 MB) y Nemotron. **No hay streaming de portugués, italiano,
polaco, turco ni hindi.** Las licencias de cada uno de esos modelos no se revisaron una por una
**[sin verificar]**; el propio sherpa-onnx advierte que cada modelo tiene su licencia aparte.

### 2.2 Cuánto trabajo es conectar otro motor

La frontera ya existe: un motor nuevo sería otro plugin de Android que emita los mismos eventos
`parcial` y `final` que `VoskNativoPlugin` (con el mismo texto plano), más una clase como
`MotorNativo` que implemente `MotorDeVoz`. Seguidor, avance y conducción no se tocan
(`src/motor/MotorNativo.ts:37-42`). Lo costoso no es el enchufe: es la biblioteca nativa nueva (peso
de la APK, arquitecturas), las mediciones y el afinado del ritmo de parciales, que es lo que mueve la
pantalla. **Para cualquier idioma con modelo Vosk no hace falta motor nuevo.**

---

## 3. Modelos Vosk por idioma

Fuente única de esta tabla: la lista oficial https://alphacephei.com/vosk/models (leída el 29-09-2026).
"Peso" es el que publica la lista (tamaño de descarga). El error (WER, porcentaje de palabras erradas)
es el que publica la misma lista, con el conjunto de prueba entre paréntesis; **los números de
conjuntos distintos no se comparan entre sí**. Como vara: el modelo de español que usa Sigo hoy
publica 16,02 en Common Voice (cv) y el de inglés 9,85 en librispeech.

| Idioma | Modelo chico (el que serviría) | Peso | Licencia | ¿Permite cobrar? | Error publicado | Otros modelos y por qué no |
| --- | --- | --- | --- | --- | --- | --- |
| Portugués / Brasil | vosk-model-small-pt-0.3 | 31M | Apache 2.0 | Sí | 32,60 (cv), 68,92 (coraa dev) | pt-fb-v0.1.1: 1,6 GB y **GPLv3** — no |
| Portugués / Portugal | el mismo pt-0.3 (no hay uno propio) | 31M | Apache 2.0 | Sí | no publicado para Portugal | — |
| Francés | vosk-model-small-fr-0.22 | 41M | Apache 2.0 | Sí | 23,95 (cv), 19,30 (mtedx), 27,25 (podcast) | small-fr-pguyot: **CC-BY-NC-SA** — no; fr-0.6-linto: AGPL, 1,5 GB — no |
| Alemán | vosk-model-small-de-0.15 | 45M | Apache 2.0 | Sí | 13,75 (Tuda-de), 30,67 (podcast) | small-de-zamia: LGPL, "no recomendado" |
| Italiano | vosk-model-small-it-0.22 | 48M | Apache 2.0 | Sí | 16,88 (cv), 25,87 (mls), 17,01 (mtedx) | — |
| Catalán | vosk-model-small-ca-0.4 | 42M | Apache 2.0 | Sí | no publicado ("TBD") | — |
| Neerlandés | vosk-model-small-nl-0.22 | 39M | Apache 2.0 | Sí | 22,45 (cv), 26,80 (tv) | nl-spraakherkenning: **CC-BY-NC-SA** — no |
| Polaco | vosk-model-small-pl-0.22 | 50M | Apache 2.0 | Sí | 18,36 (cv), 16,88 (mls), 11,55 (voxpopuli) | — |
| Ucraniano | vosk-model-small-uk-v3-nano / -small | 73M / 133M | Apache 2.0 | Sí | no publicado ("TBD") | uk-v3: 343 MB |
| Ruso | vosk-model-small-ru-0.22 | 45M | Apache 2.0 | Sí | 22,71 (openstt audiolibros), 11,79 (golos) | ru-0.42: 1,8 GB, servidor |
| Turco | vosk-model-small-tr-0.3 | 35M | Apache 2.0 | Sí | no publicado ("TBD") | — |
| Hindi | vosk-model-small-hi-0.22 | 42M | Apache 2.0 | Sí | 20,89 (IITM), 24,72 (MUCS) | — |
| Indonesio | **no hay** | — | — | — | — | — |
| Vietnamita | vosk-model-small-vn-0.4 | 32M | Apache 2.0 | Sí | 15,70 (Vivos) | — |
| Japonés | vosk-model-small-ja-0.22 | 48M | Apache 2.0 | Sí | 9,52 CER (csj) — error por carácter | — |
| Chino | vosk-model-small-cn-0.22 | 42M | Apache 2.0 | Sí | 23,54 (SpeechIO-02), 17,15 (THCHS) | — |
| Coreano | vosk-model-small-ko-0.22 | 82M | Apache 2.0 | Sí | 28,1 (Zeroth) | — |
| Árabe | **no hay chico**; vosk-model-ar-mgb2-0.4 | 318M | Apache 2.0 | Sí | 16,40 (MGB-2 dev) | ar-0.22-linto: AGPL — no; small-ar-tn (tunecino, 158M): Apache |
| Farsi | vosk-model-small-fa-0.42 | 53M | Apache 2.0 | Sí | 23,4 (CV17), 14,0 (Fleurs) | small-fa-0.5 (60M): peor según la misma lista |
| Otros con modelo chico libre | checo (small-cs-0.4-rhasspy, 44M, **MIT**, 21,29 cv), sueco (small-sv-rhasspy, 289M, MIT, sin error publicado), esperanto (42M, 7,24 cv), uzbeko (49M), kazajo (58M), kirguís (49M), georgiano (45M), tayiko (50M), guyaratí (100M), telugu (58M, 87,9 Fleurs), bretón (70M, MIT) — todos Apache 2.0 salvo los marcados | | | | | Tagalo (tl-ph-generic): **CC-BY-NC-SA** — no |

Memoria en uso: la lista oficial dice que un modelo chico "requiere unos 300 MB de memoria". Cuánto
consume cada uno en el moto g86 mientras graba video **[sin verificar]**: solo se midió el español en
el teléfono (`docs/ingles.txt`).

### 3.1 La gramática (restringir Vosk a las palabras del guion)

- Vosk la admite solo en modelos con grafo dinámico: "La mayoría de los modelos chicos permiten
  reconfigurar el vocabulario; los grandes son estáticos" — https://alphacephei.com/vosk/models.
- **Ya se probó en Sigo y se descartó**: "empeora en los dos idiomas. Inglés 685 → 613 palabras en
  orden; español 1223 → 882. Cuando duda, elige una palabra del guion que no corresponde" —
  `docs/ingles.txt:101-103`.
- **Medido otra vez ahora**, en FLEURS dev, dándole a Vosk como gramática el vocabulario de las ~150
  frases (como si fueran un guion de 150 frases):

  | | Sin gramática | Con gramática |
  | --- | --- | --- |
  | Español, error | 14,6 % | 37,0 % |
  | Español, demora mediana del parcial (p90) | 219 ms (400) | 339 ms (910) |
  | Portugués, error | 26,9 % | 48,0 % |
  | Portugués, demora mediana (p90) | 419 ms (809) | 395 ms (930) |

  (Estas cuatro corridas usan la configuración del modelo tal como viene, sin `--frames-per-chunk=3`.)
  Gasta menos procesador (0,026–0,037 del tiempo real contra 0,06–0,20), pero se equivoca mucho más y
  la demora en p90 sube. Lo que la persona dice fuera del guion se fuerza a alguna palabra del guion,
  que es justo lo que confunde al seguidor. **Conclusión: no mejora la precisión en ningún idioma medido.**

---

## 4. Medición propia: portugués contra español con Vosk (en el PC)

**Qué se hizo.** Se bajaron los modelos chicos de español (0.42, el de la app) y de portugués (0.3) y
se pasaron por el conjunto **dev de FLEURS** de `es_419` y `pt_br` (licencia CC-BY 4.0, ver sección
1.4), ~150 frases leídas por persona (una grabación por frase, ~30 minutos de audio por idioma). El
audio se entregó en **trozos de 20 ms**, y se midió con y sin `--frames-per-chunk=3`, que es como lo
configura la app. Vosk 0.3.45 para Python (la app usa vosk-android 0.3.75), procesador Intel Xeon del
computador de pruebas. La demora es: momento del audio en que la palabra aparece por primera vez en
un parcial, menos el momento en que Vosk dice que la palabra terminó.

**Un detalle práctico que salió al medir:** el modelo portugués 0.3 es de 2020 y viene con la
estructura antigua de carpetas (sin `am/`, `conf/`, `graph/`). `scripts/bajar-modelo.mjs` exige esas
cuatro carpetas y agrega `--frames-per-chunk=3` a `conf/model.conf`, que ese modelo no tiene. En el PC
se reordenó a la estructura nueva a mano, con sus parámetros de búsqueda originales, y Vosk lo cargó
bien. Que vosk-android 0.3.75 cargue igual esa versión reordenada **[sin verificar en el teléfono]**.

| Con `--frames-per-chunk=3` (como la app) | Español small-0.42 | Portugués small-0.3 |
| --- | --- | --- |
| Palabras erradas (WER) | **14,5 %** | **27,2 %** |
| WER tras la `normalizar` de Sigo | 14,1 % | 27,0 % |
| Demora del parcial, mediana | **129 ms** | **300 ms** |
| Demora del parcial, p90 | 242 ms | 629 ms |
| Procesador (fracción del tiempo real, PC) | 0,114 | 0,264 |
| Peso comprimido / desempaquetado | 38,0 MB / 58 MB | 31,0 MB / 52 MB |

- El español da **129 ms**, casi lo mismo que midió la app en el teléfono con las lecturas de Javier
  (140 ms, `VoskNativoPlugin.java:108` y siguientes). Eso sugiere que el banco es fiel.
- El portugués **se equivoca casi el doble**, entrega las palabras **2,3 veces más tarde** y usa **2,3
  veces más procesador**. En el teléfono, si el español ya ocupa una parte de la CPU mientras graba,
  el portugués ocuparía el doble; si alcanza en el moto g86 grabando video **[sin verificar]**.
- FLEURS es lectura de frases sueltas, no de un guion de corrido; las cifras de lectura real salen del
  protocolo de la sección 7.

**La alternativa medida para portugués: Nemotron 3.5 streaming** (sherpa-onnx 1.13.8, modelo int8 de
trozos de 160 ms, 40 frases del mismo conjunto, 2 hilos):

| | Nemotron 3.5 (pt-BR) |
| --- | --- |
| WER | 11,0 % (la ficha oficial publica 6,29 % en FLEURS test con trozos de 80 ms) |
| Demora desde el último trozo de la palabra, mediana (p90) | 199 ms (280) — medida distinta a la de Vosk: sin la hora exacta del fin de palabra |
| Cambios del texto por segundo | 3,0 (Vosk: un parcial cada 20 ms) |
| Procesador (fracción del tiempo real, PC, 2 hilos) | **0,743** |
| Peso | 453 MB comprimido / 653 MB desempaquetado |

Reconoce mucho mejor, pero en un PC ya usa tres cuartos del tiempo real con dos hilos; un teléfono
de gama media, grabando video, casi con seguridad no llega **[sin verificar en el teléfono]**, y pesa
más de diez veces lo que el modelo Vosk. **Hoy no es viable; es el que hay que volver a mirar.**

---

## 5. La tabla de todos los idiomas

Mercado — tres cifras públicas, para el orden de magnitud:
- **Hablantes** (primera + segunda lengua, millones): Ethnologue 2026, tomado de
  https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers (fuente original
  https://www.ethnologue.com/insights/ethnologue200). Esa lista solo trae idiomas de 50 millones o más.
- **Usuarios de YouTube en el país principal** (millones): https://worldpopulationreview.com/country-rankings/youtube-users-by-country
  (agregador; cifra de 2025).
- **Android**: porcentaje del tráfico móvil de Android en el país, agosto 2026, StatCounter
  (https://gs.statcounter.com/os-market-share/mobile/ + país). Es **proporción de tráfico web, no
  número de teléfonos activos**; el número de teléfonos Android activos por país **[sin verificar]**:
  no se encontró una fuente pública.

Compatibilidad con el seguidor: **fácil** = alfabeto latino con espacios, basta ampliar las letras de
`normalizar`; **media** = hay que pasar la normalización a Unicode y revisar tipografías, pero la
lógica por palabras sirve; **difícil** = sin espacios entre palabras o de derecha a izquierda.

| Idioma | Motor y modelo | Licencia (¿cobrar?) | Peso | Calidad publicada | Seguidor | Hablantes | YouTube, país principal | Android |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Portugués (Brasil) | Vosk small-pt-0.3 | Apache 2.0 (sí) | 31 MB / 52 MB | 32,60 cv; **medido 27,2 % FLEURS** | Fácil (ã õ ç â ê ô) | 269 M | Brasil 144 M | 75 % |
| Portugués (Portugal) | Vosk small-pt-0.3 | Apache 2.0 (sí) | 31 MB | acento europeo sin medir | Fácil | (incluido arriba) | Portugal 7,5 M | 63 % |
| Italiano | Vosk small-it-0.22 | Apache 2.0 (sí) | 48 MB | 16,88 cv | Fácil (è à ù ò ì) | 66 M | Italia 42,2 M | 65 % |
| Alemán | Vosk small-de-0.15 | Apache 2.0 (sí) | 45 MB | 13,75 Tuda / 30,67 podcast | Fácil (ä ö ü ß; palabras compuestas largas) | 133 M | Alemania 65,5 M | 72 % |
| Francés | Vosk small-fr-0.22 | Apache 2.0 (sí) | 41 MB | 23,95 cv | Fácil-media (l', d', qu' con apóstrofo) | 334 M | Francia 50,4 M | 64 % |
| Neerlandés | Vosk small-nl-0.22 | Apache 2.0 (sí) | 39 MB | 22,45 cv | Fácil | < 50 M | Países Bajos 14,8 M | 69 % |
| Catalán | Vosk small-ca-0.4 | Apache 2.0 (sí) | 42 MB | no publicado | Fácil (l·l, à è ò ç) | < 50 M | (España 39,7 M, compartido) | 69 % (España) |
| Polaco | Vosk small-pl-0.22 | Apache 2.0 (sí) | 50 MB | 18,36 cv | Fácil tras el arreglo (31 % de palabras hoy pierden letras) | < 50 M | Polonia 29 M | 69 % |
| Turco | Vosk small-tr-0.3 | Apache 2.0 (sí) | 35 MB | no publicado | Fácil tras el arreglo (ı/İ: minúscula especial) | 94 M | Turquía 57,5 M | 74 % |
| Vietnamita | Vosk small-vn-0.4, o Moonshine Tiny Streaming (MIT) | Apache 2.0 / MIT (sí) | 32 MB | 15,70 Vivos; Moonshine 9,4 % | Media (73 % de palabras con tildes propias; hay que cargar el subconjunto vietnamita de la tipografía) | 97 M | Vietnam 62,3 M | 57 % |
| Ruso | Vosk small-ru-0.22 | Apache 2.0 (sí) | 45 MB | 22,71 openstt / 11,79 golos | Media (cirílico: la tipografía lo tiene, pero hay que cargar el subconjunto) | 210 M | sin dato en la fuente | 69 % |
| Ucraniano | Vosk small-uk-v3-nano | Apache 2.0 (sí) | 73 MB | no publicado | Media (cirílico) | < 50 M | Ucrania 21,6 M | 64 % |
| Hindi | Vosk small-hi-0.22 | Apache 2.0 (sí) | 42 MB | 20,89 IITM | Media (devanagari; tipografía nueva) | 611 M | India 491 M | 93 % |
| Coreano | Vosk small-ko-0.22 | Apache 2.0 (sí) | 82 MB | 28,1 Zeroth | Media (hangul con espacios; tipografía nueva) | 82 M | Corea 43,4 M | 64 % |
| Japonés | Vosk small-ja-0.22, o Moonshine Tiny/Small Streaming (MIT) | Apache 2.0 / MIT (sí) | 48 MB | 9,52 CER csj; Moonshine 19,7 % CER | **Difícil** (sin espacios) | 126 M | Japón 78,7 M | 35 % |
| Chino (mandarín) | Vosk small-cn-0.22, o Moonshine Tiny Streaming (MIT) | Apache 2.0 / MIT (sí) | 42 MB | 23,54 SpeechIO-02; Moonshine 16,1 % CER | **Difícil** (sin espacios) | 1.183 M | sin dato (YouTube no opera en China continental) **[sin verificar]** | sin dato |
| Árabe | Moonshine Tiny Streaming (MIT), o Vosk ar-mgb2-0.4 (318 MB) | MIT / Apache 2.0 (sí) | Moonshine: 34 M de parámetros, peso del archivo **[sin verificar]** | Moonshine 15,5 %; Vosk 16,40 MGB-2 | **Difícil** (derecha a izquierda) | no extraído (Ethnologue lo cuenta por dialectos) | Egipto 50,7 M; Arabia Saudita 27,2 M | 88 % (Egipto) |
| Farsi | Vosk small-fa-0.42 | Apache 2.0 (sí) | 53 MB | 23,4 CV17 / 14,0 Fleurs | **Difícil** (derecha a izquierda) | 82 M (persa de Irán) | sin dato | sin dato |
| Indonesio | **ninguno que cumpla** | — | — | — | Fácil (latino, sin letras especiales) | 255 M | Indonesia 143 M | 77 % |

El tamaño de la economía de creadores de video **por idioma** (cuánto se gasta o gana en YouTube,
Instagram, TikTok y clases en línea por idioma) **[sin verificar]**: no se encontró una fuente
pública desglosada por idioma; se usa la cantidad de usuarios de YouTube por país como aproximación.

---

## 6. Los tres niveles y el orden recomendado

### 6.1 Listos para hacer (modelo Vosk chico, Apache 2.0, alfabeto latino con espacios)

Portugués de Brasil, italiano, alemán, francés, neerlandés, catalán, polaco y turco. En todos: el
mismo motor, un paquete de Play más y el mismo trabajo de código (sección 6.4). **Ojo: "listo" quiere
decir que se puede armar; no que ya se sepa que sigue bien la lectura.** Eso lo dice solo la medición
con lecturas reales.

### 6.2 Posibles con trabajo

- **Vietnamita, ruso, ucraniano, hindi, coreano**: modelo Vosk libre existe; hay que llevar
  `normalizar` y `subtitulos.ts` a Unicode, sumar tipografías (Source Sans 3 y Source Serif 4 traen subconjuntos cirílico y vietnamita en
  Fontsource — https://data.jsdelivr.com/v1/packages/npm/@fontsource/source-serif-4@5.3.0 —, pero la
  app solo carga `latin` y `latin-ext`, `src/main.tsx:7-14`; devanagari y hangul necesitan otra fuente) y revisar las palabras que no cierran un subtítulo.
- **Japonés y chino**: el seguidor compara palabras separadas por espacios. Habría que tokenizar el
  guion por caracteres (o con un segmentador) y hacer lo mismo con lo que oye el motor; revisar
  `avance.ts`, que razona en palabras por minuto, y el corte de renglones y subtítulos. Trabajo
  grande, y la comparación contra Moonshine hay que medirla.
- **Árabe y farsi**: además de lo anterior, escritura de derecha a izquierda en el editor, la lectura,
  el destacado y los subtítulos quemados (`CapaDeSubtitulos.java`). No hay nada de RTL en `src/` hoy.
- **Portugués de Portugal**: el mismo modelo que Brasil; si reconoce bien el acento europeo, se
  mide con un hablante de Portugal **[sin verificar]**.

### 6.3 No viables hoy

- **Indonesio**: sin modelo Vosk, sin Moonshine streaming, y Nemotron no lo lista. El multilingüe de
  sherpa-onnx `ar_en_id_ja_ru_th_vi_zh` pesa 247 MB y su licencia no se revisó.
- **Cualquier idioma cuyo único modelo sea no comercial o copyleft**: tagalo en Vosk (CC-BY-NC-SA; el
  de Moonshine streaming es MIT y sí serviría), los grandes de neerlandés y francés (NC, AGPL),
  el grande de portugués (GPLv3).
- **Nemotron 3.5 para cualquier idioma**, por peso y procesador (sección 4), hasta nuevo aviso.

### 6.4 El trabajo que comparten todos los idiomas del primer nivel

Leído en el código, sin programar:
1. Llevar `'es' | 'en'` a un tipo de idioma abierto en `MotorNativo.ts` (6 lugares) y en
   `VoskNativoPlugin.java:78-79` y `:180`.
2. Un módulo de paquete de Play `model_xx` a pedido (como `model_en`), la carpeta en `genUUID`
   (`android/app/build.gradle`) y la línea en `scripts/bajar-modelo.mjs`. Para el portugués, además,
   reordenar el modelo 0.3 a la estructura nueva de carpetas (sección 4).
3. `detectarIdioma.ts`: lista de palabras frecuentes del idioma, cuidando las que comparte con el
   español ("de", "que", "se", "para", "por", "como"): en portugués conviene "não", "uma", "com",
   "você", "também", "isso", "mais"; y quizás una regla por letras propias (ã, õ, ç).
4. `normalizar` (`seguidor.ts:76`) y `norm` (`subtitulos.ts:74`): sumar las letras del idioma. Y la
   lista `ATADAS` (`subtitulos.ts:67`) del idioma.
5. Números: hoy nadie convierte "10" en "dez" — el guion trae cifras y Vosk oye palabras. Ya estaba
   anotado para el inglés (`docs/ingles.txt:81-85`); en cada idioma es otro conversor.
6. Medir con lecturas reales antes de entrar (sección 7).

### 6.5 Orden recomendado

1. **Portugués de Brasil — Vosk small-pt-0.3.** Mercado enorme (269 M de hablantes; Brasil 144 M
   de usuarios de YouTube y 75 % de tráfico Android, más que México con 66 % y España con 69 %),
   modelo liviano y libre, y un hablante nativo que puede grabar. **Pero es el de peor calidad
   publicada de los latinos**: se hace primero con la condición de que el padre de Javier grabe
   *antes* de programar nada (sección 7 — el audio grabado con la APK de prueba se puede pasar por el
   modelo portugués en el PC, como se hizo con el inglés), y con la salida escrita: si no alcanza, se
   posterga y se sigue con el italiano.
2. **Italiano — Vosk small-it-0.22.** El que publica el error más parecido al español en el mismo
   conjunto (16,88 contra 16,02 en Common Voice), casi no pierde letras con la normalización de hoy
   (3,6 %), mercado mediano (66 M de hablantes, Italia 42 M en YouTube). Falta un lector nativo.
3. **Alemán — Vosk small-de-0.15.** Buen error en lectura (13,75 Tuda) pero malo en habla libre
   (30,67 podcast); mercado de alto poder de compra (Alemania 65,5 M en YouTube, 72 % Android).
   Atención a las palabras compuestas largas en la pantalla.
4. **Francés — Vosk small-fr-0.22.** El mercado más grande de los tres por hablantes (334 M, mucho
   como segunda lengua), pero el modelo chico más débil (23,95 cv) y hay que resolver los apóstrofos
   ("l'a" y "la" chocan hoy).
5. **Polaco — Vosk small-pl-0.22** (o turco). Buen error publicado (18,36 cv), arreglo de letras
   conocido. El turco tiene más mercado (94 M; 57,5 M en YouTube) pero su modelo no publica error;
   que decida la medición.

Fuera del orden, anotado: el **hindi** (India: 491 M de usuarios de YouTube y 93 % Android) es el
mercado más grande de todos, pero es de nivel "con trabajo" y muchos creadores indios graban en
inglés **[sin verificar]**.

---

## 7. Portugués de Brasil en detalle

### 7.1 El modelo

- `vosk-model-small-pt-0.3` — https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip.
  Licencia **Apache 2.0** según la lista oficial (https://alphacephei.com/vosk/models); el archivo
  README del modelo solo dice "Portuguese model for android". Apache 2.0 pide conservar el aviso de
  licencia: sumarlo donde la app ya muestre la de Vosk **[sin verificar dónde está hoy]**.
- Peso: 31,0 MB comprimido (32.453.112 bytes), 52 MB desempaquetado (medido).
- Calidad: 32,60 % en Common Voice y 68,92 % en CORAA (habla espontánea brasileña), publicados;
  27,2 % en FLEURS medido acá, contra 14,5 % del español con el mismo método.
- Es de enero de 2020 (fecha de los archivos del zip). No hay uno más nuevo con licencia libre.

### 7.2 Qué habría que ajustar en el seguidor

- Letras: sumar `ãõçâêôà` a `normalizar` (`subtitulos.ts` ya las conserva por NFD, ver 11.6) (hoy "ação" y "ao" chocan).
- Contracciones: "do", "da", "no", "na", "à", "pelo", "num" son palabras separadas por espacios; el
  seguidor no las trata distinto, y Vosk las escribe igual que el guion, así que no deberían
  molestar. Se comprueba con las lecturas.
- Palabras con guion: "fazê-lo", "disse-me", "guarda-chuva". `normalizar` borra el guion y las junta
  ("fazelo"); si Vosk las oye separadas, no calzan — el mismo caso que "well-known" en inglés
  (`docs/ingles.txt:83-84`). Cuánto pasa en guiones reales **[sin verificar]**.
- Números: conversor de cifras a palabras en portugués ("2026" → "dois mil e vinte e seis").
- Palabras cortas muy frecuentes que coinciden con el español ("de", "que", "a", "o", "e"): no
  afectan al seguidor, pero sí a `detectarIdioma`.
- Comparación por sonido: arrancar sin ella, como el español; decidir con los episodios de pérdida.

### 7.3 Protocolo de medición para el papá de Javier

Pensado para alguien que no es técnico. Lo acompaña Javier.

**Qué necesita:** el teléfono con la **APK de prueba** de Sigo (la que tiene el panel de corpus), un
lugar callado, y el guion de abajo copiado en Sigo.

**Antes de empezar (lo hace Javier):**
1. En la APK de prueba, en la Biblioteca, abrir el panel de corpus y activar **"Medir y guardar
   audio/eventos automáticamente al leer"** (`src/components/PanelCorpus.tsx:104`). La APK de prueba
   guarda además el audio que escuchó el reconocedor (`GUARDAR_AUDIO_DEL_OIDO`,
   `src/motor/MotorNativo.ts`, activo solo en la APK de prueba).
2. Pegar el guion como un guion nuevo. **Mientras Sigo no tenga portugués, lo va a escuchar con el
   modelo español y la pantalla no lo va a seguir bien: es normal.** Lo que importa es que quede
   guardado el audio; después, en el computador, ese mismo audio se pasa por el modelo portugués
   (como se hizo con el inglés en `teleprom/02-lecturas/ingles-27-sep/`).

**Las tomas:**
1. **Cuatro tomas** del guion completo, leídas de corrido, a su ritmo normal, mirando la pantalla
   como si grabara un video. Con **Grabar**, no solo Leer: así la cámara está encendida, que es lo que
   exige más al teléfono.
2. En la marca **[pausa]** del guion, quedarse callado unos 3 segundos y seguir.
3. Si se equivoca, **no parar**: corregir y seguir, como en una grabación de verdad. Anotar en un
   papel qué toma tuvo tropiezos.
4. Una **quinta toma** en la que, a propósito, se salte el segundo párrafo completo (para ver si Sigo
   lo alcanza).
5. Entre toma y toma, un minuto de descanso.

**Con qué números se decide (lo hace Javier o el agente, en el PC):** con `scripts/medir-toma.mjs`
y la repetición del seguidor, las mismas cifras que se usaron para el inglés (`docs/ingles.txt:95-114`):
- **% de lo oído que está en el guion** y **% del guion reconocido en orden**. En español, sobre
  lecturas de corrido de Javier: 96,6 % y 92 %. En inglés, con el que se salió: 83,4 % y 66 %.
- **Atraso mediano** en palabras (español: menos de una palabra) y **% del tiempo en el renglón
  objetivo** (español: dos tercios o más).
- **Episodios de pérdida** (la pantalla va más de 3 palabras atrás por más de 2 segundos) y **saltos
  adelantados** (tiene que ser cero).
- **Regla de decisión propuesta:** el portugués entra cuando, en las cuatro tomas de corrido, iguala
  al español en atraso mediano (≤ 1 palabra) y en saltos adelantados (0), y no queda por debajo del
  inglés actual en "guion reconocido en orden" (≥ 66 %); y en la quinta toma, Sigo retoma dentro de
  la frase siguiente al salto. El umbral final lo decide Javier; la regla del repositorio es "mismos
  números que el español" (`docs/ingles.txt:42-45`).
- Advertencia: `medir-toma.mjs` usa como vara los tiempos que da el propio Vosk. Con un reconocedor
  más débil, la vara también se debilita; conviene revisar a mano diez palabras repartidas contra el
  audio, como pide `src/lib/grabadorCorpus.ts` (comentario inicial).
- Para comparar con la misma vara, hace falta el **mismo tipo de guion en español**: Javier (o su
  papá, si también lo lee en español **[sin verificar]**) graba dos tomas de la versión en español.

**El guion de prueba** (unas 330 palabras, unos 2 minutos y medio a ritmo normal; tiene números,
nombres propios, una pausa y una acotación):

> Bom dia! Meu nome é Roberto e hoje eu vou contar uma história que começou em 1985, na cidade de
> Campinas, no interior de São Paulo.
>
> Naquela época eu trabalhava numa fábrica de peças para automóveis. Eram quase 300 funcionários, e
> todo mundo se conhecia pelo nome. O dono, o senhor Antônio Ferreira, chegava às sete e meia da
> manhã e cumprimentava cada um na porta. Ele dizia que uma empresa não é feita de máquinas, mas de
> pessoas.
>
> Em março de 1987 a fábrica recebeu um pedido enorme: 12 mil peças para entregar em apenas 45 dias.
> Ninguém acreditava que fosse possível. Mesmo assim, fizemos dois turnos, dividimos as tarefas e
> ninguém reclamou.
>
> [pausa]
>
> No último dia, faltando poucas horas para o caminhão sair, uma das máquinas quebrou. Foi o Joaquim,
> um mecânico que tinha vindo de Belo Horizonte, quem resolveu o problema. Ele trabalhou a noite
> inteira e, às cinco da manhã, a máquina voltou a funcionar.
>
> A entrega foi feita no prazo. O cliente, uma montadora de Curitiba, mandou uma carta de
> agradecimento que ficou pendurada na parede do refeitório por mais de 20 anos.
>
> Hoje, olhando para trás, eu penso que aprendi ali três coisas importantes. A primeira: um problema
> grande fica menor quando é dividido. A segunda: a confiança de um chefe faz as pessoas darem o
> melhor de si. E a terceira, talvez a mais importante: ninguém faz nada sozinho.
>
> Se você está começando agora, seja no Rio de Janeiro, em Recife ou em Porto Alegre, lembre disso.
> Cuide das pessoas ao seu lado. Elas vão lembrar de você muito depois que o trabalho terminar.
>
> Muito obrigado por ouvir, e até a próxima!

El texto lo escribió el agente; **que suene natural lo tiene que confirmar el papá de Javier** antes de
grabar (puede cambiar nombres o frases, pero conviene mantener los números, los nombres de ciudades
y la pausa).

---

## 8. Lo que cuesta cada idioma, además del modelo

| Pieza | Tamaño hoy | Dónde |
| --- | --- | --- |
| Textos de la app | 175 claves (conteo de líneas `clave:` en un archivo de 208 líneas) | `src/textos/es.ts` — el tipo obliga a traducirlas todas: si falta una, no compila |
| Sitio | un archivo de 111 líneas | `sitio/fuente/textos/es.js` |
| Ficha de Play | ya está en `main` (`docs/play/ficha/`, actualizado el 21-10-2026); detalle en la sección 12 | `docs/play/ficha/LEEME.md` |
| Guion de bienvenida "Hola" | un texto largo aparte | `App.tsx`, `bloqueDeBienvenida` (según `src/textos/es.ts`, comentario inicial) |
| Glosario | la tabla de `docs/ingles.txt`, sección 4 | se agrega una columna |
| Revisión | un hablante nativo por idioma: para el portugués, el papá de Javier; para los demás **no hay nadie identificado** | — |
| Paquete de Play | 31 a 50 MB por idioma latino (la lista oficial) | — |
| Medición | 4-5 tomas de un nativo + una tarde de PC | sección 7 |

La regla del inglés vale igual: "el texto se escribe, no se traduce" (`docs/ingles.txt:47-49`).

---

## 9. Lo que no se pudo comprobar

- **Nada se midió en el moto g86 ni en ningún teléfono.** Todo el procesador, la demora y la memoria
  medidos acá son de un computador (Intel Xeon). Si el modelo portugués (2,3 veces más procesador que
  el español) corre bien grabando video en el moto g86: sin verificar.
- Que vosk-android 0.3.75 cargue el modelo portugués 0.3 reordenado a la estructura nueva de carpetas.
- Qué tan bien reconoce el modelo portugués el **acento de Portugal**.
- Error de los modelos chicos de **catalán, turco y ucraniano**: la lista oficial dice "TBD".
- Consumo de memoria real de cada modelo en el teléfono (la lista oficial solo dice "unos 300 MB").
- **Licencias una por una de los modelos streaming de sherpa-onnx** (francés 2023, coreano, ruso
  `small-ru-vosk` y `t-one`, farsi `shenava`, multilingüe `ar_en_id_ja_ru_th_vi_zh`).
- Si el **CC-BY-SA** de los modelos Kroko es compatible con meterlos en una app de pago (el
  "compartir igual").
- Las **condiciones de uso** del reconocedor de Google en Android y si funciona sin internet de
  verdad en cada idioma y en cada teléfono; también su ritmo de parciales.
- El comportamiento real de **whisper.cpp** en un teléfono (demora y consumo): no se midió porque no
  cumple la condición de parciales en vivo.
- **Nemotron 3.5** en el teléfono: solo se midió en el PC. La demora medida no es comparable 1 a 1
  con la de Vosk (no entrega la hora de fin de cada palabra).
- Peso real en disco de los modelos **Moonshine** streaming (solo se publican los parámetros), y su
  ritmo de actualización en idiomas distintos del inglés.
- **Número de teléfonos Android activos por país**: StatCounter mide proporción de tráfico, no
  teléfonos.
- **Tamaño de la economía de creadores por idioma**: no hay una fuente pública desglosada; se usó
  usuarios de YouTube por país como aproximación (cifra de un agregador, de 2025). Rusia, Irán y China
  sin dato en esa fuente.
- **Hablantes de neerlandés, catalán, polaco, ucraniano y árabe**: la lista de Ethnologue citada solo
  trae los de 50 millones o más, y cuenta el árabe por dialectos; no se buscaron cifras aparte.
- Si en el límite de 512 MB de un paquete a pedido de Play cuenta el tamaño comprimido o el
  desempaquetado: la ayuda de Play habla de 512 MB por paquete a pedido en una página
  (https://docs.unrealengine.com/4.27/en-US/SharingAndReleasing/Mobile/Android/Distribution/GooglePlayAssetDeliveryReference/)
  y de 1,5 GB por paquete en otra (https://support.google.com/googleplay/android-developer/answer/9859372).
  Para Vosk no importa (todos pesan menos de 100 MB); para Nemotron sí.
- Dónde muestra hoy la app las licencias de terceros (para sumar el aviso Apache 2.0 del modelo nuevo).
- Que el guion de prueba en portugués suene natural: lo escribió el agente y lo revisa el papá de Javier.
- Que muchos creadores de la India graben en inglés (se menciona como hipótesis, sin fuente).
- Si un modelo GPLv3 empaquetado en una app de pago arrastra la licencia al resto de la app
  (consultar a un abogado; ver sección 0.1). No afecta la recomendación, porque ese modelo no se usa.

---

## 10. Cómo se midió (para repetirlo)

- Modelos: https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip y
  https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip (Apache 2.0).
- Audio: FLEURS `dev` de `es_419` y `pt_br` — `https://huggingface.co/datasets/google/fleurs/resolve/main/data/<idioma>/audio/dev.tar.gz`
  y `.../dev.tsv` (CC-BY 4.0). Una grabación por frase, orden al azar con semilla 7, 150 frases
  (147 en portugués: el conjunto dev no tiene más frases distintas).
- Vosk 0.3.45 (Python), trozos de 320 muestras (20 ms a 16 kHz), `SetWords(true)`; con y sin
  `--frames-per-chunk=3` en `conf/model.conf`. WER con `jiwer` 4.0.0 contra la transcripción
  normalizada de FLEURS.
- Nemotron: `sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-160ms-int8-2026-06-11` del lanzamiento
  `asr-models` de sherpa-onnx, sherpa-onnx 1.13.8 para Python, `language = pt-BR`, 2 hilos, 40 frases.
- Detector de idioma y pérdida de letras: `detectarIdioma` y `normalizar` copiados tal cual a Python,
  pasados por las transcripciones de FLEURS dev de cada idioma.
- Los scripts quedaron fuera del repositorio (en el computador de trabajo del agente, `/workspace/medir-idiomas/`).

## 11. Cambios de código necesarios para portugués

Estudio hecho leyendo `main` en el commit `9b5cf53` (21-10-2026). Cada fila dice qué hace hoy el
código, qué habría que cambiar, si es **obligatorio** (sin eso el portugués no funciona o funciona
mal sin avisar) u **opcional**, y el riesgo y el esfuerzo **relativos** (bajo, medio, alto) comparados
entre sí. No se estiman horas. Los fragmentos de código son **propuesta no probada**: ilustran la
idea, no se compilaron ni se corrieron dentro de la app. Este documento no cambia la app.

### 11.1 Cómo decide hoy la app el idioma (el recorrido completo)

1. **El guion guarda su idioma** como texto libre: `src/datos/modelo.ts:102`
   (`idioma: string // 'es', 'en', 'pt'... NUNCA cablear 'es'`). El modelo de datos ya admite `'pt'`;
   `RepositorioIndexedDB.ts:26` lo guarda tal cual. **No hay que migrar datos.**
2. **El editor lo detecta o lo alterna**: `EditorView.tsx:348-360` (`idiomaSegunTexto`, llama a
   `detectarIdioma`) y `EditorView.tsx:414-427` (`handleAlternarIdioma`: `guion.idioma === 'en' ? 'es' : 'en'`,
   un interruptor de dos estados). El botón muestra `idiomaGuion.toUpperCase()`
   (`EditorCabecera.tsx:115`).
3. **App arma el código del motor**: `App.tsx:1252-1253`
   (`idiomaGuion === 'en' ? 'en-US' : idiomaGuion === 'es' ? 'es-ES' : idiomaGuion`). Un `'pt'` pasaría
   como `'pt'` sin cambiar.
4. **useASR lo pasa al motor**: `useASR.ts:15` (por omisión `'es-ES'`) y `:121` (`iniciar({ lang })`).
5. **MotorNativo lo reduce a dos**: `MotorNativo.ts:163`, `:207` y `:238`, las tres con
   `startsWith('en') ? 'en' : 'es'`. **Aquí `'pt'` se convierte en `'es'` sin aviso.**
6. **El plugin de Java lo vuelve a reducir**: `VoskNativoPlugin.java:83` (`carpetaModelo`),
   `:187` (`iniciar`) y `:269` (`asegurarVoz`): todo lo que no sea `"en"` es `"es"`.
7. **La descarga en silencio** usa su propia reducción: `vozAPedido.ts:18` (`IdiomaVoz = 'es' | 'en'`)
   y `:23-25` (`idiomaDeVoz`), y `App.tsx:1316` vuelve a armar `'en-US' : 'es-ES'`.
8. **El seguidor** recibe el idioma del guion (`useSeguidor.ts:64`) y solo lo usa para activar la
   fonética si es `'en'` (`seguidor.ts:213-216`).

Conclusión: hoy un guion marcado `'pt'` **se leería con el modelo español, sin ningún error
visible**. El portugués exige tocar los puntos 2, 5, 6 y 7 a la vez; si se cambia solo uno, el
comportamiento se vuelve incoherente (por ejemplo, el plugin carga `model-pt` pero la descarga en
silencio pide `model-es`).

### 11.2 Todos los `'es' | 'en'` cableados (grep en `src/`, `android/`, `scripts/`, `sitio/`)

Comando: `grep -rnE "'es' \| 'en'|\"en\"\.equals|startsWith\('en'\)|=== 'en'|=== 'es'|model-es|model-en|model_es|model_en"`,
sin las pruebas. Se agrupan por lo que deciden.

| Archivo:línea | Qué decide | ¿Toca el portugués? |
|---|---|---|
| `src/motor/MotorNativo.ts:50`, `:73`, `:136`, `:163`, `:207`, `:238` | qué modelo carga y pide | **sí, obligatorio** |
| `android/.../VoskNativoPlugin.java:83`, `:187`, `:269` | carpeta del modelo | **sí, obligatorio** |
| `src/lib/vozAPedido.ts:18`, `:23-25` | qué voz se baja en silencio | **sí, obligatorio** |
| `src/App.tsx:1253`, `:1316`, `:1353` | código del motor; voz a bajar; nombre del idioma en el aviso | **sí, obligatorio** |
| `src/lib/detectarIdioma.ts:34` | idioma detectado del guion | **sí, obligatorio** |
| `src/components/EditorView.tsx:423`, `:446`, `:832` | botón ES/EN; nombre en la marca guía | **sí, obligatorio** |
| `src/lib/seguidor.ts:214` | fonética solo en inglés | opcional (11.6) |
| `src/lib/subtitulos.ts:111-115` (`ATADAS`) | palabras que no cierran un subtítulo | opcional, recomendado |
| `src/lib/idioma.ts:10`, `:25-26`, `:54` | idioma de la **app** (no del guion) | solo si la app se traduce (11.8) |
| `android/.../IdiomaAppPlugin.java:59` | idiomas de app aceptados | solo si la app se traduce |
| `android/app/src/main/res/xml/locales_config.xml` | idiomas que Android ofrece para la app | solo si la app se traduce |
| `src/app/bienvenida.ts:15`, `:19` | guion Hola en es o en | solo si la app se traduce |
| `src/components/PanelAjustes.tsx:236-241`, `:340-341`, `:568`, `:590`, `:596` | selector de idioma de la app, enlaces de ayuda y correo | solo si la app se traduce |
| `src/components/IndicadorPrecarga.tsx:50` | nombre del idioma en "sin conexión" (usa el de la **app**) | **sí**: debería usar el del guion |
| `src/textos/index.ts:54-57`, `:71` | formato de fecha y número | solo si la app se traduce |
| `android/settings.gradle:12-13`, `android/app/build.gradle:154`, `:200` | paquetes de Play y `genUUID` | **sí, obligatorio** |
| `scripts/bajar-modelo.mjs:32-33`, `:39` | modelos a bajar y carpetas exigidas | **sí, obligatorio** |
| `scripts/play.mjs:76`, `:237` | comprueba modelos y mide tamaños | **sí, obligatorio** |
| `scripts/apk.mjs:75` | solo comprueba el español | no |
| `CopiaViejaDelModelo.java:34` | borra solo la copia vieja `model-es` | no (no debe tocar `model-pt`) |
| `scripts/ficha.mjs:35`, `:47`, `:81`, `:107`; `scripts/playApi.mjs:58-60` | idiomas de la ficha de Play | **sí, para lanzar** (sección 12) |
| `sitio/armar.mjs:78`, `:102`, `:108-110`, `:141` | idiomas del sitio | **sí, para lanzar** (sección 12) |

`MotorVosk.ts:74` (Vosk en el navegador) y `MotorFake.ts:21` reciben `lang` y no lo reducen; el
motor web no va dentro del APK (AGENTS.md, tabla de archivos), así que no se toca.

### 11.3 Motor y plugin (obligatorio)

**C1. Un tipo único de idioma de voz.** Hoy hay cuatro reducciones distintas (MotorNativo ×3,
`vozAPedido.idiomaDeVoz`, Java ×2). Propuesta: una sola función en `vozAPedido.ts` que usen todos.
Riesgo **medio** (toca la carga del modelo), esfuerzo **bajo**.

```ts
// propuesta no probada — src/lib/vozAPedido.ts
export type IdiomaVoz = 'es' | 'en' | 'pt'
export const IDIOMAS_DE_VOZ: readonly IdiomaVoz[] = ['es', 'en', 'pt']
export function idiomaDeVoz(lang: string | null | undefined): IdiomaVoz {
  const l = (lang || '').toLowerCase()
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('pt')) return 'pt'
  return 'es' // la regla de hoy: lo desconocido cae en español
}
```

Y en `MotorNativo.ts:163`, `:207`, `:238` reemplazar la expresión por `idiomaDeVoz(lang)`;
`App.tsx:1253` por `const langMotor = idiomaGuion` (o un mapa a `'pt-BR'`) y `App.tsx:1316` por pasar
`idioma` directo, porque `idiomaDeVoz` ya lo entiende.

**C2. `VoskNativoPlugin.java:83`, `:187`, `:269`.** Propuesta no probada:

```java
// propuesta no probada
private static String idiomaValido(String pedido) {
    if ("en".equals(pedido) || "pt".equals(pedido)) return pedido;
    return "es";
}
private static String carpetaModelo(String idioma) {
    return "model-" + idiomaValido(idioma); // model-es, model-en, model-pt
}
// en iniciar y asegurarVoz: String idioma = idiomaValido(call.getString("idioma", "es"));
```

Riesgo **bajo**, esfuerzo **bajo**. `PaqueteDeVoz.nombreDelPaquete` (release, línea ~99) ya
convierte `model-pt` en `model_pt` sin cambios; `rutaSiEsta` (~:105-110) exige la carpeta `am`, por
eso la reorganización de 11.4 es obligatoria. El evento `progresoVoz` ya lleva `idioma`
(`VoskNativoPlugin.java:~283`) y `MotorNativo.ts:209` lo filtra: sirve igual para `pt`.

**C3. Rendimiento del modelo pt en el teléfono (riesgo alto).** El comentario de
`VoskNativoPlugin.java:112` explica los trozos de 20 ms y `--frames-per-chunk=3`. En el PC el
portugués gastó 2,3 veces más procesador (sección 4) **[sin verificar en teléfono]**. No es un
cambio de código, pero puede obligar a ajustar `max-active` o `beam` en el `model.conf` de pt.

### 11.4 El modelo pt-0.3 tiene el formato viejo (obligatorio)

Lo que trae el zip `vosk-model-small-pt-0.3` (comprobado al descomprimirlo):
`final.mdl`, `HCLr.fst`, `Gr.fst`, `disambig_tid.int`, `phones.txt`, `word_boundary.int`,
`mfcc.conf` y `ivector/`, **todo suelto en la raíz, sin `am/`, `conf/` ni `graph/` y sin
`model.conf`**. Hoy eso rompe dos cosas:

- `scripts/bajar-modelo.mjs:39` exige `['am','conf','graph','ivector']` y se para con
  "El modelo quedó incompleto".
- `scripts/bajar-modelo.mjs:~98-101` lee `conf/model.conf` para agregar `--frames-per-chunk=3`; ese
  archivo no existe en pt-0.3 y el script fallaría.
- `PaqueteDeVoz.rutaSiEsta` busca `am/` y respondería "no está bajado" para siempre.

Propuesta no probada para `scripts/bajar-modelo.mjs` (riesgo **bajo**, esfuerzo **bajo**):

```js
// propuesta no probada
const MODELOS = [
  /* es y en como hoy */
  { idioma: 'portugues', url: 'https://alphacephei.com/vosk/models/vosk-model-small-pt-0.3.zip',
    carpeta: 'model-pt', mb: 31, formatoViejo: true }
]
function reordenarFormatoViejo(dir) {
  const mover = { 'final.mdl': 'am', 'mfcc.conf': 'conf', 'HCLr.fst': 'graph', 'Gr.fst': 'graph',
    'phones.txt': 'graph', 'disambig_tid.int': 'graph', 'word_boundary.int': 'graph/phones' }
  for (const [archivo, sub] of Object.entries(mover)) {
    fs.mkdirSync(path.join(dir, sub), { recursive: true })
    fs.renameSync(path.join(dir, archivo), path.join(dir, sub, archivo))
  }
  // model.conf con los valores que Vosk usaba para este modelo -leídos en su registro al cargarlo-
  fs.writeFileSync(path.join(dir, 'conf', 'model.conf'), [
    '--min-active=200', '--max-active=7000', '--beam=13.0', '--lattice-beam=6.0',
    '--acoustic-scale=1.0', '--frame-subsampling-factor=3',
    '--endpoint.silence-phones=1:2:3:4:5:6:7:8:9:10',
    '--endpoint.rule2.min-trailing-silence=0.5', '--endpoint.rule3.min-trailing-silence=1.0',
    '--endpoint.rule4.min-trailing-silence=2.0', ''].join('\n'))
}
```

Esta misma reorganización es la que se usó para medir en el PC (`/workspace/medir-idiomas/pt-fpc3`,
sección 10) y Vosk 0.3.45 de Python la cargó y transcribió. **[sin verificar]** que vosk-android
0.3.75 la cargue igual; los valores `beam 13`, `max-active 7000` y `lattice-beam 6` salen del registro
de Vosk al cargar el modelo original, no de una documentación.

### 11.5 Paquetes de Play y Gradle (obligatorio)

| Cambio | Archivo:línea | Riesgo / esfuerzo |
|---|---|---|
| Crear `android/model-pt/build.gradle` copiando `android/model-en/build.gradle` con `packName = 'model_pt'` y `deliveryType = 'on-demand'` | nuevo | bajo / bajo |
| `include ':model-pt'` dentro del `if (paraPlay)` | `android/settings.gradle:12-13` | bajo / bajo |
| `assetPacks = [':model-es', ':model-en', ':model-pt', ':gestos']` | `android/app/build.gradle:154` | bajo / bajo |
| `genUUID`: `carpetas = ['model-es', 'model-en', 'model-pt']` | `android/app/build.gradle:200` | bajo / bajo |
| Comprobar `model-pt` y medir `model_pt` | `scripts/play.mjs:76`, `:237` | bajo / bajo |
| La APK de prueba lleva los modelos en assets: con pt suma unos 52 MB desempaquetados | `android/app/src/main/assets/` (no está en git) | bajo / bajo |

`CopiaViejaDelModelo.java:34` no se toca: solo borra la copia vieja del español.

### 11.6 Seguidor, normalización y fonética

**C4. `normalizar` borra letras portuguesas (obligatorio).** `seguidor.ts:73-79`:
`.replace(/[^a-z0-9áéíóúñü\s]/gi, '')`. Borra `ã õ ç â ê ô à`. Medido en FLEURS pt_br (sección 1.4):
7,1 % de las palabras pierden letras y aparecen choques como "ação" → "ao", que es una palabra
frecuente ("ao" = "a o"). Propuesta: quitar los diacríticos con NFD, como ya hace `subtitulos.ts`
(`norm`, líneas ~117-119), pero conservando la `ñ` para no cambiar el español:

```ts
// propuesta no probada — src/lib/seguidor.ts
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .replace(/ñ/g, '\u0000')              // guarda la ñ
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0000/g, 'ñ')
    .replace(/[^a-z0-9ñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
```

Ojo: esto **cambia el español** (hoy "más" y "mas" son distintas y pasarían a ser iguales). AGENTS.md
y `seguidor.ts:211-212` exigen que las 28 tomas de Javier den lo mismo byte a byte. Alternativa
más segura: aplicar la versión nueva solo si `idioma === 'pt'`, igual que hoy la fonética solo en
inglés. Riesgo **medio** (el seguidor es el corazón de la app), esfuerzo **bajo** de escribir y
**medio** de comprobar con `npm run banco`.

**Lo que ya funciona sin cambios:** `subtitulos.ts` `norm` pasa por NFD y borra las marcas, así que
"ação" queda "acao" y no se pierden letras. **Corrige lo dicho en la sección 7** ("sumar ãõçâêôà a
`subtitulos.ts`"): no hace falta para las letras, solo para la lista `ATADAS` (C6).

**C5. Contracciones `do, da, no, na, pelo, pela, num, ao, à` (obligatorio comprobar, quizá sin
código).** `tokenizarGuion` corta por espacios (`seguidor.ts:~110-117`), y en portugués las
contracciones se escriben como una palabra separada, igual que "del" y "al" en español. Vosk pt
también las entrega como palabras separadas **[sin verificar en todas]**: en la transcripción de
FLEURS medida en la sección 4 aparecen "do", "da", "no", "na" sueltas. El riesgo real es otro: con
la `normalizar` de hoy "à" desaparece (queda vacía) y con la propuesta C4 "à" y "a" se vuelven la
misma palabra, lo que conviene, porque Vosk no distingue la crasis al oído. "pelo" (contracción) y
"pelo" (cabello) se escriben igual: no afecta, el seguidor compara letras. Ninguna palabra de una
o dos letras debería tener peso alto: hoy `pesoDe` (`seguidor.ts:222`) baja el peso de las
palabras frecuentes, lo que ya cubre esto. **[sin verificar]** con lecturas reales.

**C6. `ATADAS` de los subtítulos (opcional, recomendado).** `subtitulos.ts:111-115` tiene una sola
lista para es y en. Sumar las de portugués sin que choquen:
`o os as e do da dos das no na nos nas num numa pelo pela pelos pelas ao aos um uma meu minha seu sua que se mas`.
"o" en español es "o" (disyunción) y también ata: no choca. Riesgo **bajo**, esfuerzo **bajo**.

**C7. Fonética para portugués (opcional).** `seguidor.ts:214` solo activa `suenanParecido`
(`fonetica.ts:104`, Metaphone, reglas del inglés) en inglés. No hay que activarla en portugués:
Metaphone del inglés aplicado al portugués no tiene sustento. Si las lecturas del padre de Javier
muestran palabras perdidas por la pronunciación, una propuesta medible es una regla pequeña propia
(equivalencias `ç/ss/s`, `lh/li`, `nh/ni`, `x/ch`, final `-ão/-am`):

```ts
// propuesta no probada — src/lib/fonetica.ts
export function clavePt(p: string): string {
  return p.replace(/ç/g, 's').replace(/ss/g, 's').replace(/lh/g, 'li').replace(/nh/g, 'ni')
          .replace(/ch/g, 'x').replace(/(ão|am)$/g, 'aum')
}
```

Riesgo **medio** (calces falsos), esfuerzo **medio**. Solo con datos que lo pidan.

### 11.7 Detector de idioma: propuesta medida (obligatorio)

Hoy (`detectarIdioma.ts:13-28`, `:34-50`): dos listas, `FRECUENTES_ES` y `FRECUENTES_EN`; mínimo 12
palabras, ganador con el doble y al menos 3. Como `de, que, se, por, para, como, com…` son comunes a
portugués y español, **el portugués sale español en 86 de 96 muestras** de 4 frases de FLEURS
(reproducido el 21-10-2026 con el mismo puerto a Python; en frases sueltas: 170 de 386 como español
y 216 sin decidir).

Propuesta: mantener la decisión inglés de hoy y, si no es inglés, desempatar portugués contra
español con **palabras que solo existen en uno de los dos** más letras exclusivas:

- español: `el los las la en con lo su sus le al es ya sin porque y del una pero muy hay donde eso esto
  cuando hasta él ella usted ustedes nosotros hacer puede tiene están fue estos estas`, más cada palabra
  con `ñ`;
- portugués: `o os as e do da dos das um não mas muito há onde isso isto até ele ela você vocês nós
  fazer pode tem estão foi é são no na nos nas pelo pela ao à`, más cada palabra con `ã`, `õ`, `ç` o
  que termina en `-ção`/`-ções`;
- gana el que tenga al menos 3 y el doble que el otro; si no, `null` (se queda el idioma guardado),
  la misma regla de hoy.

```ts
// propuesta no probada — src/lib/detectarIdioma.ts
export function detectarIdioma(texto: string): 'es' | 'en' | 'pt' | null {
  const base = detectarEsEn(texto)            // la función de hoy, renombrada
  if (base === 'en') return 'en'
  const palabras = (texto.toLowerCase().match(/[\p{L}’']+/gu) || [])
  if (palabras.length < PALABRAS_MINIMAS_PARA_DETECTAR) return null
  let es = 0, pt = 0
  for (const p of palabras) {
    if (SOLO_ES.has(p) || p.includes('ñ')) es++
    if (SOLO_PT.has(p) || /[ãõç]|ções?$/.test(p)) pt++
  }
  if (pt >= 3 && pt >= 2 * es) return 'pt'
  if (es >= 3 && es >= 2 * pt) return base ?? 'es'
  return null
}
```

Medido con FLEURS dev (en el PC, puerto a Python, 21-10-2026):

| Texto | Muestras | Hoy | Propuesta |
|---|---|---|---|
| portugués, 4 frases | 96 | 86 es, 1 en, 9 sin decidir | **94 pt**, 1 en, 1 sin decidir |
| español, 4 frases | 102 | 102 es | **102 es** |
| portugués, frase suelta | 386 | 170 es, 216 sin decidir | 325 pt, 61 sin decidir, **0 es** |
| español, frase suelta | 408 | 390 es, 18 sin decidir | 367 es, 41 sin decidir, **0 pt** |
| italiano, 4 frases | 97 | 65 es | 56 es, 6 pt |
| francés, 4 frases | 72 | 72 es | 54 es, 4 pt |
| catalán, 4 frases | 101 | 101 es | 89 es, 2 pt |

Lectura: con guiones de un párrafo o más acierta casi siempre y nunca confunde portugués con
español; con frases sueltas el español decide un poco menos que hoy (367 contra 390 de 408), lo que
deja el idioma guardado, no uno equivocado. Italiano, francés y catalán siguen saliendo como
español, igual que hoy: se resolverá cuando se sumen esos idiomas. El criterio de aceptación
propuesto para la prueba: en FLEURS pt_br de 4 frases, ≥ 90 de 96 como `pt` y 0 como `es`; en
es_419, 102 de 102 como `es`. Riesgo **bajo** (si duda, no cambia nada), esfuerzo **bajo**.
**[sin verificar]** con guiones reales de creadores, que no son frases de Wikipedia.

### 11.8 Interfaz, textos y preferencias

**Obligatorio aunque la app NO se traduzca al portugués** (leer un guion en portugués con la app
en español o inglés, como hoy se lee uno en inglés con la app en español):

- **C8. El botón de idioma del guion** (`EditorView.tsx:414-427`, `EditorCabecera.tsx:115`) es un
  interruptor ES↔EN. Con tres idiomas tiene que rotar `es → en → pt → es` o abrir una lista corta.
  Propuesta no probada: `const ORDEN = ['es','en','pt']; idioma: ORDEN[(ORDEN.indexOf(guion.idioma)+1) % ORDEN.length]`.
  Riesgo **bajo**, esfuerzo **bajo** con rotación; **medio** con lista. Decide Javier.
- **C9. El nombre del idioma**: `NOMBRE_IDIOMA` (`EditorView.tsx:447`) y los ternarios
  `App.tsx:1353`, `EditorView.tsx:832`, `IndicadorPrecarga.tsx:50` eligen `idiomaEn`/`idiomaEs`.
  Sumar la clave `idiomaPt` en `src/textos/es.ts` (cerca de `:290-291`: `idiomaPt: 'portugués'`) y en
  `en.ts` (`'Portuguese'`), y reemplazar los ternarios por un mapa. Además, `IndicadorPrecarga.tsx:50`
  usa el idioma **de la app** donde debería usar el de la voz que falta. Riesgo **bajo**, esfuerzo **bajo**.
- **C10. Textos que dicen "dos idiomas"**: `es.ts:307` (`marcaGuiaIdioma`) y `:309` funcionan con
  `{idioma}`; revisar cualquier texto que diga "ES/EN" (en el sitio, `sitio/fuente/textos/es.js:142`).
- **Preferencias**: el idioma del guion vive en el guion (IndexedDB y la copia de seguridad en la
  nube, que guarda el guion entero) y `idiomaElegido` ya marca la elección manual. El idioma de la
  app vive en `localStorage` (`idioma.ts:53`, `:121`) y en Android (`IdiomaAppPlugin.java`).
  **No hace falta guardar nada nuevo.** **[sin verificar]** que la copia de seguridad en la nube no
  valide el campo `idioma` contra `'es' | 'en'`: no se leyó su código de servidor.
- **Precarga**: `App.tsx:1328-1332` baja en silencio la voz del idioma de la **app**; con la app en
  español nunca se pediría el portugués hasta abrir un guion en portugués (`App.tsx:1335-1338`), que
  es lo correcto: 31 MB solo para quien lo usa.

**Opcional: traducir la app al portugués** (es otra decisión, como la I1 b de
`docs/decisiones-de-diseno.txt:1388-1425` para el inglés):

| Cambio | Archivo:línea |
|---|---|
| `IdiomaApp = 'es' \| 'en' \| 'pt'` y `normalizarIdioma` que reconozca `pt` | `src/lib/idioma.ts:10`, `:25-26`, `:54` |
| Aceptar `"pt"` | `IdiomaAppPlugin.java:59` |
| `<locale android:name="pt-BR" />` | `res/xml/locales_config.xml` |
| `src/textos/pt.ts` con las mismas claves que `es.ts` (unas 175) | nuevo, `src/textos/index.ts` |
| Guion de bienvenida escrito en portugués, no traducido | `src/app/bienvenida.ts:15`, `:19` |
| Opción "Português" en Ajustes; enlaces de ayuda y correo | `PanelAjustes.tsx:236-241`, `:340-341`, `:568`, `:590`, `:596` |
| Fechas y números `pt-BR` | `src/textos/index.ts:54-57`, `:71` |
| `res/values-pt-rBR/strings.xml` para el nombre y los textos nativos | junto a `res/values-en/` |

Riesgo **bajo** (no cambia lógica), esfuerzo **medio** (texto). Las fuentes que carga
`src/main.tsx` (latin y latin-ext) ya cubren `ã õ ç` **[sin verificar visualmente]**.

### 11.9 Números

Vosk pt entrega los números como palabras ("vinte e três"), igual que Vosk es. Si el guion dice
"23", el seguidor no calza (`normalizar` deja "23"). **Esto ya pasa hoy en español**: no se encontró
en `src/lib/` ninguna conversión de cifras a palabras para el seguidor (búsqueda de "número",
"cifra", "veinti" en `src/lib`). Por eso es **opcional** y aplica a todos los idiomas: el seguidor
salta la cifra y recupera en la palabra siguiente (`SALTO_PARCIAL_SIN_EXACTAS`, `seguidor.ts:70-71`).
Si se quisiera, sería una función `cifraAPalabras(n, idioma)` en `tokenizarGuion` que genere los
tokens hablados ("vinte", "e", "três") para la comparación pero muestre "23". Riesgo **medio**
(cambia la cuenta de tokens, que afecta el avance), esfuerzo **medio**. No se midió cuánto pesa en
guiones reales.

### 11.10 Pruebas nuevas

`docs/decisiones-de-diseno.txt` R1 permite solo pruebas de lógica que no se ve. Propuestas:

| Prueba | Archivo | Qué comprueba |
|---|---|---|
| `detectarIdioma` con párrafos pt reales, mezclados y cortos; el criterio de 11.7 | `src/pruebas/detectarIdioma.test.ts` (hoy 7 pruebas) | pt sale `pt`; es y en siguen como hoy |
| `idiomaDeVoz('pt')`, `('pt-BR')` → `'pt'`; desconocido → `'es'` | prueba de `vozAPedido` | la regla única |
| `normalizar('ação')` ≠ `normalizar('ao')`; `'à'` no queda vacío; el español byte a byte igual | prueba del seguidor | C4 sin romper el español |
| Seguidor con un guion pt y lo oído por `MotorFake` (con contracciones y "não") | prueba de seguidor | avanza sin retrocesos (`metricas.ts`) |
| `ATADAS` con pt | `src/pruebas/subtitulos.test.ts` (hoy 11) | un subtítulo no termina en "do" o "pelo" |
| `carpetaModelo("pt") == "model-pt"`; `"fr"` → `"model-es"` | `android/app/src/test/...` (JUnit, como `CopiaViejaDelModeloTest.java`) | el plugin |
| Banco con tomas pt reales | `docs/registros/` (hoy `ingles-27-sep`, `motor-24-sep`…) y `npm run banco` | las lecturas del padre de Javier (sección 7.3); `repetidor.ts:213` ya usa `detectarIdioma` |

### 11.11 Orden de implementación

1. **Modelo**: `bajar-modelo.mjs` con pt y la reorganización (11.4). Comprobar en el teléfono que
   vosk-android carga `model-pt` desde assets (APK de prueba). Si no carga, se para aquí.
2. **Motor y plugin** (C1, C2): el idioma `pt` llega hasta Java. Grabar las lecturas del padre de
   Javier y medir latencia y procesador en el moto g86 (C3).
3. **Detector** (11.7) y **botón del guion** (C8, C9), con sus pruebas.
4. **Normalización** (C4) solo para `pt`, con `npm run banco` en español idéntico; **ATADAS** (C6).
5. **Paquetes de Play** (11.5) y `play.mjs`; medir el tamaño con bundletool.
6. **Ficha y sitio** (sección 12).
7. Opcional, después y con datos: fonética pt (C7), números (11.9), traducir la app (11.8).

### 11.12 Lo que no se pudo comprobar en esta parte

- Que vosk-android 0.3.75 cargue pt-0.3 reorganizado: solo se probó con Vosk 0.3.45 en el PC.
- Procesador, memoria y latencia de pt en el moto g86 grabando video.
- Que Vosk pt entregue siempre las contracciones separadas.
- Si la copia de seguridad en la nube acepta `idioma: 'pt'` (no se leyó el servidor).
- El efecto real de C4 en las 28 tomas de Javier: no se corrió `npm run banco`.
- El detector se midió con un puerto a Python sobre FLEURS, no con el TypeScript dentro de la app.
- Los números de línea son los de `main` `9b5cf53`; los marcados con `~` son aproximados.

## 12. Lo que hay que actualizar en la ficha de Google Play y en el sitio para lanzar portugués

Fuente oficial de Play: "Traduce y localiza tu app", Ayuda de Play Console
(<https://support.google.com/googleplay/android-developer/answer/9844778?hl=es-419>, leída el
21-10-2026). Dice que la ficha se traduce en *Fichas de Play Store → Administrar traducciones*, que
`pt-BR` está en la lista de idiomas, que sin recursos gráficos traducidos se muestran los del idioma
predeterminado, y que si no hay traducción Play puede ofrecer una traducción automática de la
ficha. También ofrece traducción automática gratuita a `pt-BR`, marcada como "no revisada por
personas".

### 12.1 Dónde está hoy cada cosa en el repositorio

| Qué | Dónde | Nota |
|---|---|---|
| Textos de la ficha (título, breve, completa) | `docs/play/ficha/textos-es-419.txt`, `textos-en-US.txt` | **corrige la sección 8**: la ficha ya está en `main` |
| Capturas, gráfico de funciones, tabletas | `docs/play/ficha/capturas/{es-419,en-US}/`, `grafico-1024x500-{es,en}.png` (`docs/play/ficha/LEEME.md:5-12`) | |
| Armado de la ficha | `scripts/ficha.mjs:35`, `:47`, `:61`, `:81`, `:107` (recorre `['es-419','en-US']`) | |
| Notas de la versión | `docs/play/notas-version.txt` (bloques `<es-419>` y `<en-US>`), leído por `scripts/playApi.mjs:58-60` | |
| Lista para antes de subir | `docs/play/ANTES-DE-SUBIR.txt` (seguridad de los datos en `:58-59`) | |
| Tamaños por paquete | `scripts/play.mjs:220-221` (perfiles con `supportedLocales: ['es-419']`), `:237` | |
| Sitio web | `sitio/`: plantillas `sitio/fuente/*.html`, textos `sitio/fuente/textos/{es,en}.js`, armado `sitio/armar.mjs`, hospedaje `sitio/firebase.json` | no hay `fastlane/metadata` ni `store-listing` en el repo |

### 12.2 Ficha de Play

| Cambio | Obligatorio | Detalle y archivo |
|---|---|---|
| Agregar el idioma `pt-BR` a la ficha | sí | en Play Console (fuente arriba) y `docs/play/ficha/textos-pt-BR.txt` nuevo, con el mismo formato |
| Título, descripción breve y completa en portugués | sí | escritas, no traducidas palabra por palabra (misma regla que el inglés, I1 b) |
| Decir qué idiomas sigue la voz | sí | `textos-es-419.txt:53` y `textos-en-US.txt:53` dicen "en español y en inglés, y sigue tu voz en los dos": hay que cambiarlo en las tres fichas. `:62` ("la voz de tu idioma se descarga sola") sigue valiendo |
| Capturas con la interfaz y un guion en portugués | sí si la app se traduce; si no, un guion en portugués con la app en inglés | `docs/play/ficha/capturas/pt-BR/` nuevo; sin ellas Play muestra las del idioma predeterminado (fuente arriba) |
| Gráfico de funciones en portugués | recomendado | `grafico-1024x500-pt.png`, y `scripts/ficha.mjs:61` hoy elige es o en con un ternario |
| Video | opcional | **no determinado**: no se encontró en el repo si la ficha publicada tiene video |
| `scripts/ficha.mjs` y `scripts/playApi.mjs` con `pt-BR` | sí si se usan para subir | `ficha.mjs:35`, `:47`, `:81`, `:107`; `playApi.mjs:58-60` solo lee `<es-419>` y `<en-US>`: hay que sumar `<pt-BR>` para que suba las notas en portugués |
| Notas de la versión en portugués | sí | `docs/play/notas-version.txt`, bloque `<pt-BR>` |
| Lista de idiomas de la app que muestra Play | si la app se traduce | Play la toma de los recursos del paquete (`res/values-*`), no se escribe a mano **[sin verificar en la documentación]** |
| Seguridad de los datos | probablemente no cambia | el modelo pt corre en el teléfono como el español: el audio no sale del teléfono (`docs/lo-que-hay-que-saber.txt:~48`). La descarga la hace Play. **No determinado** qué está declarado hoy en Play Console |
| Países de distribución | decisión | Brasil tiene que estar en la lista de países; **no determinado** si ya está: se configura en Play Console y no está en el repo |
| Tamaño | informar | `model_pt` es on-demand: no suma a la instalación; quien lea en portugués baja unos 31 MB comprimidos (52 MB desempaquetado). Medir con `scripts/play.mjs` sumando un perfil `supportedLocales: ['pt-BR']` en `:220-221` |
| Política de privacidad enlazada en la ficha | sí si hay página pt | la URL por idioma (12.3) |

### 12.3 Sitio web

El sitio sí está en el repositorio (`sitio/`). Hoy arma dos idiomas:

| Cambio | Archivo:línea | Obligatorio |
|---|---|---|
| `sitio/fuente/textos/pt.js` con las mismas claves (el armado se para si falta una, `es.js:3-6`), `idioma: 'pt'`, `locale: 'pt_BR'` y rutas `/pt`, `/pt/privacidade`, `/pt/suporte`, `/pt/ajuda`, `/pt/excluir-conta` | nuevo | sí |
| `for (const idioma of ['es', 'en'])` → con `'pt'` | `sitio/armar.mjs:78` | sí |
| Comprobación de claves solo entre es y en | `sitio/armar.mjs:86-87` | sí |
| "El otro idioma": `IDIOMAS[t.idioma === 'es' ? 'en' : 'es']` solo admite dos | `sitio/armar.mjs:102`, `:107` | sí |
| `hreflang`: sumar `<link rel="alternate" hreflang="pt-BR" …>` (x-default sigue en español) | `sitio/armar.mjs:108-110` | sí |
| Selector ES · EN → ES · EN · PT | `sitio/armar.mjs:141`, `sitio/fuente/franja.js:7` | sí |
| Elección automática por idioma del navegador | **no determinado**: no se encontró dónde se decide (no aparece `navigator.language` en `sitio/fuente/*.js`); revisar `armar.mjs` y `firebase.json` | sí |
| Textos que nombran idiomas | `sitio/fuente/textos/es.js:51`, `:142` ("ES/EN es el idioma en que Sigo escucha"), `:146`, y sus pares en `en.js` | sí |
| Política de privacidad y página para borrar la cuenta en portugués | plantillas `sitio/fuente/privacidad.html`, `borrar-cuenta.html` y sus claves en `textos/*.js` | sí si la ficha pt enlaza a ellas |
| Términos | **no determinado**: no hay página de términos en `sitio/fuente/` | — |
| Correo de contacto en portugués | `sitio/fuente/textos/es.js:85` (es `hola@`, en `hello@`); `PanelAjustes.tsx:596` | decisión |
| Capturas del sitio en portugués | `sitio/fuente/capturas/` | opcional |
| Sitemap | **no determinado**: no se encontró sitemap en `sitio/armar.mjs` | — |

### 12.4 Lo que no se pudo determinar

- **Qué hay publicado hoy en Play Console** (idiomas de la ficha, países, video, seguridad de los
  datos): no está en el repo y no hay acceso a la consola desde aquí.
- **Qué sirve hoy `sigoteleprompter.com`**: solo se leyó la fuente; no se comparó con lo publicado.
- Si Play arma la lista "idiomas" de la ficha a partir de `res/values-*`: no lo dice la página
  citada.
- Las traducciones mismas: no se escribió texto en portugués; el padre de Javier o alguien nativo
  debería revisarlo.

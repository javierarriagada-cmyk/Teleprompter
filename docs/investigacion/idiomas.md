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
  están cableados en el motor nativo y en el plugin de Java.
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

- Letras: sumar `ãõçâêôà` a `normalizar` y a `subtitulos.ts` (hoy "ação" y "ao" chocan).
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
| Ficha de Play | **no existe todavía en `main`**: `docs/play/ficha/` es la entrega de la tarea 86 | `docs/tarea86.txt` |
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

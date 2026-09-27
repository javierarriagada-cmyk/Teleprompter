# El sitio — sigoteleprompter.com

Version 2, 27-09-2026. Reemplaza a la primera, que produjo una pagina correcta y plana. Javier
sobre esa pagina: "parece una landing page de bajo presupuesto", "la parte de abajo la podria
haber hecho yo en word". Esta version empieza por la vara.

Antes de empezar: `docs/lo-que-hay-que-saber.txt` -producto, tono, reglas-.

## 1. La vara

Una pagina de producto de nivel mundial. El que entra tiene que decir "wow" en los primeros
tres segundos y querer bajar para ver que sigue. Si una seccion podria estar en un documento
de Word, esta mal. Si parece plantilla, esta mal.

Referentes, y que tomar de cada uno -estudiarlos antes de escribir codigo-:

- **Apple, paginas de producto (iPhone, AirPods, Vision Pro).** El producto fijo en pantalla
  mientras el scroll lo transforma: gira, se acerca, cambia lo que muestra. Titulares enormes.
  Una idea por pantalla.
- **Linear.** La interfaz del producto como protagonista, nitida a gran escala, iluminada sobre
  fondo oscuro, con brillo y profundidad.
- **Stripe.** Movimiento que explica: cada animacion muestra como funciona algo.
- **Raycast y Arc.** Personalidad y detalle en las microinteracciones.
- **Ganadores de Awwwards (Site of the Day / of the Year).** Coreografia de scroll, tipografia
  como imagen, transiciones entre escenas.

### Lo que se miro el 27-09-2026, y que se toma

- **flighty.com** -app de un solo producto, premio Apple Design 2023-. El telefono queda FIJO
  al centro mientras se baja, y una pildora de capitulos pegada abajo -Preflight / At the
  airport / After landing- cambia lo que muestra la pantalla. Alrededor del telefono flotan
  tarjetas con los momentos que la app resuelve -"Mom landed in New York", "Gate changed"-,
  que aparecen y se apagan. El fondo pasa de claro a oscuro con el scroll. **Para Sigo:** el
  telefono fijo con una pildora de capitulos -Leer · Te espera · Tu guion · Grabar ·
  Subtitulos · Sin internet- y tarjetas flotantes con los momentos de quien lee -"Te
  detuviste: el texto espera", "El renglon queda bajo el lente"-.
- **halide.cam** -camara para iPhone-. Entrada con telefonos inclinados en 3D flotando sobre
  un fondo desenfocado de su mundo. Despues, **una comparacion lado a lado** que prueba la
  diferencia sin explicarla. **Para Sigo:** la comparacion que nadie mas puede hacer -ver E2-.
- **apple.com/airpods-pro** -"Get the highlights"-. Un carrusel horizontal de peliculas
  cortas por funcion, con una pildora de progreso y play. Titulares enormes de una linea
  -"Take a closer look."- que separan capitulos. **Para Sigo:** titulares de capitulo de una
  linea, y los detalles -espejo, recuadro, calidad, brillo- en un carrusel de clips cortos
  en vez de una lista.

## 2. Libertad tecnica

El sitio no es la app: se usan las herramientas que usan esas paginas.

- **GSAP con ScrollTrigger** -gratis desde 2025, incluidos sus plugins-, **Lenis** para el
  scroll suave, **Three.js** si el telefono en 3D lo pide. Pueden ir desde cdn.jsdelivr.net
  o incluidas en `sitio/`.
- Canvas, SVG, WebGL, video: lo que haga falta.
- Rendimiento: fluido -60 cuadros- en un Android de gama media -la referencia es un moto g86-,
  primera pantalla en menos de 2,5 s. Imagenes y videos livianos.

## 3. El protagonista: la pantalla de Sigo

El centro de toda la pagina es **un telefono con la pantalla de lectura de Sigo**, dibujado en
HTML/CSS -nitido a cualquier escala, sin capturas pixeladas-. Lleva lo que hace unica la
lectura de Sigo, visible:

- la letra de lectura -Source Serif 4-, grande, sobre el fondo oscuro;
- **negrita**, palabras en **ambar #F0C070, celeste #8FB8DE y verde #9CC5A1**, y el
  **destacado amarillo #FFE066** con letra #111 -los formatos del editor, `COLORES_TRAMO` y
  `DESTACADO` de `src/datos/modelo.ts`-;
- la **linea crema bajo las palabras que se estan diciendo**;
- el **velo**: la zona de lectura clara arriba, el resto mas tenue;
- el texto **avanzando con los tiempos reales** de una lectura.

Para los tiempos ya existe el armado de la version 1: `sitio/fuente/lectura.js` corre al armar
y produce el JSON `[ms, palabra]`; `sitio/fuente/demo.js` lo dibuja. Se reutiliza. El guion que
se muestra tiene que llevar los formatos puestos -ver 5-.

## 4. El guion de la pagina, escena por escena

Cada escena es una pantalla completa, con el telefono como protagonista y el scroll como hilo.
Los textos que ve la gente van en espanol neutro, con tuteo, y con tildes.

**E0 — Entrada.** Negro profundo. La marca "Sig●" enorme -el trazo de
`src/components/trazoMarca.ts`, que se LEE y no se edita-, con el punto rojo encendido como la
luz de grabacion de una camara, con un resplandor. Titular gigante: *El teleprompter que sigue
tu voz.* El telefono sube a escena con la lectura ya en movimiento. Una luz tibia barre desde
arriba, donde esta el lente.

**E1 — Sigue tu voz.** El telefono queda fijo al centro. Una onda de voz dibujada -sincronizada
con los mismos tiempos- entra por un costado y cada palabra se enciende cuando la onda la
alcanza. Texto: *Hablas y el texto avanza contigo. Sin tocar nada.* El titular se arma palabra
por palabra con el scroll.

**E2 — Te espera. La comparacion.** Dos telefonos lado a lado, con la MISMA lectura y la misma
onda de voz. El de la izquierda es un teleprompter comun, que corre a velocidad fija. El de la
derecha es Sigo. Cuando la voz hace una pausa -la onda se aplana-, el de la izquierda sigue
corriendo y la frase que se iba a decir se escapa por arriba. Sigo se queda quieto, el punto
rojo respira, y cuando la voz vuelve, sigue. Nadie mas puede mostrar esto, y se entiende en
dos segundos, sin sonido. Texto: *Los demas corren. Sigo te espera.* y debajo: *Si te
detienes a pensar, el texto espera. Cuando vuelves a hablar, sigue contigo.* Sin nombres de
otras aplicaciones: el de la izquierda es "un teleprompter comun".

**E3 — Tu guion, con intencion.** Con el scroll, el mismo texto se va pintando en el telefono:
aparece la negrita, se colorean palabras en ambar, celeste y verde, el destacado amarillo barre
una frase. Texto: *Marca lo que quieres decir con fuerza. Pinta los cambios de tono. Destaca lo
que no se te puede pasar.*

**E4 — Mirando al lente.** El telefono gira en 3D con el scroll hasta mostrar la camara
frontal; un haz de luz une el lente con el renglon que se lee, justo debajo. Texto: *El texto
queda bajo la camara. Tu mirada va al lente, no a la pantalla.* Luego el modo de grabacion: la
imagen de camara detras del texto -una escena abstracta con luz y desenfoque, sin caras
inventadas- y el panel translucido de lectura encima.

**E5 — Subtitulos.** El telefono se vuelve un cuadro de video. Los subtitulos aparecen palabra
por palabra, y con el scroll cambian entre los tres estilos de la app -amarillo, rojo, formal-.
Texto: *Al terminar, tu video lleva subtitulos que salen de tu guion, al ritmo de tu voz.*

**E6 — Sin internet.** Las barras de senal del telefono se apagan una a una, aparece el modo
avion, y el texto sigue avanzando igual. Texto: *Funciona sin internet. Tu voz no sale del
telefono.*

**E7 — Cierre.** La marca enorme otra vez, la frase, y *Pronto en Google Play.* -texto, no
boton, hasta que exista la ficha-. Pie: Privacidad · Soporte · hola@sigoteleprompter.com ·
© Sigo.

## 5. El guion que se lee en el telefono

Usar un texto que muestre los formatos como se usarian de verdad, por ejemplo:

> Hoy quiero contarte algo **importante**. Durante anos grabe videos mirando un papel,
> y se notaba. Ahora leo, hablo y el texto me sigue. *[ambar]* Sin apuro. *[celeste]* Sin
> perder el hilo. Y lo que no se me puede pasar, *[destacado]* lo marco en amarillo.

Los tiempos: se arman con `lectura.js` sobre una toma real del corpus; si el texto del telefono
no coincide con una toma, se estiman a un ritmo natural -150 palabras por minuto, pausa en los
puntos- y se dice en el informe que son estimados.

## 6. Como se ve

- Paleta de la app: suelo #151312, y para la entrada un negro mas hondo #0B0A09; letra
  #E7E1DE; crema #F2ECE8; apagado #9C948E. El rojo #E11D2E es la luz de grabacion: no pinta
  fondos ni botones.
- Letras: Source Serif 4 para titulares y lectura, Source Sans 3 para el resto. Escala
  generosa: titulares de 96 a 160 px en computador, de 44 a 64 px en telefono.
- Luz y materia: resplandores tibios, grano de pelicula sutil, profundidad, sombras largas del
  telefono.
- Movimiento coreografiado y ligado al scroll. Con `prefers-reduced-motion`, cada escena se
  muestra quieta en su mejor cuadro.
- **Primero el telefono**: perfecta en 360-430 px vertical -la mayoria llegara desde Play o
  redes-, y espectacular en 1280-1920 px.

## 7. Pocas reglas, que no se discuten

- **Nada de la logica de la app en lo publicado.** Todo JavaScript publicado se puede leer:
  ni copiado ni reescrito el seguidor, el avance, la conduccion, el destacado, la banda. Lo
  que la pagina muestra sale del JSON armado -ver 3-. La comprobacion de `armar.mjs` que
  detiene el armado si `demo.js` importa algo de `src/` se mantiene.
- Solo lo que es cierto hoy: sigue la voz, espera, funciona sin internet, graba con el texto
  bajo el lente, subtitulos en tres estilos, formatos del editor. Nada de precios, IA, "el
  mejor", usuarios, otros idiomas, version web.
- Sin nombres de otras aplicaciones. Sin botones que no lleven a nada.
- `/privacidad` y `/soporte` se mantienen, con el mismo nivel visual. En privacidad, nombrar
  el microfono y la camara: la app los usa y nada sale del telefono.

## 8. Como se trabaja

- Rama `sitio-nuevo`, el mismo pull request #48. Solo `sitio/` y este documento.
- Antes de programar: una nota corta en el PR con los referentes que miraste y que tomas de
  cada uno, escena por escena.
- Al terminar: capturas de cada escena a 390 px y a 1440 px en el PR, y que quedo sin hacer.
- No se publica en Firebase: eso lo hacemos aca, primero en un canal de prueba.

## 9. Terminado es

- Las ocho escenas estan, coreografiadas con el scroll, con el telefono de protagonista.
- Se ve y se mueve fluido en un telefono de 390 px y en un computador de 1440 px.
- El telefono muestra negrita, los tres colores, el destacado y la linea.
- Ninguna seccion se podria haber hecho en Word.

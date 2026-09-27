# El sitio — sigoteleprompter.com

Especificacion del sitio. Decidida con Javier el 26-09-2026. El texto que ve la gente -entre asteriscos- va con tildes y en espanol neutro, con tuteo. Lo que no esta aca no se
inventa: se pregunta. Leer antes `docs/lo-que-hay-que-saber.txt` -producto, reglas, tono-.

- Dominio: https://sigoteleprompter.com (el www ya redirige ahi).
- Hosting: Firebase Hosting, proyecto `sigoteleprompter`. Configuracion en `sitio/`.
- Hoy en el aire: la pagina provisoria que genera `sitio/armar.mjs`. Esta especificacion la
  reemplaza entera.

## 1. La vara

Javier: la pagina tiene que ser **"impactante, al nivel de la app"**, **"de un nivel
altisimo"**. No es la provisoria con mas texto. Tampoco una landing de plantilla: nada de
degradado morado, iconos de colores en tres columnas, mockup de iPhone bajado de un kit,
fotos de stock ni "numeros" inventados.

La pagina vende una sola idea, que ya es la frase de la marca:

> El teleprompter que sigue tu voz.

Todo lo que entre tiene que sostener esa frase. Lo que no la sostiene, no entra.

## 2. El corazon: la app funcionando, no una imagen de la app

Lo primero que se ve -arriba, sin bajar- es **la pantalla de lectura de Sigo, dibujada en
HTML con los mismos colores, letras y destacado de la app, avanzando con los tiempos reales
de una lectura real.**

- **REGLA PRIMERA: LA PAGINA ES PUBLICA Y NO LLEVA NADA DE LA LOGICA DE LA APP.** Todo
  JavaScript publicado se puede leer. Ni copiado ni reescrito: nada de seguidor, avance,
  conduccion, destacado, renglones, banda ni avanzarTrabado. Lo que decide vive en la app;
  la pagina solo mide y dibuja. -Corregido el 26-09-2026: la primera version de esta
  especificacion nombraba esos archivos como modelo, y la pagina los termino copiando.-
- **LO QUE SE CALCULA AL ARMAR, en tu computador, con un script de `sitio/` que NO se
  publica:** de un registro `<id>.motor.txt` -ejemplo:
  `src/pruebas/corpus/toma-a5bc922c-salto.motor.txt`- sale un JSON con el guion y, para
  cada momento, el tiempo y el indice de la palabra destacada. El script puede importar
  codigo de la app, porque corre solo al armar. Al publico llega unicamente el JSON: es el
  resultado del motor, que igual se ve en cualquier video, no el metodo.
- **LO QUE SE CALCULA EN LA PAGINA:** donde quedo esa palabra en ESTA pantalla -se mide en
  el DOM, porque los renglones dependen del ancho- y un desplazamiento suave generico hasta
  ahi. El velo, un degradado fijo en CSS. No se fijan renglones al armar: un telefono y un
  computador parten las lineas distinto.
- La demostracion usa los tiempos de la toma, no un ritmo inventado. Eso es lo que hace
  verdadera la frase.
- Sonido: arranca SIN sonido. Un control a la vista lo activa y se escucha la voz, con el
  texto siguiendola. Sin audio todavia -ver 6-, la demostracion funciona igual en silencio.
- Tiene que verse como la app de verdad: fondo `#151312`, letra `#E7E1DE`, Source Serif 4,
  la linea del destacado bajo las palabras que se dicen, el velo arriba y abajo de la
  ventana de lectura. Se imita el ASPECTO mirando la app; el codigo de la app no se copia.
- Perfecta en un celular -de 360 a 430 px de ancho, vertical- y en un computador.
- Vuelve a empezar sola al terminar, con una pausa.
- Con `prefers-reduced-motion`: se muestra quieta, en un momento con el destacado visible,
  y un boton para reproducirla.

Los datos provisorios para construirla salen de una toma del corpus. La definitiva es una
lectura corta que Javier grabara para la pagina -15 a 20 s, con audio-, al final del trabajo.

## 3. Lo demas de la pagina, en orden

1. **Marca**: el trazo de `src/components/trazoMarca.ts`, como hoy en `armar.mjs`. "Sig" y
   el punto rojo. El logo de la pagina y el de la app son la misma forma. `trazoMarca.ts` se
   LEE, no se edita.
2. **Frase**: *El teleprompter que sigue tu voz.* Y una linea de apoyo: *Lees en voz alta y
   el texto avanza contigo. Si quieres, te graba mientras.*
3. **La demostracion** -seccion 2-.
4. **Tres promesas, ninguna mas.** Cada una cierta hoy:
   - *Sigue tu voz, no un reloj.* Si te detienes a pensar, el texto te espera.
   - *Funciona sin internet.* Tu voz no sale del teléfono.
   - *Grábate mirando a la cámara.* El texto queda bajo el lente; al terminar, subtítulos
     que salen de tu guion.
5. **Para quien**: una linea. Clases, charlas, cursos, videos, entrevistas: Sigo es para
   todo el que lee en voz alta, no solo para videos cortos.
6. **Disponibilidad**: *Pronto en Google Play.* Texto, no boton ni insignia, hasta que
   exista la ficha.
7. **Pie**: Privacidad · Soporte · hola@sigoteleprompter.com · © Sigo.

No va: ninguna mencion a una version web o de escritorio -no esta decidida-, precios,
"gratis", "el mejor", "inteligencia artificial", idiomas que el motor no escucha, redes
sociales, cantidad de usuarios, comparaciones con otras aplicaciones.

## 4. Privacidad y soporte

Play Console pide las dos direcciones en el dominio. Cortas, en espanol neutro, y ciertas:

- `/privacidad`: los guiones viven en el telefono; las tomas tambien, y en la galeria si la
  persona las guarda; el reconocimiento de voz corre en el telefono y el audio no se manda a
  ningun servidor; Sigo no tiene cuentas; el sitio no usa cookies de seguimiento ni
  analitica. Contacto: hola@sigoteleprompter.com.
- `/soporte`: que es Sigo en dos lineas, que hoy es para Android, y como avisar un problema
  -que telefono, que version de Android, que estaba haciendo- a hola@sigoteleprompter.com.

Nada de "usamos cookies para mejorar tu experiencia", formularios, chats, ni texto legal
copiado de un generador. `cleanUrls` ya esta en `firebase.json`: `privacidad.html` se sirve
en `/privacidad`.

## 5. Como se ve y como se construye

- Paleta de la app, en oscuro: fondo `#151312`, letra `#E7E1DE`, apagado `#9C948E`. El rojo
  `#E11D2E` es solo el punto de la marca -en la app el rojo es grabar; aca no decora-.
- Letras: Source Serif 4 para la frase y la lectura; Source Sans 3 para el resto.
- Tiene que verse perfecto en un telefono -ahi la van a abrir desde Play- y en un
  computador. Sin desplazamiento lateral.
- Movimiento con intencion: la demostracion es el movimiento. Nada de secciones que "entran
  volando".
- HTML, CSS y JavaScript sin dependencias ni framework: es una pagina, no una app. Las
  fuentes, de Google Fonts o incluidas.
- Rapida: sin imagenes pesadas; lo que se muestra de la app es HTML.
- Todo en `sitio/`. Si un cambio toca `src/`, `android/` o una `docs/tarea*.txt`, esta mal.
- `sitio/armar.mjs` puede seguir generando la pagina -asi el logo sale siempre del trazo- o
  dejar de usarse; decidirlo en el trabajo y explicarlo.

## 6. Lo que pone Javier, no el que construye

- La lectura corta para la demostracion, con audio -al final-.
- Que la pagina salga al dominio: se publica primero en un canal de prueba de Firebase
  (`firebase hosting:channel:deploy`) y Javier la mira en su telefono. Al dominio, solo con
  su OK.

## 7. Terminado es

- La portada muestra la lectura avanzando con tiempos reales, y se entiende sin sonido.
- Se ve bien en un telefono de 360 px de ancho y en un computador.
- `/privacidad` y `/soporte` cargan, se leen en el telefono y llegan desde el pie.
- Ningun boton o enlace que no lleve a algo.
- El diff no toca nada fuera de `sitio/` y `docs/el-sitio.md`.

# Teleprompter

Teleprompter que sigue la voz del lector. React + Vite + TypeScript. Todo ocurre en el
dispositivo: no hay servidor, no hay cuentas, no hay telemetria, y no los va a haber.

Destino: aplicacion Android publicada en Google Play, empaquetada con Capacitor.

---

## Antes de todo: el criterio

La aplicacion se llama **Sigo — Teleprompter de voz**. Este archivo es el mapa del codigo;
el criterio con que se trabaja, lo que ya se decidio y lo que falta estan en dos documentos
que hay que leer ANTES de proponer o cambiar nada:

- `docs/lo-que-hay-que-saber.txt` — el producto, como se trabaja con Javier, las reglas del
  codigo y del diseño, donde esta todo y que no se puede hacer sin el telefono.
- `docs/decisiones-de-diseno.txt` — cada decision con su estado y quien la toma. Lo cerrado
  no se reabre sin que Javier lo pida.

Con Javier: siempre en español, tuteo chileno. En pantalla: español neutro.

**Lo que está en un comentario «Antes:» es historia, no lo que hace la app hoy.** Es el código
que se reemplazó, guardado a propósito con su razón. Igual `docs/archivo/`: encargos, bocetos y
planes viejos. Cómo es la app hoy lo dice el código de main fuera de esos comentarios -15-10-2026:
un estudio describió pantallas que ya no existen por leerlos como vigentes-.

---

## Lo primero: no explores el repositorio entero

Este archivo es el mapa. Anda directo a los archivos que nombra tu tarea. Recorrer todo el
codigo para orientarte es tiempo perdido: aca esta lo que necesitas saber.

---

## Las capas

Cada capa solo conoce a la de abajo. La presentacion NUNCA habla directo con el dispositivo
ni con el motor de voz.

    PRESENTACION   App.tsx, components/
    SEGUIMIENTO    lib/seguidor.ts, lib/avance.ts, lib/registro.ts, hooks/useSeguidor.ts
    MOTOR DE VOZ   motor/            <- interfaz MotorDeVoz y sus implementaciones
    DISPOSITIVO    hooks/useWakeLock.ts, lib/camara.ts, los plugins de android/app/src/main/java
    AUDIO          workers/, public/vad-processor.js, lib/remuestrear.ts  -solo el motor web-
    Antes -hasta el 15-10-2026-:
    DISPOSITIVO    hooks/useWakeLock.ts, y lo que venga (camara, archivos)
    AUDIO          workers/, public/vad-processor.js, lib/segmentador.ts, lib/remuestrear.ts
    -lib/segmentador.ts se borro con la limpieza del reconocedor web, commit d0f0cf6-.

## Mapa de archivos

| archivo | que hace |
|---|---|
| `src/lib/seguidor.ts` | DONDE ESTOY en el guion. Calza lo dicho contra una ventana del texto. Discreto: salta. |
| `src/lib/avance.ts` | DONDE DEBEN ESTAR LOS PIXELES AHORA. Continuo. Extrapola entre calces y frena. |
| `src/lib/registro.ts` | que tramo se leyo y en que milisegundos. Materia prima de los subtitulos. |
| `src/hooks/useSeguidor.ts` | **EL CABLEADO.** Une motor de voz, seguidor, avance y registro. |
| `src/hooks/useASR.ts` | consume `MotorDeVoz`. No sabe que reconocedor hay detras. |
| `src/motor/` | `MotorDeVoz` y sus implementaciones: `MotorNativo` -Vosk compilado para Android, `VoskNativoPlugin.java`, el del telefono-, `MotorVosk` -Vosk en el navegador, `motorWeb.ts`, nunca dentro del APK- y `MotorFake` para las pruebas. `elegirMotor.ts` elige. |
| `src/lib/conduccion.ts` | el camino unico de lo oido al seguidor y al avance; lo usan la app y el banco. |
| `src/lib/deslizar.ts` | como se desliza la pantalla al cambiar de renglon: el resorte sin rebote, de fabrica. |
| `src/components/TeleprompterView.tsx` | la pantalla de lectura; el lazo `animate()` pasa de palabras a renglones y pixeles. |
| `src/components/PanelAjustes.tsx` | EL UNICO panel de Ajustes de la app, con las secciones de cada puerta. |
| `scripts/banco-motor.ts` | `npm run banco`: repite las tomas de `docs/registros` por el camino de la app y mide el motor. |
| `src/lib/remuestrear.ts` | pasa el audio a 16 kHz, que es lo unico que acepta el reconocedor. |
| `public/vad-processor.js` | AudioWorklet. **JavaScript plano y autocontenido, a proposito.** |
| `src/pruebas/lectorSimulado.ts` | genera una lectura sintetica con su verdad de referencia. |
| `src/pruebas/metricas.ts` | mide retardo, retrocesos, frenado y recuperacion. |
| `src/textos/` | los textos de la app: `es.ts` y `en.ts` con las mismas claves, `t()` y el gancho `useTextos`. |
| `src/lib/idioma.ts` | el idioma de la APP: sigue al telefono, se cambia en el cajon del engranaje. |
| `src/lib/detectarIdioma.ts` | el idioma de cada GUION, detectado al escribir o pegar. |
| `src/lib/atrasPredictivo.ts` | el atrás predictivo: si hay adónde volver, cuándo se anima, el plugin. Receptor único: `MainActivity.java`. |

Antes -la tabla hasta el 15-10-2026-: «`src/hooks/useASR.ts` | consume `MotorDeVoz`. No sabe nada de
Whisper ni de Web Speech.», «`src/motor/` | `MotorDeVoz` y sus implementaciones: WebSpeech,
WhisperLocal, Fake, Nativo.» y «`src/lib/segmentador.ts` | corta el audio en frases usando el VAD.».
WebSpeech, WhisperLocal y el segmentador se borraron con la limpieza del reconocedor web -commit
d0f0cf6-.

## No tocar salvo que la tarea lo pida por su nombre

- `public/vad-processor.js` — no se mueve, no se convierte a TypeScript, no se importa nada
  adentro. El ambito de un AudioWorklet no resuelve modulos. Ya costo una vuelta entera.
- `src/motor/` — la interfaz `MotorDeVoz` es estable.
- `src/workers/`, `src/lib/remuestrear.ts`
  Antes -hasta el 15-10-2026-: «`src/workers/`, `src/lib/segmentador.ts`, `src/lib/remuestrear.ts`»;
  el segmentador ya no existe.
- `vite.config.ts`, `tsconfig.json`, el manifest y los iconos
- Las dependencias. No agregues ninguna: si te parece que hace falta, **pregunta**.

---

## Reglas de la casa

**Nada falla en silencio.** Un `return` mudo es un defecto. Si algo se descarta, se dice por
que y con numeros. Esto se usa en un telefono, frente a la camara, sin consola a la vista:
si el prompter se detiene y no explica por que, no hay forma de saber que paso.

**Construir no es conectar, y lo que falla es conectar.** Tres veces paso lo mismo: el
mecanismo quedo bien escrito en su archivo y nadie lo enchufo en la aplicacion. Los
parciales, la correa estructural, el cruce de linea. Ninguna prueba de libreria lo nota,
porque la libreria funciona. Todo mecanismo nuevo lleva su prueba de integracion **a traves
de la aplicacion**, renderizando `<App>`, no solo su prueba de unidad.

**Pruebas de trayectoria, no de destino.** Comprobar "termina en el token 35 de 35" pasa
aunque el movimiento haya sido un salto. Cuando importa como algo evoluciona en el tiempo,
hay que muestrear el camino.

**Una prueba guardiana se verifica ROMPIENDOLA.** Leerla no alcanza. Reintroduci el defecto,
corre la tanda, confirma que falla, y **pega la salida en el informe**. Y ojo: hay que romper
el MECANISMO, no el parametro — las pruebas fijan sus propios parametros al construir los
objetos, y varias protecciones estan implementadas en dos lugares.

**Los umbrales no se mueven.** Si una prueba falla, informa el numero real. Un umbral puesto
justo encima del valor que salio no comprueba nada: certifica el defecto como aceptable.
Una prueba en rojo con el numero verdadero vale; una en verde con el umbral corrido, no.

**`npx tsc --noEmit` aparte, siempre.** Vitest transpila sin comprobar tipos: las pruebas
pueden pasar con el proyecto sin compilar.

---

## Comprobaciones

```bash
npm ci
npx tsc --noEmit
npm run test
npm run build
```

No hay microfono, ni Web Audio real, ni WebGPU, ni pantalla en tu maquina. El seguidor, el
avance, el segmentador, el remuestreador y las metricas son codigo puro y **si** se pueden
probar. Lo que caiga fuera de eso lo estas escribiendo a ciegas: dilo en el informe.

---

## Al terminar

**Publica la rama y abre un pull request hacia `main`.** El CI corre solo ahi `npm ci`,
`npx tsc --noEmit`, `npm run test` y `npm run build`, y deja la marca en verde o en rojo.
Esa es la comprobacion que vale.

Y en el informe, dos cosas y nada mas:

1. **Que hiciste**, concreto y con nombres de archivo. No cortesia.
2. **Que NO pudiste hacer**, y por que. Incluido lo que escribiste sin poder ejecutar, y
   cualquier defecto que hayas visto y no corregido.

NO hace falta que digas si las pruebas pasan ni que pegues resultados: de eso se encarga el
CI y la revision. Si algo del encargo te parecio equivocado, dilo; no lo cambies por tu
cuenta.

## Estilo

Comentarios en castellano, con tildes. Explican POR QUE, no que. Lo que se probo y no
funciono queda como comentario para que no se vuelva a intentar.

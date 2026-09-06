# Teleprompter

Teleprompter que sigue la voz del lector. React + Vite + TypeScript. Todo ocurre en el
dispositivo: no hay servidor, no hay cuentas, no hay telemetria, y no los va a haber.

Destino: aplicacion Android publicada en Google Play, empaquetada con Capacitor.

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
    DISPOSITIVO    hooks/useWakeLock.ts, y lo que venga (camara, archivos)
    AUDIO          workers/, public/vad-processor.js, lib/segmentador.ts, lib/remuestrear.ts

## Mapa de archivos

| archivo | que hace |
|---|---|
| `src/lib/seguidor.ts` | DONDE ESTOY en el guion. Calza lo dicho contra una ventana del texto. Discreto: salta. |
| `src/lib/avance.ts` | DONDE DEBEN ESTAR LOS PIXELES AHORA. Continuo. Extrapola entre calces y frena. |
| `src/lib/registro.ts` | que tramo se leyo y en que milisegundos. Materia prima de los subtitulos. |
| `src/hooks/useSeguidor.ts` | **EL CABLEADO.** Une motor de voz, seguidor, avance y registro. |
| `src/hooks/useASR.ts` | consume `MotorDeVoz`. No sabe nada de Whisper ni de Web Speech. |
| `src/motor/` | `MotorDeVoz` y sus implementaciones: WebSpeech, WhisperLocal, Fake, Nativo. |
| `src/lib/segmentador.ts` | corta el audio en frases usando el VAD. |
| `src/lib/remuestrear.ts` | pasa el audio a 16 kHz, que es lo unico que acepta el reconocedor. |
| `public/vad-processor.js` | AudioWorklet. **JavaScript plano y autocontenido, a proposito.** |
| `src/pruebas/lectorSimulado.ts` | genera una lectura sintetica con su verdad de referencia. |
| `src/pruebas/metricas.ts` | mide retardo, retrocesos, frenado y recuperacion. |

## No tocar salvo que la tarea lo pida por su nombre

- `public/vad-processor.js` — no se mueve, no se convierte a TypeScript, no se importa nada
  adentro. El ambito de un AudioWorklet no resuelve modulos. Ya costo una vuelta entera.
- `src/motor/` — la interfaz `MotorDeVoz` es estable.
- `src/workers/`, `src/lib/segmentador.ts`, `src/lib/remuestrear.ts`
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

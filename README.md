# Sigo — Teleprompter de voz

Teleprompter que sigue la voz del que lee. React + Vite + TypeScript, empaquetado
para Android con Capacitor. Todo ocurre en el dispositivo: no hay servidor, no hay
cuentas, no hay telemetria, y no los va a haber.

Para el mapa completo del codigo (capas, que no tocar, reglas de la casa) ver
[AGENTS.md](AGENTS.md). Este archivo es solo como levantar y probar el proyecto.

## Motor de voz

El reconocedor es Vosk en las dos formas en que corre:

- **En el navegador** (`npm run dev`): la version WASM, que baja el modelo por
  internet la primera vez.
- **Adentro del APK**, en un telefono Android real: la version nativa compilada,
  con el modelo empaquetado adentro. No descarga nada y arranca de inmediato -la
  version WASM tarda 11 a 13 segundos en entregar la primera palabra, medido con
  el telefono en modo avion.

Cual se usa no se elige a mano: `Capacitor.isNativePlatform()` decide sola
(`src/App.tsx`, `sanitizarEngine`). El selector de motor en Ajustes sigue
disponible para forzar otra opcion si hace falta.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre la URL que imprime Vite en el navegador. Sirve para iterar pantallas y
logica; la camara, el microfono y el motor de voz solo se comprueban de verdad
en un telefono, no en el navegador de escritorio.

## Pruebas y tipos

```bash
npx tsc --noEmit
npm run test
npm run build
```

Vitest transpila sin comprobar tipos, por eso `tsc --noEmit` va aparte. Estos
tres pasos, mas `npm ci`, son exactamente lo que corre el CI en cada PR contra
`main` (`.github/workflows/ci.yml`).

## Armar e instalar el APK

```bash
npm run modelo          # una sola vez: baja el modelo de voz para empaquetar
npm run apk              # vite build + cap sync + gradlew assembleDebug
npm run apk -- poner     # lo mismo, e instala en lo que este conectado por adb
```

`poner` elige el telefono por sobre el emulador si hay los dos conectados
(`npm run apk -- poner emulador` o `... poner telefono` para forzar uno). Se
necesita Java 21 (Gradle no corre con el 25 de Android Studio) y el SDK de
Android; el script (`scripts/apk.mjs`) los busca solo y avisa si falta alguno.
El APK queda en `android/app/build/outputs/apk/debug/` y una copia en el
Escritorio como `Sigo.apk`.

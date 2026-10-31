# Taller de armado APK y AAB

Guía operativa para preparar artefactos de Sigo y diagnosticar el armado. No autoriza cambios de producto, instalaciones, distribución ni publicación: cada una de esas acciones tiene que venir en la orden concreta de Javier.

## Fuentes de verdad

- `package.json`: nombres de los comandos.
- `scripts/apk.mjs`: APK debug; documenta Vite, `cap sync`, el parche de cámara, Java 21, la versión y `assembleDebug`.
- `scripts/play.mjs`: AAB release; documenta firma, R8, bundletool y sus comprobaciones automáticas.
- `scripts/revisarR8.mjs` y `scripts/parcharCamara.mjs`: revisión de clases que R8 debe conservar y parche de grabación a 14 Mbps.
- `scripts/elf16k.mjs`, `scripts/leerFicha.mjs`, `docs/play/ANTES-DE-SUBIR.txt` y `docs/play/notas-version.txt`: herramientas y lista de revisión para Play.

**Estado de esta rama:** el Taller nace de `cobro-visible`, commit `e4869f3`. `origin/main` apunta a `f6daccc`, una historia divergente que contiene `elf16k.mjs`, `leerFicha.mjs` y la lista de Play actualizada. Esos dos scripts aún no están en esta rama y su `ANTES-DE-SUBIR.txt` puede ser anterior. Antes de un AAB, trabaja desde el commit exacto solicitado y confirma que sus herramientas y lista de revisión son las vigentes; no des por hecho que esta rama las contiene ni mezcles `main` por tu cuenta.

## Regla de aislamiento

- No armes en `C:\Users\56990\Desktop\Teleprompter`: es la carpeta de Javier. Déjala en `main` y conserva cualquier cambio suyo. Trabaja en un worktree aparte, basado en la rama exacta que se va a empaquetar.
- Cada worktree tiene su propio `node_modules`; ejecuta `npm ci` cuando corresponda. Nunca enlaces `node_modules` entre carpetas.
- Los modelos Vosk son pesados y no vienen necesariamente en Git. Para una APK de prueba pueden usarse las uniones de solo lectura que Javier indique para `model-es`, `model-en` y `model-pt`; para AAB, si falta alguno, `npm run modelo` lo descarga. No copies cientos de MB si hay una unión autorizada.
- Revisa `git status` antes y después. `cap sync` puede dejar los dos `.gradle` modificados solo por finales de línea: no los comitees por eso. Un armado no implica commit, push, merge ni PR.

## APK de prueba

1. Confirma el commit y la rama objetivo, la presencia de los tres modelos, el `node_modules` propio y Java 21. `scripts/apk.mjs` busca Java 21 y el SDK de Android.
2. Si el versionCode debe considerar el teléfono instalado, verifica ADB y conecta solo el dispositivo autorizado antes de armar. El script toma el mayor entre el conteo de commits y la versión instalada más uno. Para la APK gemela de un AAB, sigue la regla especial de abajo: ADB debe mostrar cero teléfonos.
3. Ejecuta solo `npm run apk`. Encadena Vite con modo Android, `cap sync`, parchea la cámara y corre `assembleDebug`. Genera `android/app/build/outputs/apk/debug/app-debug.apk` y la copia `Desktop\Sigo.apk`.
4. Comprueba nombre, versionCode, firma debug y modelos dentro del ZIP. Usa Node para inspeccionar archivos del paquete; no confíes en búsquedas de PowerShell sobre JavaScript minificado.
5. No uses `npm run apk -- poner` ni `npm run apk -- distribuir`: el primero instala en el primer dispositivo de la lista y el segundo envía a Firebase App Distribution.
6. Si la orden incluye instalación, usa siempre `adb -s <serial confirmado> install -r <apk>`; nunca desinstales primero. Solo ante un error explícito de downgrade se permite un único reintento `-r -d`. Ante otro error, detente y copia el mensaje. No instales en un dispositivo distinto del que Javier autorizó.
7. Logcat se limpia y captura solo cuando la orden lo pide. Si Javier solicita que quede activo durante una prueba, no lo detengas hasta que lo indique.

En el Redmi de pruebas el serial cambia, pero contiene `74806d032b21`; `ZY32MQSBN2` es el moto g86 y no debe elegirse para órdenes destinadas al Redmi. Si el Redmi no aparece, pide encender «Depuración inalámbrica» y revisa una vez más; si sigue ausente, detente.

## AAB para Google Play

1. Usa el worktree limpio del commit objetivo. Confirma los tres modelos, `node_modules`, Java 21 y `android/keystore.properties` sin imprimir ni copiar secretos. La llave de subida nunca entra en Git.
2. Ejecuta `npm run play` sin argumentos para armar y validar. `sinR8` cambia la compilación; `probar` instala APKs locales; `subir` interactúa con Play Console. No agregues esas opciones salvo que Javier pida expresamente esa acción.
3. El resultado es `android/app/build/outputs/bundle/release/app-release.aab` y la copia `Desktop\Sigo-play.aab`. Exige todas las comprobaciones automáticas en OK y conserva, antes del siguiente armado que lo sobrescriba, una copia identificada por commit con SHA-256 y su `mapping.txt`.
4. Sigue la versión vigente de `docs/play/ANTES-DE-SUBIR.txt` para las comprobaciones manuales. En la actualización de `f6daccc` se incorporaron `scripts/elf16k.mjs` (LOAD/RELRO, .so por .so, falla también si la carpeta está vacía) y `scripts/leerFicha.mjs` (lectura de ficha Play). `leerFicha.mjs` puede abrir una edición: no lo ejecutes contra Play sin autorización concreta.
5. En la revisión del AAB, confirma 16 KB, clases protegidas en el mapping, ausencia del material de diagnóstico que no viaja, versionName/versionCode, firma y permisos. Debe incluir `com.android.vending.BILLING` y no `com.google.android.gms.permission.AD_ID`; si AD_ID aparece, detente y avisa a Javier.
6. `npm run play -- subir` solo conoce la prueba interna; no publiques sin orden explícita. La prueba cerrada se gestiona manualmente en Play Console siguiendo la ayuda y el checklist actualizados. No cambies pistas, testers ni porcentajes por iniciativa propia.

## AAB y APK gemela

La regla de Javier es «cada armado deja las dos». Después de que el AAB y sus comprobaciones estén correctos, y sin commits en medio:

1. Confirma que `adb devices` no liste ningún teléfono; si hay uno conectado, desconéctalo antes de esta APK para que el versionCode no se calcule con una app instalada.
2. Ejecuta `npm run apk` sin argumentos. Guarda la copia como `Desktop\Sigo-<versionName>-<versionCode>.apk`.
3. Verifica que sea firma debug y que incluya los modelos es, en y pt. Esa APK acompaña la batería de pruebas de Firebase; el AAB es el que se sube a Play. No la envíes con `-- distribuir`.
4. Cuando ambos archivos nuevos estén revisados, las versiones anteriores de APK/AAB en el Escritorio y la copia genérica `Sigo.apk` van a la Papelera de Windows, nunca a borrado permanente. No toques otros APK/AAB.

## Registro útil

El armado de la APK 748 desde `cobro-visible` acabó correctamente: 229.696.816 bytes y los tres directorios de modelo dentro del ZIP. La instalación en el Redmi devolvió `INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`; fue un rechazo de instalación, no un fallo de compilación. La prueba de RevenueCat posterior sí llegó a `RevenueCatUI.presentPaywall`, pero el nativo respondió que `Purchases` no estaba configurado. Mantén separadas esas conclusiones.

# Extended README

Teleprompter MVP — rama feature/asr-improvements

Objetivo: teleprompter inteligente con ASR on-device (Whisper-tiny via transformers.js) y Web Speech API fallback. Esta rama incluye mejoras: AudioWorklet VAD, worker ASR, caching en IndexedDB, alineamiento incremental, TeleprompterView con auto-scroll y PWA.

Cómo probar localmente

1. Clona el repo y cambia a la rama:
   git clone https://github.com/javierarriagada-cmyk/Teleprompter.git
   cd Teleprompter
   git fetch origin feature/asr-improvements
   git checkout feature/asr-improvements

2. Instala dependencias:
   npm install

3. Levanta dev server:
   npm run dev

4. Desde tu teléfono (mismo Wi‑Fi): abre http://<IP_de_tu_PC>:5173 y permite micrófono.

Notas
- Primera descarga del modelo whisper-tiny puede tardar y consumir datos. Usa la opción "Preload Wi‑Fi" para descargar sólo en redes wifi.
- Por defecto la inferencia es on-device para privacidad.

Próximos pasos
- Ajustes de thresholds VAD por dispositivo
- Mejorar alignment con forced-alignment si se desea mayor precisión
- Tests en varios dispositivos Android/iOS

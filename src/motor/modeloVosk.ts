// La direccion del modelo y el nombre de su cache viven aca, en un modulo sin efectos ni
// dependencias, porque los usan LOS DOS LADOS: el worker y el hilo principal.
//
// Estaban dentro de vosk.worker.ts. Importar un valor desde ahi parece inofensivo, pero
// ese modulo importa vosk-browser y ademas instala su self.onmessage al cargarse, asi que
// no se puede podar: cualquier import desde el hilo principal arrastra los 5,8 MB de WASM
// al paquete que se baja todo el mundo al abrir la aplicacion. Medido: el paquete pasaba
// de 204 kB a 5.995 kB.
export const MODELO_URL_DEFECTO = 'https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.tar.gz'

export const CACHE_MODELO = 'vosk-model-v1'

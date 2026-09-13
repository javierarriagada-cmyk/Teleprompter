// La direccion del modelo y el nombre de su cache viven aca, en un modulo sin efectos ni
// dependencias, porque los usan LOS DOS LADOS: el worker y el hilo principal.
//
// Estaban dentro de vosk.worker.ts. Importar un valor desde ahi parece inofensivo, pero
// ese modulo importa vosk-browser y ademas instala su self.onmessage al cargarse, asi que
// no se puede podar: cualquier import desde el hilo principal arrastra los 5,8 MB de WASM
// al paquete que se baja todo el mundo al abrir la aplicacion. Medido: el paquete pasaba
// de 204 kB a 5.995 kB.
// DE DONDE SE BAJA EL MODELO, Y POR QUE DE ACA Y NO DE ALPHACEPHEI.
//
// La direccion anterior era
// https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.tar.gz y fallaba por DOS
// motivos distintos, los dos comprobados con curl el 12 de septiembre de 2026:
//
//   1. Ese archivo NO EXISTE. Devuelve 404. Alphacephei publica el modelo en .zip, no en
//      .tar.gz; el .zip si responde 200.
//   2. Y aunque se corrigiera la extension, tampoco serviria: alphacephei NO manda la
//      cabecera Access-Control-Allow-Origin, asi que el navegador bloquea la descarga
//      desde nuestro dominio. Ese es el "Failed to fetch" que se veia en pantalla.
//
// Este otro servidor es el de la demo oficial de vosk-browser, la misma biblioteca que
// usamos. Comprobado: responde 200, manda Access-Control-Allow-Origin: *, pesa 34,4 MB y
// sus primeros bytes son 1f 8b -gzip de verdad, no una pagina de error disfrazada-.
//
// EL PRECIO, dicho derecho: este modelo es la version 0.3 y el de alphacephei es la 0.42,
// mas nueva. Se elige el que se puede bajar por sobre el que no. Cuando empaquetemos el
// APK, el modelo viaja adentro y ahi podemos volver al 0.42 sin depender de nadie.
export const MODELO_URL_DEFECTO = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-es-0.3.tar.gz'

export const CACHE_MODELO = 'vosk-model-v1'

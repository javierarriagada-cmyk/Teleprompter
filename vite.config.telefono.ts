// CONFIGURACION PARA PROBAR EN EL TELEFONO DE VERDAD, SIN APK.
//
// No reemplaza a vite.config.ts: lo toma entero y le agrega dos cosas.
//
//   host: true       el servidor deja de escuchar solo en localhost y aparece en la red
//                    del wifi, asi el telefono lo puede abrir.
//
//   basicSsl()       certificado propio, o sea https. NO es un adorno: Chrome entrega el
//                    microfono solo en localhost o en https. Sin esto, en el telefono se
//                    ve la pantalla y el motor no arranca nunca, que es justo lo que
//                    queremos probar. El telefono va a avisar que el certificado no lo
//                    firmo nadie conocido; es cierto, lo firmamos nosotros. Se acepta una
//                    vez y queda.
//
// Se usa asi:  npx vite --config vite.config.telefono.ts

import basicSsl from '@vitejs/plugin-basic-ssl'
import { mergeConfig } from 'vite'
import base from './vite.config'

export default mergeConfig(base, {
  plugins: [basicSsl()],
  server: {
    host: true,
    port: 5181
  }
})

// Sirve src/ en modo Play sin escribir en la copia de la app: la caché vive en _tools.
const path = require('node:path')
const { createRequire } = require('node:module')
const raiz = process.env.SIGO_APP_ROOT
if (!raiz) throw new Error('Falta SIGO_APP_ROOT: carpeta de la app con node_modules ya instalado.')
const desdeApp = createRequire(path.join(raiz,'package.json'))
const { createServer } = desdeApp('vite')
const react = desdeApp('@vitejs/plugin-react')
;(async()=>{
  const server = await createServer({configFile:false,root:raiz,mode:'play',base:'/',
    cacheDir:path.join(__dirname,'.cache-vite'),plugins:[(react.default||react)()],worker:{format:'es'},
    server:{host:'127.0.0.1',port:5199,strictPort:true}})
  await server.listen()
  console.log('APP_REAL',raiz,'http://127.0.0.1:5199/')
})().catch(e=>{console.error(e);process.exit(1)})

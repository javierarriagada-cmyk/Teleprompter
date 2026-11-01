// Auditoría visual del prototipo; no modifica la app ni las secciones aprobadas.
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const {pathToFileURL} = require('node:url')
const {execFileSync} = require('node:child_process')
const puppeteer = require('puppeteer-core')
const ROOT = path.resolve(__dirname,'..')
const REPO = path.resolve(ROOT,'../../..')
const OUT = path.join(ROOT,'capturas-prototipo/ronda-3')
fs.mkdirSync(OUT,{recursive:true})
const sleep = ms => new Promise(r=>setTimeout(r,ms))
const original = nombre => execFileSync('git',['-C',REPO,'show',`1297c70:docs/pantallas/sitio-nuevo/${nombre}`],{encoding:'utf8'})
const htmlAntes=original('index.html'), cssAntes=original('estilo.css')
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4'}
const servidor=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  const archivo=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname))
  if(!archivo.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return}
  if(!fs.existsSync(archivo)||!fs.statSync(archivo).isFile()){res.writeHead(404);res.end();return}
  res.writeHead(200,{'content-type':tipos[path.extname(archivo)]||'application/octet-stream','content-length':fs.statSync(archivo).size})
  fs.createReadStream(archivo).pipe(res)
})
async function preparar(p,url,exigirDemo=true){
  await p.goto(url,{waitUntil:'networkidle0',timeout:45000})
  if(exigirDemo)await p.waitForFunction(()=>document.documentElement.classList.contains('coreografia'),{timeout:20000})
  await p.evaluate(()=>document.fonts.ready)
  await sleep(800)
}
async function seccion(p,selector,nombre){
  await p.$eval(selector,el=>el.scrollIntoView({block:'start',behavior:'instant'}))
  await p.evaluate(async selector=>{
    const bloque=document.querySelector(selector)
    bloque.querySelectorAll('.revela').forEach(el=>el.classList.add('revelado'))
    if(bloque.matches('.revela'))bloque.classList.add('revelado')
    await Promise.all([...bloque.querySelectorAll('img')].map(async img=>{
      img.loading='eager'
      if(!img.complete)await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('No cargó '+img.src))})
      await img.decode()
    }))
  },selector)
  await sleep(650)
  const clip=await p.$eval(selector,el=>{const r=el.getBoundingClientRect();return{x:Math.floor(r.left+scrollX),y:Math.floor(r.top+scrollY),width:Math.ceil(r.width),height:Math.ceil(r.height)}})
  await p.screenshot({path:path.join(OUT,nombre+'.png'),clip,captureBeyondViewport:true})
  return clip
}
;(async()=>{
  await new Promise(ok=>servidor.listen(0,'127.0.0.1',ok))
  const url=`http://127.0.0.1:${servidor.address().port}/index.html`
  const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome'),headless:true,args:['--no-sandbox']})
  const informe={base:'1297c70',escala_capturas:1,viewports:[],apertura_file:true}
  try {
    for(const [nombre,width,height] of [['tel',392,894],['desk',1440,900]]){
      const p=await br.newPage()
      await p.setViewport({width,height,deviceScaleFactor:1})
      const errores=[]
      p.on('pageerror',e=>errores.push(e.message))
      await preparar(p,url)
      const recursos=await p.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.startsWith(location.origin)).map(r=>({url:r.name,bytes:r.encodedBodySize})))
      const primeraVista=fs.statSync(path.join(ROOT,'index.html')).size+recursos.reduce((n,r)=>n+r.bytes,0)
      if(primeraVista>=1500000)throw Error(`Primera vista ${nombre}: ${primeraVista} bytes; excede 1,5 MB`)
      if(recursos.some(r=>/\.mp4(?:\?|$)/.test(r.url)))throw Error('El MP4 se descargó sin tocar reproducir')
      if(nombre==='tel')await seccion(p,'#video','final-video-http-tel')
      await p.close()

      // La evidencia visual se obtiene por file://, como al hacer doble clic.
      const archivo=await br.newPage()
      archivo.on('pageerror',e=>errores.push(e.message))
      const consolaFile=[]
      archivo.on('console',m=>{if(m.type()==='error')consolaFile.push(m.text())})
      await archivo.setViewport({width,height,deviceScaleFactor:1})
      // file:// bloquea el módulo ES de la demo desde la base 1297c70; no se altera esa sección.
      await preparar(archivo,pathToFileURL(path.join(ROOT,'index.html')).href,false)
      const demoFile=await archivo.evaluate(()=>document.documentElement.classList.contains('coreografia'))
      await archivo.screenshot({path:path.join(OUT,`final-primera-vista-${nombre}.png`)})
      const escenas=[]
      for(const [selector,id] of [['#video','video'],['#para','para'],['.uso-momento:nth-child(2)','clases'],['.uso-momento:nth-child(3)','presentaciones'],['#guiones','guiones']]){
        escenas.push({selector,captura:`final-${id}-${nombre}.png`,rectangulo:await seccion(archivo,selector,`final-${id}-${nombre}`)})
      }
      const video=await archivo.$eval('.interno-video',el=>{
        const r=n=>{const x=n.getBoundingClientRect();return{x:x.x,y:x.y,width:x.width,height:x.height}}
        return{texto:r(el.querySelector('.video-copy')),tarjeta:r(el.querySelector('.video-marco'))}
      })
      const imagenes=await archivo.$$eval('#guiones img,.uso-momento:nth-child(2) img,.uso-momento:nth-child(3) img',els=>els.map(el=>({archivo:el.getAttribute('src'),natural:[el.naturalWidth,el.naturalHeight],render:[el.clientWidth,el.clientHeight],completa:el.complete})))
      if(errores.length)throw Error(`Errores JavaScript en ${nombre}: ${errores.join('; ')}`)
      if(imagenes.some(i=>!i.completa||!i.natural[0]))throw Error('Imagen final sin cargar')
      await archivo.close()

      // Comparación de la sección de video móvil con la base aprobada, sin cambiar archivos.
      if(nombre==='tel'){
        const antes=await br.newPage()
        await antes.setViewport({width,height,deviceScaleFactor:1})
        await antes.setRequestInterception(true)
        antes.on('request',r=>{
          const u=new URL(r.url())
          if(u.pathname==='/index.html')return r.respond({status:200,contentType:'text/html; charset=utf-8',body:htmlAntes})
          if(u.pathname==='/estilo.css')return r.respond({status:200,contentType:'text/css; charset=utf-8',body:cssAntes})
          return r.continue()
        })
        await preparar(antes,url)
        await seccion(antes,'#video','base-video-tel')
        await antes.close()
      }
      informe.viewports.push({nombre,width,height,primera_vista_bytes:primeraVista,recursos:recursos.map(r=>({archivo:new URL(r.url).pathname,bytes:r.bytes})),video,imagenes,escenas,errores,demo_animada_file:demoFile,consola_file:consolaFile})
      console.log(nombre,'primera vista',primeraVista,'bytes; file:// y cinco secciones capturadas')
    }
    fs.writeFileSync(path.join(OUT,'revision-final.json'),JSON.stringify(informe,null,2)+'\n')
  } finally {await br.close();servidor.close()}
})().catch(e=>{console.error(e);servidor.close();process.exitCode=1})

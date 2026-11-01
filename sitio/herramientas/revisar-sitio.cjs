// Revisión manual reproducible del sitio armado por HTTP con rutas limpias, sin publicar.
// No fija coordenadas de la app: guarda evidencia visual fuera del repositorio.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http')
const puppeteer=require('puppeteer-core')
const RAIZ=path.resolve(__dirname,'../..'),PUBLICO=path.join(RAIZ,'sitio/public')
const SALIDA=process.env.SIGO_CAPTURAS
if(!SALIDA)throw Error('Falta SIGO_CAPTURAS, fuera del repositorio.')
const soloImagenes=process.argv.includes('--imagenes')
const publicado=process.argv.includes('--publicado'),sufijo=soloImagenes?'imagenes':process.argv.includes('--detalle')?'detalle':publicado?'publicado':'prueba'
const dormir=ms=>new Promise(r=>setTimeout(r,ms))
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4'}
const servidor=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,'http://local').pathname)
 let archivo=path.resolve(PUBLICO,'.'+(u==='/'?'/index.html':u))
 if(!archivo.startsWith(PUBLICO+path.sep)){res.writeHead(403);res.end();return}
 if((!fs.existsSync(archivo)||fs.statSync(archivo).isDirectory())&&!path.extname(archivo))archivo+='.html'
 if(!fs.existsSync(archivo)||!fs.statSync(archivo).isFile()){res.writeHead(404);res.end('404');return}
 const size=fs.statSync(archivo).size,headers={'content-type':tipos[path.extname(archivo)]||'application/octet-stream','cache-control':'no-store','accept-ranges':'bytes'}
 const m=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
 if(m){const start=Number(m[1]),end=m[2]?Math.min(Number(m[2]),size-1):size-1;res.writeHead(206,{...headers,'content-length':end-start+1,'content-range':`bytes ${start}-${end}/${size}`});fs.createReadStream(archivo,{start,end}).pipe(res)}
 else{res.writeHead(200,{...headers,'content-length':size});fs.createReadStream(archivo).pipe(res)}
})

async function seccion(p,selector,archivo){
 await p.$eval(selector,el=>el.scrollIntoView({block:'start',behavior:'instant'}))
 await p.evaluate(async selector=>{
  const el=document.querySelector(selector)
  // Para revisar imágenes fuera del primer pliegue se las decodifica explícitamente.
  // Para revisar la sección completa a zoom 100 %, se revelan y decodifican también las imágenes fuera del pliegue.
  el.querySelectorAll('.revela').forEach(n=>n.classList.add('revelado'))
  if(el.matches('.revela'))el.classList.add('revelado')
  for(const img of el.querySelectorAll('img')){img.loading='eager';await img.decode()}
 },selector)
 await dormir(750)
 const el=await p.$(selector)
 await el.screenshot({path:archivo,captureBeyondViewport:true})
}

;(async()=>{
 fs.mkdirSync(SALIDA,{recursive:true})
 await new Promise(ok=>servidor.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+servidor.address().port
 const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']})
 const informe={publicado,portadas:[],interiores:[],errores:[]}
 try {

  // La pausa se mira durante el silencio real del reloj, no apenas se entra a E2.
  if(process.argv.includes('--detalle')) {
   for(const idioma of ['es','en','pt']) {
    const p=await br.newPage();await p.setViewport({width:392,height:894,deviceScaleFactor:1})
    const errores=[];p.on('pageerror',e=>errores.push(e.message))
    await p.goto(base+(idioma==='es'?'/':'/'+idioma),{waitUntil:'networkidle0'})
    await p.waitForFunction(()=>document.documentElement.classList.contains('coreografia'))
    await p.evaluate(()=>{scrollTo(0,document.querySelector('#escenario').offsetTop+2.7*innerHeight);ScrollTrigger.update()})
    await p.waitForSelector('.telefono[data-telefono="sigo"].espera',{timeout:10000})
    await dormir(400)
    const pausa=await p.evaluate(()=>({avisos:[...document.querySelectorAll('.telefono > .aviso')].map(x=>({texto:x.textContent.trim(),visible:getComputedStyle(x).opacity,display:getComputedStyle(x).display})),sigo:document.querySelector('[data-telefono="sigo"] .desliza').style.transform,comun:document.querySelector('[data-telefono="comun"] .desliza').style.transform}))
    await p.screenshot({path:path.join(SALIDA,'detalle-'+idioma+'-pausa.png')})
    await dormir(650)
    const durante=await p.evaluate(()=>({sigo:document.querySelector('[data-telefono="sigo"] .desliza').style.transform,comun:document.querySelector('[data-telefono="comun"] .desliza').style.transform}))
    await p.waitForFunction(()=>!document.querySelector('.telefono[data-telefono="sigo"]').classList.contains('espera'),{timeout:10000})
    const regreso=await p.evaluate(()=>document.querySelector('[data-telefono="sigo"] .desliza').style.transform)
    await p.$eval('[data-galeria]',x=>x.scrollIntoView({behavior:'instant'}));await dormir(800)
    const b=await p.$('[data-galeria-puntos] button:last-child');await b.click();await dormir(1000)
    const galeria=await p.evaluate(()=>({contador:document.querySelector('[data-gal-n]').textContent,activo:document.querySelector('[data-galeria-puntos] button[aria-current]')?.getAttribute('aria-label')}))
    await p.evaluate(async()=>{const el=document.querySelector('#app');el.querySelectorAll('.revela').forEach(n=>n.classList.add('revelado'));for(const img of el.querySelectorAll('img')){img.loading='eager';await img.decode()}})
    await seccion(p,'#app',path.join(SALIDA,'detalle-'+idioma+'-galeria-completa.png'))
    await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await dormir(700)
    await p.screenshot({path:path.join(SALIDA,'detalle-'+idioma+'-pie.png')})
    if(errores.length)throw Error(errores.join('; '))
    informe.portadas.push({idioma,pausa,durante,regreso,galeria,errores})
    console.log('Detalle',idioma,JSON.stringify({pausa,durante,regreso,galeria}));await p.close()
   }
   return
  }
  for(const idioma of ['es','en','pt']){
   const t=(await import(require('node:url').pathToFileURL(path.join(RAIZ,'sitio/fuente/textos',idioma+'.js')).href)).default
   for(const ancho of (publicado?[392,1440]:[360,392,768,1440])){
    const alto=ancho>=900?900:894,p=await br.newPage();await p.setViewport({width:ancho,height:alto,deviceScaleFactor:1})
    const errores=[],pedidos=[]
    p.on('pageerror',e=>errores.push(e.message));p.on('console',m=>{if(m.type()==='error')errores.push(m.text())})
    p.on('response',r=>{if(r.status()>=400)errores.push(r.status()+' '+r.url())});p.on('request',r=>pedidos.push(r.url()))
    await p.goto(base+t.rutas.portada,{waitUntil:'networkidle0',timeout:30000})
    await p.waitForFunction(()=>document.documentElement.classList.contains('coreografia'),{timeout:10000})
    await p.evaluate(()=>document.fonts.ready);await dormir(1600)
    const primera=await p.evaluate(()=>({bytes:performance.getEntriesByType('navigation')[0].encodedBodySize+performance.getEntriesByType('resource').reduce((n,r)=>n+r.encodedBodySize,0),desborde:document.documentElement.scrollWidth-innerWidth,idioma:document.documentElement.lang,titulo:document.title,descripcion:document.querySelector('meta[name="description"]').content,canonical:document.querySelector('link[rel="canonical"]').href,imagenes:[...document.images].map(i=>i.getAttribute('src')),video:!!document.querySelector('#video')}))
    if(primera.bytes>=1500000)throw Error('Primera carga excede 1,5 MB: '+JSON.stringify(primera))
    if(primera.desborde>1)errores.push('Desborde horizontal: '+primera.desborde)
    if(primera.idioma!==idioma)errores.push('Idioma HTML incorrecto')
    if(pedidos.some(u=>/\.mp4(?:\?|$)/.test(u)))errores.push('MP4 solicitado antes de tocar reproducir')
    if(idioma!=='es'&&primera.imagenes.some(u=>u.startsWith('/activos/es/')))errores.push('Imagen española en '+idioma)
    if(primera.video!==(idioma==='es'))errores.push('Video en idioma incorrecto')
    const pref=`${sufijo}-${idioma}-${ancho}`
    await p.screenshot({path:path.join(SALIDA,pref+'-inicio.png')})
    const capitulos=[]
    for(const [id,n] of (publicado||soloImagenes?[]:[[1,1.15],[2,2.7],[5,4.2]])){
     await p.evaluate(({n,alto})=>{window.scrollTo(0,document.querySelector('#escenario').offsetTop+n*alto);window.ScrollTrigger.update()}, {n,alto})
     await dormir(1100)
     const dato=await p.evaluate(()=>({activo:document.querySelector('.pildora a.activo')?.dataset.capitulo,telefonos:[...document.querySelectorAll('.telefono')].map(t=>({id:t.id,transform:t.style.transform})),palabras:document.querySelectorAll('.palabra').length}))
     capitulos.push({id,...dato})
     if([392,1440].includes(ancho))await p.screenshot({path:path.join(SALIDA,`${pref}-escena-${id}.png`)})
    }
    if(soloImagenes||[392,1440].includes(ancho))for(const selector of (soloImagenes?['#para','#app','#guiones']:publicado?['#cierre']:['#video','#para','#app','#guiones','#cierre']))if(await p.$(selector))await seccion(p,selector,path.join(SALIDA,pref+'-'+selector.slice(1)+'.png'))
    else await p.$eval('#cierre',el=>el.scrollIntoView({behavior:'instant'}))
    if(soloImagenes) {
     const fotos=await p.$$('#app .g-slide img')
     for(let i=0;i<fotos.length;i++) {
      await fotos[i].evaluate(async img=>{
       img.loading='eager';await img.decode();img.closest('.g-slide').classList.add('revelado')
       const pista=img.closest('[data-galeria-pista]')
       const r=img.getBoundingClientRect(),p=pista.getBoundingClientRect()
       pista.scrollTo({left:pista.scrollLeft+r.left+r.width/2-p.left-pista.clientWidth/2,behavior:'instant'})
       window.scrollTo({top:r.top+scrollY+r.height/2-innerHeight/2,behavior:'instant'})
      })
      // Antes: ElementHandle.screenshot volvía a desplazar el carrusel y mezclaba dos capturas.
      // Antes: el recorte fuera del viewport provocaba otra medida del carrusel al fotografiar.
      // Se fotografía la ventana a su tamaño real, con la imagen objetivo completamente visible.
      await dormir(650)
      const imagenVisible=await fotos[i].evaluate(img=>{const r=img.getBoundingClientRect();return{src:img.getAttribute('src'),x:r.left,y:r.top,width:r.width,height:r.height,ancho:innerWidth,alto:innerHeight}})
      if(imagenVisible.x < -1 || imagenVisible.x+imagenVisible.width > imagenVisible.ancho+1 || imagenVisible.y < -1 || imagenVisible.y+imagenVisible.height > imagenVisible.alto+1)throw Error('Imagen fuera de la ventana de revisión: '+JSON.stringify(imagenVisible))
      await p.screenshot({path:path.join(SALIDA,pref+'-galeria-'+(i+1)+'.png')})
     }
    }
    const final=await p.evaluate(()=>({texto:document.body.innerText,franja:!!document.querySelector('#franja-prueba'),invitacion:!!document.querySelector('#prueba'),insignia:document.querySelector('.cierre-play img')?.getAttribute('src'),aviso:document.querySelector('.pie-marca')?.textContent,puntos:[...document.querySelectorAll('[data-galeria-puntos] button')].map(n=>n.getAttribute('aria-label'))}))
    if(publicado&&(final.franja||final.invitacion||!final.insignia||!final.aviso||/Pronto en Google Play|Coming soon to Google Play|Em breve no Google Play|Sigo está en prueba|Sigo is in testing|O Sigo está em fase de testes/.test(final.texto+' '+primera.descripcion)))errores.push('Estado público incompleto')
    if(!publicado&&(!final.franja||!final.invitacion||final.insignia||final.aviso))errores.push('Estado de prueba incorrecto')
    if(idioma==='es'&&ancho===392&&!publicado&&!soloImagenes){await p.$eval('[data-video-play]',b=>b.click());await p.waitForSelector('video');await p.waitForFunction(()=>document.querySelector('video')?.readyState>=2,{timeout:20000});if(!pedidos.some(u=>u.includes('.mp4')))errores.push('El video no pidió el MP4 al reproducir')}
    informe.portadas.push({idioma,ancho,...primera,capitulos,puntos:final.puntos,errores})
    for(const pagina of (soloImagenes?[]:['privacidad','terminos','soporte','ayuda','borrarCuenta'])){
     await p.goto(base+t.rutas[pagina],{waitUntil:'networkidle0',timeout:30000});await p.evaluate(()=>document.fonts.ready)
     const dato=await p.evaluate(()=>({idioma:document.documentElement.lang,desborde:document.documentElement.scrollWidth-innerWidth,titulo:document.querySelector('main h1')?.textContent,texto:document.querySelector('main')?.innerText,selector:document.querySelector('.idioma-arriba')?getComputedStyle(document.querySelector('.idioma-arriba')).display:null}))
     if(dato.desborde>1||dato.idioma!==idioma||!dato.titulo||dato.selector==='none')errores.push('Interior incorrecto '+t.rutas[pagina]+': '+JSON.stringify(dato))
     if(publicado&&/Pronto en Google Play|Coming soon to Google Play|Em breve no Google Play/.test(dato.texto))errores.push('Pronto en interior '+pagina)
     if(!publicado&&[392,1440].includes(ancho))await p.screenshot({path:path.join(SALIDA,pref+'-'+pagina+'.png')})
     informe.interiores.push({idioma,ancho,pagina,...dato})
    }
    if(errores.length)informe.errores.push({idioma,ancho,errores})
    console.log(sufijo,idioma,ancho,primera.bytes,'bytes',errores.length?'ERRORES '+errores.join('; '):'OK')
    await p.close()
   }
  }
 } finally {await br.close();await new Promise(ok=>servidor.close(ok));fs.writeFileSync(path.join(SALIDA,'revision-'+sufijo+'.json'),JSON.stringify(informe,null,2)+'\n')}
 if(informe.errores.length)throw Error('Revisión con defectos: ver revision-'+sufijo+'.json')
})().catch(e=>{console.error(e);process.exitCode=1})

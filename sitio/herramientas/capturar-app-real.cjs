// La interfaz se captura desde React, sin modificar src/. No certifica cámara ni voz en Android.
// Antes: la herramienta del prototipo solo sembraba guiones españoles y escribía dentro del prototipo.
// Ahora cada perfil aislado usa su idioma; los PNG de auditoría quedan fuera del repositorio.
const puppeteer = require('puppeteer-core')
const fs = require('node:fs')
const path = require('node:path')
const {execFileSync} = require('node:child_process')
const RAIZ = path.resolve(__dirname, '../..')
const SALIDA = process.env.SIGO_CAPTURAS
if (!SALIDA) throw new Error('Falta SIGO_CAPTURAS: carpeta externa para los PNG de auditoría.')
// Antes: Sin un medio independiente autorizado se usa la señal de cámara de Chrome, nunca una captura española.
// Antes: el recuadro usaba la señal de prueba de Chrome. Ahora muestra las personas autorizadas de la ficha.
const PERSONAS = path.join(RAIZ, 'docs/play/ficha/herramientas/fuente')
const PYTHON = process.env.PYTHON || 'python'
const dormir = ms => new Promise(r=>setTimeout(r,ms))
const GUIONES = require('./guiones-capturas.json')
const INFORME = []

// Las tres capturas españolas conservan sus dimensiones anteriores, incluido el escalado de galería.
function exportar(png,out,conservarMedida) {
  execFileSync(PYTHON,['-c',
    'from PIL import Image;import sys,os;im=Image.open(sys.argv[1]).convert("RGB");size=Image.open(sys.argv[2]).size if sys.argv[3]=="1" and os.path.exists(sys.argv[2]) else im.size;im=im.resize(size,Image.Resampling.LANCZOS) if im.size!=size else im;im.save(sys.argv[2],"WEBP",lossless=True,method=6)',
    png,out,conservarMedida?'1':'0'])
}

async function nueva(br, idioma, tipo, horizontal=false) {
  const ctx=await br.createBrowserContext(), p=await ctx.newPage()
  await p.setViewport({width:horizontal?850:392,height:horizontal?392:850,deviceScaleFactor:2,isMobile:true,hasTouch:true,isLandscape:horizontal})
  const errores=[]
  p.on('pageerror',e=>errores.push(e.message))
  // La posición inicial deja toda la cara dentro del viewport, usando la preferencia real de la app.
  await p.evaluateOnNewDocument(({idioma,tipo})=>{
    localStorage.setItem('sigo_idioma',idioma)
    localStorage.setItem('teleprompter_oscuro_impuesto','true')
    localStorage.setItem('teleprompter_marca_idioma','true')
    localStorage.setItem('sigo_modo_lectura',tipo==='ensayos'?'fija':'voz')
    localStorage.setItem('sigo_nivel_fijo','3')
    localStorage.setItem('teleprompter_ajustes',JSON.stringify({tema:'oscuro',fontSize:28,mostrarTiempo:true,anclajeZona:'arriba',fondoToma:'recuadro',recuadroX:.58,recuadroY:.48,ladoCamara:'frontal'}))
  },{idioma,tipo})
  await p.goto(process.env.APP_URL||'http://127.0.0.1:5199/',{waitUntil:'networkidle2',timeout:60000})
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]',{timeout:30000})
  const guion=GUIONES[idioma][tipo]||GUIONES[idioma].general
  await p.evaluate(async({guion,idioma,tipo})=>{
    await new Promise((resolve,reject)=>{
      const req=indexedDB.open('teleprompter_db',2)
      req.onerror=()=>reject(req.error)
      req.onsuccess=()=>{
        const db=req.result, tx=db.transaction(['guiones','grabaciones'],'readwrite'),g=tx.objectStore('guiones')
        const obtener=g.getAll()
        obtener.onsuccess=()=>{
          const bienvenida=obtener.result.find(x=>['Hola','Hi','Olá'].includes(x.titulo))
          g.clear();tx.objectStore('grabaciones').clear()
          const ahora=Date.now()
          const usar=tipo==='videos'&&bienvenida?{titulo:bienvenida.titulo,texto:bienvenida.bloques.map(b=>b.texto).join('\n\n')}:guion
          g.put({id:'g-captura',titulo:usar.titulo,idioma,creado:ahora,modificado:ahora,bloques:[{id:'b-captura',nombre:'',texto:usar.texto}]})
        }
        tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)
      }
    })
  },{guion,idioma,tipo})
  await p.reload({waitUntil:'networkidle2'})
  await p.waitForSelector('[data-testid="btn-leer-tarjeta"]',{timeout:30000})
  await dormir(600)
  return {ctx,p,errores,guion}
}

async function capturar(br,idioma,tipo,nombre,horizontal=false) {
  const {ctx,p,errores,guion}=await nueva(br,idioma,tipo,horizontal)
  try {
    if(['clases','presentaciones'].includes(tipo)) {
      await p.click('[data-testid="btn-leer-tarjeta"]')
      await p.waitForSelector('[data-testid="btn-empezar-toma"]',{visible:true,timeout:20000})
      await p.waitForFunction(t=>document.body.innerText.includes(t),{},guion.titulo)
    } else if(['cuenta','ajustes','ensayos'].includes(tipo)) {
      await p.click('[data-testid="btn-menu-superior-biblioteca"]')
      await p.waitForSelector('[data-testid="seccion-cuenta"]',{visible:true,timeout:20000})
      if(tipo==='cuenta') await p.$eval('[data-testid="seccion-cuenta"]',el=>el.scrollIntoView({block:'start'}))
    } else if(tipo==='editor') {
      await p.click('[data-testid="fila-guion-g-captura"]')
      await p.waitForSelector('[data-testid="editor-guion"]',{visible:true,timeout:20000})
    } else if(tipo==='videos') {
      await p.click('[data-testid="btn-grabar-tarjeta"]')
      await p.waitForSelector('[data-testid="recuadro-camara"]',{visible:true,timeout:20000})
      await p.waitForFunction(()=>document.querySelector('#capgo_video')?.readyState>=2,{timeout:20000})
      // En Android CameraPreview queda detrás del WebView. Su adaptador web agranda el video:
      // se limita al hueco real de la app, sin cambiar controles ni dibujar una interfaz falsa.
      // Solo cambia la entrada visual de cámara: los controles siguen siendo los de React.
      // Las personas generadas A/C tienen licencia comercial en LICENCIA-personas.txt.
      const persona = horizontal ? 'persona-C.png' : 'persona-A.png'
      const imagen = 'data:image/png;base64,' + fs.readFileSync(path.join(PERSONAS,persona)).toString('base64')
      const controles = await p.$$eval('button',els=>els.map(e=>[e.getAttribute('data-testid'),e.textContent,e.getAttribute('aria-label')]))
      await p.evaluate(async imagen=>{
        const hueco=document.querySelector('[data-testid="recuadro-camara"]')
        const v=document.querySelector('#capgo_video')
        // Antes: ocultar el video dejaba su ancho fuera del viewport en vertical. Se conserva el límite del adaptador web.
        const r=hueco.getBoundingClientRect()
        for(const [k,value] of Object.entries({position:'fixed',left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px',objectFit:'cover',zIndex:'-1',visibility:'hidden'}))v.style.setProperty(k,value,'important')
        v.pause()
        const img=document.createElement('img')
        img.dataset.personaFicha='true';img.setAttribute('aria-hidden','true')
        img.src=imagen
        img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%;border-radius:inherit;pointer-events:none;'
        hueco.appendChild(img);await img.decode()
      },imagen)
      const despues = await p.$$eval('button',els=>els.map(e=>[e.getAttribute('data-testid'),e.textContent,e.getAttribute('aria-label')]))
      if(JSON.stringify(controles)!==JSON.stringify(despues))throw new Error('Los controles cambiaron al cargar '+persona)

    }
    await p.evaluate(async()=>{await document.fonts.ready;document.activeElement?.blur();window.getSelection()?.removeAllRanges();window.scrollTo(0,0)})
    await p.mouse.move(0,0);await dormir(800)
    if(errores.length)throw new Error(errores.join('\n'))
    const estado=await p.evaluate(()=>({viewport:{ancho:innerWidth,alto:innerHeight,scrollX,scrollY,anchoDocumento:document.documentElement.scrollWidth,escala:visualViewport?.scale},idioma:document.documentElement.lang,texto:document.body.innerText,focoVisible:!!document.activeElement?.matches(':focus-visible')}))
    if(estado.focoVisible)throw new Error('Foco visible en '+nombre)
    const dir=path.join(SALIDA,'app',idioma);fs.mkdirSync(dir,{recursive:true})
    const png=path.join(dir,nombre+'.png');await p.screenshot({path:png})
    const out=path.join(RAIZ,'sitio/fuente/activos',idioma,nombre+'.webp');fs.mkdirSync(path.dirname(out),{recursive:true})
    exportar(png,out,idioma==='es')
    INFORME.push({persona:tipo==='videos'?(horizontal?'persona-C.png':'persona-A.png'):null,idioma,tipo,archivo:path.relative(RAIZ,out),png,guion:guion.titulo,...estado})
    console.log(idioma,nombre,'OK')
  } finally {await ctx.close()}
}

;(async()=>{
 const br=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']})
 try {
  for(const idioma of (process.argv.includes('--correccion')?['es','en','pt']:['en','pt'])) {
   if(process.env.CAPTURA_IDIOMA&&process.env.CAPTURA_IDIOMA!==idioma)continue
   for(const [tipo,nombre,horizontal] of [['cuenta','guiones-ui'],['clases','uso-clases'],['presentaciones','uso-presentaciones'],['ensayos','uso-ensayos'],['biblioteca','phone-01'],['editor','phone-04'],['ajustes','phone-05'],['videos','uso-videos'],['videos','phone-08',true]]) {
    // La excepción española está limitada a Ajustes y velocidad fija, nunca a sus cámaras aprobadas.
    if(process.argv.includes('--correccion') && (idioma==='es'?!['ajustes','ensayos'].includes(tipo):tipo!=='videos'))continue
    if(process.env.CAPTURA_TIPO&&process.env.CAPTURA_TIPO!==tipo)continue
    await capturar(br,idioma,tipo,nombre,!!horizontal)
   }
   const base=path.join(RAIZ,'sitio/fuente/activos',idioma)
   if(idioma==='es') {
    if(!process.env.CAPTURA_TIPO||process.env.CAPTURA_TIPO==='ensayos')exportar(path.join(SALIDA,'app/es/uso-ensayos.png'),path.join(base,'phone-06.webp'),true)
   } else for(const [a,b] of [['uso-videos.webp','phone-02.webp'],['uso-ensayos.webp','phone-06.webp']])if(fs.existsSync(path.join(base,a)))fs.copyFileSync(path.join(base,a),path.join(base,b))
  }
 } finally {
  await br.close();fs.mkdirSync(SALIDA,{recursive:true});fs.writeFileSync(path.join(SALIDA,'capturas-app-'+(process.env.CAPTURA_IDIOMA||'todos')+'-'+(process.env.CAPTURA_TIPO||'todos')+'.json'),JSON.stringify(INFORME,null,2)+'\n')
 }
})().catch(e=>{console.error(e);process.exitCode=1})

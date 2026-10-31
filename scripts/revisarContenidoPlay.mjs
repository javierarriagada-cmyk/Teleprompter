// Revisa el archivo construido, con control positivo, para no certificar una carpeta vacía.
// Los .motor.txt de tomas antiguas pueden leerse; lo excluido es el registro nuevo de diagnóstico.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const archivo = process.argv[2]
const destino = process.argv[3]
if (!archivo || !destino) throw Error('Uso: node scripts/revisarContenidoPlay.mjs <aab> <carpeta de evidencia>')
const b = fs.readFileSync(archivo)
let e = b.length - 22
while (e >= Math.max(0, b.length - 65557) && b.readUInt32LE(e) !== 0x06054b50) e--
if (e < 0 || b.readUInt32LE(e) !== 0x06054b50) throw Error('No hay directorio ZIP válido')
let p = b.readUInt32LE(e + 16)
const entradas = []
for (let i = 0; i < b.readUInt16LE(e + 10); i++) {
  if (b.readUInt32LE(p) !== 0x02014b50) throw Error('Directorio ZIP inválido')
  const n = b.readUInt16LE(p + 28)
  entradas.push({nombre:b.toString('utf8',p+46,p+46+n),metodo:b.readUInt16LE(p+10),bytes:b.readUInt32LE(p+20),offset:b.readUInt32LE(p+42)})
  p += 46 + n + b.readUInt16LE(p+30) + b.readUInt16LE(p+32)
}
const leer = (x) => {
  const o=x.offset
  if (b.readUInt32LE(o)!==0x04034b50) throw Error('Entrada ZIP inválida')
  const start=o+30+b.readUInt16LE(o+26)+b.readUInt16LE(o+28)
  const datos=b.subarray(start,start+x.bytes)
  if (x.metodo===0) return datos
  if (x.metodo===8) return zlib.inflateRawSync(datos)
  throw Error(`Compresión no admitida: ${x.metodo}`)
}
const js=entradas.filter(x=>/^base\/assets\/public\/assets\/.*\.js$/.test(x.nombre))
if(!js.length)throw Error('No hay JavaScript: no se puede comprobar el paquete')
const textos=js.map(x=>leer(x).toString('utf8'))
const prohibidos=['panel-corpus','panel-mediciones','btn-abrir-mediciones','btn-abrir-corpus','btn-borrar-copias-medicion','serviceWorker.register(', '# REGISTRO DEL MOTOR DE UNA TOMA']
const hallazgos=Object.fromEntries(prohibidos.map(t=>[t,js.filter((x,i)=>textos[i].includes(t)).map(x=>x.nombre)]))
const archivosProhibidos=entradas.filter(x=>/^base\/assets\/public\/(vad-processor\.js|sw\.js|registerSW\.js|workbox-[^/]+\.js)$/.test(x.nombre)||/base\/assets\/public\/.*(motorWeb|vosk.*worker|worker.*vosk)/i.test(x.nombre)).map(x=>x.nombre)
const positivo=textos.some(t=>t.includes('guardando-toma'))
// Vite conserva alias constantes (GUARDAR_AUDIO_DEL_OIDO = HERRAMIENTAS = false).
// Antes: buscar solo guardarAudio:!1 daba un falso negativo al existir dos alias.
const resolverBooleano=(texto,valor,vistos=new Set())=>{
  if(['!1','false'].includes(valor))return false
  if(['!0','true'].includes(valor))return true
  if(vistos.has(valor))return null
  vistos.add(valor)
  const nombre=valor.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const m=texto.match(new RegExp('(?:const\\s+|,)'+nombre+'=(![01]|true|false|[\\w$]+)(?=[,;])'))
  return m?resolverBooleano(texto,m[1],vistos):null
}
const audio=textos.flatMap(t=>[...t.matchAll(/guardarAudio:\s*(![01]|true|false|[\w$]+)/g)].map(m=>resolverBooleano(t,m[1])))
const audioApagado=audio.length>0&&audio.every(x=>x===false)
const audioEncendido=audio.some(x=>x===true)
const bibliotecas=entradas.filter(x=>/^base\/lib\/arm64-v8a\/[^/]+\.so$/.test(x.nombre))
if(!bibliotecas.length)throw Error('No hay bibliotecas arm64: no se puede revisar 16 KB')
fs.mkdirSync(destino,{recursive:true})
const libs=path.join(destino,'arm64-v8a')
fs.mkdirSync(libs,{recursive:true})
for(const x of bibliotecas)fs.writeFileSync(path.join(libs,path.basename(x.nombre)),leer(x))
const informe={archivo:path.resolve(archivo),bytes:b.length,entradas:entradas.length,javascript:js.length,hallazgos,archivosProhibidos,guardandoToma:positivo,audioDiagnosticoApagado:audioApagado,audioDiagnosticoEncendido:audioEncendido,bibliotecas:bibliotecas.map(x=>x.nombre)}
fs.writeFileSync(path.join(destino,'contenido.json'),JSON.stringify(informe,null,2))
const elf=execFileSync(process.execPath,[fileURLToPath(new URL('./elf16k.mjs',import.meta.url)),libs],{encoding:'utf8'})
fs.writeFileSync(path.join(destino,'elf16k.txt'),elf)
console.log(elf)
console.log(JSON.stringify(informe,null,2))
if(!positivo||!audioApagado||audioEncendido||archivosProhibidos.length||Object.values(hallazgos).some(x=>x.length))process.exitCode=1

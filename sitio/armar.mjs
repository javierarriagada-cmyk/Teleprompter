// ARMA sitio/public/index.html -la pagina provisoria de sigoteleprompter.com-.
// 25-09-2026. La marca sale del mismo trazo que la app -src/components/
// trazoMarca.ts-, asi el logo de la pagina y el de la app son la misma forma.
// Uso: node sitio/armar.mjs   (desde la carpeta Teleprompter)
//
// ES PROVISORIA: existe para conectar el dominio y que Google emita el
// certificado. Javier: "luego tendra que ser una impactante, al nivel de la app".
import fs from 'node:fs'

const t = fs.readFileSync('src/components/trazoMarca.ts', 'utf8')
const cadena = (n) => t.match(new RegExp(`export const ${n} = '([^']+)'`))[1]
const objeto = (n) => JSON.parse(t.match(new RegExp(`export const ${n} = (\\{[^}]+\\})`))[1].replace(/(\w+):/g, '"$1":'))

const nombre = cadena('MARCA_TRAZO_NOMBRE')
const lema = cadena('MARCA_LEMA_TRAZO')
const punto = objeto('MARCA_PUNTO')
const caja = objeto('MARCA_CAJA')
const cajaLema = objeto('MARCA_LEMA_CAJA')
const vb = [caja.x, caja.y, caja.ancho, cajaLema.y + cajaLema.alto - caja.y].map((n) => +n.toFixed(2)).join(' ')

const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sigo — Teleprompter de voz</title>
<meta name="description" content="Sigo es el teleprompter que sigue tu voz: el texto avanza al ritmo en que hablas, sin tocar nada. Pronto en Google Play.">
<meta property="og:title" content="Sigo — Teleprompter de voz">
<meta property="og:description" content="El teleprompter que sigue tu voz. Pronto en Google Play.">
<meta property="og:image" content="https://sigoteleprompter.com/icono.png">
<meta name="theme-color" content="#151312">
<link rel="icon" type="image/png" href="/icono.png">
<link rel="apple-touch-icon" href="/icono.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,400&display=swap" rel="stylesheet">
<style>
  :root { --fondo: #151312; --letra: #E7E1DE; --apagado: #9C948E; --rojo: #E11D2E; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body {
    background: var(--fondo);
    color: var(--letra);
    font-family: "Source Sans 3", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    display: grid;
    place-items: center;
    padding: 24px 16px;
    min-height: 100svh;
  }
  main { display: flex; flex-direction: column; align-items: center; gap: 40px; text-align: center; max-width: 36rem; }
  .marca { width: min(64vw, 280px); height: auto; color: var(--letra); }
  .marca circle { fill: var(--rojo); animation: latido 2.4s ease-in-out infinite; transform-origin: ${punto.cx}px ${punto.cy}px; }
  @keyframes latido { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
  h1 {
    margin: 0;
    font-family: "Source Serif 4", Georgia, serif;
    font-weight: 400;
    font-size: clamp(1.5rem, 5vw, 2.1rem);
    line-height: 1.3;
    text-wrap: balance;
  }
  p { margin: 0; color: var(--apagado); font-size: 1.05rem; letter-spacing: .02em; }
  @media (prefers-reduced-motion: reduce) { .marca circle { animation: none; } }
</style>
</head>
<body>
<main>
  <svg class="marca" viewBox="${vb}" role="img" aria-label="Sigo, teleprompter">
    <path d="${nombre}" fill="currentColor"/>
    <circle cx="${punto.cx}" cy="${punto.cy}" r="${punto.r}"/>
    <path d="${lema}" fill="currentColor" opacity=".7"/>
  </svg>
  <h1>El teleprompter que sigue tu voz.</h1>
  <p>Pronto en Google Play.</p>
</main>
</body>
</html>
`
fs.mkdirSync('sitio/public', { recursive: true })
fs.writeFileSync('sitio/public/index.html', html)
console.log('sitio/public/index.html', html.length, 'bytes')

"""Comprueba la entrega aprobada y, si se pide, su regeneración en otra carpeta.

Las huellas son las aprobadas por Javier: no se recalculan para aceptar cambios.
No comprueba posiciones de la app; solo integridad y formato de los medios de Play.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys
from PIL import Image, ImageChops, features
import platform
import zlib

SOURCE = Path(__file__).resolve().parent
FICHA = SOURCE.parent
REPO = SOURCE.parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--generada', type=Path, help='Salida temporal de armar_ficha.py')
parser.add_argument('--informe', type=Path)
# 12-11-2026: «1.0» comprueba la ficha aprobada el 30-10; «1.1», la dirección de la fase 1; «todo», las dos.
parser.add_argument('--alcance', choices=['todo', '1.0', '1.1'], default='todo')
args = parser.parse_args()
manifest = json.loads((FICHA/'aprobacion-20261030/manifiesto-repositorio.json').read_text(encoding='utf-8'))
errores = []
avisos = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
# 12-11-2026, fase 2 -t169u-: la ficha 1.0 aprobada el 30-10 pasó con git mv, sin cambiar un byte, a historial/ficha-1.0-20261030/,
# porque las rutas canónicas son ahora de la ficha 1.1. Sus huellas aprobadas se comprueban allí; no se recalculan.
HIST10 = FICHA/'historial/ficha-1.0-20261030'

def huella(path, expected, label):
    if not path.is_file() or sha(path) != expected:
        errores.append('Huella distinta o archivo ausente: '+label)

def contenidos_aprobado():
    # 12-11-2026: contenidos.json lleva al final la clave «direccion-1.1». La parte aprobada se reconstruye
    # quitando ese bloque y debe dar, byte a byte, la huella aprobada; la lista aprobada no se recalcula.
    texto = (SOURCE/'contenidos.json').read_bytes().decode('utf-8')
    marca = ',\n  "direccion-1.1": '
    if marca in texto:
        texto = texto[:texto.index(marca)]+'\n}\n'
    return hashlib.sha256(texto.encode('utf-8')).hexdigest()

def comprobar_10():
    # Antes -12-11-2026-: huella(FICHA/rel, ...) para salidas y tabletas. Desde la fase 2 están en HIST10, con las mismas huellas.
    for rel, expected in manifest['salidas'].items():
        huella(HIST10/rel, expected, 'historial 1.0: '+rel)
    for rel, expected in manifest['tabletas'].items():
        huella(HIST10/rel, expected, 'historial 1.0: '+rel)
    huella(REPO/manifest['icono']['ruta'], manifest['icono']['sha256'], 'ícono conservado')
    for rel, expected in manifest['entradas'].items():
        if rel == 'contenidos.json':
            if contenidos_aprobado() != expected:
                errores.append('Huella distinta: parte aprobada de contenidos.json')
            continue
        huella(SOURCE/rel, expected, 'entrada '+rel)

differences = []
def comprobar_10_formatos():
    global differences
    for lang in ['es-419', 'en-US', 'pt-BR']:
        # Antes -12-11-2026-: leía FICHA/capturas, FICHA/grafico-* y FICHA/textos-*. Desde la fase 2, la copia 1.0 de HIST10.
        files = sorted((HIST10/'capturas'/lang).glob('*.png'))
        if [p.name for p in files] != [f'{n:02}.png' for n in range(1, 9)]:
            errores.append('Deben ser exactamente 01.png a 08.png: '+lang)
        for n, p in enumerate(files, 1):
            with Image.open(p) as im:
                if im.size != ((1920, 1080) if n == 8 else (1080, 1920)) or im.mode != 'RGB' or p.stat().st_size >= 8*1024*1024:
                    errores.append('Formato de captura incorrecto: '+str(p.relative_to(HIST10)))
        short = {'es-419': 'es', 'en-US': 'en', 'pt-BR': 'pt'}[lang]
        with Image.open(HIST10/f'grafico-1024x500-{short}.png') as im:
            if im.size != (1024, 500) or im.mode != 'RGB':
                errores.append('Formato de gráfico incorrecto: '+lang)
        import re
        blocks = re.findall(r'\[\[([\s\S]*?)\]\]', (HIST10/f'textos-{lang}.txt').read_text(encoding='utf-8'))
        if len(blocks) != 3 or any(len(t)>maximum for t, maximum in zip(blocks, [30, 80, 4000])):
            errores.append('Bloques de texto o límites incorrectos: '+lang)

    if args.generada:
        for original, canonical in manifest['mapeo_aprobacion'].items():
            path = args.generada/original
            if not path.is_file() or sha(path) != manifest['salidas'][canonical]:
                detail = {'archivo': original, 'ausente': not path.is_file()}
                if path.is_file() and path.suffix == '.png':
                    with Image.open(path) as a, Image.open(HIST10/canonical) as b:
                        diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
                        detail.update(caja_diferencia=diff.getbbox(), diferencia_maxima=max(v[1] for v in diff.getextrema()))
                differences.append(detail)
        if differences:
            errores.append(f'Regeneración distinta: {len(differences)} archivos; no sustituir los aprobados.')


DIR11 = FICHA/'direccion-1.1'

def comprobar_11():
    """Dirección de la fase 1 de la ficha 1.1 -12-11-2026-. Huellas propias de la propuesta, en
    direccion-1.1/huellas.json: no tocan ni recalculan la aprobación del 30-10."""
    import re
    D = json.loads((SOURCE/'contenidos.json').read_text(encoding='utf-8'))['direccion-1.1']
    H = json.loads((DIR11/'huellas.json').read_text(encoding='utf-8'))
    for rel, expected in H['salidas'].items():
        huella(DIR11/rel, expected, 'dirección 1.1: '+rel)
    for rel, expected in H['crudas'].items():
        huella(SOURCE/rel, expected, 'cruda 1.1: '+rel)
    crudas = SOURCE/D['crudas']
    procedencia = json.loads((DIR11/'procedencia.json').read_text(encoding='utf-8'))
    PROHIBIDAS = ['mejor', 'nº 1', 'n° 1', '#1', 'nuevo', 'nueva', 'única', 'descuento', 'oferta', 'millones', '7 días',
                  'precio', 'nunca se pierde', 'gratis', 'nunca', 'siempre', 'descarga', 'instala', 'prueba ya']
    def palabras(t, donde):
        mal = [w for w in PROHIBIDAS if w in t.lower()]
        if mal: errores.append(f'Palabras no permitidas en {donde}: {mal}')
    def recorte_fiel(final, r, nombre):
        x0, y0, x1, y1 = r['recorte']; escala = r['ancho']/(x1-x0); alto = round((y1-y0)*escala)
        with Image.open(crudas/r['cruda']) as c:
            if not (0 <= x0 < x1 <= c.width and 0 <= y0 < y1 <= c.height): errores.append('Recorte fuera de la cruda: '+nombre)
            esperado = c.convert('RGB').crop((x0, y0, x1, y1)).resize((r['ancho'], alto), Image.Resampling.LANCZOS)
        dx, dy = r['destino']
        if ImageChops.difference(final.crop((dx, dy, dx+r['ancho'], dy+alto)), esperado).getbbox():
            errores.append('El recorte no coincide con la cruda escalada: '+nombre+' '+r['cruda'])
        if not any(e.get('cruda', '').endswith(r['cruda']) and e.get('recorte_cruda') == r['recorte'] and e.get('imagen') == nombre
                   and e.get('sha256_cruda') == sha(crudas/r['cruda']) for e in procedencia):
            errores.append('Falta en procedencia.json: '+nombre+' '+r['cruda'])
        # 12-11-2026, corrección t166u -regla del borde-: el recorte arranca en el margen izquierdo del texto de la app,
        # salvo excepción declarada y explicada, que se informa como aviso.
        if 'margen_texto_app' in r and x0 > r['margen_texto_app']:
            if r.get('excepcion_borde'): avisos.append('Regla del borde con excepción declarada: '+nombre+': '+r['excepcion_borde'])
            else: errores.append('El recorte corta por la izquierda el texto de la app: '+nombre+' '+r['cruda'])
        return dict(ancho=x1-x0, escala=escala, area=r['ancho']*alto, alto=alto, r=r)
    def franja_vacia(im):
        # Igual que armar_ficha.py: filas seguidas en que ningún canal varía más de 16 niveles a lo ancho.
        mejor = 0; ini = None
        for y in range(im.height+1):
            lisa = y < im.height and max(hi-lo for lo, hi in im.crop((0, y, im.width, y+1)).getextrema()) <= 16
            if lisa and ini is None: ini = y
            if not lisa and ini is not None: mejor = max(mejor, y-ini); ini = None
        return mejor
    def cara_pct(k, recortes):
        cx0, cy0, cx1, cy1 = k['caja']; area = 0
        for r in recortes:
            if r['cruda'] != k['cruda']: continue
            x0, y0, x1, y1 = r['recorte']; e = r['ancho']/(x1-x0)
            w = min(cx1, x1)-max(cx0, x0); h = min(cy1, y1)-max(cy0, y0)
            if w > 0 and h > 0: area += round(w*e)*round(h*e)
        return area/(1080*1920)
    for c in D['es-419']['capturas']:
        nombre = f'direccion-1.1/capturas/es-419/{c["n"]:02}.png'; path = FICHA/nombre
        with Image.open(path) as im:
            if im.size != (1080, 1920) or im.mode != 'RGB' or 'transparency' in im.info or path.stat().st_size >= 8*1024*1024:
                errores.append('Formato de captura incorrecto: '+nombre)
            final = im.convert('RGB')
        rs = [recorte_fiel(final, r, nombre) for r in c['recortes']]
        # Antes -12-11-2026-: todo recorte de más de 820 px o de menos de 1,3× era error. Desde la corrección t166u,
        # la regla del borde y el encuadre de la cámara pueden pedir más ancho: se acepta solo con motivo_escala, como aviso.
        for x in rs:
            if c['n'] <= 5 and (x['ancho'] > 820 or x['escala'] < 1.3):
                if x['r'].get('motivo_escala'): avisos.append(f'Recorte de {x["ancho"]} px a {x["escala"]:.3f}×: {nombre}: {x["r"]["motivo_escala"]}')
                else: errores.append('Interfaz sin ampliar 1,3 veces -recorte de más de 820 px-: '+nombre)
        franja = franja_vacia(final)
        if franja > 0.15*1920: errores.append(f'Franja sin contenido de {franja} px, más de 15 % del alto: '+nombre)
        if c['cara']:
            if not c.get('cara_caja_cruda'): errores.append('Cara sin medir: '+nombre)
            elif cara_pct(c['cara_caja_cruda'], c['recortes']) >= 0.25: errores.append('La cara ocupa 25 % o más: '+nombre)
        cajas = [c['logo']['caja']]+[t['caja'] for t in c['textos_titular']]+([c['texto_bajada']['caja']] if c.get('bajada') else [])
        if any(k is None for k in cajas): errores.append('Caja de texto sin declarar: '+nombre)
        texto = sum(k[2]*k[3] for k in cajas if k)/(1080*1920)
        if texto >= 0.20: errores.append(f'Texto añadido {texto:.1%}: '+nombre)
        if c['n'] <= 3 and sum(r['area'] for r in rs)/(1080*1920) < 0.5: errores.append('La interfaz ocupa menos de la mitad: '+nombre)
        if len(c['titular']) > 2: errores.append('Titular de más de dos renglones: '+nombre)
        if c['cara'] and c['n'] not in (3, 4, 5): errores.append('Cara fuera de las escenas 3, 4 y 5: '+nombre)
        palabras(' '.join(c['titular'])+' '+(c.get('bajada') or ''), nombre)
    G = D['es-419']['grafico']; gp = DIR11/'grafico-1024x500-es.png'
    with Image.open(gp) as im:
        if im.size != (1024, 500) or im.mode != 'RGB' or 'transparency' in im.info: errores.append('Formato de gráfico incorrecto: dirección 1.1')
        # Antes -12-11-2026-: un solo recorte, G['recorte']. Ahora la lectura y el micrófono, en G['recortes'].
        zx, zy, zw, zh = G['zona_libre']
        for r in G['recortes']:
            x = recorte_fiel(im.convert('RGB'), r, 'direccion-1.1/grafico-1024x500-es.png'); dx, dy = r['destino']
            if dx < zx+zw and dx+r['ancho'] > zx and dy < zy+zh and dy+x['alto'] > zy:
                errores.append('El gráfico invade la zona del botón de reproducir: '+r['cruda'])
        if max(r['destino'][0]+r['ancho'] for r in G['recortes']) != 1024: errores.append('El recorte del gráfico no llega al borde derecho')
    palabras(' '.join(G['titular']), 'gráfico 1.1')
    for lang, ops in D['breves'].items():
        if len(ops) != 3: errores.append('Deben ser tres breves: '+lang)
        for o in ops:
            if len(o['texto']) > 80: errores.append(f'Breve de más de 80: {lang} {o["papel"]}')
            if o['papel'] != 'control': palabras(o['texto'], f'breve {lang} {o["papel"]}')
    breves = re.findall(r'\[\[(.*?)\]\]', (DIR11/'descripciones-breves-1.1.txt').read_text(encoding='utf-8'))
    if breves != [o['texto'] for ops in D['breves'].values() for o in ops]: errores.append('descripciones-breves-1.1.txt no coincide con contenidos.json')
    for lang in ['es-419', 'en-US', 'pt-BR']:
        # Antes -12-11-2026-: comparaba con FICHA/textos-*, que era la ficha publicada. Desde la fase 2 eso es la 1.1 (breve B);
        # la de control se sigue comparando con la breve de la 1.0 publicada, en HIST10.
        actual = re.findall(r'\[\[([\s\S]*?)\]\]', (HIST10/f'textos-{lang}.txt').read_text(encoding='utf-8'))[1]
        if D['breves'][lang][0]['texto'] != actual: errores.append('La breve de control no es la de la ficha 1.0 publicada: '+lang)
    if args.generada:
        for rel, expected in H['salidas'].items():
            path = args.generada/'direccion-1.1'/rel
            if not path.is_file() or sha(path) != expected:
                errores.append('Regeneración 1.1 distinta: '+rel)


REG11 = FICHA/'registro-1.1'

def comprobar_ficha_11():
    """Ficha 1.1, fase 2 -12-11-2026, t169u-: lo canónico de la rama. Huellas propias en registro-1.1/huellas.json;
    no tocan ni recalculan la aprobación del 30-10 ni la dirección de la fase 1."""
    import re
    C = json.loads((SOURCE/'contenidos.json').read_text(encoding='utf-8'))
    F = C['ficha-1.1']; D = C['direccion-1.1']
    H = json.loads((REG11/'huellas.json').read_text(encoding='utf-8'))
    HD = json.loads((DIR11/'huellas.json').read_text(encoding='utf-8'))
    for rel, expected in H['salidas'].items():
        huella(FICHA/rel, expected, 'ficha 1.1: '+rel)
    for rel, expected in H['crudas'].items():
        huella(SOURCE/rel, expected, 'cruda 1.1: '+rel)
    procedencia = json.loads((REG11/'procedencia.json').read_text(encoding='utf-8'))
    CORTO = {'es-419': 'es', 'en-US': 'en', 'pt-BR': 'pt'}
    # Lo que no puede decir una imagen ni un titular: superlativos, promociones, precios y Sigo+.
    PROHIBIDAS = ['mejor', 'best', 'melhor', 'nº 1', 'n° 1', '#1', 'nuevo', 'nueva', 'new', 'novo', 'nova', 'única', 'descuento',
                  'oferta', 'millones', '7 días', 'precio', 'price', 'preço', 'gratis', 'free', 'grátis', 'sigo+', 'nunca', 'siempre',
                  'descarga', 'download', 'instala', 'install', 'prueba ya']
    def palabras(t, donde):
        mal = [w for w in PROHIBIDAS if re.search(r'(?<!\w)'+re.escape(w)+r'(?![\w+])', t.lower())]
        if mal: errores.append(f'Palabras no permitidas en {donde}: {mal}')
    def franja_vacia(im):
        mejor = 0; ini = None
        for y in range(im.height+1):
            lisa = y < im.height and max(hi-lo for lo, hi in im.crop((0, y, im.width, y+1)).getextrema()) <= 16
            if lisa and ini is None: ini = y
            if not lisa and ini is not None: mejor = max(mejor, y-ini); ini = None
        return mejor
    def recorte_fiel(final, crudas, r, nombre):
        x0, y0, x1, y1 = r['recorte']; escala = r['ancho']/(x1-x0); alto = round((y1-y0)*escala)
        src = SOURCE/crudas/r['cruda']
        with Image.open(src) as c:
            if not (0 <= x0 < x1 <= c.width and 0 <= y0 < y1 <= c.height): errores.append('Recorte fuera de la cruda: '+nombre)
            esperado = c.convert('RGB').crop((x0, y0, x1, y1)).resize((r['ancho'], alto), Image.Resampling.LANCZOS)
        dx, dy = r['destino']
        if ImageChops.difference(final.crop((dx, dy, dx+r['ancho'], dy+alto)), esperado).getbbox():
            errores.append('El recorte no coincide con la cruda escalada: '+nombre+' '+r['cruda'])
        if not any(e.get('imagen') == nombre and e.get('recorte_cruda') == r['recorte'] and e.get('sha256_cruda') == sha(src) for e in procedencia):
            errores.append('Falta en procedencia.json: '+nombre+' '+r['cruda'])
        # Regla del borde: el recorte arranca en el margen izquierdo del texto de la app, salvo excepción declarada.
        if 'margen_texto_app' not in r: errores.append('Falta margen_texto_app: '+nombre+' '+r['cruda'])
        elif x0 > r['margen_texto_app']:
            if r.get('excepcion_borde'): avisos.append('Regla del borde con excepción declarada: '+nombre+': '+r['excepcion_borde'])
            else: errores.append('El recorte corta por la izquierda el texto de la app: '+nombre+' '+r['cruda'])
        # Lo que no puede verse: un guion en otro idioma o la fila en español de la flotante portuguesa.
        for ex in r.get('excluye', []):
            a = ex['caja']
            if a[0] < x1 and a[2] > x0 and a[1] < y1 and a[3] > y0: errores.append(f'El recorte deja ver {ex["que"]}: {nombre}')
        return dict(ancho=x1-x0, escala=escala, area=r['ancho']*alto, alto=alto, r=r)
    def cara_pct(k, recortes):
        cx0, cy0, cx1, cy1 = k['caja']; area = 0
        for r in recortes:
            if r['cruda'] != k['cruda']: continue
            x0, y0, x1, y1 = r['recorte']; e = r['ancho']/(x1-x0)
            w = min(cx1, x1)-max(cx0, x0); h = min(cy1, y1)-max(cy0, y0)
            if w > 0 and h > 0: area += round(w*e)*round(h*e)
        return area/(1080*1920)
    for lang, L in F['idiomas'].items():
        crudas = F['crudas'][CORTO[lang]]
        files = sorted((FICHA/'capturas'/lang).glob('*.png'))
        if [p.name for p in files] != [f'{c["n"]:02}.png' for c in L['capturas']]:
            errores.append('Las capturas no coinciden con contenidos.json: '+lang)
        for c in L['capturas']:
            nombre = f'capturas/{lang}/{c["n"]:02}.png'; path = FICHA/nombre
            if not path.is_file(): errores.append('Falta '+nombre); continue
            with Image.open(path) as im:
                if im.size != (1080, 1920) or im.mode != 'RGB' or 'transparency' in im.info or path.stat().st_size >= 8*1024*1024:
                    errores.append('Formato de captura incorrecto: '+nombre)
                final = im.convert('RGB')
            if c.get('aprobada'):
                # Lo aprobado en la fase 1 va idéntico byte a byte, con la huella de la dirección.
                rel = c['aprobada'].split('direccion-1.1/', 1)[1]
                if sha(path) != HD['salidas'].get(rel) or sha(path) != sha(FICHA/c['aprobada']):
                    errores.append('No es idéntica a la pieza aprobada: '+nombre)
                continue
            rs = [recorte_fiel(final, crudas, r, nombre) for r in c['recortes']]
            for x in rs:
                if c['n'] <= 5 and (x['ancho'] > 820 or x['escala'] < 1.3):
                    if x['r'].get('motivo_escala'): avisos.append(f'Recorte de {x["ancho"]} px a {x["escala"]:.3f}×: {nombre}: {x["r"]["motivo_escala"]}')
                    else: errores.append('Interfaz sin ampliar 1,3 veces -recorte de más de 820 px-: '+nombre)
            franja = franja_vacia(final)
            if franja > 0.15*1920: errores.append(f'Franja sin contenido de {franja} px, más de 15 % del alto: '+nombre)
            if c['cara']:
                if not c.get('cara_caja_cruda'): errores.append('Cara sin medir: '+nombre)
                elif cara_pct(c['cara_caja_cruda'], c['recortes']) >= 0.25: errores.append('La cara ocupa 25 % o más: '+nombre)
                if c['n'] not in (3, 4, 5): errores.append('Cara fuera de las escenas 3, 4 y 5: '+nombre)
            cajas = [c['logo']['caja']]+[t['caja'] for t in c['textos_titular']]+([c['texto_bajada']['caja']] if c.get('bajada') else [])
            texto = sum(k[2]*k[3] for k in cajas)/(1080*1920)
            if texto >= 0.20: errores.append(f'Texto añadido {texto:.1%}: '+nombre)
            if c['n'] <= 3 and sum(r['area'] for r in rs)/(1080*1920) < 0.5: errores.append('La interfaz ocupa menos de la mitad: '+nombre)
            if len(c['titular']) > 2: errores.append('Titular de más de dos renglones: '+nombre)
            palabras(' '.join(c['titular'])+' '+(c.get('bajada') or ''), nombre)
        # Gráfico: el de español es el aprobado; inglés y portugués, la misma dirección.
        gnombre = f'grafico-1024x500-{CORTO[lang]}.png'; gp = FICHA/gnombre; G = L['grafico']
        with Image.open(gp) as im:
            if im.size != (1024, 500) or im.mode != 'RGB' or 'transparency' in im.info: errores.append('Formato de gráfico incorrecto: '+gnombre)
            gfinal = im.convert('RGB')
        if G.get('aprobado'):
            if sha(gp) != HD['salidas'].get('grafico-1024x500-es.png') or sha(gp) != sha(FICHA/G['aprobado']):
                errores.append('No es idéntico al gráfico aprobado: '+gnombre)
        else:
            zx, zy, zw, zh = G['zona_libre']
            for r in G['recortes']:
                x = recorte_fiel(gfinal, crudas, r, gnombre); dx, dy = r['destino']
                if dx < zx+zw and dx+r['ancho'] > zx and dy < zy+zh and dy+x['alto'] > zy:
                    errores.append('El gráfico invade la zona del botón de reproducir: '+gnombre)
            for t in G['textos_titular']:
                k = t['caja']
                if k[0] < zx+zw and k[0]+k[2] > zx and k[1] < zy+zh and k[1]+k[3] > zy: errores.append('El titular invade la zona libre: '+gnombre)
            if max(r['destino'][0]+r['ancho'] for r in G['recortes']) != 1024: errores.append('El recorte del gráfico no llega al borde derecho: '+gnombre)
            palabras(' '.join(G['titular']), gnombre)
        # Textos: se publica la B; la C queda guardada; la de control no se publica.
        bloques = re.findall(r'\[\[([\s\S]*?)\]\]', (FICHA/f'textos-{lang}.txt').read_text(encoding='utf-8'))
        ops = {o['papel']: o['texto'] for o in D['breves'][lang]}
        if len(bloques) != 3 or any(len(t) > m for t, m in zip(bloques, [30, 80, 4000])): errores.append('Bloques de texto o límites incorrectos: '+lang)
        elif bloques[1] != ops['B']: errores.append('La breve publicada no es la B: '+lang)
        elif ops['C'] in bloques[2] or ops['control'] == bloques[1]: errores.append('La C o la de control quedaron publicadas: '+lang)
        palabras(bloques[1], 'breve publicada '+lang)
        if lang == 'es-419' and re.search(r'\b(vos|tenés|podés|querés|hablás|sabés|leés)\b', bloques[2].lower()): errores.append('Voseo en la descripción en español')
    breves = (REG11/'breves-1.1.txt').read_text(encoding='utf-8')
    for lang in F['idiomas']:
        for o in D['breves'][lang]:
            if '[['+o['texto']+']]' not in breves: errores.append(f'Falta en breves-1.1.txt: {lang} {o["papel"]}')
    # Tabletas: 16:9 exacto, lados entre 1080 y 7680, RGB sin alfa, solo recorte -sin escala- de la cruda, sin las barras del sistema.
    T = F.get('tabletas')
    esperadas = [f'capturas/tableta/{l}/{s}/{n:02}.png' for l in F['idiomas'] for s in ('7', '10') for n in range(1, 5)]
    halladas = sorted(p.relative_to(FICHA).as_posix() for p in (FICHA/'capturas/tableta').rglob('*.png')) if (FICHA/'capturas/tableta').is_dir() else []
    if halladas != sorted(esperadas): errores.append(f'Tabletas: se esperan 24 en capturas/tableta/<idioma>/{{7,10}}/01-04.png; hay {len(halladas)}')
    if T:
        for t in T['piezas']:
            nombre = f"capturas/tableta/{t['idioma']}/{t['tamano']}/{t['n']:02}.png"; path = FICHA/nombre
            if not path.is_file(): errores.append('Falta '+nombre); continue
            if 'ajustes' in t['cruda'].lower(): errores.append('Tableta hecha con Ajustes, que muestra la promoción de Sigo+: '+nombre)
            x0, y0, x1, y1 = t['recorte']
            with Image.open(path) as im, Image.open(SOURCE/T['crudas']/t['cruda']) as cr:
                w, h = im.size
                if w*9 != h*16 or not (1080 <= min(w, h) and max(w, h) <= 7680) or w <= h: errores.append(f'Tableta fuera de 16:9 horizontal o de 1080-7680: {nombre} {w}×{h}')
                if im.mode != 'RGB' or 'transparency' in im.info: errores.append('Tableta con alfa o sin RGB: '+nombre)
                if (w, h) != (x1-x0, y1-y0) or w != cr.width: errores.append('La tableta no sale del ancho completo de su cruda, sin escalar: '+nombre)
                if not (t['barra_estado'] <= y0 and y1 <= t['barra_tareas']): errores.append('Se ve la barra de estado o la de tareas: '+nombre)
                c = cr.convert('RGB')
                if ImageChops.difference(im.convert('RGB'), c.crop((x0, y0, x1, y1))).getbbox(): errores.append('La tableta no es el recorte exacto de la cruda: '+nombre)
                # Lo que se corta además de las barras tiene que ser fondo liso: así ningún texto ni botón de Sigo queda cortado.
                for a, b in ((t['barra_estado'], y0), (y1, t['barra_tareas'])):
                    for y in range(a, b):
                        if max(hi-lo for lo, hi in c.crop((0, y, c.width, y+1)).getextrema()) > 16:
                            errores.append(f'Se cortó una fila con contenido de la app, y={y}: {nombre}'); break
                for ex in t.get('excluye', []):
                    e = ex['caja']
                    if e[0] < x1 and e[2] > x0 and e[1] < y1 and e[3] > y0: errores.append(f'La tableta deja ver {ex["que"]}: {nombre}')
    if args.generada:
        for rel, expected in H['salidas'].items():
            path = args.generada/'ficha-1.1'/rel
            if not path.is_file() or sha(path) != expected:
                errores.append('Regeneración de la ficha 1.1 distinta: '+rel)

if args.alcance in ('todo', '1.0'):
    comprobar_10()
    comprobar_10_formatos()
if args.alcance in ('todo', '1.1'):
    comprobar_11()
    # 12-11-2026, fase 2 -t169u-: también la ficha 1.1 canónica.
    comprobar_ficha_11()

result = {'pillow': Image.__version__, 'python': platform.python_version(), 'sistema': platform.system(),
          'freetype': features.version('freetype2'), 'zlib': zlib.ZLIB_VERSION,
          'salidas_aprobadas': len(manifest['salidas']), 'tabletas_conservadas': len(manifest['tabletas']),
          'entradas': len(manifest['entradas']), 'alcance': args.alcance, 'regeneracion_verificada': bool(args.generada), 'diferencias_regeneracion': differences, 'avisos': avisos, 'errores': errores}
if args.informe:
    args.informe.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errores))

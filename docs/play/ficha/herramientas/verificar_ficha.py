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
args = parser.parse_args()
manifest = json.loads((FICHA/'aprobacion-20261030/manifiesto-repositorio.json').read_text(encoding='utf-8'))
errores = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def huella(path, expected, label):
    if not path.is_file() or sha(path) != expected:
        errores.append('Huella distinta o archivo ausente: '+label)

for rel, expected in manifest['salidas'].items():
    huella(FICHA/rel, expected, rel)
for rel, expected in manifest['tabletas'].items():
    huella(FICHA/rel, expected, rel)
huella(REPO/manifest['icono']['ruta'], manifest['icono']['sha256'], 'ícono conservado')
for rel, expected in manifest['entradas'].items():
    huella(SOURCE/rel, expected, 'entrada '+rel)

for lang in ['es-419', 'en-US', 'pt-BR']:
    files = sorted((FICHA/'capturas'/lang).glob('*.png'))
    if [p.name for p in files] != [f'{n:02}.png' for n in range(1, 9)]:
        errores.append('Deben ser exactamente 01.png a 08.png: '+lang)
    for n, p in enumerate(files, 1):
        with Image.open(p) as im:
            if im.size != ((1920, 1080) if n == 8 else (1080, 1920)) or im.mode != 'RGB' or p.stat().st_size >= 8*1024*1024:
                errores.append('Formato de captura incorrecto: '+str(p.relative_to(FICHA)))
    short = {'es-419': 'es', 'en-US': 'en', 'pt-BR': 'pt'}[lang]
    with Image.open(FICHA/f'grafico-1024x500-{short}.png') as im:
        if im.size != (1024, 500) or im.mode != 'RGB':
            errores.append('Formato de gráfico incorrecto: '+lang)
    import re
    blocks = re.findall(r'\[\[([\s\S]*?)\]\]', (FICHA/f'textos-{lang}.txt').read_text(encoding='utf-8'))
    if len(blocks) != 3 or any(len(t)>maximum for t, maximum in zip(blocks, [30, 80, 4000])):
        errores.append('Bloques de texto o límites incorrectos: '+lang)

differences = []
if args.generada:
    for original, canonical in manifest['mapeo_aprobacion'].items():
        path = args.generada/original
        if not path.is_file() or sha(path) != manifest['salidas'][canonical]:
            detail = {'archivo': original, 'ausente': not path.is_file()}
            if path.is_file() and path.suffix == '.png':
                with Image.open(path) as a, Image.open(FICHA/canonical) as b:
                    diff = ImageChops.difference(a.convert('RGB'), b.convert('RGB'))
                    detail.update(caja_diferencia=diff.getbbox(), diferencia_maxima=max(v[1] for v in diff.getextrema()))
            differences.append(detail)
    if differences:
        errores.append(f'Regeneración distinta: {len(differences)} archivos; no sustituir los aprobados.')

result = {'pillow': Image.__version__, 'python': platform.python_version(), 'sistema': platform.system(),
          'freetype': features.version('freetype2'), 'zlib': zlib.ZLIB_VERSION,
          'salidas_aprobadas': len(manifest['salidas']), 'tabletas_conservadas': len(manifest['tabletas']),
          'entradas': len(manifest['entradas']), 'regeneracion_verificada': bool(args.generada), 'diferencias_regeneracion': differences, 'errores': errores}
if args.informe:
    args.informe.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(bool(errores))

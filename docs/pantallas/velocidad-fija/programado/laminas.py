# Arma las laminas ANTES | DESPUES de la tarea 106, paso 0. Solo PIL.
from PIL import Image, ImageDraw, ImageFont
import os, textwrap
F = "/usr/share/fonts/truetype/sand-box/google/Source Sans 3/SourceSans3-VariableFont_wght.ttf"
def fuente(t):
    return ImageFont.truetype(F, t)
OUT = '/workspace/vf/docs/pantallas/velocidad-fija'
A, D = '/tmp/capvf/antes', '/tmp/capvf/despues'
BG, FG, AP = (21, 19, 18), (231, 225, 222), (202, 197, 194)

def lamina(nombre, titulo, filas, nota, S=0.42):
    # filas: lista de filas; cada fila, lista de (png, rotulo, sub, escala relativa)
    bloques = []
    for fila in filas:
        ims = [(Image.open(p).convert('RGB'), r, s, e) for p, r, s, e in fila]
        bloques.append(ims)
    m, g, cab, eti = 28, 24, 70, 74
    nota_l = []
    for par in nota: nota_l += textwrap.wrap(par, 160) + ['']
    anchos = [m * 2 + sum(int(im.width * S * e) for im, _, _, e in b) + g * (len(b) - 1) for b in bloques]
    altos = [eti + max(int(im.height * S * e) for im, _, _, e in b) + 20 for b in bloques]
    W = max(anchos + [1400]); H = cab + sum(altos) + 22 * len(nota_l) + 20 + m
    out = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(out)
    d.text((m, 20), titulo, font=fuente(30), fill=FG)
    y = cab
    for b, alto in zip(bloques, altos):
        x = m
        for im, rot, sub, e in b:
            w, h = int(im.width * S * e), int(im.height * S * e)
            d.text((x, y), rot, font=fuente(22), fill=(255, 140, 110) if rot.startswith(('DESPUÉS', 'PROPUESTA')) else FG)
            d.text((x, y + 28), sub, font=fuente(16), fill=AP)
            out.paste(im.resize((w, h), Image.LANCZOS), (x, y + eti))
            d.rectangle([x - 1, y + eti - 1, x + w, y + eti + h], outline=AP)
            x += w + g
        y += alto
    y += 8
    for l in nota_l:
        d.text((m, y), l, font=fuente(17), fill=FG); y += 22
    out.save(f'{OUT}/{nombre}', optimize=True); print(nombre, out.size)

ESC = 'Teléfono 412×915 CSS, DPR 2,625 (captura 1082×2402); en la lámina al 42 %. Tema oscuro, guion «Hola», letra 32. Dibujado con los componentes reales (PanelAjustes, DockListo, FichasListo, FilaAjuste, MenuAdjuntoAjustes, fila-toma) en Chrome sin pantalla.'
VEL = 'VELOCIDAD SIN NÚMEROS: 7 niveles, cada uno 14 % más rápido (100, 114, 130, 148, 169, 193, 220 palabras/min, que nunca se muestran; solo mueven el texto y calculan la duración). Nivel 1 muy tranquilo, 7 rápido, por omisión 4. Un solo control en todas partes: pastilla con «−» a la izquierda, «+» a la derecha y entre ellos una barra de 7 tramos llena hasta el nivel. Cada toque sube o baja un nivel; − apagado en 1, + apagado en 7. TalkBack: «Velocidad, nivel N de 7».'

lamina('1-ajustes-velocidad-fija.png', '1. Ajustes sobre Leer — «Velocidad fija» elegida', [[
    (f'{A}/ajustes.png', 'ANTES · main', 'Ajustes de hoy en Leer', 1),
    (f'{D}/ajustes.png', 'DESPUÉS · nivel 4', 'Selector, explicación y la fila Velocidad con el control', 1),
    (f'{D}/ajustes-n1.png', 'DESPUÉS · nivel 1', '− apagado; «dura aprox.» pasa a 4:13', 1),
]], [ESC, VEL,
 'Nuevo entre la cabecera y la muestra: selector segmentado de Material 3 (alto 48, redondo, borde 1 px --borde-tarjeta; mitad elegida en --color-acento con --color-texto-acento). Debajo, una línea de 13 en --color-apagado. Solo con Velocidad fija: tarjeta con la FilaAjuste «Velocidad» y el control adentro, a la derecha del nombre; ya no hay menú de opciones.',
 'Cada toque cambia la duración visible: abajo, «dura aprox.» = palabras ÷ palabras/min del nivel (nivel 4: 2:51; nivel 1: 4:13).'])

lamina('2-listo-ficha-modo.png', '2. LISTO de Leer, dock cerrado — la ficha del modo abajo a la izquierda (aprobada)', [[
    (f'{A}/listo.png', 'ANTES · main', 'Hoy: nada a la izquierda', 1),
    (f'{D}/listo-voz.png', 'DESPUÉS · Con la voz', 'Rótulo chico: «sigue tu voz»', 1),
    (f'{D}/listo-fija.png', 'DESPUÉS · Velocidad fija, nivel 4', 'Rótulo chico: la barra; dura 2:51', 1),
], [
    (f'{D}/listo-fija-n6.png', 'DESPUÉS · nivel 6', 'La barra y la duración siguen al nivel: 2:11', 1),
    (f'{D}/listo-menu.png', 'DESPUÉS · menú de la ficha', 'Modo y, debajo, el mismo control', 1),
]], [ESC, VEL,
 'La ficha del modo va en el lugar izquierdo de la fila de abajo, vacío en Leer. La fila de fichas de arriba queda como hoy. El menú: «Con la voz» / «Velocidad fija» y, con Velocidad fija, el rótulo chico «velocidad» y el control (reemplaza al «− 150 +»).'])

lamina('3-leyendo-velocidad-fija.png', '3. Leyendo en Velocidad fija, controles a la vista — Parar se queda', [[
    (f'{A}/leyendo.png', 'ANTES · main', 'Pausa y Parar de hoy', 1),
    (f'{D}/leyendo.png', 'PEDIDO · NO CABE', 'Control en el lugar derecho: pisa Parar', 1),
    (f'{D}/leyendo-vertical.png', 'PROPUESTA', 'El control parado, al borde derecho', 1),
]], [ESC,
 'Pausa y Parar como en main, también en Velocidad fija. El tiempo sigue en la pastilla, como hoy. Banda de lectura: renglón de arriba en --color-texto al 100 %, el resto al 45 %, sin línea bajo las palabras. Tocar el texto pausa y sigue.',
 'MEDIDO: el lugar derecho de la fila de la toma (vacío al leer) va de x 274 a 330 (56 px), y hasta el borde con el margen de 16 hay 122 px (274 a 396). El control acostado mide 176 px: faltan 54 px, y centrado en su celda pisa Parar 28 px.',
 'PROPUESTA, sin tocar Pausa ni Parar: el mismo control, parado (+ arriba, la barra, − abajo), contra el borde derecho a la altura de la fila (x 350 a 400, 50 px de ancho), con el rótulo chico «velocidad» debajo. Es el mismo control que de lado.'])

lamina('4-de-lado.png', '4. De lado (teléfono horizontal), Leer', [[
    (f'{A}/lado-listo.png', 'ANTES · LISTO', 'Riel izquierdo: Aa, Arriba, Auto', 1),
    (f'{D}/lado-listo.png', 'DESPUÉS · LISTO', 'Ficha del modo primera en el riel; menú con el control', 1),
], [
    (f'{A}/lado-mas.png', 'ANTES · Más', 'Ajustes desde la ficha Más', 1),
    (f'{D}/lado-mas.png', 'DESPUÉS · Más', 'El mismo selector y la fila Velocidad', 1),
], [
    (f'{A}/lado-leyendo.png', 'ANTES · leyendo', 'Pausa y Parar en la columna del riel derecho', 1),
    (f'{D}/lado-leyendo-pedido.png', 'PEDIDO · NO CABE', 'Control parado bajo Parar: lo pisa y llega a la pastilla', 1),
    (f'{D}/lado-leyendo.png', 'PROPUESTA', 'Control parado en el riel izquierdo, vacío al leer', 1),
]], ['Teléfono 915×412 CSS, DPR 2,625; al 42 %. Mismo tema, guion y letra.',
 'LISTO: la ficha del modo va primera en el riel izquierdo, antes de Aa. El riel es angosto: la ficha lleva el ícono y la barra chica (o micrófono + «Voz»). Abre el mismo menú, con el control.',
 'LEYENDO: Pausa y Parar como hoy. MEDIDO: en la columna del riel derecho, entre el pie de Parar (y 242, más 16 de aire) y la pastilla del tiempo (y ≈ 349) quedan unos 91 px; el control parado con su rótulo mide 192: faltan unos 100 px. PROPUESTA: el control parado al centro del riel izquierdo, que al leer en Leer solo tiene la flecha de volver arriba (x 31 a 81, y 109 a 285).'])

lamina('5-grabar.png', '5. Grabar — LISTO de pie y la toma en Velocidad fija', [[
    (f'{A}/grabar-listo.png', 'ANTES · LISTO de Grabar', 'Voltear, Grabar y la duración', 1),
    (f'{D}/grabar-fila.png', 'DESPUÉS · RECOMENDADO', 'La ficha en su propia línea, arriba de las fichas', 1),
    (f'{D}/grabar-junto.png', 'Descartada', 'Junto a Voltear: Voltear queda pegado a Grabar', 1),
], [
    (f'{A}/grabar-leyendo.png', 'ANTES · grabando', 'Pausa y Parar de hoy', 1),
    (f'{D}/grabar-leyendo.png', 'DESPUÉS · grabando en Velocidad fija', 'Pausa y Parar como hoy; el control al borde', 1),
]], [ESC,
 'En Grabar el lugar izquierdo de abajo es de Voltear y la fila de fichas ya es más larga (TEXTO, CÁMARA, engranaje). MEDIDO junto a Voltear: la ficha va de x 37 a 145 y empuja a Voltear hasta x 201, justo donde empieza Grabar (201): sin aire, y con el brillo rojo encima.',
 'RECOMENDADO: la ficha del modo en su propia línea, arriba de los grupos de fichas, con su rótulo chico al lado («sigue tu voz» o la barra). No quita Voltear, no achica letras, no toca la fila de fichas y deja abajo lo de hoy. Cuesta una línea de alto (unos 40 px) en el dock solo en Grabar; la cámara se sigue viendo arriba.',
 'Grabando en Velocidad fija: Pausa y Parar como hoy; el control parado contra el borde derecho, igual que en Leer (lámina 3). La cámara es la imagen gris de prueba del navegador.'])

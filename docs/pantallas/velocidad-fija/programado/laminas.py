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

ESC = 'Teléfono 412×915 CSS, DPR 2,625 (captura 1082×2402); en la lámina al 42 %. Tema oscuro, guion «Hola», letra 32. Dibujado con los componentes reales (PanelAjustes, DockListo, FichasListo, FilaAjuste, MenuAdjuntoAjustes) en Chrome sin pantalla.'

lamina('1-ajustes-velocidad-fija.png', '1. Ajustes sobre Leer — «Velocidad fija» elegida', [[
    (f'{A}/ajustes.png', 'ANTES · main', 'Ajustes de hoy en Leer', 1),
    (f'{D}/ajustes.png', 'DESPUÉS', 'Selector arriba, explicación y Velocidad', 1),
    (f'{D}/ajustes-menu.png', 'DESPUÉS · menú abierto', 'Menú adjunto a la fila: 80 a 220 de 10 en 10', 1),
]], [ESC,
 'Nuevo entre la cabecera y la muestra: selector segmentado de Material 3, alto 48, redondo, borde 1 px --borde-tarjeta; mitad elegida en --color-acento con texto e ícono --color-texto-acento, la otra transparente con --color-texto. Debajo, una línea de 13 en --color-apagado («El texto sigue tu voz.» / «El texto sube solo, a la velocidad que elijas.»). Solo con Velocidad fija: tarjeta con la FilaAjuste «Velocidad · 150 palabras/min ›».',
 'El menú tiene las 15 opciones (80…220); no caben las 15 de 48 de alto en la pantalla, así que la lista se desplaza dentro del menú y abre con 150 a la vista, marcada con ✓. Íconos nuevos en IconosApp.tsx: IconoMicrofono (Material Symbols «mic») e IconoVelocimetro («speed»), trazo 1,6 en 24×24.'])

lamina('2-listo-ficha-modo.png', '2. LISTO de Leer, dock cerrado — la ficha del modo', [[
    (f'{A}/listo.png', 'ANTES · main', 'Fila de fichas de hoy', 1),
    (f'{D}/listo-voz.png', 'DESPUÉS · Con la voz', 'Ficha primera, antes de Aa', 1),
    (f'{D}/listo-fija.png', 'DESPUÉS · Velocidad fija · 150', 'NO CABE: el engranaje queda fuera', 1),
    (f'{D}/listo-menu.png', 'Menú de la ficha', 'Modo + velocidad − / +', 0.6),
], [
    (f'{D}/listo-voz-abajo.png', 'PROPUESTA · Con la voz', 'Ficha en el lugar izquierdo de abajo', 1),
    (f'{D}/listo-fija-abajo.png', 'PROPUESTA · Velocidad fija', 'Valor debajo, como «dura aprox.»', 1),
    (f'{D}/listo-menu-abajo.png', 'PROPUESTA · menú', 'Mismo menú, adjunto a la ficha', 0.6),
]], [ESC,
 'MEDIDO en 412: la fila de fichas tiene 354 px útiles. Con «Velocidad fija · 150» el contenido mide 408 (sobran 54 px); con «Con la voz», 365 (sobran 11). Aa no se corta, pero el engranaje de Ajustes queda fuera de la pantalla en los dos estados. NO CABE.',
 'PROPUESTA, sin achicar la letra de las fichas: la ficha del modo va en el lugar izquierdo de la fila de abajo, que en Leer está vacío (en Grabar es Voltear). La ficha dice el modo y debajo, chico, el valor —«150 palabras/min» o «sigue tu voz»— igual que «2:48 / dura aprox.» a la derecha. La fila de arriba queda como hoy (354 de 354). Mide 37 a 145 px; Play empieza en 170.',
 'Abajo, como hoy en Leer: nada a la izquierda (o la ficha, en la propuesta), Play al centro y la duración a la derecha. En Velocidad fija la duración es palabras ÷ 150 con el mismo rótulo «dura aprox.»; hoy la estimación ya usa 150 palabras/min, así que da lo mismo: 2:48. El menú: «Con la voz» / «Velocidad fija» y, con Velocidad fija, la velocidad con − y + de 10 en 10 (− apagado en 80, + apagado en 220).'])

lamina('3-leyendo-velocidad-fija.png', '3. Leyendo en Velocidad fija, controles a la vista', [[
    (f'{A}/leyendo.png', 'ANTES · main', 'Leyendo con la voz, controles de hoy', 1),
    (f'{D}/leyendo.png', 'DESPUÉS · Velocidad fija', '− · Pausa · + · velocidad', 1),
]], [ESC,
 'Banda de lectura: letra 32, anclaje Arriba. El renglón de arriba —el que se lee— en --color-texto al 100 %, el resto al 45 %. Sin línea bajo las palabras.',
 'Abajo: al centro la Pausa de hoy; en el lugar izquierdo (vacío hoy en Leer) «−» en un círculo de 48 con el estilo dock-voltear-circulo; a la derecha de la Pausa «+», igual; y en el lugar de la duración «150 palabras/min» con el estilo dock-duracion y el rótulo chico «velocidad». El tiempo de lectura sigue en la pastilla de arriba, como hoy.',
 'Regla de apagado: − apagado en 80, + apagado en 220 (de 10 en 10). Tocar el texto pausa y sigue.',
 'PARA DECIDIR: el pedido no nombra Parar (el botón rojo de hoy en Leer). La lámina lo dibuja sin él, como pide el encargo: para terminar queda la flecha de volver de arriba a la izquierda.'])

L = 0.42
lamina('4-de-lado.png', '4. De lado (teléfono horizontal), Leer', [[
    (f'{A}/lado-listo.png', 'ANTES · LISTO', 'Riel izquierdo: Aa, Arriba, Auto', 1),
    (f'{D}/lado-listo.png', 'DESPUÉS · LISTO (recomendado)', 'Ficha del modo primera en el riel, con su menú', 1),
], [
    (f'{A}/lado-mas.png', 'ANTES · Más', 'Ajustes desde la ficha Más', 1),
    (f'{D}/lado-mas.png', 'DESPUÉS · Más', 'El mismo selector y la fila Velocidad', 1),
], [
    (f'{A}/lado-leyendo.png', 'ANTES · leyendo', 'Pausa y Parar en la columna del riel derecho', 1),
    (f'{D}/lado-leyendo.png', 'DESPUÉS · leyendo', '+ · Pausa · − y la velocidad, en la columna', 1),
]], ['Teléfono 915×412 CSS, DPR 2,625; al 42 %. Mismo tema, guion y letra.',
 'RECOMENDADO: la ficha del modo va primera en el riel izquierdo, antes de Aa, como de pie va primera en la fila. El riel mide lo que mide una ficha (unos 96 px), así que ahí la ficha dice solo el ícono y el valor: velocímetro + «150», o micrófono + «Voz». Tocarla abre el mismo menú adjunto (modo y − / +). El panel de Más trae el mismo selector y la fila Velocidad que de pie. Leyendo: en la columna del riel derecho, + arriba, la Pausa al medio y − abajo (más rápido arriba, como un volumen), y la velocidad debajo, donde de pie va la duración; la pastilla del tiempo sigue abajo.',
 'Otra opción posible: el modo solo dentro de Más, sin ficha en el riel. Se descarta porque elegir la velocidad antes de empezar quedaría a dos toques y de pie está a uno.'])

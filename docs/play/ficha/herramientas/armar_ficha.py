from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, shutil, csv, hashlib, html
from datetime import datetime, timezone

# 30-10-2026: fuentes versionadas y salida temporal para no sobreescribir lo aprobado.
# Antes: REPO, NATIVE y REV apuntaban al PC de Javier y OLD leía la serie que reemplazaba.
import argparse
# Pillow 13 cambió el remuestreo: fijamos el entorno que reproduce las huellas aprobadas.
if Image.__version__ != "12.0.0":
    raise RuntimeError("Usa Pillow 12.0.0: instala herramientas/requirements.txt en un entorno separado.")
SOURCE=Path(__file__).resolve().parent
REPO=SOURCE.parents[3]
FICHA=SOURCE.parent
parser=argparse.ArgumentParser(description='Regenera la ficha aprobada en una carpeta de revisión.')
parser.add_argument('--salida',type=Path,default=REPO/'.herramientas/ficha-generada-20261030')
# 12-11-2026: --alcance elige qué se arma. «1.0» es la ficha aprobada el 30-10; «1.1», la dirección de la fase 1.
parser.add_argument('--alcance',choices=['todo','1.0','1.1'],default='todo')
ARGS=parser.parse_args();ALCANCE=ARGS.alcance
R=ARGS.salida.resolve()
if R.is_relative_to(FICHA) or FICHA.is_relative_to(R):
    raise ValueError('Usa una salida de revisión fuera de las fuentes y de la ficha canónica.')
R.mkdir(parents=True,exist_ok=True)
OLD=SOURCE/'entradas/anteriores'
NATIVE=SOURCE/'entradas/motorola'
REV=SOURCE/'entradas/composicion'
DATA=json.loads((SOURCE/'contenidos.json').read_text(encoding='utf-8'))
# La dirección 1.1 vive en el mismo contenidos.json, aparte de los tres idiomas de la ficha 1.0.
DIRECCION=DATA.pop('direccion-1.1',None)
for folder in ['capturas','graficos','textos','miniaturas','licencias','video']:(R/folder).mkdir(exist_ok=True)
PROVENANCE=[]

def font(size,weight=600):
    # 12-11-2026: maquetación BASIC fija. Es la que usa Pillow 12.0.0 en Windows, donde se aprobaron las huellas;
    # en Linux Pillow trae Raqm y cambiaba el ancho de los titulares. Con BASIC los píxeles coinciden en los dos.
    # Antes -12-11-2026-: ImageFont.truetype(..., size), con la maquetación que tuviera cada sistema.
    return ImageFont.truetype(str(SOURCE/f'entradas/fuentes/source-sans-3-latin-{weight}-normal.woff2'),size,layout_engine=ImageFont.Layout.BASIC)

def txt(im,xy,text,size,color,weight=600,anchor='lt',maxw=None):
    d=ImageDraw.Draw(im)
    if maxw:
        minimum=min(size,27)
        # Cada idioma conserva una letra grande; los cortes se eligen en contenidos.json.
        while d.textlength(text,font=font(size,weight))>maxw:
            size-=1
        if size<minimum:raise ValueError('Texto demasiado pequeño: '+text)
    d.text(xy,text,font=font(size,weight),fill=color,anchor=anchor)
    return size

def frame(im,source,box,crop=None,border=True):
    p=Image.open(source).convert('RGB') if isinstance(source,(str,Path)) else source.copy()
    if crop:p=p.crop(crop)
    scale=min(box[2]/p.width,box[3]/p.height)
    p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
    x=round(box[0]+(box[2]-p.width)/2);y=round(box[1]+(box[3]-p.height)/2)
    if border:
        sh=Image.new('RGBA',im.size);ImageDraw.Draw(sh).rounded_rectangle((x-9,y,x+p.width+9,y+p.height+19),radius=34,fill=(0,0,0,85))
        im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(17)))
        ImageDraw.Draw(im).rounded_rectangle((x-6,y-6,x+p.width+6,y+p.height+6),radius=32,fill='#57473A')
    mask=Image.new('L',p.size,0);ImageDraw.Draw(mask).rounded_rectangle((0,0,p.width-1,p.height-1),radius=25 if border else 14,fill=255)
    im.paste(p,(x,y),mask)
    return [x,y,p.width,p.height]

def base(lang,n):
    light=n in (1,3,5,7)
    fg='#29231F' if light else '#ECE6E0'
    sub='#5E5147' if light else '#C6B6A6'
    bg='#F0EAE4' if light else '#171412'
    im=Image.new('RGBA',(1920,1080) if n==8 else (1080,1920),bg)
    logo=Image.open(REV/('marca-oscura.png' if light else 'marca-clara.png')).convert('RGBA');logo.thumbnail((146,88),Image.Resampling.LANCZOS)
    im.alpha_composite(logo,(66,53))
    heading,explanation,label=DATA[lang]['laminas'][n-1]
    txt(im,(im.width-70,85),label,29,sub,anchor='rt',maxw=760)
    d=ImageDraw.Draw(im);size=106
    while max(d.textlength(t,font=font(size)) for t in heading)>(im.width-132):size-=1
    if size<94:raise ValueError('Hay que recortar el titular, no encogerlo: '+lang+str(n))
    for i,t in enumerate(heading):txt(im,(66,159+i*113),t,size,fg)
    subtitle_y=292 if n==8 else 402
    txt(im,(69,subtitle_y),explanation,36,sub,400,maxw=im.width-138)
    ImageDraw.Draw(im).line((69,subtitle_y+60,162,subtitle_y+60),fill='#9E462E' if light else '#E3B575',width=5)
    return im,fg,sub


# ---------------------------------------------------------------------------
# DIRECCIÓN DE LA FICHA 1.1, FASE 1 -12-11-2026-
# Capturas 1, 2, 3 y 5 en español, gráfico y dos láminas, desde contenidos.json["direccion-1.1"] y las
# crudas de entradas/motorola-1.1/es. Solo recorte, escala y fondo de la ficha: sin marco, sin rótulo y sin
# tapar nada de la interfaz. Se escribe en <salida>/direccion-1.1/ y no toca la ficha canónica de 1.0.
# ---------------------------------------------------------------------------
import struct, zlib

def png_estable(im,path):
    # Pillow comprime con zlib-ng, que da bytes distintos según la máquina aunque los píxeles sean iguales.
    # Aquí se escribe el PNG a mano con el zlib clásico de Python -nivel 9, filtro Up en todas las filas-,
    # para que la huella SHA-256 sea la misma en Windows y en Linux. RGB de 24 bits, sin alfa.
    im=im.convert('RGB');w,h=im.size
    arriba=Image.new('RGB',(w,h),(0,0,0));arriba.paste(im.crop((0,0,w,h-1)),(0,1))
    up=ImageChops.subtract_modulo(im,arriba).tobytes()
    fila=w*3
    crudo=b''.join(b'\x02'+up[i*fila:(i+1)*fila] for i in range(h))
    def bloque(tipo,datos):return struct.pack('>I',len(datos))+tipo+datos+struct.pack('>I',zlib.crc32(tipo+datos)&0xffffffff)
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+bloque(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+bloque(b'IDAT',zlib.compress(crudo,9))+bloque(b'IEND',b''))

def armar_direccion_11():
    from PIL import ImageChops as _IC
    globals()['ImageChops']=_IC
    D=DIRECCION;CRUDAS=SOURCE/D['crudas'];OUT=R/'direccion-1.1'
    (OUT/'capturas/es-419').mkdir(parents=True,exist_ok=True)
    sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
    procedencia=[];medidas={'capturas':{},'grafico':{},'breves':{}}
    COLORES={'claro':('#F0EAE4','#29231F','#5E5147','marca-oscura.png'),'oscuro':('#171412','#ECE6E0','#C6B6A6','marca-clara.png')}

    def texto(im,t,reg):
        # reg: {"texto","x","base","tam","peso","color","caja"}; la caja declarada debe contener la tinta.
        d=ImageDraw.Draw(im);f=font(reg['tam'],reg.get('peso',600))
        d.text((reg['x'],reg['base']),t,font=f,fill=reg['color'],anchor='ls')
        tinta=d.textbbox((reg['x'],reg['base']),t,font=f,anchor='ls')
        caja=reg.get('caja')
        if caja and not (tinta[0]>=caja[0] and tinta[1]>=caja[1] and tinta[2]<=caja[0]+caja[2] and tinta[3]<=caja[1]+caja[3]):
            raise ValueError(f'La tinta {tinta} se sale de la caja declarada {caja}: {t}')
        if tinta[2]>im.width-40:raise ValueError('Texto demasiado ancho: '+t)
        return list(tinta)

    def logo(im,claro,x,y,alto):
        m=Image.open(REV/('marca-oscura.png' if claro else 'marca-clara.png')).convert('RGBA')
        m=m.crop(m.getbbox());m=m.resize((round(m.width*alto/m.height),alto),Image.Resampling.LANCZOS)
        im.alpha_composite(m,(x,y));return [x,y,m.width,m.height]
    def logo_declarado(im,claro,L):
        caja=logo(im,claro,L['x'],L['y'],L['alto'])
        if L.get('caja') and L['caja']!=caja:raise ValueError(f'Caja del logo distinta de la declarada: {caja}')
        return caja

    def pegar(im,r,nombre):
        src=CRUDAS/r['cruda'];x0,y0,x1,y1=r['recorte']
        cw,ch=x1-x0,y1-y0;escala=r['ancho']/cw;alto=round(ch*escala)
        p=Image.open(src).convert('RGB').crop((x0,y0,x1,y1)).resize((r['ancho'],alto),Image.Resampling.LANCZOS)
        dx,dy=r['destino']
        if dx<0 or dy<0 or dx+p.width>im.width or dy+p.height>im.height:raise ValueError('El recorte se sale de la imagen: '+nombre)
        im.paste(p,(dx,dy))
        # 12-11-2026, corrección t166u: motivo_escala explica un recorte de más de 820 px o de menos de 1,3×;
        # excepcion_borde, un recorte que no arranca en el margen izquierdo del texto de la app.
        extra={k:r[k] for k in ('margen_texto_app','motivo_escala','excepcion_borde') if k in r}
        procedencia.append(dict(imagen=nombre,cruda=src.relative_to(REPO).as_posix(),sha256_cruda=sha(src),recorte_cruda=[x0,y0,x1,y1],
            caja_destino=[dx,dy,p.width,alto],escala=round(escala,4),parte=r['parte'],
            tratamiento='Recorte y escala proporcional LANCZOS. Sin retoque, sin marco y sin tapar nada; la barra de estado queda fuera del recorte.',**extra))
        return dict(cruda=r['cruda'],recorte_cruda=[x0,y0,x1,y1],ancho_recorte=cw,alto_recorte=ch,escala=round(escala,4),caja=[dx,dy,p.width,alto],**extra)

    def franja_vacia(im):
        # Franja sin contenido: filas seguidas en que ningún canal varía más de 16 niveles a lo ancho
        # -fondo liso, claro u oscuro, o negro de la app-. Se informa la más alta.
        im=im.convert('RGB');mejor=(0,0,0);ini=None
        for y in range(im.height+1):
            lisa=y<im.height and max(hi-lo for lo,hi in im.crop((0,y,im.width,y+1)).getextrema())<=16
            if lisa and ini is None:ini=y
            if not lisa and ini is not None:
                if y-ini>mejor[0]:mejor=(y-ini,ini,y)
                ini=None
        return dict(alto_px=mejor[0],pct_alto=round(100*mejor[0]/im.height,2),filas=[mejor[1],mejor[2]],
            metodo='Filas seguidas en que ningún canal varía más de 16 niveles a lo ancho; cuenta el fondo de la ficha y el negro de la app.')

    def cara_en_captura(k,recortes,ancho,alto_im):
        # Caja de la cara marcada sobre la cruda -cara_caja_cruda-, llevada a la captura por cada recorte que la contiene.
        if not k:return None
        cx0,cy0,cx1,cy1=k['caja'];area=0;cajas=[]
        for r in recortes:
            if r['cruda']!=k['cruda']:continue
            x0,y0,x1,y1=r['recorte'];ix0,iy0,ix1,iy1=max(cx0,x0),max(cy0,y0),min(cx1,x1),min(cy1,y1)
            if ix0>=ix1 or iy0>=iy1:continue
            e=r['ancho']/(x1-x0);dx,dy=r['destino']
            b=[round(dx+(ix0-x0)*e),round(dy+(iy0-y0)*e),round(dx+(ix1-x0)*e),round(dy+(iy1-y0)*e)]
            cajas.append(b);area+=(b[2]-b[0])*(b[3]-b[1])
        return dict(cruda=k['cruda'],caja_cruda=k['caja'],cajas_captura=cajas,pct_captura=round(100*area/(ancho*alto_im),2),metodo=k['metodo'])

    finales=[]
    for c in D['es-419']['capturas']:
        n=c['n'];bg,fg,sub,_=COLORES[c['fondo']];claro=c['fondo']=='claro'
        im=Image.new('RGBA',(1080,1920),bg)
        nombre=f'direccion-1.1/capturas/es-419/{n:02}.png'
        cajas=[];
        L=c['logo'];cajas.append(dict(que='logo',caja=logo_declarado(im,claro,L)))
        for t,reg in zip(c['titular'],c['textos_titular']):
            reg=dict(reg,color=fg);cajas.append(dict(que=t,caja=reg.get('caja'),tinta=texto(im,t,reg)))
        if c.get('bajada'):
            reg=dict(c['texto_bajada'],color=sub,peso=400);cajas.append(dict(que=c['bajada'],caja=reg.get('caja'),tinta=texto(im,c['bajada'],reg)))
        recs=[pegar(im,r,nombre) for r in c['recortes']]
        area=1080*1920
        declaradas=[k['caja'] for k in cajas]
        medidas['capturas'][f'{n:02}']=dict(
            recortes=recs,cajas_texto=cajas,
            texto_pct=round(100*sum(b[2]*b[3] for b in declaradas if b)/area,2),
            interfaz_pct=round(100*sum(r['caja'][2]*r['caja'][3] for r in recs)/area,2),
            ancho_recorte_max=max(r['ancho_recorte'] for r in recs),escala_min=min(r['escala'] for r in recs),cara=c['cara'],
            cara_medida=cara_en_captura(c.get('cara_caja_cruda'),c['recortes'],1080,1920),franja_vacia_max=franja_vacia(im))
        procedencia.append(dict(imagen=nombre,textos=[k['que'] for k in cajas[1:]],logo=(REV/('marca-oscura.png' if claro else 'marca-clara.png')).relative_to(REPO).as_posix(),fondo=bg))
        png_estable(im,OUT/f'capturas/es-419/{n:02}.png');finales.append((n,im.convert('RGB')))

    # Gráfico: logo y titular a la izquierda, trozo real de lectura a la derecha. El centro queda libre porque
    # Play superpone ahí el botón de reproducir cuando hay video y no se reproduce solo -answer/9866151-.
    G=D['es-419']['grafico'];g=Image.new('RGBA',(1024,500),'#F0EAE4')
    gc=[dict(que='logo',caja=logo_declarado(g,True,G['logo']))]
    for t,reg in zip(G['titular'],G['textos_titular']):
        reg=dict(reg,color='#29231F');gc.append(dict(que=t,caja=reg.get('caja'),tinta=texto(g,t,reg)))
    # La raya de la marca, bajo el titular, como en la 1.0.
    ImageDraw.Draw(g).line(G['raya'],fill='#9E462E',width=5)
    # 12-11-2026, corrección t166u: el gráfico lleva la lectura detenida y, debajo, el micrófono quieto -dos recortes de 02-espera-a-.
    # Antes -12-11-2026-: un solo recorte, G['recorte'].
    rgs=[pegar(g,r,'direccion-1.1/grafico-1024x500-es.png') for r in G['recortes']]
    centro=G['zona_libre']
    for k in gc+[dict(que='recorte '+r['cruda'],caja=r['caja']) for r in rgs]:
        b=k.get('tinta') or k['caja']
        bb=[b[0],b[1],b[2],b[3]] if 'tinta' in k else [b[0],b[1],b[0]+b[2],b[1]+b[3]]
        if bb[0]<centro[0]+centro[2] and bb[2]>centro[0] and bb[1]<centro[1]+centro[3] and bb[3]>centro[1]:
            raise ValueError('El gráfico invade la zona del botón de reproducir: '+k['que'])
    bloque=[min(r['caja'][0] for r in rgs),min(r['caja'][1] for r in rgs),max(r['caja'][0]+r['caja'][2] for r in rgs),max(r['caja'][1]+r['caja'][3] for r in rgs)]
    medidas['grafico']=dict(recortes=rgs,cajas_texto=gc,zona_libre_centro=centro,bloque_interfaz=bloque,
        a_sangre=dict(derecha=bloque[2]==1024,arriba=bloque[1]==0,abajo=bloque[3]==500),
        ancho_pct=round(100*(bloque[2]-bloque[0])/1024,2),franja_vacia_bloque=franja_vacia(g.crop(tuple(bloque))),
        texto_pct=round(100*sum(k['caja'][2]*k['caja'][3] for k in gc if k['caja'])/(1024*500),2))
    procedencia.append(dict(imagen='direccion-1.1/grafico-1024x500-es.png',textos=G['titular'],fondo='#F0EAE4'))
    png_estable(g,OUT/'grafico-1024x500-es.png')

    # Descripciones breves: tres por idioma, como opciones. La canónica de textos-*.txt no se cambia.
    PROHIBIDAS=['mejor','nº 1','#1','nuevo','nueva','única','descuento','oferta','millones','7 días','precio','nunca se pierde','gratis','nunca','siempre']
    lineas=['DESCRIPCIONES BREVES PROPUESTAS PARA SIGO 1.1 -12-11-2026-, TRES POR IDIOMA','La de control es la publicada hoy. Javier elige una; otra queda para un experimento de ficha -answer/6227309-, una sola cosa a la vez.','']
    for lang,ops in D['breves'].items():
        lineas.append(lang)
        for o in ops:
            low=o['texto'].lower()
            mal=[p for p in PROHIBIDAS if p in low]
            if mal or len(o['texto'])>80:raise ValueError(f'Breve inválida {lang} {o["papel"]}: {mal} {len(o["texto"])}')
            medidas['breves'].setdefault(lang,[]).append(dict(papel=o['papel'],caracteres=len(o['texto'])))
            lineas+= [f'  {o["papel"]} ({len(o["texto"])}/80)',f'  [[{o["texto"]}]]',f'  Respaldo: {o["respaldo"]}','']
    (OUT/'descripciones-breves-1.1.txt').write_text('\n'.join(lineas),encoding='utf-8',newline='\r\n')

    # Lámina 1: tamaño real. Las cuatro capturas a 1080×1920 y el gráfico a 1024×500.
    gap=40;W=4*1080+5*gap;lam=Image.new('RGB',(W,1920+500+3*gap+70),'#DCD3CA');d=ImageDraw.Draw(lam)
    for i,(n,imc) in enumerate(finales):
        x=gap+i*(1080+gap);lam.paste(imc,(x,gap))
    lam.paste(g.convert('RGB'),(gap,1920+2*gap))
    d.text((gap+1024+gap,1920+2*gap+40),'Sigo 1.1 · dirección de la fase 1, español: capturas 1, 2, 3 y 5 y gráfico, a tamaño real.',font=font(44,400),fill='#29231F',anchor='lt')
    png_estable(lam,OUT/'lamina-tamano-real.png')

    # Lámina 2: miniaturas a 270 px de ancho, como en la tienda, junto a la 1.0 y dos referentes.
    def mini(p):
        im=(p if isinstance(p,Image.Image) else Image.open(p)).convert('RGB')
        return im.resize((270,round(im.height*270/im.width)),Image.Resampling.LANCZOS)
    filas=[('Sigo 1.1 · dirección fase 1 (capturas 1, 2, 3 y 5)',[mini(imc) for _,imc in finales]),
           ('Sigo 1.0 · en producción (capturas 1 a 4)',[mini(FICHA/f'capturas/es-419/{k:02}.png') for k in range(1,5)])]
    for ref in D['lamina']['referentes']:
        filas.append((ref['nombre']+' · capturas 1 a 3',[mini(SOURCE/'entradas'/a) for a in ref['archivos']]))
    g2=24;alto_fila=max(m.height for _,ms in filas for m in ms)
    M=Image.new('RGB',(g2+4*(270+g2),len(filas)*(alto_fila+70)+g2),'#FFFFFF');d=ImageDraw.Draw(M)
    for j,(titulo,ms) in enumerate(filas):
        y=g2+j*(alto_fila+70);d.text((g2,y),titulo,font=font(24,600),fill='#29231F',anchor='lt')
        for i,m in enumerate(ms):M.paste(m,(g2+i*(270+g2),y+40))
    png_estable(M,OUT/'lamina-miniaturas-270.png')

    (OUT/'procedencia.json').write_text(json.dumps(procedencia,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\r\n')
    (OUT/'medidas.json').write_text(json.dumps(medidas,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\r\n')
    print('Dirección 1.1: capturas 1, 2, 3 y 5, gráfico, breves y dos láminas en',OUT)

if ALCANCE in ('todo','1.1'):
    if not DIRECCION:raise ValueError('Falta direccion-1.1 en contenidos.json')
    armar_direccion_11()
if ALCANCE=='1.1':raise SystemExit(0)

def native(lang,es,other):return NATIVE/DATA[lang]['capturas']/(es if lang=='es-419' else other)
def published(lang,n):return OLD/f'capturas/{lang}/{n:02}.png'
def track(lang,n,paths,notes):
    PROVENANCE.append(dict(idioma=lang,imagen=f'capturas/{lang}/{n:02}.png',fuentes=[p.relative_to(REPO).as_posix() for p in paths],tratamiento=notes))

for lang,c in DATA.items():
    dest=R/'capturas'/lang;dest.mkdir(exist_ok=True)
    preview=R/'miniaturas'/lang;preview.mkdir(exist_ok=True)
    for n in range(1,9):
        im,fg,sub=base(lang,n)
        if n==1:
            source=native(lang,'23-leer-listo-voz.png','22-leer-listo-voz.png')
            frame(im,source,(150,505,780,1370),(0,100,1220,2580))
            track(lang,n,[source],'Captura nativa preparada para leer. Solo se recortan las barras del sistema; el video demuestra el avance y la espera.')
        elif n==2:
            if lang=='es-419':
                source=REV/'lectura-real-video.png';crop=(0,100,1220,2580)
            else:
                source=published(lang,8);crop=(144,420,936,1828)
            frame(im,source,(150,505,780,1370),crop)
            track(lang,n,[source],'Español: cuadro de video real aprobado. Inglés y portugués: interfaz y persona de la ficha vigente, con cada idioma. Se conserva la imagen original, sin retoque facial.')
        elif n==3:
            source=published(lang,5)
            photo=(346,465,734,1157) if lang=='en-US' else (355,465,725,1124)
            selector=(213,1287,868,1378) if lang=='en-US' else (213,1254,868,1345)
            frame(im,source,(195,507,690,1229),photo)
            frame(im,source,(121,1769,838,116),selector,False)
            track(lang,n,[source],'Dos recortes de la lámina de subtítulos vigente: resultado y selector. Persona generada del material anterior; no se presenta como captura nueva del Motorola.')
        elif n==4:
            palm=Image.open(SOURCE/'mano-palma.png').convert('RGBA');palm.thumbnail((215,240),Image.Resampling.LANCZOS)
            im.alpha_composite(palm,(220,586))
            txt(im,(773,576),'V',252,fg,anchor='mt')
            actions=c['gestos']
            txt(im,(330,871),actions[0],42,fg,anchor='mt',maxw=440)
            txt(im,(330,932),actions[1],34,sub,400,anchor='mt',maxw=440)
            txt(im,(773,871),actions[2],42,fg,anchor='mt',maxw=440)
            txt(im,(773,932),actions[3],34,sub,400,anchor='mt',maxw=440)
            source=native(lang,'34-panel-camara.png','34-panel-camara.png')
            # Son recortes separados de una pantalla real, no controles redibujados.
            panel=(45,1330,1170,1915) if lang=='es-419' else (45,1290,1170,1915)
            frame(im,source,(70,1100,940,610),panel)
            txt(im,(540,1800),actions[4],38,sub,400,anchor='mt',maxw=930)
            track(lang,n,[source,REPO/'src/components/MarcaGuia.tsx'],'Recorte del panel nativo más leyenda gráfica con la misma palma Material Symbols que usa Sigo. El interruptor muestra el estado fotografiado; no se falsifica una activación ni un gesto reconocido.')
        elif n==5:
            source=published(lang,6)
            photo=(374,465,706,1056) if lang=='en-US' else (382,465,699,1029)
            strip=(214,1404,868,1608) if lang=='en-US' else (214,1360,868,1574)
            frame(im,source,(245,505,590,1049),photo)
            frame(im,source,(80,1590,920,301),strip,False)
            track(lang,n,[source],'Resultado B/N y tira de filtros de la lámina vigente. No se aplica ningún filtro inventado ni retoque de cara. La tira es desplazable: Natural queda parcialmente fuera del encuadre original.')
        elif n==6:
            source=native(lang,'29-velocidad-fija-ajustes.png','28-velocidad-fija-ajustes.png')
            frame(im,source,(150,505,780,1370),(0,100,1220,2580))
            track(lang,n,[source],'Panel real de velocidad fija con estado y control de siete niveles. Solo recorte y escala proporcional.')
        elif n==7:
            account=native(lang,'03-ajustes-con-la-voz.png','02-ajustes-portada.png')
            editor=native(lang,'22-editor-sin-teclado.png','16-editor-guion.png')
            txt(im,(76,520),c['guiones'][0],30,sub,400)
            account_crop=(80,517,1140,885) if lang=='en-US' else (80,517,1140,933)
            frame(im,account,(66,578,948,380),account_crop)
            txt(im,(76,1020),c['guiones'][1],30,sub,400)
            frame(im,editor,(180,1080,720,790),(75,210,1140,1690))
            track(lang,n,[account,editor],'Dos recortes de pantallas nativas: tarjeta de respaldo opcional y editor. Se excluyen las miniaturas de tomas para no usar encuadres personales descartados. No afirma una prueba nueva de sincronización.')
        elif n==8:
            source=published(lang,7)
            frame(im,source,(200,388,1520,650),(160,250,1760,970))
            track(lang,n,[source],'Pantalla horizontal de la ficha vigente, sin deformación. Interfaz y persona compuestas del material anterior.')
        im.convert('RGB').save(dest/f'{n:02}.png',optimize=True)
        thumb=im.convert('RGB');thumb.thumbnail((360,640),Image.Resampling.LANCZOS);thumb.save(preview/f'{n:02}.jpg',quality=93)

    # Portada de video y gráfico principal: marca y promesa legible, sin simular controles.
    g=Image.new('RGBA',(1024,500),'#F0EAE4')
    logo=Image.open(REV/'marca-oscura.png').convert('RGBA');logo.thumbnail((190,96));g.alpha_composite(logo,(59,46))
    for i,line in enumerate(c['grafico'][:2]):txt(g,(62,201+i*79),line,73,'#29231F',maxw=480)
    txt(g,(64,403),c['grafico'][2],26,'#5E5147',400,maxw=465)
    quote={
        'es-419':['Si te detienes,','el texto te espera.'],
        'en-US':['Pause to think.','The script waits.'],
        'pt-BR':['Se você parar,','o texto espera.']
    }[lang]
    ImageDraw.Draw(g).rounded_rectangle((594,154,962,344),radius=22,fill='#E4D8CA')
    for i,line in enumerate(quote):txt(g,(615,193+i*55),line,34,'#3F3026',400,maxw=326)
    g.convert('RGB').save(R/'graficos'/f'{lang}.png',optimize=True)

    # Nombres que entiende scripts/ficha.mjs, aunque aquí no se ejecuta ninguna subida.
    text=f"NOMBRE ({len(c['titulo'])}/30)\n[[{c['titulo']}]]\n\nDESCRIPCIÓN BREVE ({len(c['breve'])}/80)\n[[{c['breve']}]]\n\nDESCRIPCIÓN COMPLETA ({len(c['completa'])}/4000)\n[[{c['completa']}]]\n"
    if len(c['titulo'])>30 or len(c['breve'])>80 or len(c['completa'])>4000:raise ValueError('Límite de texto: '+lang)
    # 12-11-2026: saltos CRLF explícitos, los de las huellas aprobadas, también fuera de Windows.
    # Antes -12-11-2026-: write_text(text,encoding='utf-8'), que dependía del sistema.
    (R/'textos'/f'textos-{lang}.txt').write_text(text,encoding='utf-8',newline='\r\n')

    # Se conservan las tabletas publicadas; no se hace pasar un Motorola por una tableta.
    tabdest=R/'tabletas-conservadas'/lang
    shutil.copytree(FICHA/'capturas/tableta'/lang,tabdest,dirs_exist_ok=True)
    sheet=Image.new('RGB',(1440,1460),'#F5F1EC');d=ImageDraw.Draw(sheet)
    for i in range(8):
        x=(i%4)*360;y=(i//4)*730
        txt(sheet,(x+15,y+14),f'{i+1:02} · '+c['laminas'][i][2],21,'#49392E',maxw=330)
        p=Image.open(preview/f'{i+1:02}.jpg');p.thumbnail((332,630))
        sheet.paste(p,(x+(360-p.width)//2,y+61+(630-p.height)//2))
    sheet.save(R/f'Serie - {lang}.jpg',quality=94)

shutil.copy2(REPO/'android/app/src/main/ic_launcher-playstore.png',R/'icono-conservado-512.png')
# Antes: copiaba el MP4 y sus licencias desde el Escritorio; el video queda fuera del repo.
for name in ['Personas del material anterior.txt','Palma Material Symbols.txt']:
    shutil.copy2(SOURCE/'entradas/licencias'/name,R/'licencias'/name)
shutil.copy2(FICHA/'video-youtube.json',R/'video/youtube.json')
shutil.copy2(FICHA/'LEEME.md',R/'LEEME.md')
shutil.copy2(FICHA/'aprobacion-20261030/validacion.json',R/'validacion.json')

with (R/'textos/Descripciones de las imagenes.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['idioma','archivo','descripcion']);
    for lang,c in DATA.items():
        for i,alt in enumerate(c['alts'],1):w.writerow([lang,f'{i:02}.png',alt])
(R/'procedencia.json').write_text(json.dumps(PROVENANCE,ensure_ascii=False,indent=2),encoding='utf-8')

# Catálogo que muestra una serie por idioma y permite abrir cada PNG a resolución completa.
panels=''
for j,(lang,c) in enumerate(DATA.items()):
    figures=''.join(f'<figure><a href="capturas/{lang}/{i:02}.png"><img src="miniaturas/{lang}/{i:02}.jpg" alt="{html.escape(c["alts"][i-1])}"></a><figcaption>{i:02} · {html.escape(c["laminas"][i-1][2])}</figcaption></figure>' for i in range(1,9))
    panels+=f'<section id="{lang}" {"hidden" if j else ""}><div class="series">{figures}</div><h2>Gráfico principal</h2><img class="feature" src="graficos/{lang}.png" alt="Gráfico principal de Sigo"><p><a href="textos/textos-{lang}.txt">Textos completos de este idioma</a></p></section>'
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sigo · ficha preparada</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1ec;color:#302923;font:17px/1.5 system-ui}main{max-width:1440px;margin:auto;padding:30px 24px 70px}h1{font-size:40px;line-height:1.1}nav{display:flex;gap:10px;flex-wrap:wrap;margin:25px 0}button{font:inherit;padding:11px 20px;border:1px solid #9d806a;border-radius:8px;background:#f5f1ec;color:#332820;cursor:pointer}button[aria-pressed=true]{background:#332820;color:#fff}button:focus-visible,a:focus-visible{outline:3px solid #a34e2b;outline-offset:4px}a{color:#893e27}.series{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:25px 18px}figure{margin:0}figure img{display:block;width:100%;height:550px;object-fit:contain;object-position:top;background:#eee7df}figcaption{font-size:14px;padding:12px 0}.feature{max-width:700px;width:100%;height:auto}.notice{border-left:4px solid #9f472b;padding:10px 20px;max-width:1100px}video{width:min(100%,400px);display:block}footer{border-top:1px solid #d4c5b7;margin-top:45px;padding-top:20px;font-size:15px}@media(max-width:1000px){.series{grid-template-columns:repeat(2,minmax(0,1fr))}figure img{height:auto;max-height:640px}}@media(max-width:450px){main{padding:20px 12px}.series{gap:14px 10px}h1{font-size:30px}button{padding:10px 14px}}
</style><main><h1>Sigo · serie preparada para la próxima ficha</h1><p>Voz, cámara y subtítulos primero. Ocho imágenes por idioma, textos y video. Fichas y textos aprobados por Javier el 30 de octubre de 2026. Publicación pendiente.</p><p class="notice">Las tabletas y el ícono se conservan. Las imágenes de subtítulos, filtros y horizontal reutilizan material de la ficha vigente; el resto aprovecha las capturas nuevas. La procedencia exacta está documentada. Publicación pendiente de revisión final.</p><nav aria-label="Idioma"><button type="button" data-lang="es-419" aria-pressed="true">Español</button><button type="button" data-lang="en-US" aria-pressed="false">English</button><button type="button" data-lang="pt-BR" aria-pressed="false">Português</button></nav>'''+panels+'''<h2>Video en español para la ficha</h2><p>Versión con cierre neutro para Google Play. El original aprobado se conserva en la carpeta de video. Video subido por Javier: <a href="https://www.youtube.com/watch?v=dleH1xz_024">ver en YouTube</a>.</p><footer><a href="LEEME.md">Contenido y uso del paquete</a> · <a href="procedencia.json">Procedencia de imágenes</a> · <a href="validacion.json">Verificación de archivos</a></footer></main><script>document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==b.dataset.lang);}));</script></html>'''
(R/'Ficha Sigo - lista para revisar.html').write_text(page,encoding='utf-8')
print('Preparadas 24 láminas, 3 gráficos y 3 textos. Tabletas e ícono conservados.')

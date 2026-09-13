TELEPROMPTER - ESTADO DEL MOTOR

=====================================================================
0. RESUELTO EL 13 DE SEPTIEMBRE DE 2026
=====================================================================

Javier leyo el guion completo. Era la primera vez en dos semanas.

Sus palabras: "lei completo el guion. algunas cosas podriamos mejorarlas pero se
pudo leer bien".

LO QUE LO RESOLVIO, en orden de cuanto peso:

  1. EL RENGLON QUE SE ESTA LEYENDO NO SE MUEVE HASTA QUE SE TERMINA.
     pixelDePosicion reparte el alto del renglon entre sus palabras, asi que decir
     un renglon desplazaba la pantalla un renglon entero, repartido DESDE LA
     PRIMERA PALABRA: el renglon se subia mientras se lo leia y llegaba al borde
     de arriba antes de terminarlo. La vista usa pixelDeRenglon, y el cambio se
     desliza en unos 200 ms para no traer de vuelta los saltitos.
     Lo describio Javier dos veces antes de que yo lo entendiera: "no se mueve
     cuando finalizo ese renglon sino antes".

  2. EL TEXTO NO ENTRA A UN RENGLON SIN PRUEBA DE QUE EL LECTOR LLEGO.
     avance.ts ya topaba la posicion en refToken + 3 palabras, con el invariante
     escrito en mayusculas. El problema era la unidad: 3 palabras son tres cuartos
     de renglon, asi que el tope se cumplia y el renglon se iba igual. La vista
     elige el renglon con min(posicion, ultimoCalce): el mismo tope, en renglones.
     La idea es de Javier.

  3. topBanda SE RESTABA DOS VECES. El contenedor tiene paddingTop: topBanda y
     calcularScrollTop lo restaba otra vez. Medido montando el DOM: el renglon
     vivo caia 5.8 renglones fuera de la ventana con letra de 24.

  4. LA VENTANA SE CALCULABA CON 480 PIXELES DE ALTO CLAVADOS, en cualquier
     telefono. Ahora sale de container.clientHeight.

  5. EL RENGLON VIVO ES EL PRIMERO DE LA VENTANA, no el del medio. Desde que el
     renglon lo manda la evidencia la marca va DETRAS del lector, asi que los dos
     renglones claros tienen que quedar HACIA ADELANTE.

  6. La pantalla de lectura ocupaba un recuadro de 480 px fijos -unos seis
     renglones- con el titulo de la app y la franja de diagnostico encima. Ahora
     el texto es la pantalla.

  7. El motor por omision era Web Speech, que en el telefono de Javier no anda.
     Ahora es Vosk, que es con el que se midio todo.

GUARDADO POR T157 y T158. T158 monta la vista y esta comprobada rompiendo: con
cualquiera de los dos cambios deshecho, se pone roja.

EL MOTOR NUNCA FUE LA CAUSA. Todo lo de abajo, que se escribio con el problema
abierto, sigue siendo cierto como medicion y quedo como registro de lo que se
probo y se descarto.

=====================================================================

TELEPROMPTER - ESTADO REAL AL 13 DE SEPTIEMBRE DE 2026
Para que quien siga no vuelva a empezar de cero.
Esto son mediciones y hechos del codigo. Las teorias estan marcadas como tales.


=====================================================================
1. EL PROBLEMA QUE SIGUE ABIERTO
=====================================================================

Javier no puede terminar una lectura. Sus palabras, textuales:

  "al principio se lee bien, y despues ya termino leyendo en la linea
   ennegrecida, se acelera"

  "cuando voy en 'una respuesta que el mismo', ya estoy leyendo en el
   primer renglon que esta ennegrecido y despues de eso desaparece"

  "y no se mueve cuando finalizo ese renglon sino antes"

El renglon que esta leyendo termina ARRIBA de la ventana clara y despues
se va de pantalla. Empieza bien y se degrada.

SIGUE SIN RESOLVERSE. Probado contra el codigo publicado hoy.


=====================================================================
2. LO QUE ESTA MEDIDO (no son opiniones)
=====================================================================

2.1 EL MOTOR SIGUE LA VOZ. No se adelanta.

Regla independiente: alineacion propia del texto del reconocedor contra el
guion, busqueda global, sin la ventana del seguidor, sin el trinquete
Math.max, sin penalizacion por distancia. 744 puntos de la grabacion
lectura-2026-09-13-1148.txt.

Adelanto del texto sobre la palabra que estaba diciendo, POR POSICION EN EL GUION:

    palabras      adelanto medio
      0 -  19        0.50
     20 -  39       -0.13
     40 -  59        0.07
     60 -  79        0.00
     80 -  99        0.57
    100 - 119        1.72   (p90 5.8, max 6.4)
    120 - 139        0.03
    140 - 159        0.13   <- "sobre lo que no podemos contestar",
    160 - 179       -0.49      el renglon donde el dijo que se le escapa
    180 - 199        0.15

En el punto exacto donde reporta la falla, el motor va 0.13 palabras.

2.2 EL MOTOR NO SE FUGA. Comprobacion fisica, sin emparejar texto:
ventanas de 2 segundos donde la posicion avanzo a mas de 250 palabras por
minuto: 0 de 5071 en una grabacion, y en las otras todas caen en el
segundo 8-9, que es el enganche inicial despues del arranque de 7 palabras.
Ritmo medio de lectura de Javier: 99 a 119 ppm.

2.3 EL ANCLA NO SALTA. 1970 calces de cinco grabaciones. Frases de hasta
50 palabras mueven el ancla 0.35 tokens en promedio, maximo 7. Veces que
salto mas de 10 tokens: 0.
    => Un tope tipo "no confirmar mas alla de N tokens" no se dispara nunca
       con Vosk, porque los parciales acumulativos ya caminaron el ancla.

2.4 HABIA UN ERROR DE GEOMETRIA REAL, Y ESTA ARREGLADO (commit f2716cc).
calcularScrollTop restaba topBanda, y el contenedor ya tenia
paddingTop: topBanda. Se restaba dos veces.
Medido montando el DOM en un navegador, palabra 144:

    pantalla 480, letra 24:  debia caer en y=223, caia en y=418  = 5.8 renglones fuera
    pantalla 720, letra 32:  4.2 renglones fuera
    pantalla 720, letra 40:  3.1 renglones fuera
    despues del arreglo:     0.2 a 0.5 renglones

VERIFICADO QUE ESTA PUBLICADO: el bundle que sirve Vercel hoy
(index-QMjNFHTF.js) tiene la formula nueva 1 vez y la vieja 0 veces.
Javier probo contra ese codigo y la falla siguio.
=> Ese error era real pero NO era la causa de lo suyo.


=====================================================================
3. LO QUE ESTA EN EL CODIGO POR CONSTRUCCION (no medido como causa)
=====================================================================

src/lib/renglones.ts, pixelDePosicion:

    const cantidad = renglon.hastaToken + 1 - renglon.desdeToken
    const fraccion = (posicion - renglon.desdeToken) / cantidad
    return renglon.top + fraccion * (siguienteTop - renglon.top)

Mientras la posicion recorre las palabras de UN renglon, el pixel devuelto
recorre UN RENGLON ENTERO: del borde de arriba del renglon al borde de
arriba del siguiente. El desplazamiento sigue ese pixel.

Consecuencia aritmetica: el renglon que se esta leyendo se sube un renglon
completo mientras se lo lee. Empieza en el medio de la banda y termina en
el borde de arriba.

ESTO ES UN HECHO DEL CODIGO. Que sea LA CAUSA de lo que reporta Javier
NO esta comprobado. Coincide con "no se mueve cuando finalizo ese renglon
sino antes", pero por si solo deja el renglon dentro de la banda, no
arriba de ella. Falta explicar como termina AFUERA.

Contrapeso a tener en cuenta antes de cambiarlo: el movimiento continuo se
puso para matar el defecto que Javier reporto el primer dia, "funciona a
puros saltitos" (68% de cuadros congelados). Cuantizar por renglon lo puede
traer de vuelta.


=====================================================================
4. TRES ERRORES DE METODO QUE COSTARON DOS SEMANAS
=====================================================================

4.1 EL INSTRUMENTO ERA CIEGO. Las tres capas del corpus -oyo, calce,
cuadro- comparan el motor con el RECONOCEDOR. No hay una sola linea que
diga donde estaba Javier. Todos los numeros salian hermosos y el no podia
leer. La curva del punto 2.1 es el primer intento de una regla
independiente, y aun asi comparte el emparejador difuso con el seguidor.

4.2 PRUEBAS QUE SE COMPRUEBAN CONTRA SI MISMAS.
 - T123 era una tautologia: se demostro saboteando pixelDePosicion para
   devolver 99999 y quedaba verde.
 - T124 comprobaba la escala de opacidad contra si misma.
 - T93, T144, T145 y T146 modelaban la pantalla como `pPos - topScroll`,
   sin el paddingTop del contenedor. Con ese modelo la doble resta se
   cancelaba sola y las cuatro daban verde con el renglon vivo SEIS
   RENGLONES afuera.
 - Regla: una guardiana solo vale si se comprueba ROMPIENDO. Reintroducir
   el defecto y ver que se pone roja.

4.3 UNA PERILLA DESCONECTADA. opacidadDeLinea esta importada en
TeleprompterView y NUNCA SE LLAMA. Se paso una tarde ajustandola. Lo unico
que pinta es calcularTramosVelo / calcularBgVelo.
Sigue importada y sin usar. Conviene sacarla.

4.4 jsdom NO CALCULA LAYOUT. offsetTop devuelve 0. Ninguna prueba montada
en vitest puede detectar un error de geometria. Por eso hay que modelar el
contenedor aritmeticamente (ver T147/T148) o usar un navegador de verdad.


=====================================================================
5. HERRAMIENTAS QUE YA EXISTEN
=====================================================================

 src/pruebas/corpus/*.txt   cinco lecturas reales de Javier, con audio
                            alineado al milisegundo. Tres capas: oyo,
                            calce, cuadro (pos, calce, scroll, freno).
                            OJO: las cinco cubren solo el 16% al 36% del
                            guion. Ninguna llega a la parte que falla.
 src/lib/repetidor.ts       arnes que repite una lectura por el motor.
                            Sub-reporta el adelanto a la mitad (0.91 vs
                            2.01 real): los calces se reproducen identicos
                            pero la integracion de la posicion diverge.
                            SIN ARREGLAR. Bloquea cualquier ajuste fino.
 PanelCorpus + grabadorCorpus  graba lectura + audio, guarda en IndexedDB.


=====================================================================
6. ESTADO DEL REPOSITORIO (javierarriagada-cmyk/Teleprompter)
=====================================================================

 origin/main          f2716cc
 origin/motor-suave   f2716cc   (la que despliega Vercel)
 origin/tarea-25-...            sin mergear, Jules renumerando T149-T153

 Pruebas: 145 verdes de 147. Rojas T9 y T21, heredadas de la tarea 21
 (prueban style.opacity, que se quito con el velo). tsc limpio.

 Numeros de prueba usados: T1 a T148. La tarea 25 va a ocupar T149-T153.
 La tarea 27 tiene asignado T154 en adelante.

 Jules: sesion 13101979871882965922 (tarea 25, renumerando y republicando)
        sesion 13972378891845805566 (tarea 27, geometria medida)
 Jules termina pero NO publica solo: hay que apretar publicar.
 Una sesion de Jules no se cierra nunca y sigue ofreciendo publicar aunque
 su trabajo este mergeado. Lo que decide es si esta en main.


=====================================================================
7. LO QUE YO HARIA SI SIGUIERA
=====================================================================

No mas teorias sin medir. Lo unico que falta es una grabacion que CONTENGA
la falla: Javier lee con "Medir esta lectura" tildado y para donde siempre
para, cuando ya no puede seguir. El archivo termina en la falla.

Sobre ese archivo, correr la curva del punto 2.1 indexada por posicion en
el guion (no por tiempo, que promedia y tapa).

  - curva en +2 o +3 al momento de parar -> es el ancla.
  - curva en 0 al momento de parar       -> es el camino token->pixel->scroll,
                                            y ahi el candidato es el punto 3.

Sin eso, cualquier afirmacion sobre la causa es una opinion.

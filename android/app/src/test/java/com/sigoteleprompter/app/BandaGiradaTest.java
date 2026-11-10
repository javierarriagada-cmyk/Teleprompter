// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: la banda girada, por el camino que usa la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

// LO QUE VentanaDePrueba PONE EN ANDROID AL GIRAR. VentanaDePrueba.Sesion llama a BandaGirada con su lienzo, que copia
// ponerVentana en WindowManager.LayoutParams y ponerVista en la WebView -setLayoutParams, setRotation,
// setTranslationX/Y-. Aquí el lienzo es de prueba: anota lo mismo, y la vista se modela como la dibuja Android -giro
// alrededor del centro de la vista y después el desplazamiento- con una matriz propia de la prueba -Matriz, abajo- y
// no con GeometriaVentana, para que la prueba no se dé la razón a sí misma. java.awt no está en las pruebas de Android. Las medidas son las del g86 en dp, con densidad 1: 390 × 867 de pie,
// seguro (0, 32, 390, 825).
public class BandaGiradaTest {
    static final class Point2D {
        final double x, y;
        Point2D(double x, double y) { this.x = x; this.y = y; }
        double getX() { return x; }
        double getY() { return y; }
    }

    // x' = a·x + c·y + e; y' = b·x + d·y + f. Lo que hace android.graphics.Matrix con View.getMatrix: primero el giro
    // alrededor del pivote -en el centro de la vista, que es lo de omisión- y después la traslación.
    static final class Matriz {
        double a = 1, b = 0, c = 0, d = 1, e = 0, f = 0;
        // this = this · otra -la otra se aplica primero, como AffineTransform.concatenate-.
        Matriz por(double a2, double b2, double c2, double d2, double e2, double f2) {
            double na = a * a2 + c * b2, nb = b * a2 + d * b2;
            double nc = a * c2 + c * d2, nd = b * c2 + d * d2;
            double ne = a * e2 + c * f2 + e, nf = b * e2 + d * f2 + f;
            a = na; b = nb; c = nc; d = nd; e = ne; f = nf;
            return this;
        }
        Matriz trasladar(double x, double y) { return por(1, 0, 0, 1, x, y); }
        // Positivo: del eje x hacia el eje y, que con y hacia abajo es el sentido del reloj, como View.setRotation.
        Matriz girar(double grados, double px, double py) {
            double r = Math.toRadians(grados), cs = Math.cos(r), sn = Math.sin(r);
            trasladar(px, py);
            por(cs, sn, -sn, cs, 0, 0);
            return trasladar(-px, -py);
        }
        Point2D aplicar(double x, double y) { return new Point2D(a * x + c * y + e, b * x + d * y + f); }
        Point2D inversa(double x, double y) {
            double det = a * d - b * c;
            double ux = x - e, uy = y - f;
            return new Point2D((d * ux - c * uy) / det, (-b * ux + a * uy) / det);
        }
    }

    static final int ANCHO = 390, ALTO = 867;
    static BandaGirada.Medida dePie() { return new BandaGirada.Medida(ANCHO, ALTO, 0, 32, 390, 825, 1f); }
    // La pantalla girada por Android -Chrome de lado-: con el lado izquierdo arriba -ROTATION_270- la barra de
    // navegación queda a la izquierda y el recorte a la derecha; con el derecho arriba, al revés.
    static BandaGirada.Medida deLado270() { return new BandaGirada.Medida(ALTO, ANCHO, 42, 0, 835, 390, 1f); }
    static BandaGirada.Medida deLado90() { return new BandaGirada.Medida(ALTO, ANCHO, 32, 0, 825, 390, 1f); }

    // El lienzo de prueba: lo último puesto y lo que hizo el giro, en orden. reglas es la sesión de verdad.
    static final class Lienzo implements BandaGirada.Ventana {
        int[] ventana;
        int vistaAncho, vistaAlto;
        float grados, dx, dy;
        final List<String> hechos = new ArrayList<>();
        final Map<String, int[]> guardado = new HashMap<>();
        SesionVentana reglas = new SesionVentana(false, 0, 0, 0);
        long ahora = 50_000;
        boolean arrastrando;
        BandaGirada banda;
        @Override public void terminarArrastre(String motivo) {
            hechos.add("terminarArrastre");
            // Como VentanaDePrueba.terminarArrastre: se guarda donde quedó, con la clave de antes.
            if (arrastrando) { guardado.put(banda.clave(), banda.banda()); arrastrando = false; }
        }
        @Override public boolean enCuentaDeSeguir() { return reglas.fase() == SesionVentana.Fase.CUENTA; }
        @Override public void pausarPorGiro(String motivo) { hechos.add("pausa"); reglas.pausar(ahora); }
        @Override public void cerrarMenuAa(String motivo) { hechos.add("cerrarAa"); }
        @Override public int[] geometriaGuardada(String clave) { int[] g = guardado.get(clave); return g == null ? null : g.clone(); }
        @Override public void ponerVentana(int x, int y, int ancho, int alto) { ventana = new int[] { x, y, ancho, alto }; }
        @Override public void ponerVista(int ancho, int alto, float grados, float dx, float dy) {
            vistaAncho = ancho; vistaAlto = alto; this.grados = grados; this.dx = dx; this.dy = dy;
        }
        @Override public void anotar(String linea) {}

        // La matriz de la vista como la arma Android -View.getMatrix: desplazamiento, giro alrededor del pivote en el
        // centro- y la posición de la ventana en la pantalla.
        Matriz enPantalla() {
            return new Matriz().trasladar(ventana[0], ventana[1]).trasladar(dx, dy).girar(grados, vistaAncho / 2.0, vistaAlto / 2.0);
        }
        // Dónde se dibuja un punto de la página, en la pantalla.
        Point2D dibujo(double x, double y) { return enPantalla().aplicar(x, y); }
        // Qué punto de la página recibe un toque en la pantalla: la inversa, como ViewGroup.dispatchTransformedTouchEvent.
        Point2D toque(double x, double y) { return enPantalla().inversa(x, y); }
    }

    static Lienzo abrir(BandaGirada.Medida m, int c) {
        Lienzo l = new Lienzo();
        BandaGirada b = new BandaGirada();
        l.banda = b;
        b.abrir(m, c, l);
        return l;
    }

    static void cerca(double esperado, double real) { assertEquals(esperado, real, 0.01); }

    // Las cuatro esquinas de la página caen justo en las de la ventana: lo girado llena la ventana, ni más ni menos.
    // La ventana es lo único que recibe toques: lo que queda fuera es de la otra app.
    static void llenaLaVentana(Lienzo l) {
        double minX = Double.MAX_VALUE, minY = Double.MAX_VALUE, maxX = -Double.MAX_VALUE, maxY = -Double.MAX_VALUE;
        for (double[] p : new double[][] { { 0, 0 }, { l.vistaAncho, 0 }, { 0, l.vistaAlto }, { l.vistaAncho, l.vistaAlto } }) {
            Point2D q = l.dibujo(p[0], p[1]);
            minX = Math.min(minX, q.getX()); minY = Math.min(minY, q.getY());
            maxX = Math.max(maxX, q.getX()); maxY = Math.max(maxY, q.getY());
        }
        cerca(l.ventana[0], minX); cerca(l.ventana[1], minY);
        cerca(l.ventana[0] + l.ventana[2], maxX); cerca(l.ventana[1] + l.ventana[3], maxY);
    }

    // Hacia dónde queda «arriba» de la página en la pantalla: el vector (0, -1) dibujado.
    static double[] arribaDeLaPagina(Lienzo l) {
        Point2D a = l.dibujo(l.vistaAncho / 2.0, l.vistaAlto / 2.0);
        Point2D b = l.dibujo(l.vistaAncho / 2.0, l.vistaAlto / 2.0 - 10);
        return new double[] { Math.round((b.getX() - a.getX()) / 10), Math.round((b.getY() - a.getY()) / 10) };
    }

    @Test public void sinCompensacionEsLaBandaDeD991e00() {
        // De pie: la banda A de siempre, la vista sin girar.
        Lienzo l = abrir(dePie(), 0);
        assertArrayEquals(new int[] { 16, 104, 358, 224 }, l.ventana);
        assertEquals(0f, l.grados, 0f);
        assertEquals(358, l.vistaAncho);
        // Chrome de lado: la de lado de siempre, con la clave «h.».
        Lienzo h = abrir(deLado270(), 0);
        assertArrayEquals(new int[] { 98, 8, 412, 220 }, h.ventana);
        assertEquals("h.", h.banda.clave());
        llenaLaVentana(h);
    }

    // INICIO O LA CÁMARA DE PIE, CON EL TELÉFONO DE LADO: la pantalla sigue de pie y la banda se gira.
    @Test public void conElLadoIzquierdoArribaLaBandaSeGiraYQuedaDerecha() {
        Lienzo l = abrir(dePie(), 3);
        assertEquals("hc3.", l.banda.clave());
        // La página mide lo de lado -el diseño horizontal aprobado, 412 × 220- y la ventana, de pie, 220 × 412.
        assertEquals(412, l.vistaAncho);
        assertEquals(220, l.vistaAlto);
        assertArrayEquals(new int[] { 8, 88, 220, 412 }, l.ventana);
        llenaLaVentana(l);
        // El lado izquierdo del teléfono está arriba: para quien lo sostiene, arriba es la izquierda de la pantalla.
        assertArrayEquals(new double[] { -1, 0 }, arribaDeLaPagina(l), 0);
    }

    @Test public void conElLadoDerechoArribaLaBandaSeGiraAlOtroLado() {
        Lienzo l = abrir(dePie(), 1);
        assertEquals("hc1.", l.banda.clave());
        assertArrayEquals(new int[] { 162, 88, 220, 412 }, l.ventana);
        llenaLaVentana(l);
        assertArrayEquals(new double[] { 1, 0 }, arribaDeLaPagina(l), 0);
    }

    @Test public void conChromeDeLadoLaBandaNoSeGira() {
        Lienzo l = abrir(deLado270(), 0);
        assertArrayEquals(new double[] { 0, -1 }, arribaDeLaPagina(l), 0);
    }

    // LO QUE NO TAPA. El obturador y el zoom de la Cámara de pie del g86 -abajo, desde y 519, el obturador al centro
    // cerca de y 760 y el zoom cerca de y 640- quedan fuera de la ventana con el teléfono hacia cualquiera de los dos
    // lados, y la ventana es exactamente lo que se ve.
    @Test public void elObturadorYElZoomQuedanFueraDeLaBandaHaciaLosDosLados() {
        for (int c : new int[] { 1, 3 }) {
            Lienzo l = abrir(dePie(), c);
            llenaLaVentana(l);
            assertTrue("c=" + c + " la banda termina antes de y 519", l.ventana[1] + l.ventana[3] <= 519);
            for (int[] punto : new int[][] { { 195, 760 }, { 195, 640 }, { 120, 640 }, { 270, 640 } }) {
                boolean dentro = punto[0] >= l.ventana[0] && punto[0] < l.ventana[0] + l.ventana[2]
                    && punto[1] >= l.ventana[1] && punto[1] < l.ventana[1] + l.ventana[3];
                assertFalse("c=" + c + " tapa " + punto[0] + "," + punto[1], dentro);
            }
        }
    }

    // CADA CONTROL RECIBE EL TOQUE DONDE SE DIBUJA. Las cajas son las de la banda de lado -412 × 220-: la barra de 48
    // arriba con el asa, Aa y la X a la derecha; el pie de 48 abajo con Pausa/Seguir, Volver y la esquina de tamaño.
    // Para cada compensación se toca el centro de cada control donde se dibuja en la pantalla y se mira qué punto de
    // la página lo recibe; y se comprueba que ese punto de la pantalla es el mismo que da el marco de la persona.
    static final Map<String, int[]> CONTROLES = new HashMap<>();
    static {
        CONTROLES.put("asa", new int[] { 130, 0, 180, 48 });
        CONTROLES.put("Aa", new int[] { 316, 0, 48, 48 });
        CONTROLES.put("X", new int[] { 364, 0, 48, 48 });
        CONTROLES.put("Pausa/Seguir", new int[] { 4, 172, 110, 48 });
        CONTROLES.put("Volver", new int[] { 130, 172, 150, 48 });
        CONTROLES.put("esquina", new int[] { 364, 172, 48, 48 });
    }

    @Test public void cadaControlRecibeElToqueDondeSeDibuja() {
        for (int c = 0; c < 4; c++) {
            BandaGirada.Medida m = dePie();
            Lienzo l = abrir(m, c);
            int[] b = l.banda.banda();
            for (Map.Entry<String, int[]> e : CONTROLES.entrySet()) {
                int[] k = e.getValue();
                double cx = k[0] + k[2] / 2.0, cy = k[1] + k[3] / 2.0;
                // Donde se dibuja, según la vista girada.
                Point2D dibujado = l.dibujo(cx, cy);
                // Donde lo ve la persona, pasado a la pantalla.
                float[] esperado = GeometriaVentana.puntoAPantalla((float) (b[0] + cx), (float) (b[1] + cy), c, m.ancho, m.alto);
                cerca(esperado[0], dibujado.getX());
                cerca(esperado[1], dibujado.getY());
                // Y tocar ahí llega a ese control de la página.
                Point2D recibido = l.toque(dibujado.getX(), dibujado.getY());
                assertTrue(e.getKey() + " c=" + c, recibido.getX() >= k[0] && recibido.getX() < k[0] + k[2]
                    && recibido.getY() >= k[1] && recibido.getY() < k[1] + k[3]);
            }
        }
    }

    // EL ARRASTRE CON LA BANDA GIRADA: el dedo se mueve en la pantalla y la banda lo sigue -el punto de la página bajo
    // el dedo es el mismo al empezar y al terminar-, también con el teléfono de lado sobre una pantalla de pie.
    @Test public void elArrastreSigueAlDedoConLaBandaGirada() {
        for (int c : new int[] { 0, 1, 3 }) {
            BandaGirada.Medida m = dePie();
            Lienzo l = abrir(m, c);
            BandaGirada b = l.banda;
            Point2D dedo0 = l.dibujo(200, 24);
            ArrastreVentana a = new ArrastreVentana();
            int[] g = b.banda();
            float[] p0 = b.aPersona((float) dedo0.getX(), (float) dedo0.getY(), m);
            a.alApoyar(0, p0[0], p0[1], g[0], g[1]);
            assertTrue(a.empezar());
            // 5 hacia la derecha y 40 hacia abajo en la pantalla: dentro del área segura, para que el acotado no corra la
            // banda bajo el dedo.
            float rx = (float) dedo0.getX() + 5, ry = (float) dedo0.getY() + 40;
            float[] q = b.aPersona(rx, ry, m);
            int[] s = b.seguro(m);
            int[] p = a.alMover(q[0], q[1], g[2], g[3], s[0], s[1], s[2], s[3], 240, 180);
            b.mover(p[0], p[1], m, l);
            Point2D bajoElDedo = l.toque(rx, ry);
            cerca(200, bajoElDedo.getX());
            cerca(24, bajoElDedo.getY());
            llenaLaVentana(l);
        }
    }

    // EL CAMBIO DE TAMAÑO CON LA BANDA GIRADA: la página manda cuánto avanzó el dedo en su marco; la esquina de arriba
    // a la izquierda de la persona queda fija y la ventana crece hacia donde la persona tiró.
    @Test public void elCambioDeTamanoCreceEnElMarcoDeLaPersona() {
        BandaGirada.Medida m = dePie();
        Lienzo l = abrir(m, 3);
        Point2D esquinaAntes = l.dibujo(0, 0);
        l.banda.cambiar(0, 0, -40, 30, m, l);
        assertEquals(372, l.vistaAncho);
        assertEquals(250, l.vistaAlto);
        // En la pantalla de pie la esquina de la persona es la de abajo a la izquierda de la ventana: (8, 500) queda.
        assertArrayEquals(new int[] { 8, 128, 250, 372 }, l.ventana);
        Point2D esquinaDespues = l.dibujo(0, 0);
        cerca(esquinaAntes.getX(), esquinaDespues.getX());
        cerca(esquinaAntes.getY(), esquinaDespues.getY());
        llenaLaVentana(l);
    }

    // EL MENÚ DE Aa: la página lo pone pegado a Aa en su marco -colocarMenuAa, la fila de lado- y aquí se pasa a la
    // pantalla con la misma compensación. Queda junto al Aa dibujado, fuera de la banda y derecho.
    @Test public void elMenuDeAaQuedaJuntoASuBotonConLaBandaGirada() {
        for (int c : new int[] { 1, 3 }) {
            BandaGirada.Medida m = dePie();
            Lienzo l = abrir(m, c);
            int[] b = l.banda.banda();
            int[] aa = CONTROLES.get("Aa");
            // Lo que calcula colocarMenuAa de lado con la ventana y el área segura de la persona: la fila de 476 × 96
            // debajo de la banda, alineada con su borde izquierdo -flotante.ts-.
            int[] menu = { b[0], b[1] + b[3] + 6, 476, 96 };
            int[] s = l.banda.seguro(m);
            assertTrue(menu[1] + menu[3] <= s[3] - 4);
            int[] enPantalla = l.banda.aPantalla(menu, m);
            float[] giro = l.banda.vista(menu[2], menu[3]);
            assertEquals(l.grados, giro[0], 0f);
            // La ventana del menú no pisa la banda.
            int[] v = l.ventana;
            boolean cruza = enPantalla[0] < v[0] + v[2] && v[0] < enPantalla[0] + enPantalla[2]
                && enPantalla[1] < v[1] + v[3] && v[1] < enPantalla[1] + enPantalla[3];
            assertFalse("c=" + c, cruza);
            // Y está a 6 del borde de la banda que queda bajo Aa: la distancia del Aa dibujado al menú es la misma que
            // en el marco de la persona.
            Point2D aaAbajo = l.dibujo(aa[0] + aa[2] / 2.0, b[3]);
            float[] menuArriba = GeometriaVentana.puntoAPantalla(b[0] + aa[0] + aa[2] / 2f, menu[1], c, m.ancho, m.alto);
            cerca(6, Math.hypot(menuArriba[0] - aaAbajo.getX(), menuArriba[1] - aaAbajo.getY()));
            boolean dentroDelMenu = menuArriba[0] >= enPantalla[0] - 0.01 && menuArriba[0] <= enPantalla[0] + enPantalla[2] + 0.01
                && menuArriba[1] >= enPantalla[1] - 0.01 && menuArriba[1] <= enPantalla[1] + enPantalla[3] + 0.01;
            assertTrue("c=" + c, dentroDelMenu);
        }
    }

    // GIRAR DURANTE LA LECTURA: lo de siempre -terminar el arrastre, retirar Aa- y nada más. La sesión, la fase y el
    // tiempo leído no cambian: el giro no toca SesionVentana ni la página -la WebView no se recarga-.
    @Test public void girarLeyendoConservaLaSesionYElTiempo() {
        BandaGirada.Medida m = dePie();
        Lienzo l = abrir(m, 0);
        // Una lectura en marcha: la cuenta de Empezar terminada y el micrófono confirmado a los 3 s.
        l.reglas.estadoDeSigo(3, false, false, 0);
        l.reglas.terminarCuentaInicial(3000);
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, l.reglas.alAbrirMicrofono(l.reglas.intentoPedido(), true, 3000));
        SesionVentana.Fase fase = l.reglas.fase();
        assertEquals(SesionVentana.Fase.ESCUCHANDO, fase);
        long leidos = l.reglas.leidosMs(l.ahora);
        assertEquals(47_000, leidos);
        assertTrue(l.banda.alCambiarPantalla(m, 3, l));
        assertEquals(List.of("terminarArrastre", "cerrarAa"), l.hechos);
        assertEquals(fase, l.reglas.fase());
        assertEquals(leidos, l.reglas.leidosMs(l.ahora));
        // Y de un lado al otro, igual.
        l.hechos.clear();
        assertTrue(l.banda.alCambiarPantalla(m, 1, l));
        assertEquals(List.of("terminarArrastre", "cerrarAa"), l.hechos);
        assertEquals(fase, l.reglas.fase());
    }

    @Test public void girarEnLaCuentaDeSeguirPausaComoAntes() {
        BandaGirada.Medida m = dePie();
        Lienzo l = abrir(m, 0);
        SesionVentana r = l.reglas;
        r.empezarLectura(0);
        r.pausar(10_000);
        assertEquals(3, r.seguir());
        assertEquals(SesionVentana.Fase.CUENTA, r.fase());
        assertTrue(l.banda.alCambiarPantalla(m, 3, l));
        assertEquals(List.of("terminarArrastre", "pausa", "cerrarAa"), l.hechos);
        assertEquals(SesionVentana.Fase.PAUSA, r.fase());
        assertEquals(10_000, r.leidosMs(l.ahora));
        // En pausa, girar la deja en pausa.
        l.hechos.clear();
        assertTrue(l.banda.alCambiarPantalla(m, 1, l));
        assertEquals(List.of("terminarArrastre", "cerrarAa"), l.hechos);
        assertEquals(SesionVentana.Fase.PAUSA, r.fase());
    }

    // SIN CAMBIO DE COMPENSACIÓN NI DE PIE/DE LADO NO HAY GIRO: Chrome de un lado al otro -Android gira la pantalla y
    // la banda va con ella, compensación 0- solo reacomoda la banda al área segura nueva, como en d991e00.
    @Test public void chromeDeUnLadoAlOtroSoloReacomoda() {
        Lienzo l = abrir(deLado270(), 0);
        assertFalse(l.banda.alCambiarPantalla(deLado90(), 0, l));
        assertEquals(List.of(), l.hechos);
        assertEquals("h.", l.banda.clave());
        llenaLaVentana(l);
    }

    // CON LA ROTACIÓN AUTOMÁTICA DESACTIVADA la compensación es siempre 0 -OrientacionDeVentana- y el giro es el de
    // d991e00: solo de pie ↔ de lado del área segura, con las claves de siempre.
    @Test public void sinCompensacionElGiroEsElDeAntes() {
        Lienzo l = abrir(dePie(), 0);
        assertTrue(l.banda.alCambiarPantalla(deLado270(), 0, l));
        assertEquals("h.", l.banda.clave());
        assertArrayEquals(new int[] { 98, 8, 412, 220 }, l.ventana);
        assertEquals(0f, l.grados, 0f);
        l.hechos.clear();
        assertTrue(l.banda.alCambiarPantalla(dePie(), 0, l));
        assertEquals("v.", l.banda.clave());
        assertArrayEquals(new int[] { 16, 104, 358, 224 }, l.ventana);
    }

    // CADA LADO GIRADO TIENE SU GEOMETRÍA. Lo que la persona deja arrastrado con el lado izquierdo arriba vuelve al
    // volver a ese lado; el otro lado y Chrome no lo heredan.
    @Test public void loArrastradoSeGuardaConLaClaveDeSuLado() {
        BandaGirada.Medida m = dePie();
        Lienzo l = abrir(m, 3);
        l.banda.mover(300, 100, m, l);
        l.arrastrando = true;
        l.banda.alCambiarPantalla(m, 1, l);
        assertArrayEquals(new int[] { 300, 100, 412, 220 }, l.guardado.get("hc3."));
        assertArrayEquals(new int[] { 88, 8, 412, 220 }, l.banda.banda());
        l.banda.alCambiarPantalla(m, 3, l);
        assertArrayEquals(new int[] { 300, 100, 412, 220 }, l.banda.banda());
    }

    @Test public void conDensidadLaGeometriaSalaEnPixeles() {
        BandaGirada.Medida m = new BandaGirada.Medida(1080, 2400, 0, 88, 1080, 2284, 2.75f);
        Lienzo l = abrir(m, 3);
        // 412 × 220 dp a 2,75.
        assertEquals(1133, l.vistaAncho);
        assertEquals(605, l.vistaAlto);
        assertEquals(605, l.ventana[2]);
        assertEquals(1133, l.ventana[3]);
        llenaLaVentana(l);
    }
}

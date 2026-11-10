// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t167u: el cambio de tamaño por la esquina, sin temblor. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// LA TRAYECTORIA DE LA ESQUINA, POR EL CAMINO DE LA VENTANA. Lo que hace VentanaDePrueba.Sesion con cada toque de la
// banda -alTocarBanda, empezarTamano, cambiarTamano, terminarTamano; ConexionDelTamanoTest comprueba que es eso- con un
// lienzo de prueba que anota cada ventana puesta. El dedo llega en coordenadas de la PANTALLA -getRawX/getRawY-,
// calculadas aquí a mano desde el marco de quien sostiene el teléfono, sin GeometriaVentana, para que la prueba no se dé
// la razón a sí misma. Las medidas son las del g86 en dp, con densidad 1.
public class TamanoVentanaTest {
    static final class Escena implements BandaGirada.Ventana {
        final String nombre;
        final int c, ancho, alto;
        final BandaGirada.Medida m;
        final int[] guardada;
        final BandaGirada banda = new BandaGirada();
        final TamanoVentana tamano = new TamanoVentana();
        final List<int[]> puestas = new ArrayList<>();
        int guardadas, encuadres;

        Escena(String nombre, int c, int ancho, int alto, int l, int t, int r, int b, int[] guardada) {
            this.nombre = nombre; this.c = c; this.ancho = ancho; this.alto = alto;
            this.m = new BandaGirada.Medida(ancho, alto, l, t, r, b, 1f);
            this.guardada = guardada;
            banda.abrir(m, c, this);
            puestas.clear();
        }

        @Override public void terminarArrastre(String motivo) {}
        @Override public boolean enCuentaDeSeguir() { return false; }
        @Override public void pausarPorGiro(String motivo) {}
        @Override public void cerrarMenuAa(String motivo) {}
        @Override public int[] geometriaGuardada(String clave) { return guardada.clone(); }
        @Override public void ponerVentana(int x, int y, int w, int h) { puestas.add(new int[] { x, y, w, h }); }
        @Override public void ponerVista(int w, int h, float g, float dx, float dy) {}
        @Override public void anotar(String linea) {}

        // Un punto de la persona en la pantalla, a mano: c = 1 (ancho - v, u); c = 3 (v, alto - u).
        float[] pantalla(float u, float v) {
            if (c == 1) return new float[] { ancho - v, u };
            if (c == 3) return new float[] { v, alto - u };
            return new float[] { u, v };
        }

        // VentanaDePrueba.alTocarBanda, ACTION_DOWN, y la página que avisa tamanoInicio.
        void apoyar(float rawX, float rawY) {
            float[] p = banda.aPersona(rawX, rawY, m);
            tamano.alApoyar(0, p[0], p[1], banda.banda());
            assertTrue(tamano.empezar());
        }

        // VentanaDePrueba.cambiarTamano.
        void mover(float rawX, float rawY) {
            int[] s = banda.seguro(m);
            float[] q = banda.aPersona(rawX, rawY, m);
            int[] g = tamano.alMover(q[0], q[1], s[2], s[3], m.dp(GeometriaVentana.MIN_ANCHO), m.dp(GeometriaVentana.MIN_ALTO));
            banda.redimensionar(g, m, this);
        }

        // VentanaDePrueba.terminarTamano, al soltar.
        void soltar() {
            if (!tamano.terminar()) return;
            guardadas++;
            encuadres++;
            banda.encuadrar(m, this);
        }

        // La esquina opuesta -arriba a la izquierda de la persona- en la pantalla, leída de la ventana puesta.
        int[] esquinaOpuesta(int[] p) {
            if (c == 1) return new int[] { p[0] + p[2], p[1] };
            if (c == 3) return new int[] { p[0], p[1] + p[3] };
            return new int[] { p[0], p[1] };
        }

        // Arrastra la esquina desde 10 adentro, de a (du, dv) por evento, n eventos. Devuelve el último punto.
        float[] recorrer(float u, float v, float du, float dv, int n) {
            for (int i = 1; i <= n; i++) {
                float[] r = pantalla(u + du * i, v + dv * i);
                mover(r[0], r[1]);
            }
            return new float[] { u + du * n, v + dv * n };
        }

        float[] apoyarEnLaEsquina() {
            int[] g = banda.banda();
            float u = g[0] + g[2] - 10, v = g[1] + g[3] - 10;
            float[] r = pantalla(u, v);
            apoyar(r[0], r[1]);
            return new float[] { u, v };
        }
    }

    // Los cuatro casos de la orden: los dos horizontales sobre un fondo fijo de pie, horizontal con Android ya girado
    // y vertical. g86: 390 × 867 de pie, seguro (0, 32, 390, 825).
    static Escena[] escenas() {
        return new Escena[] {
            new Escena("horizontal, lado izquierdo arriba, fondo de pie", 3, 390, 867, 0, 32, 390, 825, new int[] { 200, 8, 412, 220 }),
            new Escena("horizontal, lado derecho arriba, fondo de pie", 1, 390, 867, 0, 32, 390, 825, new int[] { 88, 8, 412, 220 }),
            new Escena("horizontal con Android ya girado", 0, 867, 390, 32, 0, 835, 390, new int[] { 100, 30, 412, 220 }),
            new Escena("vertical", 0, 390, 867, 0, 32, 390, 825, new int[] { 20, 100, 300, 220 }),
        };
    }

    // Ninguna ventana puesta dos veces seguidas igual, y la esquina opuesta quieta en la pantalla.
    static void sinDuplicadosYConLaEsquinaFija(Escena e, int[] esquina) {
        for (int i = 0; i < e.puestas.size(); i++) {
            if (i > 0) assertFalse(e.nombre + ": ventana repetida en el paso " + i, java.util.Arrays.equals(e.puestas.get(i), e.puestas.get(i - 1)));
            assertArrayEquals(e.nombre + ": la esquina opuesta se movió en el paso " + i, esquina, e.esquinaOpuesta(e.puestas.get(i)));
        }
    }

    @Test public void alAmpliarCreceSinRetrocesos() {
        for (Escena e : escenas()) {
            int[] g0 = e.banda.banda();
            int[] esquina = e.esquinaOpuesta(GeometriaVentana.aPantalla(g0, e.c, e.ancho, e.alto));
            float[] p = e.apoyarEnLaEsquina();
            e.recorrer(p[0], p[1], 3, 2, 20);
            assertEquals(e.nombre, 20, e.puestas.size());
            int[] antes = g0;
            for (int[] q : e.puestas) {
                int[] g = personaDe(e, q);
                assertTrue(e.nombre + ": el ancho retrocedió", g[2] > antes[2]);
                assertTrue(e.nombre + ": el alto retrocedió", g[3] > antes[3]);
                antes = g;
            }
            // Desde el comienzo, sin sumar pasos: lo que avanzó el dedo.
            assertArrayEquals(e.nombre, new int[] { g0[0], g0[1], g0[2] + 60, g0[3] + 40 }, e.banda.banda());
            sinDuplicadosYConLaEsquinaFija(e, esquina);
        }
    }

    @Test public void alReducirDisminuyeSinRebotesYSeDetieneEnElMinimo() {
        for (Escena e : escenas()) {
            int[] g0 = e.banda.banda();
            int[] esquina = e.esquinaOpuesta(GeometriaVentana.aPantalla(g0, e.c, e.ancho, e.alto));
            float[] p = e.apoyarEnLaEsquina();
            e.recorrer(p[0], p[1], -6, -4, 60);
            int[] antes = g0;
            for (int[] q : e.puestas) {
                int[] g = personaDe(e, q);
                assertTrue(e.nombre + ": el ancho rebotó", g[2] <= antes[2]);
                assertTrue(e.nombre + ": el alto rebotó", g[3] <= antes[3]);
                antes = g;
            }
            int[] g = e.banda.banda();
            assertEquals(e.nombre, GeometriaVentana.MIN_ANCHO, g[2]);
            assertEquals(e.nombre, GeometriaVentana.MIN_ALTO, g[3]);
            assertEquals(e.nombre, g0[0], g[0]);
            assertEquals(e.nombre, g0[1], g[1]);
            sinDuplicadosYConLaEsquinaFija(e, esquina);
        }
    }

    @Test public void laMismaPosicionDelDedoDejaLaBandaQuieta() {
        for (Escena e : escenas()) {
            float[] p = e.apoyarEnLaEsquina();
            float[] fin = e.recorrer(p[0], p[1], 3, 2, 5);
            int puestas = e.puestas.size();
            int[] g = e.banda.banda();
            float[] r = e.pantalla(fin[0], fin[1]);
            for (int i = 0; i < 5; i++) e.mover(r[0], r[1]);
            assertEquals(e.nombre + ": se puso la ventana con el dedo quieto", puestas, e.puestas.size());
            assertArrayEquals(e.nombre, g, e.banda.banda());
        }
    }

    // Llegar al borde, seguir empujando, volver desde él y soltar.
    @Test public void enElBordeSeDetieneVuelveDesdeAhiYAlSoltarGuardaUnaVez() {
        for (Escena e : escenas()) {
            int[] g0 = e.banda.banda();
            int[] s = e.banda.seguro(e.m);
            int[] esquina = e.esquinaOpuesta(GeometriaVentana.aPantalla(g0, e.c, e.ancho, e.alto));
            float[] p = e.apoyarEnLaEsquina();
            // Hasta muy pasado el borde derecho y el de abajo de la persona.
            float[] fin = e.recorrer(p[0], p[1], 8, 6, 100);
            int[] g = e.banda.banda();
            assertArrayEquals(e.nombre + ": en el borde", new int[] { g0[0], g0[1], s[2] - g0[0], s[3] - g0[1] }, g);
            sinDuplicadosYConLaEsquinaFija(e, esquina);
            // Más allá del borde, el dedo sigue y la banda no se mueve.
            int puestas = e.puestas.size();
            e.recorrer(fin[0], fin[1], 8, 6, 10);
            assertEquals(e.nombre, puestas, e.puestas.size());
            // Volver: mientras el dedo siga más allá del borde, quieta; cuando entra, achica sin saltos.
            float[] r = e.pantalla(s[2] + 5, s[3] + 5);
            e.mover(r[0], r[1]);
            assertEquals(e.nombre, puestas, e.puestas.size());
            float u = p[0] + (s[2] - g0[0] - g0[2]) - 20, v = p[1] + (s[3] - g0[1] - g0[3]) - 15;
            r = e.pantalla(u, v);
            e.mover(r[0], r[1]);
            assertArrayEquals(e.nombre + ": de vuelta", new int[] { g0[0], g0[1], s[2] - g0[0] - 20, s[3] - g0[1] - 15 }, e.banda.banda());
            sinDuplicadosYConLaEsquinaFija(e, esquina);
            // Soltar: guarda y avisa una vez; durante el gesto, nada.
            assertEquals(0, e.guardadas);
            e.soltar();
            e.soltar();
            assertEquals(e.nombre, 1, e.guardadas);
            assertEquals(e.nombre, 1, e.encuadres);
            // Después de soltar, el dedo ya no cambia nada.
            int ya = e.puestas.size();
            e.mover(r[0] + 50, r[1] + 50);
            assertEquals(e.nombre, ya, e.puestas.size());
        }
    }

    @Test public void sinDedoApoyadoElAvisoNoEmpiezaYUnDownNuevoOlvidaElGestoViejo() {
        TamanoVentana t = new TamanoVentana();
        assertFalse(t.empezar());
        assertNull(t.alMover(10, 10, 390, 825, 240, 180));
        t.alApoyar(3, 100, 100, new int[] { 10, 40, 300, 200 });
        assertTrue(t.empezar());
        assertFalse(t.empezar());
        assertEquals(3, t.dedo());
        assertArrayEquals(new int[] { 10, 40, 320, 230 }, t.alMover(120, 130, 390, 825, 240, 180));
        t.alApoyar(5, 200, 200, new int[] { 10, 40, 320, 230 });
        assertFalse(t.activo());
        assertNull(t.alMover(400, 400, 390, 825, 240, 180));
        assertFalse(t.terminar());
    }

    @Test public void redimensionarNoVuelveAPonerLaMismaBanda() {
        Escena e = escenas()[1];
        int[] g = e.banda.banda();
        assertFalse(e.banda.redimensionar(g, e.m, e));
        assertFalse(e.banda.redimensionar(null, e.m, e));
        assertEquals(0, e.puestas.size());
        assertTrue(e.banda.redimensionar(new int[] { g[0], g[1], g[2] + 1, g[3] }, e.m, e));
        assertEquals(1, e.puestas.size());
    }

    // La banda de la persona desde una ventana puesta, a mano.
    static int[] personaDe(Escena e, int[] p) {
        if (e.c == 1) return new int[] { p[1], e.ancho - (p[0] + p[2]), p[3], p[2] };
        if (e.c == 3) return new int[] { e.alto - (p[1] + p[3]), p[0], p[3], p[2] };
        return p.clone();
    }
}

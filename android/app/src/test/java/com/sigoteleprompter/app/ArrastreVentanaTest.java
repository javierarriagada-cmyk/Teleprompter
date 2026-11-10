// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: el arrastre de la banda medido en la pantalla. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// Solo la lógica: el mismo recorrido del dedo deja la ventana en el mismo lugar con 2 pasos o con 50, dentro del área
// segura, y el arrastre solo existe entre moverInicio y el final de ese mismo toque.
public class ArrastreVentanaTest {
    // El g86 de pie en píxeles -densidad 2,75-: área segura (0, 88, 1080, 2269), ventana 985 × 616 en (44, 286).
    static final int L = 0, T = 88, R = 1080, B = 2269, W = 985, H = 616, MW = 660, MH = 495;

    // Un recorrido del dedo con fracciones de píxel, que se sale por abajo y a la derecha y vuelve: con pasos sumados
    // y acotados en cada paso, lo que se pierde contra el borde ya no vuelve.
    static float[] punto(double f) {
        double x = 300.37 + 420.0 * Math.sin(f * Math.PI) + 0.31 * f;
        double y = 500.61 + 2400.0 * f - 2900.0 * f * f;
        return new float[] { (float) x, (float) y };
    }

    static int[] recorrer(int pasos) {
        ArrastreVentana a = new ArrastreVentana();
        float[] p0 = punto(0);
        a.alApoyar(0, p0[0], p0[1], 44, 286);
        assertTrue(a.empezar());
        int[] ultima = null;
        for (int i = 1; i <= pasos; i++) {
            float[] p = punto((double) i / pasos);
            ultima = a.alMover(p[0], p[1], W, H, L, T, R, B, MW, MH);
            assertTrue("x dentro del área segura", ultima[0] >= L && ultima[0] + W <= R);
            assertTrue("y dentro del área segura", ultima[1] >= T && ultima[1] + H <= B);
        }
        assertEquals(pasos, a.pasos());
        assertTrue(a.terminar());
        return ultima;
    }

    @Test public void elMismoRecorridoDaLoMismoConDosPasosOConCincuenta() {
        int[] con2 = recorrer(2);
        int[] con50 = recorrer(50);
        int[] con7 = recorrer(7);
        assertArrayEquals(con2, con50);
        assertArrayEquals(con2, con7);
        // Y es la del DOWN más lo que avanzó el dedo: 44 + round(0.31) y 286 + round(2400 - 2900), acotada.
        assertArrayEquals(new int[] { 44, 88 }, con50);
    }

    @Test public void aMitadDeCaminoTambienCalzaYSeQuedaDentro() {
        ArrastreVentana a = new ArrastreVentana();
        a.alApoyar(0, 500f, 900f, 44, 286);
        assertTrue(a.empezar());
        // Mucho más allá del borde de abajo y de la derecha: queda pegada al área segura.
        assertArrayEquals(new int[] { R - W, B - H }, a.alMover(5000f, 9000f, W, H, L, T, R, B, MW, MH));
        // De vuelta al punto de partida: vuelve exactamente a la del DOWN, sin lo perdido contra el borde.
        assertArrayEquals(new int[] { 44, 286 }, a.alMover(500f, 900f, W, H, L, T, R, B, MW, MH));
    }

    @Test public void sinMoverInicioNoHayArrastre() {
        ArrastreVentana a = new ArrastreVentana();
        a.alApoyar(0, 500f, 900f, 44, 286);
        assertNull(a.alMover(600f, 1000f, W, H, L, T, R, B, MW, MH));
        assertFalse(a.terminar());
    }

    @Test public void moverInicioConElDedoArribaNoHaceNada() {
        ArrastreVentana a = new ArrastreVentana();
        a.alApoyar(0, 500f, 900f, 44, 286);
        a.terminar();
        assertFalse(a.empezar());
        assertNull(a.alMover(600f, 1000f, W, H, L, T, R, B, MW, MH));
    }

    @Test public void unDownNuevoNoSigueUnArrastreViejo() {
        ArrastreVentana a = new ArrastreVentana();
        a.alApoyar(0, 500f, 900f, 44, 286);
        assertTrue(a.empezar());
        a.alMover(520f, 950f, W, H, L, T, R, B, MW, MH);
        // Sin UP de por medio -un CANCEL perdido-: el toque siguiente, en la lectura, no arrastra.
        a.alApoyar(0, 100f, 1500f, 64, 336);
        assertFalse(a.activo());
        assertNull(a.alMover(300f, 1700f, W, H, L, T, R, B, MW, MH));
        // Y si ese toque sí es en el asa, parte desde su propio DOWN.
        assertTrue(a.empezar());
        assertArrayEquals(new int[] { 74, 356 }, a.alMover(110f, 1520f, W, H, L, T, R, B, MW, MH));
    }
}

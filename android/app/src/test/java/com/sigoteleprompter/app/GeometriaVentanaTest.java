// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la elección de la banda A según la orientación. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// La lógica de qué banda sale en cada orientación, sin pantalla: no prueba cómo se ve, prueba que de pie
// y de lado se elija cada una y que el mínimo mande.
public class GeometriaVentanaTest {
    @Test public void dePieEligeLaBandaDePie() {
        assertFalse(GeometriaVentana.esDeLado(0, 32, 390, 825));
        assertArrayEquals(new int[] { 16, 104, 358, 224 }, GeometriaVentana.inicial(0, 32, 390, 825));
    }

    @Test public void deLadoEligeLaBandaDeLado() {
        assertTrue(GeometriaVentana.esDeLado(44, 0, 826, 390));
        assertArrayEquals(new int[] { 100, 8, 412, 220 }, GeometriaVentana.inicial(44, 0, 826, 390));
    }

    @Test public void deLadoAngostoElAnchoSeAdapta() {
        // 640 × 360 con 40 de recorte: quedan 600 - 56 - 8 = 536 → sigue 412; con 400 útiles, 400 - 64 = 336.
        assertArrayEquals(new int[] { 96, 8, 412, 220 }, GeometriaVentana.inicial(40, 0, 640, 360));
        assertArrayEquals(new int[] { 56, 8, 336, 220 }, GeometriaVentana.inicial(0, 0, 400, 300));
    }

    @Test public void elMinimoMandaAunqueNoQuepa() {
        assertArrayEquals(new int[] { 0, 0, 240, 180 }, GeometriaVentana.acotar(new int[] { 10, 10, 100, 50 }, 0, 0, 200, 150));
        assertArrayEquals(new int[] { 150, 645, 240, 180 }, GeometriaVentana.acotar(new int[] { 500, 900, 100, 50 }, 0, 32, 390, 825));
    }
    // -10-11-2026, orden t164u- EL MARCO DE LA PERSONA. Cada punto va y vuelve igual, y las esquinas de la pantalla
    // caen donde las ve quien sostiene el teléfono: con el lado izquierdo arriba -c = 3- la esquina de arriba a la
    // izquierda de la persona es la de abajo a la izquierda de la pantalla.
    @Test public void losPuntosVanYVuelvenEntreLaPantallaYLaPersona() {
        for (int c = 0; c < 4; c++) {
            float[] p = GeometriaVentana.puntoAPantalla(37, 120, c, 390, 867);
            float[] q = GeometriaVentana.puntoAPersona(p[0], p[1], c, 390, 867);
            assertEquals(37f, q[0], 0f);
            assertEquals(120f, q[1], 0f);
        }
        assertArrayEquals(new float[] { 0, 867 }, GeometriaVentana.puntoAPantalla(0, 0, 3, 390, 867), 0f);
        assertArrayEquals(new float[] { 390, 0 }, GeometriaVentana.puntoAPantalla(0, 0, 1, 390, 867), 0f);
        assertArrayEquals(new float[] { 390, 867 }, GeometriaVentana.puntoAPantalla(0, 0, 2, 390, 867), 0f);
        assertArrayEquals(new int[] { 867, 390 }, GeometriaVentana.marcoDePersona(3, 390, 867));
    }

    @Test public void lasCajasPasanALaPantallaConLasMedidasCruzadas() {
        assertArrayEquals(new int[] { 8, 88, 220, 412 }, GeometriaVentana.aPantalla(new int[] { 367, 8, 412, 220 }, 3, 390, 867));
        assertArrayEquals(new int[] { 162, 88, 220, 412 }, GeometriaVentana.aPantalla(new int[] { 88, 8, 412, 220 }, 1, 390, 867));
        assertArrayEquals(new int[] { 16, 104, 358, 224 }, GeometriaVentana.aPantalla(new int[] { 16, 104, 358, 224 }, 0, 390, 867));
        // El área segura del g86 de pie, vista de lado.
        assertArrayEquals(new int[] { 42, 0, 835, 390 }, GeometriaVentana.seguroDePersona(0, 32, 390, 825, 3, 390, 867));
        assertArrayEquals(new int[] { 32, 0, 825, 390 }, GeometriaVentana.seguroDePersona(0, 32, 390, 825, 1, 390, 867));
    }

    @Test public void cadaCompensacionTieneSuClaveYSinElLaDeSiempre() {
        assertEquals("v.", GeometriaVentana.clave(false, 0));
        assertEquals("h.", GeometriaVentana.clave(true, 0));
        assertEquals("hc1.", GeometriaVentana.clave(true, 1));
        assertEquals("hc3.", GeometriaVentana.clave(true, 3));
        assertEquals("hc3.", GeometriaVentana.clave(true, -1));
    }

    // Con el lado izquierdo arriba la banda A se refleja: queda contra el borde de arriba de la pantalla de pie y no
    // sobre el obturador. Con el derecho arriba y sin compensación es la A de siempre.
    @Test public void conElLadoIzquierdoArribaLaBandaDeLadoSeRefleja() {
        assertArrayEquals(new int[] { 367, 8, 412, 220 }, GeometriaVentana.inicialGirada(3, 42, 0, 835, 390));
        assertArrayEquals(GeometriaVentana.inicial(32, 0, 825, 390), GeometriaVentana.inicialGirada(1, 32, 0, 825, 390));
        assertArrayEquals(GeometriaVentana.inicial(44, 0, 826, 390), GeometriaVentana.inicialGirada(0, 44, 0, 826, 390));
    }

    @Test public void laVistaGiradaQuedaCentradaEnSuMarco() {
        assertArrayEquals(new float[] { 0, 0, 0 }, GeometriaVentana.vista(0, 412, 220), 0f);
        assertArrayEquals(new float[] { 90, -96, 96 }, GeometriaVentana.vista(1, 412, 220), 0f);
        assertArrayEquals(new float[] { 180, 0, 0 }, GeometriaVentana.vista(2, 412, 220), 0f);
        assertArrayEquals(new float[] { 270, -96, 96 }, GeometriaVentana.vista(3, 412, 220), 0f);
    }
}

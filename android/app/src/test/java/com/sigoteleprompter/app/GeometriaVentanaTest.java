// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la elección de la banda A según la orientación. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
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
}

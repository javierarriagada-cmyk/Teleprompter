package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// TAREA 88 -04-10-2026-: LA RECETA CON TRAMOS, del lado de Java -docs/tarea88.txt, sección 7: "JUnit:
// RecetaExportacion con tramos válidos e inválidos"-. La validación de los tramos ya existía en
// RecetaExportacion.desdeValores -tarea 87-: estas son guardianas de lo que ahora se usa de verdad. La
// cuenta de los inicios en la salida -ExportadorDeTomas.iniciosEnSalidaUs, la de la línea Sigo88 de la
// capa- es nueva.
public class RecetaTramosTest {

    private static RecetaExportacion receta(String estilo, long[][] tramos) {
        return RecetaExportacion.desdeValores(1, estilo, "[]", 0, tramos, false);
    }

    @Test
    public void tramosValidosSeLeen() {
        RecetaExportacion r = receta("amarillo", new long[][]{{0, 4000}, {9000, 30000}});
        assertNotNull(r.tramosMs);
        assertEquals(2, r.tramosMs.length);
        assertArrayEquals(new long[]{9000, 30000}, r.tramosMs[1]);
    }

    @Test
    public void conTramosYEstiloNoNoEsCopia() {
        RecetaExportacion r = receta("no", new long[][]{{0, 5000}});
        assertFalse(r.esCopia());
        assertTrue(receta("no", null).esCopia());
    }

    @Test(expected = IllegalArgumentException.class)
    public void tramoAlReves() {
        receta("no", new long[][]{{5000, 1000}});
    }

    @Test(expected = IllegalArgumentException.class)
    public void tramosEncimados() {
        receta("no", new long[][]{{0, 5000}, {4000, 9000}});
    }

    @Test(expected = IllegalArgumentException.class)
    public void tramoNegativo() {
        receta("no", new long[][]{{-10, 5000}});
    }

    @Test
    public void sinTramosEsNull() {
        assertNull(receta("amarillo", null).tramosMs);
    }

    @Test
    public void iniciosEnSalida() {
        long[] inicios = ExportadorDeTomas.iniciosEnSalidaUs(new long[][]{{0, 4000}, {9000, 30000}, {31000, 32000}});
        assertArrayEquals(new long[]{0, 4_000_000, 25_000_000}, inicios);
    }
}

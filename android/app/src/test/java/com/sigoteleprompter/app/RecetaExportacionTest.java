package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

// LA RECETA EN JAVA -tarea 87, parte B4, 04-10-2026-. En las pruebas locales de Android, org.json
// es un esqueleto que lanza "Method ... not mocked": por eso se prueba desdeValores -Java puro, lo
// que valida y decide- y no desdeJson, que solo saca los valores del JSONObject. Los nombres son los
// del encargo. Sin dependencias nuevas: el junit ya declarado en build.gradle.
public class RecetaExportacionTest {
    private static final String DOS_SUBS = "[{\"desdeMs\":0,\"hastaMs\":900,\"renglones\":[]},{\"desdeMs\":900,\"hastaMs\":1800,\"renglones\":[]}]";

    @Test
    public void desdeJsonLeeEstiloYMargen() {
        RecetaExportacion r = RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, 0.35, null, false);
        assertEquals("amarillo", r.estilo);
        assertEquals(0.35f, r.margenAbajo, 0f);
        assertEquals(DOS_SUBS, r.subtitulosJson);
        assertEquals("0.350", r.margenTexto());
        RecetaExportacion normal = RecetaExportacion.desdeValores(1, "formal", DOS_SUBS, 2, 0.125, null, false);
        // Con el margen de hoy, CapaDeSubtitulos usa su cálculo de siempre: tiene que ser EXACTO.
        assertEquals(RecetaExportacion.MARGEN_ABAJO_NORMAL, normal.margenAbajo, 0f);
        assertEquals("0.125", normal.margenTexto());
    }

    @Test
    public void desdeJsonSinTramosEsNull() {
        RecetaExportacion r = RecetaExportacion.desdeValores(1, "rojo", DOS_SUBS, 2, 0.125, null, false);
        assertNull(r.tramosMs);
        assertNull(r.filtro);
    }

    @Test
    public void esCopiaSinSubtitulos() {
        assertTrue(RecetaExportacion.desdeValores(1, "no", "[]", 0, 0.125, null, false).esCopia());
        assertTrue(RecetaExportacion.desdeValores(1, "amarillo", "[]", 0, 0.125, null, false).esCopia());
        assertFalse(RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, 0.125, null, false).esCopia());
    }

    @Test
    public void desdeJsonRechazaMargenFuera() {
        for (double m : new double[] { -0.01, 0.51, Double.NaN }) {
            try {
                RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, m, null, false);
                fail("aceptó el margen " + m);
            } catch (IllegalArgumentException e) {
                assertEquals("margen fuera de 0 a 0,5", e.getMessage());
            }
        }
    }

    @Test
    public void rechazaTramosDesordenados() {
        try {
            RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, 0.125, new long[][] { { 5000, 9000 }, { 1000, 2000 } }, false);
            fail("aceptó tramos desordenados");
        } catch (IllegalArgumentException e) {
            assertEquals("tramos desordenados", e.getMessage());
        }
    }

    // D2 con un cuadro fingido: 1080x1920, letra H/32 = 60, métricas de Roboto aproximadas.
    @Test
    public void paraRedesElPintadoMasBajoQuedaEn035() {
        float H = 1920f;
        float letra = H / 32f;
        float[] lb = UbicacionSubtitulos.ubicar(H, letra, 2, 0.93f, 0.24f, 0.35f, false);
        assertEquals(letra, lb[0], 0f); // la guardia no se activa con lo de hoy
        float ultimaBaseLinea = lb[1] + letra * 1.25f - 0.24f * letra;
        float bordeCajaDescent = ultimaBaseLinea + 0.24f * letra;
        float pintadoAbajoDesdeAbajo = H - (bordeCajaDescent + 0.07f * letra);
        assertEquals(0.35f * H, pintadoAbajoDesdeAbajo, 0.5f); // 672 px
    }

    @Test
    public void laGuardiaDelCatorceAchicaLaLetra() {
        // Un cuadro fingido bajito y muchos renglones: el bloque entraría en el 14 % de arriba.
        float H = 400f;
        float[] lb = UbicacionSubtitulos.ubicar(H, 40f, 6, 0.93f, 0.24f, 0.35f, true);
        assertTrue("achicó la letra", lb[0] < 40f);
        assertTrue(UbicacionSubtitulos.bordeDeArriba(lb[1], lb[0], 0.93f, 0.24f, true) >= H * 0.14f);
    }
}

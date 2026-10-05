package com.sigoteleprompter.app;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

// TAREA 96 -05-10-2026-: EL FILTRO EN LA RECETA, del lado de Java. Como en RecetaExportacionTest, se
// prueba desdeValores -Java puro- y no desdeJson -org.json es un esqueleto en JUnit-. Las reglas son
// las de validarReceta en TypeScript: un tono que es texto y 16 números finitos.
public class RecetaFiltroTest {
    // Cálido por columnas, como lo arma lib/filtros.ts -matrizParaMedia3-.
    private static final float[] CALIDO = {
        1.06f, 0, 0, 0,
        0, 1f, 0, 0,
        0, 0, 0.92f, 0,
        0, 0, 0, 1f
    };
    private static final float[] IDENTIDAD = {
        1f, 0, 0, 0,
        0, 1f, 0, 0,
        0, 0, 1f, 0,
        0, 0, 0, 1f
    };

    @Test
    public void conFiltroValidoSeLeeYNoEsCopia() {
        RecetaExportacion r = RecetaExportacion.desdeValores(1, "no", "[]", 0, null, "calido", CALIDO);
        assertTrue(r.hayFiltro());
        assertEquals("calido", r.filtroTono);
        assertArrayEquals(CALIDO, r.filtroMatriz, 0f);
        // Sin subtítulos ni tramos, con filtro: recodifica.
        assertFalse(r.esCopia());
    }

    @Test
    public void sinFiltroSigueSiendoCopia() {
        assertTrue(RecetaExportacion.desdeValores(1, "no", "[]", 0, null, null, null).esCopia());
    }

    @Test
    public void rechazaMatrizQueNoTiene16() {
        rechaza("matriz de filtro sin 16 números", "calido", new float[] { 1, 0, 0 });
        rechaza("matriz de filtro sin 16 números", "calido", new float[0]);
    }

    @Test
    public void rechazaMatrizConNaN() {
        float[] m = IDENTIDAD.clone();
        m[5] = Float.NaN;
        rechaza("matriz de filtro sin cifras", "vivo", m);
        float[] n = IDENTIDAD.clone();
        n[12] = Float.POSITIVE_INFINITY;
        rechaza("matriz de filtro sin cifras", "vivo", n);
    }

    @Test
    public void rechazaFiltroSinTono() {
        rechaza("filtro sin tono", null, CALIDO);
        rechaza("filtro sin tono", "", CALIDO);
    }

    @Test
    public void laIdentidadEsNoOpYCalidoNo() {
        assertTrue(new MatrizDeColor(IDENTIDAD).isNoOp(1080, 1920));
        assertFalse(new MatrizDeColor(CALIDO).isNoOp(1080, 1920));
    }

    @Test
    public void matrizDeColorDevuelveLosMismosNumeros() {
        float[] m = CALIDO.clone();
        MatrizDeColor efecto = new MatrizDeColor(m);
        // Una copia: cambiar el arreglo de afuera no cambia el filtro.
        m[0] = 9f;
        assertArrayEquals(CALIDO, efecto.getMatrix(0, false), 0f);
    }

    private static void rechaza(String motivo, String tono, float[] matriz) {
        try {
            RecetaExportacion.desdeValores(1, "amarillo", "[]", 0, null, tono, matriz);
            fail("aceptó un filtro inválido: " + motivo);
        } catch (IllegalArgumentException e) {
            assertEquals(motivo, e.getMessage());
        }
    }
}

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

    // -04-10-2026, Javier simplifica la 87- La receta ya no trae margen. Antes:
    // desdeJsonLeeEstiloYMargen, con 0,35 -"Para redes"- y 0,125 -"Normal"-.
    @Test
    public void desdeJsonLeeEstilo() {
        RecetaExportacion r = RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, null, false);
        assertEquals("amarillo", r.estilo);
        assertEquals(DOS_SUBS, r.subtitulosJson);
        assertEquals(2, r.cantidadSubtitulos);
    }

    @Test
    public void desdeJsonSinTramosEsNull() {
        RecetaExportacion r = RecetaExportacion.desdeValores(1, "rojo", DOS_SUBS, 2, null, false);
        assertNull(r.tramosMs);
        assertNull(r.filtro);
    }

    @Test
    public void esCopiaSinSubtitulos() {
        assertTrue(RecetaExportacion.desdeValores(1, "no", "[]", 0, null, false).esCopia());
        assertTrue(RecetaExportacion.desdeValores(1, "amarillo", "[]", 0, null, false).esCopia());
        assertFalse(RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, null, false).esCopia());
    }

    @Test
    public void rechazaTramosDesordenados() {
        try {
            RecetaExportacion.desdeValores(1, "amarillo", DOS_SUBS, 2, new long[][] { { 5000, 9000 }, { 1000, 2000 } }, false);
            fail("aceptó tramos desordenados");
        } catch (IllegalArgumentException e) {
            assertEquals("tramos desordenados", e.getMessage());
        }
    }

    // LA POSICIÓN ÚNICA -04-10-2026, Javier simplifica la 87-: el borde de abajo del bloque a 1/6 del
    // alto de la imagen vista derecha, en vertical y en horizontal. Antes, con "Para redes", aquí iban
    // paraRedesElPintadoMasBajoQuedaEn035 y laGuardiaDelCatorceAchicaLaLetra, que se fueron con ella.
    @Test
    public void elMargenEsUnSexto() {
        assertEquals(1f / 6f, UbicacionSubtitulos.MARGEN_ABAJO, 0f);
        assertEquals("0.167", UbicacionSubtitulos.margenTexto());
    }

    // Vertical: 1080x1920, letra H/32 = 60, renglones de 75. La caja del último renglón termina a
    // 1920/6 = 320 px del borde de abajo -con 1/8 eran 240-.
    @Test
    public void enVerticalLaCajaDeAbajoQuedaAUnSextoDelAlto() {
        float H = 1920f;
        float alto = (H / 32f) * 1.25f;
        assertEquals(320f, UbicacionSubtitulos.cajaAbajo(H, alto, 1), 0.01f);
        assertEquals(320f, UbicacionSubtitulos.cajaAbajo(H, alto, 2), 0.01f);
        assertEquals(1600f - alto, UbicacionSubtitulos.base(H, alto, 2), 0.01f);
    }

    // Horizontal: 1920x1080 visto derecho -alto 1080-: 180 px -con 1/8 eran 135-.
    @Test
    public void enHorizontalLaCajaDeAbajoQuedaAUnSextoDelAlto() {
        float H = 1080f;
        float alto = (H / 32f) * 1.25f;
        assertEquals(180f, UbicacionSubtitulos.cajaAbajo(H, alto, 1), 0.01f);
        assertEquals(180f, UbicacionSubtitulos.cajaAbajo(H, alto, 2), 0.01f);
        assertEquals(900f, UbicacionSubtitulos.base(H, alto, 1), 0.01f);
    }
}

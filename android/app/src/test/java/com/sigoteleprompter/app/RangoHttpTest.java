package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

// -tomas-largas, 15-10-2026- EL RANGO DE UN PEDIDO DE VIDEO, con tamaños de más de 2 GB: lo que
// Capacitor contestaba mal -RangoHttp-.
public class RangoHttpTest {
    private static final long GRANDE = 2_350_000_000L; // la toma de 25:34

    @Test
    public void abiertoDesdeNHastaElFinal() {
        RangoHttp r = RangoHttp.interpretar("bytes=2340000000-", GRANDE);
        assertEquals(RangoHttp.Tipo.PARCIAL, r.tipo);
        assertEquals(2_340_000_000L, r.inicio);
        assertEquals(GRANDE - 1, r.fin);
        assertEquals(10_000_000L, r.largo());
        assertEquals("bytes 2340000000-2349999999/2350000000", r.contentRange());
    }

    @Test
    public void cerradoYCortadoAlFinal() {
        RangoHttp r = RangoHttp.interpretar("bytes=0-1023", GRANDE);
        assertEquals(1024, r.largo());
        RangoHttp c = RangoHttp.interpretar("bytes=100-999", 500);
        assertEquals(RangoHttp.Tipo.PARCIAL, c.tipo);
        assertEquals(499, c.fin);
    }

    @Test
    public void sufijo() {
        RangoHttp r = RangoHttp.interpretar("bytes=-500", GRANDE);
        assertEquals(GRANDE - 500, r.inicio);
        assertEquals(500, r.largo());
        assertEquals(0, RangoHttp.interpretar("bytes=-9000", 100).inicio);
        assertEquals(RangoHttp.Tipo.NO_SATISFACIBLE, RangoHttp.interpretar("bytes=-0", 100).tipo);
    }

    @Test
    public void fueraDelArchivoEs416() {
        RangoHttp r = RangoHttp.interpretar("bytes=" + GRANDE + "-", GRANDE);
        assertEquals(RangoHttp.Tipo.NO_SATISFACIBLE, r.tipo);
        assertEquals("bytes */2350000000", r.contentRange());
        assertEquals(RangoHttp.Tipo.NO_SATISFACIBLE, RangoHttp.interpretar("bytes=0-", 0).tipo);
    }

    @Test
    public void loQueNoSeEntiendeEsElArchivoEntero() {
        for (String malo : new String[] { "items=0-1", "bytes=0-1,5-6", "bytes=9-3", "bytes=a-", "bytes=", "bytes=-" }) {
            RangoHttp r = RangoHttp.interpretar(malo, GRANDE);
            assertEquals(malo, RangoHttp.Tipo.ENTERO, r.tipo);
            assertEquals(GRANDE, r.largo());
        }
    }
}

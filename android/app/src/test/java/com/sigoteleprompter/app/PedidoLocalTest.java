package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// -visor-servidor, 17-10-2026- Identificador opaco, clave en la ruta, encabezados en long.
// Antes -medir-servidor-local-: la ruta iba en la dirección.
public class PedidoLocalTest {
    private static final String CLAVE = "a1b2c3";
    private static final long TOMA = 5_294_684_753L; // ~5,29 GB, la toma del Redmi

    @Test
    public void rangoDesdeTresMilMillones() {
        String url = PedidoLocal.direccion(40123, CLAVE, "ab12");
        String objetivo = url.substring("http://127.0.0.1:40123".length());
        PedidoLocal p = PedidoLocal.leer("GET " + objetivo + " HTTP/1.1", CLAVE);
        assertEquals(0, p.rechazo());
        assertEquals("ab12", p.id);
        // La ruta no va en la dirección.
        assertTrue(!url.contains("content:"));
        RangoHttp r = RangoHttp.interpretar("bytes=3000000000-", TOMA);
        String e = PedidoLocal.encabezados(r, "video/mp4");
        assertTrue(e.startsWith("HTTP/1.1 206 Partial Content\r\n"));
        assertTrue(e.contains("Content-Range: bytes 3000000000-5294684752/5294684753\r\n"));
        assertTrue(e.contains("Content-Length: 2294684753\r\n"));
        assertTrue(e.contains("Accept-Ranges: bytes\r\n"));
        assertTrue(e.contains("Content-Type: video/mp4\r\n"));
    }

    @Test
    public void sinClaveSeRechaza() {
        assertEquals(403, PedidoLocal.leer("GET /ab12 HTTP/1.1", CLAVE).rechazo());
        assertEquals(403, PedidoLocal.leer("GET /otra/ab12 HTTP/1.1", CLAVE).rechazo());
        assertTrue(PedidoLocal.rechazado(403).startsWith("HTTP/1.1 403"));
    }

    @Test
    public void soloGetYHead() {
        assertEquals(0, PedidoLocal.leer("HEAD /a1b2c3/ab12 HTTP/1.1", CLAVE).rechazo());
        assertEquals(405, PedidoLocal.leer("POST /a1b2c3/ab12 HTTP/1.1", CLAVE).rechazo());
    }

    @Test
    public void sinIdSeRechaza() {
        assertEquals(404, PedidoLocal.leer("GET /a1b2c3/ HTTP/1.1", CLAVE).rechazo());
        assertNull(PedidoLocal.leer("GET /a1b2c3/ab12/extra HTTP/1.1", CLAVE).id);
    }
}

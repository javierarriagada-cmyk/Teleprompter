// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: las reglas de la sesión de la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// Solo la lógica, con la hora puesta a mano: qué cuenta como lectura, cuándo sale el aviso, cuándo pausa el límite, y
// que Pausa y Seguir pasen por la cuenta 3-2-1. Los valores son los de omisión de limites.ts: 240 s y 60 s antes.
public class SesionVentanaTest {
    static final int LECTURA = 240, AVISO = 60;

    static SesionVentana conLimite() { return new SesionVentana(true, LECTURA, AVISO, 0); }

    // Pausa en t y Seguir hasta volver a escuchar, con la cuenta entera: devuelve la hora al terminar la cuenta.
    static long pausaYSeguir(SesionVentana s, long t, long pausaMs) {
        assertTrue(s.pausar(t));
        long u = t + pausaMs;
        assertEquals(3, s.seguir());
        assertEquals(2, s.pasoDeCuenta(u + 1000));
        assertEquals(1, s.pasoDeCuenta(u + 2000));
        assertEquals(0, s.pasoDeCuenta(u + 3000));
        return u + 3000;
    }

    @Test public void losSegundosCuentanSoloEscuchando() {
        SesionVentana s = conLimite();
        // La cuenta inicial no cuenta.
        assertEquals(0, s.leidosMs(5000));
        assertTrue(s.empezarLectura(10_000));
        assertEquals(30_000, s.leidosMs(40_000));
        // 50 s de pausa y los 3 de la cuenta no cuentan.
        long vuelta = pausaYSeguir(s, 40_000, 50_000);
        assertEquals(30_000, s.leidosMs(vuelta));
        assertEquals(40_000, s.leidosMs(vuelta + 10_000));
        // Durante la cuenta tampoco corre.
        SesionVentana c = conLimite();
        c.empezarLectura(0);
        c.pausar(20_000);
        c.seguir();
        assertEquals(20_000, c.leidosMs(21_500));
        // Lo leído antes de abrir se suma.
        SesionVentana previa = new SesionVentana(true, LECTURA, AVISO, 12.5);
        previa.empezarLectura(0);
        assertEquals(22_500, previa.leidosMs(10_000));
    }

    @Test public void elAvisoSaleUnaVezEnLecturaMenosAviso() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(179_999));
        assertEquals(SesionVentana.Evento.AVISO, s.revisar(180_000));
        assertEquals(SesionVentana.Evento.NADA, s.revisar(180_250));
        // Ni después de una pausa vuelve a salir.
        long vuelta = pausaYSeguir(s, 190_000, 20_000);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 1000));
    }

    @Test public void elLimitePausaUnaVezEnLectura() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertEquals(SesionVentana.Evento.AVISO, s.revisar(180_000));
        // Con una pausa de 30 s de por medio, el límite cae a los 240 s leídos: 270 s de reloj.
        long vuelta = pausaYSeguir(s, 200_000, 27_000);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 39_999));
        assertEquals(SesionVentana.Evento.LIMITE, s.revisar(vuelta + 40_000));
        assertTrue(s.enPausa());
        assertTrue(s.llegoAlLimite());
        // En la pausa del límite nada más cuenta ni vuelve a pausar.
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 60_000));
        // Seguir después del límite sigue, como en Sigo después de su pausa del límite: no vuelve a cortar.
        long otra = pausaYSeguirDesdePausa(s, vuelta + 70_000);
        assertTrue(s.escuchando());
        assertEquals(SesionVentana.Evento.NADA, s.revisar(otra + 600_000));
        assertTrue(s.escuchando());
    }

    static long pausaYSeguirDesdePausa(SesionVentana s, long u) {
        assertEquals(3, s.seguir());
        s.pasoDeCuenta(u + 1000);
        s.pasoDeCuenta(u + 2000);
        assertEquals(0, s.pasoDeCuenta(u + 3000));
        return u + 3000;
    }

    @Test public void sinLimiteNoHayAvisoNiPausa() {
        // Sigo+ o Velocidad fija: el contrato llega sin límite.
        SesionVentana s = new SesionVentana(false, LECTURA, AVISO, 0);
        s.empezarLectura(0);
        for (long t = 0; t <= 3_600_000; t += 250) assertEquals(SesionVentana.Evento.NADA, s.revisar(t));
        assertTrue(s.escuchando());
        assertFalse(s.llegoAlLimite());
    }

    @Test public void pausaYSeguirPasanPorLaCuenta() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertTrue(s.pausar(1000));
        assertTrue(s.enPausa());
        assertFalse(s.pausar(1500));
        // Seguir no vuelve a escuchar de una: 3, 2, 1 y recién ahí.
        assertEquals(3, s.seguir());
        assertEquals(3, s.cuenta());
        assertFalse(s.escuchando());
        assertEquals(2, s.pasoDeCuenta(2000));
        assertEquals(1, s.pasoDeCuenta(3000));
        assertFalse(s.escuchando());
        assertEquals(0, s.pasoDeCuenta(4000));
        assertTrue(s.escuchando());
        // Seguir sin pausa no hace nada; un paso viejo de la cuenta tampoco.
        assertEquals(0, s.seguir());
        assertEquals(-1, s.pasoDeCuenta(5000));
        // Pausa en plena cuenta: la corta, y un paso que haya quedado en la cola no la revive.
        s.pausar(6000);
        s.seguir();
        assertTrue(s.pausar(6500));
        assertEquals(-1, s.pasoDeCuenta(7000));
        assertTrue(s.enPausa());
    }
}

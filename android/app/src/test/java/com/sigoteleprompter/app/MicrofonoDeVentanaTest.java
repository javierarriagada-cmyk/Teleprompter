// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: de quién es el micrófono abierto. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// Cada apertura es una captura con número y sesión dueña; las órdenes atrasadas solo cierran lo suyo.
public class MicrofonoDeVentanaTest {
    @Test public void cadaAperturaEsUnaCapturaNuevaDeSuSesion() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        assertFalse(m.abierto());
        long c1 = m.abrio(1);
        assertEquals(1, m.sesion());
        m.cerro();
        long c2 = m.abrio(1);
        assertTrue(c2 != c1);
        assertEquals(c2, m.captura());
    }

    @Test public void elCierreDeUnaSesionLiberaSoloLoSuyoYUnaVez() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        long c1 = m.abrio(1);
        assertEquals(c1, m.liberarSesion(1));
        m.cerro();
        // Repetido: ya no hay nada de esa sesión.
        assertEquals(0, m.liberarSesion(1));
        // Una sesión nueva abre: el cierre atrasado de la vieja no la toca.
        long c2 = m.abrio(2);
        assertEquals(0, m.liberarSesion(1));
        assertEquals(c2, m.captura());
        // Ni una lectura sin ventana -sesión 0- la cierra una ventana.
        m.cerro();
        m.abrio(0);
        assertEquals(0, m.liberarSesion(0));
        assertEquals(0, m.liberarSesion(2));
        assertTrue(m.abierto());
    }

    @Test public void unaConfirmacionDescartadaSueltaSoloSuCaptura() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        long c1 = m.abrio(1);
        assertEquals(c1, m.liberarCaptura(c1));
        m.cerro();
        long c2 = m.abrio(1);
        assertEquals(0, m.liberarCaptura(c1));
        assertEquals(0, m.liberarCaptura(0));
        assertEquals(c2, m.captura());
    }

    @Test public void laPausaEsDeSuSesionYElCierreLaSuelta() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        long c = m.abrio(1);
        // Otra sesión no pausa lo de la 1.
        assertEquals(0, m.pausar(2, true));
        assertEquals(0, m.pausa());
        assertEquals(c, m.pausar(1, true));
        m.cerro();
        assertEquals(1, m.pausa());
        // Seguir de otra sesión no la suelta; la de la 1 sí, una vez.
        assertFalse(m.reanudar(2));
        assertTrue(m.reanudar(1));
        assertFalse(m.reanudar(1));
        // El cierre de la sesión suelta su pausa.
        m.pausar(1, true);
        m.liberarSesion(1);
        assertEquals(0, m.pausa());
    }

    // -9-nov-2026, orden t160u, punto 3- Una orden vieja de detener no corta la voz de una lectura nueva.
    @Test public void elDetenerAtrasadoDeLaLecturaViejaNoCierraLaNueva() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        long vieja = m.abrio(0);
        // La lectura nueva pide escuchar con el oído todavía abierto: se queda con él, con número nuevo.
        long nueva = m.renovar(0);
        assertTrue(nueva != 0 && nueva != vieja);
        assertEquals(nueva, m.captura());
        // Llega el detener de la vieja: no cierra.
        assertFalse(m.cierraElDetener(vieja));
        assertTrue(m.abierto());
        // El de la nueva sí.
        assertTrue(m.cierraElDetener(nueva));
        m.cerro();
        // Repetido, ya no hay nada que cerrar; y el 0 -escuchar que no abrió nada suyo- nunca cierra.
        assertFalse(m.cierraElDetener(nueva));
        m.abrio(0);
        assertFalse(m.cierraElDetener(0));
        // Sin captura -una página vieja- cierra lo que haya, como antes.
        assertTrue(m.cierraElDetener(-1));
    }

    @Test public void renovarSoloConElOidoAbiertoYDelMismoDueno() {
        MicrofonoDeVentana m = new MicrofonoDeVentana();
        assertEquals(0, m.renovar(0));
        long c = m.abrio(3);
        // Lo abierto es de la ventana 3: la página sin esa ventana no se lo lleva.
        assertEquals(0, m.renovar(0));
        assertEquals(c, m.captura());
        assertEquals(3, m.sesion());
    }

    @Test public void laCapturaPedidaLlegaComoIntegerOLong() {
        assertEquals(-1, MicrofonoDeVentana.capturaPedida(null));
        assertEquals(-1, MicrofonoDeVentana.capturaPedida("3"));
        assertEquals(3, MicrofonoDeVentana.capturaPedida(Integer.valueOf(3)));
        assertEquals(5_000_000_000L, MicrofonoDeVentana.capturaPedida(Long.valueOf(5_000_000_000L)));
        assertEquals(0, MicrofonoDeVentana.capturaPedida(Integer.valueOf(0)));
        assertEquals(-1, MicrofonoDeVentana.capturaPedida(Integer.valueOf(-2)));
    }
}

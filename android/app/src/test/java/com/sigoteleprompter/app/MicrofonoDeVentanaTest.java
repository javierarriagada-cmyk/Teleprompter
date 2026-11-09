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
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: el cierre común de la sesión. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

// El cierre común hace sus tres cosas una vez, y la liberación del micrófono es una de ellas: no solo la X.
public class CierreDeSesionTest {
    static final class Anotadas implements CierreDeSesion.Acciones {
        final List<String> hechas = new ArrayList<>();
        @Override public void cancelarCuenta() { hechas.add("cuenta"); }
        @Override public void liberarMicrofono(long sesion, String motivo) { hechas.add("micrófono " + sesion); }
        @Override public void quitarVentanas(String motivo) { hechas.add("ventanas " + motivo); }
    }

    @Test public void cierraUnaVezConLasTresCosas() {
        CierreDeSesion c = new CierreDeSesion();
        SesionVentana reglas = new SesionVentana(false, 0, 0, 0);
        Anotadas a = new Anotadas();
        assertTrue(c.cerrar(7, "onUnbind", reglas, 1000, a));
        assertEquals(Arrays.asList("cuenta", "micrófono 7", "ventanas onUnbind"), a.hechas);
        assertTrue(reglas.cerrada());
        // Repetido -la X y después la desconexión, o handleOnDestroy-: nada más.
        assertFalse(c.cerrar(7, "cerrar", reglas, 2000, a));
        assertEquals(3, a.hechas.size());
        assertTrue(c.hecho());
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: lo que manda Sigo a la sesión de la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// -9-nov-2026, orden t163u, caso 1- Un mensaje atrasado de una ventana anterior no toca la sesión nueva: el contrato y
// la cancelación de A, entregados con B abierta, se descartan con su motivo en el registro.
public class EntradaDeSigoTest {
    // La sesión receptora, como VentanaDePrueba.Sesion: sus reglas, lo que pasa a su página y lo que hace la ventana.
    static class Sesion implements EntradaDeSigo.Receptor {
        final long numero;
        SesionVentana reglas = new SesionVentana(false, 0, 0, 0);
        final List<String> registro = new ArrayList<>();
        final List<String> pagina = new ArrayList<>();
        final List<String> ventana = new ArrayList<>();
        long finCuenta = -1;
        Sesion(long numero) { this.numero = numero; }
        @Override public SesionVentana reglas() { return reglas; }
        @Override public void ponerReglas(SesionVentana nuevas) { reglas = nuevas; }
        @Override public void programarFinCuenta(long finMs) { finCuenta = finMs; }
        @Override public void quitarFinCuenta() { finCuenta = -1; }
        @Override public boolean alFinDeLaCuentaInicial(SesionVentana.Inicial r) {
            if (r == SesionVentana.Inicial.CANCELADA) ventana.add("pausa: micrófono de la sesión " + numero + " cerrado");
            return r == SesionVentana.Inicial.REENVIAR;
        }
        @Override public void anotar(String linea) { registro.add(linea); }
        void entregar(EntradaDeSigo.Mensaje m, String guion, long ahora) {
            if (EntradaDeSigo.recibir(m, numero, ahora, this)) pagina.add(m.tipo + (guion == null ? "" : ":" + guion));
        }
    }

    static EntradaDeSigo.Mensaje contrato(long sesion, int lecturaSeg) {
        EntradaDeSigo.Mensaje m = new EntradaDeSigo.Mensaje();
        m.tipo = "contrato";
        m.sesion = sesion;
        m.conLimite = true;
        m.lecturaSeg = lecturaSeg;
        m.avisoAntesSeg = 60;
        return m;
    }
    static EntradaDeSigo.Mensaje estado(long sesion, int cuenta, boolean cancelada) {
        EntradaDeSigo.Mensaje m = new EntradaDeSigo.Mensaje();
        m.tipo = "estado";
        m.sesion = sesion;
        m.cuenta = cuenta;
        m.cancelada = cancelada;
        return m;
    }

    @Test public void elContratoYLaCancelacionAtrasadosDeANoTocanLaSesionB() {
        // A abre; su contrato y su cancelación quedan pendientes en la cola de Android. A se cierra y abre B.
        EntradaDeSigo.Mensaje contratoA = contrato(1, 600);
        EntradaDeSigo.Mensaje cancelacionA = estado(1, 0, true);
        Sesion b = new Sesion(2);
        b.entregar(contrato(2, 240), "guion B", 1000);
        b.entregar(estado(2, 3, false), null, 1000);
        SesionVentana reglasB = b.reglas;
        assertEquals(4000, b.finCuenta);
        assertTrue(reglasB.conLimite);
        assertEquals(240_000, reglasB.lecturaMs);
        assertEquals(SesionVentana.Apertura.ANOTADA, reglasB.alAbrirMicrofono(SesionVentana.INTENTO_INICIAL, true, 1500));
        b.pagina.clear();
        b.registro.clear();
        // Llegan los dos mensajes de A.
        b.entregar(contratoA, "guion A", 2000);
        b.entregar(cancelacionA, null, 2001);
        // B conserva su guion -nada nuevo pasó a la página-, sus reglas con su límite, su cuenta y su micrófono.
        assertEquals(new ArrayList<String>(), b.pagina);
        assertSame(reglasB, b.reglas);
        assertEquals(240_000, b.reglas.lecturaMs);
        assertEquals(SesionVentana.Fase.CUENTA_INICIAL, b.reglas.fase());
        assertEquals(4000, b.finCuenta);
        assertEquals(new ArrayList<String>(), b.ventana);
        // La cuenta de B sigue y su micrófono, ya confirmado, empieza la lectura al terminar.
        assertEquals(SesionVentana.Inicial.ESCUCHANDO, b.reglas.terminarCuentaInicial(4000));
        // El descarte queda en el registro, con las dos sesiones.
        assertEquals(2, b.registro.size());
        assertTrue(b.registro.get(0), b.registro.get(0).contains("contrato de la sesión 1 descartado: la abierta es la 2"));
        assertTrue(b.registro.get(1), b.registro.get(1).contains("estado de la sesión 1 descartado: la abierta es la 2"));
    }

    @Test public void losMensajesDeLaPropiaSesionSeAplicanComoSiempre() {
        Sesion b = new Sesion(2);
        b.entregar(contrato(2, 240), "guion B", 1000);
        assertEquals(1, b.pagina.size());
        assertEquals("contrato:guion B", b.pagina.get(0));
        b.entregar(estado(2, 3, false), null, 1000);
        assertEquals(4000, b.finCuenta);
        b.entregar(estado(2, 0, true), null, 2000);
        assertEquals(1, b.ventana.size());
        assertTrue(b.reglas.enPausa());
    }

    @Test public void unContratoOUnEstadoSinNumeroDeSesionSeDescarta() {
        Sesion b = new Sesion(2);
        b.entregar(contrato(2, 240), "guion B", 1000);
        SesionVentana reglasB = b.reglas;
        b.entregar(contrato(-1, 600), "sin número", 2000);
        b.entregar(estado(-1, 0, true), null, 2001);
        assertSame(reglasB, b.reglas);
        assertFalse(b.reglas.enPausa());
        assertEquals(1, b.pagina.size());
    }
}

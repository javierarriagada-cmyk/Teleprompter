// PROTOTIPO DE LA VENTANA FLOTANTE, 9-nov-2026: Seguir y el cierre con el micrófono de verdad. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// LAS DOS COLAS DE ANDROID, EN LA JVM -9-nov-2026, orden «Tres correcciones», fallos 2 y 3-. VentanaDePrueba corre en
// el hilo principal y VoskNativoPlugin en el de los plugins; entre los dos van órdenes y respuestas que pueden llegar
// tarde. Aquí cada hilo es una cola que la prueba vacía cuando quiere, para poner cada respuesta antes o después de
// Pausa, de la X o de la desconexión del servicio. Las reglas son las de verdad -SesionVentana, MicrofonoDeVentana,
// CierreDeSesion-; el pegamento de abajo repite, línea por línea, lo que hacen VentanaDePrueba.Sesion -seguirEnAndroid,
// darPasoDeCuenta, alAbrirMicrofono, pausarEnAndroid, cerrar- y VoskNativoPlugin -pausarParaVentana,
// reanudarParaVentana, liberarDeVentana, liberarCaptura-. El micrófono abierto es mic.abierto(): lo que importa es que
// nunca quede abierto ni la ventana vuelva a decir «escuchando» después de cerrar.
public class MicrofonoDeLaSesionFlotanteTest {
    final ArrayDeque<Runnable> principal = new ArrayDeque<>();
    final ArrayDeque<Runnable> hiloPlugins = new ArrayDeque<>();
    final MicrofonoDeVentana mic = new MicrofonoDeVentana();
    final List<Long> liberadas = new ArrayList<>();
    Sesion actual;
    boolean abreElMicrofono = true;

    void correrPlugins() { while (!hiloPlugins.isEmpty()) hiloPlugins.removeFirst().run(); }
    void correrPrincipal() { while (!principal.isEmpty()) principal.removeFirst().run(); }
    void correrTodo() { while (!hiloPlugins.isEmpty() || !principal.isEmpty()) { correrPlugins(); correrPrincipal(); } }
    boolean esActual(long n) { return actual != null && actual.numero == n; }

    // --- VoskNativoPlugin, en su hilo ---
    void pararOido() { if (mic.abierto()) liberadas.add(mic.captura()); mic.cerro(); }
    // escuchar de la página de Sigo: abre para la sesión abierta en ese momento.
    long escucharDeLaPagina() { return mic.abrio(actual == null ? 0 : actual.numero); }
    void pausarParaVentana(long sesion) {
        hiloPlugins.add(() -> {
            if (mic.abierto() && mic.sesion() != sesion) return;
            mic.pausar(sesion, esActual(sesion));
            pararOido();
        });
    }
    void reanudarParaVentana(long sesion, long intento) {
        hiloPlugins.add(() -> {
            long captura = 0;
            if (!esActual(sesion)) captura = 0;
            else if (!mic.reanudar(sesion)) captura = 0;
            else if (mic.abierto()) captura = mic.sesion() == sesion ? mic.captura() : 0;
            else if (abreElMicrofono) captura = mic.abrio(sesion);
            final long c = captura;
            principal.add(() -> aperturaDelMicrofono(sesion, intento, c));
        });
    }
    void liberarDeVentana(long sesion) {
        hiloPlugins.add(() -> { if (mic.liberarSesion(sesion) != 0) pararOido(); });
    }
    void liberarCaptura(long captura) {
        hiloPlugins.add(() -> { if (mic.liberarCaptura(captura) != 0) pararOido(); });
    }

    // --- VentanaDePrueba, en el hilo principal ---
    void aperturaDelMicrofono(long numero, long intento, long captura) {
        Sesion s = actual;
        if (s != null && s.numero == numero && !s.cerrada) { s.alAbrirMicrofono(intento, captura); return; }
        if (captura != 0) liberarCaptura(captura);
    }
    void cerrarDeAccesibilidad(long numero, String motivo) {
        principal.add(() -> { Sesion s = actual; if (s != null && s.numero == numero) s.cerrar(motivo); });
    }

    final class Sesion {
        final long numero;
        final SesionVentana reglas = new SesionVentana(true, 240, 60, 0);
        final CierreDeSesion cierre = new CierreDeSesion();
        final List<String> publicados = new ArrayList<>();
        boolean cerrada, cuentaPendiente, microFallo;
        int ventanasQuitadas;

        Sesion(long n) { numero = n; actual = this; }
        void publicar() { publicados.add(reglas.escuchando() ? "escuchando" : reglas.enPausa() ? "pausa" : reglas.cuenta() > 0 ? "cuenta " + reglas.cuenta() : "esperando"); }
        String ultimo() { return publicados.isEmpty() ? "" : publicados.get(publicados.size() - 1); }
        boolean vigente() { return actual == this && !cerrada; }

        void pausar(long t) {
            if (!vigente()) return;
            cuentaPendiente = false;
            boolean cambio = reglas.pausar(t);
            pausarParaVentana(numero);
            if (cambio) publicar();
        }
        void seguir() {
            if (!vigente() || reglas.seguir() == 0) return;
            if (microFallo) microFallo = false;
            cuentaPendiente = true;
            publicar();
        }
        // Un segundo de la cuenta. Con la cuenta cancelada el Runnable no corre; pasoViejo lo fuerza igual.
        void paso(long t) { if (cuentaPendiente) pasoViejo(t); }
        void pasoViejo(long t) {
            if (!vigente()) return;
            int r = reglas.pasoDeCuenta(t);
            if (r < 0) return;
            if (r > 0) { publicar(); return; }
            cuentaPendiente = false;
            long intento = reglas.intentoPedido();
            publicar();
            reanudarParaVentana(numero, intento);
        }
        long ahora;
        void alAbrirMicrofono(long intento, long captura) {
            SesionVentana.Apertura r = reglas.alAbrirMicrofono(intento, captura != 0, ahora);
            if (r == SesionVentana.Apertura.ESCUCHANDO) { microFallo = false; publicar(); }
            else if (r == SesionVentana.Apertura.PAUSA) { pausarParaVentana(numero); microFallo = true; publicar(); }
            else if (captura != 0) liberarCaptura(captura);
        }
        void cerrar(String motivo) {
            if (!vigente()) return;
            cierre.cerrar(numero, motivo, reglas, ahora, new CierreDeSesion.Acciones() {
                @Override public void cancelarCuenta() { cuentaPendiente = false; }
                @Override public void liberarMicrofono(long sesion, String m) { liberarDeVentana(sesion); }
                @Override public void quitarVentanas(String m) { cerrada = true; actual = null; ventanasQuitadas++; }
            });
        }
    }

    // La sesión leyendo con el micrófono que abrió la página de Sigo al empezar, y después en Pausa.
    Sesion enPausa(long n) {
        Sesion s = new Sesion(n);
        escucharDeLaPagina();
        s.reglas.empezarLectura(0);
        s.pausar(10_000);
        correrTodo();
        assertFalse(mic.abierto());
        return s;
    }
    void cuentaEntera(Sesion s, long t) {
        s.seguir();
        s.paso(t + 1000);
        s.paso(t + 2000);
        s.paso(t + 3000);
        s.ahora = t + 3000;
    }

    // --- FALLO 2: Seguir escucha y cuenta solo con la apertura confirmada ---

    @Test public void conLaAperturaPendienteNoEscuchaNiCuenta() {
        Sesion s = enPausa(1);
        cuentaEntera(s, 20_000);
        assertEquals("esperando", s.ultimo());
        // Vosk no respondió: pasa el tiempo y los segundos leídos no suben.
        assertEquals(10_000, s.reglas.leidosMs(80_000));
        assertFalse(s.publicados.contains("escuchando"));
        // Responde: abierto, y desde ahí escucha y cuenta.
        s.ahora = 80_000;
        correrPlugins();
        assertTrue(mic.abierto());
        assertEquals(1, mic.sesion());
        assertFalse(s.publicados.contains("escuchando"));
        correrPrincipal();
        assertEquals("escuchando", s.ultimo());
        assertEquals(15_000, s.reglas.leidosMs(85_000));
    }

    @Test public void siNoAbreVuelveAPausaSinContarYSePuedeReintentar() {
        Sesion s = enPausa(1);
        abreElMicrofono = false;
        cuentaEntera(s, 20_000);
        correrTodo();
        assertEquals("pausa", s.ultimo());
        assertTrue(s.microFallo);
        assertFalse(mic.abierto());
        assertFalse(s.publicados.contains("escuchando"));
        assertEquals(10_000, s.reglas.leidosMs(120_000));
        // La pausa del micrófono quedó puesta otra vez: un escuchar tardío de la página no lo abriría.
        assertEquals(1, mic.pausa());
        // Reintento: Seguir otra vez, ahora abre.
        abreElMicrofono = true;
        cuentaEntera(s, 130_000);
        assertFalse(s.microFallo);
        correrTodo();
        assertEquals("escuchando", s.ultimo());
        assertTrue(mic.abierto());
        assertEquals(10_000 + 7_000, s.reglas.leidosMs(140_000));
    }

    @Test public void cerrarEnElDosNoDejaElMicrofonoAbierto() {
        Sesion s = enPausa(1);
        s.seguir();
        s.paso(21_000);
        assertEquals("cuenta 2", s.ultimo());
        s.cerrar("cerrar");
        // Un paso de la cuenta que haya quedado en la cola no revive nada.
        s.pasoViejo(22_000);
        s.pasoViejo(23_000);
        correrTodo();
        assertFalse(mic.abierto());
        assertFalse(s.publicados.contains("escuchando"));
        assertEquals(1, s.ventanasQuitadas);
    }

    @Test public void cerrarConLaAperturaPendienteNoDejaElMicrofonoAbierto() {
        // Antes de que el hilo de los plugins atienda la apertura: ya no abre.
        Sesion s = enPausa(1);
        cuentaEntera(s, 20_000);
        s.cerrar("cerrar");
        correrTodo();
        assertFalse(mic.abierto());
        assertFalse(s.publicados.contains("escuchando"));

        // Con el micrófono ya abierto por esa apertura y la confirmación todavía en camino: el cierre común lo libera
        // y la confirmación que llega después se descarta.
        Sesion t = enPausa(2);
        cuentaEntera(t, 20_000);
        correrPlugins();
        long c = mic.captura();
        assertTrue(c != 0);
        Runnable confirmacion = principal.removeFirst();
        cerrarDeAccesibilidad(2, "onUnbind");
        correrPrincipal();
        correrPlugins();
        assertFalse(mic.abierto());
        assertTrue(liberadas.contains(c));
        confirmacion.run();
        correrTodo();
        assertFalse(mic.abierto());
        assertFalse(t.publicados.contains("escuchando"));
    }

    @Test public void unaConfirmacionDespuesDePausaSeDescartaYSueltaSuCaptura() {
        // Pausa -o pantalla apagada, que es la misma pausa- con la confirmación en camino.
        Sesion s = enPausa(1);
        cuentaEntera(s, 20_000);
        correrPlugins();
        long c = mic.captura();
        Runnable confirmacion = principal.removeFirst();
        s.pausar(24_000);
        confirmacion.run();
        correrTodo();
        assertFalse(mic.abierto());
        assertTrue(liberadas.contains(c));
        assertEquals("pausa", s.ultimo());
        assertFalse(s.publicados.contains("escuchando"));
        assertEquals(10_000, s.reglas.leidosMs(90_000));

        // Si la pausa no alcanzó a cerrar -la confirmación se atiende antes que la pausa en el hilo de los plugins-,
        // la captura la suelta la confirmación descartada.
        Sesion t = new Sesion(9);
        t.reglas.empezarLectura(0);
        t.pausar(1000);
        correrTodo();
        cuentaEntera(t, 2000);
        correrPlugins();
        long d = mic.captura();
        t.reglas.pausar(6000);
        principal.removeFirst().run();
        correrPlugins();
        assertFalse(mic.abierto());
        assertTrue(liberadas.contains(d));
    }

    // --- FALLO 3: el cierre común libera el micrófono de la sesión ---

    @Test public void laXYLaDesconexionDelServicioLiberanElMicrofonoMientrasSeEscucha() {
        for (String motivo : new String[] { "cerrar", "onUnbind", "onDestroy accesibilidad", "handleOnDestroy" }) {
            liberadas.clear();
            Sesion s = new Sesion(motivo.hashCode() & 0xffff);
            long c = escucharDeLaPagina();
            s.reglas.empezarLectura(0);
            assertTrue(mic.abierto());
            if (motivo.equals("cerrar")) s.cerrar(motivo);
            else cerrarDeAccesibilidad(s.numero, motivo);
            // Sin la página de Sigo: solo las dos colas de Android.
            correrTodo();
            assertFalse(motivo, mic.abierto());
            assertEquals(motivo, 1, liberadas.size());
            assertEquals(motivo, (Long) c, liberadas.get(0));
        }
    }

    @Test public void elCierreRepetidoNoHaceNadaMas() {
        Sesion s = new Sesion(1);
        escucharDeLaPagina();
        s.cerrar("cerrar");
        cerrarDeAccesibilidad(1, "onUnbind");
        s.cerrar("handleOnDestroy");
        correrTodo();
        assertEquals(1, liberadas.size());
        assertEquals(1, s.ventanasQuitadas);
        // Ni una orden de liberar repetida en el hilo de los plugins cierra algo de más.
        long c = mic.abrio(0);
        liberarDeVentana(1);
        correrPlugins();
        assertTrue(mic.abierto());
        assertEquals(c, mic.captura());
    }

    @Test public void unCierreAtrasadoDeLaSesionViejaNoApagaElMicrofonoDeLaNueva() {
        Sesion vieja = new Sesion(1);
        long c1 = escucharDeLaPagina();
        vieja.cerrar("cerrar");
        correrTodo();
        assertEquals((Long) c1, liberadas.get(0));
        Sesion nueva = new Sesion(2);
        long c2 = escucharDeLaPagina();
        nueva.reglas.empezarLectura(0);
        // Llegan tarde: otra desconexión de la vieja, su liberación y la de una captura suya.
        cerrarDeAccesibilidad(1, "onUnbind");
        liberarDeVentana(1);
        liberarCaptura(c1);
        correrTodo();
        assertTrue(mic.abierto());
        assertEquals(c2, mic.captura());
        assertEquals(2, mic.sesion());
        assertEquals(1, liberadas.size());
        // Y el cierre de la nueva libera la suya.
        nueva.cerrar("cerrar");
        correrTodo();
        assertFalse(mic.abierto());
        assertEquals((Long) c2, liberadas.get(1));
    }
}

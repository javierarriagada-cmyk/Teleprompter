// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: cuánto se gira la banda según el teléfono y la pantalla. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// Solo la decisión, con la hora y los grados puestos a mano: los grados son los de OrientationEventListener -0 de pie,
// 90 con el lado izquierdo arriba, 270 con el derecho arriba, -1 plano- y la pantalla, Display.getRotation. Cada
// escenario anota las compensaciones que se aplicaron, en orden: la banda gira una vez por cada número de la lista.
public class OrientacionDeVentanaTest {
    static final class SensorDePrueba implements OrientacionDeVentana.Sensor {
        int encendidos, apagados;
        boolean puede = true;
        boolean encendido() { return encendidos > apagados; }
        @Override public boolean encender() { if (!puede) return false; encendidos++; return true; }
        @Override public void apagar() { apagados++; }
    }

    // Un teléfono de prueba: la hora avanza, y cada cambio de la compensación queda anotado.
    static final class Escena {
        final SensorDePrueba sensor = new SensorDePrueba();
        final OrientacionDeVentana o = new OrientacionDeVentana(sensor);
        final List<Integer> giros = new ArrayList<>();
        long t = 1000;
        Escena(int pantalla, boolean auto) { o.empezar(pantalla, auto); }
        // Lecturas cada 60 ms -SENSOR_DELAY_UI- durante ms; el reloj de la gracia corre entre medio.
        Escena sostener(int grados, long ms) {
            long fin = t + ms;
            while (t < fin) {
                if (o.alSensor(grados, t)) giros.add(o.aplicada());
                reloj();
                t += 60;
            }
            return this;
        }
        Escena reloj() {
            long r = o.proximoReloj();
            if (r >= 0 && t >= r && o.alReloj(t)) giros.add(o.aplicada());
            return this;
        }
        Escena pantalla(int rotacion) {
            if (o.alPantalla(rotacion, t)) giros.add(o.aplicada());
            return this;
        }
    }

    @Test public void losGradosDelSensorDanElLadoConHisteresis() {
        assertEquals(0, OrientacionDeVentana.ladoDe(0, OrientacionDeVentana.SIN_DATO));
        assertEquals(0, OrientacionDeVentana.ladoDe(355, OrientacionDeVentana.SIN_DATO));
        // El lado izquierdo arriba es ROTATION_270; el derecho arriba, ROTATION_90.
        assertEquals(3, OrientacionDeVentana.ladoDe(90, OrientacionDeVentana.SIN_DATO));
        assertEquals(1, OrientacionDeVentana.ladoDe(270, OrientacionDeVentana.SIN_DATO));
        assertEquals(2, OrientacionDeVentana.ladoDe(180, OrientacionDeVentana.SIN_DATO));
        assertEquals(OrientacionDeVentana.SIN_DATO, OrientacionDeVentana.ladoDe(-1, 3));
        // Cerca del límite de 45° se conserva el lado que había; a 30° del centro del otro, cambia.
        assertEquals(0, OrientacionDeVentana.ladoDe(55, 0));
        assertEquals(3, OrientacionDeVentana.ladoDe(35, 3));
        assertEquals(3, OrientacionDeVentana.ladoDe(60, 0));
        assertEquals(OrientacionDeVentana.SIN_DATO, OrientacionDeVentana.ladoDe(45, OrientacionDeVentana.SIN_DATO));
    }

    // INICIO O UNA CÁMARA CON SU INTERFAZ DE PIE: la pantalla se queda en 0 y la banda gira sola, hacia los dos lados.
    @Test public void sobreUnaPantallaFijaDePieGiraHaciaLosDosLados() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        assertEquals(0, e.o.aplicada());
        // Lado izquierdo arriba: compensación 3 -270° a la derecha, 90° a la izquierda-.
        e.sostener(90, 1200);
        assertEquals(List.of(3), e.giros);
        // De vuelta de pie.
        e.sostener(0, 1200);
        // Lado derecho arriba: compensación 1.
        e.sostener(270, 1200);
        assertEquals(List.of(3, 0, 1), e.giros);
    }

    @Test public void elCambioDelSensorEsperaLaGraciaAntesDeGirar() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(90, OrientacionDeVentana.ESTABLE_MS + 60);
        // Ya es estable, pero se espera por si Android gira la pantalla.
        assertEquals(3, e.o.estable());
        assertEquals(0, e.o.aplicada());
        assertTrue(e.o.proximoReloj() > e.t);
        e.sostener(90, OrientacionDeVentana.GRACIA_MS + 120);
        assertEquals(List.of(3), e.giros);
    }

    @Test public void deHorizontalIzquierdoAHorizontalDerechoDirectoEsUnSoloGiro() {
        Escena e = new Escena(0, true);
        e.sostener(90, 1500);
        assertEquals(List.of(3), e.giros);
        // De 90 a 270 sin pasar por de pie: la banda va de 3 a 1 sin quedarse en 0 entre medio.
        e.sostener(270, 1500);
        assertEquals(List.of(3, 1), e.giros);
    }

    // CHROME: la pantalla también gira. Si el sensor avisa antes, la gracia espera a Android y la banda no gira.
    @Test public void sobreChromeConElSensorAntesQueLaPantallaNoHayGiroPropio() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(90, 500);
        assertEquals(3, e.o.estable());
        // Android gira la pantalla 500 ms después de la primera lectura del lado nuevo.
        e.pantalla(3);
        e.sostener(90, 2000);
        assertEquals(List.of(), e.giros);
        assertEquals(0, e.o.aplicada());
        // Y de vuelta, igual.
        e.sostener(0, 400);
        e.pantalla(0);
        e.sostener(0, 2000);
        assertEquals(List.of(), e.giros);
    }

    @Test public void sobreChromeConLaPantallaAntesQueElSensorTampoco() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        // El teléfono va girando: 50° está entre los dos lados. Android ya giró.
        e.sostener(50, 120);
        e.pantalla(3);
        assertEquals(0, e.o.aplicada());
        e.sostener(85, 2000);
        assertEquals(List.of(), e.giros);
    }

    @Test public void sobreChromeDeUnLadoAlOtroLaBandaSigueALaPantalla() {
        Escena e = new Escena(1, true);
        e.sostener(270, 600);
        assertEquals(1, e.o.estable());
        e.sostener(90, 400);
        e.pantalla(3);
        e.sostener(90, 2000);
        assertEquals(List.of(), e.giros);
    }

    // De Chrome de lado a Inicio, con el teléfono quieto de lado: Android vuelve la pantalla a 0 y la banda se queda
    // como la ve la persona, en el acto.
    @Test public void siLaPantallaGiraSinMoverElTelefonoSeConservaLoQueVeLaPersona() {
        Escena e = new Escena(3, true);
        e.sostener(90, 600);
        e.pantalla(0);
        assertEquals(List.of(3), e.giros);
        e.sostener(90, 2000);
        assertEquals(List.of(3), e.giros);
    }

    @Test public void casiPlanoConservaElUltimoLadoEstable() {
        Escena e = new Escena(0, true);
        e.sostener(90, 1500);
        assertEquals(List.of(3), e.giros);
        e.sostener(-1, 5000);
        assertEquals(List.of(3), e.giros);
        // Plano, aunque la pantalla gire -una app que se pone de lado-, se conserva lo que ve la persona.
        e.pantalla(3);
        assertEquals(0, e.o.aplicada());
        e.pantalla(0);
        assertEquals(3, e.o.aplicada());
    }

    @Test public void cercaDelLimiteConservaElUltimoLadoEstable() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(50, 5000);
        e.sostener(40, 5000);
        e.sostener(310, 5000);
        assertEquals(List.of(), e.giros);
        assertEquals(0, e.o.estable());
        assertEquals(-1, e.o.proximoReloj());
    }

    @Test public void unVaivenMasCortoQueLoEstableNoGira() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(90, OrientacionDeVentana.ESTABLE_MS - 60);
        e.sostener(0, 2000);
        assertEquals(List.of(), e.giros);
    }

    @Test public void siVuelveAntesDeLaGraciaNoGira() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(90, OrientacionDeVentana.ESTABLE_MS + 120);
        assertTrue(e.o.proximoReloj() >= 0);
        e.sostener(0, 2000);
        assertEquals(List.of(), e.giros);
    }

    @Test public void cabezaAbajoNoSeAdoptaPorElSensor() {
        Escena e = new Escena(0, true);
        e.sostener(90, 1500);
        e.sostener(180, 3000);
        assertEquals(List.of(3), e.giros);
    }

    @Test public void conLaRotacionAutomaticaDesactivadaNoHayGiroNiSensor() {
        Escena e = new Escena(0, false);
        assertEquals(0, e.sensor.encendidos);
        e.sostener(90, 3000);
        e.pantalla(1);
        e.sostener(270, 3000);
        assertEquals(List.of(), e.giros);
        assertEquals(0, e.o.aplicada());
        assertFalse(e.sensor.encendido());
    }

    @Test public void desactivarLaRotacionAutomaticaVuelveACeroYApagaElSensor() {
        Escena e = new Escena(0, true);
        assertTrue(e.sensor.encendido());
        e.sostener(90, 1500);
        assertEquals(3, e.o.aplicada());
        assertTrue(e.o.alAuto(false, e.t));
        assertEquals(0, e.o.aplicada());
        assertFalse(e.sensor.encendido());
        // Al volver a activarla, la primera lectura estable vale sin esperar la gracia.
        assertFalse(e.o.alAuto(true, e.t));
        assertTrue(e.sensor.encendido());
        e.sostener(90, OrientacionDeVentana.ESTABLE_MS + 120);
        assertEquals(3, e.o.aplicada());
    }

    @Test public void sinSensorDeOrientacionSigueALaPantalla() {
        SensorDePrueba s = new SensorDePrueba();
        s.puede = false;
        OrientacionDeVentana o = new OrientacionDeVentana(s);
        o.empezar(0, true);
        assertFalse(o.auto());
        assertFalse(o.alSensor(90, 5000));
        assertFalse(o.alSensor(90, 9000));
        assertEquals(0, o.aplicada());
    }

    @Test public void alSoltarSeApagaElSensorUnaVezYNadaLoEnciende() {
        Escena e = new Escena(0, true);
        e.sostener(0, 600);
        e.sostener(90, OrientacionDeVentana.ESTABLE_MS + 120);
        assertTrue(e.o.proximoReloj() >= 0);
        e.o.soltar();
        assertEquals(1, e.sensor.apagados);
        assertFalse(e.sensor.encendido());
        assertEquals(-1, e.o.proximoReloj());
        // Nada de lo que llegue después lo enciende ni gira la banda.
        e.o.soltar();
        assertFalse(e.o.alAuto(true, e.t));
        assertFalse(e.o.alAuto(false, e.t));
        e.sostener(90, 3000);
        e.pantalla(1);
        assertEquals(1, e.sensor.encendidos);
        assertEquals(1, e.sensor.apagados);
        assertEquals(List.of(), e.giros);
    }
}

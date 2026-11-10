// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t165u: la confirmación del giro con una sola lectura del sensor. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// EL FALLO QUE REPRODUJO JAVIER -orden t165u-. Fondo fijo de pie -Inicio o una Cámara con su interfaz de pie-, ya
// establecido de pie, llega UNA lectura a 90° y el teléfono queda quieto: OrientationEventListener no vuelve a avisar.
// Aquí corre el mismo camino que la ventana -RelojDelGiro con OrientacionDeVentana- sobre un Handler de prueba: la
// hora solo avanza con avanzar(), el vencimiento se dispara cuando llega su hora, y el encuadre hace lo que hace
// VentanaDePrueba.alCambiarPantalla con la rotación de la pantalla de ese momento. Después de la lectura única NO se
// entrega otra muestra: solo avanza el reloj.
public class RelojDelGiroTest {
    static final class Telefono implements RelojDelGiro.Plataforma {
        final OrientacionDeVentanaTest.SensorDePrueba sensor = new OrientacionDeVentanaTest.SensorDePrueba();
        final OrientacionDeVentana o = new OrientacionDeVentana(sensor);
        final RelojDelGiro reloj = new RelojDelGiro(o, this);
        // Lo que la ventana va mostrando: cada compensación nueva que llega a encuadrar.
        final List<Integer> giros = new ArrayList<>();
        // Cada demora que se programó, en orden.
        final List<Long> demoras = new ArrayList<>();
        long t = 10_000;
        long vence = -1;
        int pantalla;

        Telefono(int pantalla, boolean auto) {
            this.pantalla = pantalla;
            o.empezar(pantalla, auto);
        }

        @Override public long ahora() { return t; }
        @Override public void quitarReloj() { vence = -1; }
        @Override public void programarReloj(long demoraMs) { demoras.add(demoraMs); vence = t + demoraMs; }
        @Override public void anotarGiro() {}
        @Override public void encuadrarGiro() { encuadrar(); }

        // VentanaDePrueba.alCambiarPantalla: la rotación de la pantalla de ahora, el reloj otra vez y la banda.
        void encuadrar() {
            o.alPantalla(pantalla, t);
            reloj.reprogramar();
            if (giros.isEmpty() || giros.get(giros.size() - 1) != o.aplicada()) giros.add(o.aplicada());
        }

        Telefono lectura(int grados) { reloj.alSensor(grados); return this; }

        // Lecturas cada 60 ms durante ms, con el reloj corriendo entre medio.
        Telefono sostener(int grados, long ms) {
            long fin = t + ms;
            while (t < fin) { lectura(grados); avanzar(60); }
            return this;
        }

        // Solo pasa el tiempo; el Handler dispara el vencimiento cuando llega su hora.
        Telefono avanzar(long ms) {
            long fin = t + ms;
            while (vence >= 0 && vence <= fin) {
                t = Math.max(t, vence);
                vence = -1;
                reloj.alVencer();
            }
            t = fin;
            return this;
        }

        // Hasta la hora absoluta fin, solo con el reloj.
        Telefono hasta(long fin) { return avanzar(fin - t); }

        // Android gira la pantalla: llega el DisplayListener y la ventana encuadra.
        Telefono girarPantalla(int rotacion) { pantalla = rotacion; encuadrar(); return this; }

        // Parte de pie y establecido: lecturas a 0° hasta que la decisión lo da por estable.
        static Telefono dePie() {
            Telefono f = new Telefono(0, true);
            f.sostener(0, 600);
            assertEquals(0, f.o.estable());
            assertEquals(0, f.o.aplicada());
            f.giros.clear();
            f.demoras.clear();
            return f;
        }
    }

    // LO QUE FALLABA: una lectura a 90° y nada más. La banda queda derecha -compensación 3- sin otra muestra.
    @Test public void unaSolaLecturaHaciaLaIzquierdaYSoloElRelojDejaLaBandaDerecha() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        // La ventana pone el primer vencimiento a los ESTABLE_MS, desde esa única lectura.
        assertEquals(List.of(OrientacionDeVentana.ESTABLE_MS), f.demoras);
        f.avanzar(3000);
        assertEquals(3, f.o.estable());
        assertEquals(3, f.o.aplicada());
        assertEquals(List.of(3), f.giros);
        // Confirmada a los 300 ms y aplicada tras la gracia de 700 ms para que Chrome gire solo.
        assertEquals(List.of(OrientacionDeVentana.ESTABLE_MS, OrientacionDeVentana.GRACIA_MS), f.demoras);
        assertEquals(-1, f.o.proximoReloj());
    }

    @Test public void unaSolaLecturaHaciaLaDerechaYSoloElRelojDejaLaBandaDerecha() {
        Telefono f = Telefono.dePie();
        f.lectura(270);
        assertEquals(List.of(OrientacionDeVentana.ESTABLE_MS), f.demoras);
        f.avanzar(3000);
        assertEquals(1, f.o.estable());
        assertEquals(1, f.o.aplicada());
        assertEquals(List.of(1), f.giros);
    }

    // La gracia se conserva: antes de los 300 + 700 ms la banda todavía no gira.
    @Test public void elGiroEsperaLaConfirmacionYLaGracia() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(OrientacionDeVentana.ESTABLE_MS - 1);
        assertEquals(0, f.o.estable());
        f.avanzar(1);
        assertEquals(3, f.o.estable());
        assertEquals(0, f.o.aplicada());
        f.avanzar(OrientacionDeVentana.GRACIA_MS - 1);
        assertEquals(0, f.o.aplicada());
        f.avanzar(1);
        assertEquals(3, f.o.aplicada());
    }

    // CHROME: Android gira la pantalla durante la gracia, con la misma lectura única. La banda acompaña a la pantalla
    // y termina sin compensación propia.
    @Test public void siAndroidGiraDuranteLaGraciaNoHayCompensacionAdicional() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(500);
        assertEquals(3, f.o.estable());
        f.girarPantalla(3);
        f.avanzar(3000);
        assertEquals(0, f.o.aplicada());
        assertEquals(List.of(0), f.giros);
        assertEquals(-1, f.o.proximoReloj());
        // Más tarde que la lectura vigente -Android lento-, igual sin compensación.
        Telefono g = Telefono.dePie();
        g.lectura(270);
        g.avanzar(900);
        g.girarPantalla(1);
        g.avanzar(3000);
        assertEquals(0, g.o.aplicada());
        assertEquals(List.of(0), g.giros);
    }

    // Android gira antes de que la candidata se confirme: tampoco hay giro propio, ni uno tardío.
    @Test public void siAndroidGiraAntesDeLaConfirmacionTampoco() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        f.girarPantalla(3);
        f.avanzar(3000);
        assertEquals(0, f.o.aplicada());
        assertEquals(List.of(0), f.giros);
        assertEquals(-1, f.o.proximoReloj());
    }

    // INVALIDACIONES: nada de lo de antes aplica un giro tardío.
    @Test public void unaLecturaDeVueltaDePieAnulaLaConfirmacion() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        f.lectura(0);
        f.avanzar(3000);
        assertEquals(0, f.o.estable());
        assertEquals(List.of(), f.giros);
        assertEquals(-1, f.o.proximoReloj());
    }

    @Test public void unaLecturaDelOtroLadoReemplazaLaConfirmacion() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        f.lectura(270);
        // El vencimiento es el de la lectura nueva, no el de la vieja.
        assertEquals(OrientacionDeVentana.ESTABLE_MS, (long) f.demoras.get(f.demoras.size() - 1));
        f.avanzar(3000);
        assertEquals(List.of(1), f.giros);
    }

    @Test public void quedarPlanoAnulaLaConfirmacion() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        f.lectura(-1);
        assertEquals(-1, f.o.proximoReloj());
        f.avanzar(3000);
        assertEquals(0, f.o.estable());
        assertEquals(List.of(), f.giros);
    }

    @Test public void desactivarLaRotacionAutomaticaAnulaLaConfirmacion() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        f.reloj.alAuto(false);
        assertEquals(-1, f.vence);
        assertFalse(f.sensor.encendido());
        f.avanzar(3000);
        assertEquals(0, f.o.aplicada());
        assertEquals(List.of(), f.giros);
    }

    @Test public void cerrarLaVentanaAnulaLaConfirmacionAunqueElRelojLlegueTarde() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(150);
        long tarde = f.vence;
        assertTrue(tarde >= 0);
        // VentanaDePrueba.soltarGiro: quita el reloj y suelta la decisión.
        f.quitarReloj();
        f.o.soltar();
        assertEquals(-1, f.o.proximoReloj());
        // Un vencimiento que se escapó y llega igual no gira nada.
        f.t = tarde + 1000;
        f.reloj.alVencer();
        assertEquals(0, f.o.aplicada());
        assertEquals(List.of(), f.giros);
        assertEquals(-1, f.vence);
    }

    // Durante la gracia, una lectura de vuelta de pie anula el giro que se iba a aplicar.
    @Test public void unaLecturaDeVueltaDurantelaGraciaAnulaElGiroTardio() {
        Telefono f = Telefono.dePie();
        f.lectura(90);
        f.avanzar(OrientacionDeVentana.ESTABLE_MS + 500);
        assertEquals(3, f.o.estable());
        f.lectura(0);
        f.avanzar(3000);
        assertEquals(List.of(), f.giros);
        assertEquals(0, f.o.estable());
        assertEquals(0, f.o.aplicada());
    }

    // LOS 700 MS ENTRE CONFIRMAR Y DIBUJAR -10-11-2026, orden t166u-. La base común de Javier, con la hora exacta:
    // fondo de pie, t=0 0°, t=300 vence el reloj, t=1000 el lado, t=1300 vence y se confirma; se dibujaría a t=2000.
    static Telefono baseConfirmadoSinDibujar(int grados, int esperado) {
        Telefono f = new Telefono(0, true);
        f.t = 0;
        f.lectura(0);
        f.hasta(300);
        assertEquals(0, f.o.estable());
        f.hasta(1000);
        f.lectura(grados);
        f.hasta(1300);
        assertEquals(esperado, f.o.estable());
        assertEquals(0, f.o.aplicada());
        assertEquals(2000, f.o.proximoReloj());
        assertEquals(2000, f.vence);
        return f;
    }

    // A: plano a t=1400 y solo el reloj hasta t=4000. Se conserva lo visible -0-, sin giro ni reloj pendiente.
    static Telefono planoDuranteLaGracia(int grados, int esperado) {
        Telefono f = baseConfirmadoSinDibujar(grados, esperado);
        f.hasta(1400);
        f.lectura(-1);
        assertEquals(-1, f.o.proximoReloj());
        f.hasta(4000);
        assertEquals("compensación al final, plano", 0, f.o.aplicada());
        assertEquals(List.of(), f.giros);
        assertEquals(-1, f.o.proximoReloj());
        assertEquals(-1, f.vence);
        return f;
    }

    @Test public void planoDuranteLaGraciaConservaLoVisibleHaciaLaIzquierda() { planoDuranteLaGracia(90, 3); }
    @Test public void planoDuranteLaGraciaConservaLoVisibleHaciaLaDerecha() { planoDuranteLaGracia(270, 1); }

    // Después de plano, UN aviso horizontal a t=4000 y el teléfono quieto: vuelve a girar solo con el reloj.
    static void despuesDePlanoUnAvisoVuelveAGirar(int grados, int esperado) {
        Telefono f = planoDuranteLaGracia(grados, esperado);
        f.lectura(grados);
        assertEquals(4000 + OrientacionDeVentana.ESTABLE_MS, f.vence);
        f.hasta(7000);
        assertEquals(esperado, f.o.aplicada());
        assertEquals(List.of(esperado), f.giros);
        assertEquals(-1, f.o.proximoReloj());
    }

    @Test public void despuesDePlanoUnAvisoVuelveAGirarHaciaLaIzquierda() { despuesDePlanoUnAvisoVuelveAGirar(90, 3); }
    @Test public void despuesDePlanoUnAvisoVuelveAGirarHaciaLaDerecha() { despuesDePlanoUnAvisoVuelveAGirar(270, 1); }

    // B: 0° a t=1400 y el lado otra vez a t=1500, y solo el reloj hasta t=4000. Termina girado, sin otra muestra.
    static void vaivenYRegresoAlMismoLado(int grados, int esperado) {
        Telefono f = baseConfirmadoSinDibujar(grados, esperado);
        f.hasta(1400);
        f.lectura(0);
        // Se anula la gracia y se conserva lo visible: de pie.
        assertEquals(0, f.o.estable());
        assertEquals(0, f.o.aplicada());
        f.hasta(1500);
        f.lectura(grados);
        // El lado confirmado sin dibujar vuelve a tener su reloj.
        assertEquals(1500 + OrientacionDeVentana.ESTABLE_MS, f.o.proximoReloj());
        assertEquals(1500 + OrientacionDeVentana.ESTABLE_MS, f.vence);
        f.hasta(4000);
        assertEquals("compensación al final del vaivén", esperado, f.o.aplicada());
        assertEquals(List.of(esperado), f.giros);
        assertEquals(-1, f.o.proximoReloj());
    }

    @Test public void vaivenYRegresoAlMismoLadoHaciaLaIzquierda() { vaivenYRegresoAlMismoLado(90, 3); }
    @Test public void vaivenYRegresoAlMismoLadoHaciaLaDerecha() { vaivenYRegresoAlMismoLado(270, 1); }

    // Con la gracia viva, otra lectura del mismo lado confirmado no la mueve: gira a t=2000 como estaba previsto.
    @Test public void laMismaLecturaDuranteLaGraciaNoLaMueve() {
        Telefono f = baseConfirmadoSinDibujar(90, 3);
        f.hasta(1500);
        f.lectura(90);
        assertEquals(2000, f.o.proximoReloj());
        f.hasta(1999);
        assertEquals(0, f.o.aplicada());
        f.hasta(2000);
        assertEquals(3, f.o.aplicada());
    }

    // Lo visible cuenta con la rotación de la pantalla: una app que se fuerza de lado -pantalla en 1- con el teléfono
    // en 270° se ve derecha con compensación 0, es decir el lado 1. De pie y plano durante la gracia, se conserva el
    // lado 1; un aviso de pie después vuelve a girar la banda a 3.
    @Test public void loVisibleCuentaConLaRotacionDeLaPantalla() {
        Telefono f = new Telefono(1, true);
        f.lectura(270);
        f.avanzar(OrientacionDeVentana.ESTABLE_MS);
        assertEquals(1, f.o.estable());
        assertEquals(0, f.o.aplicada());
        f.lectura(0);
        f.avanzar(OrientacionDeVentana.ESTABLE_MS);
        assertEquals(0, f.o.estable());
        assertTrue(f.o.proximoReloj() >= 0);
        f.lectura(-1);
        assertEquals(1, f.o.estable());
        f.avanzar(3000);
        assertEquals(List.of(), f.giros);
        f.lectura(0);
        f.avanzar(3000);
        assertEquals(List.of(3), f.giros);
    }

    // Al abrir la ventana, la primera orientación también vale con una sola lectura.
    @Test public void laPrimeraLecturaAlAbrirTambienSeConfirmaSola() {
        Telefono f = new Telefono(0, true);
        f.lectura(90);
        assertEquals(List.of(OrientacionDeVentana.ESTABLE_MS), f.demoras);
        f.avanzar(OrientacionDeVentana.ESTABLE_MS);
        assertEquals(3, f.o.aplicada());
        assertEquals(List.of(3), f.giros);
    }
}

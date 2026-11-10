// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;
import org.junit.Test;
import static org.junit.Assert.*;

/** Mismos casos y números de las cuentas de src/pruebas/nivelVoz.test.ts. */
public class NivelDeVozTest {
    private double rmsDeDb(double db) { return Math.pow(10, db / 20); }
    @Test public void rmsCero() { assertEquals(0, NivelDeVoz.rmsANivel(0), 0); }
    @Test public void pisoMenos60YMenos80() {
        assertEquals(0, NivelDeVoz.rmsANivel(rmsDeDb(-60)), 1e-9);
        assertEquals(0, NivelDeVoz.rmsANivel(rmsDeDb(-80)), 0);
    }
    @Test public void techoMenos20YMenos5() {
        assertEquals(1, NivelDeVoz.rmsANivel(rmsDeDb(-20)), 1e-9);
        assertEquals(1, NivelDeVoz.rmsANivel(rmsDeDb(-5)), 0);
    }
    @Test public void intermediosParejosEnDb() {
        assertEquals(0.25, NivelDeVoz.rmsANivel(rmsDeDb(-50)), 1e-9);
        assertEquals(0.5, NivelDeVoz.rmsANivel(rmsDeDb(-40)), 1e-9);
        assertEquals(0.75, NivelDeVoz.rmsANivel(rmsDeDb(-30)), 1e-9);
    }
    @Test public void subidaMasRapidaQueBajadaEn50Ms() {
        double subida=NivelDeVoz.suavizarNivel(0,1,50);
        double bajada=1-NivelDeVoz.suavizarNivel(1,0,50);
        assertTrue(subida > 0); assertTrue(bajada > 0); assertTrue(subida > bajada*2);
    }
    @Test public void sinEventosMasDeMedioSegundo() {
        double rms=rmsDeDb(-30);
        assertEquals(0.75, NivelDeVoz.objetivoNivel(rms, 1000L, 1000+NivelDeVoz.SIN_EVENTOS_MS-1), 1e-9);
        assertEquals(0, NivelDeVoz.objetivoNivel(rms, 1000L, 1000+NivelDeVoz.SIN_EVENTOS_MS+1), 0);
        assertEquals(0, NivelDeVoz.objetivoNivel(rms, null, 0), 0);
        double nivel=1;
        for (int t=0; t<5000; t+=16) nivel=NivelDeVoz.suavizarNivel(nivel, NivelDeVoz.objetivoNivel(rms, 0L, 600+t), 16);
        assertTrue(nivel < 0.001);
    }
    @Test public void sinTiempoNoSeSuaviza() {
        assertEquals(0.3, NivelDeVoz.suavizarNivel(0.3, 1, 0), 0);
    }
}

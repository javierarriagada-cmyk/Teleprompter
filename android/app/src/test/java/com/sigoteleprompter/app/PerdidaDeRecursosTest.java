package com.sigoteleprompter.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

// LS-M2 -tarea 83, parte B-: cuándo se da por perdida la cámara o el micrófono. Ver PerdidaDeRecursos.
public class PerdidaDeRecursosTest {
    @Test
    public void laCamaraSePierdeSiLaVistaPreviaDejaDeTransmitirAlFrente() {
        assertTrue(PerdidaDeRecursos.camaraPerdida(true, true, false, true));
    }

    @Test
    public void enSegundoPlanoNoEsPerdidaDeCamara() {
        // Ahí corta appStateChange; la vista previa en IDLE es lo esperable.
        assertFalse(PerdidaDeRecursos.camaraPerdida(true, true, false, false));
    }

    @Test
    public void sinVigilarOSinHaberTransmitidoNoHayPerdida() {
        assertFalse(PerdidaDeRecursos.camaraPerdida(false, true, false, true));
        assertFalse(PerdidaDeRecursos.camaraPerdida(true, false, false, true));
        assertFalse(PerdidaDeRecursos.camaraPerdida(true, true, true, true));
    }

    @Test
    public void elMicrofonoSePierdeSiUnaGrabacionPropiaQuedaSilenciada() {
        assertTrue(PerdidaDeRecursos.microfonoPerdido(true, Arrays.asList(false, true)));
        assertFalse(PerdidaDeRecursos.microfonoPerdido(true, Arrays.asList(false, false)));
        assertFalse(PerdidaDeRecursos.microfonoPerdido(true, Collections.<Boolean>emptyList()));
        assertFalse(PerdidaDeRecursos.microfonoPerdido(false, Arrays.asList(true)));
        assertFalse(PerdidaDeRecursos.microfonoPerdido(true, null));
    }
}

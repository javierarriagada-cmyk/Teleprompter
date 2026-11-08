// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;
import static org.junit.Assert.*;

public class EstadoDelMicrofonoTest {
    @Test public void pausaSinSesionOSinEntregasHaceMasDeUnSegundo() {
        assertEquals("En pausa", EstadoDelMicrofono.de(2001, 1000, 22, null));
        assertEquals("En pausa", EstadoDelMicrofono.de(1000, 1000, -1, null));
        assertEquals("En pausa", EstadoDelMicrofono.de(1000, -1, 22, null));
    }
    @Test public void disponibleInclusoConMilMilisegundosExactos() {
        assertEquals("Disponible", EstadoDelMicrofono.de(2000, 1000, 22,
            Collections.singletonList(new EstadoDelMicrofono.Grabacion(22, false))));
    }
    @Test public void silenciadoSigueEntregandoCerosYNoEsPausa() {
        assertEquals("Silenciado por Android", EstadoDelMicrofono.de(1000, 990, 22,
            Collections.singletonList(new EstadoDelMicrofono.Grabacion(22, true))));
    }
    @Test public void consultaFallidaOGrabacionAusente() {
        assertEquals("Sin datos", EstadoDelMicrofono.de(1000, 990, 22, null));
        assertEquals("Sin datos", EstadoDelMicrofono.de(1000, 990, 22, Collections.emptyList()));
        assertEquals("Sin datos", EstadoDelMicrofono.de(1000, 990, 22,
            Collections.singletonList(new EstadoDelMicrofono.Grabacion(33, true))));
    }
    @Test public void micDelCorpusSilenciadoNoSilenciaVosk() {
        assertEquals("Disponible", EstadoDelMicrofono.de(1000, 990, 22, Arrays.asList(
            new EstadoDelMicrofono.Grabacion(11, true), // MIC del corpus.
            new EstadoDelMicrofono.Grabacion(22, false), // VOICE_RECOGNITION de Vosk.
            new EstadoDelMicrofono.Grabacion(33, true)))); // Otra app.
    }
    @Test public void trasRelevoSeUsaLaNuevaSesionDeVosk() {
        assertEquals("Disponible", EstadoDelMicrofono.de(1000, 990, 44, Arrays.asList(
            new EstadoDelMicrofono.Grabacion(22, true), new EstadoDelMicrofono.Grabacion(44, false))));
    }
}

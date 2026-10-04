package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.pm.ActivityInfo;
import android.view.Surface;

import org.junit.Test;

// TAREA 91 -04-10-2026-: el mapeo de la rotación de la pantalla a la orientación que se fija con
// Activity.setRequestedOrientation mientras dura la toma. Es Java puro -OrientacionDeToma-: las
// constantes de ActivityInfo y Surface se copian al compilar, así que corre en la JVM sin teléfono.
public class OrientacionDeTomaTest {

    // Un teléfono -el moto g86-: su posición natural es de pie.
    @Test
    public void telefono_de_pie_las_cuatro_rotaciones() {
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, OrientacionDeToma.paraRotacion(Surface.ROTATION_0, true));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE, OrientacionDeToma.paraRotacion(Surface.ROTATION_90, true));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT, OrientacionDeToma.paraRotacion(Surface.ROTATION_180, true));
        // La 270: de lado con la barra de tres botones a la izquierda.
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE, OrientacionDeToma.paraRotacion(Surface.ROTATION_270, true));
    }

    // Una tableta cuya posición natural es de lado: las rotaciones se corren un cuarto.
    @Test
    public void tableta_de_lado_las_cuatro_rotaciones() {
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE, OrientacionDeToma.paraRotacion(Surface.ROTATION_0, false));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT, OrientacionDeToma.paraRotacion(Surface.ROTATION_90, false));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE, OrientacionDeToma.paraRotacion(Surface.ROTATION_180, false));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, OrientacionDeToma.paraRotacion(Surface.ROTATION_270, false));
    }

    // La posición natural sale de la rotación y de cómo se ve ahora la pantalla.
    @Test
    public void la_posicion_natural() {
        assertTrue(OrientacionDeToma.naturalEsVertical(Surface.ROTATION_0, true));
        assertTrue(OrientacionDeToma.naturalEsVertical(Surface.ROTATION_270, false));
        assertFalse(OrientacionDeToma.naturalEsVertical(Surface.ROTATION_0, false));
        assertFalse(OrientacionDeToma.naturalEsVertical(Surface.ROTATION_90, true));
    }

    @Test
    public void una_rotacion_desconocida_no_fija_nada() {
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED, OrientacionDeToma.paraRotacion(7, true));
    }
}

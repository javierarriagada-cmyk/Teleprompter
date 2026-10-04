package com.sigoteleprompter.app;

import android.content.pm.ActivityInfo;
import android.view.Surface;

// TAREA 91 -04-10-2026-: LA ORIENTACIÓN QUEDA FIJA MIENTRAS DURA LA TOMA, COMO EN LA CÁMARA DEL
// TELÉFONO. De Empezar a Parar, en Leer y en Grabar, la pantalla se queda en la orientación que tenía al
// empezar; en LISTO y en el visor gira libre. CamaraNativaPlugin.fijarOrientacion la fija con
// Activity.setRequestedOrientation y soltarOrientacion devuelve la que había -la del manifiesto: en
// AndroidManifest.xml la actividad no declara screenOrientation, o sea UNSPECIFIED-.
//
// Esto es solo el mapeo, en Java puro para probarlo en la JVM -OrientacionDeTomaTest-. Display.getRotation
// dice cuánto está girada la imagen respecto de la posición NATURAL del aparato; en un teléfono la natural
// es de pie, en muchas tabletas es de lado, y ahí cada rotación cae en otra orientación.
final class OrientacionDeToma {
    private OrientacionDeToma() {}

    // La rotación de Display.getRotation -Surface.ROTATION_0/90/180/270- a la orientación que se fija.
    // Una rotación que no es ninguna de las cuatro no fija nada: UNSPECIFIED.
    static int paraRotacion(int rotacion, boolean naturalEsVertical) {
        if (naturalEsVertical) {
            switch (rotacion) {
                case Surface.ROTATION_0: return ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
                case Surface.ROTATION_90: return ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
                case Surface.ROTATION_180: return ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT;
                // La 270 del moto g86: de lado con la barra de tres botones a la izquierda.
                case Surface.ROTATION_270: return ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE;
                default: return ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
            }
        }
        switch (rotacion) {
            case Surface.ROTATION_0: return ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE;
            case Surface.ROTATION_90: return ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT;
            case Surface.ROTATION_180: return ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE;
            case Surface.ROTATION_270: return ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
            default: return ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
        }
    }

    // La posición natural del aparato, con la rotación y con cómo se ve ahora -Configuration.orientation-:
    // sin girar y de pie, o girado un cuarto y de lado, es un aparato de pie.
    static boolean naturalEsVertical(int rotacion, boolean ahoraVertical) {
        boolean cuarto = rotacion == Surface.ROTATION_90 || rotacion == Surface.ROTATION_270;
        return cuarto ? !ahoraVertical : ahoraVertical;
    }

    static int grados(int rotacion) {
        switch (rotacion) {
            case Surface.ROTATION_90: return 90;
            case Surface.ROTATION_180: return 180;
            case Surface.ROTATION_270: return 270;
            default: return 0;
        }
    }

    // El nombre para el registro -logcat, etiqueta SigoOrientacion-.
    static String nombre(int orientacion) {
        switch (orientacion) {
            case ActivityInfo.SCREEN_ORIENTATION_PORTRAIT: return "PORTRAIT";
            case ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE: return "LANDSCAPE";
            case ActivityInfo.SCREEN_ORIENTATION_REVERSE_PORTRAIT: return "REVERSE_PORTRAIT";
            case ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE: return "REVERSE_LANDSCAPE";
            case ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED: return "UNSPECIFIED";
            default: return "otra(" + orientacion + ")";
        }
    }
}

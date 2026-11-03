package com.sigoteleprompter.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// BORDE A BORDE EN ANDROID 10 A 14 -03-11-2026-: la regla de cuándo llamar a
// WindowCompat.enableEdgeToEdge. Es Java puro -BordeABordeAntesDe15-: corre en la JVM sin teléfono.
public class BordeABordeAntesDe15Test {

    // SDK 34 y WebView 140: sí, es el caso que Play pidió -borde a borde también bajo el 15-.
    @Test
    public void sdk34_con_webview_140_si() {
        assertTrue(BordeABordeAntesDe15.corresponde(34, "140.0.7339.51"));
    }

    // SDK 34 y WebView 139: no; Capacitor aún no pasa los bordes con viewport-fit=cover.
    @Test
    public void sdk34_con_webview_139_no() {
        assertFalse(BordeABordeAntesDe15.corresponde(34, "139.0.7258.94"));
    }

    // SDK 35: no; Android 15 ya fuerza borde a borde con targetSdk 35.
    @Test
    public void sdk35_no() {
        assertFalse(BordeABordeAntesDe15.corresponde(35, "140.0.7339.51"));
    }

    // SDK 36: no; Android 16 igual.
    @Test
    public void sdk36_no() {
        assertFalse(BordeABordeAntesDe15.corresponde(36, "140.0.7339.51"));
    }

    // Versión ilegible: no; todo queda como hoy.
    @Test
    public void version_ilegible_no() {
        assertFalse(BordeABordeAntesDe15.corresponde(34, null));
        assertFalse(BordeABordeAntesDe15.corresponde(34, ""));
        assertFalse(BordeABordeAntesDe15.corresponde(34, "abc"));
    }
}

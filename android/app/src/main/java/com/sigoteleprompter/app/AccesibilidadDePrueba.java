// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.content.res.Configuration;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;

public class AccesibilidadDePrueba extends AccessibilityService {
    static volatile AccesibilidadDePrueba vigente;
    private WindowManager ventanas;

    WindowManager ventanas() { return ventanas; }

    @Override protected void onServiceConnected() {
        ventanas = (WindowManager) getSystemService(WINDOW_SERVICE);
        vigente = this;
        VentanaDePrueba.anotar(VentanaDePrueba.numero(), "accesibilidad conectada instancia=" + System.identityHashCode(this));
        boolean solo = VentanaDePrueba.intentarTraerSigo(this);
        VentanaDePrueba.marcarVolvioSolo(solo);
        VentanaDePrueba.anotar(VentanaDePrueba.numero(), "volver solo=" + solo);
    }
    @Override public void onAccessibilityEvent(AccessibilityEvent evento) {}
    @Override public void onInterrupt() {}

    private void desconectar(String motivo) {
        VentanaDePrueba.anotar(VentanaDePrueba.numeroDeAccesibilidad(this), "accesibilidad desconectada instancia=" + System.identityHashCode(this) + " " + motivo);
        if (vigente == this) vigente = null;
        VentanaDePrueba.cerrarDeAccesibilidad(this, motivo);
    }
    @Override public boolean onUnbind(Intent intent) {
        desconectar("onUnbind");
        return super.onUnbind(intent);
    }
    @Override public void onTaskRemoved(Intent raiz) {
        VentanaDePrueba.anotar(VentanaDePrueba.numeroDeAccesibilidad(this), "onTaskRemoved accesibilidad");
        VentanaDePrueba.cerrarDeAccesibilidad(this, "onTaskRemoved accesibilidad");
        super.onTaskRemoved(raiz);
    }
    @Override public void onDestroy() {
        desconectar("onDestroy accesibilidad");
        super.onDestroy();
    }
    @Override public void onConfigurationChanged(Configuration nueva) {
        super.onConfigurationChanged(nueva);
        VentanaDePrueba.reencuadrar(this);
    }
}

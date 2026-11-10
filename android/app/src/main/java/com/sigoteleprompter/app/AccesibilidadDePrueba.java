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
        // Antes -957fc97-: se traía Sigo siempre, también al encender el teléfono. Ahora solo si la persona
        // viene de «Ir a activarlo» -VentanaDePrueba.tomarEsperandoActivacion-.
        if (VentanaDePrueba.tomarEsperandoActivacion()) {
            boolean solo = VentanaDePrueba.intentarTraerSigo(this);
            VentanaDePrueba.marcarVolvioSolo(solo);
            VentanaDePrueba.anotar(VentanaDePrueba.numero(), "volver solo=" + solo);
        } else {
            VentanaDePrueba.anotar(VentanaDePrueba.numero(), "conectada sin venir de la hoja: Sigo no se trae");
        }
    }
    @Override public void onAccessibilityEvent(AccessibilityEvent evento) {}
    @Override public void onInterrupt() {}

    private void desconectar(String motivo) {
        VentanaDePrueba.anotar(VentanaDePrueba.numeroDeAccesibilidad(this), "accesibilidad desconectada instancia=" + System.identityHashCode(this) + " " + motivo);
        if (vigente == this) vigente = null;
        // -10-11-2026, orden t164u- El sensor del giro se suelta ya; el cierre de la ventana va por el hilo principal.
        VentanaDePrueba.soltarGiroDeAccesibilidad(this, motivo);
        VentanaDePrueba.cerrarDeAccesibilidad(this, motivo);
    }
    @Override public boolean onUnbind(Intent intent) {
        desconectar("onUnbind");
        return super.onUnbind(intent);
    }
    @Override public void onTaskRemoved(Intent raiz) {
        VentanaDePrueba.anotar(VentanaDePrueba.numeroDeAccesibilidad(this), "onTaskRemoved accesibilidad");
        VentanaDePrueba.soltarGiroDeAccesibilidad(this, "onTaskRemoved accesibilidad");
        VentanaDePrueba.cerrarDeAccesibilidad(this, "onTaskRemoved accesibilidad");
        super.onTaskRemoved(raiz);
    }
    @Override public void onDestroy() {
        desconectar("onDestroy accesibilidad");
        super.onDestroy();
    }
    // -10-11-2026, orden t164u- onInterrupt es el aviso de que se interrumpa la respuesta hablada o táctil, no una
    // desconexión: la ventana sigue abierta y el sensor también. La desconexión es onUnbind u onDestroy -desconectar-.
    // onConfigurationChanged llega con de pie ↔ de lado; de un lado al otro no llega -las medidas no cambian- y eso lo
    // oye el DisplayListener de VentanaDePrueba.empezarGiro.
    @Override public void onConfigurationChanged(Configuration nueva) {
        super.onConfigurationChanged(nueva);
        VentanaDePrueba.reencuadrar(this);
    }
}

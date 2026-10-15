package com.sigoteleprompter.app;

import android.content.Context;

import java.io.IOException;

/**
 * EL BANCO LARGO, EN LA VERSIÓN DE PLAY: NO HAY -motor-largo, 15-10-2026-.
 *
 * El de verdad está en src/debug/java y va solo en la APK de prueba. Esta existe para que
 * VoskNativoPlugin compile igual en release -el mismo mecanismo que PaqueteDeVoz- y no lleva nada
 * del banco: no lee archivos, no mide, no escribe. disponible() es false y el plugin rechaza el
 * pedido antes de llegar aquí.
 */
final class BancoLargo {

    private BancoLargo() {}

    static boolean disponible() {
        return false;
    }

    static BancoLargo abrir(Context ctx, int minutos, String[] nombres) throws IOException {
        throw new IOException("El banco largo va solo en la APK de prueba");
    }

    String resumen() {
        return "";
    }

    int leer(short[] destino) {
        return 0;
    }

    boolean terminado() {
        return true;
    }

    void cerrar() {}

    static String temperatura() {
        return "sin temperatura";
    }

    static String tomarPedido(Context ctx) {
        return null;
    }

    static void anotarLinea(Context ctx, String nombre, String linea) {}
}

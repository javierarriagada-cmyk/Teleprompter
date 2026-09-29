package com.sigoteleprompter.app;

import android.app.Activity;
import android.content.Context;

/**
 * EL PAQUETE DE UN MODELO DE VOZ, EN LA APK DE PRUEBA -tarea 84, D4, 29-09-2026-.
 *
 * La APK de prueba -npm run apk, debug- trae los dos modelos dentro, en assets, como siempre:
 * VoskNativoPlugin los encuentra ahí y nunca llega a preguntar por un paquete. Esta versión existe
 * para que el plugin compile igual en debug sin la biblioteca de Play -que va solo en release,
 * app/build.gradle-, y responde lo único cierto: aquí no hay paquetes que bajar.
 *
 * La de verdad, la que pide el modelo inglés a Play, está en src/release/java.
 */
final class PaqueteDeVoz {

    interface Aviso {
        void progreso(double fraccion);
        void listo(String rutaModelo);
        void fallo(String codigo, String mensaje);
    }

    private PaqueteDeVoz() {}

    /** En la APK de prueba ningún modelo viene en paquete: siempre null. */
    static String rutaSiEsta(Context contexto, String paquete) {
        return null;
    }

    static void bajar(Activity actividad, Context contexto, String paquete, Aviso aviso) {
        // No es un fallo mudo: si alguna vez se llega aquí es porque falta el modelo en assets,
        // y el mensaje dice qué hacer.
        aviso.fallo("SIN_MODELO", "La APK de prueba no trae " + paquete + " en assets. Corre: npm run modelo");
    }
}

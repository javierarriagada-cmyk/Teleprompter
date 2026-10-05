package com.sigoteleprompter.app;

import android.content.Context;
import android.content.pm.ApplicationInfo;

import java.util.Locale;

/**
 * LAS LÍNEAS SigoExport DEL LADO NATIVO -tarea 87, paso 0, 03-10-2026-.
 *
 * Antes de programar "Para redes" hay que medir en el moto g86 cuánto tarda hoy guardar con
 * subtítulos y dónde queda de verdad el subtítulo quemado. Javier usa la APK de prueba y Claude
 * lee el logcat: por eso cada medición es UNA línea con un formato fijo -docs/tarea87.txt, P0-5-:
 *
 *   v=1 evento=<evento> t_ms=<epoch en ms> clave=valor clave=valor ...
 *
 * con la etiqueta "SigoExport". Son las MISMAS reglas que src/lib/medicionesExport.ts -el lado
 * web-: valores sin espacios -se escapan-, la unidad en el nombre de la clave, NA si no se pudo
 * leer. Si se cambia una regla acá, se cambia allá.
 *
 * Solo se escribe si la app es depurable -la APK de prueba, assembleDebug-. La de Play es
 * release y no escribe nada. El proyecto no usa BuildConfig: se mira la bandera de la app.
 */
final class MedicionExport {

    static final String ETIQUETA = "SigoExport";
    static final int VERSION = 1;

    private MedicionExport() {}

    static boolean activa(Context ctx) {
        if (ctx == null) return false;
        try {
            return (ctx.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        } catch (Exception e) {
            return false;
        }
    }

    // El porcentaje primero, para que se pueda deshacer; después el espacio, el igual y los saltos.
    static String escapar(Object v) {
        if (v == null) return "NA";
        if (v instanceof Double && (((Double) v).isNaN() || ((Double) v).isInfinite())) return "NA";
        if (v instanceof Float && (((Float) v).isNaN() || ((Float) v).isInfinite())) return "NA";
        if (v instanceof Boolean) return ((Boolean) v) ? "1" : "0";
        String t = String.valueOf(v);
        if (t.isEmpty()) return "NA";
        return t.replace("%", "%25")
            .replace(" ", "%20")
            .replace("=", "%3D")
            .replace("\t", "%09")
            .replace("\r", "%0D")
            .replace("\n", "%0A");
    }

    // Un decimal con punto y dos cifras, sin importar el idioma del teléfono.
    static String decimal(double d) {
        if (Double.isNaN(d) || Double.isInfinite(d)) return "NA";
        return String.format(Locale.ROOT, "%.2f", d);
    }

    // pares: clave, valor, clave, valor... en el orden fijo del evento.
    static String linea(String evento, Object... pares) {
        StringBuilder sb = new StringBuilder();
        sb.append("v=").append(VERSION)
            .append(" evento=").append(escapar(evento))
            .append(" t_ms=").append(System.currentTimeMillis());
        for (int i = 0; i + 1 < pares.length; i += 2) {
            sb.append(' ').append(pares[i]).append('=').append(escapar(pares[i + 1]));
        }
        return sb.toString();
    }

    // El id de la toma sale del nombre del archivo: <id>.mp4 -tomaVideo.ts-.
    static String idDeArchivo(java.io.File f) {
        if (f == null) return null;
        String n = f.getName();
        int i = n.indexOf('.');
        return i > 0 ? n.substring(0, i) : n;
    }

    static long msDesde(long nanoInicio) {
        return Math.round((System.nanoTime() - nanoInicio) / 1_000_000.0);
    }

    // Quien recibe cada línea: el plugin la escribe al logcat y la manda al panel.
    interface Anotador {
        void anotar(String linea);
    }
}

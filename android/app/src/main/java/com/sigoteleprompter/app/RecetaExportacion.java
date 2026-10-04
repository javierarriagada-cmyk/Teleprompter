package com.sigoteleprompter.app;

import org.json.JSONArray;
import org.json.JSONObject;

// LA RECETA COMÚN DE EXPORTACIÓN -tarea 87, parte B, 04-10-2026-. La arma la app
// -src/lib/recetaExportacion.ts- y llega como JSON a exportarToma. Las reglas de validación son
// las MISMAS de validarReceta en TypeScript: si se cambia una, se cambia la otra.
//
// La lectura va en dos partes para que JUnit la pruebe sin dependencias nuevas: en las pruebas
// locales de Android, org.json es un esqueleto que lanza "Method ... not mocked". desdeJson es
// delgada -solo saca los valores del JSONObject- y desdeValores, en Java puro, valida y decide.
final class RecetaExportacion {
    // El margen de hoy -"Normal"-. Con este valor CapaDeSubtitulos dibuja EXACTAMENTE lo de antes.
    static final float MARGEN_ABAJO_NORMAL = 0.125f;

    final String estilo;
    // La lista de subtítulos como JSON, tal como la lee CapaDeSubtitulos. "[]" si no lleva.
    final String subtitulosJson;
    final int cantidadSubtitulos;
    final float margenAbajo;
    // Plan 2: null = la toma entera. Aquí siempre null.
    final long[][] tramosMs;
    // Plan 3: aquí siempre null. Su forma la define el plan 3.
    final Object filtro = null;

    private RecetaExportacion(String estilo, String subtitulosJson, int cantidad, float margenAbajo, long[][] tramosMs) {
        this.estilo = estilo;
        this.subtitulosJson = subtitulosJson;
        this.cantidadSubtitulos = cantidad;
        this.margenAbajo = margenAbajo;
        this.tramosMs = tramosMs;
    }

    static RecetaExportacion desdeJson(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        int version = o.optInt("version", 0);
        String estilo = o.optString("estilo", "");
        JSONArray subs = o.optJSONArray("subtitulos");
        double margen = o.has("margenAbajo") && !o.isNull("margenAbajo") ? o.getDouble("margenAbajo") : Double.NaN;
        long[][] tramos = null;
        if (o.has("tramos") && !o.isNull("tramos")) {
            JSONArray ts = o.getJSONArray("tramos");
            tramos = new long[ts.length()][];
            for (int i = 0; i < ts.length(); i++) {
                JSONObject t = ts.getJSONObject(i);
                tramos[i] = new long[] { t.getLong("desdeMs"), t.getLong("hastaMs") };
            }
        }
        boolean hayFiltro = o.has("filtro") && !o.isNull("filtro");
        return desdeValores(version, estilo, subs == null ? null : subs.toString(), subs == null ? -1 : subs.length(), margen, tramos, hayFiltro);
    }

    // Java puro: lo que valida y decide. Lanza IllegalArgumentException con el motivo, como
    // validarReceta en TypeScript.
    static RecetaExportacion desdeValores(int version, String estilo, String subtitulosJson, int cantidad,
                                          double margen, long[][] tramos, boolean hayFiltro) {
        if (version != 1) throw new IllegalArgumentException("versión desconocida");
        if (!"no".equals(estilo) && !"amarillo".equals(estilo) && !"rojo".equals(estilo) && !"formal".equals(estilo)) {
            throw new IllegalArgumentException("estilo desconocido");
        }
        if (subtitulosJson == null || cantidad < 0) throw new IllegalArgumentException("subtítulos no es una lista");
        if (Double.isNaN(margen) || Double.isInfinite(margen) || margen < 0 || margen > 0.5) {
            throw new IllegalArgumentException("margen fuera de 0 a 0,5");
        }
        if (tramos != null) {
            long fin = -1;
            for (long[] t : tramos) {
                if (t == null || t.length != 2) throw new IllegalArgumentException("tramo sin cifras");
                if (t[0] < 0 || t[1] <= t[0]) throw new IllegalArgumentException("tramo al revés");
                if (t[0] < fin) throw new IllegalArgumentException("tramos desordenados");
                fin = t[1];
            }
        }
        if (hayFiltro) throw new IllegalArgumentException("filtro no va en esta tarea");
        return new RecetaExportacion(estilo, subtitulosJson, cantidad, (float) margen, tramos);
    }

    // Nada que dibujar, cortar ni filtrar: se copia la toma tal cual, sin recodificar.
    boolean esCopia() {
        boolean sinSubtitulos = "no".equals(estilo) || cantidadSubtitulos == 0;
        return sinSubtitulos && tramosMs == null && filtro == null;
    }

    // El margen como texto para la línea SigoExport -guardado_inicio margen=-, con tres cifras como
    // el "0.125" del paso 0: con dos -MedicionExport.decimal- saldría "0.13".
    String margenTexto() {
        return String.format(java.util.Locale.ROOT, "%.3f", margenAbajo);
    }
}

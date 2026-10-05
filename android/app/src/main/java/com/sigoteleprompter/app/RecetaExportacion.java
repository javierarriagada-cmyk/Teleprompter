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
//
// -04-10-2026, Javier simplifica la 87- La receta ya no trae margenAbajo -0,125 en "Normal", 0,35 en
// "Para redes"-: el subtítulo va siempre a 1/6, UbicacionSubtitulos.MARGEN_ABAJO. Si un JSON viejo
// lo trae, se ignora.
final class RecetaExportacion {
    final String estilo;
    // La lista de subtítulos como JSON, tal como la lee CapaDeSubtitulos. "[]" si no lleva.
    final String subtitulosJson;
    final int cantidadSubtitulos;
    // Plan 2: null = la toma entera. Aquí siempre null.
    final long[][] tramosMs;
    // -tarea 96, 05-10-2026- EL FILTRO -plan 3, fase 1-: null = Natural, sin filtro. Si viene, el tono
    // -solo para el registro Sigo96: el nativo no conoce los nombres- y los 16 números de RgbMatrix, por
    // columnas, que arma la app -lib/filtros.ts, matrizParaMedia3-. Los aplica MatrizDeColor.
    // Antes: "Plan 3: aquí siempre null. Su forma la define el plan 3." y final Object filtro = null.
    final String filtroTono;
    final float[] filtroMatriz;

    private RecetaExportacion(String estilo, String subtitulosJson, int cantidad, long[][] tramosMs,
                              String filtroTono, float[] filtroMatriz) {
        this.estilo = estilo;
        this.subtitulosJson = subtitulosJson;
        this.cantidadSubtitulos = cantidad;
        this.tramosMs = tramosMs;
        this.filtroTono = filtroTono;
        this.filtroMatriz = filtroMatriz;
    }

    boolean hayFiltro() {
        return filtroMatriz != null;
    }

    static RecetaExportacion desdeJson(String json) throws Exception {
        JSONObject o = new JSONObject(json);
        int version = o.optInt("version", 0);
        String estilo = o.optString("estilo", "");
        JSONArray subs = o.optJSONArray("subtitulos");
        long[][] tramos = null;
        if (o.has("tramos") && !o.isNull("tramos")) {
            JSONArray ts = o.getJSONArray("tramos");
            tramos = new long[ts.length()][];
            for (int i = 0; i < ts.length(); i++) {
                JSONObject t = ts.getJSONObject(i);
                tramos[i] = new long[] { t.getLong("desdeMs"), t.getLong("hastaMs") };
            }
        }
        // -tarea 96- El filtro: el tono y la matriz tal como vienen. Lo que falte o no sea número llega
        // como null o NaN y lo rechaza desdeValores, con el mismo motivo que validarReceta.
        // Antes: boolean hayFiltro = o.has("filtro") && !o.isNull("filtro"), y se rechazaba entero.
        boolean hayFiltro = o.has("filtro") && !o.isNull("filtro");
        String filtroTono = null;
        float[] filtroMatriz = null;
        if (hayFiltro) {
            JSONObject f = o.optJSONObject("filtro");
            if (f == null) throw new IllegalArgumentException("filtro no es un objeto");
            filtroTono = f.isNull("tono") ? null : f.optString("tono", null);
            JSONArray m = f.optJSONArray("matriz");
            if (m != null) {
                filtroMatriz = new float[m.length()];
                for (int i = 0; i < m.length(); i++) filtroMatriz[i] = (float) m.optDouble(i, Double.NaN);
            }
            // Un filtro sin matriz no es "sin filtro": se rechaza.
            if (filtroMatriz == null) filtroMatriz = new float[0];
        }
        return desdeValores(version, estilo, subs == null ? null : subs.toString(), subs == null ? -1 : subs.length(), tramos, filtroTono, filtroMatriz);
    }

    // Java puro: lo que valida y decide. Lanza IllegalArgumentException con el motivo, como
    // validarReceta en TypeScript.
    // -tarea 96- Los dos últimos son el filtro: filtroMatriz null = sin filtro -Natural-. Antes el último
    // era boolean hayFiltro, y con true se rechazaba siempre.
    static RecetaExportacion desdeValores(int version, String estilo, String subtitulosJson, int cantidad,
                                          long[][] tramos, String filtroTono, float[] filtroMatriz) {
        if (version != 1) throw new IllegalArgumentException("versión desconocida");
        if (!"no".equals(estilo) && !"amarillo".equals(estilo) && !"rojo".equals(estilo) && !"formal".equals(estilo)) {
            throw new IllegalArgumentException("estilo desconocido");
        }
        if (subtitulosJson == null || cantidad < 0) throw new IllegalArgumentException("subtítulos no es una lista");
        if (tramos != null) {
            long fin = -1;
            for (long[] t : tramos) {
                if (t == null || t.length != 2) throw new IllegalArgumentException("tramo sin cifras");
                if (t[0] < 0 || t[1] <= t[0]) throw new IllegalArgumentException("tramo al revés");
                if (t[0] < fin) throw new IllegalArgumentException("tramos desordenados");
                fin = t[1];
            }
        }
        // -tarea 96, 05-10-2026- Las reglas de validarReceta: un tono que es texto no vacío y 16 números
        // finitos. No se exige que el tono sea uno de los seis: así un tono nuevo no pide APK.
        // Antes: if (hayFiltro) throw new IllegalArgumentException("filtro no va en esta tarea").
        if (filtroMatriz != null) {
            if (filtroTono == null || filtroTono.isEmpty()) throw new IllegalArgumentException("filtro sin tono");
            if (filtroMatriz.length != 16) throw new IllegalArgumentException("matriz de filtro sin 16 números");
            for (float n : filtroMatriz) {
                if (Float.isNaN(n) || Float.isInfinite(n)) throw new IllegalArgumentException("matriz de filtro sin cifras");
            }
        }
        return new RecetaExportacion(estilo, subtitulosJson, cantidad, tramos, filtroMatriz == null ? null : filtroTono, filtroMatriz);
    }

    // Nada que dibujar, cortar ni filtrar: se copia la toma tal cual, sin recodificar.
    // -tarea 96- Con filtro, NUNCA es copia. Antes: ... && filtro == null, con filtro siempre null.
    boolean esCopia() {
        boolean sinSubtitulos = "no".equals(estilo) || cantidadSubtitulos == 0;
        return sinSubtitulos && tramosMs == null && filtroMatriz == null;
    }
}

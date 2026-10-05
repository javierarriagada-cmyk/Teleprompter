package com.sigoteleprompter.app;

import com.google.common.collect.ImmutableList;

// LOS EFECTOS DE VIDEO DE UNA RECETA -tarea 87, parte B, 04-10-2026-. ORDEN FIJO:
// [filtros -plan 3, vacío aquí-] -> [OverlayEffect(CapaDeSubtitulos)]. Sin recorte: no hay fase B.
// -tarea 96, 05-10-2026- El filtro ya va: [MatrizDeColor] -> [OverlayEffect(CapaDeSubtitulos)].
// Lo usa CamaraNativaPlugin.exportarToma.
@androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
final class ExportadorDeTomas {
    private ExportadorDeTomas() {}

    // La capa de la receta. null si la receta es copia: no hay nada que dibujar. El subtítulo va a
    // 1/6 del alto -UbicacionSubtitulos.MARGEN_ABAJO-; antes la receta traía su margen.
    static CapaDeSubtitulos capaDe(RecetaExportacion receta, int rotacion) throws Exception {
        if (receta.esCopia() || "no".equals(receta.estilo) || receta.cantidadSubtitulos == 0) return null;
        return new CapaDeSubtitulos(receta.subtitulosJson, receta.estilo, rotacion);
    }

    // LA TOMA CON PAUSAS -tarea 88, 04-10-2026, docs/tarea88.txt, 5.4-. Un MediaItem por tramo que
    // queda, con ClippingConfiguration, en UNA EditedMediaItemSequence; los efectos van a nivel de la
    // Composition. Mismo codificador y mismo avance: lo arma exportarToma igual que el EditedMediaItem
    // de siempre. Sin tramos no se usa: el camino de hoy no cambia.
    //
    // EN QUÉ RELOJ LE LLEGA presentationTimeUs A LA CAPA -leído en Media3 1.9.0, etiqueta 1.9.0 de
    // androidx/media-:
    //   - ExoAssetLoaderVideoRenderer.java:179: cada cuadro sale del decodificador con
    //     presentationTimeUs - streamStartPositionUs, o sea contado desde el comienzo de SU tramo.
    //   - VideoSampleExporter.java:681-688: al cambiar de EditedMediaItem registra el flujo nuevo con
    //     offsetToAddUs = initialTimestampOffsetUs + mediaItemOffsetUs, la suma de lo que duraron los
    //     tramos anteriores -:690-.
    //   - ExternalTextureManager.java:416-418: ese offset se suma al cuadro ANTES de los efectos
    //     -VideoFrameProcessor.java:310-312: "It is added to the frame timestamps before processing"-.
    //   - SingleInputVideoGraph.java:248-252: con una sola secuencia, los efectos de la Composition se
    //     ponen detrás de los del EditedMediaItem en el MISMO procesador, con el mismo offset.
    // Así, con el efecto en la Composition o en cada EditedMediaItem, la capa ve el reloj de la SALIDA.
    // Se elige la Composition: una sola capa con los subtítulos de la receta, que ya vienen en el reloj
    // de la salida -subtitulosConCortes-. Claude lo comprueba con la línea Sigo88 "capa tramo=".
    @androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
    static androidx.media3.transformer.Composition composicionConTramos(java.io.File origen, RecetaExportacion receta, CapaDeSubtitulos capa) {
        java.util.List<androidx.media3.transformer.EditedMediaItem> items = new java.util.ArrayList<>();
        for (long[] t : receta.tramosMs) {
            androidx.media3.common.MediaItem mi = new androidx.media3.common.MediaItem.Builder()
                .setUri(android.net.Uri.fromFile(origen))
                .setClippingConfiguration(new androidx.media3.common.MediaItem.ClippingConfiguration.Builder()
                    .setStartPositionMs(t[0])
                    .setEndPositionMs(t[1])
                    .build())
                .build();
            items.add(new androidx.media3.transformer.EditedMediaItem.Builder(mi).build());
        }
        androidx.media3.transformer.EditedMediaItemSequence secuencia =
            new androidx.media3.transformer.EditedMediaItemSequence.Builder(items).build();
        return new androidx.media3.transformer.Composition.Builder(secuencia)
            .setEffects(new androidx.media3.transformer.Effects(ImmutableList.of(), efectosDeVideo(receta, capa)))
            .build();
    }

    // Dónde empieza cada tramo en el reloj de la SALIDA, en microsegundos: para la línea Sigo88 de la
    // capa. Java puro, para JUnit.
    static long[] iniciosEnSalidaUs(long[][] tramosMs) {
        long[] inicios = new long[tramosMs.length];
        long acumulado = 0;
        for (int i = 0; i < tramosMs.length; i++) {
            inicios[i] = acumulado * 1000;
            acumulado += tramosMs[i][1] - tramosMs[i][0];
        }
        return inicios;
    }

    // Los tramos como texto, para el logcat: "0-4200,7800-30000".
    static String tramosTexto(long[][] tramosMs) {
        StringBuilder b = new StringBuilder();
        for (long[] t : tramosMs) {
            if (b.length() > 0) b.append(',');
            b.append(t[0]).append('-').append(t[1]);
        }
        return b.toString();
    }

    static ImmutableList<androidx.media3.common.Effect> efectosDeVideo(RecetaExportacion receta, CapaDeSubtitulos capa) {
        ImmutableList.Builder<androidx.media3.common.Effect> efectos = ImmutableList.builder();
        // 1. Filtros -plan 3-: vacío en esta tarea -receta.filtro es siempre null-.
        // -tarea 96, 05-10-2026- Ya no está vacío: el filtro de la receta, ANTES de la capa, para que los
        // subtítulos no se tiñan -en B/N siguen amarillos-. Sin filtro, nada: el camino de hoy.
        if (receta.hayFiltro()) efectos.add(new MatrizDeColor(receta.filtroMatriz));
        // 2. Subtítulos, encima de todo.
        if (capa != null) efectos.add(new androidx.media3.effect.OverlayEffect(ImmutableList.of(capa)));
        return efectos.build();
    }
}

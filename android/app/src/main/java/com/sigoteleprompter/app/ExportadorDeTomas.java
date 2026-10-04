package com.sigoteleprompter.app;

import com.google.common.collect.ImmutableList;

// LOS EFECTOS DE VIDEO DE UNA RECETA -tarea 87, parte B, 04-10-2026-. ORDEN FIJO:
// [filtros -plan 3, vacío aquí-] -> [OverlayEffect(CapaDeSubtitulos)]. Sin recorte: no hay fase B.
// Lo usa CamaraNativaPlugin.exportarToma.
@androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
final class ExportadorDeTomas {
    private ExportadorDeTomas() {}

    // La capa de la receta, con su margen. null si la receta es copia: no hay nada que dibujar.
    static CapaDeSubtitulos capaDe(RecetaExportacion receta, int rotacion) throws Exception {
        if (receta.esCopia() || "no".equals(receta.estilo) || receta.cantidadSubtitulos == 0) return null;
        return new CapaDeSubtitulos(receta.subtitulosJson, receta.estilo, rotacion, receta.margenAbajo);
    }

    static ImmutableList<androidx.media3.common.Effect> efectosDeVideo(RecetaExportacion receta, CapaDeSubtitulos capa) {
        ImmutableList.Builder<androidx.media3.common.Effect> efectos = ImmutableList.builder();
        // 1. Filtros -plan 3-: vacío en esta tarea -receta.filtro es siempre null-.
        // 2. Subtítulos, encima de todo.
        if (capa != null) efectos.add(new androidx.media3.effect.OverlayEffect(ImmutableList.of(capa)));
        return efectos.build();
    }
}

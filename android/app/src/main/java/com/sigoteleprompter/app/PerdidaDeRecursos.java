package com.sigoteleprompter.app;

import java.util.List;

// LA CÁMARA O EL MICRÓFONO SE PIERDEN EN PLENA TOMA -tarea 83, parte B, LS-M2 de la guía de pantallas
// grandes, 04-10-2026-. En ventana múltiple -tableta, pantalla dividida- Sigo sigue al frente aunque otra
// app tome la cámara o el micrófono: no pasa por segundo plano y el corte de appStateChange -App.tsx- no
// llega. CamaraNativaPlugin.vigilarRecursos mira dos señales del sistema y, si alguna dice que el recurso
// se perdió, avisa a la web -evento recursoPerdido-, que corta la toma como al pasar a segundo plano.
//
// Esto es solo la decisión, en Java puro para probarla en la JVM -PerdidaDeRecursosTest-:
//   CÁMARA: PreviewView.getPreviewStreamState -camera-view, ya en build.gradle- pasa de STREAMING a IDLE
//     con la toma vigilada y la actividad al frente. CameraX cierra la cámara cuando otra app con más
//     prioridad la abre, y la vista previa deja de transmitir. Al ir a segundo plano también pasa a IDLE,
//     pero ahí la actividad ya no está al frente y el corte lo hace appStateChange.
//   MICRÓFONO: AudioManager.AudioRecordingCallback con AudioRecordingConfiguration.isClientSilenced
//     -API 29, el minSdk de Sigo-: el sistema silencia la grabación de esta app cuando otra le gana el
//     micrófono -la política de captura concurrente de Android 10-. Solo llegan las grabaciones propias.
final class PerdidaDeRecursos {
    private PerdidaDeRecursos() {}

    // La cámara se perdió: se vigilaba, la vista previa transmitía, dejó de transmitir y la actividad
    // sigue al frente.
    static boolean camaraPerdida(boolean vigilando, boolean transmitia, boolean transmiteAhora, boolean alFrente) {
        return vigilando && transmitia && !transmiteAhora && alFrente;
    }

    // El micrófono se perdió: se vigilaba y alguna grabación propia quedó silenciada por el sistema.
    static boolean microfonoPerdido(boolean vigilando, List<Boolean> silenciadas) {
        if (!vigilando || silenciadas == null) return false;
        for (Boolean s : silenciadas) if (Boolean.TRUE.equals(s)) return true;
        return false;
    }
}

package com.sigoteleprompter.app;

// DÓNDE VA EL BLOQUE DE SUBTÍTULOS EN EL ARCHIVO GUARDADO -tarea 87, 04-10-2026, decidido por Javier-.
// UNA sola posición para todo: el borde de abajo del bloque -la caja del último renglón, hasta su
// descent- queda a 1/6 del alto de la imagen vista derecha, contado desde abajo, igual en vertical
// y en horizontal. Es la MISMA cifra del visor -MARGEN_ABAJO_SUBTITULOS en src/lib/subtitulos.ts,
// que usa CapaSubtitulos en SubtitulosVisor.tsx-: si se cambia una, se cambia la otra.
// Antes: un octavo -H * (1 - 0.125f)-, escrito a mano en CapaDeSubtitulos.java.
//
// En Java puro, para que JUnit lo pruebe: CapaDeSubtitulos usa android.graphics y no se puede
// cargar en las pruebas locales.
//
// -04-10-2026, Javier simplifica la 87- Esta clase nació para "Para redes" -extraAbajo, el píxel
// pintado más bajo en H*(1-margen), y la guardia del 14 % de arriba-; eso se sacó con la posición
// y quedó solo la posición única.
final class UbicacionSubtitulos {
    // 1/6 del alto de la imagen, desde abajo.
    static final float MARGEN_ABAJO = 1f / 6f;

    private UbicacionSubtitulos() {}

    // La base de CapaDeSubtitulos para un bloque de n renglones de alto "alto" en una imagen de alto
    // H: y del renglón i es base + i*alto - descent, así que la caja del último renglón termina en
    // base + (n-1)*alto = H * (1 - MARGEN_ABAJO).
    static float base(float H, float alto, int renglones) {
        return H * (1 - MARGEN_ABAJO) - (renglones - 1) * alto;
    }

    // Lo que queda entre la caja del último renglón y el borde de abajo: H / 6. Es lo que la línea
    // evento=capa anota como caja_abajo_px.
    static float cajaAbajo(float H, float alto, int renglones) {
        return H - (base(H, alto, renglones) + (renglones - 1) * alto);
    }

    // El margen como texto para la línea SigoExport -guardado_inicio margen=-, con tres cifras como
    // el "0.125" del paso 0: "0.167".
    static String margenTexto() {
        return String.format(java.util.Locale.ROOT, "%.3f", MARGEN_ABAJO);
    }
}

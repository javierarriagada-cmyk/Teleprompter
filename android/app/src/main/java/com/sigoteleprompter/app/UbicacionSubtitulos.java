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

    // -tarea 87, subtítulos en horizontal, 04-10-2026, pedido de Javier- EL LARGO DEL RENGLÓN según la
    // forma del cuadro visto derecho: 32 letras en vertical -como siempre- y 47 en horizontal. Es la
    // MISMA constante de LETRAS_POR_RENGLON en src/lib/subtitulos.ts: los renglones los arma la app
    // -partirEnRenglones- y llegan hechos en el JSON; aquí la cifra queda para la línea evento=capa y
    // para las pruebas. Cuadrado cuenta como vertical.
    static final int LETRAS_VERTICAL = 32;
    static final int LETRAS_HORIZONTAL = 47;

    static int letrasPorRenglon(float W, float H) {
        return W > H ? LETRAS_HORIZONTAL : LETRAS_VERTICAL;
    }

    // LA LETRA, contra el LADO CORTO del cuadro: 1/32 de 1920 en una imagen de 1080 de lado corto -60 px
    // en 1080, 40 en 720-, en las dos orientaciones. En la vertical de 9:16 da lo mismo que antes, al
    // píxel: 1080 / 18 = 1920 / 32 = 60. La misma cuenta que letraSubtitulo en src/lib/subtitulos.ts.
    // Antes: H / 32f en CapaDeSubtitulos, que en horizontal daba 33,75 en 1080.
    static final float LADO_CORTO_EN_LETRAS = 18f;

    static float letra(float W, float H) {
        return Math.min(W, H) / LADO_CORTO_EN_LETRAS;
    }

    // El ancho que puede ocupar un renglón: el 88 % del cuadro -6 % de margen a cada lado, como el
    // visor-.
    static final float ANCHO_UTIL = 0.88f;

    // EL AJUSTE QUE YA TENÍA CapaDeSubtitulos, sacado aquí para probarlo: si el renglón más ancho
    // -medido con Paint.measureText a la letra "letra"- pasa del ancho útil, se achica la letra de todo
    // el subtítulo en la misma proporción, en vez de salirse. Si cabe, la letra no cambia.
    static float letraQueCabe(float letra, float masAncho, float W) {
        float util = W * ANCHO_UTIL;
        return masAncho > util ? letra * util / masAncho : letra;
    }

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

// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: la geometría de la banda A -la que eligió Javier-. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// LA BANDA A, EN dp Y SIN ANDROID -09-11-2026-. Pura para probarla en la JVM: VentanaDePrueba le pasa el área
// segura -sin barras ni recorte de la cámara frontal- y pone en píxeles lo que devuelve.
//
// La referencia son los bocetos sobre las fotos de la Cámara del g86 en Video, con el área segura de
// VentanaDePrueba.areaSegura: de pie, 390 × 867 con seguro (0, 32, 390, 825) da 358 × 224 en (16, 104); de
// lado, 867 × 390 con seguro (44, 0, 826, 390) da 412 × 220 en (100, 8). Los márgenes son los que dejan libre
// la fila de iconos de la Cámara -de pie, y 50 a 95; de lado, la columna de x 46 a 90-, medidos en las fotos.
// En otro teléfono se conservan los márgenes y el alto, y el ancho se adapta al espacio útil.
//
// Antes -VentanaDePrueba.aplicarTamanoInicial hasta el 08-11-2026, una sola para las dos orientaciones-:
//     ancho = Math.min(dp(480), Math.max(dp(240), seguro.width() - dp(32)));
//     alto = Math.max(dp(180), seguro.height() / 3);
//     posicion.x = seguro.left + Math.max(0, (seguro.width() - ancho) / 2);
//     posicion.y = seguro.top + dp(8);
// De pie daba 358 × 264 en y 40, encima de la fila de iconos de la Cámara, y de lado 480 × 180: dos renglones
// a 24 con los controles a la vista -NOTA.md de los bocetos, punto 3-.
final class GeometriaVentana {
    private GeometriaVentana() {}

    // El mínimo vigente -acotar() desde 6ec9ddb-: con él, a 24 caben un renglón con controles y dos sin ellos.
    static final int MIN_ANCHO = 240;
    static final int MIN_ALTO = 180;

    static final int DE_PIE_MARGEN_LADOS = 16;
    static final int DE_PIE_BAJO_EL_BORDE = 72;
    static final int DE_PIE_ALTO = 224;
    static final int DE_LADO_DESDE_LA_IZQUIERDA = 56;
    static final int DE_LADO_ARRIBA = 8;
    static final int DE_LADO_ANCHO = 412;
    static final int DE_LADO_ALTO = 220;
    static final int DE_LADO_MARGEN_DERECHO = 8;

    // De lado es cuando el ancho útil supera al alto útil: lo mismo que Android llama ORIENTATION_LANDSCAPE.
    static boolean esDeLado(int l, int t, int r, int b) {
        return (r - l) > (b - t);
    }

    // {x, y, ancho, alto} en dp, dentro del área segura (l, t, r, b).
    static int[] inicial(int l, int t, int r, int b) {
        int[] g;
        if (esDeLado(l, t, r, b)) {
            int x = l + DE_LADO_DESDE_LA_IZQUIERDA;
            int ancho = Math.min(DE_LADO_ANCHO, r - x - DE_LADO_MARGEN_DERECHO);
            g = new int[] { x, t + DE_LADO_ARRIBA, ancho, DE_LADO_ALTO };
        } else {
            g = new int[] { l + DE_PIE_MARGEN_LADOS, t + DE_PIE_BAJO_EL_BORDE, (r - l) - 2 * DE_PIE_MARGEN_LADOS, DE_PIE_ALTO };
        }
        return acotar(g, l, t, r, b);
    }

    // El mismo acotado que hacía VentanaDePrueba.acotar en píxeles: el mínimo manda aunque no quepa, y
    // después la ventana entra entera en el área segura. Antes -hasta el 08-11-2026, en VentanaDePrueba-:
    //     posicion.width = Math.max(dp(240), Math.min(posicion.width, Math.max(dp(240), seguro.width())));
    //     posicion.height = Math.max(dp(180), Math.min(posicion.height, Math.max(dp(180), seguro.height())));
    //     posicion.x = Math.max(seguro.left, Math.min(posicion.x, seguro.right - posicion.width));
    //     posicion.y = Math.max(seguro.top, Math.min(posicion.y, seguro.bottom - posicion.height));
    static int[] acotar(int[] g, int l, int t, int r, int b) {
        return acotar(g, l, t, r, b, MIN_ANCHO, MIN_ALTO);
    }

    // Con el mínimo en la unidad que se use: VentanaDePrueba acota en píxeles con dp(240) y dp(180).
    static int[] acotar(int[] g, int l, int t, int r, int b, int minAncho, int minAlto) {
        int ancho = Math.max(minAncho, Math.min(g[2], Math.max(minAncho, r - l)));
        int alto = Math.max(minAlto, Math.min(g[3], Math.max(minAlto, b - t)));
        int x = Math.max(l, Math.min(g[0], r - ancho));
        int y = Math.max(t, Math.min(g[1], b - alto));
        return new int[] { x, y, ancho, alto };
    }
}

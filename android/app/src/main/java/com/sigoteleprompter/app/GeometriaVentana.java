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
    // ---------------------------------------------------------------------------------------------------------------
    // EL GIRO DE LA BANDA -10-11-2026, orden t164u-. Sobre Inicio o sobre una Cámara que conserva su interfaz de pie,
    // Android no gira la pantalla aunque la persona ponga el teléfono de lado: la banda se dibuja girada para que quede
    // derecha. Hay dos marcos:
    //   - la PANTALLA: las coordenadas de Android, ya giradas por Display.getRotation -ancho × alto-;
    //   - el de la PERSONA: la pantalla como la ve quien sostiene el teléfono. Con c cuartos de vuelta de compensación
    //     -OrientacionDeVentana-, el contenido se gira c × 90° a la derecha sobre la pantalla.
    // La banda vive en el marco de la persona -la geometría A, el acotado, lo guardado y lo que ve la página- y aquí se
    // pasa a la pantalla. Un punto (u, v) de la persona cae en la pantalla en:
    //   c = 0: (u, v)   c = 1: (ancho - v, u)   c = 2: (ancho - u, alto - v)   c = 3: (v, alto - u)
    // Con c impar el marco de la persona mide alto × ancho.
    // ---------------------------------------------------------------------------------------------------------------

    static int cuartos(int c) { return ((c % 4) + 4) % 4; }

    // {ancho, alto} del marco de la persona.
    static int[] marcoDePersona(int c, int ancho, int alto) {
        return cuartos(c) % 2 == 1 ? new int[] { alto, ancho } : new int[] { ancho, alto };
    }

    static float[] puntoAPantalla(float u, float v, int c, int ancho, int alto) {
        switch (cuartos(c)) {
            case 1: return new float[] { ancho - v, u };
            case 2: return new float[] { ancho - u, alto - v };
            case 3: return new float[] { v, alto - u };
            default: return new float[] { u, v };
        }
    }

    // El inverso: un toque en la pantalla -getRawX/getRawY- en el marco de la persona. Lo usa el arrastre.
    static float[] puntoAPersona(float x, float y, int c, int ancho, int alto) {
        switch (cuartos(c)) {
            case 1: return new float[] { y, ancho - x };
            case 2: return new float[] { ancho - x, alto - y };
            case 3: return new float[] { alto - y, x };
            default: return new float[] { x, y };
        }
    }

    // {x, y, ancho, alto} de la persona a la pantalla: lo que se pone en WindowManager.LayoutParams.
    static int[] aPantalla(int[] g, int c, int ancho, int alto) {
        switch (cuartos(c)) {
            case 1: return new int[] { ancho - (g[1] + g[3]), g[0], g[3], g[2] };
            case 2: return new int[] { ancho - (g[0] + g[2]), alto - (g[1] + g[3]), g[2], g[3] };
            case 3: return new int[] { g[1], alto - (g[0] + g[2]), g[3], g[2] };
            default: return new int[] { g[0], g[1], g[2], g[3] };
        }
    }

    // {l, t, r, b} de la pantalla al marco de la persona: el área segura que ve quien sostiene el teléfono.
    static int[] seguroDePersona(int l, int t, int r, int b, int c, int ancho, int alto) {
        float[] p = puntoAPersona(l, t, c, ancho, alto);
        float[] q = puntoAPersona(r, b, c, ancho, alto);
        return new int[] {
            Math.round(Math.min(p[0], q[0])), Math.round(Math.min(p[1], q[1])),
            Math.round(Math.max(p[0], q[0])), Math.round(Math.max(p[1], q[1]))
        };
    }

    // CÓMO SE GIRA LA VISTA DENTRO DE SU VENTANA: {grados, dx, dy}. La WebView mide ancho × alto de la persona y queda
    // arriba a la izquierda de su marco, que mide lo que la banda ocupa en la pantalla. View.setRotation gira en el
    // sentido del reloj alrededor del centro de la vista; el desplazamiento lleva ese centro al centro del marco. Así
    // lo girado llena el marco justo, y Android entrega cada toque a la WebView con la inversa de esta misma matriz:
    // cada botón recibe el toque donde se dibuja.
    static float[] vista(int c, int ancho, int alto) {
        int q = cuartos(c);
        int marcoAncho = q % 2 == 1 ? alto : ancho;
        int marcoAlto = q % 2 == 1 ? ancho : alto;
        return new float[] { q * 90f, (marcoAncho - ancho) / 2f, (marcoAlto - alto) / 2f };
    }

    // CADA COMPENSACIÓN GUARDA SU GEOMETRÍA. Sin compensación las claves son las de siempre, «v.» y «h.»: Chrome y la
    // Cámara de lado siguen como estaban. Con compensación, la del lado girado aparte -«hc1.», «hc3.»-: el área segura
    // de cada lado es otra y la otra app tiene sus controles en otro lugar.
    static String clave(boolean deLado, int c) {
        int q = cuartos(c);
        return (deLado ? "h" : "v") + (q == 0 ? "" : "c" + q) + ".";
    }

    // LA BANDA A CON EL TELÉFONO GIRADO, en dp del marco de la persona. Es el diseño aprobado de cada orientación
    // -inicial-, con un cambio: con c = 3 se refleja de izquierda a derecha. La otra app conserva su interfaz de pie y
    // tiene sus controles abajo en la pantalla -en la Cámara del g86, el obturador y el zoom desde y 519 de 867-. Con
    // c = 1 ese borde queda a la derecha de la persona y la banda A, corrida a la izquierda, no lo tapa; con c = 3
    // queda a la izquierda, justo donde A pone la banda. Reflejada, la banda queda en los dos casos contra el borde de
    // arriba de la pantalla. En el g86 -390 × 867 de pie, seguro (0, 32, 390, 825)-: c = 1 da 412 × 220 en (88, 8) y en
    // la pantalla (162, 88, 220, 412); c = 3 da (367, 8) y en la pantalla (8, 88, 220, 412). El obturador queda afuera.
    static int[] inicialGirada(int c, int l, int t, int r, int b) {
        if (cuartos(c) != 3) return inicial(l, t, r, b);
        int[] g = inicial(-r, t, -l, b);
        return new int[] { -(g[0] + g[2]), g[1], g[2], g[3] };
    }
}

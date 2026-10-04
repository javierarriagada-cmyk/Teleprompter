package com.sigoteleprompter.app;

// DÓNDE VA EL BLOQUE DE SUBTÍTULOS CON UN MARGEN QUE NO ES EL DE HOY -tarea 87, partes D0 y D2,
// 04-10-2026-. En Java puro, para que JUnit lo pruebe con un cuadro fingido: CapaDeSubtitulos usa
// android.graphics y no se puede cargar en las pruebas locales.
//
// Con "Para redes" el píxel PINTADO más bajo -el contorno, y en formal la franja- queda en
// H*(1-margen): por eso se resta extraAbajo = formal ? 0,08*letra : 0,07*letra -la mitad del
// contorno de 0,14-. Si el borde de arriba del bloque entraría en el 14 % superior -la zona de
// Meta-, la letra se achica hasta que no entre. Con lo de hoy -a lo más dos renglones y letra
// H/32- la guardia no se activa nunca: es una guardia.
//
// Con el margen de hoy -0,125- CapaDeSubtitulos NO llama esto: usa su cálculo de siempre.
final class UbicacionSubtitulos {
    static final float ZONA_ARRIBA = 0.14f;

    private UbicacionSubtitulos() {}

    // ascentPorLetra y descentPorLetra son -fm.ascent/letra y fm.descent/letra: crecen parejo con la
    // letra. Devuelve { letra, base }, con base como la de CapaDeSubtitulos: y del renglón i es
    // base + i*alto - descent.
    static float[] ubicar(float H, float letra, int renglones, float ascentPorLetra, float descentPorLetra,
                          float margen, boolean formal) {
        float l = letra;
        float base = 0;
        for (int vuelta = 0; vuelta < 60; vuelta++) {
            float alto = l * 1.25f;
            float extraAbajo = formal ? 0.08f * l : 0.07f * l;
            base = H * (1 - margen) - extraAbajo - (renglones - 1) * alto;
            if (bordeDeArriba(base, l, ascentPorLetra, descentPorLetra, formal) >= H * ZONA_ARRIBA) break;
            l = l * 0.95f;
        }
        return new float[] { l, base };
    }

    // El borde de arriba del bloque, contado desde arriba: el ascent del primer renglón y lo que
    // sobresale -la franja en formal, medio contorno si no-.
    static float bordeDeArriba(float base, float letra, float ascentPorLetra, float descentPorLetra, boolean formal) {
        float y0 = base - descentPorLetra * letra;
        float extraArriba = formal ? 0.08f * letra : 0.07f * letra;
        return y0 - ascentPorLetra * letra - extraArriba;
    }
}

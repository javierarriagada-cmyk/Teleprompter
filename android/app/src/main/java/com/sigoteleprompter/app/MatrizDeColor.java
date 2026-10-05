package com.sigoteleprompter.app;

import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.RgbMatrix;

// EL FILTRO DE LA TOMA AL GUARDAR -tarea 96, 05-10-2026, plan 3, 4.5-. Una matriz de color fija, la
// misma del visor: la arma la app -src/lib/filtros.ts, matrizParaMedia3- y llega en la receta. Aquí no
// hay nombres de tonos ni cuentas: se devuelven los 16 números tal cual.
//
// EL ORDEN DE LOS 16 NÚMEROS -leído en Media3 1.9.0, etiqueta 1.9.0 de androidx/media,
// libraries/effect/src/main-:
//   - assets/shaders/fragment_shader_transformation_es2.glsl:27: gl_FragColor = uRgbMatrix *
//     vec4(inputColor.rgb, 1): actúa sobre (r, g, b, 1), y la cuarta columna -índices 12, 13, 14- SUMA.
//     La línea :28 deja el alfa de la entrada.
//   - java/androidx/media3/effect/RgbFilter.java:39-41 -el gris- y :51-52 -el invertido, con el +1 en
//     12, 13 y 14-: POR COLUMNAS, como OpenGL.
//   - Con WORKING_COLOR_SPACE_DEFAULT y SDR la matriz opera sobre los valores con gamma -
//     fragment_shader_transformation_sdr_external_es2.glsl:86-88-, como el feColorMatrix en sRGB del
//     visor.
// Si Media3 junta varias RgbMatrix en un solo shader -DefaultShaderProgram.java:686-700- no importa:
// mandamos una sola.
@UnstableApi
final class MatrizDeColor implements RgbMatrix {
    private final float[] matriz;

    MatrizDeColor(float[] m16) {
        if (m16 == null || m16.length != 16) throw new IllegalArgumentException("la matriz de color lleva 16 números");
        this.matriz = m16.clone();
    }

    @Override
    public float[] getMatrix(long presentationTimeUs, boolean useHdr) {
        return matriz;
    }

    // La identidad no hace nada: Media3 se salta el efecto. En Java puro -sin GlUtil, que en JUnit es
    // un esqueleto de Android-.
    @Override
    public boolean isNoOp(int inputWidth, int inputHeight) {
        return esIdentidad(matriz);
    }

    static boolean esIdentidad(float[] m) {
        for (int i = 0; i < 16; i++) {
            float esperado = (i % 5 == 0) ? 1f : 0f;
            if (m[i] != esperado) return false;
        }
        return true;
    }

    // Para el logcat: "[1.06,0,0,0,...]".
    static String texto(float[] m) {
        StringBuilder b = new StringBuilder("[");
        for (int i = 0; i < m.length; i++) {
            if (i > 0) b.append(',');
            b.append(m[i]);
        }
        return b.append(']').toString();
    }
}

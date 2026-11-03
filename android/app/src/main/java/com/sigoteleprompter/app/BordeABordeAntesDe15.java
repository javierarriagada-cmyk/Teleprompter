package com.sigoteleprompter.app;

// BORDE A BORDE TAMBIÉN EN ANDROID 10 A 14 -03-11-2026-.
//
// En Android 15+ (SDK 35+) el sistema ya fuerza borde a borde con targetSdk 35. En 10 a 14 no: las
// barras toman el color del tema y dejan franjas -Galaxy A15 Android 14, lectura: gris arriba y blanca
// abajo-. WindowCompat.enableEdgeToEdge lo activa en esas versiones, pero solo si la WebView del
// teléfono ya pasa los bordes a la web: Capacitor lo hace desde la mayor 140
// -WEBVIEW_VERSION_WITH_SAFE_AREA_FIX en SystemBars.java:41-, con viewport-fit=cover, por el mismo
// camino que en 15/16 -SystemBars.java:199-224-. Con una WebView más vieja Capacitor no pasa los
// bordes bajo el 15 y el texto quedaría debajo de la barra: en ese caso, o si no se puede leer la
// versión, todo queda como hoy.
//
// Esto es solo la decisión, en Java puro para probarla en la JVM -BordeABordeAntesDe15Test-. La
// llamada a enableEdgeToEdge está en MainActivity.onCreate.
final class BordeABordeAntesDe15 {
    // El mismo umbral que Capacitor: SystemBars.WEBVIEW_VERSION_WITH_SAFE_AREA_FIX.
    static final int WEBVIEW_CON_BORDES_SEGUROS = 140;

    private BordeABordeAntesDe15() {}

    // ¿Corresponde llamar a WindowCompat.enableEdgeToEdge en este aparato?
    // Sí solo con SDK < 35 y mayor de la WebView >= 140. VersionName nulo o ilegible: no.
    static boolean corresponde(int sdkInt, String versionNameWebView) {
        if (sdkInt >= 35) return false;
        Integer mayor = mayorDe(versionNameWebView);
        if (mayor == null) return false;
        return mayor >= WEBVIEW_CON_BORDES_SEGUROS;
    }

    // La mayor de un versionName tipo "140.0.7339.51". Si no se puede leer, null.
    static Integer mayorDe(String versionName) {
        if (versionName == null || versionName.isEmpty()) return null;
        String[] segmentos = versionName.split("\\.");
        if (segmentos.length == 0) return null;
        try {
            return Integer.valueOf(segmentos[0]);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

package com.sigoteleprompter.app;

/**
 * EL RANGO DE UN PEDIDO DE VIDEO -tomas-largas, 15-10-2026-. Java puro, para probarlo con JUnit
 * -RangoHttpTest-. Lo usa ClienteWebDeTomas.
 *
 * Motivo: una toma de 25:34 -2,35 GB- se ve en la galería y en el visor de Sigo muestra la imagen pero
 * no arranca. El <video> la pide por convertFileSrc, y Capacitor 8.5.1 -WebViewLocalServer,
 * handleLocalRequest- contesta los Range mal: saca el tamaño de InputStream.available() -un int, que
 * no pasa de 2.147.483.647-, devuelve siempre desde el byte 0 aunque le pidan otro, y no manda
 * Content-Length. Con el índice del mp4 al final del archivo, el reproductor nunca recibe lo que pide.
 *
 * QUÉ SE CONTESTA, por el encabezado Range -RFC 9110, 14.1.2- y el tamaño de verdad, en long:
 *   bytes=N-M   de N a M; M más allá del final se corta en el último byte.
 *   bytes=N-    de N al final -el que pide el reproductor al buscar el índice o saltar-.
 *   bytes=-K    los últimos K bytes; K más grande que el archivo, el archivo entero.
 *   N fuera del archivo, -0, o un archivo vacío: NO_SATISFACIBLE -416, con bytes * /tamaño-.
 *   Lo que no se entiende -otra unidad, varios rangos, N mayor que M, números rotos-: ENTERO. La
 *   norma dice que un Range que no se entiende se ignora: se contesta 200 con el archivo entero y su
 *   Content-Length. No se le devuelve a Capacitor, que con un Range presente cae justo en el camino
 *   roto.
 */
final class RangoHttp {

    enum Tipo { PARCIAL, NO_SATISFACIBLE, ENTERO }

    final Tipo tipo;
    // Inclusive los dos, como en Content-Range. Para ENTERO, de 0 a tamano - 1.
    final long inicio;
    final long fin;
    final long tamano;

    private RangoHttp(Tipo tipo, long inicio, long fin, long tamano) {
        this.tipo = tipo;
        this.inicio = inicio;
        this.fin = fin;
        this.tamano = tamano;
    }

    long largo() {
        return tipo == Tipo.NO_SATISFACIBLE ? 0 : fin - inicio + 1;
    }

    String contentRange() {
        return tipo == Tipo.NO_SATISFACIBLE ? "bytes */" + tamano : "bytes " + inicio + "-" + fin + "/" + tamano;
    }

    static RangoHttp interpretar(String encabezado, long tamano) {
        RangoHttp entero = new RangoHttp(Tipo.ENTERO, 0, Math.max(0, tamano - 1), tamano);
        RangoHttp no = new RangoHttp(Tipo.NO_SATISFACIBLE, 0, -1, tamano);
        if (encabezado == null) return entero;
        String r = encabezado.trim();
        if (!r.regionMatches(true, 0, "bytes=", 0, 6)) return entero;
        r = r.substring(6).trim();
        if (r.isEmpty() || r.indexOf(',') >= 0) return entero;
        int guion = r.indexOf('-');
        if (guion < 0) return entero;
        String a = r.substring(0, guion).trim();
        String b = r.substring(guion + 1).trim();
        try {
            if (a.isEmpty()) {
                // bytes=-K: los últimos K.
                if (b.isEmpty()) return entero;
                long k = Long.parseLong(b);
                if (k < 0) return entero;
                if (k == 0 || tamano == 0) return no;
                long desde = Math.max(0, tamano - k);
                return new RangoHttp(Tipo.PARCIAL, desde, tamano - 1, tamano);
            }
            long desde = Long.parseLong(a);
            if (desde < 0) return entero;
            long hasta = b.isEmpty() ? tamano - 1 : Long.parseLong(b);
            if (!b.isEmpty() && hasta < desde) return entero;
            if (desde >= tamano) return no;
            return new RangoHttp(Tipo.PARCIAL, desde, Math.min(hasta, tamano - 1), tamano);
        } catch (NumberFormatException e) {
            return entero;
        }
    }
}

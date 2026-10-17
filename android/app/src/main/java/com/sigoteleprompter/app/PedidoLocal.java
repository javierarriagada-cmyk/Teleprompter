package com.sigoteleprompter.app;

/**
 * LO CALCULABLE DEL SERVIDOR LOCAL -visor-servidor, 17-10-2026-. Java puro, para probarlo con
 * JUnit -PedidoLocalTest-. Lo usa ServidorLocal.
 *
 * La dirección: http://127.0.0.1:PUERTO/CLAVE/ID -ID opaco, sin la ruta-. El puerto lo da el
 * sistema; la clave es al azar en cada arranque. La app anota la toma y recibe el ID; el servidor
 * solo contesta lo anotado. Un pedido cuya ruta no empieza con /CLAVE/ se rechaza -403-. Solo GET
 * y HEAD; lo demás, 405. El rango lo interpreta RangoHttp, en long.
 *
 * Antes -medir-servidor-local-: la ruta iba en la dirección, ?r=RUTA.
 */
final class PedidoLocal {

    final String metodo;
    final String id;        // el identificador opaco; null si no vino
    final boolean conClave;

    private PedidoLocal(String metodo, String id, boolean conClave) {
        this.metodo = metodo;
        this.id = id;
        this.conClave = conClave;
    }

    static String direccion(int puerto, String clave, String id) {
        return "http://127.0.0.1:" + puerto + "/" + clave + "/" + id;
    }

    /** La primera línea del pedido -"GET /clave/ID HTTP/1.1"-; null si no se entiende. */
    static PedidoLocal leer(String primeraLinea, String clave) {
        if (primeraLinea == null) return null;
        String[] partes = primeraLinea.trim().split(" ");
        if (partes.length < 2) return null;
        String metodo = partes[0];
        String objetivo = partes[1];
        int q = objetivo.indexOf('?');
        if (q >= 0) objetivo = objetivo.substring(0, q);
        boolean conClave = clave != null && !clave.isEmpty() && objetivo.startsWith("/" + clave + "/");
        String id = null;
        if (conClave) {
            String resto = objetivo.substring(clave.length() + 2);
            if (!resto.isEmpty() && resto.indexOf('/') < 0) id = resto;
        }
        return new PedidoLocal(metodo, id, conClave);
    }

    /** 0 si se atiende; si no, el código con que se rechaza. */
    int rechazo() {
        if (!conClave) return 403;
        if (!"GET".equals(metodo) && !"HEAD".equals(metodo)) return 405;
        if (id == null || id.isEmpty()) return 404;
        return 0;
    }

    /** Línea de estado y encabezados -terminan en línea vacía- para un rango ya interpretado. */
    static String encabezados(RangoHttp r, String tipo) {
        StringBuilder s = new StringBuilder();
        if (r.tipo == RangoHttp.Tipo.NO_SATISFACIBLE) {
            s.append("HTTP/1.1 416 Range Not Satisfiable\r\n");
            s.append("Content-Range: ").append(r.contentRange()).append("\r\n");
            s.append("Content-Length: 0\r\n");
        } else if (r.tipo == RangoHttp.Tipo.PARCIAL) {
            s.append("HTTP/1.1 206 Partial Content\r\n");
            s.append("Content-Range: ").append(r.contentRange()).append("\r\n");
            s.append("Content-Length: ").append(r.largo()).append("\r\n");
        } else {
            s.append("HTTP/1.1 200 OK\r\n");
            s.append("Content-Length: ").append(r.largo()).append("\r\n");
        }
        s.append("Accept-Ranges: bytes\r\n");
        s.append("Content-Type: ").append(tipo).append("\r\n");
        s.append("Access-Control-Allow-Origin: *\r\n");
        s.append("Connection: close\r\n\r\n");
        return s.toString();
    }

    static String rechazado(int codigo) {
        String texto = codigo == 403 ? "Forbidden" : codigo == 405 ? "Method Not Allowed" : codigo == 404 ? "Not Found" : "Error";
        return "HTTP/1.1 " + codigo + " " + texto + "\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    }
}

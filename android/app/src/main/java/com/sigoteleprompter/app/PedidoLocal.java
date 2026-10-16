package com.sigoteleprompter.app;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;

/**
 * LO CALCULABLE DEL SERVIDOR LOCAL DE MEDICIÓN -medir-servidor-local, 16-10-2026-. Java puro, para
 * probarlo con JUnit -PedidoLocalTest-. Lo usa ServidorLocal.
 *
 * La dirección: http://127.0.0.1:PUERTO/CLAVE/toma?r=RUTA -RUTA con URLEncoder, UTF-8-. El puerto lo da
 * el sistema; la clave es al azar en cada arranque. Un pedido cuya ruta no empieza con /CLAVE/ se
 * rechaza -403-. Solo GET y HEAD; lo demás, 405. El rango lo interpreta RangoHttp, en long.
 */
final class PedidoLocal {

    final String metodo;
    final String ruta;      // la ruta de la toma, ya decodificada; null si no vino
    final boolean conClave;

    private PedidoLocal(String metodo, String ruta, boolean conClave) {
        this.metodo = metodo;
        this.ruta = ruta;
        this.conClave = conClave;
    }

    static String direccion(int puerto, String clave, String ruta) {
        try {
            return "http://127.0.0.1:" + puerto + "/" + clave + "/toma?r=" + URLEncoder.encode(ruta, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** La primera línea del pedido -"GET /clave/toma?r=... HTTP/1.1"-; null si no se entiende. */
    static PedidoLocal leer(String primeraLinea, String clave) {
        if (primeraLinea == null) return null;
        String[] partes = primeraLinea.trim().split(" ");
        if (partes.length < 2) return null;
        String metodo = partes[0];
        String objetivo = partes[1];
        boolean conClave = clave != null && !clave.isEmpty() && objetivo.startsWith("/" + clave + "/");
        String ruta = null;
        int q = objetivo.indexOf('?');
        if (conClave && q >= 0) {
            for (String par : objetivo.substring(q + 1).split("&")) {
                if (par.startsWith("r=")) {
                    try {
                        ruta = URLDecoder.decode(par.substring(2), "UTF-8");
                    } catch (Exception e) {
                        ruta = null;
                    }
                }
            }
        }
        return new PedidoLocal(metodo, ruta, conClave);
    }

    /** 0 si se atiende; si no, el código con que se rechaza. */
    int rechazo() {
        if (!conClave) return 403;
        if (!"GET".equals(metodo) && !"HEAD".equals(metodo)) return 405;
        if (ruta == null || ruta.isEmpty()) return 404;
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

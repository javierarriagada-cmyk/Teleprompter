package com.sigoteleprompter.app;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * LAS TOMAS DE CUALQUIER TAMAÑO EN EL VISOR -tomas-largas, 15-10-2026-.
 *
 * El mismo cliente de Capacitor, con UNA sola diferencia: los pedidos de VIDEO de convertFileSrc
 * -/_capacitor_file_/ y /_capacitor_content_/, en el host de la app- que traen encabezado Range los
 * contesta esto, bien: el tamaño de verdad en long -File.length() o el statSize del descriptor-, desde
 * el byte pedido, con Content-Range y Content-Length -RangoHttp-. El porqué, en RangoHttp.
 *
 * Todo lo demás pasa a Capacitor sin tocarlo: el video sin Range, las miniaturas, la app, los
 * archivos que no son video. El <video>, el filtro de la vista previa, los subtítulos del visor y la
 * tira no cambian: piden lo mismo que antes, y ahora reciben lo que piden.
 */
final class ClienteWebDeTomas extends BridgeWebViewClient {

    private static final String ETIQUETA = "ClienteWebDeTomas";

    private final Bridge puente;

    ClienteWebDeTomas(Bridge puente) {
        super(puente);
        this.puente = puente;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        try {
            WebResourceResponse r = videoConRango(view.getContext(), request);
            if (r != null) return r;
        } catch (Exception e) {
            // Si algo sale mal aquí, Capacitor contesta como siempre: no se pierde nada que hoy ande.
            Log.w(ETIQUETA, "No se pudo contestar el rango de " + request.getUrl() + ": " + e.getMessage());
        }
        return super.shouldInterceptRequest(view, request);
    }

    private WebResourceResponse videoConRango(Context ctx, WebResourceRequest request) throws IOException {
        Map<String, String> pedidos = request.getRequestHeaders();
        String rango = pedidos.get("Range") != null ? pedidos.get("Range") : pedidos.get("range");
        if (rango == null) return null;
        Uri url = request.getUrl();
        String camino = url.getPath();
        if (camino == null) return null;
        String host = Uri.parse(puente.getLocalUrl()).getHost();
        if (host == null || !host.equals(url.getHost())) return null;

        long tamano;
        String tipo;
        InputStream entrada;
        if (camino.startsWith(Bridge.CAPACITOR_FILE_START)) {
            File f = new File(camino.substring(Bridge.CAPACITOR_FILE_START.length()));
            tipo = tipoDeVideo(f.getName());
            if (tipo == null || !f.isFile()) return null;
            tamano = f.length();
            RangoHttp r = RangoHttp.interpretar(rango, tamano);
            FileInputStream fis = new FileInputStream(f);
            return responder(r, tipo, fis);
        } else if (camino.startsWith(Bridge.CAPACITOR_CONTENT_START)) {
            // Igual que AndroidProtocolHandler.openContentUrl: el resto del camino es el content://.
            Uri contenido = Uri.parse("content:/" + camino.substring(Bridge.CAPACITOR_CONTENT_START.length())
                + (url.getEncodedQuery() != null ? "?" + url.getEncodedQuery() : ""));
            tipo = ctx.getContentResolver().getType(contenido);
            if (tipo == null || !tipo.startsWith("video/")) return null;
            ParcelFileDescriptor pfd = ctx.getContentResolver().openFileDescriptor(contenido, "r");
            if (pfd == null) return null;
            tamano = pfd.getStatSize();
            if (tamano < 0) {
                pfd.close();
                return null;
            }
            entrada = new ParcelFileDescriptor.AutoCloseInputStream(pfd);
            return responder(RangoHttp.interpretar(rango, tamano), tipo, (FileInputStream) entrada);
        }
        return null;
    }

    private static WebResourceResponse responder(RangoHttp r, String tipo, FileInputStream fis) throws IOException {
        Map<String, String> encabezados = new HashMap<>();
        encabezados.put("Accept-Ranges", "bytes");
        if (r.tipo == RangoHttp.Tipo.NO_SATISFACIBLE) {
            fis.close();
            encabezados.put("Content-Range", r.contentRange());
            encabezados.put("Content-Length", "0");
            return new WebResourceResponse(tipo, null, 416, "Range Not Satisfiable", encabezados, new java.io.ByteArrayInputStream(new byte[0]));
        }
        // Al byte pedido sin leer lo de antes: el canal se posiciona -en una toma de 2 GB, saltar
        // leyendo tardaría segundos-.
        fis.getChannel().position(r.inicio);
        encabezados.put("Content-Length", String.valueOf(r.largo()));
        InputStream cuerpo = new Limitado(fis, r.largo());
        if (r.tipo == RangoHttp.Tipo.ENTERO) {
            return new WebResourceResponse(tipo, null, 200, "OK", encabezados, cuerpo);
        }
        encabezados.put("Content-Range", r.contentRange());
        return new WebResourceResponse(tipo, null, 206, "Partial Content", encabezados, cuerpo);
    }

    /** El tipo de video por la extensión, o null si no es video: lo demás sigue en Capacitor. */
    static String tipoDeVideo(String nombre) {
        String n = nombre.toLowerCase(Locale.ROOT);
        if (n.endsWith(".mp4") || n.endsWith(".m4v")) return "video/mp4";
        if (n.endsWith(".webm")) return "video/webm";
        if (n.endsWith(".mov")) return "video/quicktime";
        if (n.endsWith(".3gp")) return "video/3gpp";
        if (n.endsWith(".mkv")) return "video/x-matroska";
        return null;
    }

    /** Entrega a lo más 'quedan' bytes: el largo del rango, ni uno más. */
    private static final class Limitado extends InputStream {
        private final InputStream adentro;
        private long quedan;

        Limitado(InputStream adentro, long quedan) {
            this.adentro = adentro;
            this.quedan = quedan;
        }

        @Override
        public int read() throws IOException {
            if (quedan <= 0) return -1;
            int b = adentro.read();
            if (b >= 0) quedan--;
            return b;
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            if (quedan <= 0) return -1;
            int n = adentro.read(b, off, (int) Math.min(len, quedan));
            if (n > 0) quedan -= n;
            return n;
        }

        @Override
        public int available() throws IOException {
            // -revisión de Claude, 15-10-2026, medido en el Redmi- No se le pregunta al archivo: su
            // available() es un int y, con más de 2^31 bytes por delante, puede desbordarse. Con la toma
            // de 5,29 GB el pedido desde el byte 2.468.020.224 -quedan 2.826.664.529- se repetía cada
            // 8 s; con esta línea pasó a repetirse cada ~1,3 s y terminar en PIPELINE_ERROR_READ: NO era
            // la única falla -el <video> no lee pasado 2^31; las tomas grandes van al reproductor del
            // sistema-. Se deja porque la cuenta propia es exacta y nunca negativa.
            // Antes: return (int) Math.min(Integer.MAX_VALUE, Math.min(quedan, adentro.available()));
            return (int) Math.max(0, Math.min(Integer.MAX_VALUE, quedan));
        }

        @Override
        public void close() throws IOException {
            adentro.close();
        }
    }
}

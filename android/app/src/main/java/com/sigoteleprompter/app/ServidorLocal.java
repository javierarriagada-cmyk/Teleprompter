package com.sigoteleprompter.app;

import android.content.Context;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.util.Log;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * SERVIDOR HTTP MÍNIMO EN 127.0.0.1, SOLO PARA MEDIR -medir-servidor-local, 16-10-2026-.
 *
 * Por qué: con ClienteWebDeTomas -shouldInterceptRequest- los rangos salen bien, pero el <video> falla
 * en el primer byte pasado 2.147.483.647 -PIPELINE_ERROR_READ, Redmi, toma de 5,29 GB-. Si por esta vía
 * -HTTP de verdad, sin interceptor- la misma toma se reproduce pasado 2^31, el tope está en la vía del
 * interceptor y no en el reproductor.
 *
 * ServerSocket solo en 127.0.0.1, puerto que da el sistema, clave al azar en la ruta -PedidoLocal-.
 * Archivos -file://, /storage, files/- y content://. Todo se lee con FileChannel.position(long): al byte
 * pedido sin recorrer lo anterior. content:// se abre con openFileDescriptor; nunca openInputStream+skip.
 * Todo queda en logcat con la etiqueta MEDIR-SERVIDOR.
 */
final class ServidorLocal {

    static final String ETIQUETA = "MEDIR-SERVIDOR";

    private static ServidorLocal unico;

    private final Context ctx;
    private final ServerSocket socket;
    private final String clave;

    static synchronized ServidorLocal obtener(Context ctx) throws IOException {
        if (unico == null || unico.socket.isClosed()) unico = new ServidorLocal(ctx.getApplicationContext());
        return unico;
    }

    private ServidorLocal(Context ctx) throws IOException {
        this.ctx = ctx;
        this.socket = new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"));
        byte[] b = new byte[16];
        new SecureRandom().nextBytes(b);
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x));
        this.clave = s.toString();
        Log.i(ETIQUETA, "arranca en 127.0.0.1:" + socket.getLocalPort());
        Thread t = new Thread(this::aceptar, "ServidorLocal");
        t.setDaemon(true);
        t.start();
    }

    String direccion(String ruta) {
        return PedidoLocal.direccion(socket.getLocalPort(), clave, ruta);
    }

    private void aceptar() {
        while (!socket.isClosed()) {
            try {
                Socket s = socket.accept();
                Thread t = new Thread(() -> atender(s), "ServidorLocal-pedido");
                t.setDaemon(true);
                t.start();
            } catch (IOException e) {
                Log.e(ETIQUETA, "error al aceptar: " + e);
            }
        }
    }

    private void atender(Socket s) {
        String rangoPedido = null;
        long mandados = 0;
        String quien = "?";
        try (Socket cerrar = s) {
            BufferedReader entrada = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.ISO_8859_1));
            String primera = entrada.readLine();
            String linea;
            while ((linea = entrada.readLine()) != null && !linea.isEmpty()) {
                int dos = linea.indexOf(':');
                if (dos > 0 && linea.substring(0, dos).trim().equalsIgnoreCase("Range")) rangoPedido = linea.substring(dos + 1).trim();
            }
            OutputStream salida = s.getOutputStream();
            PedidoLocal p = PedidoLocal.leer(primera, clave);
            int no = p == null ? 400 : p.rechazo();
            if (no != 0) {
                Log.w(ETIQUETA, "rechazado " + no + " (" + (p != null && !p.conClave ? "sin clave" : "pedido") + ")");
                salida.write(PedidoLocal.rechazado(no).getBytes(StandardCharsets.ISO_8859_1));
                return;
            }
            quien = p.ruta;
            try (Abierto a = abrir(p.ruta)) {
                RangoHttp r = RangoHttp.interpretar(rangoPedido, a.tamano);
                salida.write(PedidoLocal.encabezados(r, a.tipo).getBytes(StandardCharsets.ISO_8859_1));
                Log.i(ETIQUETA, p.metodo + " Range=" + rangoPedido + " -> " + r.tipo + " " + r.contentRange() + " largo=" + r.largo() + " (" + p.ruta + ")");
                if (!"GET".equals(p.metodo) || r.tipo == RangoHttp.Tipo.NO_SATISFACIBLE) return;
                a.canal.position(r.inicio);
                ByteBuffer buf = ByteBuffer.allocate(256 * 1024);
                long quedan = r.largo();
                while (quedan > 0) {
                    buf.clear();
                    if (quedan < buf.capacity()) buf.limit((int) quedan);
                    int n = a.canal.read(buf);
                    if (n < 0) break;
                    salida.write(buf.array(), 0, n);
                    mandados += n;
                    quedan -= n;
                }
                salida.flush();
                Log.i(ETIQUETA, "fin Range=" + rangoPedido + " mandados=" + mandados + (quedan > 0 ? " FALTARON " + quedan : ""));
            }
        } catch (Exception e) {
            // El reproductor corta conexiones a medias al saltar: también se anota, con lo mandado.
            Log.e(ETIQUETA, "error Range=" + rangoPedido + " mandados=" + mandados + " (" + quien + "): " + e);
        }
    }

    private static final class Abierto implements AutoCloseable {
        final FileChannel canal;
        final long tamano;
        final String tipo;
        final AutoCloseable dueno;

        Abierto(FileChannel canal, long tamano, String tipo, AutoCloseable dueno) {
            this.canal = canal;
            this.tamano = tamano;
            this.tipo = tipo;
            this.dueno = dueno;
        }

        @Override
        public void close() throws Exception {
            canal.close();
            dueno.close();
        }
    }

    private Abierto abrir(String ruta) throws IOException {
        String r = ruta.trim();
        if (r.startsWith("content:")) {
            Uri uri = Uri.parse(r);
            ParcelFileDescriptor pfd = ctx.getContentResolver().openFileDescriptor(uri, "r");
            if (pfd == null) throw new IOException("openFileDescriptor devolvió null");
            FileInputStream fis = new FileInputStream(pfd.getFileDescriptor());
            String tipo = ctx.getContentResolver().getType(uri);
            return new Abierto(fis.getChannel(), pfd.getStatSize(), tipo != null ? tipo : "video/mp4", pfd);
        }
        if (r.startsWith("file:")) {
            String camino = Uri.parse(r).getPath();
            if (camino != null && !camino.isEmpty()) r = camino;
        }
        File f = r.startsWith("/") ? new File(r) : new File(ctx.getFilesDir().getParentFile(), r);
        FileInputStream fis = new FileInputStream(f);
        String tipo = ClienteWebDeTomas.tipoDeVideo(f.getName());
        return new Abierto(fis.getChannel(), f.length(), tipo != null ? tipo : "video/mp4", fis);
    }
}

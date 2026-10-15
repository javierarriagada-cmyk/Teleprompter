package com.sigoteleprompter.app;

import android.content.Context;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * EL BANCO LARGO, EN LA APK DE PRUEBA -motor-largo, 15-10-2026-.
 *
 * Motivo: en el moto g86, en una toma de 25:34 con la cámara a 1080p, a los ~25 min el texto dejó de
 * avanzar. El relevo del micrófono se abrió 3 veces -min 11,5, 16,9 y 24,3-, nunca en tomas cortas:
 * el lazo de Vosk procesa más lento que el audio que entra, y empeora. Esto lo MIDE; no lo arregla.
 *
 * QUÉ HACE. Le da al MISMO lazo de siempre -VoskNativoPlugin.Oido, no una copia- el audio de los
 * .pcm que ya están en files/oido -16 kHz, mono, 16 bits, los que guardó el oído en lecturas reales-,
 * en vez del micrófono, a ritmo de tiempo real: un trozo de 20 ms cada 20 ms. Si Vosk se atrasa,
 * el trozo siguiente ya "llegó" y se entrega sin esperar, igual que el colchón del micrófono: el
 * atraso acumulado se mide igual que la retención del relevo. Los archivos se repiten en orden
 * hasta completar los minutos pedidos. No se inventa audio: si no hay .pcm, no arranca.
 *
 * DÓNDE VIVE. Solo aquí, en src/debug -la APK de prueba, assembleDebug-. La versión de Play
 * -bundleRelease- compila la de src/release, que no hace nada: el mismo mecanismo que PaqueteDeVoz.
 *
 * LO QUE ESCRIBE: files/banco-largo/tabla-<inicio>.txt, una línea por minuto que arma JavaScript
 * -MotorNativo, con el calce y el estado del motor- y entrega con lineaBancoLargo.
 */
final class BancoLargo {

    static final String CARPETA = "banco-largo";
    private static final int FRECUENCIA = 16000;

    private final List<File> archivos;
    private final long muestrasLimite;
    private int indice = 0;
    private InputStream entrada = null;
    private long entregadas = 0;
    private long inicioNs = 0;
    private boolean terminado = false;
    private final byte[] bytes = new byte[2 * 4096];

    private BancoLargo(List<File> archivos, int minutos) {
        this.archivos = archivos;
        this.muestrasLimite = (long) minutos * 60L * FRECUENCIA;
    }

    static boolean disponible() {
        return true;
    }

    /** Los .pcm de files/oido, del más viejo al más nuevo. Sin ninguno, IOException: no se inventa. */
    static BancoLargo abrir(Context ctx, int minutos, String[] nombres) throws IOException {
        File dir = new File(ctx.getFilesDir(), "oido");
        List<File> lista = new ArrayList<>();
        if (nombres != null && nombres.length > 0) {
            for (String n : nombres) {
                File f = new File(dir, new File(n).getName());
                if (f.isFile() && f.length() > 0) lista.add(f);
            }
        } else {
            File[] todos = dir.listFiles((d, n) -> n.endsWith(".pcm"));
            if (todos != null) {
                Arrays.sort(todos, (a, b) -> a.getName().compareTo(b.getName()));
                for (File f : todos) if (f.length() > 0) lista.add(f);
            }
        }
        if (lista.isEmpty()) throw new IOException("No hay audios .pcm en " + dir);
        return new BancoLargo(lista, Math.max(1, minutos));
    }

    /** Cuántos archivos y cuántos minutos de audio distintos hay: va al principio de la tabla. */
    String resumen() {
        long bytesTotal = 0;
        StringBuilder nombres = new StringBuilder();
        for (File f : archivos) {
            bytesTotal += f.length();
            if (nombres.length() > 0) nombres.append(',');
            nombres.append(f.getName());
        }
        return String.format(java.util.Locale.ROOT, "archivos=%d audio_distinto_min=%.1f pedido_min=%d nombres=%s",
            archivos.size(), bytesTotal / 2.0 / FRECUENCIA / 60.0, muestrasLimite / FRECUENCIA / 60, nombres);
    }

    /**
     * Llena destino con el trozo siguiente, a ritmo de tiempo real: vuelve recién cuando la última
     * muestra del trozo "ya se dijo". Al llegar a los minutos pedidos devuelve 0 y queda terminado.
     */
    int leer(short[] destino) throws IOException {
        if (terminado) return 0;
        if (inicioNs == 0) inicioNs = System.nanoTime();
        int n = (int) Math.min(destino.length, muestrasLimite - entregadas);
        if (n <= 0) {
            terminado = true;
            return 0;
        }
        int llenas = 0;
        while (llenas < n) {
            if (entrada == null) {
                entrada = new BufferedInputStream(new FileInputStream(archivos.get(indice)), 64 * 1024);
            }
            int pedir = Math.min((n - llenas) * 2, bytes.length);
            int leidos = entrada.read(bytes, 0, pedir);
            if (leidos < 2) {
                // Fin del archivo -o un byte suelto al final-: el siguiente, y al terminar la lista, de nuevo.
                entrada.close();
                entrada = null;
                indice = (indice + 1) % archivos.size();
                continue;
            }
            int muestras = leidos / 2;
            for (int i = 0; i < muestras; i++) {
                destino[llenas + i] = (short) ((bytes[2 * i] & 0xff) | (bytes[2 * i + 1] << 8));
            }
            llenas += muestras;
        }
        entregadas += n;
        long objetivoNs = inicioNs + entregadas * 1_000_000_000L / FRECUENCIA;
        long faltaNs = objetivoNs - System.nanoTime();
        if (faltaNs > 0) {
            try {
                Thread.sleep(faltaNs / 1_000_000L, (int) (faltaNs % 1_000_000L));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        return n;
    }

    boolean terminado() {
        return terminado;
    }

    void cerrar() {
        if (entrada == null) return;
        try {
            entrada.close();
        } catch (IOException ignorada) {
            // es un instrumento
        }
        entrada = null;
    }

    /**
     * La temperatura de la CPU, de una zona térmica de /sys/class/thermal: la primera cuyo tipo dice
     * "cpu"; si ninguna lo dice, «sin temperatura» -una zona cualquiera puede ser la batería y
     * engañaría-. Los valores vienen en milésimas de grado.
     */
    static String temperatura() {
        File[] zonas = new File("/sys/class/thermal").listFiles((d, n) -> n.startsWith("thermal_zone"));
        if (zonas == null) return "sin temperatura";
        Arrays.sort(zonas, (a, b) -> a.getName().compareTo(b.getName()));
        for (File z : zonas) {
            String tipo = leerCorto(new File(z, "type"));
            if (tipo == null || !tipo.toLowerCase(java.util.Locale.ROOT).contains("cpu")) continue;
            String t = leerCorto(new File(z, "temp"));
            if (t == null) continue;
            try {
                double v = Double.parseDouble(t);
                if (Math.abs(v) > 1000) v = v / 1000.0;
                return String.format(java.util.Locale.ROOT, "%.1fC(%s)", v, tipo);
            } catch (NumberFormatException ignorada) {
                // la siguiente
            }
        }
        return "sin temperatura";
    }

    private static String leerCorto(File f) {
        try (InputStream in = new FileInputStream(f)) {
            byte[] b = new byte[64];
            int n = in.read(b);
            return n <= 0 ? null : new String(b, 0, n, StandardCharsets.UTF_8).trim();
        } catch (IOException | SecurityException e) {
            return null;
        }
    }

    /**
     * El pedido que deja scripts/banco-largo.mjs -files/banco-largo/pedido.json, por adb run-as-.
     * Se lee y se borra: abrir la app otra vez no repite el banco.
     */
    static String tomarPedido(Context ctx) {
        File f = new File(new File(ctx.getFilesDir(), CARPETA), "pedido.json");
        if (!f.isFile()) return null;
        try (InputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) Math.min(f.length(), 4 * 1024 * 1024)];
            int total = 0;
            while (total < b.length) {
                int n = in.read(b, total, b.length - total);
                if (n < 0) break;
                total += n;
            }
            return new String(b, 0, total, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        } finally {
            //noinspection ResultOfMethodCallIgnored
            f.delete();
        }
    }

    /** Agrega una línea a files/banco-largo/<nombre>.txt. */
    static void anotarLinea(Context ctx, String nombre, String linea) throws IOException {
        File dir = new File(ctx.getFilesDir(), CARPETA);
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("No se pudo crear " + dir);
        File f = new File(dir, new File(nombre).getName() + ".txt");
        try (Writer w = new OutputStreamWriter(new FileOutputStream(f, true), StandardCharsets.UTF_8)) {
            w.write(linea);
            w.write('\n');
        }
    }
}

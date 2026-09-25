package com.sigoteleprompter.app;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;

import androidx.media3.common.util.Size;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.BitmapOverlay;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * LOS SUBTITULOS QUEMADOS EN EL VIDEO QUE VA A LA GALERIA -24-09-2026-.
 *
 * Media3 Transformer vuelve a codificar la toma y, en cada cuadro, pone encima
 * lo que devuelve getBitmap: el subtitulo de ese instante, dibujado igual que en
 * el visor -SubtitulosVisor.tsx y styles.css-. Los subtitulos llegan ya armados
 * desde la app -armarSubtitulos en subtitulos.ts-, con sus renglones y la hora
 * de cada palabra: aca solo se dibujan, no se decide nada.
 *
 * La letra es la del sistema -Roboto en Android-, en el visor y aca. La de la
 * app, Source Sans 3, viene solo como woff2, que Android no puede cargar: si
 * cada lado usara la suya, lo guardado no se veria como lo elegido.
 *
 * Un bitmap nuevo solo cuando cambia lo que se ve -otro subtitulo u otra
 * palabra-: Media3 sube el bitmap a la GPU cuando getBitmap devuelve OTRO objeto,
 * asi que no se reusa el mismo pintandolo de nuevo.
 */
@UnstableApi
final class CapaDeSubtitulos extends BitmapOverlay {

    private static final class Palabra {
        final String texto;
        final long desde;
        final long hasta;
        Palabra(String texto, long desde, long hasta) {
            this.texto = texto;
            this.desde = desde;
            this.hasta = hasta;
        }
    }

    private static final class Sub {
        final long desde;
        final long hasta;
        final List<List<Palabra>> renglones = new ArrayList<>();
        Sub(long desde, long hasta) {
            this.desde = desde;
            this.hasta = hasta;
        }
    }

    private static final int AMARILLO = Color.rgb(0xFF, 0xD2, 0x00);
    private static final int ROJO = Color.rgb(0xE5, 0x32, 0x2D);
    private static final int FRANJA = Color.argb(189, 0, 0, 0); // 0,74

    private final List<Sub> subs = new ArrayList<>();
    private final String estilo;
    // Cuantos grados hay que girar el cuadro para verlo derecho -la toma del
    // telefono viene en 1920x1080 con rotacion 90-.
    private final int rotacion;

    private int anchoCuadro;
    private int altoCuadro;
    private Bitmap vacio;
    private Bitmap actual;
    private String claveActual = null;

    CapaDeSubtitulos(String subtitulosJson, String estilo, int rotacion) throws Exception {
        this.estilo = estilo;
        this.rotacion = ((rotacion % 360) + 360) % 360;
        JSONArray arr = new JSONArray(subtitulosJson);
        for (int i = 0; i < arr.length(); i++) {
            JSONObject o = arr.getJSONObject(i);
            Sub s = new Sub(o.getLong("desdeMs"), o.getLong("hastaMs"));
            JSONArray rs = o.getJSONArray("renglones");
            for (int j = 0; j < rs.length(); j++) {
                JSONArray ws = rs.getJSONArray(j);
                List<Palabra> r = new ArrayList<>();
                for (int k = 0; k < ws.length(); k++) {
                    JSONObject w = ws.getJSONObject(k);
                    r.add(new Palabra(w.getString("texto"), w.getLong("desdeMs"), w.getLong("hastaMs")));
                }
                s.renglones.add(r);
            }
            subs.add(s);
        }
    }

    @Override
    public void configure(Size videoSize) {
        super.configure(videoSize);
        anchoCuadro = videoSize.getWidth();
        altoCuadro = videoSize.getHeight();
        vacio = null;
        actual = null;
        claveActual = null;
    }

    @Override
    public Bitmap getBitmap(long presentationTimeUs) {
        long ms = presentationTimeUs / 1000;
        int indice = -1;
        for (int i = 0; i < subs.size(); i++) {
            Sub s = subs.get(i);
            if (ms < s.desde) break;
            if (ms < s.hasta) { indice = i; break; }
        }
        if (indice < 0) {
            if (vacio == null) vacio = Bitmap.createBitmap(Math.max(1, anchoCuadro), Math.max(1, altoCuadro), Bitmap.Config.ARGB_8888);
            return vacio;
        }
        Sub s = subs.get(indice);
        // Lo que cambia la imagen: el subtitulo y, en los estilos que marcan
        // palabras, cuantas van dichas y cual se esta diciendo.
        StringBuilder clave = new StringBuilder().append(indice);
        if (!"formal".equals(estilo)) {
            for (List<Palabra> r : s.renglones) for (Palabra w : r) clave.append(estadoDe(w, ms));
        }
        String k = clave.toString();
        if (actual != null && k.equals(claveActual)) return actual;
        Bitmap b = Bitmap.createBitmap(anchoCuadro, altoCuadro, Bitmap.Config.ARGB_8888);
        dibujar(new Canvas(b), s, ms);
        actual = b;
        claveActual = k;
        return b;
    }

    // 0 por decir, 1 diciendose, 2 dicha -como data-estado en el visor-.
    private static int estadoDe(Palabra w, long ms) {
        if (ms >= w.hasta) return 2;
        if (ms >= w.desde) return 1;
        return 0;
    }

    private void dibujar(Canvas c, Sub s, long ms) {
        // Se dibuja DERECHO, en el tamano en que se ve la toma, y se gira al
        // cuadro tal como viene del archivo.
        boolean ladeado = rotacion == 90 || rotacion == 270;
        boolean cuadroYaDerecho = ladeado ? altoCuadro > anchoCuadro : true;
        int W = anchoCuadro;
        int H = altoCuadro;
        if (ladeado && !cuadroYaDerecho) {
            W = altoCuadro;
            H = anchoCuadro;
            if (rotacion == 90) {
                c.translate(0, altoCuadro);
                c.rotate(-90);
            } else {
                c.translate(anchoCuadro, 0);
                c.rotate(90);
            }
        } else if (rotacion == 180 && !cuadroYaDerecho) {
            c.translate(anchoCuadro, altoCuadro);
            c.rotate(180);
        }

        boolean formal = "formal".equals(estilo);
        // Las mismas medidas que el visor: letra de 1/32 del alto, renglones de
        // 1,25, un octavo del alto desde abajo, 6% de margen a los lados.
        float letra = H / 32f;
        Paint relleno = new Paint(Paint.ANTI_ALIAS_FLAG);
        relleno.setTypeface(Typeface.create("sans-serif", formal ? Typeface.NORMAL : Typeface.BOLD));
        relleno.setTextSize(letra);
        float anchoMax = W * 0.88f;
        // Un renglon demasiado ancho para el cuadro -una toma horizontal con letra
        // grande- achica la letra de todo el subtitulo, en vez de salirse.
        float espacio = relleno.measureText(" ");
        float masAncho = 0;
        for (List<Palabra> r : s.renglones) masAncho = Math.max(masAncho, anchoDe(r, relleno, espacio));
        if (masAncho > anchoMax) {
            letra = letra * anchoMax / masAncho;
            relleno.setTextSize(letra);
            espacio = relleno.measureText(" ");
        }
        Paint contorno = new Paint(relleno);
        contorno.setStyle(Paint.Style.STROKE);
        contorno.setStrokeJoin(Paint.Join.ROUND);
        contorno.setStrokeWidth(letra * 0.14f);
        contorno.setColor(Color.BLACK);

        float alto = letra * 1.25f;
        int n = s.renglones.size();
        float base = H * (1 - 0.125f) - (n - 1) * alto;
        Paint.FontMetrics fm = relleno.getFontMetrics();
        for (int i = 0; i < n; i++) {
            List<Palabra> r = s.renglones.get(i);
            float ancho = anchoDe(r, relleno, espacio);
            float x = (W - ancho) / 2f;
            float y = base + i * alto - fm.descent;
            if (formal) {
                Paint franja = new Paint(Paint.ANTI_ALIAS_FLAG);
                franja.setColor(FRANJA);
                float px = letra * 0.4f;
                float py = letra * 0.08f;
                c.drawRoundRect(new RectF(x - px, y + fm.ascent - py, x + ancho + px, y + fm.descent + py), letra * 0.12f, letra * 0.12f, franja);
            }
            for (Palabra w : r) {
                float aw = relleno.measureText(w.texto);
                int estado = estadoDe(w, ms);
                if (formal) {
                    relleno.setColor(Color.WHITE);
                    c.drawText(w.texto, x, y, relleno);
                } else if ("rojo".equals(estilo) && estado == 1) {
                    Paint caja = new Paint(Paint.ANTI_ALIAS_FLAG);
                    caja.setColor(ROJO);
                    float p = letra * 0.1f;
                    c.drawRoundRect(new RectF(x - p, y + fm.ascent, x + aw + p, y + fm.descent), letra * 0.14f, letra * 0.14f, caja);
                    relleno.setColor(Color.WHITE);
                    c.drawText(w.texto, x, y, relleno);
                } else {
                    c.drawText(w.texto, x, y, contorno);
                    relleno.setColor("amarillo".equals(estilo) && estado > 0 ? AMARILLO : Color.WHITE);
                    c.drawText(w.texto, x, y, relleno);
                }
                x += aw + espacio;
            }
        }
    }

    private static float anchoDe(List<Palabra> r, Paint p, float espacio) {
        float a = 0;
        for (int i = 0; i < r.size(); i++) {
            if (i > 0) a += espacio;
            a += p.measureText(r.get(i).texto);
        }
        return a;
    }
}

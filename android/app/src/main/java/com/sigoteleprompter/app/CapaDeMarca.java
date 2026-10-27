package com.sigoteleprompter.app;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;

import androidx.media3.common.util.Size;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.effect.BitmapOverlay;

/**
 * LA MARCA DE AGUA DE SIGO SIN SUSCRIPCIÓN -orden 2, punto 7, 26-10-2026-.
 * BitmapOverlay como CapaDeSubtitulos: el trazo de MarcaSigo con su bola roja
 * -src/components/trazoMarca.ts- y debajo la palabra «Teleprompter», con las
 * medidas de la lámina 5A: logo al 4,5 % del alto, palabra al 2,3 %, arriba a
 * la izquierda a un 3 % del borde de arriba y un 5 % del de la izquierda,
 * blanca al 92 % con halo oscuro doble. Respeta la rotación de la toma como
 * CapaDeSubtitulos. «Teleprompter» va igual en los tres idiomas. Sin fuentes
 * en res/font: Typeface sans-serif-medium del sistema.
 */
@UnstableApi
final class CapaDeMarca extends BitmapOverlay {

    // Lienzo de la marca en trazoMarca.ts -MARCA_CAJA y MARCA_PUNTO-.
    private static final float CAJA_X = 90f;
    private static final float CAJA_Y = 151.84f;
    private static final float CAJA_ANCHO = 252f;
    private static final float CAJA_ALTO = 128.32f;
    private static final float PUNTO_CX = 313.53f;
    private static final float PUNTO_CY = 191.04f;
    private static final float PUNTO_R = 28.47f;
    private static final int COLOR_PUNTO = Color.rgb(0xE1, 0x1D, 0x2E); // --color-grabando
    private static final int BLANCO = Color.argb(Math.round(255 * 0.92f), 255, 255, 255);
    private static final int HALO = Color.argb(Math.round(255 * 0.55f), 0, 0, 0);

    private static final String TRAZO =
'M118.47 251.42L118.47 251.42Q109.86 251.42 102.25 249.44Q94.63 247.45 90 244.80L90 244.80L90.40 224.67L100.20 224.67L103.24 240.43Q106.29 241.76 109.60 242.55L109.60 242.55Q113.44 243.48 118.07 243.48L118.07 243.48Q124.43 243.48 128.53 241.69Q132.64 239.90 134.63 236.66Q136.61 233.41 136.61 229.44L136.61 229.44Q136.61 225.60 135.09 222.95Q133.57 220.30 130.32 218.25Q127.08 216.20 121.78 214.21L121.78 214.21L117.15 212.23Q109.60 209.18 103.77 205.54Q97.95 201.90 94.63 196.80Q91.32 191.70 91.32 184.15L91.32 184.15Q91.32 176.21 95.56 170.65Q99.80 165.08 107.08 162.17Q114.37 159.26 123.64 159.26L123.64 159.26Q131.71 159.26 138.07 161.11Q144.43 162.96 148.27 165.48L148.27 165.48L147.74 184.42L138.20 184.42L135.16 169.32Q134.63 169.06 134.23 168.92L134.23 168.92Q129.73 167.07 123.90 167.07L123.90 167.07Q118.87 167.07 115.29 168.73Q111.72 170.38 109.73 173.29Q107.74 176.21 107.74 180.05L107.74 180.05Q107.74 183.76 109.33 186.40Q110.92 189.05 114.17 191.10Q117.41 193.16 122.31 195.14L122.31 195.14L127.21 197.13Q135.42 200.44 141.25 204.15Q147.07 207.86 150.12 212.89Q153.17 217.92 153.17 225.20L153.17 225.20Q153.17 233.28 148.86 239.17Q144.56 245.07 136.81 248.24Q129.06 251.42 118.47 251.42ZM198.85 249.30L163.63 249.30L163.63 242.29L172.90 241.36Q172.90 240.96 173.03 240.43L173.03 240.43Q173.03 235.53 173.03 230.37L173.03 230.37L173.03 205.21Q173.03 201.23 172.90 197.13L172.90 197.13L162.83 196.47L162.83 190.11L185.61 182.83L189.85 183.49L189.71 200.84L189.71 230.37Q189.71 235.53 189.85 240.43L189.85 240.43Q189.85 240.96 189.85 241.49L189.85 241.49L198.85 242.29L198.85 249.30ZM180.97 171.44L180.97 171.44Q176.74 171.44 173.76 168.59Q170.78 165.75 170.78 161.64L170.78 161.64Q170.78 157.40 173.76 154.62Q176.74 151.84 180.97 151.84L180.97 151.84Q185.34 151.84 188.26 154.62Q191.17 157.40 191.17 161.64L191.17 161.64Q191.17 165.75 188.26 168.59Q185.34 171.44 180.97 171.44ZM235.93 280.16L235.93 280.16Q226.26 280.16 219.77 278.11Q213.29 276.05 210.04 272.48Q206.80 268.90 206.80 264.27L206.80 264.27Q206.80 260.43 208.92 257.51Q211.03 254.60 215.40 252.48L215.40 252.48Q218.32 251.16 222.29 249.97L222.29 249.97L222.29 248.38Q216.86 247.45 213.68 245.00Q210.50 242.55 210.50 237.78L210.50 237.78Q210.50 233.28 213.68 230.17Q216.86 227.06 222.69 224.54L222.69 224.54L222.69 223.48Q222.55 223.48 222.55 223.48L222.55 223.48Q216.46 220.83 213.09 215.93Q209.71 211.03 209.71 204.15L209.71 204.15Q209.71 197.53 213.09 192.50Q216.46 187.46 222.55 184.75Q228.65 182.03 236.86 182.03L236.86 182.03Q242.68 182.03 247.05 183.29Q251.42 184.55 254.47 186.80L254.47 186.80Q256.72 188.65 258.18 190.64L258.18 190.64L258.97 190.64L271.15 181.24L275.79 181.90L275.79 194.88L262.15 194.88Q262.81 196.07 263.21 197.39L263.21 197.39Q264.14 200.31 264.14 203.88L264.14 203.88Q264.14 210.64 260.83 215.60Q257.51 220.57 251.49 223.35Q245.46 226.13 236.99 226.13L236.99 226.13Q231.29 226.13 226.53 224.94L226.53 224.94Q225.73 225.73 225.20 226.53L225.20 226.53Q223.88 228.51 223.88 231.16L223.88 231.16Q223.88 234.21 226.06 235.86Q228.25 237.52 233.28 237.52L233.28 237.52L249.83 237.52Q258.18 237.52 263.54 239.84Q268.90 242.15 271.42 246.19Q273.93 250.23 273.93 255.53L273.93 255.53Q273.93 260.69 271.09 265.19Q268.24 269.70 263.14 273.07Q258.04 276.45 251.09 278.30Q244.14 280.16 235.93 280.16ZM225.60 251.42L225.60 251.42Q224.67 252.35 223.88 253.28L223.88 253.28Q222.42 255.13 221.63 257.18Q220.83 259.24 220.83 261.75L220.83 261.75Q220.83 264.93 222.69 267.45Q224.54 269.96 228.38 271.35Q232.22 272.74 238.45 272.74L238.45 272.74Q245.46 272.74 250.23 271.09Q255.00 269.43 257.45 266.65Q259.90 263.87 259.90 260.43L259.90 260.43Q259.90 256.46 257.12 254.01Q254.34 251.56 248.24 251.56L248.24 251.56L231.16 251.56Q228.65 251.56 226.53 251.42L226.53 251.42Q226.00 251.42 225.60 251.42ZM236.99 219.38L236.99 219.38Q240.70 219.38 243.35 217.52Q245.99 215.67 247.32 212.16Q248.64 208.65 248.64 203.88Q248.64 199.12 247.32 195.67Q245.99 192.23 243.41 190.44Q240.83 188.65 237.12 188.65L237.12 188.65Q233.55 188.65 230.90 190.51Q228.25 192.36 226.92 195.81Q225.60 199.25 225.60 204.02Q225.60 208.78 226.92 212.23Q228.25 215.67 230.77 217.52Q233.28 219.38 236.99 219.38Z';

    private final int rotacion;
    private int anchoCuadro;
    private int altoCuadro;
    private Bitmap bitmap;

    CapaDeMarca(int rotacion) {
        this.rotacion = rotacion;
    }

    @Override
    public void configure(Size videoSize) {
        super.configure(videoSize);
        anchoCuadro = videoSize.getWidth();
        altoCuadro = videoSize.getHeight();
        bitmap = null;
    }

    @Override
    public Bitmap getBitmap(long presentationTimeUs) {
        if (bitmap != null) return bitmap;
        bitmap = Bitmap.createBitmap(Math.max(1, anchoCuadro), Math.max(1, altoCuadro), Bitmap.Config.ARGB_8888);
        dibujar(new Canvas(bitmap));
        return bitmap;
    }

    private void dibujar(Canvas c) {
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

        float altoLogo = H * 0.045f;
        float escala = altoLogo / CAJA_ALTO;
        float left = W * 0.05f;
        float top = H * 0.03f;
        float letra = H * 0.023f;

        Matrix m = new Matrix();
        m.setScale(escala, escala);
        m.postTranslate(left - CAJA_X * escala, top - CAJA_Y * escala);

        Path dibujado = new Path();
        parsearSvg(TRAZO, dibujado);
        dibujado.transform(m);

        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.FILL);

        // Halo oscuro doble -lámina 5A-.
        paint.setColor(HALO);
        paint.setShadowLayer(letra * 0.35f, 0, 0, HALO);
        c.drawPath(dibujado, paint);
        paint.setShadowLayer(letra * 0.7f, 0, 0, Color.argb(90, 0, 0, 0));
        c.drawPath(dibujado, paint);

        paint.clearShadowLayer();
        paint.setColor(BLANCO);
        c.drawPath(dibujado, paint);

        // Bola roja.
        float[] pts = new float[] { PUNTO_CX, PUNTO_CY };
        m.mapPoints(pts);
        paint.setColor(COLOR_PUNTO);
        c.drawCircle(pts[0], pts[1], PUNTO_R * escala, paint);

        // «Teleprompter» debajo del logo.
        Paint texto = new Paint(Paint.ANTI_ALIAS_FLAG);
        texto.setColor(BLANCO);
        texto.setTextSize(letra);
        Typeface tf = Typeface.create("sans-serif-medium", Typeface.NORMAL);
        if (tf == null) tf = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD);
        texto.setTypeface(tf);
        texto.setShadowLayer(letra * 0.35f, 0, 0, HALO);
        float textY = top + altoLogo + letra * 1.15f;
        c.drawText("Teleprompter", left, textY, texto);
        texto.setShadowLayer(letra * 0.7f, 0, 0, Color.argb(90, 0, 0, 0));
        c.drawText("Teleprompter", left, textY, texto);
        texto.clearShadowLayer();
        c.drawText("Teleprompter", left, textY, texto);
    }

    // Parser mínimo de path SVG: M L Q Z en mayúsculas absolutas -el trazo de Sigo-.
    static void parsearSvg(String d, Path out) {
        out.reset();
        int i = 0;
        int n = d.length();
        char cmd = ' ';
        float cx = 0, cy = 0;
        while (i < n) {
            char ch = d.charAt(i);
            if (ch == ' ' || ch == ',') { i++; continue; }
            if (ch == 'M' || ch == 'L' || ch == 'Q' || ch == 'Z' || ch == 'z') {
                cmd = ch;
                i++;
                if (cmd == 'Z' || cmd == 'z') { out.close(); continue; }
            }
            float[] nums = new float[6];
            int count = (cmd == 'Q') ? 4 : 2;
            for (int k = 0; k < count; k++) {
                while (i < n && (d.charAt(i) == ' ' || d.charAt(i) == ',')) i++;
                int start = i;
                if (i < n && (d.charAt(i) == '-' || d.charAt(i) == '+')) i++;
                while (i < n && (Character.isDigit(d.charAt(i)) || d.charAt(i) == '.')) i++;
                nums[k] = Float.parseFloat(d.substring(start, i));
            }
            if (cmd == 'M') {
                cx = nums[0]; cy = nums[1];
                out.moveTo(cx, cy);
                cmd = 'L'; // implícito
            } else if (cmd == 'L') {
                cx = nums[0]; cy = nums[1];
                out.lineTo(cx, cy);
            } else if (cmd == 'Q') {
                out.quadTo(nums[0], nums[1], nums[2], nums[3]);
                cx = nums[2]; cy = nums[3];
            }
        }
    }
}

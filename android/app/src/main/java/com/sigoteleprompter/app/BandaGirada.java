// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: la banda en el marco de quien sostiene el teléfono. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// LA BANDA, DONDE LA VE LA PERSONA -10-11-2026, orden t164u-. Lo que VentanaDePrueba hacía con WindowManager.LayoutParams
// en la pantalla -aplicarTamanoInicial, acotar, alCambiarPantalla- pasa por aquí, con la banda guardada en el marco de
// la persona -GeometriaVentana, «EL GIRO DE LA BANDA»- y la compensación de OrientacionDeVentana. Lo que sale a Android
// pasa por Ventana: dónde va la ventana en la pantalla -ponerVentana- y cómo se gira la WebView dentro -ponerVista-.
// Así el camino que usa la ventana se prueba entero en la JVM -BandaGiradaTest-, con una Ventana de prueba.
//
// Sin compensación todo da lo mismo que en d991e00: la ventana es la banda, la vista no gira y las claves son «v.»/«h.».
// Todo va en píxeles; densidad pasa a dp para la geometría A.
final class BandaGirada {
    // Lo que mide Android en el momento: la pantalla entera y el área segura, en píxeles de la pantalla.
    static final class Medida {
        final int ancho, alto, l, t, r, b;
        final float densidad;
        Medida(int ancho, int alto, int l, int t, int r, int b, float densidad) {
            this.ancho = ancho; this.alto = alto; this.l = l; this.t = t; this.r = r; this.b = b; this.densidad = densidad;
        }
        int dp(int v) { return Math.round(v * densidad); }
    }

    interface Ventana {
        // Lo que hace el giro desde el 09-11-2026, sin cambios: el arrastre termina y guarda donde quedó, la cuenta de
        // Seguir se cancela y queda en pausa, y el menú de Aa se retira.
        void terminarArrastre(String motivo);
        boolean enCuentaDeSeguir();
        void pausarPorGiro(String motivo);
        void cerrarMenuAa(String motivo);
        // {x, y, ancho, alto} guardado con esa clave, en píxeles de la persona, o null.
        int[] geometriaGuardada(String clave);
        // Lo que se aplica: la ventana en la pantalla y la vista girada dentro.
        void ponerVentana(int x, int y, int ancho, int alto);
        void ponerVista(int ancho, int alto, float grados, float dx, float dy);
        void anotar(String linea);
    }

    private int[] banda = new int[4];
    private int giro;
    private boolean deLado;

    int[] banda() { return banda.clone(); }
    int giro() { return giro; }
    boolean deLado() { return deLado; }
    String clave() { return GeometriaVentana.clave(deLado, giro); }

    // El área segura como la ve la persona, en píxeles.
    int[] seguro(Medida m) { return seguro(m, giro); }
    static int[] seguro(Medida m, int c) { return GeometriaVentana.seguroDePersona(m.l, m.t, m.r, m.b, c, m.ancho, m.alto); }

    // Al abrir: la geometría de esta orientación y compensación, aplicada.
    void abrir(Medida m, int c, Ventana v) {
        giro = GeometriaVentana.cuartos(c);
        int[] s = seguro(m);
        deLado = GeometriaVentana.esDeLado(s[0], s[1], s[2], s[3]);
        banda = tomarGeometria(m, s, v);
        acotar(m);
        aplicar(m, v);
    }

    // AL GIRAR LA PANTALLA O CAMBIAR LA COMPENSACIÓN. Antes -VentanaDePrueba.alCambiarPantalla hasta el 10-11-2026-
    // el giro era solo «de pie ↔ de lado» del área segura. Ahora es también otra compensación: la banda cambia de lado
    // sobre la pantalla aunque las medidas sean idénticas. Lo que pasa en el giro es lo mismo de antes. true si giró.
    boolean alCambiarPantalla(Medida m, int c, Ventana v) {
        int nuevo = GeometriaVentana.cuartos(c);
        int[] s = seguro(m, nuevo);
        boolean ahoraDeLado = GeometriaVentana.esDeLado(s[0], s[1], s[2], s[3]);
        boolean gira = ahoraDeLado != deLado || nuevo != this.giro;
        if (gira) {
            // Con la orientación de antes: el arrastre se guarda en la clave de antes.
            v.terminarArrastre("giro");
            if (v.enCuentaDeSeguir()) v.pausarPorGiro("giro en la cuenta");
            v.cerrarMenuAa("giro");
            int antes = this.giro;
            this.giro = nuevo;
            deLado = ahoraDeLado;
            banda = tomarGeometria(m, s, v);
            v.anotar("giro: " + (ahoraDeLado ? "de lado" : "de pie") + " compensación " + antes + " → " + nuevo);
        }
        acotar(m);
        aplicar(m, v);
        return gira;
    }

    // Sin giro: acotar a lo que hay y volver a poner -encuadrar-.
    void encuadrar(Medida m, Ventana v) {
        acotar(m);
        aplicar(m, v);
    }

    // Un toque de la pantalla, en el marco de la persona: el arrastre se mide ahí.
    float[] aPersona(float rawX, float rawY, Medida m) {
        return GeometriaVentana.puntoAPersona(rawX, rawY, giro, m.ancho, m.alto);
    }

    // El arrastre -ArrastreVentana, que ya acota al área segura de la persona- pone la esquina; la medida no cambia.
    void mover(int x, int y, Medida m, Ventana v) {
        banda[0] = x;
        banda[1] = y;
        aplicar(m, v);
    }

    // EL CAMBIO DE TAMAÑO POR LA ESQUINA -10-11-2026, orden t167u-: TamanoVentana ya acotó el ancho y el alto con la
    // esquina opuesta fija. Solo se pone si cambió algo: el dedo quieto no vuelve a poner la ventana. true si se puso.
    boolean redimensionar(int[] g, Medida m, Ventana v) {
        if (g == null || java.util.Arrays.equals(g, banda)) return false;
        int[] antes = banda.clone();
        banda = g.clone();
        acotar(m);
        if (java.util.Arrays.equals(antes, banda)) return false;
        aplicar(m, v);
        return true;
    }

    // Antes -hasta el 10-11-2026, orden t167u- la esquina también pasaba por aquí; ahora queda el 'mover' y el 'tamano'
    // de una página vieja en caché -VentanaDePrueba.recibirDePagina-. El gesto de la esquina va por redimensionar.
    // La esquina de cambio de tamaño y el 'mover' viejo: la página manda lo que avanzó el dedo en su propio marco, que
    // es el de la persona porque la WebView gira con la banda.
    void cambiar(int dx, int dy, int dw, int dh, Medida m, Ventana v) {
        banda[0] += dx; banda[1] += dy; banda[2] += dw; banda[3] += dh;
        encuadrar(m, v);
    }

    // El menú de Aa: la página lo calcula en su marco -el de la persona- y aquí se pasa a la pantalla.
    int[] aPantalla(int[] cajaDePersona, Medida m) {
        return GeometriaVentana.aPantalla(cajaDePersona, giro, m.ancho, m.alto);
    }

    float[] vista(int ancho, int alto) { return GeometriaVentana.vista(giro, ancho, alto); }

    private int[] tomarGeometria(Medida m, int[] s, Ventana v) {
        String clave = clave();
        int[] g = v.geometriaGuardada(clave);
        if (g != null && g.length == 4 && g[2] >= m.dp(GeometriaVentana.MIN_ANCHO) && g[3] >= m.dp(GeometriaVentana.MIN_ALTO)) {
            v.anotar("geometría guardada " + clave + " x=" + g[0] + " y=" + g[1]);
            return g.clone();
        }
        float d = m.densidad;
        int[] a = GeometriaVentana.inicialGirada(giro, Math.round(s[0] / d), Math.round(s[1] / d), Math.round(s[2] / d), Math.round(s[3] / d));
        v.anotar("geometría inicial A " + clave + " " + a[2] + "×" + a[3] + " dp en " + a[0] + "," + a[1]);
        return new int[] { m.dp(a[0]), m.dp(a[1]), m.dp(a[2]), m.dp(a[3]) };
    }

    private void acotar(Medida m) {
        int[] s = seguro(m);
        banda = GeometriaVentana.acotar(banda, s[0], s[1], s[2], s[3], m.dp(GeometriaVentana.MIN_ANCHO), m.dp(GeometriaVentana.MIN_ALTO));
    }

    private void aplicar(Medida m, Ventana v) {
        int[] p = GeometriaVentana.aPantalla(banda, giro, m.ancho, m.alto);
        v.ponerVentana(p[0], p[1], p[2], p[3]);
        float[] w = GeometriaVentana.vista(giro, banda[2], banda[3]);
        v.ponerVista(banda[2], banda[3], w[0], w[1], w[2]);
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Insets;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.media.AudioManager;
import android.media.AudioRecordingConfiguration;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.core.content.ContextCompat;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** La sesión nativa vive en el hilo principal, independiente de que responda la WebView. */
final class VentanaDePrueba {
    private static final Handler PRINCIPAL = new Handler(Looper.getMainLooper());
    private static volatile Sesion actual;
    private static volatile long generacion;

    static void anotar(long n, String texto) {
        Log.i("SigoFlotante", System.currentTimeMillis() + " sesion=" + n + " " + texto);
    }
    static long numero() { Sesion s = actual; return s == null ? 0 : s.numero; }
    static long numeroDeAccesibilidad(AccesibilidadDePrueba servicio) {
        Sesion s=actual;
        return s != null && s.accesibilidad == servicio ? s.numero : 0;
    }
    static boolean esActual(long n) { Sesion s = actual; return s != null && s.numero == n; }
    static boolean seEsperaServicio() {
        Sesion s=actual;
        return s != null && s.conServicio && s.servicioPedido;
    }
    static boolean esUltimaGeneracion(long n) { return generacion == n; }

    // Único trabajo en el hilo de Vosk: guardar. Ni JSON, ni sistema, ni registro, ni vistas.
    static void alOir(String evento, String json, double rms, int relevos, int sesionAudio) {
        Sesion s = actual;
        if (s == null) return;
        synchronized (s.pendientes) {
            if (!s.cerrada) s.pendientes.add(new Dato(evento, json, rms, relevos, sesionAudio));
        }
    }
    static void abrir(VentanaDePruebaPlugin plugin, boolean servicio, AccesibilidadDePrueba accesibilidad) {
        if (actual != null) {
            anotar(actual.numero, "abrir duplicado: se conserva la sesión existente");
            return;
        }
        Sesion s = new Sesion(++generacion, plugin, servicio, accesibilidad);
        actual = s;
        try { s.abrir(); }
        catch (Exception e) {
            anotar(s.numero, "abrir falló: " + e);
            s.cerrar("apertura incompleta");
            throw e;
        }
    }
    static void cerrarDelPlugin(VentanaDePruebaPlugin plugin, String motivo) {
        Sesion s = actual;
        if (s != null && s.plugin == plugin) s.cerrar(motivo);
    }
    static void cerrarNumero(long numero, String motivo) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s != null && s.numero == numero) s.cerrar(motivo);
            else anotar(numero, "cierre descartado: sesión vieja o ya cerrada, " + motivo);
        });
    }
    static void cerrarDeAccesibilidad(AccesibilidadDePrueba servicio, String motivo) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s != null && s.accesibilidad == servicio) s.cerrar(motivo);
            else anotar(0, "desconexión sin sesión de esa instancia: no cierra otra");
        });
    }
    static void reencuadrar(AccesibilidadDePrueba servicio) {
        Sesion s = actual;
        if (s != null && s.accesibilidad == servicio && s.vista != null) s.vista.encuadrar(false);
    }
    static void servicioConfirmado(long numero, boolean activo, String error) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s == null || s.numero != numero) {
                anotar(numero, "confirmación de servicio descartada: sesión cerrada o vieja, activo=" + activo + " error=" + error);
                return;
            }
            s.estadoServicio = activo ? "servicio activo" : "servicio: falló";
            anotar(numero, "micrófono " + (activo ? "activo" : "falló error=" + error));
            s.pintar(true);
        });
    }
    private static final class Dato {
        final String evento, json;
        final double rms;
        final int relevos, audio;
        final long monotono = SystemClock.elapsedRealtime();
        final long hora = System.currentTimeMillis();
        Dato(String e, String j, double r, int v, int a) { evento=e; json=j; rms=r; relevos=v; audio=a; }
    }
    private static final class Sesion {
        final long numero;
        final VentanaDePruebaPlugin plugin;
        final Context contexto;
        final boolean conServicio;
        final AccesibilidadDePrueba accesibilidad;
        final long inicio = SystemClock.elapsedRealtime();
        final ArrayDeque<Dato> pendientes = new ArrayDeque<>();
        volatile boolean cerrada;
        AudioManager audioManager;
        AudioManager.AudioRecordingCallback callback;
        List<AudioRecordingConfiguration> configuraciones;
        List<EstadoDelMicrofono.Grabacion> grabaciones;
        VentanaDePrueba vista;
        String palabras = "", hipotesis = "", estado = "", estadoServicio;
        long ultimoEvento = -1, ultimoCambio = -1, horaCambio, utiles, resumenUtiles, proximoResumen = inicio + 5000;
        long ultimaPintura = -200, ultimoCuadro = inicio, ocultaHasta;
        int sesionAudio = -1, relevos;
        double rms, nivel;
        boolean servicioPedido;

        Sesion(long n, VentanaDePruebaPlugin p, boolean servicio, AccesibilidadDePrueba a) {
            numero=n; plugin=p; contexto=p.getContext().getApplicationContext(); conServicio=servicio; accesibilidad=a;
            estadoServicio = servicio ? "servicio pedido" : "C8: sin servicio, a propósito";
        }
        boolean vigente() { return actual == this && !cerrada; }
        void abrir() {
            anotar(numero, "abrir caso=" + (accesibilidad == null ? "C0" : conServicio ? "C1-C7" : "C8")
                + " servicio=" + conServicio + " ventana=" + (accesibilidad != null));
            audioManager = (AudioManager) contexto.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) throw new IllegalStateException("No hay AudioManager para medir");
            // Mismo mecanismo de CamaraNativaPlugin.vigilarRecursos; no cierra la lectura.
            callback = new AudioManager.AudioRecordingCallback() {
                @Override public void onRecordingConfigChanged(List<AudioRecordingConfiguration> configs) {
                    if (!vigente()) { anotar(numero, "callback descartado: sesión vieja"); return; }
                    recibirConfiguraciones(configs, "callback");
                    pintar(false);
                }
            };
            audioManager.registerAudioRecordingCallback(callback, PRINCIPAL);
            consultar("inicial");
            if (conServicio) {
                anotar(numero, "micrófono pedido");
                servicioPedido = true;
                try {
                    ContextCompat.startForegroundService(contexto, new Intent(contexto, MicrofonoDePrueba.class).putExtra("sesion", numero));
                } catch (Exception e) {
                    estadoServicio = "servicio: falló";
                    anotar(numero, "micrófono falló al pedir error=" + e);
                }
            }
            if (accesibilidad != null) {
                vista = new VentanaDePrueba(this);
                vista.mostrar("mostrada");
            }
            pintar(true);
            PRINCIPAL.post(cuadro);
        }
        void consultar(String motivo) {
            try { recibirConfiguraciones(audioManager.getActiveRecordingConfigurations(), motivo); }
            catch (Exception e) {
                configuraciones = null;
                grabaciones = null;
                anotar(numero, "consulta de grabaciones falló " + motivo + " error=" + e);
            }
        }
        void recibirConfiguraciones(List<AudioRecordingConfiguration> configs, String motivo) {
            configuraciones = configs == null ? null : new ArrayList<>(configs);
            grabaciones = configs == null ? null : new ArrayList<>();
            anotar(numero, "grabaciones " + motivo + " cantidad=" + (configs == null ? "sin datos" : configs.size()));
            if (configs != null) for (AudioRecordingConfiguration c : configs) {
                int id = c.getClientAudioSessionId();
                grabaciones.add(new EstadoDelMicrofono.Grabacion(id, c.isClientSilenced()));
                anotar(numero, "grabación fuente=" + c.getClientAudioSource() + " silenciada=" + c.isClientSilenced()
                    + " audioSesion=" + id + " " + (id == sesionAudio ? "Vosk" : "ajena") + " voskSesion=" + sesionAudio);
            }
        }
        final Runnable cuadro = new Runnable() {
            @Override public void run() {
                if (!vigente()) return;
                ArrayDeque<Dato> datos;
                synchronized (pendientes) { datos = new ArrayDeque<>(pendientes); pendientes.clear(); }
                boolean huboNivel = false;
                for (Dato d : datos) {
                    if (d.audio != sesionAudio) {
                        sesionAudio = d.audio;
                        // El callback inicial puede haber llegado antes de que Vosk abriese su AudioRecord.
                        consultar("cambió sesión de Vosk=" + sesionAudio);
                    }
                    if (d.relevos != relevos) {
                        anotar(numero, "relevo " + relevos + " → " + d.relevos + " audioSesion=" + d.audio);
                        relevos = d.relevos;
                    }
                    ultimoEvento = d.monotono;
                    rms = d.rms;
                    huboNivel = true;
                    String util = UltimasPalabras.de(d.json, Integer.MAX_VALUE);
                    if (!util.isEmpty() && !util.equals(hipotesis)) {
                        hipotesis = util;
                        palabras = UltimasPalabras.de(d.json, 4);
                        ultimoCambio = d.monotono;
                        horaCambio = d.hora;
                        utiles++;
                    }
                }
                long ahora = SystemClock.elapsedRealtime();
                // Un solo reloj de sesión: al despertar del teléfono también se cumple el plazo
                // de ocultar por elapsedRealtime, sin sumar los segundos de suspensión al regreso.
                if (ocultaHasta > 0 && ahora >= ocultaHasta) devolver.run();
                if (!vigente()) return;
                double objetivo = NivelDeVoz.objetivoNivel(rms, ultimoEvento < 0 ? null : ultimoEvento, ahora);
                nivel = NivelDeVoz.suavizarNivel(nivel, objetivo, ahora - ultimoCuadro);
                if (objetivo == 0 && nivel < 0.001) nivel = 0;
                ultimoCuadro = ahora;
                pintar(false);
                if (vista != null && (huboNivel || nivel > 0 || vista.nivelMostrado != nivel)) vista.halo(nivel);
                if (ahora >= proximoResumen) {
                    anotar(numero, "resumen útilesNuevas=" + (utiles - resumenUtiles) + " útilesTotal=" + utiles
                        + " ultimoCambioEpochMs=" + horaCambio + " estado=" + estado);
                    resumenUtiles = utiles;
                    proximoResumen = ahora + 5000;
                }
                // Solo este temporizador drena Vosk y vigila el cierre real; no depende de JavaScript.
                PRINCIPAL.postDelayed(this, 16);
            }
        };
        void pintar(boolean inmediato) {
            long ahora = SystemClock.elapsedRealtime();
            String nuevo = EstadoDelMicrofono.de(ahora, ultimoEvento, sesionAudio, grabaciones);
            boolean cambio = !nuevo.equals(estado);
            if (cambio) {
                estado = nuevo;
                anotar(numero, "estado=" + estado + " voskSesion=" + sesionAudio);
            }
            if (vista != null && (inmediato || cambio || ahora - ultimaPintura >= 200)) {
                vista.pintar(ahora);
                ultimaPintura = ahora;
            }
        }
        void accion(String tipo) {
            if (!vigente()) { anotar(numero, "botón descartado: sesión vieja " + tipo); return; }
            anotar(numero, "botón " + tipo);
            if (tipo.equals("ocultar")) { ocultar(); return; }
            if (tipo.equals("cerrar")) cerrar("botón Cerrar");
            plugin.accion(numero, tipo);
        }
        final Runnable devolver = new Runnable() {
            @Override public void run() {
                if (!vigente()) { anotar(numero, "devolución descartada: sesión vieja"); return; }
                long falta = ocultaHasta - SystemClock.elapsedRealtime();
                if (falta > 0) return;
                ocultaHasta = 0;
                try { vista.mostrar("de vuelta"); pintar(true); }
                catch (Exception e) { anotar(numero, "no se pudo devolver ventana: " + e); cerrar("falló devolución"); }
            }
        };
        void ocultar() {
            vista.quitar("oculta");
            ocultaHasta = SystemClock.elapsedRealtime() + 20000;
            // El cuadro único de la sesión vigila este plazo monotónico.
        }
        void cerrar(String motivo) {
            if (!vigente()) return;
            anotar(numero, "cerrar motivo=" + motivo);
            cerrada = true;
            actual = null;
            PRINCIPAL.removeCallbacks(cuadro);
            synchronized (pendientes) { pendientes.clear(); }
            if (vista != null) vista.quitar("quitada");
            if (servicioPedido) {
                try { contexto.stopService(new Intent(contexto, MicrofonoDePrueba.class)); }
                catch (Exception e) { anotar(numero, "no se pudo parar servicio: " + e); }
            }
            if (callback != null) {
                try { audioManager.unregisterAudioRecordingCallback(callback); }
                catch (Exception e) { anotar(numero, "no se pudo soltar callback: " + e); }
                callback = null;
            }
        }
    }

    private final Sesion s;
    private final Context contexto;
    private final Resources recursos;
    private final WindowManager ventanas;
    private final LinearLayout raiz;
    private final LinearLayout acciones;
    private final TextView estado, tiempo, palabras, detalle;
    private final Button pausa, ocultar, cerrar;
    private final FrameLayout disco;
    private final View halo;
    private final WindowManager.LayoutParams posicion;
    private final Rect seguro = new Rect();
    private boolean visible, ubicada, movida;
    private int insetIzq, insetArriba, insetDer, insetAbajo;
    private double nivelMostrado = -1;

    private int medida(int id) { return recursos.getDimensionPixelSize(id); }
    private int color(int id) { return contexto.getColor(id); }
    private GradientDrawable fondo(int c, int radio, boolean canto) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color(c)); d.setCornerRadius(recursos.getDimension(radio));
        if (canto) d.setStroke(medida(R.dimen.prueba_canto_grosor), color(R.color.prueba_canto));
        return d;
    }
    private TextView texto(int letra, int tinta) {
        TextView t = new TextView(contexto);
        t.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        t.setTextSize(TypedValue.COMPLEX_UNIT_PX, recursos.getDimension(letra));
        t.setTextColor(color(tinta));
        return t;
    }
    private Button boton(String nombre, int icono) {
        Button b = new Button(contexto);
        b.setAllCaps(false);
        b.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
        b.setTextSize(TypedValue.COMPLEX_UNIT_PX, recursos.getDimension(R.dimen.prueba_cuerpo));
        b.setTextColor(color(R.color.prueba_texto));
        b.setMinHeight(medida(R.dimen.prueba_toque)); b.setMinimumHeight(medida(R.dimen.prueba_toque));
        b.setMinWidth(0); b.setMinimumWidth(0);
        b.setPadding(medida(R.dimen.prueba_aire), 0, medida(R.dimen.prueba_aire), 0);
        b.setBackground(fondo(R.color.prueba_accion, R.dimen.prueba_pildora, false));
        b.setText(nombre); b.setContentDescription(nombre);
        icono(b, icono);
        return b;
    }
    private void icono(Button b, int recurso) {
        Drawable d = recurso == 0 ? null : contexto.getDrawable(recurso).mutate();
        if (d != null) {
            int tamano = medida(R.dimen.prueba_icono);
            d.setBounds(0, 0, tamano, tamano); d.setTint(color(R.color.prueba_texto));
        }
        b.setCompoundDrawablePadding(medida(R.dimen.prueba_asa_alto));
        b.setCompoundDrawables(d, null, null, null);
    }
    private VentanaDePrueba(Sesion sesion) {
        s=sesion; contexto=s.accesibilidad; recursos=contexto.getResources(); ventanas=s.accesibilidad.ventanas();
        if (ventanas == null) throw new IllegalStateException("Accesibilidad sin WindowManager");
        raiz = new LinearLayout(contexto);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setPadding(medida(R.dimen.prueba_relleno), medida(R.dimen.prueba_aire), medida(R.dimen.prueba_relleno), medida(R.dimen.prueba_relleno));
        raiz.setBackground(fondo(R.color.prueba_suelo, R.dimen.prueba_radio, true));
        raiz.setElevation(recursos.getDimension(R.dimen.prueba_elevacion));
        LinearLayout cabeceraMovible = new LinearLayout(contexto);
        cabeceraMovible.setOrientation(LinearLayout.VERTICAL);
        cabeceraMovible.setContentDescription("Mover la ventana");
        cabeceraMovible.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        View asa = new View(contexto);
        asa.setBackground(fondo(R.color.prueba_asa, R.dimen.prueba_pildora, false));
        LinearLayout.LayoutParams asaLugar = new LinearLayout.LayoutParams(medida(R.dimen.prueba_asa_ancho), medida(R.dimen.prueba_asa_alto));
        asaLugar.gravity = Gravity.CENTER_HORIZONTAL;
        cabeceraMovible.addView(asa, asaLugar);
        LinearLayout cabecera = new LinearLayout(contexto);
        cabecera.setGravity(Gravity.CENTER_VERTICAL);
        cabeceraMovible.addView(cabecera, new LinearLayout.LayoutParams(-1, 0, 1));
        raiz.addView(cabeceraMovible, new LinearLayout.LayoutParams(-1, medida(R.dimen.prueba_toque)));
        disco = new FrameLayout(contexto);
        disco.setClipChildren(false); disco.setClipToPadding(false);
        int tamano = medida(R.dimen.prueba_disco_tamano), aireHalo = medida(R.dimen.prueba_halo_aire);
        halo = new View(contexto);
        halo.setBackground(fondo(R.color.prueba_halo, R.dimen.prueba_pildora, false));
        FrameLayout.LayoutParams haloLugar = new FrameLayout.LayoutParams(tamano + 2 * aireHalo, tamano + 2 * aireHalo);
        haloLugar.leftMargin=-aireHalo; haloLugar.topMargin=-aireHalo;
        disco.addView(halo, haloLugar);
        View base = new View(contexto);
        base.setBackground(fondo(R.color.prueba_disco, R.dimen.prueba_pildora, true));
        disco.addView(base, new FrameLayout.LayoutParams(-1, -1));
        ImageView microfono = new ImageView(contexto);
        microfono.setImageResource(R.drawable.prueba_microfono); microfono.setColorFilter(color(R.color.prueba_verde));
        disco.addView(microfono, new FrameLayout.LayoutParams(medida(R.dimen.prueba_microfono_tamano), medida(R.dimen.prueba_microfono_tamano), Gravity.CENTER));
        LinearLayout.LayoutParams discoLugar = new LinearLayout.LayoutParams(tamano, tamano);
        discoLugar.rightMargin=medida(R.dimen.prueba_aire);
        cabecera.addView(disco, discoLugar);
        estado = texto(R.dimen.prueba_meta, R.color.prueba_texto);
        cabecera.addView(estado, new LinearLayout.LayoutParams(0, -2, 1));
        tiempo = texto(R.dimen.prueba_meta, R.color.prueba_apagado);
        tiempo.setFontFeatureSettings("tnum");
        cabecera.addView(tiempo);
        // El centro puede desplazarse con letra grande; las acciones quedan fuera del ScrollView.
        ScrollView centro = new ScrollView(contexto);
        LinearLayout contenido = new LinearLayout(contexto); contenido.setOrientation(LinearLayout.VERTICAL);
        palabras = texto(R.dimen.prueba_palabras, R.color.prueba_sugerencia);
        palabras.setMinLines(2);
        palabras.setLineSpacing(0, recursos.getInteger(R.integer.prueba_interlineado_decimas) / 10f);
        contenido.addView(palabras, new LinearLayout.LayoutParams(-1, -2));
        detalle = texto(R.dimen.prueba_meta, R.color.prueba_apagado);
        detalle.setSingleLine(true);
        android.widget.HorizontalScrollView linea = new android.widget.HorizontalScrollView(contexto);
        linea.setHorizontalScrollBarEnabled(true); linea.addView(detalle);
        contenido.addView(linea, new LinearLayout.LayoutParams(-1, -2));
        centro.addView(contenido);
        raiz.addView(centro, new LinearLayout.LayoutParams(-1, 0, 1));
        acciones = new LinearLayout(contexto); acciones.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams accionesLugar = new LinearLayout.LayoutParams(-1, -2);
        accionesLugar.topMargin=medida(R.dimen.prueba_aire);
        raiz.addView(acciones, accionesLugar);
        pausa=boton("Seguir", R.drawable.prueba_empezar);
        ocultar=boton("Ocultar 20 s", 0); cerrar=boton("Cerrar", R.drawable.prueba_cerrar);
        pausa.setOnClickListener(v -> s.accion("alternar"));
        ocultar.setOnClickListener(v -> s.accion("ocultar"));
        cerrar.setOnClickListener(v -> s.accion("cerrar"));
        posicion = new WindowManager.LayoutParams(1, -2, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
            | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT);
        posicion.gravity=Gravity.TOP | Gravity.LEFT;
        // Las coordenadas ya descuentan barras y recorte; el sistema no debe sumarlos otra vez.
        posicion.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        if (Build.VERSION.SDK_INT >= 30) posicion.setFitInsetsTypes(0);
        cabeceraMovible.setOnTouchListener(new View.OnTouchListener() {
            float x, y; int px, py;
            @Override public boolean onTouch(View v, MotionEvent e) {
                if (!s.vigente()) return false;
                if (e.getActionMasked() == MotionEvent.ACTION_DOWN) {
                    x=e.getRawX(); y=e.getRawY(); px=posicion.x; py=posicion.y;
                    anotar(s.numero, "asa: empezar arrastre"); return true;
                }
                if (e.getActionMasked() == MotionEvent.ACTION_MOVE) {
                    movida=true;
                    posicion.x=px + Math.round(e.getRawX()-x); posicion.y=py + Math.round(e.getRawY()-y);
                    limitar(); actualizarLugar(); return true;
                }
                if (e.getActionMasked() == MotionEvent.ACTION_UP) { v.performClick(); return true; }
                return e.getActionMasked() == MotionEvent.ACTION_CANCEL;
            }
        });
        raiz.setOnApplyWindowInsetsListener((v, insets) -> {
            insetIzq=insets.getSystemWindowInsetLeft(); insetArriba=insets.getSystemWindowInsetTop();
            insetDer=insets.getSystemWindowInsetRight(); insetAbajo=insets.getSystemWindowInsetBottom();
            if (insets.getDisplayCutout() != null) {
                insetIzq=Math.max(insetIzq, insets.getDisplayCutout().getSafeInsetLeft());
                insetArriba=Math.max(insetArriba, insets.getDisplayCutout().getSafeInsetTop());
                insetDer=Math.max(insetDer, insets.getDisplayCutout().getSafeInsetRight());
                insetAbajo=Math.max(insetAbajo, insets.getDisplayCutout().getSafeInsetBottom());
            }
            encuadrar(!movida); return insets;
        });
        raiz.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob) -> {
            if (b-t != ob-ot || r-l != or-ol) { limitar(); actualizarLugar(); }
        });
    }
    void mostrar(String motivo) {
        if (!s.vigente() || visible) return;
        encuadrar(!ubicada);
        ventanas.addView(raiz, posicion); visible=true; ubicada=true;
        raiz.requestApplyInsets();
        halo(s.nivel);
        anotar(s.numero, "ventana " + motivo);
    }
    void quitar(String motivo) {
        halo.animate().cancel();
        if (visible) {
            try { ventanas.removeViewImmediate(raiz); }
            catch (Exception e) { anotar(s.numero, "quitar ventana falló: " + e); }
            visible=false;
        }
        anotar(s.numero, "ventana " + motivo);
    }
    void encuadrar(boolean inicial) {
        Rect pantalla = new Rect();
        if (Build.VERSION.SDK_INT >= 30) {
            android.view.WindowMetrics metricas = ventanas.getMaximumWindowMetrics();
            pantalla.set(metricas.getBounds());
            Insets i = metricas.getWindowInsets().getInsetsIgnoringVisibility(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            seguro.set(pantalla.left+i.left, pantalla.top+i.top, pantalla.right-i.right, pantalla.bottom-i.bottom);
        } else {
            DisplayMetrics m = new DisplayMetrics(); ventanas.getDefaultDisplay().getRealMetrics(m);
            pantalla.set(0, 0, m.widthPixels, m.heightPixels);
            seguro.set(insetIzq, insetArriba, m.widthPixels-insetDer, m.heightPixels-insetAbajo);
        }
        int margen = medida(R.dimen.prueba_margen);
        posicion.width = Math.max(1, Math.min(medida(R.dimen.prueba_ancho), seguro.width()-2*margen));
        distribuirAcciones(posicion.width - 2*medida(R.dimen.prueba_relleno));
        // WRAP_CONTENT hasta el alto útil; si crece la letra, solo el centro se desplaza.
        raiz.measure(View.MeasureSpec.makeMeasureSpec(posicion.width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(Math.max(1, seguro.height()-2*margen), View.MeasureSpec.AT_MOST));
        posicion.height=Math.min(raiz.getMeasuredHeight(), Math.max(1, seguro.height()-2*margen));
        if (inicial) { posicion.x=seguro.left+(seguro.width()-posicion.width)/2; posicion.y=seguro.top+margen; }
        limitar(); actualizarLugar();
    }
    private void limitar() {
        int margen=medida(R.dimen.prueba_margen);
        posicion.x=Math.max(seguro.left, Math.min(posicion.x, seguro.right-posicion.width));
        posicion.y=Math.max(seguro.top+margen, Math.min(posicion.y, seguro.bottom-Math.max(raiz.getHeight(), posicion.height)));
    }
    private void actualizarLugar() {
        if (!visible || !s.vigente()) return;
        try { ventanas.updateViewLayout(raiz, posicion); }
        catch (Exception e) { anotar(s.numero, "mover ventana falló: " + e); s.cerrar("falló WindowManager"); }
    }
    private void distribuirAcciones(int ancho) {
        int suma=0, aire=medida(R.dimen.prueba_aire);
        Button[] botones={pausa, ocultar, cerrar};
        int[] anchos=new int[3];
        for (int i=0; i<botones.length; i++) {
            Button b=botones[i];
            b.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
            anchos[i]=b.getMeasuredWidth(); suma+=anchos[i];
            if (b.getParent() != null) ((ViewGroup)b.getParent()).removeView(b);
        }
        acciones.removeAllViews();
        if (suma+2*aire <= ancho) {
            filaDeAcciones(botones, anchos, 0, 3, ancho, false);
        } else {
            // A lo sumo dos filas. Con letra enorme, la segunda reparte el ancho y el texto
            // crece dentro del botón: Cerrar no queda en una tercera fila fuera del área útil.
            int corte=anchos[0]+aire+anchos[1] <= ancho ? 2 : 1;
            filaDeAcciones(botones, anchos, 0, corte, ancho, false);
            filaDeAcciones(botones, anchos, corte, 3, ancho, true);
        }
    }
    private void filaDeAcciones(Button[] botones, int[] anchos, int desde, int hasta, int ancho, boolean segunda) {
        int aire=medida(R.dimen.prueba_aire), suma=aire*(hasta-desde-1);
        for (int i=desde; i<hasta; i++) suma+=anchos[i];
        LinearLayout fila=new LinearLayout(contexto);
        LinearLayout.LayoutParams filaLugar=new LinearLayout.LayoutParams(-1,-2);
        if (segunda) filaLugar.topMargin=aire;
        acciones.addView(fila, filaLugar);
        for (int i=desde; i<hasta; i++) {
            LinearLayout.LayoutParams lugar=suma > ancho
                ? new LinearLayout.LayoutParams(0,-2,1)
                : new LinearLayout.LayoutParams(Math.min(ancho,anchos[i]),-2);
            if (i>desde) lugar.leftMargin=aire;
            fila.addView(botones[i],lugar);
        }
    }
    void pintar(long ahora) {
        boolean disponible=EstadoDelMicrofono.DISPONIBLE.equals(s.estado);
        disco.setVisibility(disponible ? View.VISIBLE : View.GONE);
        estado.setText(s.estado);
        boolean silenciado=EstadoDelMicrofono.SILENCIADO.equals(s.estado);
        estado.setBackground(silenciado ? fondo(R.color.prueba_aviso_fondo, R.dimen.prueba_pildora, false) : null);
        int relleno=silenciado ? medida(R.dimen.prueba_asa_alto) : 0;
        estado.setPadding(relleno,relleno,relleno,relleno);
        estado.setTextColor(color(silenciado ? R.color.prueba_aviso_texto : R.color.prueba_texto));
        long segundos=(ahora-s.inicio)/1000;
        tiempo.setText(String.format(Locale.ROOT, "%02d:%02d", segundos/60, segundos%60));
        palabras.setText(s.palabras.isEmpty() ? "Esperando voz…" : s.palabras);
        palabras.setTextColor(color(s.palabras.isEmpty() ? R.color.prueba_sugerencia : R.color.prueba_texto));
        String db=s.rms > 0 ? String.format(Locale.ROOT,"%.0f",20*Math.log10(s.rms)).replace('-', '−') : "−∞";
        detalle.setText("voz " + db + " dB · relevos " + s.relevos + " · cambió hace "
            + (s.ultimoCambio < 0 ? "—" : (ahora-s.ultimoCambio)/1000) + " s · " + s.estadoServicio);
        String nombre=EstadoDelMicrofono.PAUSA.equals(s.estado) ? "Seguir" : "Pausa";
        if (!nombre.contentEquals(pausa.getText())) {
            pausa.setText(nombre); pausa.setContentDescription(nombre);
            icono(pausa, nombre.equals("Seguir") ? R.drawable.prueba_empezar : R.drawable.prueba_pausa);
            encuadrar(false);
        }
    }
    void halo(double nivel) {
        nivelMostrado=nivel;
        float escala=ValueAnimator.areAnimatorsEnabled() ? 1+(float)nivel*0.35f : 1;
        halo.setScaleX(escala); halo.setScaleY(escala); halo.setAlpha(0.35f+(float)nivel*0.65f);
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: la lectura de Sigo sobre otra app, siguiendo la voz mientras esa app graba. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.res.Resources;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Rect;
import android.media.AudioManager;
import android.media.AudioRecordingConfiguration;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.view.WindowMetrics;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSObject;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.json.JSONObject;

final class VentanaDePrueba {
    static final String ORIGEN = "https://appassets.androidplatform.net";
    static final String URL_PAGINA = ORIGEN + "/flotante.html";
    static final String PREFS = "sigo_flotante";

    private static final Handler PRINCIPAL = new Handler(Looper.getMainLooper());
    private static volatile Sesion actual;
    private static volatile long generacion;
    private static volatile boolean volvioSolo;
    private static volatile String paginaAjustes = "";

    static void anotar(long n, String texto) {
        Log.i("SigoFlotante", System.currentTimeMillis() + " sesion=" + n + " " + texto);
    }
    static long numero() { Sesion s = actual; return s == null ? 0 : s.numero; }
    static long numeroDeAccesibilidad(AccesibilidadDePrueba servicio) {
        Sesion s = actual;
        return s != null && s.accesibilidad == servicio ? s.numero : 0;
    }
    static boolean esActual(long n) { Sesion s = actual; return s != null && s.numero == n; }
    static boolean seEsperaServicio() {
        Sesion s = actual;
        return s != null && s.conServicio && s.servicioPedido;
    }
    static boolean esUltimaGeneracion(long n) { return generacion == n; }
    static boolean volvioSolo() { return volvioSolo; }
    static String paginaAjustes() { return paginaAjustes; }
    static void marcarPaginaAjustes(String p) { paginaAjustes = p == null ? "" : p; }
    static void marcarVolvioSolo(boolean v) { volvioSolo = v; }
    // Sigo se trae al frente SOLO si la persona acaba de ir a activar el servicio desde la hoja. Sin esta
    // marca, onServiceConnected traía Sigo cada vez que Android conectaba la accesibilidad: también al
    // encender el teléfono o al revivir el proceso -revisión del 957fc97, 08-11-2026-.
    private static volatile boolean esperandoActivacion;
    static void marcarEsperandoActivacion(boolean v) { esperandoActivacion = v; }
    static boolean tomarEsperandoActivacion() { boolean v = esperandoActivacion; esperandoActivacion = false; return v; }

    static boolean intentarTraerSigo(Context ctx) {
        try {
            Intent i = new Intent(ctx, MainActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            ctx.startActivity(i);
            anotar(numero(), "Sigo traído al frente");
            return true;
        } catch (Exception e) {
            anotar(numero(), "no se pudo traer Sigo: " + e);
            return false;
        }
    }

    static void alOir(String evento, String json, double rms, int relevos, int sesionAudio) {
        Sesion s = actual;
        if (s == null) return;
        synchronized (s.pendientes) {
            if (!s.cerrada) s.pendientes.add(new Dato(evento, json, rms, relevos, sesionAudio));
        }
    }

    static void abrir(VentanaDePruebaPlugin plugin, boolean servicio, AccesibilidadDePrueba accesibilidad) {
        if (accesibilidad != null && !WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            anotar(0, "WEB_MESSAGE_LISTENER no disponible");
            throw new IllegalStateException("Este teléfono no puede abrir la ventana flotante.");
        }
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
            throw e instanceof RuntimeException ? (RuntimeException) e : new RuntimeException(e);
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
    // Antes -hasta el 08-11-2026-: if (s != null && s.accesibilidad == servicio) s.encuadrar();
    static void reencuadrar(AccesibilidadDePrueba servicio) {
        Sesion s = actual;
        if (s != null && s.accesibilidad == servicio) s.alCambiarPantalla();
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

    // AL HILO PRINCIPAL -revisión del 957fc97, 08-11-2026-. Llega desde el plugin, en el hilo CapacitorPlugins, y la
    // WebView solo acepta llamadas del principal. Medido en el g86: cada estado -la cuenta, la pausa- fallaba con
    // «A WebView method was called on thread 'CapacitorPlugins'» y la ventana nunca lo recibía. El contrato pasaba
    // de casualidad, porque llegaba antes de que cargara la página y se mandaba desde onPageFinished.
    // Antes: Sesion s = actual; if (s != null) s.enviar(json);
    // Antes -2026-11-09-: if (s != null) s.enviar(json);
    // Motivo: mientras la ventana está abierta la sesión la manda Android. Del contrato se toma el límite y, después de
    // la cuenta de Empezar, los estados de Sigo ya no pasan -ver Sesion.deSigo-.
    static void enviarAPagina(String json) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s != null && s.deSigo(json)) s.enviar(json);
        });
    }

    // LA RESPUESTA DE VOSK A SEGUIR -9-nov-2026, orden «Tres correcciones», fallo 2-. Llega del hilo de los plugins
    // -VoskNativoPlugin.reanudarParaVentana- con el intento que se pidió al terminar la cuenta y la captura abierta, o 0
    // con el motivo. Si la sesión ya no está, la captura que alcanzó a abrirse se suelta: es de esta sesión cerrada.
    static void aperturaDelMicrofono(long numero, long intento, long captura, String error) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s != null && s.numero == numero && !s.cerrada) {
                s.alAbrirMicrofono(intento, captura, error);
                return;
            }
            anotar(numero, "apertura del micrófono descartada: sesión cerrada o vieja, intento=" + intento + " captura=" + captura);
            if (captura != 0) VoskNativoPlugin.liberarCaptura(numero, captura, "apertura tardía de una sesión cerrada");
        });
    }

    // EL ESTADO DE LA SESIÓN, PARA LA VUELTA A SIGO -09-11-2026-. La página de Sigo lo pide al volver: la pausa, los
    // segundos leídos sin pausas, si llegó al límite y el marcador. Si la ventana sigue abierta se mide ahora; si ya se
    // cerró, es lo que quedó al cerrar.
    private static volatile JSObject ultimoEstadoSesion;
    static void estadoSesion(java.util.function.Consumer<JSObject> responder) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            JSObject o = s != null ? s.estadoDeLaSesion(true) : ultimoEstadoSesion;
            if (o == null) { o = new JSObject(); o.put("hay", false); }
            responder.accept(o);
        });
    }

    static JSObject preferencias(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSObject o = new JSObject();
        if (p.contains("transparencia")) o.put("transparencia", p.getInt("transparencia", 0));
        if (p.contains("fontSize")) o.put("fontSize", p.getInt("fontSize", 24));
        if (p.contains("x")) o.put("x", p.getInt("x", 0));
        if (p.contains("y")) o.put("y", p.getInt("y", 0));
        if (p.contains("w")) o.put("w", p.getInt("w", 0));
        if (p.contains("h")) o.put("h", p.getInt("h", 0));
        return o;
    }
    // EL ANCHO DE LA BANDA QUE SE VA A ABRIR, PARA LA MUESTRA DE LA PREPARACIÓN -09-11-2026-. Lo que se ve en la hoja es
    // lo que se leerá: el mismo ancho de columna, con la misma regla que aplicarTamanoInicial -la guardada de esa
    // orientación o la inicial de A-. Se mide con la ventana de Sigo, que está a la vista al preparar.
    static int anchoDeLaBandaDp(android.app.Activity actividad) {
        if (actividad == null) return 0;
        Resources r = actividad.getResources();
        float d = r.getDisplayMetrics().density;
        Rect b;
        if (Build.VERSION.SDK_INT >= 30) {
            WindowMetrics wm = actividad.getWindowManager().getCurrentWindowMetrics();
            b = new Rect(wm.getBounds());
            android.graphics.Insets ins = wm.getWindowInsets().getInsets(
                WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars() | WindowInsets.Type.displayCutout());
            b.left += ins.left; b.top += ins.top; b.right -= ins.right; b.bottom -= ins.bottom;
        } else {
            DisplayMetrics m = r.getDisplayMetrics();
            b = new Rect(0, 0, m.widthPixels, m.heightPixels);
        }
        String o = b.width() > b.height() ? "h." : "v.";
        SharedPreferences p = actividad.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int guardado = p.getInt(o + "w", 0);
        if (p.contains(o + "x") && guardado >= Math.round(GeometriaVentana.MIN_ANCHO * d)) return Math.round(guardado / d);
        int[] g = GeometriaVentana.inicial(Math.round(b.left / d), Math.round(b.top / d), Math.round(b.right / d), Math.round(b.bottom / d));
        return g[2];
    }

    static void guardarPreferencias(Context ctx, JSObject o) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        if (o.has("transparencia")) e.putInt("transparencia", o.optInt("transparencia"));
        if (o.has("fontSize")) e.putInt("fontSize", o.optInt("fontSize"));
        if (o.has("x")) e.putInt("x", o.optInt("x"));
        if (o.has("y")) e.putInt("y", o.optInt("y"));
        if (o.has("w")) e.putInt("w", o.optInt("w"));
        if (o.has("h")) e.putInt("h", o.optInt("h"));
        e.apply();
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
        final Resources recursos;
        final boolean conServicio;
        final AccesibilidadDePrueba accesibilidad;
        final long inicio = SystemClock.elapsedRealtime();
        final ArrayDeque<Dato> pendientes = new ArrayDeque<>();
        final ArrayDeque<String> colaPagina = new ArrayDeque<>();
        volatile boolean cerrada;
        AudioManager audioManager;
        AudioManager.AudioRecordingCallback callback;
        List<AudioRecordingConfiguration> configuraciones;
        List<EstadoDelMicrofono.Grabacion> grabaciones;
        WebView web;
        WindowManager ventanas;
        WindowManager.LayoutParams posicion;
        BroadcastReceiver receptorPantalla;
        String hipotesis = "", estado = "", estadoServicio, ultimoJsonTexto = "";
        long ultimoEvento = -1, horaCambio, utiles, resumenUtiles, proximoResumen = inicio + 5000;
        long ultimaPintura = -200, ultimoCuadro = inicio, ultimoToken;
        int sesionAudio = -1, relevos, eventos, resumenEventos, eventosConTexto, resumenConTexto;
        double rms;
        boolean servicioPedido, paginaLista;
        // EL MENÚ DE Aa EN SU PROPIA VENTANA -09-11-2026, banda A-. Ver abrirMenuAa.
        WebView menuWeb;
        WindowManager.LayoutParams menuPos;
        boolean menuPuesto, menuLista;
        final ArrayDeque<String> colaMenu = new ArrayDeque<>();
        // La orientación con que se puso la geometría: al girar, cada orientación tiene la suya.
        boolean deLado;
        // EL ARRASTRE POR EL ASA -09-11-2026-: lo mide lo nativo, en la pantalla. Ver ArrastreVentana y alTocarBanda.
        final ArrastreVentana arrastre = new ArrastreVentana();
        // Dónde estaba el menú de Aa respecto de la ventana al empezar: se mueve con ella, en el mismo paso.
        int menuDx, menuDy;
        // LA SESIÓN LA MANDA ANDROID -09-11-2026-. Ver SesionVentana: la pausa, la cuenta 3-2-1 de Seguir y el límite
        // gratis. La página de Sigo queda atrás y deja de correr al minuto: no puede ni pausar ni contar.
        SesionVentana reglas = new SesionVentana(false, 0, 0, 0);
        boolean cuentaInicialVista;
        String limiteVisible = "ninguno";
        final Runnable pasoCuenta = new Runnable() {
            @Override public void run() { darPasoDeCuenta(); }
        };
        // -9-nov-2026, orden «Tres correcciones»- El cierre común, una vez -CierreDeSesion-, y si la última apertura
        // del micrófono de Seguir falló: la ventana lo dice con su aviso de micrófono -'micro', avisoMicrofonoQuitado-
        // hasta el próximo Seguir.
        final CierreDeSesion cierre = new CierreDeSesion();
        boolean microFallo;

        Sesion(long n, VentanaDePruebaPlugin p, boolean servicio, AccesibilidadDePrueba a) {
            numero=n; plugin=p; contexto=p.getContext().getApplicationContext();
            recursos=contexto.getResources(); conServicio=servicio; accesibilidad=a;
            estadoServicio = servicio ? "servicio pedido" : "sin servicio";
        }
        boolean vigente() { return actual == this && !cerrada; }
        int dp(int v) { return Math.round(v * recursos.getDisplayMetrics().density); }

        void abrir() {
            anotar(numero, "abrir ventana=" + (accesibilidad != null) + " servicio=" + conServicio);
            audioManager = (AudioManager) contexto.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) throw new IllegalStateException("No hay AudioManager para medir");
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
            if (accesibilidad != null) mostrarWeb();
            receptorPantalla = new BroadcastReceiver() {
                @Override public void onReceive(Context c, Intent i) {
                    if (Intent.ACTION_SCREEN_OFF.equals(i.getAction()) && vigente()) {
                        // Antes -2026-11-09-: anotar(numero, "pantalla apagada: se pide pausa y se guarda el marcador token=" + ultimoToken);
                        // Antes -2026-11-09-: plugin.accion(numero, "pausa", ultimoToken);
                        // Motivo: la pausa la hace Android -la página de Sigo puede estar dormida-. Al encender, no sigue sola.
                        anotar(numero, "pantalla apagada: pausa en Android token=" + ultimoToken);
                        pausarEnAndroid("pantalla apagada");
                    }
                }
            };
            contexto.registerReceiver(receptorPantalla, new IntentFilter(Intent.ACTION_SCREEN_OFF));
            pintar(true);
            PRINCIPAL.post(cuadro);
        }

        // Antes -2026-11-09-: @SuppressLint("SetJavaScriptEnabled"). Motivo: ahora la banda tiene un OnTouchListener que
        // solo mira -devuelve false-; los clics siguen siendo de la página.
        @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
        void mostrarWeb() {
            ventanas = accesibilidad.ventanas();
            if (ventanas == null) throw new IllegalStateException("El servicio de accesibilidad no tiene WindowManager");
            web = new WebView(accesibilidad);
            web.setBackgroundColor(Color.TRANSPARENT);
            web.setOverScrollMode(View.OVER_SCROLL_NEVER);
            WebSettings ajustes = web.getSettings();
            ajustes.setJavaScriptEnabled(true);
            ajustes.setDomStorageEnabled(true);
            ajustes.setAllowFileAccess(false);
            ajustes.setAllowContentAccess(false);
            WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(accesibilidad);
            WebViewAssetLoader cargador = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/", path -> {
                    String rel = path.startsWith("/") ? path.substring(1) : path;
                    return assets.handle("public/" + rel);
                })
                .build();
            web.setWebViewClient(new WebViewClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                    return cargador.shouldInterceptRequest(req.getUrl());
                }
                // LA COLA SE VACÍA CUANDO LA PÁGINA DICE «listo», NO AL TERMINAR DE CARGAR -revisión del 957fc97,
                // 08-11-2026-. En el g86 la carga terminó a las 12.234 y la página puso su oyente de mensajes recién
                // a las 12.256 -React lo pone después de dibujar-: el contrato, con el guion, se mandó en ese hueco y
                // se perdió, y la ventana quedó vacía. Antes: aquí paginaLista = true y se vaciaba colaPagina.
                @Override public void onPageFinished(WebView view, String url) {
                    anotar(numero, "página cargada");
                }
                @Override public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError error) {
                    if (req.isForMainFrame()) {
                        anotar(numero, "WebView no pudo abrir la página: " + error.getDescription());
                    }
                }
            });
            WebViewCompat.addWebMessageListener(web, "sigo", Collections.singleton(ORIGEN),
                (view, message, sourceOrigin, isMainFrame, reply) -> {
                    String data = message.getData();
                    PRINCIPAL.post(() -> recibirDePagina(data));
                });
            // -09-11-2026- Los toques de la banda, para el arrastre: devuelve false y la página los recibe todos igual.
            web.setOnTouchListener((v, ev) -> {
                alTocarBanda(ev);
                return false;
            });
            posicion = new WindowManager.LayoutParams(
                dp(240), dp(180),
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                // Sin foco: la ventana recibe sus toques, pero el Atrás y el teclado siguen siendo de la app que
                // graba. 6ec9ddb la tenía; 957fc97 la sacó. Antes -957fc97-: FLAG_NOT_TOUCH_MODAL | FLAG_LAYOUT_IN_SCREEN.
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                    // Antes -2026-11-09-: | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    // Motivo: con la ventana abierta la pantalla no se apaga sola -FLAG_KEEP_SCREEN_ON-.
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT);
            posicion.gravity = Gravity.TOP | Gravity.START;
            aplicarTamanoInicial();
            try {
                ventanas.addView(web, posicion);
                anotar(numero, "ventana mostrada w=" + posicion.width + " h=" + posicion.height
                    + " x=" + posicion.x + " y=" + posicion.y);
            } catch (Exception e) {
                anotar(numero, "pantalla protegida u overlay bloqueado: " + e);
                throw new IllegalStateException("No se pudo mostrar la ventana sobre otras apps.");
            }
            web.loadUrl(URL_PAGINA);
        }

        // LA BANDA A AL ABRIR -09-11-2026-. La geometría sale de GeometriaVentana, en dp, y cada orientación guarda la
        // suya: «v.» de pie y «h.» de lado. Así, al girar, la ventana vuelve a la banda de esa orientación -la inicial
        // o la que la persona dejó- en vez de estirar la de la otra. Las claves sin prefijo -x, y, w, h- eran de la
        // ventana anterior a A y ya no se leen: traerían 358 × 264 sobre la fila de iconos de la Cámara.
        // Antes -hasta el 08-11-2026-:
        // void aplicarTamanoInicial() {
        //     Rect seguro = areaSegura();
        //     SharedPreferences p = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        //     int ancho = p.getInt("w", 0);
        //     int alto = p.getInt("h", 0);
        //     if (ancho < dp(240) || alto < dp(180)) {
        //         ancho = Math.min(dp(480), Math.max(dp(240), seguro.width() - dp(32)));
        //         alto = Math.max(dp(180), seguro.height() / 3);
        //     }
        //     posicion.width = ancho;
        //     posicion.height = alto;
        //     if (p.contains("x") && p.contains("y")) {
        //         posicion.x = p.getInt("x", seguro.left);
        //         posicion.y = p.getInt("y", seguro.top);
        //     } else {
        //         posicion.x = seguro.left + Math.max(0, (seguro.width() - ancho) / 2);
        //         posicion.y = seguro.top + dp(8);
        //     }
        //     acotar();
        // }
        void aplicarTamanoInicial() {
            Rect seguro = areaSegura();
            deLado = seguro.width() > seguro.height();
            String o = deLado ? "h." : "v.";
            SharedPreferences p = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            if (p.contains(o + "x") && p.contains(o + "y") && p.getInt(o + "w", 0) >= dp(GeometriaVentana.MIN_ANCHO)
                && p.getInt(o + "h", 0) >= dp(GeometriaVentana.MIN_ALTO)) {
                posicion.x = p.getInt(o + "x", seguro.left);
                posicion.y = p.getInt(o + "y", seguro.top);
                posicion.width = p.getInt(o + "w", 0);
                posicion.height = p.getInt(o + "h", 0);
                anotar(numero, "geometría guardada " + o + " x=" + posicion.x + " y=" + posicion.y);
            } else {
                float d = recursos.getDisplayMetrics().density;
                int[] g = GeometriaVentana.inicial(Math.round(seguro.left / d), Math.round(seguro.top / d),
                    Math.round(seguro.right / d), Math.round(seguro.bottom / d));
                posicion.x = dp(g[0]); posicion.y = dp(g[1]);
                posicion.width = dp(g[2]); posicion.height = dp(g[3]);
                anotar(numero, "geometría inicial A " + o + " " + g[2] + "×" + g[3] + " dp en " + g[0] + "," + g[1]);
            }
            acotar();
        }

        Rect areaSegura() {
            if (Build.VERSION.SDK_INT >= 30 && ventanas != null) {
                WindowMetrics wm = ventanas.getCurrentWindowMetrics();
                Rect b = new Rect(wm.getBounds());
                android.graphics.Insets ins = wm.getWindowInsets().getInsets(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars() | WindowInsets.Type.displayCutout());
                b.left += ins.left; b.top += ins.top; b.right -= ins.right; b.bottom -= ins.bottom;
                return b;
            }
            DisplayMetrics m = recursos.getDisplayMetrics();
            Rect b = new Rect(0, 0, m.widthPixels, m.heightPixels);
            int id = recursos.getIdentifier("status_bar_height", "dimen", "android");
            if (id > 0) b.top += recursos.getDimensionPixelSize(id);
            return b;
        }

        // El acotado vive en GeometriaVentana -el mismo, ahora probado en la JVM-; aquí va en píxeles.
        // Antes -hasta el 08-11-2026-: las cuatro líneas de Math.max/Math.min, copiadas en el comentario de
        // GeometriaVentana.acotar.
        void acotar() {
            if (posicion == null) return;
            Rect seguro = areaSegura();
            int[] g = GeometriaVentana.acotar(new int[] { posicion.x, posicion.y, posicion.width, posicion.height },
                seguro.left, seguro.top, seguro.right, seguro.bottom, dp(GeometriaVentana.MIN_ANCHO), dp(GeometriaVentana.MIN_ALTO));
            posicion.x = g[0]; posicion.y = g[1]; posicion.width = g[2]; posicion.height = g[3];
        }

        // Antes -hasta el 08-11-2026- no avisaba a la página: ahora la página sabe dónde está, para poner el menú de
        // Aa afuera de la ventana y pegado a Aa.
        void encuadrar() {
            if (web == null || posicion == null || ventanas == null || !web.isAttachedToWindow()) return;
            acotar();
            try { ventanas.updateViewLayout(web, posicion); }
            catch (Exception e) { anotar(numero, "no se pudo reencuadrar: " + e); }
            enviarGeometria();
        }

        // AL GIRAR -09-11-2026-. El menú de Aa se retira: lo puso la página para la orientación anterior y quedaría
        // fuera de lugar o sobre los controles de la otra app. La ventana toma la banda de la nueva orientación.
        // Antes: AccesibilidadDePrueba.onConfigurationChanged llegaba directo a encuadrar().
        void alCambiarPantalla() {
            if (web == null || posicion == null) return;
            Rect seguro = areaSegura();
            boolean ahora = seguro.width() > seguro.height();
            if (ahora != deLado) {
                // -09-11-2026- Si gira con el dedo arrastrando, el arrastre termina: se guarda donde quedó, en la
                // orientación de antes, y la ventana toma la banda de la nueva.
                terminarArrastre("giro", false);
                // -09-11-2026- Si gira en plena cuenta de Seguir, la cuenta se cancela y queda en pausa.
                if (reglas.fase() == SesionVentana.Fase.CUENTA) pausarEnAndroid("giro en la cuenta");
                cerrarMenuAa("giro", true);
                aplicarTamanoInicial();
                anotar(numero, "giro: " + (ahora ? "de lado" : "de pie"));
            }
            encuadrar();
        }

        // EL ARRASTRE, CON EL DEDO EN LA PANTALLA -09-11-2026-. Medido en el g86 -APK 808-: la ventana temblaba al
        // moverla por el asa -y = 570, 551, 538, 535, 521, 520, 535, 546…-. La página medía el dedo relativo a la propia
        // ventana y mandaba cada paso como 'mover'; con la ventana moviéndose entre medio, el error se sumaba, y con Aa
        // abierto cada paso además recolocaba el menú pasando por la página. Ahora la página solo avisa 'moverInicio'
        // al apoyar el dedo en el asa, y la posición sale de getRawX/getRawY desde el DOWN -ArrastreVentana-. Durante
        // el arrastre no se guarda ni se avisa a la página; al soltar, una vez cada cosa. Solo cuenta el primer dedo.
        void alTocarBanda(MotionEvent ev) {
            if (posicion == null) return;
            int accion = ev.getActionMasked();
            if (accion == MotionEvent.ACTION_DOWN) {
                if (arrastre.activo()) terminarArrastre("toque nuevo", true);
                arrastre.alApoyar(ev.getPointerId(0), ev.getRawX(), ev.getRawY(), posicion.x, posicion.y);
            } else if (accion == MotionEvent.ACTION_MOVE) {
                if (!arrastre.activo()) return;
                int i = ev.findPointerIndex(arrastre.dedo());
                if (i < 0) return;
                // getRawX(int) es de Android 10; antes solo hay la del dedo 0, que es el primero mientras siga apoyado.
                float rx, ry;
                if (Build.VERSION.SDK_INT >= 29) { rx = ev.getRawX(i); ry = ev.getRawY(i); }
                else if (i == 0) { rx = ev.getRawX(); ry = ev.getRawY(); }
                else return;
                moverArrastre(rx, ry);
            } else if (accion == MotionEvent.ACTION_POINTER_UP) {
                if (ev.getPointerId(ev.getActionIndex()) == arrastre.dedo()) terminarArrastre("primer dedo arriba", true);
            } else if (accion == MotionEvent.ACTION_UP || accion == MotionEvent.ACTION_CANCEL) {
                terminarArrastre(accion == MotionEvent.ACTION_UP ? "soltar" : "cancelado", true);
            }
        }

        // 'moverInicio' de la página: empieza solo si el dedo de ese toque sigue apoyado.
        void empezarArrastre() {
            if (!arrastre.empezar()) {
                anotar(numero, "arrastre: moverInicio sin dedo apoyado, no se mueve");
                return;
            }
            if (menuPuesto && menuPos != null) {
                menuDx = menuPos.x - posicion.x;
                menuDy = menuPos.y - posicion.y;
            }
            anotar(numero, "arrastre: desde x=" + arrastre.x0() + " y=" + arrastre.y0());
        }

        void moverArrastre(float rawX, float rawY) {
            if (web == null || ventanas == null || !web.isAttachedToWindow()) return;
            Rect seguro = areaSegura();
            int[] p = arrastre.alMover(rawX, rawY, posicion.width, posicion.height, seguro.left, seguro.top,
                seguro.right, seguro.bottom, dp(GeometriaVentana.MIN_ANCHO), dp(GeometriaVentana.MIN_ALTO));
            if (p == null || (p[0] == posicion.x && p[1] == posicion.y)) return;
            posicion.x = p[0];
            posicion.y = p[1];
            try { ventanas.updateViewLayout(web, posicion); }
            catch (Exception e) { anotar(numero, "arrastre: no se pudo mover la ventana: " + e); }
            // El menú de Aa con el mismo desplazamiento, en el mismo paso y sin pasar por la página. Al soltar, la
            // página lo recoloca -colocarMenuAa- por si tiene que cambiarse de lado.
            if (menuPuesto && menuPos != null && menuWeb != null) {
                menuPos.x = posicion.x + menuDx;
                menuPos.y = posicion.y + menuDy;
                try { ventanas.updateViewLayout(menuWeb, menuPos); }
                catch (Exception e) { anotar(numero, "arrastre: no se pudo mover el menú de Aa: " + e); }
            }
        }

        // Al soltar: guardar la geometría y mandarla a la página, una vez. En el giro la manda encuadrar() después.
        void terminarArrastre(String motivo, boolean avisar) {
            int pasos = arrastre.pasos();
            if (!arrastre.terminar()) return;
            guardarGeometria();
            anotar(numero, "arrastre: hasta x=" + posicion.x + " y=" + posicion.y + ", " + pasos + " pasos (" + motivo + ")");
            if (avisar) encuadrar();
        }

        void enviarGeometria() {
            if (posicion == null) return;
            try {
                float d = recursos.getDisplayMetrics().density;
                Rect seguro = areaSegura();
                JSONObject msg = new JSONObject();
                msg.put("tipo", "geometria");
                msg.put("sesion", numero);
                msg.put("x", posicion.x / d); msg.put("y", posicion.y / d);
                msg.put("w", posicion.width / d); msg.put("h", posicion.height / d);
                JSONObject sg = new JSONObject();
                sg.put("l", seguro.left / d); sg.put("t", seguro.top / d);
                sg.put("r", seguro.right / d); sg.put("b", seguro.bottom / d);
                msg.put("seguro", sg);
                enviar(msg.toString());
            } catch (Exception e) { anotar(numero, "no se pudo mandar la geometría: " + e); }
        }

        // Antes -hasta el 08-11-2026-: una sola geometría para las dos orientaciones:
        //     e.putInt("x", posicion.x); e.putInt("y", posicion.y);
        //     e.putInt("w", posicion.width); e.putInt("h", posicion.height);
        void guardarGeometria() {
            if (posicion == null) return;
            String o = deLado ? "h." : "v.";
            SharedPreferences.Editor e = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putInt(o + "x", posicion.x); e.putInt(o + "y", posicion.y);
            e.putInt(o + "w", posicion.width); e.putInt(o + "h", posicion.height);
            e.apply();
        }

        // EL MENÚ DE Aa, FUERA DE LA VENTANA -09-11-2026, banda A-. Dentro de la banda empujaba la lectura y dejaba
        // un renglón -807-06-. Para sacarlo de la banda en la misma ventana habría que agrandarla, y lo agregado
        // sería una superficie invisible que se come los toques de la Cámara. Por eso va en una SEGUNDA ventana del
        // mismo servicio, del tamaño exacto del menú: recibe toques solo donde se dibuja el menú. Sin foco y sin ser
        // modal, el resto de la pantalla sigue siendo de la otra app; FLAG_WATCH_OUTSIDE_TOUCH avisa del primer
        // toque de afuera sin quedárselo, así que ese toque llega igual a la Cámara -el zoom, el obturador- y
        // además cierra el menú, como un menú de Material 3. Se retira al cerrar Aa, girar, volver o terminar.
        // La página de la banda calcula dónde va -lib/flotante.ts, colocarMenuAa- y la del menú es la misma
        // flotante.html con ?panel=aa: las mismas barras y botones de la preparación. Sin probar en el teléfono.
        @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
        void abrirMenuAa(JSONObject o) {
            if (ventanas == null || accesibilidad == null || web == null) return;
            if (menuWeb == null) {
                menuWeb = new WebView(accesibilidad);
                menuWeb.setBackgroundColor(Color.TRANSPARENT);
                menuWeb.setOverScrollMode(View.OVER_SCROLL_NEVER);
                WebSettings ajustes = menuWeb.getSettings();
                ajustes.setJavaScriptEnabled(true);
                ajustes.setDomStorageEnabled(true);
                ajustes.setAllowFileAccess(false);
                ajustes.setAllowContentAccess(false);
                WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(accesibilidad);
                WebViewAssetLoader cargador = new WebViewAssetLoader.Builder()
                    .setDomain("appassets.androidplatform.net")
                    .addPathHandler("/", path -> {
                        String rel = path.startsWith("/") ? path.substring(1) : path;
                        return assets.handle("public/" + rel);
                    })
                    .build();
                menuWeb.setWebViewClient(new WebViewClient() {
                    @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                        return cargador.shouldInterceptRequest(req.getUrl());
                    }
                    @Override public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError error) {
                        if (req.isForMainFrame()) anotar(numero, "el menú de Aa no pudo abrir la página: " + error.getDescription());
                    }
                });
                WebViewCompat.addWebMessageListener(menuWeb, "sigo", Collections.singleton(ORIGEN),
                    (view, message, sourceOrigin, isMainFrame, reply) -> {
                        String data = message.getData();
                        PRINCIPAL.post(() -> recibirDelMenu(data));
                    });
                menuWeb.setOnTouchListener((v, ev) -> {
                    if (ev.getActionMasked() == MotionEvent.ACTION_OUTSIDE) alTocarFueraDelMenu(ev);
                    return false;
                });
                menuLista = false;
                menuWeb.loadUrl(URL_PAGINA + "?panel=aa");
            }
            if (menuPos == null) {
                menuPos = new WindowManager.LayoutParams(
                    dp(280), dp(172),
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT);
                menuPos.gravity = Gravity.TOP | Gravity.START;
            }
            float d = recursos.getDisplayMetrics().density;
            menuPos.x = Math.round((float) o.optDouble("x", 0) * d);
            menuPos.y = Math.round((float) o.optDouble("y", 0) * d);
            menuPos.width = Math.max(dp(48), Math.round((float) o.optDouble("w", 280) * d));
            menuPos.height = Math.max(dp(48), Math.round((float) o.optDouble("h", 172) * d));
            try {
                if (menuPuesto) ventanas.updateViewLayout(menuWeb, menuPos);
                else { ventanas.addView(menuWeb, menuPos); menuPuesto = true; }
                anotar(numero, "menú Aa " + o.optString("forma", "") + " w=" + menuPos.width + " h=" + menuPos.height
                    + " x=" + menuPos.x + " y=" + menuPos.y);
            } catch (Exception e) {
                anotar(numero, "no se pudo poner el menú de Aa: " + e);
                menuPuesto = false;
                avisarMenuCerrado("no se pudo poner");
                return;
            }
            try {
                JSONObject valores = new JSONObject();
                valores.put("tipo", "valores");
                valores.put("sesion", numero);
                valores.put("forma", o.optString("forma", "columna"));
                if (o.has("transparencia")) valores.put("transparencia", o.optInt("transparencia"));
                if (o.has("fontSize")) valores.put("fontSize", o.optInt("fontSize"));
                if (o.has("idiomaApp")) valores.put("idiomaApp", o.optString("idiomaApp"));
                enviarAlMenu(valores.toString());
            } catch (Exception e) { anotar(numero, "no se pudieron mandar los valores al menú: " + e); }
        }

        // Mientras la página del menú no dice «listo» se guarda solo el último: los valores viejos no sirven.
        void enviarAlMenu(String json) {
            if (menuWeb == null) return;
            if (!menuLista) { colaMenu.clear(); colaMenu.add(json); return; }
            try { WebViewCompat.postWebMessage(menuWeb, new WebMessageCompat(json), Uri.parse(ORIGEN)); }
            catch (Exception e) { anotar(numero, "no se pudo enviar al menú: " + e); }
        }

        void recibirDelMenu(String data) {
            if (!vigente()) return;
            try {
                JSONObject o = new JSONObject(data);
                String tipo = o.optString("tipo", "");
                if ("listo".equals(tipo)) {
                    menuLista = true;
                    while (!colaMenu.isEmpty()) enviarAlMenu(colaMenu.removeFirst());
                } else if ("ajuste".equals(tipo)) {
                    JSObject pref = new JSObject();
                    JSONObject reenvio = new JSONObject();
                    reenvio.put("tipo", "ajusteAa");
                    reenvio.put("sesion", numero);
                    if (o.has("transparencia")) { pref.put("transparencia", o.optInt("transparencia")); reenvio.put("transparencia", o.optInt("transparencia")); }
                    if (o.has("fontSize")) { pref.put("fontSize", o.optInt("fontSize")); reenvio.put("fontSize", o.optInt("fontSize")); }
                    guardarPreferencias(contexto, pref);
                    enviar(reenvio.toString());
                    anotar(numero, "ajuste desde Aa transparencia=" + o.optInt("transparencia", -1) + " fontSize=" + o.optInt("fontSize", -1));
                } else {
                    anotar(numero, "mensaje del menú sin uso tipo=" + tipo);
                }
            } catch (Exception e) {
                anotar(numero, "mensaje del menú ilegible: " + e);
            }
        }

        // El primer toque de afuera. Si cae en la banda -la misma app: Android da sus coordenadas- lo resuelve la
        // página: tocar Aa lo cierra y tocar la lectura también. Si cae en otra app, Android lo entrega con las
        // coordenadas en cero; ese toque ya siguió a la otra app y aquí solo se cierra el menú.
        void alTocarFueraDelMenu(MotionEvent ev) {
            if (menuPos == null || posicion == null) return;
            float sx = menuPos.x + ev.getX();
            float sy = menuPos.y + ev.getY();
            // Las coordenadas en cero son las de un toque de otra app: aunque el menú quede dentro de la banda
            // -forma 'dentro', ventana mínima-, ese toque cierra el menú.
            boolean ajeno = ev.getX() == 0f && ev.getY() == 0f;
            boolean enLaBanda = sx >= posicion.x && sx < posicion.x + posicion.width
                && sy >= posicion.y && sy < posicion.y + posicion.height;
            if (enLaBanda && !ajeno) return;
            cerrarMenuAa("toque afuera", true);
        }

        void cerrarMenuAa(String motivo, boolean avisarPagina) {
            if (menuWeb != null && menuPuesto && ventanas != null) {
                try { ventanas.removeView(menuWeb); }
                catch (Exception e) { anotar(numero, "no se pudo quitar el menú de Aa: " + e); }
                anotar(numero, "menú Aa retirado: " + motivo);
            }
            menuPuesto = false;
            if (avisarPagina) avisarMenuCerrado(motivo);
        }

        void avisarMenuCerrado(String motivo) {
            try {
                JSONObject msg = new JSONObject();
                msg.put("tipo", "aaCerrado");
                msg.put("sesion", numero);
                msg.put("motivo", motivo);
                enviar(msg.toString());
            } catch (Exception e) { anotar(numero, "no se pudo avisar que Aa se cerró: " + e); }
        }

        void enviar(String json) {
            if (!paginaLista) { colaPagina.add(json); return; }
            postear(json);
        }
        void postear(String json) {
            if (web == null) return;
            try {
                WebViewCompat.postWebMessage(web, new WebMessageCompat(json), Uri.parse(ORIGEN));
            } catch (Exception e) {
                anotar(numero, "no se pudo enviar a la página: " + e);
            }
        }

        void recibirDePagina(String data) {
            if (!vigente()) return;
            try {
                JSONObject o = new JSONObject(data);
                String tipo = o.optString("tipo", "");
                if (o.has("token")) ultimoToken = o.optLong("token", ultimoToken);
                if ("listo".equals(tipo)) {
                    anotar(numero, "página lista; se mandan " + colaPagina.size() + " mensajes en espera");
                    paginaLista = true;
                    while (!colaPagina.isEmpty()) postear(colaPagina.removeFirst());
                    enviarGeometria();
                } else if ("moverInicio".equals(tipo) && posicion != null) {
                    empezarArrastre();
                } else if ("mover".equals(tipo) && posicion != null) {
                    // -09-11-2026- La página ya no manda 'mover': el arrastre lo mide lo nativo -alTocarBanda-. El caso
                    // queda para una página vieja en caché, sin el registro por paso.
                    float d = recursos.getDisplayMetrics().density;
                    posicion.x += Math.round((float) o.optDouble("dx", 0) * d);
                    posicion.y += Math.round((float) o.optDouble("dy", 0) * d);
                    encuadrar();
                    guardarGeometria();
                    // Antes -2026-11-09-: anotar(numero, "posición x=" + posicion.x + " y=" + posicion.y);
                    // Motivo: una línea por paso; ahora el arrastre anota una al empezar y otra al terminar.
                } else if ("tamano".equals(tipo) && posicion != null) {
                    float d = recursos.getDisplayMetrics().density;
                    posicion.width += Math.round((float) o.optDouble("dw", 0) * d);
                    posicion.height += Math.round((float) o.optDouble("dh", 0) * d);
                    encuadrar();
                    guardarGeometria();
                    anotar(numero, "tamaño w=" + posicion.width + " h=" + posicion.height);
                } else if ("aa".equals(tipo)) {
                    if (o.optBoolean("abierto", false)) abrirMenuAa(o);
                    else cerrarMenuAa("Aa cerrado en la banda", false);
                } else if ("ajuste".equals(tipo)) {
                    JSObject pref = new JSObject();
                    if (o.has("transparencia")) pref.put("transparencia", o.optInt("transparencia"));
                    if (o.has("fontSize")) pref.put("fontSize", o.optInt("fontSize"));
                    guardarPreferencias(contexto, pref);
                    anotar(numero, "ajuste transparencia=" + o.optInt("transparencia", -1) + " fontSize=" + o.optInt("fontSize", -1));
                // Antes -2026-11-09-:
                // } else if ("seguir".equals(tipo) || "pausa".equals(tipo) || "volver".equals(tipo) || "cerrar".equals(tipo)) {
                //     anotar(numero, "acción " + tipo + " token=" + ultimoToken);
                //     plugin.accion(numero, tipo, ultimoToken);
                //     if ("volver".equals(tipo)) {
                //         intentarTraerSigo(contexto);
                //         cerrar("volver");
                //     } else if ("cerrar".equals(tipo)) {
                //         cerrar("cerrar");
                //     }
                // }
                // Motivo: Pausa y Seguir los hace Android -la página de Sigo dormía al minuto y no los recibía-; la X
                // además apaga el micrófono al tiro; «Ver Sigo+» del límite vuelve como «Volver a Sigo».
                } else if ("pausa".equals(tipo)) {
                    anotar(numero, "acción pausa token=" + ultimoToken);
                    pausarEnAndroid("botón Pausa");
                } else if ("seguir".equals(tipo)) {
                    anotar(numero, "acción seguir token=" + ultimoToken);
                    seguirEnAndroid();
                } else if ("volver".equals(tipo) || "verSigoMas".equals(tipo)) {
                    anotar(numero, "acción " + tipo + " token=" + ultimoToken);
                    plugin.accion(numero, "volver", ultimoToken);
                    intentarTraerSigo(contexto);
                    cerrar(tipo);
                } else if ("cerrar".equals(tipo)) {
                    anotar(numero, "acción cerrar token=" + ultimoToken);
                    // Antes -9-nov-2026-: VoskNativoPlugin.pausarParaVentana(numero, "X");
                    // Motivo -fallo 3-: el micrófono lo libera el cierre común, para la X y para todas las otras rutas.
                    plugin.accion(numero, "cerrar", ultimoToken);
                    cerrar("cerrar");
                }
            } catch (Exception e) {
                anotar(numero, "mensaje de la página ilegible: " + e);
            }
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
                for (Dato d : datos) {
                    if (d.audio != sesionAudio) {
                        sesionAudio = d.audio;
                        consultar("cambió sesión de Vosk=" + sesionAudio);
                    }
                    if (d.relevos != relevos) {
                        anotar(numero, "relevo " + relevos + " → " + d.relevos + " audioSesion=" + d.audio);
                        relevos = d.relevos;
                    }
                    ultimoEvento = d.monotono;
                    rms = d.rms;
                    eventos++;
                    String util = UltimasPalabras.de(d.json, Integer.MAX_VALUE);
                    if (!util.isEmpty()) {
                        eventosConTexto++;
                        String recorte = d.json.replace('\n', ' ').replace('\r', ' ');
                        if (recorte.length() > 80) recorte = recorte.substring(0, 80);
                        ultimoJsonTexto = recorte;
                        if (!util.equals(hipotesis)) {
                            hipotesis = util;
                            horaCambio = d.hora;
                            utiles++;
                        }
                    }
                    try {
                        JSONObject msg = new JSONObject();
                        msg.put("tipo", "voz");
                        msg.put("sesion", numero);
                        msg.put("evento", d.evento);
                        msg.put("json", d.json);
                        msg.put("rms", d.rms);
                        enviar(msg.toString());
                    } catch (Exception ignored) {}
                }
                long ahora = SystemClock.elapsedRealtime();
                ultimoCuadro = ahora;
                revisarLimite(ahora);
                pintar(false);
                if (ahora >= proximoResumen) {
                    anotar(numero, "resumen eventos=" + (eventos - resumenEventos)
                        + " conTexto=" + (eventosConTexto - resumenConTexto)
                        + " útilesNuevas=" + (utiles - resumenUtiles)
                        + " últimoJson=" + ultimoJsonTexto
                        + " token=" + ultimoToken
                        + " estado=" + estado);
                    resumenEventos = eventos;
                    resumenConTexto = eventosConTexto;
                    resumenUtiles = utiles;
                    proximoResumen = ahora + 5000;
                }
                PRINCIPAL.postDelayed(this, 16);
            }
        };

        // LO QUE MANDA SIGO A LA VENTANA, MIENTRAS ESTÁ ABIERTA -09-11-2026-. El contrato trae el límite gratis -o null
        // con Sigo+ o velocidad fija- y los segundos ya leídos. Los estados de Sigo pasan solo en la cuenta de Empezar;
        // el primero sin cuenta después de ella empieza la lectura que cuenta Android. Desde ahí, el estado es de Android.
        boolean deSigo(String json) {
            try {
                JSONObject o = new JSONObject(json);
                String tipo = o.optString("tipo", "");
                if ("contrato".equals(tipo)) {
                    JSONObject lim = o.optJSONObject("limite");
                    reglas = new SesionVentana(lim != null,
                        lim == null ? 0 : (int) Math.round(lim.optDouble("lecturaSeg", 0)),
                        lim == null ? 0 : (int) Math.round(lim.optDouble("avisoAntesSeg", 0)),
                        o.optDouble("leidosSeg", 0));
                    cuentaInicialVista = false;
                    anotar(numero, "contrato: límite=" + (lim == null ? "sin límite" : lim.optDouble("lecturaSeg", 0)
                        + "s aviso " + lim.optDouble("avisoAntesSeg", 0) + "s") + " leídos=" + o.optDouble("leidosSeg", 0));
                    return true;
                }
                if (!"estado".equals(tipo)) return true;
                if (reglas.fase() != SesionVentana.Fase.CUENTA_INICIAL) {
                    anotar(numero, "estado de Sigo descartado: la sesión la manda Android");
                    return false;
                }
                boolean conCuenta = o.has("cuenta") && !o.isNull("cuenta");
                if (conCuenta) cuentaInicialVista = true;
                // Sin haber visto la cuenta -dos estados juntos-, basta con que Sigo ya escuche.
                else if ((cuentaInicialVista || o.optBoolean("escuchando", false)) && !o.optBoolean("enPausa", false)) {
                    reglas.empezarLectura(SystemClock.elapsedRealtime());
                    anotar(numero, "lectura empezada: cuenta Android");
                }
                return true;
            } catch (Exception e) {
                return true;
            }
        }

        void enviarEstado() {
            try {
                JSONObject msg = new JSONObject();
                msg.put("tipo", "estado");
                msg.put("sesion", numero);
                int c = reglas.cuenta();
                msg.put("cuenta", c > 0 ? (Object) c : JSONObject.NULL);
                msg.put("enPausa", reglas.enPausa());
                msg.put("escuchando", reglas.escuchando());
                enviar(msg.toString());
            } catch (Exception e) { anotar(numero, "no se pudo mandar el estado: " + e); }
        }

        void enviarLimite(String fase) {
            limiteVisible = fase;
            try {
                JSONObject msg = new JSONObject();
                msg.put("tipo", "limite");
                msg.put("sesion", numero);
                msg.put("fase", fase);
                enviar(msg.toString());
            } catch (Exception e) { anotar(numero, "no se pudo mandar el límite: " + e); }
        }

        // Pausa: también la pantalla apagada, el límite y el giro en plena cuenta. Cancela la cuenta pendiente.
        void pausarEnAndroid(String motivo) {
            if (!vigente()) return;
            PRINCIPAL.removeCallbacks(pasoCuenta);
            boolean cambio = reglas.pausar(SystemClock.elapsedRealtime());
            VoskNativoPlugin.pausarParaVentana(numero, motivo);
            if (cambio) enviarEstado();
            anotar(numero, "pausa en Android: " + motivo + " leídos=" + reglas.leidosMs(SystemClock.elapsedRealtime()) + "ms");
        }

        void seguirEnAndroid() {
            if (!vigente()) return;
            int n = reglas.seguir();
            if (n == 0) { anotar(numero, "seguir ignorado: fase=" + reglas.fase()); return; }
            if (!"ninguno".equals(limiteVisible)) enviarLimite("ninguno");
            // -9-nov-2026- Otro intento: el aviso del fallo anterior se retira.
            if (microFallo) { microFallo = false; enviarMicro(); }
            PRINCIPAL.removeCallbacks(pasoCuenta);
            enviarEstado();
            PRINCIPAL.postDelayed(pasoCuenta, 1000);
            anotar(numero, "seguir: cuenta " + n);
        }

        void darPasoDeCuenta() {
            if (!vigente()) return;
            int r = reglas.pasoDeCuenta(SystemClock.elapsedRealtime());
            if (r < 0) return;
            if (r > 0) {
                enviarEstado();
                PRINCIPAL.postDelayed(pasoCuenta, 1000);
                return;
            }
            // Antes -hasta el 9-nov-2026-:
            //     VoskNativoPlugin.reanudarParaVentana(numero);
            //     enviarEstado();
            //     anotar(numero, "cuenta terminada: escuchando");
            // Motivo -orden «Tres correcciones», fallo 2-: se publicaba «escuchando» y corría el reloj antes de saber si
            // el micrófono abría. Ahora la cuenta se va -estado sin cuenta, sin escuchar- y se pide la apertura con el
            // intento de esta cuenta; «escuchando» lo publica alAbrirMicrofono.
            long intento = reglas.intentoPedido();
            enviarEstado();
            VoskNativoPlugin.reanudarParaVentana(numero, intento);
            anotar(numero, "cuenta terminada: se pide el micrófono intento=" + intento);
        }

        // La respuesta de Vosk -aperturaDelMicrofono-. Solo la del intento que se espera vale: «escuchando» y el reloj
        // con la apertura hecha; Pausa y el aviso de micrófono si falló, y Seguir se puede tocar otra vez. Una respuesta
        // descartada -Pausa, pantalla apagada u otro Seguir entre medio- suelta su captura si alcanzó a abrirse.
        void alAbrirMicrofono(long intento, long captura, String error) {
            SesionVentana.Apertura r = reglas.alAbrirMicrofono(intento, captura != 0, SystemClock.elapsedRealtime());
            if (r == SesionVentana.Apertura.ESCUCHANDO) {
                if (microFallo) { microFallo = false; enviarMicro(); }
                enviarEstado();
                anotar(numero, "micrófono confirmado: escuchando intento=" + intento + " captura=" + captura);
            } else if (r == SesionVentana.Apertura.PAUSA) {
                // La reanudación soltó la marca de pausa del micrófono: se vuelve a poner, así un escuchar tardío de la
                // página de Sigo tampoco lo abre. No hay nada abierto que cerrar.
                VoskNativoPlugin.pausarParaVentana(numero, "falló la apertura de Seguir");
                microFallo = true;
                enviarMicro();
                enviarEstado();
                anotar(numero, "el micrófono no abrió: vuelve a Pausa intento=" + intento + " error=" + error);
            } else {
                anotar(numero, "apertura descartada intento=" + intento + " captura=" + captura + " fase=" + reglas.fase());
                if (captura != 0) VoskNativoPlugin.liberarCaptura(numero, captura, "apertura descartada");
            }
        }

        void revisarLimite(long ahora) {
            SesionVentana.Evento ev = reglas.revisar(ahora);
            if (ev == SesionVentana.Evento.AVISO) {
                anotar(numero, "aviso del límite: queda " + reglas.leidosMs(ahora) + "ms leídos");
                enviarLimite("aviso");
            } else if (ev == SesionVentana.Evento.LIMITE) {
                PRINCIPAL.removeCallbacks(pasoCuenta);
                VoskNativoPlugin.pausarParaVentana(numero, "límite");
                enviarEstado();
                enviarLimite("limite");
                anotar(numero, "límite de lectura: pausa en Android");
            }
        }

        JSObject estadoDeLaSesion(boolean abierta) {
            JSObject o = new JSObject();
            o.put("hay", true);
            o.put("sesion", numero);
            o.put("abierta", abierta);
            o.put("enPausa", reglas.enPausa());
            o.put("leidosSeg", reglas.leidosMs(SystemClock.elapsedRealtime()) / 1000.0);
            o.put("llegoAlLimite", reglas.llegoAlLimite());
            o.put("token", ultimoToken);
            return o;
        }

        void pintar(boolean inmediato) {
            long ahora = SystemClock.elapsedRealtime();
            String nuevo = EstadoDelMicrofono.de(ahora, ultimoEvento, sesionAudio, grabaciones);
            boolean cambio = !nuevo.equals(estado);
            if (cambio) {
                estado = nuevo;
                anotar(numero, "estado=" + estado + " voskSesion=" + sesionAudio);
                try {
                    JSONObject msg = new JSONObject();
                    msg.put("tipo", "micro");
                    msg.put("sesion", numero);
                    // Antes -9-nov-2026-: msg.put("silenciado", EstadoDelMicrofono.SILENCIADO.equals(estado));
                    // Motivo: el fallo al reabrir el micrófono en Seguir se dice con el mismo aviso -enviarMicro-.
                    msg.put("silenciado", EstadoDelMicrofono.SILENCIADO.equals(estado) || microFallo);
                    enviar(msg.toString());
                } catch (Exception ignored) {}
            }
            if (inmediato || cambio) ultimaPintura = ahora;
        }

        // El aviso de micrófono de la ventana, ahora: con el fallo de Seguir no se espera a que cambie el estado.
        void enviarMicro() {
            try {
                JSONObject msg = new JSONObject();
                msg.put("tipo", "micro");
                msg.put("sesion", numero);
                msg.put("silenciado", EstadoDelMicrofono.SILENCIADO.equals(estado) || microFallo);
                enviar(msg.toString());
            } catch (Exception e) { anotar(numero, "no se pudo mandar el aviso de micrófono: " + e); }
        }

        // EL CIERRE COMÚN -9-nov-2026, orden «Tres correcciones», fallo 3-. Todas las rutas llegan aquí: la X, volver,
        // «Ver Sigo+», la desconexión del servicio, Sigo destruido, cerrar desde la web. CierreDeSesion lo hace una vez:
        // cancela la cuenta, ordena a Vosk liberar el micrófono de esta sesión -en su hilo, sin la página de Sigo- y
        // retira la ventana y Aa -quitarVentanas, lo que antes era todo el cierre-.
        // Antes -hasta el 9-nov-2026-, el comienzo:
        //     void cerrar(String motivo) {
        //         if (!vigente()) return;
        //         anotar(numero, "cerrar motivo=" + motivo);
        //         // -09-11-2026- Lo que queda para la vuelta a Sigo, y la cuenta de Seguir no sigue después de cerrar.
        //         PRINCIPAL.removeCallbacks(pasoCuenta);
        //         ultimoEstadoSesion = estadoDeLaSesion(false);
        //         cerrada = true;
        void cerrar(String motivo) {
            if (!vigente()) return;
            anotar(numero, "cerrar motivo=" + motivo);
            // -09-11-2026- Lo que queda para la vuelta a Sigo, y la cuenta de Seguir no sigue después de cerrar.
            ultimoEstadoSesion = estadoDeLaSesion(false);
            cierre.cerrar(numero, motivo, reglas, SystemClock.elapsedRealtime(), new CierreDeSesion.Acciones() {
                @Override public void cancelarCuenta() { PRINCIPAL.removeCallbacks(pasoCuenta); }
                @Override public void liberarMicrofono(long sesion, String m) { VoskNativoPlugin.liberarDeVentana(sesion, m); }
                @Override public void quitarVentanas(String m) { Sesion.this.quitarVentanas(m); }
            });
        }

        void quitarVentanas(String motivo) {
            cerrada = true;
            actual = null;
            PRINCIPAL.removeCallbacks(cuadro);
            synchronized (pendientes) { pendientes.clear(); }
            // El menú de Aa se va con la sesión: sin esto quedaría una ventana suelta sobre la otra app.
            cerrarMenuAa("cerrar " + motivo, false);
            if (menuWeb != null) { menuWeb.destroy(); menuWeb = null; }
            // -09-11-2026- El arrastre y su oyente se van con la sesión.
            arrastre.terminar();
            if (web != null) web.setOnTouchListener(null);
            if (web != null && ventanas != null) {
                try { if (web.isAttachedToWindow()) ventanas.removeView(web); }
                catch (Exception e) { anotar(numero, "no se pudo quitar ventana: " + e); }
                web.destroy();
                web = null;
            }
            if (receptorPantalla != null) {
                try { contexto.unregisterReceiver(receptorPantalla); }
                catch (Exception e) { anotar(numero, "no se pudo soltar receptor de pantalla: " + e); }
                receptorPantalla = null;
            }
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
}

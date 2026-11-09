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
    static void enviarAPagina(String json) {
        PRINCIPAL.post(() -> {
            Sesion s = actual;
            if (s != null) s.enviar(json);
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
                        anotar(numero, "pantalla apagada: se pide pausa y se guarda el marcador token=" + ultimoToken);
                        plugin.accion(numero, "pausa", ultimoToken);
                    }
                }
            };
            contexto.registerReceiver(receptorPantalla, new IntentFilter(Intent.ACTION_SCREEN_OFF));
            pintar(true);
            PRINCIPAL.post(cuadro);
        }

        @SuppressLint("SetJavaScriptEnabled")
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
            posicion = new WindowManager.LayoutParams(
                dp(240), dp(180),
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                // Sin foco: la ventana recibe sus toques, pero el Atrás y el teclado siguen siendo de la app que
                // graba. 6ec9ddb la tenía; 957fc97 la sacó. Antes -957fc97-: FLAG_NOT_TOUCH_MODAL | FLAG_LAYOUT_IN_SCREEN.
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
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
                cerrarMenuAa("giro", true);
                aplicarTamanoInicial();
                anotar(numero, "giro: " + (ahora ? "de lado" : "de pie"));
            }
            encuadrar();
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
                } else if ("mover".equals(tipo) && posicion != null) {
                    float d = recursos.getDisplayMetrics().density;
                    posicion.x += Math.round((float) o.optDouble("dx", 0) * d);
                    posicion.y += Math.round((float) o.optDouble("dy", 0) * d);
                    encuadrar();
                    guardarGeometria();
                    anotar(numero, "posición x=" + posicion.x + " y=" + posicion.y);
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
                } else if ("seguir".equals(tipo) || "pausa".equals(tipo) || "volver".equals(tipo) || "cerrar".equals(tipo)) {
                    anotar(numero, "acción " + tipo + " token=" + ultimoToken);
                    plugin.accion(numero, tipo, ultimoToken);
                    if ("volver".equals(tipo)) {
                        intentarTraerSigo(contexto);
                        cerrar("volver");
                    } else if ("cerrar".equals(tipo)) {
                        cerrar("cerrar");
                    }
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
                    msg.put("silenciado", EstadoDelMicrofono.SILENCIADO.equals(estado));
                    enviar(msg.toString());
                } catch (Exception ignored) {}
            }
            if (inmediato || cambio) ultimaPintura = ahora;
        }

        void cerrar(String motivo) {
            if (!vigente()) return;
            anotar(numero, "cerrar motivo=" + motivo);
            cerrada = true;
            actual = null;
            PRINCIPAL.removeCallbacks(cuadro);
            synchronized (pendientes) { pendientes.clear(); }
            // El menú de Aa se va con la sesión: sin esto quedaría una ventana suelta sobre la otra app.
            cerrarMenuAa("cerrar " + motivo, false);
            if (menuWeb != null) { menuWeb.destroy(); menuWeb = null; }
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

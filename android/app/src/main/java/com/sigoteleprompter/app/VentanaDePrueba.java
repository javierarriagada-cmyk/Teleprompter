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
    static void reencuadrar(AccesibilidadDePrueba servicio) {
        Sesion s = actual;
        if (s != null && s.accesibilidad == servicio) s.encuadrar();
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

        void aplicarTamanoInicial() {
            Rect seguro = areaSegura();
            SharedPreferences p = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            int ancho = p.getInt("w", 0);
            int alto = p.getInt("h", 0);
            if (ancho < dp(240) || alto < dp(180)) {
                ancho = Math.min(dp(480), Math.max(dp(240), seguro.width() - dp(32)));
                alto = Math.max(dp(180), seguro.height() / 3);
            }
            posicion.width = ancho;
            posicion.height = alto;
            if (p.contains("x") && p.contains("y")) {
                posicion.x = p.getInt("x", seguro.left);
                posicion.y = p.getInt("y", seguro.top);
            } else {
                posicion.x = seguro.left + Math.max(0, (seguro.width() - ancho) / 2);
                posicion.y = seguro.top + dp(8);
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

        void acotar() {
            if (posicion == null) return;
            Rect seguro = areaSegura();
            posicion.width = Math.max(dp(240), Math.min(posicion.width, Math.max(dp(240), seguro.width())));
            posicion.height = Math.max(dp(180), Math.min(posicion.height, Math.max(dp(180), seguro.height())));
            posicion.x = Math.max(seguro.left, Math.min(posicion.x, seguro.right - posicion.width));
            posicion.y = Math.max(seguro.top, Math.min(posicion.y, seguro.bottom - posicion.height));
        }

        void encuadrar() {
            if (web == null || posicion == null || ventanas == null || !web.isAttachedToWindow()) return;
            acotar();
            try { ventanas.updateViewLayout(web, posicion); }
            catch (Exception e) { anotar(numero, "no se pudo reencuadrar: " + e); }
        }

        void guardarGeometria() {
            if (posicion == null) return;
            SharedPreferences.Editor e = contexto.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
            e.putInt("x", posicion.x); e.putInt("y", posicion.y);
            e.putInt("w", posicion.width); e.putInt("h", posicion.height);
            e.apply();
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

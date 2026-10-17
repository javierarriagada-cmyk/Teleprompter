package com.sigoteleprompter.app;

import android.graphics.Outline;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.PathInterpolator;

import androidx.activity.BackEventCompat;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginHandle;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static boolean listoParaMostrar = false;
    private static long inicioActivityMs = 0;
    // 1540 es cuando el punto termina de encenderse. Los 250 de mas son el SOSTENIDO:
    // el punto se queda quieto y prendido un cuarto de segundo antes de soltar. Sin eso
    // la marca se completa y desaparece en el mismo instante, y no se alcanza a leer.
    // 24-09-2026: la marca nueva -la bola recorre el circulo y aparece "Sig"- termina a
    // los 1250 ms -marca_arranque_animada.xml-. Mismo sostenido de 250 despues.
    private static final long DURACION_MARCA_MS = 1250 + 250;

    public static void notificarListo() {
        listoParaMostrar = true;
    }

    // EL ÚNICO RECEPTOR DEL GESTO DE ATRÁS -atrás predictivo, 11-10-2026-.
    //
    // Hasta hoy el gesto lo recibía el callback de Capacitor -AppPlugin- y la web lo escuchaba con
    // CapacitorApp.addListener('backButton'). Ese camino entrega el gesto recién al soltar: no hay con
    // qué animar mientras el dedo se desliza. Este callback de androidx sí recibe el avance
    // -handleOnBackStarted, handleOnBackProgressed, handleOnBackCancelled- y se lo pasa a la web por el
    // plugin AtrasPredictivo. El de Capacitor queda apagado desde la web
    // -CapacitorApp.toggleBackButtonHandler({ enabled: false }), App.tsx-: así handleVolverAtras nunca
    // corre dos veces.
    //
    // Nace INACTIVO: la app abre en la biblioteca, donde no hay adónde volver. La web lo prende y lo
    // apaga con hayAdondeVolver -AtrasPredictivoPlugin-. Inactivo, Android hace su propia animación de
    // volver al inicio del teléfono, que reemplaza al exitApp de antes.
    //
    // -corrección del PR 94, 11-10-2026- En Grabar con la cámara detrás o en recuadro, la imagen no es de
    // la web: es la vista previa de Capgo, detrás del WebView, y la web no la puede achicar. La achica
    // este callback, en cada avance y ANTES de avisarle a la web, para que vaya junto con el texto. Solo
    // cuando la web lo pidió -camaraConElGesto, con hayAdondeVolver-: con el movimiento reducido o con
    // la toma andando, la web manda camara en false y la cámara no se anima.
    private final OnBackPressedCallback atrasPredictivo = new OnBackPressedCallback(false) {
        @Override
        public void handleOnBackStarted(BackEventCompat evento) {
            JSObject d = new JSObject();
            // El borde desde donde parte el dedo: la pantalla se corre hacia el opuesto. Con la barra
            // de tres botones no hay borde -y en Android 13 o anterior ni siquiera llega este aviso-.
            int borde = evento.getSwipeEdge();
            d.put("borde", borde == BackEventCompat.EDGE_LEFT ? "izquierdo"
                : borde == BackEventCompat.EDGE_RIGHT ? "derecho"
                : "ninguno");
            // -corrección del PR 94- El sentido del corrimiento de la cámara, el mismo de
            // corrimientoAtras en la web: desde la izquierda, a la derecha.
            sentidoAtras = borde == BackEventCompat.EDGE_LEFT ? 1f : borde == BackEventCompat.EDGE_RIGHT ? -1f : 0f;
            // Si quedó una cámara achicada de un gesto anterior -confirmado, con la cámara todavía
            // prendida-, este gesto parte de su tamaño entero.
            soltarCamaraAlTiro();
            avisarAtras("inicio", d);
        }

        @Override
        public void handleOnBackProgressed(BackEventCompat evento) {
            // -corrección del PR 94- Primero la cámara, sin esperar a la web.
            if (camaraConElGesto) achicarCamara(evento.getProgress());
            JSObject d = new JSObject();
            d.put("avance", evento.getProgress());
            avisarAtras("avance", d);
        }

        @Override
        public void handleOnBackCancelled() {
            // -corrección del PR 94- La cámara vuelve a su lugar como el texto.
            devolverCamara();
            avisarAtras("cancelado", new JSObject());
        }

        @Override
        public void handleOnBackPressed() {
            // -corrección del PR 94- Confirmado, la cámara se suelta igual que hoy al salir de Grabar: la
            // web vuelve por handleVolverAtras, apaga la cámara y Capgo saca su vista con todo lo que
            // tenía puesto. No se devuelve a su tamaño acá: crecería de golpe detrás del texto que se va.
            if (!camaraAchicada.isEmpty()) {
                Log.i(AtrasPredictivoPlugin.ETIQUETA, "confirmado: la cámara queda achicada hasta que se apague");
            }
            avisarAtras("confirmado", new JSObject());
        }
    };

    // LA VISTA PREVIA CON EL GESTO -corrección del PR 94, 11-10-2026-.
    //
    // Qué se achica: las vistas hermanas del WebView, el mismo criterio con que el bloque de TalkBack de
    // onCreate reconoce lo que mete Capgo. Su previewContainer lleva la vista previa y la grilla; con el
    // fondo detrás ocupa toda la pantalla, y en recuadro ES el recuadro, con sus márgenes. Por eso el
    // pivote no es su centro sino el centro del WebView, el mismo transform-origin de la lectura en la
    // web: así el recuadro se achica hacia el centro de la pantalla, con el texto que lo rodea.
    //
    // Las cuentas son las de src/lib/atrasPredictivo.ts -escalaAtras y corrimientoAtras-: escala
    // 1 - 0.1 × avance; corrimiento (ancho / 20 - 8) × avance hacia el borde opuesto al dedo, con el ancho
    // en px de CSS, que en el WebView son dp. Si se cambian allá, se cambian acá.
    private boolean camaraConElGesto = false;
    private float sentidoAtras = 0f;
    private final List<View> camaraAchicada = new ArrayList<>();
    // var(--redondeo-grande) de styles.css: 24 px de CSS, 24 dp. Es el radio de las esquinas de la
    // pantalla que se va en la web -estiloAtras, App.tsx-.
    private static final float RADIO_ESQUINAS_DP = 24f;
    // MS_PANTALLA de src/components/movimiento.tsx: una pantalla entera.
    private static final long MS_PANTALLA = 400;

    private void achicarCamara(float avance) {
        View web = this.bridge != null ? this.bridge.getWebView() : null;
        if (web == null || !(web.getParent() instanceof ViewGroup)) {
            Log.w(AtrasPredictivoPlugin.ETIQUETA, "cámara sin achicar: no hay WebView o no tiene padre");
            return;
        }
        ViewGroup padre = (ViewGroup) web.getParent();
        float densidad = getResources().getDisplayMetrics().density;
        float escala = 1f - 0.1f * avance;
        float corrimiento = sentidoAtras * Math.max(0f, web.getWidth() / 20f - 8f * densidad) * avance;
        float centroX = web.getLeft() + web.getWidth() / 2f;
        float centroY = web.getTop() + web.getHeight() / 2f;
        int achicadas = 0;
        for (int i = 0; i < padre.getChildCount(); i++) {
            View vista = padre.getChildAt(i);
            if (vista == web) continue;
            if (!camaraAchicada.contains(vista)) {
                // Si todavía volvía de un gesto cancelado, se corta ahí y sigue desde donde quedó.
                vista.animate().cancel();
                redondearComoLaPantalla(vista, web, densidad);
                camaraAchicada.add(vista);
            }
            vista.setPivotX(centroX - vista.getLeft());
            vista.setPivotY(centroY - vista.getTop());
            vista.setScaleX(escala);
            vista.setScaleY(escala);
            vista.setTranslationX(corrimiento);
            achicadas++;
        }
        if (achicadas == 0) {
            Log.w(AtrasPredictivoPlugin.ETIQUETA, "camara=true pero no hay vista previa junto al WebView: nada que achicar");
        }
    }

    // Las esquinas de la PANTALLA, no las de la vista: el contorno es el rectángulo del WebView, en las
    // coordenadas de la vista. Con el fondo detrás coincide con la vista; un recuadro solo se recorta si
    // llega a una esquina, igual que en la web, donde el redondeo es del marco de la lectura. La vista
    // previa de Capgo es COMPATIBLE -TextureView-: se recorta con el contorno y se escala con la vista.
    private void redondearComoLaPantalla(View vista, final View web, float densidad) {
        final float radio = RADIO_ESQUINAS_DP * densidad;
        vista.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View v, Outline contorno) {
                contorno.setRoundRect(
                    web.getLeft() - v.getLeft(),
                    web.getTop() - v.getTop(),
                    web.getRight() - v.getLeft(),
                    web.getBottom() - v.getTop(),
                    radio);
            }
        });
        vista.setClipToOutline(true);
    }

    // Al cancelar: vuelve a su lugar en MS_PANTALLA con CURVA_ENTRA de src/components/movimiento.tsx
    // -cubic-bezier(0.05, 0.7, 0.1, 1)-, los mismos números en un PathInterpolator. Es la curva con que
    // vuelve el texto en la web. Las esquinas se quitan al llegar, como en la web.
    private void devolverCamara() {
        if (camaraAchicada.isEmpty()) return;
        List<View> vistas = new ArrayList<>(camaraAchicada);
        camaraAchicada.clear();
        for (final View vista : vistas) {
            vista.animate()
                .scaleX(1f)
                .scaleY(1f)
                .translationX(0f)
                .setDuration(MS_PANTALLA)
                .setInterpolator(new PathInterpolator(0.05f, 0.7f, 0.1f, 1f))
                .withEndAction(() -> soltarVista(vista))
                .start();
        }
    }

    private void soltarCamaraAlTiro() {
        if (camaraAchicada.isEmpty()) return;
        Log.i(AtrasPredictivoPlugin.ETIQUETA, "cámara achicada de un gesto anterior: vuelve a su tamaño");
        for (View vista : camaraAchicada) {
            vista.animate().cancel();
            soltarVista(vista);
        }
        camaraAchicada.clear();
    }

    // Como la dejó Capgo: sin escala, sin corrimiento, con el pivote y el contorno de siempre.
    private static void soltarVista(View vista) {
        vista.setScaleX(1f);
        vista.setScaleY(1f);
        vista.setTranslationX(0f);
        vista.resetPivot();
        vista.setClipToOutline(false);
        vista.setOutlineProvider(ViewOutlineProvider.BACKGROUND);
    }

    // Lo llama AtrasPredictivoPlugin.hayAdondeVolver, ya en el hilo de la pantalla.
    // -corrección del PR 94- Suma camara. Antes:
    // void fijarHayAdondeVolver(boolean hay) {
    //     atrasPredictivo.setEnabled(hay);
    //     Log.i(AtrasPredictivoPlugin.ETIQUETA, "hayAdondeVolver=" + hay);
    // }
    void fijarHayAdondeVolver(boolean hay, boolean camara) {
        atrasPredictivo.setEnabled(hay);
        camaraConElGesto = camara;
        Log.i(AtrasPredictivoPlugin.ETIQUETA, "hayAdondeVolver=" + hay + " camara=" + camara);
    }

    // No procesar la acción si la actividad se recrea (savedInstanceState != null) ni si viene de Recientes.
    // Antes:
    // private void procesarIntentAccion(android.content.Intent intent) {
    //     if (intent == null || intent.getAction() == null) return;
    //     String action = intent.getAction();
    //     if ("com.sigoteleprompter.app.GRABAR".equals(action)) {
    //         AccesosDirectosPlugin.notificarAccion("grabar");
    //     } else if ("com.sigoteleprompter.app.NUEVO_GUION".equals(action)) {
    //         AccesosDirectosPlugin.notificarAccion("nuevo");
    //     }
    // }
    private void procesarIntentAccion(Bundle savedInstanceState, android.content.Intent intent) {
        if (savedInstanceState != null) return;
        if (intent == null || intent.getAction() == null) return;
        if ((intent.getFlags() & android.content.Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0) return;
        String action = intent.getAction();
        if ("com.sigoteleprompter.app.GRABAR".equals(action)) {
            AccesosDirectosPlugin.notificarAccion("grabar");
        } else if ("com.sigoteleprompter.app.NUEVO_GUION".equals(action)) {
            AccesosDirectosPlugin.notificarAccion("nuevo");
        }
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        procesarIntentAccion(null, intent);
    }

    private void avisarAtras(String evento, JSObject datos) {
        PluginHandle handle = this.bridge != null ? this.bridge.getPlugin("AtrasPredictivo") : null;
        if (handle == null || !(handle.getInstance() instanceof AtrasPredictivoPlugin)) {
            Log.w(AtrasPredictivoPlugin.ETIQUETA, "gesto '" + evento + "' sin el plugin AtrasPredictivo: la web no se entera");
            return;
        }
        ((AtrasPredictivoPlugin) handle.getInstance()).avisar(evento, datos);
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Antes:
        // listoParaMostrar = false;
        ArranquePlugin.reiniciarEstado();
        listoParaMostrar = false;
        inicioActivityMs = System.currentTimeMillis();

        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> {
            long transcurrido = System.currentTimeMillis() - inicioActivityMs;
            boolean animacionTerminada = transcurrido >= DURACION_MARCA_MS;
            return !(listoParaMostrar && animacionTerminada);
        });

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            listoParaMostrar = true;
            ArranquePlugin.resolverListo();
        }, 2500);

        // EL ESPEJO TIENE QUE ESTAR PUESTO ANTES DE QUE ESTA PANTALLA SE VAYA.
        //
        // Aca estaba el defecto que Javier vio tres veces: "primero aparece algo de la
        // biblioteca, despues el nombre una milesima, luego biblioteca otra vez".
        //
        // resolverListo() se llamaba en el withEndAction, o sea CUANDO EL DESVANECIDO YA
        // HABIA TERMINADO. Para entonces esta pantalla ya no tapaba nada y lo que quedaba
        // a la vista era la biblioteca. Recien ahi la web se enteraba y montaba el espejo,
        // que aparecia ENCIMA de una biblioteca que ya se estaba viendo. Ese es el
        // parpadeo, y se ve en las capturas cuadro a cuadro del 20 de septiembre de 2026:
        // marca, marca, marca, BIBLIOTECA, marca.
        //
        // Ahora se avisa al EMPEZAR el desvanecido. La web monta el espejo mientras esta
        // pantalla todavia esta encima, y los 250 ms de desvanecido descubren el espejo,
        // no la biblioteca. Como los dos dibujan la misma marca en el mismo sitio, el
        // relevo no se ve.
        splashScreen.setOnExitAnimationListener(splashScreenViewProvider -> {
            ArranquePlugin.resolverListo();
            View view = splashScreenViewProvider.getView();
            view.animate()
                .alpha(0f)
                .setDuration(250)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(splashScreenViewProvider::remove)
                .start();
        });

        // Los plugins se registran ANTES de super.onCreate: despues el puente ya esta
        // armado y no los toma. Es el orden que pide Capacitor.
        registerPlugin(ArranquePlugin.class);
        registerPlugin(VoskNativoPlugin.class);
        registerPlugin(CamaraNativaPlugin.class);
        registerPlugin(IdiomaAppPlugin.class);
        // -tarea 88- El control por gestos -GestosPlugin.java-.
        registerPlugin(GestosPlugin.class);
        // -atrás predictivo- El puente del gesto de atrás con la web -AtrasPredictivoPlugin.java-.
        registerPlugin(AtrasPredictivoPlugin.class);
        // -accesos directos- El puente de los accesos directos del ícono -AccesosDirectosPlugin.java-.
        registerPlugin(AccesosDirectosPlugin.class);
        super.onCreate(savedInstanceState);
        // Antes -tomas-largas-: getBridge().setWebViewClient(new ClienteWebDeTomas(getBridge()));
        // -visor-servidor- Ningún video pasa por convertFileSrc: todas las tomas van por el servidor
        // local. El cliente vuelve a ser el de Capacitor. RangoHttp se queda: lo usa el servidor.
        // Antes: procesarIntentAccion(getIntent());
        procesarIntentAccion(savedInstanceState, getIntent());

        // DESPUÉS de super.onCreate, a propósito: ahí adentro se arma el puente y AppPlugin de
        // Capacitor registra su propio callback en load(). El despachador le da el gesto al ÚLTIMO
        // callback activo que se agregó, así que este queda por encima del de Capacitor.
        getOnBackPressedDispatcher().addCallback(this, atrasPredictivo);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setBackgroundColor(android.graphics.Color.TRANSPARENT);

            // Test Lab 06-10-2026: el plugin Capgo agrega al padre del WebView un
            // previewContainer a pantalla completa, clickable y focusable, sin nombre.
            // TalkBack lo anuncia duplicado detras del WebView. No tocamos clickable ni
            // focusable -el toque sigue igual-: solo lo sacamos del arbol de accesibilidad
            // con NO_HIDE_DESCENDANTS, a el y a lo que Capgo meta despues.
            final View webView = this.bridge.getWebView();
            ViewGroup parent = (ViewGroup) webView.getParent();
            if (parent != null) {
                for (int i = 0; i < parent.getChildCount(); i++) {
                    View hijo = parent.getChildAt(i);
                    if (hijo != webView) {
                        hijo.setImportantForAccessibility(
                            View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
                    }
                }
                parent.setOnHierarchyChangeListener(new ViewGroup.OnHierarchyChangeListener() {
                    @Override
                    public void onChildViewAdded(View padre, View hijo) {
                        if (hijo != webView) {
                            hijo.setImportantForAccessibility(
                                View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
                        }
                    }

                    @Override
                    public void onChildViewRemoved(View padre, View hijo) {
                    }
                });
            }
        }
    }
}

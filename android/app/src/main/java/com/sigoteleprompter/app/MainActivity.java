package com.sigoteleprompter.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

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
        super.onCreate(savedInstanceState);

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

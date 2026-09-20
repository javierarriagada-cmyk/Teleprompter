package com.teleprompter.app;

import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.view.View;
import android.view.ViewParent;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "Fondo")
public class FondoPlugin extends Plugin {

    private static class VistaFondoGuardado {
        View vista;
        Drawable fondoOriginal;

        VistaFondoGuardado(View vista, Drawable fondoOriginal) {
            this.vista = vista;
            this.fondoOriginal = fondoOriginal;
        }
    }

    private final List<VistaFondoGuardado> fondosGuardados = new ArrayList<>();

    @PluginMethod
    public void transparente(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                fondosGuardados.clear();
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    View actual = webView;
                    View rootContent = getActivity().findViewById(android.R.id.content);

                    while (actual != null) {
                        fondosGuardados.add(new VistaFondoGuardado(actual, actual.getBackground()));
                        if (actual instanceof WebView) {
                            ((WebView) actual).setBackgroundColor(Color.TRANSPARENT);
                        }
                        actual.setBackgroundColor(Color.TRANSPARENT);

                        if (actual == rootContent) {
                            break;
                        }

                        ViewParent padre = actual.getParent();
                        if (padre instanceof View) {
                            actual = (View) padre;
                        } else {
                            break;
                        }
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Error al hacer transparente la cadena de contenedores: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void restaurar(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                for (VistaFondoGuardado guardado : fondosGuardados) {
                    if (guardado.vista != null) {
                        guardado.vista.setBackground(guardado.fondoOriginal);
                    }
                }
                fondosGuardados.clear();
                call.resolve();
            } catch (Exception e) {
                call.reject("Error al restaurar los fondos de la cadena: " + e.getMessage());
            }
        });
    }
}

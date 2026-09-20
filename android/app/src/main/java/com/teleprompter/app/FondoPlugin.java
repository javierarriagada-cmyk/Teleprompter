package com.teleprompter.app;

import android.graphics.Color;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Fondo")
public class FondoPlugin extends Plugin {
    private Integer colorFondoOriginalWebView = null;
    private Integer colorFondoOriginalPadre = null;

    @PluginMethod
    public void transparente(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.setBackgroundColor(Color.TRANSPARENT);
                    View padre = (View) webView.getParent();
                    if (padre != null) {
                        padre.setBackgroundColor(Color.TRANSPARENT);
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Error al hacer transparente el WebView: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void restaurar(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                if (webView != null) {
                    webView.setBackgroundColor(Color.parseColor("#151312"));
                    View padre = (View) webView.getParent();
                    if (padre != null) {
                        padre.setBackgroundColor(Color.parseColor("#151312"));
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject("Error al restaurar el fondo del WebView: " + e.getMessage());
            }
        });
    }
}

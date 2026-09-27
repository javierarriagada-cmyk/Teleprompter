package com.sigoteleprompter.app;

import android.content.res.Resources;

import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.os.ConfigurationCompat;
import androidx.core.os.LocaleListCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * EL IDIOMA DE LA APP ES EL AJUSTE DE ANDROID -27-09-2026, docs/ingles.txt D1-.
 *
 * Desde Android 13 cada app tiene su idioma en Ajustes del telefono -> Apps -> Idioma. Este
 * plugin hace que el selector ES · EN de la portada y ese ajuste sean LA MISMA cosa: lo que
 * se elige adentro aparece en Ajustes, y lo que se elige en Ajustes lo lee la app. Usa
 * AppCompatDelegate.setApplicationLocales, que en Android 12 o anterior guarda la eleccion
 * por su cuenta -AppLocalesMetadataHolderService con autoStoreLocales, en el manifiesto-.
 *
 * Los idiomas que la app ofrece estan en res/xml/locales_config.xml. El lado JavaScript es
 * src/lib/idioma.ts: sin este plugin -en el navegador y en las pruebas- usa localStorage.
 */
@CapacitorPlugin(name = "IdiomaApp")
public class IdiomaAppPlugin extends Plugin {

    /**
     * El idioma que Android tiene para esta app: el elegido para ella si hay uno, y si no el
     * del telefono. Solo el codigo corto -'es', 'en'-; src/lib/idioma.ts decide que hacer con
     * los demas.
     */
    @PluginMethod
    public void leer(PluginCall call) {
        LocaleListCompat deLaApp = AppCompatDelegate.getApplicationLocales();
        String idioma;
        if (!deLaApp.isEmpty() && deLaApp.get(0) != null) {
            idioma = deLaApp.get(0).getLanguage();
        } else {
            LocaleListCompat delTelefono = ConfigurationCompat.getLocales(Resources.getSystem().getConfiguration());
            idioma = delTelefono.isEmpty() || delTelefono.get(0) == null ? "" : delTelefono.get(0).getLanguage();
        }
        JSObject r = new JSObject();
        r.put("idioma", idioma);
        call.resolve(r);
    }

    /**
     * Guarda el idioma elegido como el idioma de la app para Android. La pantalla ya cambio
     * del lado JavaScript en el momento; esto hace que se recuerde y que Ajustes lo muestre.
     * La actividad NO se reinicia: el manifiesto declara locale|layoutDirection en
     * configChanges, asi que la lectura en curso y lo escrito no se pierden.
     */
    @PluginMethod
    public void fijar(PluginCall call) {
        String idioma = call.getString("idioma", "");
        if (!"es".equals(idioma) && !"en".equals(idioma)) {
            call.reject("Idioma no ofrecido: " + idioma);
            return;
        }
        getActivity().runOnUiThread(() -> {
            AppCompatDelegate.setApplicationLocales(LocaleListCompat.forLanguageTags(idioma));
            call.resolve();
        });
    }
}

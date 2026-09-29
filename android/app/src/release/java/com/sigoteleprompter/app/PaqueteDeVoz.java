package com.sigoteleprompter.app;

import android.app.Activity;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

import com.google.android.play.core.assetpacks.AssetPackLocation;
import com.google.android.play.core.assetpacks.AssetPackManager;
import com.google.android.play.core.assetpacks.AssetPackManagerFactory;
import com.google.android.play.core.assetpacks.AssetPackState;
import com.google.android.play.core.assetpacks.AssetPackStateUpdateListener;
import com.google.android.play.core.assetpacks.model.AssetPackErrorCode;
import com.google.android.play.core.assetpacks.model.AssetPackStatus;

import java.io.File;
import java.util.Collections;

/**
 * EL MODELO INGLÉS SE PIDE A GOOGLE PLAY LA PRIMERA VEZ -tarea 84, D2, 29-09-2026-.
 *
 * En el AAB de Play el modelo inglés viaja en su propio paquete de recursos, on-demand
 * -android/model-en-. No viene con la instalación: casi todos leen en español, y son 68 MB menos
 * para cada uno. La primera vez que alguien lee un guion en inglés, VoskNativoPlugin.asegurarVoz
 * llega aquí, esto lo pide a Play y va contando el avance -IndicadorPrecarga lo muestra-.
 *
 * DÓNDE QUEDA Y POR QUÉ NO SE COPIA. Un paquete on-demand queda como carpeta de archivos comunes en
 * la memoria de la app -AssetPackLocation.assetsPath()-, no dentro del APK. Vosk abre un modelo
 * desde cualquier carpeta -new Model(ruta)-, así que se carga directo de ahí: no hace falta la
 * copia de 68 MB que StorageService.unpack hace para los que vienen en assets.
 *
 * SIN INTERNET NO SE PIDE NADA. Play dejaría la descarga "pendiente" para siempre sin decir por
 * qué; se mira antes si hay red y, si no hay, se dice SIN_CONEXION: la app muestra el aviso y la
 * lectura no parte. Nunca un fallo en silencio.
 *
 * Solo en release: la APK de prueba usa src/debug/java/.../PaqueteDeVoz.java, sin la biblioteca de
 * Play, porque trae los dos modelos dentro -D4-.
 */
final class PaqueteDeVoz {

    interface Aviso {
        void progreso(double fraccion);
        void listo(String rutaModelo);
        void fallo(String codigo, String mensaje);
    }

    private PaqueteDeVoz() {}

    /**
     * El nombre del paquete de Play para la carpeta de un modelo: model-en viaja en model_en. Play
     * no acepta guiones en el nombre de un paquete -android/model-en/build.gradle-.
     */
    private static String nombreDelPaquete(String carpeta) {
        return carpeta.replace('-', '_');
    }

    /**
     * La carpeta del modelo si el paquete ya está bajado, o null. Adentro del paquete la carpeta
     * se llama como siempre -android/paquete-de-modelo.gradle-: model_en/assets/model-en.
     */
    static String rutaSiEsta(Context contexto, String carpetaModelo) {
        AssetPackLocation lugar = AssetPackManagerFactory.getInstance(contexto).getPackLocation(nombreDelPaquete(carpetaModelo));
        if (lugar == null || lugar.assetsPath() == null) return null;
        File carpeta = new File(lugar.assetsPath(), carpetaModelo);
        return new File(carpeta, "am").exists() ? carpeta.getAbsolutePath() : null;
    }

    static void bajar(Activity actividad, Context contexto, String carpetaModelo, Aviso aviso) {
        final String paquete = nombreDelPaquete(carpetaModelo);
        if (!hayInternet(contexto)) {
            aviso.fallo("SIN_CONEXION", "Sin conexión para bajar " + paquete);
            return;
        }
        final AssetPackManager play = AssetPackManagerFactory.getInstance(contexto);
        final boolean[] terminado = { false };
        final boolean[] yaPreguntado = { false };
        AssetPackStateUpdateListener oyente = new AssetPackStateUpdateListener() {
            @Override
            public void onStateUpdate(AssetPackState estado) {
                if (!paquete.equals(estado.name()) || terminado[0]) return;
                switch (estado.status()) {
                    case AssetPackStatus.PENDING:
                        aviso.progreso(0);
                        break;
                    case AssetPackStatus.DOWNLOADING:
                        long total = estado.totalBytesToDownload();
                        aviso.progreso(total > 0 ? (double) estado.bytesDownloaded() / total : 0);
                        break;
                    case AssetPackStatus.TRANSFERRING:
                        // Ya bajó: Play lo está dejando en su carpeta. Se muestra casi lleno.
                        aviso.progreso(0.99);
                        break;
                    case AssetPackStatus.WAITING_FOR_WIFI:
                    case AssetPackStatus.REQUIRES_USER_CONFIRMATION:
                        // Play pide permiso para bajar por datos móviles, o porque la app no se
                        // instaló desde Play. Se le muestra su propio diálogo una vez; si la persona
                        // dice que no, llega CANCELED y se avisa.
                        if (!yaPreguntado[0] && actividad != null) {
                            yaPreguntado[0] = true;
                            play.showConfirmationDialog(actividad);
                        }
                        break;
                    case AssetPackStatus.COMPLETED:
                        terminado[0] = true;
                        play.unregisterListener(this);
                        String ruta = rutaSiEsta(contexto, carpetaModelo);
                        if (ruta != null) aviso.listo(ruta);
                        else aviso.fallo("SIN_MODELO", "Play dice que " + paquete + " está, pero la carpeta no tiene el modelo");
                        break;
                    case AssetPackStatus.FAILED:
                        terminado[0] = true;
                        play.unregisterListener(this);
                        int codigo = estado.errorCode();
                        aviso.fallo(codigo == AssetPackErrorCode.NETWORK_ERROR ? "SIN_CONEXION" : "PLAY_" + codigo,
                            "Play no pudo bajar " + paquete + " -código " + codigo + "-");
                        break;
                    case AssetPackStatus.CANCELED:
                        terminado[0] = true;
                        play.unregisterListener(this);
                        aviso.fallo("CANCELADA", "La descarga de " + paquete + " se canceló");
                        break;
                    default:
                        break;
                }
            }
        };
        play.registerListener(oyente);
        play.fetch(Collections.singletonList(paquete)).addOnFailureListener((e) -> {
            if (terminado[0]) return;
            terminado[0] = true;
            play.unregisterListener(oyente);
            aviso.fallo("PLAY", "No se pudo pedir " + paquete + " a Play: " + e.getMessage());
        });
    }

    private static boolean hayInternet(Context contexto) {
        ConnectivityManager cm = (ConnectivityManager) contexto.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return true;
        Network red = cm.getActiveNetwork();
        if (red == null) return false;
        NetworkCapabilities capacidades = cm.getNetworkCapabilities(red);
        return capacidades != null && capacidades.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }
}

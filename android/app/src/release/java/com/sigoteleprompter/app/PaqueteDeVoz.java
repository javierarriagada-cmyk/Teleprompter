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
 * -tarea 104, PASO 2, 06-10-2026- AHORA LOS DOS MODELOS DE VOZ, Y EL DE GESTOS, SE PIDEN A PLAY.
 *
 * El español también dejó de venir con la instalación: su paquete -android/model-es- es on-demand,
 * igual que el inglés, y Vosk lo abre directo de su carpeta, sin la copia de StorageService.unpack.
 * Lo pide la precarga silenciosa al abrir la app -bajar con silencioso: true-, el del idioma de la
 * app, y asegurarVoz al apretar Empezar queda de respaldo. El modelo de gestos va en su propio paquete
 * a pedido -android/gestos- y se pide la primera vez que alguien enciende Control por gestos
 * -bajarGestos, rutaGestosSiEsta-, con el diálogo de Play si hace falta -opción B, igual que Empezar-.
 * Lo que sigue, del inglés, vale ahora para los tres.
 *
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
        // -tarea 104- Solo en silencio: Play la dejó en pausa -WAITING_FOR_WIFI o
        // REQUIRES_USER_CONFIRMATION- y la retoma sola con Wi-Fi. No se mostró ningún diálogo.
        void enPausa();
    }

    // -tarea 104- Dónde quedó lo bajado, preguntado de nuevo al terminar: la carpeta del modelo de voz o
    // el archivo de gestos. null si Play dice que está pero no se encuentra.
    private interface Ruta {
        String buscar();
    }

    /**
     * EL MODELO DE GESTOS -tarea 104-. Su paquete se llama "gestos" -android/gestos/build.gradle- y
     * adentro va gestos/gesture_recognizer.task. Un paquete on-demand Play lo deja como archivos comunes
     * -AssetPackStorageMethod.STORAGE_FILES-: se devuelve la ruta ABSOLUTA del .task, que es lo que deja
     * a MediaPipe abrirlo y mapearlo sin copiarlo a la caché -GestosPlugin, ver ahí la evidencia-.
     */
    static final String PAQUETE_GESTOS = "gestos";
    static final String ARCHIVO_GESTOS = "gesture_recognizer.task";

    static String rutaGestosSiEsta(Context contexto) {
        AssetPackLocation lugar = AssetPackManagerFactory.getInstance(contexto).getPackLocation(PAQUETE_GESTOS);
        if (lugar == null || lugar.assetsPath() == null) return null;
        File archivo = new File(new File(lugar.assetsPath(), PAQUETE_GESTOS), ARCHIVO_GESTOS);
        return archivo.isFile() ? archivo.getAbsolutePath() : null;
    }

    // -tarea 104, Javier 06-10-2026- silencioso: false a propósito: encender Control por gestos es una
    // acción explícita, como Empezar con la voz -opción B-. Si Play pide confirmación -Wi-Fi / datos-,
    // sale showConfirmationDialog; si dice que no, llega RECHAZADA y la fila lo dice con el interruptor
    // apagado. No hay precarga silenciosa de gestos al abrir la app.
    static void bajarGestos(Activity actividad, Context contexto, Aviso aviso) {
        bajarPaquete(actividad, contexto, PAQUETE_GESTOS, false, () -> rutaGestosSiEsta(contexto), aviso);
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

    /**
     * -tarea 104- silencioso: lo pide la precarga al abrir la app. Nunca muestra el diálogo de Play
     * -opción B, Javier-: si Play lo pediría, deja la descarga en pausa -Play la retoma sola con Wi-Fi- y
     * avisa enPausa. Sin silencioso -asegurarVoz, al apretar Empezar- el diálogo sí sale; es el que
     * dice el tamaño de la descarga, como pide Play.
     * Antes: static void bajar(Activity actividad, Context contexto, String carpetaModelo, Aviso aviso)
     */
    static void bajar(Activity actividad, Context contexto, String carpetaModelo, boolean silencioso, Aviso aviso) {
        bajarPaquete(actividad, contexto, nombreDelPaquete(carpetaModelo), silencioso,
            () -> rutaSiEsta(contexto, carpetaModelo), aviso);
    }

    // -tarea 104- Lo que antes era el cuerpo de bajar, ahora para cualquier paquete -voz o gestos-.
    private static void bajarPaquete(Activity actividad, Context contexto, String paquete, boolean silencioso, Ruta ruta, Aviso aviso) {
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
                        // -tarea 104- Ese "llega CANCELED" no lo dice la documentación: el diálogo
                        // devuelve RESULT_CANCELED en su Task y el paquete se queda en WAITING_FOR_WIFI.
                        // Como el Task se ignoraba, el oyente no terminaba nunca y Empezar quedaba
                        // esperando sin aviso. Ahora se lee el resultado: si no es RESULT_OK, se
                        // termina con RECHAZADA y la app lo dice con Reintentar. Y en silencio no se
                        // pregunta nada: queda en pausa y Play la retoma con Wi-Fi.
                        // Antes:
                        //   if (!yaPreguntado[0] && actividad != null) {
                        //       yaPreguntado[0] = true;
                        //       play.showConfirmationDialog(actividad);
                        //   }
                        if (silencioso) {
                            terminado[0] = true;
                            play.unregisterListener(this);
                            aviso.enPausa();
                            break;
                        }
                        if (yaPreguntado[0]) break;
                        yaPreguntado[0] = true;
                        if (actividad == null) {
                            terminado[0] = true;
                            play.unregisterListener(this);
                            aviso.fallo("RECHAZADA", "Play pide confirmar la descarga de " + paquete + " y no hay pantalla para preguntar");
                            break;
                        }
                        final AssetPackStateUpdateListener esteOyente = this;
                        play.showConfirmationDialog(actividad)
                            .addOnSuccessListener((resultado) -> {
                                if (resultado != null && resultado == Activity.RESULT_OK) return;
                                if (terminado[0]) return;
                                terminado[0] = true;
                                play.unregisterListener(esteOyente);
                                aviso.fallo("RECHAZADA", "No se aceptó bajar " + paquete + " por datos móviles");
                            })
                            .addOnFailureListener((e) -> {
                                if (terminado[0]) return;
                                terminado[0] = true;
                                play.unregisterListener(esteOyente);
                                aviso.fallo("RECHAZADA", "Play no pudo preguntar por " + paquete + ": " + e.getMessage());
                            });
                        break;
                    case AssetPackStatus.COMPLETED:
                        terminado[0] = true;
                        play.unregisterListener(this);
                        // -tarea 104- Antes: String ruta = rutaSiEsta(contexto, carpetaModelo);
                        String lugar = ruta.buscar();
                        if (lugar != null) aviso.listo(lugar);
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
        // -tarea 104- El estado que devuelve fetch también se mira: si el paquete ya estaba en pausa o
        // ya estaba completo, Play no tiene por qué mandar otro aviso al oyente, y se quedaría esperando.
        // Antes: play.fetch(Collections.singletonList(paquete)).addOnFailureListener((e) -> {
        play.fetch(Collections.singletonList(paquete)).addOnSuccessListener((estados) -> {
            AssetPackState estado = estados.packStates().get(paquete);
            if (estado != null) oyente.onStateUpdate(estado);
        }).addOnFailureListener((e) -> {
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

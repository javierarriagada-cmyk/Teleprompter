package com.sigoteleprompter.app;

import java.io.File;
import java.nio.file.Files;

/**
 * LA COPIA VIEJA DEL MODELO ESPAÑOL, QUE SE BORRA UNA VEZ -tarea 104, PASO 2, 06-10-2026-.
 *
 * Hasta la 0.9.0 el español venía con la instalación -paquete install-time- y VoskNativoPlugin lo
 * pasaba por StorageService.unpack, que lo copia entero la primera vez a
 * getExternalFilesDir(null)/model-es -StorageService.java:68-75, vosk-api 625e44c-: 57,5 MB repetidos.
 * Desde la tarea 104 el español es un paquete a pedido y Vosk lo abre directo desde la carpeta del
 * paquete -PaqueteDeVoz.rutaSiEsta-, sin copia. A quien actualiza le queda esa copia huérfana: se borra
 * una vez, cuando el modelo nuevo ya abrió desde el paquete.
 *
 * QUÉ SE BORRA Y QUÉ NO.
 *  - Solo la carpeta de nombre fijo "model-es" dentro de getExternalFilesDir(null). Nunca la carpeta
 *    entera, nunca un comodín, nunca "model-en" -en la APK de prueba se usa-.
 *  - Solo si el español NO viene en los assets: en la APK de prueba sigue entrando por unpack y esa
 *    carpeta es la que usa; borrarla forzaría una copia de 57 MB en cada arranque.
 *  - Solo después de abrir el español desde su paquete: si el paquete todavía no bajó, la copia vieja
 *    no molesta a nadie y no se toca.
 *  - Las grabaciones -getFilesDir()/grabaciones-, el audio del oído -getFilesDir()/oido-, los videos
 *    guardados -MediaStore, Movies/Sigo-, el video temporal de la cámara -files/Movies/CameraPreview,
 *    hermana de model-es- y los guiones -IndexedDB del WebView- están en otros lugares: no se tocan.
 *  - "Una vez" sale solo: después de borrarla no existe y no hay nada que hacer. No hace falta marca.
 *  - Los enlaces simbólicos se borran como enlace, sin entrar: así nada de afuera de la carpeta se
 *    puede borrar por accidente.
 *
 * Java puro, sin Android: la decisión se prueba en CopiaViejaDelModeloTest.
 */
final class CopiaViejaDelModelo {

    static final String CARPETA_ESPANOL = "model-es";

    private CopiaViejaDelModelo() {}

    /**
     * La carpeta que hay que borrar, o null si no hay que borrar nada.
     *
     * @param base            getExternalFilesDir(null); puede ser null si el almacenamiento no está.
     * @param idiomaAbierto   el idioma del modelo que se acaba de abrir desde su paquete.
     * @param espanolEnAssets si el español viene en los assets -la APK de prueba-.
     */
    static File carpetaABorrar(File base, String idiomaAbierto, boolean espanolEnAssets) {
        if (base == null) return null;
        if (!"es".equals(idiomaAbierto)) return null;
        if (espanolEnAssets) return null;
        File copia = new File(base, CARPETA_ESPANOL);
        return copia.exists() ? copia : null;
    }

    /** Borra la copia vieja si corresponde. Devuelve true si había algo que borrar. */
    static boolean limpiar(File base, String idiomaAbierto, boolean espanolEnAssets) {
        File copia = carpetaABorrar(base, idiomaAbierto, espanolEnAssets);
        if (copia == null) return false;
        borrarRecursivo(copia);
        return true;
    }

    /** El mismo borrarRecursivo de VoskNativoPlugin, sin seguir enlaces simbólicos. */
    static void borrarRecursivo(File f) {
        if (!Files.isSymbolicLink(f.toPath())) {
            File[] hijos = f.listFiles();
            if (hijos != null) for (File h : hijos) borrarRecursivo(h);
        }
        if (!f.delete()) System.err.println("CopiaViejaDelModelo: no se pudo borrar " + f);
    }
}

package com.teleprompter.app;

import android.Manifest;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.StorageService;

/**
 * EL RECONOCEDOR NATIVO. Reemplaza a Vosk WASM cuando la aplicacion corre como APK.
 *
 * POR QUE EXISTE ESTE ARCHIVO, Y NO UN PLUGIN DE TERCEROS.
 *
 * Hay dos plugins de Capacitor para Vosk dando vueltas. Los dos son proyectos de una
 * sola persona; uno tiene el modelo clavado en portugues y su ultimo cambio es de
 * noviembre de 2024, y el otro baja los modelos por internet, que es exactamente el
 * problema que venimos a resolver.
 *
 * Lo que de verdad importa que sea de los autores de Vosk es la BIBLIOTECA
 * -com.alphacephei:vosk-android, en app/build.gradle-. El puente con Capacitor son
 * estas lineas, y son justo las que se rompen cuando Capacitor cambia de version: por
 * eso tienen que ser nuestras y no de alguien que dejo de tocar su repositorio.
 *
 * QUE RESUELVE, MEDIDO.
 *
 * La version web baja 34 MB en CADA lectura. Comprobado el 14 de septiembre de 2026
 * poniendo el telefono en modo avion: no arranca. En el corpus se ve que el
 * reconocedor no entrega nada durante los primeros 11 a 13 segundos, y que la primera
 * palabra que ubica es la 13 o la 15 del guion: Javier lee tres renglones a ciegas.
 *
 * Aca el modelo viaja adentro del APK -assets/model-es- y la biblioteca es codigo
 * compilado. No se baja nada y no se arma nada en tiempo de ejecucion.
 *
 * LO QUE ESTE ARCHIVO NO DECIDE.
 *
 * Nada del motor de lectura. El seguidor, avance.ts, el renglon trabado y la banda
 * siguen siendo los mismos y no se enteran de quien les habla. Esto solo entrega
 * palabras, en el mismo formato que venia entregando el WASM.
 */
@CapacitorPlugin(
    name = "VoskNativo",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = VoskNativoPlugin.MICROFONO)
    }
)
public class VoskNativoPlugin extends Plugin implements RecognitionListener {

    static final String MICROFONO = "microfono";

    /**
     * Tiene que coincidir con la carpeta de android/app/src/main/assets y con la
     * tarea genUUID de app/build.gradle. Si los tres no dicen lo mismo, el modelo no
     * se copia y Vosk falla despues, con un error que no menciona esto.
     */
    private static final String CARPETA_MODELO = "model-es";

    /**
     * 16 kHz. Es la frecuencia con la que se entrenaron los modelos small de Vosk;
     * darle otra cosa no falla, transcribe mal, que es peor.
     */
    private static final float FRECUENCIA = 16000.0f;

    private Model modelo = null;
    private SpeechService servicio = null;
    private PluginCall llamadaIniciar = null;

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("disponible", true);
        call.resolve(r);
    }

    @PluginMethod
    public void listo(PluginCall call) {
        MainActivity.notificarListo();
        call.resolve();
    }

    /**
     * Copia el modelo a la memoria interna la primera vez y lo deja cargado.
     *
     * NO ARRANCA EL MICROFONO. Son dos pasos a proposito: esto es lo lento -la copia
     * inicial- y tiene que poder hacerse al abrir la aplicacion, no al apretar Leer.
     * Fue el error de la version web: todo el trabajo caro pasaba al apretar Leer.
     */
    @PluginMethod
    public void iniciar(PluginCall call) {
        if (modelo != null) {
            call.resolve();
            return;
        }
        call.setKeepAlive(true);
        llamadaIniciar = call;
        StorageService.unpack(
            getContext(),
            CARPETA_MODELO,
            "model",
            (modeloCargado) -> {
                modelo = modeloCargado;
                if (llamadaIniciar != null) {
                    llamadaIniciar.resolve();
                    llamadaIniciar = null;
                }
            },
            (excepcion) -> {
                if (llamadaIniciar != null) {
                    llamadaIniciar.reject("No se pudo cargar el modelo: " + excepcion.getMessage());
                    llamadaIniciar = null;
                }
            }
        );
    }

    @PluginMethod
    public void escuchar(PluginCall call) {
        if (getPermissionState(MICROFONO) != PermissionState.GRANTED) {
            requestPermissionForAlias(MICROFONO, call, "trasPermiso");
            return;
        }
        arrancarServicio(call);
    }

    @PermissionCallback
    private void trasPermiso(PluginCall call) {
        if (getPermissionState(MICROFONO) != PermissionState.GRANTED) {
            call.reject("Sin permiso de microfono");
            return;
        }
        arrancarServicio(call);
    }

    private void arrancarServicio(PluginCall call) {
        if (modelo == null) {
            call.reject("El modelo no esta cargado: llamar a iniciar() primero");
            return;
        }
        if (servicio != null) {
            call.resolve();
            return;
        }
        try {
            Recognizer reconocedor = new Recognizer(modelo, FRECUENCIA);
            servicio = new SpeechService(reconocedor, FRECUENCIA);
            servicio.startListening(this);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir el microfono: " + e.getMessage());
        }
    }

    @PluginMethod
    public void detener(PluginCall call) {
        if (servicio != null) {
            servicio.stop();
            servicio.shutdown();
            servicio = null;
        }
        call.resolve();
    }

    // ── Lo que entrega Vosk ────────────────────────────────────────────────────────
    //
    // Los textos llegan como JSON y se pasan TAL CUAL al lado de JavaScript, sin
    // tocarlos. Parsear aca obligaria a mantener dos versiones del formato -una en
    // Java y otra en TypeScript- y a recompilar el APK cada vez que Vosk agregue un
    // campo. Del otro lado ya hay un parser.

    @Override
    public void onPartialResult(String hipotesis) {
        JSObject d = new JSObject();
        d.put("json", hipotesis);
        notifyListeners("parcial", d);
    }

    @Override
    public void onResult(String hipotesis) {
        JSObject d = new JSObject();
        d.put("json", hipotesis);
        notifyListeners("final", d);
    }

    /**
     * Llega al cerrar el flujo, con lo que quedo pendiente. Se emite como final igual:
     * son palabras que la persona dijo y el motor de lectura las necesita.
     */
    @Override
    public void onFinalResult(String hipotesis) {
        JSObject d = new JSObject();
        d.put("json", hipotesis);
        notifyListeners("final", d);
    }

    @Override
    public void onError(Exception e) {
        JSObject d = new JSObject();
        d.put("mensaje", e.getMessage());
        notifyListeners("error", d);
    }

    /**
     * SpeechService corta solo tras un rato sin voz. En una lectura a camara hay
     * pausas largas -Javier lee guiones de varios minutos-, asi que aca NO se deja
     * morir: se avisa al lado de JavaScript, que decide.
     */
    @Override
    public void onTimeout() {
        notifyListeners("silencio", new JSObject());
    }

    @Override
    protected void handleOnDestroy() {
        if (servicio != null) {
            servicio.stop();
            servicio.shutdown();
            servicio = null;
        }
        if (modelo != null) {
            modelo.close();
            modelo = null;
        }
        super.handleOnDestroy();
    }
}

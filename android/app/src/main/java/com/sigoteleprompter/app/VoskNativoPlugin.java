package com.sigoteleprompter.app;

import android.Manifest;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;

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
import org.vosk.android.StorageService;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Arrays;

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
 * -tarea 104, 06-10-2026- Eso sigue siendo así en la APK de prueba. En la versión de Play ningún
 * modelo viene en el APK: el del idioma de la app se baja de Play una vez, en silencio, al abrir la
 * app -asegurarVoz con silencioso, PaqueteDeVoz-, y después funciona sin internet.
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
public class VoskNativoPlugin extends Plugin {

    static final String MICROFONO = "microfono";

    /**
     * Tiene que coincidir con la carpeta de android/app/src/main/assets y con la
     * tarea genUUID de app/build.gradle. Si los tres no dicen lo mismo, el modelo no
     * se copia y Vosk falla despues, con un error que no menciona esto.
     */
    //
    // DOS IDIOMAS -27-09-2026, docs/ingles.txt D3-: assets/model-es y assets/model-en. Cada uno
    // se desempaqueta en SU carpeta -antes todo iba a "model" y dos modelos se pisarian-, y se
    // carga uno a la vez: el del idioma del guion que se va a leer.
    // -portugues-voz, 2026-10-22- TRES IDIOMAS: se suma assets/model-pt. La carpeta sale de idiomaDeVoz, la única regla.
    // PaqueteDeVoz ya arma model_pt desde model-pt -nombreDelPaquete cambia el guion-: no se repite.
    // Antes:
    //   return "en".equals(idioma) ? "model-en" : "model-es";
    private static String carpetaModelo(String idioma) {
        return "model-" + idiomaDeVoz(idioma);
    }

    // -portugues-voz, 2026-10-22- UNA SOLA REGLA PARA EL IDIOMA DE LA VOZ, la misma de lib/vozAPedido.ts idiomaDeVoz:
    // 'es', 'en' o 'pt'. Un idioma que no conocemos no puede dejar a la app sin reconocedor: se
    // escucha en español, pero queda escrito en el registro para que no pase callado.
    static String idiomaDeVoz(String idioma) {
        if ("es".equals(idioma) || "en".equals(idioma) || "pt".equals(idioma)) return idioma;
        android.util.Log.w("VoskNativo", "idioma desconocido, se escucha en español: " + idioma);
        return "es";
    }

    /**
     * 16 kHz. Es la frecuencia con la que se entrenaron los modelos small de Vosk;
     * darle otra cosa no falla, transcribe mal, que es peor.
     */
    private static final float FRECUENCIA = 16000.0f;

    /**
     * EL OIDO PROPIO -24-09-2026-. Hasta aca el microfono lo abria SpeechService, la
     * clase de ejemplo de Vosk: leia de a 0,2 s y entregaba cada resultado pasando por
     * el hilo principal. Medido en dos tomas: las palabras llegaban a la aplicacion 0,5
     * a 1,4 s despues de dichas, y con el mismo modelo sobre el audio del video, en el
     * PC, 0,3 s. Esa diferencia -casi una palabra- no se podia ver desde afuera de
     * SpeechService. Este lazo hace lo mismo que el, y ademas:
     *
     *   - anota cuando se leyo cada trozo, cuanto tardo Vosk en procesarlo y en que
     *     milisegundo del audio termina: separa la demora del microfono, la de Vosk y
     *     la del cruce a JavaScript;
     *   - lee de a 0,1 s -en el PC gana 0,02 s; lo que importa es poder medir-;
     *   - guarda, si se le pide, el audio EXACTO que escucho Vosk. El del video es
     *     otro microfono con otro procesamiento. Con este se puede afinar el
     *     reconocedor en el PC contra lecturas reales, sin que Javier grabe cada prueba;
     *   - entrega el nivel del microfono de cada trozo: la base para saber al instante
     *     si la persona esta hablando, sin esperar al reconocedor.
     *
     * La fuente es la misma que usaba SpeechService: VOICE_RECOGNITION.
     *
     * TROZOS DE 20 MS Y --frames-per-chunk=3 EN assets/model-es/conf/model.conf
     * -24-09-2026, medido-. Con el audio exacto que escucho Vosk en doce lecturas de
     * Javier, pasado por Vosk en el PC -teleprom/02-lecturas/motor-24-sep, banco.py-,
     * cuanto tarda una palabra en aparecer en un parcial desde que termina de decirse:
     *
     *   trozo 100 ms, modelo como venia          290 ms   p90 520
     *   trozo  20 ms, modelo como venia          250 ms   p90 490
     *   trozo  20 ms, --frames-per-chunk=5       160 ms   p90 340
     *   trozo  20 ms, --frames-per-chunk=3       140 ms   p90 310
     *
     * Y reconoce lo mismo: 96,6% de las palabras oidas estan en el guion en todos los
     * casos. frames-per-chunk es cada cuantos cuadros de audio corre la red de Vosk; el
     * modelo lo dejaba en su valor por omision y eso retenia las palabras. Cuesta mas
     * proceso: en el PC paso de 20 a 7 veces mas rapido que el tiempo real.
     *
     * Con trozos de 20 ms habria 50 parciales por segundo cruzando a JavaScript. Se
     * entrega uno solo cuando el texto CAMBIA -es lo unico que mueve la pantalla-, o cada
     * TROZOS_POR_ENTREGA trozos para que el registro siga teniendo los tiempos y el nivel.
     */
    private static final float SEGUNDOS_POR_TROZO = 0.02f;
    private static final int TROZOS_POR_ENTREGA = 5;
    // Cuantos audios guardados se conservan. Cada minuto son 1,9 MB.
    private static final int AUDIOS_GUARDADOS = 12;

    /**
     * EL RELEVO DEL MICROFONO -24-09-2026, medido en el telefono de Javier-.
     *
     * Si el microfono ya esta abierto cuando la camara empieza a grabar video con
     * sonido, Android le deja al microfono un atraso que NO se recupera en toda la
     * toma: el audio llega 0,3 s tarde en la prueba y 0,50 a 0,77 s en dos tomas
     * reales, contra 0,09 s sin camara. Abierto DESPUES de que la camara graba, llega
     * a tiempo -0,09 s-. Y en la aplicacion el orden es justo el malo: el microfono
     * arranca al terminar la cuenta y el video un instante despues -App.tsx-.
     *
     * Se arregla aca y no cambiando ese orden, porque aca se arregla sea cual sea la
     * causa: si el audio llega con mas de UMBRAL_RETENCION_MS de atraso durante
     * TROZOS_PARA_RELEVO trozos seguidos, se abre un microfono nuevo -el relevo-. El
     * viejo se sigue leyendo hasta que su audio alcanza el instante en que se abrio el
     * relevo, y ahi se cambia: no se pierde audio ni se repite, y el reloj del audio
     * sigue siendo el mismo. El relevo guarda lo suyo mientras tanto en un buffer
     * grande, y al cambiar se lee de corrido hasta ponerse al dia.
     */
    private static final long UMBRAL_RETENCION_MS = 250;
    // En tiempo, no en trozos: medio segundo seguido de atraso -25 trozos de 20 ms-.
    private static final int TROZOS_PARA_RELEVO = Math.round(0.5f / SEGUNDOS_POR_TROZO);
    private static final long MS_ENTRE_RELEVOS = 5000;
    private static final float SEGUNDOS_BUFFER_RELEVO = 3.0f;

    private Model modelo = null;
    // El idioma del modelo cargado -'es' o 'en'-: si piden otro, se cambia.
    private String idiomaModelo = null;
    private Oido oido = null;
    private PluginCall llamadaIniciar = null;

    @PluginMethod
    public void disponible(PluginCall call) {
        JSObject r = new JSObject();
        r.put("disponible", true);
        call.resolve(r);
    }

    /**
     * -tarea 104- En la versión de Play ya no copia nada: abre el modelo desde la carpeta de su paquete
     * -cargarDesdeCarpeta-. La copia de abajo queda solo para la APK de prueba, que lo trae en assets.
     *
     * Copia el modelo a la memoria interna la primera vez y lo deja cargado.
     *
     * NO ARRANCA EL MICROFONO. Son dos pasos a proposito: esto es lo lento -la copia
     * inicial- y tiene que poder hacerse al abrir la aplicacion, no al apretar Leer.
     * Fue el error de la version web: todo el trabajo caro pasaba al apretar Leer.
     */
    @PluginMethod
    public void iniciar(PluginCall call) {
        // 'es' salvo que pidan ingles: un idioma que no conocemos no puede dejar a la app sin
        // reconocedor.
        // -portugues-voz, 2026-10-22- Ahora con idiomaDeVoz, que suma 'pt'. Antes:
        //   String idioma = "en".equals(call.getString("idioma", "es")) ? "en" : "es";
        String idioma = idiomaDeVoz(call.getString("idioma", "es"));
        if (modelo != null && idioma.equals(idiomaModelo)) {
            call.resolve();
            return;
        }
        if (modelo != null) {
            // Cambiar de idioma con el microfono abierto dejaria al oido con un reconocedor
            // del modelo viejo. Desde JavaScript se detiene antes de pedir otro idioma.
            if (oido != null) {
                call.reject("No se puede cambiar el idioma mientras se escucha");
                return;
            }
            modelo.close();
            modelo = null;
            idiomaModelo = null;
        }
        borrarCarpetaVieja();
        // -tarea 104, PASO 2, 06-10-2026- AHORA: en la versión de Play NINGÚN modelo viene en assets. El
        // español también es on-demand -android/model-es- y se abre directo de la carpeta de su
        // paquete con PaqueteDeVoz.rutaSiEsta, sin StorageService.unpack: se acabó la copia de 57,5 MB
        // que lo dejaba dos veces en el teléfono. Y AL ABRIR LA APP SÍ se pide, en silencio, el modelo
        // del idioma de la app: la precarga llama primero a esto -que, si falta, sigue rechazando con
        // VOZ_NO_DESCARGADA- y después a asegurarVoz con silencioso, que lo baja sin avisos y sin el
        // diálogo de Play. asegurarVoz al apretar Empezar queda de respaldo, por si todavía no llegó.
        // Motivo -Javier-: unos 150 MB instalados por la copia, y cada 6 MB de descarga cuestan cerca
        // de 1 % de instalaciones. La APK de prueba sigue igual: los dos en assets, por unpack.
        // Antes, con su motivo de entonces:
        // EL MODELO QUE NO VIENE EN ASSETS -tarea 84, D2, 29-09-2026-. En la APK de prueba los dos
        // vienen en assets y en la versión de Play el español también -su paquete es install-time
        // y Android lo junta con los assets de la app-: los dos siguen por StorageService.unpack,
        // como siempre. El inglés de Play no: su paquete es on-demand y queda en una carpeta
        // aparte. Si ya se bajó, Vosk lo abre directo desde ahí, sin copiarlo; si no, iniciar NO
        // lo pide -esto también lo llama la precarga silenciosa al abrir la app, y bajar 68 MB sin
        // que nadie lo pida no corresponde-: lo pide asegurarVoz, al apretar Empezar.
        if (!enAssets(carpetaModelo(idioma))) {
            String ruta = PaqueteDeVoz.rutaSiEsta(getContext(), carpetaModelo(idioma));
            if (ruta == null) {
                call.reject("El modelo " + carpetaModelo(idioma) + " no está bajado", "VOZ_NO_DESCARGADA");
                return;
            }
            cargarDesdeCarpeta(call, ruta, idioma);
            return;
        }
        call.setKeepAlive(true);
        llamadaIniciar = call;
        final String idiomaPedido = idioma;
        StorageService.unpack(
            getContext(),
            carpetaModelo(idioma),
            carpetaModelo(idioma),
            (modeloCargado) -> {
                modelo = modeloCargado;
                idiomaModelo = idiomaPedido;
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

    /**
     * EL MODELO DEL IDIOMA, LISTO PARA LEER, BAJÁNDOLO SI HACE FALTA -tarea 84, D2 y D3-.
     *
     * Lo llama la app al apretar Empezar, antes de la cuenta. Si el modelo está -en assets, o su
     * paquete ya bajado- responde al instante. Si no, lo pide a Play -PaqueteDeVoz, solo en la
     * versión de Play- y va avisando el avance con el evento "progresoVoz" -de 0 a 1-: la app lo
     * muestra en el mismo IndicadorPrecarga de siempre. Sin internet rechaza con SIN_CONEXION y la
     * app dice que hace falta conexión una vez; la lectura no parte.
     */
    //
    // -tarea 104- silencioso: lo pide la precarga al abrir la app -lib/vozAPedido.ts-. Nunca muestra el
    // diálogo de Play: si Play lo pediría, responde estado "en-pausa" y Play la retoma sola con Wi-Fi
    // -opción B, Javier-. Sin silencioso, si la persona dice que no al diálogo, rechaza con RECHAZADA.
    @PluginMethod
    public void asegurarVoz(PluginCall call) {
        // -portugues-voz, 2026-10-22- Ahora con idiomaDeVoz, que suma 'pt'. Antes:
        //   String idioma = "en".equals(call.getString("idioma", "es")) ? "en" : "es";
        String idioma = idiomaDeVoz(call.getString("idioma", "es"));
        final boolean silencioso = Boolean.TRUE.equals(call.getBoolean("silencioso", false));
        final String paquete = carpetaModelo(idioma);
        if (enAssets(paquete) || PaqueteDeVoz.rutaSiEsta(getContext(), paquete) != null) {
            JSObject r = new JSObject();
            r.put("estado", "lista");
            call.resolve(r);
            return;
        }
        // Antes: PaqueteDeVoz.bajar(getActivity(), getContext(), paquete, new PaqueteDeVoz.Aviso() {
        PaqueteDeVoz.bajar(getActivity(), getContext(), paquete, silencioso, new PaqueteDeVoz.Aviso() {
            @Override
            public void progreso(double fraccion) {
                JSObject d = new JSObject();
                d.put("idioma", idioma);
                d.put("progreso", fraccion);
                notifyListeners("progresoVoz", d);
            }

            @Override
            public void listo(String rutaModelo) {
                JSObject r = new JSObject();
                r.put("estado", "lista");
                r.put("descargada", true);
                call.resolve(r);
            }

            @Override
            public void fallo(String codigo, String mensaje) {
                call.reject(mensaje, codigo);
            }

            @Override
            public void enPausa() {
                JSObject r = new JSObject();
                r.put("estado", "en-pausa");
                call.resolve(r);
            }
        });
    }

    /**
     * Si la carpeta del modelo está en los assets -los de la app o los de un paquete install-time,
     * que Android junta con ellos-. Se mira el uuid, que genUUID pone en cada carpeta de modelo.
     * -tarea 104- Ya no hay paquetes install-time: en la versión de Play esto da false para los dos
     * modelos, y true solo en la APK de prueba.
     */
    private boolean enAssets(String carpeta) {
        try {
            getContext().getAssets().open(carpeta + "/uuid").close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Carga un modelo desde una carpeta común -el paquete on-demand ya bajado-, sin copiarlo.
     * En su propio hilo: new Model tarda segundos con un modelo de 68 MB, y el hilo del plugin
     * no puede quedarse esperando.
     */
    private void cargarDesdeCarpeta(PluginCall call, String ruta, String idioma) {
        new Thread(() -> {
            try {
                Model cargado = new Model(ruta);
                modelo = cargado;
                idiomaModelo = idioma;
                call.resolve();
                // -tarea 104- El español ya abrió desde su paquete: la copia vieja de la 0.9.0 sobra.
                // Aquí, en este hilo, para no borrar 57 MB en el hilo del plugin.
                if ("es".equals(idioma)) borrarCopiaViejaDelEspanol();
            } catch (Exception e) {
                call.reject("No se pudo cargar el modelo: " + e.getMessage());
            }
        }, "sigo-modelo").start();
    }

    /**
     * Hasta el 27-09-2026 el modelo espanol se desempaquetaba en "model". Ahora cada idioma
     * va en su carpeta, y esa copia vieja -57 MB- quedaria huerfana en el telefono. Se
     * borra una vez; si no esta, no hace nada.
     */
    private void borrarCarpetaVieja() {
        java.io.File base = getContext().getExternalFilesDir(null);
        if (base == null) return;
        java.io.File vieja = new java.io.File(base, "model");
        if (vieja.exists()) borrarRecursivo(vieja);
    }

    /**
     * -tarea 104, PASO 2- LA OTRA COPIA VIEJA, sobre la misma idea que borrarCarpetaVieja. Hasta la
     * 0.9.0 el español venía con la instalación y StorageService.unpack lo copiaba a
     * getExternalFilesDir(null)/model-es -57 MB-. Ahora se abre desde su paquete y esa copia sobra: se
     * borra una vez, solo esa carpeta, solo en la versión de Play -en la APK de prueba el español sigue
     * en assets y esa copia es la que usa-. La decisión está en CopiaViejaDelModelo, con su prueba.
     */
    private void borrarCopiaViejaDelEspanol() {
        try {
            java.io.File base = getContext().getExternalFilesDir(null);
            if (CopiaViejaDelModelo.limpiar(base, "es", enAssets(CopiaViejaDelModelo.CARPETA_ESPANOL))) {
                android.util.Log.i("VoskNativo", "Se borró la copia vieja del modelo español en " + base);
            }
        } catch (Exception e) {
            android.util.Log.w("VoskNativo", "No se pudo borrar la copia vieja del español: " + e.getMessage());
        }
    }

    // -tarea 104- El borrado de verdad está en CopiaViejaDelModelo -sin seguir enlaces simbólicos-.
    // Antes:
    //   java.io.File[] hijos = f.listFiles();
    //   if (hijos != null) for (java.io.File h : hijos) borrarRecursivo(h);
    //   if (!f.delete()) android.util.Log.w("VoskNativo", "No se pudo borrar " + f);
    private static void borrarRecursivo(java.io.File f) {
        CopiaViejaDelModelo.borrarRecursivo(f);
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
        if (oido != null) {
            call.resolve();
            return;
        }
        try {
            Recognizer reconocedor = new Recognizer(modelo, FRECUENCIA);
            // EL TIEMPO DE CADA PALABRA -24-09-2026-. Vosk sabe en que segundo del
            // audio empieza y termina cada palabra que reconoce, pero solo lo dice si
            // se le pide. Es la vara del motor: con esto se mide cuanto tarda cada
            // palabra en llegar y a cuantas palabras va la pantalla de la voz. No
            // cambia lo que se reconoce.
            //
            // PERO SOLO EN LOS FINALES -24-09-2026, medido-. setPartialWords(true)
            // retrasa los PARCIALES: con el mismo modelo y el audio de una toma real,
            // las palabras aparecen 1,7 s despues de dichas con la opcion y 0,32 s
            // sin ella -scratchpad simvosk2.py, Vosk 0.3.45 en el PC; en el telefono
            // se midio 2,0 s con la opcion-. Y los parciales son lo que mueve la
            // pantalla. setWords(true) no cambia los parciales -5 de 206 distintos,
            // en cierres de frase-. El tiempo de cada palabra sale entonces de los
            // finales, y cuando aparecio, del texto de los parciales.
            reconocedor.setWords(true);
            int muestrasPorTrozo = Math.round(FRECUENCIA * SEGUNDOS_POR_TROZO);
            // LA FUENTE Y LA FRECUENCIA DEL MICROFONO, ELEGIBLES -24-09-2026-. Medido:
            // sin camara el microfono entrega cada trozo 0,09 s despues de dicho; con
            // la camara grabando video con sonido, 0,50 a 0,77 s. La camara -CameraX-
            // graba con su propia fuente y a 44,1 o 48 kHz, y Android le cuelga este
            // pedido a ese flujo. Para probar cual combinacion evita esa espera se
            // puede pedir otra fuente y leer a 48 kHz: se baja a 16 kHz aca.
            String fuente = call.getString("fuente", "VOICE_RECOGNITION");
            int frecuenciaMic = call.getInt("frecuenciaMic", (int) FRECUENCIA);
            int factor = Math.max(1, Math.round(frecuenciaMic / FRECUENCIA));
            int minimo = AudioRecord.getMinBufferSize(
                frecuenciaMic, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            AudioRecord grabadora = new AudioRecord(
                fuenteDeAudio(fuente),
                frecuenciaMic,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                // Medio segundo de colchon: con trozos de 20 ms, cuatro trozos serian 80 ms, y
                // cualquier tiron del telefono -la camara empezando a grabar- perderia audio.
                Math.max(minimo, Math.round(FRECUENCIA * 0.5f) * factor * 2));
            if (grabadora.getState() != AudioRecord.STATE_INITIALIZED) {
                grabadora.release();
                reconocedor.close();
                call.reject("No se pudo abrir el microfono");
                return;
            }
            grabadora.startRecording();
            // El cero de esos tiempos es el arranque del audio: se anota el reloj
            // del telefono justo al abrir el microfono.
            long inicioEpochMs = System.currentTimeMillis();
            String rutaAudio = null;
            OutputStream salida = null;
            if (Boolean.TRUE.equals(call.getBoolean("guardarAudio", false))) {
                File archivo = archivoDeAudio(inicioEpochMs);
                if (archivo != null) {
                    salida = new BufferedOutputStream(new FileOutputStream(archivo), 64 * 1024);
                    rutaAudio = archivo.getAbsolutePath();
                }
            }
            oido = new Oido(grabadora, reconocedor, salida, muestrasPorTrozo, factor,
                inicioEpochMs, fuenteDeAudio(fuente), frecuenciaMic);
            Thread hilo = new Thread(oido, "sigo-oido");
            oido.hilo = hilo;
            hilo.start();
            JSObject r = new JSObject();
            r.put("inicioEpochMs", inicioEpochMs);
            r.put("muestrasPorTrozo", muestrasPorTrozo);
            r.put("fuente", fuente);
            r.put("frecuenciaMic", frecuenciaMic);
            if (rutaAudio != null) r.put("rutaAudio", rutaAudio);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo abrir el microfono: " + e.getMessage());
        }
    }

    @PluginMethod
    public void detener(PluginCall call) {
        pararOido();
        call.resolve();
    }

    /**
     * Abre la pantalla de ajustes de Sigo en Android cuando la persona nego el permiso
     * de microfono y Android ya no muestra su cartel -28-09-2026-.
     */
    @PluginMethod
    public void abrirAjustesDeLaApp(PluginCall call) {
        try {
            android.content.Intent intent = new android.content.Intent(
                android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                android.net.Uri.fromParts("package", getContext().getPackageName(), null)
            );
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudieron abrir los ajustes de la app: " + e.getMessage());
        }
    }

    /**
     * Para el lazo y espera a que entregue lo que quedo pendiente. El hilo cierra el
     * microfono y el reconocedor el mismo -en su finally-: si esto se cortara antes de
     * que termine, cerrar el reconocedor desde aca lo dejaria usando memoria liberada.
     */
    private void pararOido() {
        Oido o = oido;
        oido = null;
        if (o == null) return;
        o.escuchando = false;
        if (o.hilo != null) {
            try {
                o.hilo.join(1500);
            } catch (InterruptedException ignorada) {
                Thread.currentThread().interrupt();
            }
        }
    }

    private static int fuenteDeAudio(String nombre) {
        switch (nombre) {
            case "MIC": return MediaRecorder.AudioSource.MIC;
            case "CAMCORDER": return MediaRecorder.AudioSource.CAMCORDER;
            case "UNPROCESSED": return MediaRecorder.AudioSource.UNPROCESSED;
            case "VOICE_COMMUNICATION": return MediaRecorder.AudioSource.VOICE_COMMUNICATION;
            case "VOICE_PERFORMANCE": return MediaRecorder.AudioSource.VOICE_PERFORMANCE;
            default: return MediaRecorder.AudioSource.VOICE_RECOGNITION;
        }
    }

    // El audio que escucho Vosk, crudo: 16 kHz, mono, 16 bits little-endian. Se
    // borran los mas viejos: quedan AUDIOS_GUARDADOS.
    private File archivoDeAudio(long inicioEpochMs) {
        File dir = new File(getContext().getFilesDir(), "oido");
        if (!dir.exists() && !dir.mkdirs()) return null;
        File[] viejos = dir.listFiles();
        if (viejos != null && viejos.length >= AUDIOS_GUARDADOS) {
            Arrays.sort(viejos, (a, b) -> Long.compare(a.lastModified(), b.lastModified()));
            for (int i = 0; i <= viejos.length - AUDIOS_GUARDADOS; i++) viejos[i].delete();
        }
        return new File(dir, inicioEpochMs + ".pcm");
    }

    /**
     * El lazo: lee un trozo, lo guarda si corresponde, se lo da a Vosk y entrega el
     * resultado. Es lo que hacia SpeechService.RecognizerThread, con los tiempos
     * anotados. Entrega desde este mismo hilo: notifyListeners ya encola hacia la
     * WebView, y pasar antes por el hilo principal -como SpeechService- solo agrega
     * una espera que depende de lo ocupada que este la pantalla.
     */
    private class Oido implements Runnable {
        // No es final: el relevo la reemplaza.
        AudioRecord grabadora;
        final Recognizer reconocedor;
        final OutputStream salida;
        final int muestrasPorTrozo;
        // Cuantas muestras del microfono hacen una de 16 kHz: 1, o 3 si se lee a 48 kHz.
        final int factor;
        // Para el relevo: el cero del reloj del audio y como abrir otro microfono igual.
        final long inicioEpochMs;
        final int fuente;
        final int frecuenciaMic;
        volatile boolean escuchando = true;
        Thread hilo = null;
        AudioRecord relevo = null;
        long relevoInicioEpochMs = 0;
        int relevos = 0;

        Oido(AudioRecord grabadora, Recognizer reconocedor, OutputStream salida, int muestrasPorTrozo, int factor,
             long inicioEpochMs, int fuente, int frecuenciaMic) {
            this.grabadora = grabadora;
            this.reconocedor = reconocedor;
            this.salida = salida;
            this.muestrasPorTrozo = muestrasPorTrozo;
            this.factor = factor;
            this.inicioEpochMs = inicioEpochMs;
            this.fuente = fuente;
            this.frecuenciaMic = frecuenciaMic;
        }

        // Abre el relevo con un buffer grande: no se lo lee hasta el cambio, y tiene
        // que aguantar sin perder nada lo que dure ponerse al dia con el viejo.
        private void abrirRelevo() {
            int minimo = AudioRecord.getMinBufferSize(
                frecuenciaMic, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
            int grande = Math.round(frecuenciaMic * SEGUNDOS_BUFFER_RELEVO) * 2;
            AudioRecord r = new AudioRecord(fuente, frecuenciaMic, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT, Math.max(minimo, grande));
            if (r.getState() != AudioRecord.STATE_INITIALIZED) {
                r.release();
                return;
            }
            r.startRecording();
            relevo = r;
            relevoInicioEpochMs = System.currentTimeMillis();
        }

        private void soltar(AudioRecord r) {
            if (r == null) return;
            try {
                r.stop();
            } catch (Exception ignorada) {
                // ya estaba parado
            }
            r.release();
        }

        @Override
        public void run() {
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
            short[] trozo = new short[muestrasPorTrozo];
            short[] crudo = new short[muestrasPorTrozo * factor];
            byte[] bytes = new byte[muestrasPorTrozo * 2];
            long muestras = 0;
            int trozosAtrasados = 0;
            String ultimoParcial = null;
            int trozosSinEntregar = 0;
            double rmsMaximo = 0;
            long ultimoRelevoEpochMs = 0;
            try {
                while (escuchando) {
                    int leidas = grabadora.read(crudo, 0, crudo.length);
                    long leido = System.currentTimeMillis();
                    if (leidas < 0) throw new IOException("error leyendo el microfono: " + leidas);
                    if (leidas == 0) continue;
                    // A 16 kHz: el promedio de cada grupo de 'factor' muestras. Es un
                    // filtro pobre -deja pasar algo sobre 8 kHz- y alcanza para medir la
                    // espera; si esta fuente gana, se pone uno bueno.
                    int n = leidas / factor;
                    if (factor == 1) {
                        System.arraycopy(crudo, 0, trozo, 0, n);
                    } else {
                        for (int i = 0; i < n; i++) {
                            int s = 0;
                            for (int k = 0; k < factor; k++) s += crudo[i * factor + k];
                            trozo[i] = (short) (s / factor);
                        }
                    }
                    if (n == 0) continue;
                    // Con relevo abierto: del trozo del viejo se usa solo lo que es
                    // anterior al instante en que se abrio el relevo. Lo demas ya lo
                    // tiene el relevo, y ahi se cambia.
                    boolean cambiar = false;
                    if (relevo != null) {
                        long desdeEpoch = inicioEpochMs + muestras * 1000L / (long) FRECUENCIA;
                        long hasta = (relevoInicioEpochMs - desdeEpoch) * (long) FRECUENCIA / 1000L;
                        if (hasta < n) {
                            n = (int) Math.max(0, hasta);
                            cambiar = true;
                        }
                    }
                    if (n > 0) {
                    muestras += n;
                    double suma = 0;
                    for (int i = 0; i < n; i++) suma += (double) trozo[i] * trozo[i];
                    double rms = Math.sqrt(suma / n) / 32768.0;
                    if (salida != null) {
                        for (int i = 0; i < n; i++) {
                            bytes[2 * i] = (byte) (trozo[i] & 0xff);
                            bytes[2 * i + 1] = (byte) ((trozo[i] >> 8) & 0xff);
                        }
                        salida.write(bytes, 0, n * 2);
                    }
                    boolean cerro = reconocedor.acceptWaveForm(trozo, n);
                    String json = cerro ? reconocedor.getResult() : reconocedor.getPartialResult();
                    long procesado = System.currentTimeMillis();
                    rmsMaximo = Math.max(rmsMaximo, rms);
                    trozosSinEntregar++;
                    if (cerro || !json.equals(ultimoParcial) || trozosSinEntregar >= TROZOS_POR_ENTREGA) {
                        entregar(cerro ? "final" : "parcial", json, muestras * 1000L / (long) FRECUENCIA, leido, procesado, rmsMaximo);
                        ultimoParcial = cerro ? null : json;
                        trozosSinEntregar = 0;
                        rmsMaximo = 0;
                    }
                    }
                    if (cambiar) {
                        soltar(grabadora);
                        grabadora = relevo;
                        relevo = null;
                        relevos++;
                        ultimoRelevoEpochMs = System.currentTimeMillis();
                        trozosAtrasados = 0;
                        continue;
                    }
                    // Cuanto atraso trae el audio: cuando se leyo menos cuando termino.
                    if (relevo == null) {
                        long retencion = leido - (inicioEpochMs + muestras * 1000L / (long) FRECUENCIA);
                        trozosAtrasados = retencion > UMBRAL_RETENCION_MS ? trozosAtrasados + 1 : 0;
                        if (trozosAtrasados >= TROZOS_PARA_RELEVO && leido - ultimoRelevoEpochMs > MS_ENTRE_RELEVOS) {
                            trozosAtrasados = 0;
                            ultimoRelevoEpochMs = leido;
                            abrirRelevo();
                        }
                    }
                }
                // Lo que quedo pendiente al cerrar, como final: son palabras que la
                // persona dijo -igual que onFinalResult de SpeechService-.
                long ahora = System.currentTimeMillis();
                entregar("final", reconocedor.getFinalResult(), muestras * 1000L / (long) FRECUENCIA, ahora, ahora, 0);
            } catch (Exception e) {
                JSObject d = new JSObject();
                d.put("mensaje", e.getMessage());
                notifyListeners("error", d);
            } finally {
                soltar(relevo);
                soltar(grabadora);
                reconocedor.close();
                if (salida != null) {
                    try {
                        salida.close();
                    } catch (IOException ignorada) {
                        // el audio es un instrumento: si no se cierra bien, la lectura sigue
                    }
                }
            }
        }
    }

    // ── Lo que entrega Vosk ────────────────────────────────────────────────────────
    //
    // Los textos llegan como JSON y se pasan TAL CUAL al lado de JavaScript, sin
    // tocarlos. Parsear aca obligaria a mantener dos versiones del formato -una en
    // Java y otra en TypeScript- y a recompilar el APK cada vez que Vosk agregue un
    // campo. Del otro lado ya hay un parser.

    // Parciales -"parcial"- y finales -"final"-, con los tiempos del lazo: en que
    // milisegundo del audio termina el trozo, cuando se leyo, cuando termino Vosk, y
    // el nivel del microfono en ese trozo -raiz del promedio de los cuadrados, 0 a 1-.
    private void entregar(String evento, String hipotesis, long audioFinMs, long leidoEpochMs, long procesadoEpochMs, double rms) {
        JSObject d = new JSObject();
        d.put("json", hipotesis);
        d.put("llegadaEpochMs", System.currentTimeMillis());
        d.put("audioFinMs", audioFinMs);
        d.put("leidoEpochMs", leidoEpochMs);
        d.put("procesadoEpochMs", procesadoEpochMs);
        d.put("rms", rms);
        Oido o = oido;
        if (o != null) d.put("relevos", o.relevos);
        notifyListeners(evento, d);
    }

    /**
     * Llega al cerrar el flujo, con lo que quedo pendiente. Se emite como final igual:
     * son palabras que la persona dijo y el motor de lectura las necesita.
     *
     * -24-09-2026: ahora lo hace el final de Oido.run, con entregar("final", ...). Los
     * errores tambien salen de ahi, como "error"-.
     */

    /**
     * SpeechService corta solo tras un rato sin voz. En una lectura a camara hay
     * pausas largas -Javier lee guiones de varios minutos-, asi que aca NO se deja
     * morir: se avisa al lado de JavaScript, que decide.
     */
    //
    // -24-09-2026: en la practica nunca se emitia. startListening(this), sin tiempo,
    // es NO_TIMEOUT en SpeechService. El lazo propio tampoco corta por silencio; el
    // evento "silencio" queda declarado del lado de JavaScript y no llega.

    @Override
    protected void handleOnDestroy() {
        pararOido();
        if (modelo != null) {
            modelo.close();
            modelo = null;
        }
        super.handleOnDestroy();
    }
}

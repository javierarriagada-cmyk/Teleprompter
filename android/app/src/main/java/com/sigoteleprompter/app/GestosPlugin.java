package com.sigoteleprompter.app;

import android.graphics.Bitmap;
import android.os.SystemClock;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;

import androidx.camera.view.PreviewView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.components.containers.Category;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.gesturerecognizer.GestureRecognizer;
import com.google.mediapipe.tasks.vision.gesturerecognizer.GestureRecognizerResult;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

// EL CONTROL POR GESTOS, DEL LADO NATIVO -tarea 88, 04-10-2026, docs/tarea88.txt, sección 6.1-.
//
// Mira la vista previa de la cámara SIN parche a capgo: busca la PreviewView que capgo pone en la
// pantalla -como CamaraNativaPlugin.buscarPreviewView- y le pide el cuadro con getBitmap(), que en el
// modo PERFORMANCE copia el Surface con PixelCopy. El cuadro se achica a 640 de lado mayor y se reconoce
// con MediaPipe -GestureRecognizer, RunningMode.IMAGE, una mano- en un hilo aparte.
//
// Una llamada a la vez, nunca en paralelo, y sin eventos: el que pide es el lazo de App -vigiaGestos.ts-.
// Con el interruptor apagado nadie llama a nada de esto: ni preparar, así que el reconocedor no existe.
//
// El modelo es gesture_recognizer.task de Google, en assets -sin comprimir, app/build.gradle-.
@CapacitorPlugin(name = "Gestos")
public class GestosPlugin extends Plugin {
    private static final String ETIQUETA_LOG = "Sigo88";
    private static final String MODELO = "gesture_recognizer.task";
    private static final int LADO_MAYOR = 640;

    private final ExecutorService hilo = Executors.newSingleThreadExecutor();
    private final AtomicBoolean ocupado = new AtomicBoolean(false);
    private volatile GestureRecognizer reconocedor;

    // -tarea 88, segunda vuelta, 04-10-2026- preparar devuelve además "estado" -lib/gestos.ts,
    // EstadoPreparar-: 'listo', 'sinVistaPrevia' -todavía no hay cuadro: App vuelve a intentar-, 'negro'
    // -hay vista previa y el cuadro es negro: App vuelve a intentar y recién al tercero dice «No
    // disponible»- o 'reconocedor' -MediaPipe no arranca-. El reconocedor creado se queda: un segundo
    // preparar no crea otro -reconocedor == null, abajo-. Antes, cualquier cuadro no nulo daba ok true,
    // aunque fuera negro, y uno nulo daba ok false y dejaba el interruptor apagado.
    @PluginMethod
    public void preparar(PluginCall call) {
        hilo.execute(() -> {
            JSObject ret = new JSObject();
            anotarDatatransport();
            try {
                if (reconocedor == null) {
                    long t0 = SystemClock.elapsedRealtime();
                    GestureRecognizer.GestureRecognizerOptions opciones = GestureRecognizer.GestureRecognizerOptions.builder()
                        .setBaseOptions(BaseOptions.builder().setModelAssetPath(MODELO).build())
                        .setRunningMode(RunningMode.IMAGE)
                        .setNumHands(1)
                        .build();
                    reconocedor = GestureRecognizer.createFromOptions(getContext(), opciones);
                    Log.i(ETIQUETA_LOG, "gestos reconocedor creado ms=" + (SystemClock.elapsedRealtime() - t0));
                }
            } catch (Throwable e) {
                Log.i(ETIQUETA_LOG, "gestos reconocedor no arranca: " + e);
                ret.put("ok", false);
                ret.put("motivo", "reconocedor: " + e.getMessage());
                ret.put("estado", "reconocedor");
                call.resolve(ret);
                return;
            }
            // La vista previa tiene que entregar imagen: si no, el equipo no puede -punto 18-.
            Bitmap cuadro = cuadroDeLaVistaPrevia();
            if (cuadro == null) {
                Log.i(ETIQUETA_LOG, "gestos la vista previa no entrega imagen todavía");
                ret.put("ok", false);
                ret.put("motivo", "sin imagen de la vista previa");
                ret.put("estado", "sinVistaPrevia");
            } else if (esNegro(cuadro)) {
                Log.i(ETIQUETA_LOG, "gestos preparar cuadro negro " + cuadro.getWidth() + "x" + cuadro.getHeight());
                ret.put("ok", false);
                ret.put("motivo", "cuadro negro");
                ret.put("estado", "negro");
            } else {
                Log.i(ETIQUETA_LOG, "gestos preparar ok cuadro=" + cuadro.getWidth() + "x" + cuadro.getHeight() + " negro=false");
                ret.put("ok", true);
                ret.put("estado", "listo");
            }
            call.resolve(ret);
        });
    }

    // LAS ESTADÍSTICAS DE MEDIAPIPE -tarea 88, segunda vuelta, 04-10-2026-. Para que Claude lea en el
    // logcat si queda con qué mandarlas: si está la clase CCTDestination -transport-backend-cct, la que
    // usa RemoteLoggingClient de tasks-core- y si el manifiesto registra el backend
    // CctBackendFactory en TransportBackendDiscovery. Ver app/build.gradle, junto a tasks-vision.
    private boolean datatransportAnotado = false;
    private void anotarDatatransport() {
        if (datatransportAnotado) return;
        datatransportAnotado = true;
        boolean clase;
        try {
            Class.forName("com.google.android.datatransport.cct.CCTDestination");
            clase = true;
        } catch (Throwable e) {
            clase = false;
        }
        String backend = "no";
        try {
            android.content.pm.ServiceInfo si = getContext().getPackageManager().getServiceInfo(
                new android.content.ComponentName(getContext(), "com.google.android.datatransport.runtime.backends.TransportBackendDiscovery"),
                android.content.pm.PackageManager.GET_META_DATA);
            if (si != null && si.metaData != null && si.metaData.containsKey("backend:com.google.android.datatransport.cct.CctBackendFactory")) backend = "si";
        } catch (Throwable e) {
            backend = "sinServicio";
        }
        Log.i(ETIQUETA_LOG, "gestos datatransport claseCct=" + (clase ? "si" : "no") + " backendCct=" + backend);
    }

    @PluginMethod
    public void revisarCuadro(PluginCall call) {
        if (!ocupado.compareAndSet(false, true)) {
            call.reject("ya hay una revisión en curso");
            return;
        }
        hilo.execute(() -> {
            try {
                JSObject ret = new JSObject();
                long tMs = System.currentTimeMillis();
                long t0 = SystemClock.elapsedRealtime();
                Bitmap cuadro = cuadroDeLaVistaPrevia();
                long msCuadro = SystemClock.elapsedRealtime() - t0;
                ret.put("tMs", tMs);
                ret.put("msCuadro", msCuadro);
                GestureRecognizer r = reconocedor;
                if (cuadro == null || r == null || esNegro(cuadro)) {
                    ret.put("etiqueta", "sinCuadro");
                    ret.put("puntaje", 0);
                    ret.put("msReconocer", 0);
                    Log.i(ETIQUETA_LOG, "revision etiqueta=sinCuadro msCuadro=" + msCuadro + (r == null ? " sin reconocedor" : ""));
                    call.resolve(ret);
                    return;
                }
                Bitmap chico = achicar(cuadro);
                long t1 = SystemClock.elapsedRealtime();
                MPImage imagen = new BitmapImageBuilder(chico).build();
                GestureRecognizerResult res = r.recognize(imagen);
                long msReconocer = SystemClock.elapsedRealtime() - t1;
                String etiqueta = "None";
                float puntaje = 0f;
                List<List<Category>> gestos = res.gestures();
                if (gestos != null && !gestos.isEmpty() && !gestos.get(0).isEmpty()) {
                    Category c = gestos.get(0).get(0);
                    etiqueta = c.categoryName();
                    puntaje = c.score();
                }
                ret.put("etiqueta", etiqueta);
                ret.put("puntaje", puntaje);
                ret.put("msReconocer", msReconocer);
                Log.i(ETIQUETA_LOG, "revision etiqueta=" + etiqueta + " puntaje=" + puntaje + " msCuadro=" + msCuadro + " msReconocer=" + msReconocer + " cuadro=" + chico.getWidth() + "x" + chico.getHeight());
                call.resolve(ret);
            } catch (Throwable e) {
                Log.i(ETIQUETA_LOG, "revision falló: " + e);
                call.reject("no se pudo revisar el cuadro: " + e.getMessage());
            } finally {
                ocupado.set(false);
            }
        });
    }

    @PluginMethod
    public void soltar(PluginCall call) {
        hilo.execute(() -> {
            GestureRecognizer r = reconocedor;
            reconocedor = null;
            if (r != null) {
                try {
                    r.close();
                } catch (Throwable e) {
                    // cerrar no tiene que tumbar nada
                }
                Log.i(ETIQUETA_LOG, "gestos reconocedor cerrado");
            }
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        GestureRecognizer r = reconocedor;
        reconocedor = null;
        if (r != null) {
            try {
                r.close();
            } catch (Throwable e) {
                // nada
            }
        }
        hilo.shutdown();
        super.handleOnDestroy();
    }

    // getBitmap() en el hilo de la UI, como pide PreviewView; este hilo espera la respuesta. null si
    // no hay vista previa o si no entrega imagen.
    private Bitmap cuadroDeLaVistaPrevia() {
        final Bitmap[] sale = new Bitmap[1];
        final java.util.concurrent.CountDownLatch listo = new java.util.concurrent.CountDownLatch(1);
        getActivity().runOnUiThread(() -> {
            try {
                View raiz = getActivity().findViewById(android.R.id.content);
                PreviewView vista = buscarPreviewView(raiz);
                sale[0] = vista != null ? vista.getBitmap() : null;
            } catch (Throwable e) {
                sale[0] = null;
            } finally {
                listo.countDown();
            }
        });
        try {
            if (!listo.await(1500, java.util.concurrent.TimeUnit.MILLISECONDS)) return null;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return null;
        }
        return sale[0];
    }

    // La misma búsqueda de CamaraNativaPlugin.buscarPreviewView.
    private PreviewView buscarPreviewView(View view) {
        if (view == null) return null;
        if (view instanceof PreviewView) return (PreviewView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                PreviewView result = buscarPreviewView(group.getChildAt(i));
                if (result != null) return result;
            }
        }
        return null;
    }

    private static Bitmap achicar(Bitmap b) {
        int mayor = Math.max(b.getWidth(), b.getHeight());
        if (mayor <= LADO_MAYOR) return b;
        float f = (float) LADO_MAYOR / mayor;
        return Bitmap.createScaledBitmap(b, Math.max(1, Math.round(b.getWidth() * f)), Math.max(1, Math.round(b.getHeight() * f)), true);
    }

    // Un cuadro negro -la vista previa existe pero no hay imagen-: una grilla de 8 x 8 puntos, todos
    // oscuros.
    private static boolean esNegro(Bitmap b) {
        int w = b.getWidth();
        int h = b.getHeight();
        if (w <= 0 || h <= 0) return true;
        for (int i = 1; i <= 8; i++) {
            for (int j = 1; j <= 8; j++) {
                int p = b.getPixel(Math.min(w - 1, w * i / 9), Math.min(h - 1, h * j / 9));
                int r = (p >> 16) & 0xff;
                int g = (p >> 8) & 0xff;
                int bl = p & 0xff;
                if (r + g + bl > 24) return false;
            }
        }
        return true;
    }
}

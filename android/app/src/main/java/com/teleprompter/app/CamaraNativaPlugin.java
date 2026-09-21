package com.teleprompter.app;

import android.graphics.Bitmap;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;

import androidx.camera.view.PreviewView;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "CamaraNativa")
public class CamaraNativaPlugin extends Plugin {

    @PluginMethod
    public void fijarModoSuperficie(PluginCall call) {
        String modo = call.getString("modo", "sistema");
        getActivity().runOnUiThread(() -> {
            try {
                View rootView = getActivity().findViewById(android.R.id.content);
                PreviewView previewView = buscarPreviewView(rootView);
                JSObject ret = new JSObject();
                if (previewView != null) {
                    if ("sistema".equalsIgnoreCase(modo)) {
                        previewView.setImplementationMode(PreviewView.ImplementationMode.PERFORMANCE);
                        SurfaceView surfaceView = buscarSurfaceView(previewView);
                        if (surfaceView != null) {
                            surfaceView.setZOrderMediaOverlay(false);
                        } else {
                            previewView.post(() -> {
                                SurfaceView sv = buscarSurfaceView(previewView);
                                if (sv != null) {
                                    sv.setZOrderMediaOverlay(false);
                                }
                            });
                        }
                    } else {
                        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
                    }
                    ret.put("encontrado", true);
                    ret.put("modo", modo);
                    call.resolve(ret);
                } else {
                    ret.put("encontrado", false);
                    ret.put("modo", modo);
                    call.resolve(ret);
                }
            } catch (Exception e) {
                call.reject("Error al fijar modo de superficie: " + e.getMessage(), e);
            }
        });
    }

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

    private SurfaceView buscarSurfaceView(View view) {
        if (view == null) return null;
        if (view instanceof SurfaceView) return (SurfaceView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                SurfaceView result = buscarSurfaceView(group.getChildAt(i));
                if (result != null) return result;
            }
        }
        return null;
    }

    private File dirGrabaciones() {
        File dir = new File(getContext().getFilesDir(), "grabaciones");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    @PluginMethod
    public void directorioGrabaciones(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ruta", dirGrabaciones().getAbsolutePath());
        call.resolve(ret);
    }

    @PluginMethod
    public void escribirTexto(PluginCall call) {
        String ruta = call.getString("ruta");
        String contenido = call.getString("contenido", "");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        try {
            File f = new File(ruta);
            File padre = f.getParentFile();
            if (padre != null && !padre.exists()) padre.mkdirs();
            java.nio.file.Files.write(f.toPath(), contenido.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            JSObject ret = new JSObject();
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) { call.reject("escribirTexto: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void leerTexto(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        try {
            byte[] data = java.nio.file.Files.readAllBytes(new File(ruta).toPath());
            JSObject ret = new JSObject();
            ret.put("contenido", new String(data, java.nio.charset.StandardCharsets.UTF_8));
            call.resolve(ret);
        } catch (Exception e) { call.reject("leerTexto: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void listar(PluginCall call) {
        String directorio = call.getString("directorio");
        if (directorio == null) { call.reject("directorio requerido"); return; }
        try {
            String[] nombres = new File(directorio).list();
            JSArray arr = new JSArray();
            if (nombres != null) for (String n : nombres) arr.put(n);
            JSObject ret = new JSObject();
            ret.put("nombres", arr);
            call.resolve(ret);
        } catch (Exception e) { call.reject("listar: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void mover(PluginCall call) {
        String desde = call.getString("desde");
        String hasta = call.getString("hasta");
        if (desde == null || hasta == null) { call.reject("desde y hasta requeridos"); return; }
        try {
            File origen = new File(desde);
            File destino = new File(hasta);
            File padre = destino.getParentFile();
            if (padre != null && !padre.exists()) padre.mkdirs();
            if (!origen.getAbsolutePath().equals(destino.getAbsolutePath())) {
                if (destino.exists()) destino.delete();
                if (!origen.renameTo(destino)) {
                    java.nio.file.Files.copy(origen.toPath(), destino.toPath());
                    origen.delete();
                }
            }
            JSObject ret = new JSObject();
            ret.put("ruta", destino.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) { call.reject("mover: " + e.getMessage(), e); }
    }

    @PluginMethod
    public void borrarArchivo(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        File f = new File(ruta);
        if (f.exists()) f.delete();
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void bytesDe(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        File f = new File(ruta);
        JSObject ret = new JSObject();
        ret.put("bytes", f.exists() ? f.length() : 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void analizarVideo(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        File f = new File(ruta);
        JSObject ret = new JSObject();
        ret.put("bytes", f.exists() ? f.length() : 0);
        ret.put("duracionMs", 0);
        ret.put("tienePistaAudio", false);
        ret.put("nivelRmsDb", org.json.JSONObject.NULL);
        if (!f.exists()) { call.resolve(ret); return; }
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(ruta);
            String dur = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (dur != null) {
                try { ret.put("duracionMs", Long.parseLong(dur)); } catch (NumberFormatException ignored) {}
            }
            String hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO);
            if ("yes".equalsIgnoreCase(hasAudio)) ret.put("tienePistaAudio", true);
        } catch (Exception ignored) {
        } finally {
            try { retriever.release(); } catch (Exception ignored) {}
        }
        MediaExtractor extractor = new MediaExtractor();
        try {
            extractor.setDataSource(ruta);
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat format = extractor.getTrackFormat(i);
                String m = format.getString(MediaFormat.KEY_MIME);
                if (m != null && m.startsWith("audio/")) {
                    ret.put("tienePistaAudio", true);
                    break;
                }
            }
        } catch (Exception ignored) {
        } finally {
            extractor.release();
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void extraerMiniatura(PluginCall call) {
        String ruta = call.getString("ruta");
        String destino = call.getString("destino");
        int atMs = call.getInt("atMs", 1000);
        if (ruta == null || destino == null) { call.reject("ruta y destino requeridos"); return; }
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(ruta);
            Bitmap bmp = retriever.getFrameAtTime(atMs * 1000L, MediaMetadataRetriever.OPTION_CLOSEST);
            if (bmp == null) bmp = retriever.getFrameAtTime(0);
            if (bmp == null) { call.reject("no hay cuadro"); return; }
            File out = new File(destino);
            File padre = out.getParentFile();
            if (padre != null && !padre.exists()) padre.mkdirs();
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(out)) {
                bmp.compress(Bitmap.CompressFormat.JPEG, 80, fos);
            }
            JSObject ret = new JSObject();
            ret.put("ruta", out.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("extraerMiniatura: " + e.getMessage(), e);
        } finally {
            try { retriever.release(); } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void buscarMp4Recientes(PluginCall call) {
        JSArray arr = new JSArray();
        File[] bases = new File[] { getContext().getCacheDir(), getContext().getFilesDir(), getContext().getExternalCacheDir() };
        long ahora = System.currentTimeMillis();
        for (File base : bases) recogerMp4(base, arr, ahora, 0);
        JSObject ret = new JSObject();
        ret.put("rutas", arr);
        call.resolve(ret);
    }

    private void recogerMp4(File dir, JSArray arr, long ahora, int profundidad) {
        if (dir == null || !dir.isDirectory() || profundidad > 3) return;
        File[] hijos = dir.listFiles();
        if (hijos == null) return;
        for (File f : hijos) {
            if (f.isDirectory()) recogerMp4(f, arr, ahora, profundidad + 1);
            else {
                String n = f.getName().toLowerCase();
                if ((n.endsWith(".mp4") || n.endsWith(".mp4.part")) && (ahora - f.lastModified()) < 30L * 60 * 1000) {
                    arr.put(f.getAbsolutePath());
                }
            }
        }
    }
}

package com.sigoteleprompter.app;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.util.Log;
import android.view.Display;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;

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

    // Capgo stopRecordVideo devuelve file:///storage/... . new File(uri)
    // no encuentra el archivo: bytes=0, mover falla, MediaExtractor falla.
    // MediaMetadataRetriever SI acepta la URI, por eso la miniatura salia
    // y el analisis no. Un solo lugar: al entrar, antes de construir File.
    private File archivoDe(String ruta) {
        if (ruta == null || ruta.isEmpty()) return new File("");
        String p = ruta.trim();
        if (p.startsWith("file:")) {
            android.net.Uri uri = android.net.Uri.parse(p);
            String path = uri.getPath();
            if (path != null && !path.isEmpty()) p = path;
        }
        return new File(p);
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
            File f = archivoDe(ruta);
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
            byte[] data = java.nio.file.Files.readAllBytes(archivoDe(ruta).toPath());
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
            String[] nombres = archivoDe(directorio).list();
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
            File origen = archivoDe(desde);
            File destino = archivoDe(hasta);
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
        // UNA TOMA GUARDADA VIVE EN LA GALERIA -24-09-2026-: su ruta es content://.
        // Borrarla en Sigo la borra de ahi -Javier: "si se borra de la galeria de
        // sigo se borra de todos lados"-. Android deja borrar sin preguntar lo que
        // la app misma guardo; si no la deja -la app se reinstalo y ya no es la
        // duena-, se avisa con ok=false y el archivo queda en la galeria.
        if (ruta.startsWith("content:")) {
            JSObject ret = new JSObject();
            try {
                getContext().getContentResolver().delete(android.net.Uri.parse(ruta), null, null);
                ret.put("ok", true);
            } catch (Exception e) {
                ret.put("ok", false);
            }
            call.resolve(ret);
            return;
        }
        File f = archivoDe(ruta);
        if (f.exists()) f.delete();
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void bytesDe(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        File f = archivoDe(ruta);
        JSObject ret = new JSObject();
        ret.put("bytes", f.exists() ? f.length() : 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void analizarVideo(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null) { call.reject("ruta requerida"); return; }
        File f = archivoDe(ruta);
        String path = f.getAbsolutePath();
        JSObject ret = new JSObject();
        ret.put("bytes", f.exists() ? f.length() : 0);
        ret.put("duracionMs", 0);
        // null = no se pudo comprobar. false solo si se abrio el archivo
        // y no hay pista. Acusar a una toma buena es el peor error.
        ret.put("tienePistaAudio", org.json.JSONObject.NULL);
        ret.put("nivelRmsDb", org.json.JSONObject.NULL);
        if (!f.exists()) { call.resolve(ret); return; }

        boolean hayPista = false;
        boolean extractorAbrio = false;

        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(path);
            String dur = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (dur != null) {
                try { ret.put("duracionMs", Long.parseLong(dur)); } catch (NumberFormatException ignored) {}
            }
            String hasAudio = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO);
            if ("yes".equalsIgnoreCase(hasAudio)) hayPista = true;
        } catch (Exception ignored) {
        } finally {
            try { retriever.release(); } catch (Exception ignored) {}
        }

        MediaExtractor extractor = new MediaExtractor();
        try {
            extractor.setDataSource(path);
            extractorAbrio = true;
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat format = extractor.getTrackFormat(i);
                String m = format.getString(MediaFormat.KEY_MIME);
                if (m != null && m.startsWith("audio/")) {
                    hayPista = true;
                    break;
                }
            }
        } catch (Exception ignored) {
        } finally {
            extractor.release();
        }

        if (hayPista) ret.put("tienePistaAudio", true);
        else if (extractorAbrio) ret.put("tienePistaAudio", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void extraerMiniatura(PluginCall call) {
        String ruta = call.getString("ruta");
        String destino = call.getString("destino");
        int atMs = call.getInt("atMs", 1000);
        if (ruta == null || destino == null) { call.reject("ruta y destino requeridos"); return; }
        File origen = archivoDe(ruta);
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(origen.getAbsolutePath());
            Bitmap bmp = retriever.getFrameAtTime(atMs * 1000L, MediaMetadataRetriever.OPTION_CLOSEST);
            if (bmp == null) bmp = retriever.getFrameAtTime(0);
            if (bmp == null) { call.reject("no hay cuadro"); return; }
            File out = archivoDe(destino);
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
        File[] bases = new File[] {
            getContext().getCacheDir(),
            getContext().getFilesDir(),
            getContext().getExternalCacheDir(),
            getContext().getExternalFilesDir(null),
            getContext().getExternalFilesDir(android.os.Environment.DIRECTORY_MOVIES)
        };
        for (File base : bases) recogerMp4(base, arr, 0);
        JSObject ret = new JSObject();
        ret.put("rutas", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void espacioLibre(PluginCall call) {
        try {
            File dir = dirGrabaciones();
            android.os.StatFs stat = new android.os.StatFs(dir.getAbsolutePath());
            long bytesLibres = stat.getAvailableBytes();
            JSObject ret = new JSObject();
            ret.put("bytesLibres", bytesLibres);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("espacioLibre: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void guardarEnGaleria(PluginCall call) {
        String ruta = call.getString("ruta");
        if (ruta == null || ruta.isEmpty()) {
            call.reject("ruta requerida");
            return;
        }
        File origen = archivoDe(ruta);
        if (!origen.exists()) {
            call.reject("El archivo no existe: " + ruta);
            return;
        }

        new Thread(() -> {
            try {
                android.net.Uri itemUri = copiarAGaleria(origen, origen.getName());
                JSObject ret = new JSObject();
                ret.put("ok", true);
                ret.put("uri", itemUri.toString());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error al guardar en galería: " + e.getMessage(), e);
            }
        }).start();
    }

    // Copia un mp4 a Peliculas/Sigo de la galeria y devuelve su direccion. Lo usan
    // guardarEnGaleria -la toma tal cual- y guardarConSubtitulos -la quemada-.
    private android.net.Uri copiarAGaleria(File origen, String nombre) throws Exception {
                android.content.ContentResolver resolver = getContext().getContentResolver();
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(android.provider.MediaStore.Video.Media.DISPLAY_NAME, nombre);
                values.put(android.provider.MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                values.put(android.provider.MediaStore.Video.Media.RELATIVE_PATH, android.os.Environment.DIRECTORY_MOVIES + "/Sigo");
                values.put(android.provider.MediaStore.Video.Media.IS_PENDING, 1);

                android.net.Uri collection = android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                android.net.Uri itemUri = resolver.insert(collection, values);
                if (itemUri == null) throw new Exception("no se pudo crear el registro en MediaStore");

                try (java.io.InputStream is = new java.io.FileInputStream(origen);
                     java.io.OutputStream os = resolver.openOutputStream(itemUri)) {
                    byte[] buffer = new byte[64 * 1024];
                    int bytesRead;
                    while ((bytesRead = is.read(buffer)) != -1) {
                        os.write(buffer, 0, bytesRead);
                    }
                }

                values.clear();
                values.put(android.provider.MediaStore.Video.Media.IS_PENDING, 0);
                resolver.update(itemUri, values, null, null);
                return itemUri;
    }

    // GUARDAR CON LOS SUBTITULOS QUEMADOS -24-09-2026-. Media3 Transformer, de
    // Google: vuelve a codificar el video con el codificador de hardware del
    // telefono y en cada cuadro pone encima CapaDeSubtitulos. El audio se copia
    // sin recomprimir. El avance va a la app como "progresoGuardado" -0 a 100-.
    // Javier, sobre el tiempo: "el que lo quiere con subtitulos sabe que el
    // proceso es mas pesado". Si el codificador falla, se rechaza y la app avisa;
    // la toma original no se toca nunca.
    @PluginMethod
    @androidx.annotation.OptIn(markerClass = androidx.media3.common.util.UnstableApi.class)
    public void guardarConSubtitulos(PluginCall call) {
        String ruta = call.getString("ruta");
        String subtitulos = call.getString("subtitulos");
        String estilo = call.getString("estilo", "amarillo");
        File origen = archivoDe(ruta);
        if (!origen.exists() || subtitulos == null) {
            call.reject("El archivo no existe: " + ruta);
            return;
        }
        int rotacion = 0;
        MediaMetadataRetriever mmr = new MediaMetadataRetriever();
        try {
            mmr.setDataSource(origen.getAbsolutePath());
            String r = mmr.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
            if (r != null) rotacion = Integer.parseInt(r);
        } catch (Exception ignorada) {
            // sin rotacion conocida se dibuja como viene el cuadro
        } finally {
            try { mmr.release(); } catch (Exception ignorada) {}
        }
        final CapaDeSubtitulos capa;
        try {
            capa = new CapaDeSubtitulos(subtitulos, estilo, rotacion);
        } catch (Exception e) {
            call.reject("subtitulos ilegibles: " + e.getMessage(), e);
            return;
        }
        File salida = new File(getContext().getCacheDir(), "con-subtitulos-" + System.currentTimeMillis() + ".mp4");
        String nombre = origen.getName().replace(".mp4", "") + "-subtitulos.mp4";
        android.os.Handler hilo = new android.os.Handler(android.os.Looper.getMainLooper());
        hilo.post(() -> {
            try {
                androidx.media3.transformer.EditedMediaItem item = new androidx.media3.transformer.EditedMediaItem.Builder(
                    androidx.media3.common.MediaItem.fromUri(android.net.Uri.fromFile(origen)))
                    .setEffects(new androidx.media3.transformer.Effects(
                        com.google.common.collect.ImmutableList.of(),
                        com.google.common.collect.ImmutableList.of(
                            new androidx.media3.effect.OverlayEffect(com.google.common.collect.ImmutableList.of(capa)))))
                    .build();
                final androidx.media3.transformer.Transformer[] t = new androidx.media3.transformer.Transformer[1];
                final boolean[] terminado = { false };
                // 12 Mbps -24-09-2026-. Sin pedirlo, Media3 eligio 8,7 contra ~20 de la
                // camara. Es una segunda compresion y, desde que se guarda, la UNICA
                // copia de la toma: 12 queda sobre lo que pide YouTube para 1080p
                // -8- y deja margen para cuando Instagram o WhatsApp la vuelvan a
                // comprimir. 30 minutos: unos 2,7 GB.
                androidx.media3.transformer.DefaultEncoderFactory codificador = new androidx.media3.transformer.DefaultEncoderFactory.Builder(getContext())
                    .setRequestedVideoEncoderSettings(new androidx.media3.transformer.VideoEncoderSettings.Builder().setBitrate(12_000_000).build())
                    .build();
                t[0] = new androidx.media3.transformer.Transformer.Builder(getContext())
                    .setEncoderFactory(codificador)
                    .addListener(new androidx.media3.transformer.Transformer.Listener() {
                        @Override
                        public void onCompleted(androidx.media3.transformer.Composition c, androidx.media3.transformer.ExportResult r) {
                            terminado[0] = true;
                            new Thread(() -> {
                                try {
                                    android.net.Uri uri = copiarAGaleria(salida, nombre);
                                    JSObject ret = new JSObject();
                                    ret.put("ok", true);
                                    ret.put("uri", uri.toString());
                                    call.resolve(ret);
                                } catch (Exception e) {
                                    call.reject("Error al guardar en galería: " + e.getMessage(), e);
                                } finally {
                                    salida.delete();
                                }
                            }).start();
                        }

                        @Override
                        public void onError(androidx.media3.transformer.Composition c, androidx.media3.transformer.ExportResult r, androidx.media3.transformer.ExportException e) {
                            terminado[0] = true;
                            salida.delete();
                            call.reject("No se pudieron poner los subtítulos: " + e.getMessage(), e);
                        }
                    })
                    .build();
                t[0].start(item, salida.getAbsolutePath());
                androidx.media3.transformer.ProgressHolder avance = new androidx.media3.transformer.ProgressHolder();
                hilo.postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (terminado[0]) return;
                        if (t[0].getProgress(avance) == androidx.media3.transformer.Transformer.PROGRESS_STATE_AVAILABLE) {
                            JSObject d = new JSObject();
                            d.put("porcentaje", avance.progress);
                            notifyListeners("progresoGuardado", d);
                        }
                        hilo.postDelayed(this, 400);
                    }
                }, 400);
            } catch (Exception e) {
                salida.delete();
                call.reject("No se pudieron poner los subtítulos: " + e.getMessage(), e);
            }
        });
    }

    // Si la copia de una toma sigue en la galeria. Javier, 24-09-2026: "si no
    // encuentra un video porque se elimino, solo no aparece".
    private boolean existeEnGaleria(android.net.Uri uri) {
        try (android.database.Cursor c = getContext().getContentResolver().query(uri, new String[] { android.provider.MediaStore.MediaColumns._ID }, null, null, null)) {
            return c != null && c.moveToFirst();
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void existeEnGaleria(PluginCall call) {
        String uriTexto = call.getString("uri");
        JSObject ret = new JSObject();
        ret.put("existe", uriTexto != null && !uriTexto.isEmpty() && existeEnGaleria(android.net.Uri.parse(uriTexto)));
        call.resolve(ret);
    }

    // COMPARTIR LA TOMA GUARDADA -24-09-2026-. Una toma que ya esta en la galeria
    // no ofrece Guardar ni Subtitulos: ofrece Compartir -Javier: "debemos tender a
    // lo simple"-. Se comparte la copia de la galeria, la que se guardo con su
    // estilo de subtitulos, por el menu de Android. Sin biblioteca nueva: es un
    // Intent. Si esa copia ya no existe -la borraron desde la galeria-, se avisa
    // con "no existe" y la toma vuelve a ofrecer Guardar.
    @PluginMethod
    public void compartir(PluginCall call) {
        String uriTexto = call.getString("uri");
        if (uriTexto == null || uriTexto.isEmpty()) {
            call.reject("uri requerida");
            return;
        }
        android.net.Uri uri = android.net.Uri.parse(uriTexto);
        if (!existeEnGaleria(uri)) {
            call.reject("no existe");
            return;
        }
        android.content.Intent envio = new android.content.Intent(android.content.Intent.ACTION_SEND);
        envio.setType("video/mp4");
        envio.putExtra(android.content.Intent.EXTRA_STREAM, uri);
        envio.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
        android.content.Intent menu = android.content.Intent.createChooser(envio, null);
        menu.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
        getActivity().startActivity(menu);
        call.resolve();
    }

    // SIN FILTRO DE EDAD, a proposito. Quien decide cual es el archivo de
    // una toma es emparejarMp4PorTiempo, contra la ventana del sidecar, y
    // eso es preciso: el nombre que pone Capgo lleva la marca de arranque
    // y cae unos 100 ms despues de creado.
    //
    // Habia un tope de 30 minutos y dejaba fuera la toma de hace 40, que es
    // JUSTO el caso para el que existe la recuperacion: alguien que vuelve a
    // abrir la aplicacion despues, o al otro dia. Medido el 21 de septiembre
    // de 2026: archivo de las 13:15, aplicacion abierta a las 13:55, y la
    // tarjeta quedaba en cero bytes con 47 MB de video al lado.
    //
    // El tope de profundidad 3 se queda: eso es para no barrer todo el
    // almacenamiento del telefono.
    private void recogerMp4(File dir, JSArray arr, int profundidad) {
        if (dir == null || !dir.isDirectory() || profundidad > 3) return;
        File[] hijos = dir.listFiles();
        if (hijos == null) return;
        for (File f : hijos) {
            if (f.isDirectory()) recogerMp4(f, arr, profundidad + 1);
            else {
                String n = f.getName().toLowerCase();
                if (n.endsWith(".mp4") || n.endsWith(".mp4.part")) {
                    arr.put(f.getAbsolutePath());
                }
            }
        }
    }

    @PluginMethod
    public void fijarBrillo(PluginCall call) {
        Double valor = call.getDouble("valor", -1.0);
        getActivity().runOnUiThread(() -> {
            try {
                Window w = getActivity().getWindow();
                WindowManager.LayoutParams lp = w.getAttributes();
                lp.screenBrightness = valor == null ? WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE : valor.floatValue();
                w.setAttributes(lp);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error al fijar brillo: " + e.getMessage(), e);
            }
        });
    }

    // El brillo del sistema, de 0 a 1, para que la barra de brillo del
    // cajon de la toma parta de donde esta la pantalla. Leer este ajuste no
    // pide permiso; escribirlo si, y por eso el brillo de la toma se pone en
    // la ventana -fijarBrillo- y no en el sistema. 24-09-2026.
    @PluginMethod
    public void leerBrillo(PluginCall call) {
        try {
            int v = android.provider.Settings.System.getInt(
                getContext().getContentResolver(),
                android.provider.Settings.System.SCREEN_BRIGHTNESS,
                128
            );
            JSObject ret = new JSObject();
            ret.put("valor", Math.min(1.0, v / 255.0));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error al leer brillo: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void restaurarBrillo(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Window w = getActivity().getWindow();
                WindowManager.LayoutParams lp = w.getAttributes();
                lp.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                w.setAttributes(lp);
                JSObject ret = new JSObject();
                ret.put("ok", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error al restaurar brillo: " + e.getMessage(), e);
            }
        });
    }

    // LA ORIENTACIÓN DE LA TOMA -tarea 91, 04-10-2026-. Mientras dura una toma -de Empezar a Parar, en
    // Leer y en Grabar- la pantalla se queda en la orientación que tenía al empezar, como la cámara del
    // teléfono. La web lo pide desde un solo lugar -src/lib/orientacionToma.ts-. Va en este plugin
    // porque es el de la toma y ya maneja la ventana de la actividad -fijarBrillo-: sin plugin nuevo.
    // El mapeo de la rotación está en OrientacionDeToma, con su prueba JVM.
    private static final String ETIQUETA_ORIENTACION = "SigoOrientacion";
    // La que pedía la actividad antes de fijar -la del manifiesto, UNSPECIFIED-; null si no hay nada fijado.
    private Integer orientacionAntesDeLaToma = null;
    // La que se fijó al empezar: al volver de segundo plano con la toma andando se fija la misma.
    private Integer orientacionDeLaToma = null;

    private Display pantallaDe(Activity a) {
        if (android.os.Build.VERSION.SDK_INT >= 30) return a.getDisplay();
        return a.getWindowManager().getDefaultDisplay();
    }

    @PluginMethod
    public void fijarOrientacion(PluginCall call) {
        boolean repetir = Boolean.TRUE.equals(call.getBoolean("repetir", false));
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                Display d = pantallaDe(a);
                int rotacion = d != null ? d.getRotation() : 0;
                boolean ahoraVertical = a.getResources().getConfiguration().orientation == Configuration.ORIENTATION_PORTRAIT;
                boolean natural = OrientacionDeToma.naturalEsVertical(rotacion, ahoraVertical);
                int calculada = OrientacionDeToma.paraRotacion(rotacion, natural);
                int fijar = repetir && orientacionDeLaToma != null ? orientacionDeLaToma : calculada;
                if (orientacionAntesDeLaToma == null) orientacionAntesDeLaToma = a.getRequestedOrientation();
                orientacionDeLaToma = fijar;
                a.setRequestedOrientation(fijar);
                Log.i(ETIQUETA_ORIENTACION, "fijar rotacion=" + OrientacionDeToma.grados(rotacion)
                    + " natural=" + (natural ? "vertical" : "horizontal")
                    + " ahora=" + (ahoraVertical ? "vertical" : "horizontal")
                    + " orientacion=" + OrientacionDeToma.nombre(fijar) + "(" + fijar + ")"
                    + " repetir=" + repetir
                    + " anterior=" + OrientacionDeToma.nombre(orientacionAntesDeLaToma) + "(" + orientacionAntesDeLaToma + ")");
                JSObject ret = new JSObject();
                ret.put("rotacion", OrientacionDeToma.grados(rotacion));
                ret.put("orientacion", OrientacionDeToma.nombre(fijar));
                ret.put("valor", fijar);
                ret.put("anterior", OrientacionDeToma.nombre(orientacionAntesDeLaToma));
                ret.put("natural", natural ? "vertical" : "horizontal");
                call.resolve(ret);
            } catch (Exception e) {
                Log.w(ETIQUETA_ORIENTACION, "no se pudo fijar: " + e.getMessage());
                call.reject("Error al fijar la orientación: " + e.getMessage(), e);
            }
        });
    }

    @PluginMethod
    public void soltarOrientacion(PluginCall call) {
        // olvidar=false al ir a segundo plano: se suelta, pero la toma sigue y al volver se fija la misma.
        boolean olvidar = !Boolean.FALSE.equals(call.getBoolean("olvidar", true));
        Activity a = getActivity();
        a.runOnUiThread(() -> {
            try {
                int volver = orientacionAntesDeLaToma != null ? orientacionAntesDeLaToma : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
                a.setRequestedOrientation(volver);
                orientacionAntesDeLaToma = null;
                if (olvidar) orientacionDeLaToma = null;
                Display d = pantallaDe(a);
                int rotacion = d != null ? d.getRotation() : 0;
                Log.i(ETIQUETA_ORIENTACION, "soltar orientacion=" + OrientacionDeToma.nombre(volver) + "(" + volver + ")"
                    + " rotacion=" + OrientacionDeToma.grados(rotacion) + " olvidar=" + olvidar);
                JSObject ret = new JSObject();
                ret.put("orientacion", OrientacionDeToma.nombre(volver));
                ret.put("rotacion", OrientacionDeToma.grados(rotacion));
                call.resolve(ret);
            } catch (Exception e) {
                Log.w(ETIQUETA_ORIENTACION, "no se pudo soltar: " + e.getMessage());
                call.reject("Error al soltar la orientación: " + e.getMessage(), e);
            }
        });
    }
}

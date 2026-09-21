package com.teleprompter.app;

import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;

import androidx.camera.view.PreviewView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
        if (view instanceof PreviewView) {
            return (PreviewView) view;
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                PreviewView result = buscarPreviewView(group.getChildAt(i));
                if (result != null) {
                    return result;
                }
            }
        }
        return null;
    }

    private SurfaceView buscarSurfaceView(View view) {
        if (view == null) return null;
        if (view instanceof SurfaceView) {
            return (SurfaceView) view;
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                SurfaceView result = buscarSurfaceView(group.getChildAt(i));
                if (result != null) {
                    return result;
                }
            }
        }
        return null;
    }
}

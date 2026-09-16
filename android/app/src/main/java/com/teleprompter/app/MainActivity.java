package com.teleprompter.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static boolean listoParaMostrar = false;
    private static long inicioActivityMs = 0;
    // 1540 es cuando el punto termina de encenderse. Los 250 de mas son el SOSTENIDO:
    // el punto se queda quieto y prendido un cuarto de segundo antes de soltar. Sin eso
    // la marca se completa y desaparece en el mismo instante, y no se alcanza a leer.
    private static final long DURACION_MARCA_MS = 1540 + 250;

    public static void notificarListo() {
        listoParaMostrar = true;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        listoParaMostrar = false;
        inicioActivityMs = System.currentTimeMillis();

        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> {
            long transcurrido = System.currentTimeMillis() - inicioActivityMs;
            boolean animacionTerminada = transcurrido >= DURACION_MARCA_MS;
            return !(listoParaMostrar && animacionTerminada);
        });

        new Handler(Looper.getMainLooper()).postDelayed(() -> listoParaMostrar = true, 2500);

        splashScreen.setOnExitAnimationListener(splashScreenViewProvider -> {
            View view = splashScreenViewProvider.getView();
            view.animate()
                .alpha(0f)
                .setDuration(250)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(splashScreenViewProvider::remove)
                .start();
        });

        // Los plugins se registran ANTES de super.onCreate: despues el puente ya esta
        // armado y no los toma. Es el orden que pide Capacitor.
        registerPlugin(ArranquePlugin.class);
        registerPlugin(VoskNativoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

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

    public static void notificarListo() {
        listoParaMostrar = true;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> !listoParaMostrar);

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

        // El plugin se registra ANTES de super.onCreate: despues el puente ya esta
        // armado y no lo toma. Es el orden que pide Capacitor.
        registerPlugin(VoskNativoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

package com.teleprompter.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // El plugin se registra ANTES de super.onCreate: despues el puente ya esta
        // armado y no lo toma. Es el orden que pide Capacitor.
        registerPlugin(VoskNativoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

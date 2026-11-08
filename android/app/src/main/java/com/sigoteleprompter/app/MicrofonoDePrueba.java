// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/** Sostiene el primer plano, nunca abre un AudioRecord. El único reconocedor sigue siendo Vosk. */
public class MicrofonoDePrueba extends Service {
    private static final String CANAL = "sigo_prueba_flotante";
    private long sesion;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        long pedido = intent != null ? intent.getLongExtra("sesion", -1) : -1;
        if (!VentanaDePrueba.esActual(pedido)) {
            VentanaDePrueba.anotar(pedido, "servicio descartado: sesión vieja o cerrada");
            // Un pedido viejo no puede detener el primer plano de una sesión nueva.
            if (!VentanaDePrueba.seEsperaServicio()) stopSelf(startId);
            return START_NOT_STICKY;
        }
        sesion = pedido;
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            NotificationChannel canal = new NotificationChannel(CANAL, "Prueba flotante", NotificationManager.IMPORTANCE_LOW);
            canal.setSound(null, null);
            canal.enableVibration(false);
            nm.createNotificationChannel(canal);
            ServiceCompat.startForeground(this, 8108,
                new NotificationCompat.Builder(this, CANAL)
                    .setSmallIcon(R.drawable.prueba_microfono)
                    .setContentTitle("Sigo · prueba flotante")
                    .setContentText("Sigo · prueba flotante")
                    .setSilent(true).setOngoing(true).build(),
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE : 0);
            VentanaDePrueba.servicioConfirmado(sesion, true, null);
        } catch (Exception e) {
            VentanaDePrueba.servicioConfirmado(sesion, false, e.toString());
            stopSelf(startId);
        }
        return START_NOT_STICKY;
    }
    @Override public void onTaskRemoved(Intent raiz) {
        if (!VentanaDePrueba.esActual(sesion) && VentanaDePrueba.seEsperaServicio()) {
            VentanaDePrueba.anotar(sesion, "onTaskRemoved descartado: servicio de sesión vieja");
            return;
        }
        VentanaDePrueba.cerrarNumero(sesion, "onTaskRemoved");
        stopSelf();
        super.onTaskRemoved(raiz);
    }
    @Override public void onDestroy() {
        VentanaDePrueba.servicioConfirmado(sesion, false, "onDestroy del servicio");
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}

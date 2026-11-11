// LA VENTANA FLOTANTE, 11-11-2026: el marco que gira la lectura dentro de la ventana, en el mismo paso que la ventana.
package com.sigoteleprompter.app;

import android.content.Context;
import android.view.View;
import android.widget.FrameLayout;

// EL MARCO GIRA A SU HIJO CUANDO ANDROID LE DA SU MEDIDA -11-11-2026-. Javier lo vio grabando la publicidad: con el
// telefono de lado, al agrandar o achicar la ventana por la esquina, la ventana temblaba; al moverla no. Al moverla
// solo cambia donde esta la ventana. Al cambiar el tamano cambian dos cosas: la ventana -updateViewLayout, que Android
// aplica en una pasada siguiente- y la WebView de adentro -su medida y su desplazamiento, que GeometriaVentana.vista
// calcula con (alto - ancho) / 2 y que se aplicaban al tiro con setLayoutParams y setTranslation-. En cada paso del
// dedo la WebView se corria con la medida nueva dentro de la ventana todavia con la vieja, y volvia en el cuadro
// siguiente: eso era el temblor. De pie no se notaba porque sin giro el desplazamiento es siempre 0.
// Ahora la medida y el desplazamiento de la WebView salen de la medida que Android le da al marco, en onMeasure y
// onLayout: la misma pasada que cambia la ventana. Es la cuenta de GeometriaVentana.vista, hecha aqui.
// Antes: VentanaDePrueba.girarVista sobre un FrameLayout comun, como sigue el menu de Aa, que no cambia de tamano
// con el dedo.
final class MarcoGirado extends FrameLayout {
    private int cuartos;

    MarcoGirado(Context contexto) {
        super(contexto);
    }

    // Los grados de la compensacion -0, 90, 180 o 270-. Solo pide una pasada si cambiaron.
    void ponerGiro(float grados) {
        int q = GeometriaVentana.cuartos(Math.round(grados / 90f));
        if (q == cuartos) return;
        cuartos = q;
        requestLayout();
    }

    @Override
    protected void onMeasure(int anchoSpec, int altoSpec) {
        int ancho = MeasureSpec.getSize(anchoSpec);
        int alto = MeasureSpec.getSize(altoSpec);
        setMeasuredDimension(ancho, alto);
        boolean cruzado = cuartos % 2 == 1;
        int hijoAncho = cruzado ? alto : ancho;
        int hijoAlto = cruzado ? ancho : alto;
        for (int i = 0; i < getChildCount(); i++) {
            View hijo = getChildAt(i);
            hijo.measure(MeasureSpec.makeMeasureSpec(hijoAncho, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(hijoAlto, MeasureSpec.EXACTLY));
        }
    }

    @Override
    protected void onLayout(boolean cambio, int l, int t, int r, int b) {
        int marcoAncho = r - l;
        int marcoAlto = b - t;
        for (int i = 0; i < getChildCount(); i++) {
            View hijo = getChildAt(i);
            int ancho = hijo.getMeasuredWidth();
            int alto = hijo.getMeasuredHeight();
            hijo.layout(0, 0, ancho, alto);
            // View.setRotation gira alrededor del centro de la vista; el desplazamiento lleva ese centro al del marco.
            hijo.setRotation(cuartos * 90f);
            hijo.setTranslationX((marcoAncho - ancho) / 2f);
            hijo.setTranslationY((marcoAlto - alto) / 2f);
        }
    }
}

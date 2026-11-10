// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: que el giro esté enchufado en la ventana de verdad. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.Test;

// CONSTRUIR NO ES CONECTAR -AGENTS.md-. VentanaDePrueba no corre en la JVM: usa WindowManager, WebView y sensores.
// OrientacionDeVentana y BandaGirada se prueban enteras; esta prueba lee el código de VentanaDePrueba y
// AccesibilidadDePrueba, sin los comentarios, y comprueba que el camino que usa la ventana pasa por ellas: que lo que
// BandaGirada calcula se copia en la ventana y en la vista, que el sensor llega a OrientacionDeVentana y que se suelta
// al cerrar y al desconectarse el servicio. Si alguien vuelve a poner la WebView sola en la pantalla, o a calcular
// la geometría aparte, esto falla.
public class ConexionDelGiroTest {
    static String sinComentarios(String archivo) throws IOException {
        Path p = Paths.get("src/main/java/com/sigoteleprompter/app", archivo);
        StringBuilder sb = new StringBuilder();
        for (String linea : Files.readAllLines(p, StandardCharsets.UTF_8)) {
            String t = linea.trim();
            if (t.startsWith("//")) continue;
            sb.append(t).append('\n');
        }
        return sb.toString();
    }

    static void tiene(String codigo, String pedazo) {
        assertTrue("falta en el código: " + pedazo, codigo.contains(pedazo));
    }

    @Test public void laVentanaPoneLoQueCalculaBandaGirada() throws IOException {
        String v = sinComentarios("VentanaDePrueba.java");
        // La WebView va dentro del marco, y el marco es lo que va a la pantalla.
        tiene(v, "marco.addView(web, new FrameLayout.LayoutParams(");
        tiene(v, "ventanas.addView(marco, posicion);");
        assertTrue("la WebView no debe ir sola a la pantalla", !v.contains("ventanas.addView(web,") && !v.contains("ventanas.updateViewLayout(web,"));
        // Al abrir y al cambiar la pantalla, con la compensación de OrientacionDeVentana.
        tiene(v, "banda.abrir(medir(), orientacion.aplicada(), lienzo);");
        tiene(v, "orientacion.alPantalla(rotacionPantalla(), SystemClock.elapsedRealtime());");
        tiene(v, "banda.alCambiarPantalla(medir(), orientacion == null ? 0 : orientacion.aplicada(), lienzo);");
        tiene(v, "banda.encuadrar(medir(), lienzo);");
        // El lienzo copia la ventana en LayoutParams y la pone en el marco; la vista se gira dentro.
        tiene(v, "posicion.x = x; posicion.y = y; posicion.width = ancho; posicion.height = alto;");
        tiene(v, "ventanas.updateViewLayout(marco, posicion);");
        tiene(v, "if (web != null) girarVista(web, ancho, alto, grados, dx, dy);");
        tiene(v, "vista.setRotation(grados);");
        tiene(v, "vista.setTranslationX(dx);");
        tiene(v, "vista.setTranslationY(dy);");
        // El arrastre se mide en el marco de la persona y lo pone BandaGirada.
        tiene(v, "float[] p = banda.aPersona(ev.getRawX(), ev.getRawY(), medir());");
        tiene(v, "banda.mover(p[0], p[1], m, lienzo);");
        // El menú de Aa con la misma compensación, en su marco.
        tiene(v, "int[] enPantalla = banda.aPantalla(caja, medir());");
        tiene(v, "girarVista(menuWeb, caja[2], caja[3], giroMenu[0], giroMenu[1], giroMenu[2]);");
        tiene(v, "ventanas.addView(marcoMenu, menuPos);");
        // La página recibe la geometría de la persona.
        tiene(v, "int[] g = banda.banda();\nint[] seguro = banda.seguro(medir());");
    }

    @Test public void elSensorLlegaALaDecisionYSeSuelta() throws IOException {
        String v = sinComentarios("VentanaDePrueba.java");
        tiene(v, "@Override public void onOrientationChanged(int grados) { alGradosDelSensor(grados); }");
        tiene(v, "boolean cambio = orientacion.alSensor(grados, SystemClock.elapsedRealtime());");
        tiene(v, "sensorGiro.enable();");
        tiene(v, "@Override public void apagar() { if (sensorGiro != null) sensorGiro.disable(); }");
        tiene(v, "pantallas.registerDisplayListener(oyentePantalla, PRINCIPAL);");
        tiene(v, "Settings.System.getUriFor(Settings.System.ACCELEROMETER_ROTATION), false, oyenteAuto);");
        tiene(v, "orientacion.empezar(rotacionPantalla(), rotacionAutomatica());");
        // Al cerrar: quitarVentanas suelta el sensor y los oyentes.
        int quitar = v.indexOf("void quitarVentanas(String motivo) {");
        assertTrue(quitar >= 0);
        assertTrue("quitarVentanas debe soltar el giro", v.indexOf("soltarGiro(\"cerrar \" + motivo);", quitar) > quitar);
        tiene(v, "if (orientacion != null) orientacion.soltar();");
        tiene(v, "pantallas.unregisterDisplayListener(oyentePantalla);");
        tiene(v, "contexto.getContentResolver().unregisterContentObserver(oyenteAuto);");
        // Al desconectarse el servicio, en el acto.
        String a = sinComentarios("AccesibilidadDePrueba.java");
        int desconectar = a.indexOf("private void desconectar(String motivo) {");
        assertTrue(desconectar >= 0);
        int soltar = a.indexOf("VentanaDePrueba.soltarGiroDeAccesibilidad(this, motivo);", desconectar);
        int cerrar = a.indexOf("VentanaDePrueba.cerrarDeAccesibilidad(this, motivo);", desconectar);
        assertTrue("desconectar debe soltar el giro antes del cierre", soltar > desconectar && soltar < cerrar);
        tiene(a, "desconectar(\"onUnbind\");");
        tiene(a, "desconectar(\"onDestroy accesibilidad\");");
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t167u: que la esquina de verdad llegue al tamaño medido en la pantalla. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static com.sigoteleprompter.app.ConexionDelGiroTest.sinComentarios;
import static com.sigoteleprompter.app.ConexionDelGiroTest.tiene;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import org.junit.Test;

// CONSTRUIR NO ES CONECTAR -AGENTS.md-. VentanaDePrueba no corre en la JVM. Esta prueba lee su código, sin los
// comentarios, y comprueba que el toque de la esquina pasa por TamanoVentana y BandaGirada.redimensionar como en
// TamanoVentanaTest: el DOWN guarda el dedo y la banda, tamanoInicio de la página lo empieza, cada MOVE pone la ventana
// sin guardar ni avisar a la página, y al soltar, al girar o al cerrar termina; guardar y avisar, una vez al soltar.
// La página -flotanteArrastre.test.tsx- manda tamanoInicio y ya no manda 'tamano'.
public class ConexionDelTamanoTest {
    static String cuerpo(String codigo, String firma) {
        int i = codigo.indexOf(firma);
        assertTrue("falta " + firma, i >= 0);
        int j = codigo.indexOf("\n}\n", i);
        return codigo.substring(i, j);
    }

    @Test public void laEsquinaLlegaAlTamanoMedidoEnLaPantalla() throws IOException {
        String v = sinComentarios("VentanaDePrueba.java");
        tiene(v, "final TamanoVentana tamano = new TamanoVentana();");
        String tocar = cuerpo(v, "void alTocarBanda(MotionEvent ev) {");
        assertTrue(tocar.contains("tamano.alApoyar(ev.getPointerId(0), p[0], p[1], b);"));
        assertTrue(tocar.contains("int i = ev.findPointerIndex(arrastre.activo() ? arrastre.dedo() : tamano.dedo());"));
        assertTrue(tocar.contains("if (arrastre.activo()) moverArrastre(rx, ry);\nelse cambiarTamano(rx, ry);"));
        assertTrue(tocar.contains("if (arriba == tamano.dedo()) terminarTamano(\"primer dedo arriba\", true);"));
        assertTrue(tocar.contains("terminarTamano(accion == MotionEvent.ACTION_UP ? \"soltar\" : \"cancelado\", true);"));
        tiene(v, "} else if (\"tamanoInicio\".equals(tipo) && posicion != null) {\nempezarTamano();");
        String empezar = cuerpo(v, "void empezarTamano() {");
        assertTrue(empezar.contains("if (arrastre.activo() || !tamano.empezar()) {"));
        String cambiar = cuerpo(v, "void cambiarTamano(float rawX, float rawY) {");
        assertTrue(cambiar.contains("float[] q = banda.aPersona(rawX, rawY, m);"));
        assertTrue(cambiar.contains("int[] g = tamano.alMover(q[0], q[1], s[2], s[3], dp(GeometriaVentana.MIN_ANCHO), dp(GeometriaVentana.MIN_ALTO));"));
        assertTrue(cambiar.contains("banda.redimensionar(g, m, lienzo);"));
        assertTrue("durante el gesto no se guarda ni se avisa", !cambiar.contains("guardarGeometria") && !cambiar.contains("encuadrar") && !cambiar.contains("enviarGeometria"));
        String terminar = cuerpo(v, "void terminarTamano(String motivo, boolean avisar) {");
        assertTrue(terminar.contains("if (!tamano.terminar()) return;\nguardarGeometria();"));
        assertTrue(terminar.contains("if (avisar) encuadrar();"));
        // El giro y el cierre también lo terminan.
        tiene(v, "Sesion.this.terminarArrastre(motivo, false);\nSesion.this.terminarTamano(motivo, false);");
        int quitar = v.indexOf("void quitarVentanas(String motivo) {");
        assertTrue(quitar >= 0 && v.indexOf("tamano.terminar();", quitar) > quitar);
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;
import org.junit.Test;
import static org.junit.Assert.*;

public class UltimasPalabrasTest {
    @Test public void parcialConEspaciosYMasQueElMaximo() {
        assertEquals("dos tres cuatro cinco", UltimasPalabras.de("{\"partial\":\" uno  dos tres cuatro cinco  \"}", 4));
    }
    @Test public void finalConResultadosDeVosk() {
        assertEquals("ya llegó", UltimasPalabras.de("{\"result\":[{\"conf\":1e-2,\"word\":\"llegó\"}],\"text\":\"ya llegó\"}", 4));
    }
    @Test public void vacios() {
        for (String json : new String[] { "{}", "", "{\"partial\":\"\"}", "{\"text\":\"   \"}", "[]", "null" }) {
            assertEquals("", UltimasPalabras.de(json, 4));
        }
        assertEquals("", UltimasPalabras.de(null, 4));
    }
    @Test public void rotosNoDanEvidencia() {
        for (String json : new String[] { "{", "{\"partial\":\"hola\"", "{\"text\":\"hola\",}",
            "{\"text\":\"hola\"} basura", "{\"text\":\"hola\\x\"}", "{\"text\":\"hola\\uQQQQ\"}",
            "{\"text\":\"hola\",\"n\":01}", "{\"text\":\"hola\",\"n\":[true,]}", "{\"text\":\"hola\",\"n\":.1}",
            "{\"text\":\"hola\n\"}" }) {
            assertEquals(json, "", UltimasPalabras.de(json, 4));
        }
    }
    @Test public void acentosYEscapesValidos() {
        assertEquals("sí llegó mi canción", UltimasPalabras.de("{\"text\":\"sí llegó mi canci\\u00f3n\"}", 4));
        assertEquals("\"sí\" \\ / 😊", UltimasPalabras.de("{\"partial\":\"\\\"sí\\\" \\\\ \\/ \\ud83d\\ude0a\"}", 4));
        assertEquals("uno dos tres cuatro", UltimasPalabras.de("{\"text\":\"uno\\n dos\\t tres\\r cuatro\"}", 4));
        assertEquals("a\b b", UltimasPalabras.de("{\"text\":\"a\\b\\f b\"}", 4));
    }
    @Test public void ceroNegativoYMenosQueElMaximo() {
        assertEquals("", UltimasPalabras.de("{\"text\":\"hola mundo\"}", 0));
        assertEquals("", UltimasPalabras.de("{\"text\":\"hola mundo\"}", -3));
        assertEquals("hola mundo", UltimasPalabras.de("{\"text\":\"hola mundo\"}", 4));
        assertEquals("mundo", UltimasPalabras.de("{\"text\":\"hola mundo\"}", 1));
    }
    @Test public void soloCamposDePrimerNivelYTipoCadena() {
        assertEquals("", UltimasPalabras.de("{\"nested\":{\"text\":\"ajena\"}}", 4));
        assertEquals("", UltimasPalabras.de("{\"partial\":42}", 4));
    }
}

package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// LOS SUBTÍTULOS EN HORIZONTAL -tarea 87, 04-10-2026, pedido de Javier-. En horizontal, renglones de
// hasta 47 letras y la letra contra el lado corto del cuadro -60 px en 1080, 40 en 720-; la vertical,
// igual que antes al píxel. Java puro: UbicacionSubtitulos.
public class UbicacionSubtitulosTest {
    // Los avances de Roboto Bold -la letra del sistema que usa Android, en 700- en unidades de 2048 por
    // em: M 1793, W 1792. Sacados del Roboto de Google Fonts -Roboto-VariableFont_wdth,wght.ttf,
    // wght=700, wdth=100- con fontTools; el canvas de Chrome con la misma letra mide lo mismo. En la
    // prueba no hay android.graphics.Paint: el ancho es la suma de los avances, como measureText.
    private static final float M = 1793f / 2048f;
    private static final float W_ = 1792f / 2048f;

    private static float anchoMW(int letras, float letra) {
        float em = 0;
        for (int i = 0; i < letras; i++) em += i % 2 == 0 ? M : W_;
        return em * letra;
    }

    @Test
    public void enHorizontalElRenglonEsDe47YEnVerticalDe32() {
        assertEquals(47, UbicacionSubtitulos.letrasPorRenglon(1920, 1080));
        assertEquals(47, UbicacionSubtitulos.letrasPorRenglon(1280, 720));
        assertEquals(32, UbicacionSubtitulos.letrasPorRenglon(1080, 1920));
        assertEquals(32, UbicacionSubtitulos.letrasPorRenglon(720, 1280));
        // Cuadrado, como vertical.
        assertEquals(32, UbicacionSubtitulos.letrasPorRenglon(1080, 1080));
    }

    @Test
    public void laLetraVaContraElLadoCorto() {
        assertEquals(60f, UbicacionSubtitulos.letra(1920, 1080), 0f);
        assertEquals(40f, UbicacionSubtitulos.letra(1280, 720), 0f);
    }

    // -04-10-2026- El menor entre lado corto / 18 y lado largo / 32: una vertical 3:4 sigue como antes.
    @Test
    public void unaVertical480x640SigueEn20() {
        assertEquals(20f, UbicacionSubtitulos.letra(480, 640), 0f);
        assertEquals(20f, UbicacionSubtitulos.letra(640, 480), 0f);
    }

    // GUARDIANA: la vertical, igual que antes -H / 32f-, al píxel.
    @Test
    public void enVerticalLaLetraEsLaDeAntes() {
        assertEquals(1920f / 32f, UbicacionSubtitulos.letra(1080, 1920), 0f);
        assertEquals(60f, UbicacionSubtitulos.letra(1080, 1920), 0f);
        assertEquals(1280f / 32f, UbicacionSubtitulos.letra(720, 1280), 0f);
        assertEquals(32, UbicacionSubtitulos.LETRAS_VERTICAL);
    }

    // El renglón de 47 «MW» a 60 px mide 2468 px y el útil de 1920 es 1689,6: no cabe. El ajuste
    // achica la letra de ese subtítulo a ~41,1 y entonces cabe justo.
    @Test
    public void unRenglonDe47MWQuedaDentroDelMargenConElAjuste() {
        float letra = UbicacionSubtitulos.letra(1920, 1080);
        float util = 1920 * UbicacionSubtitulos.ANCHO_UTIL;
        float ancho = anchoMW(47, letra);
        assertTrue("47 MW a 60 px no caben: " + ancho, ancho > util);
        float ajustada = UbicacionSubtitulos.letraQueCabe(letra, ancho, 1920);
        assertTrue("la letra baja: " + ajustada, ajustada < letra);
        assertTrue("con la letra ajustada cabe: " + anchoMW(47, ajustada) + " <= " + util, anchoMW(47, ajustada) <= util + 0.01f);
        assertEquals(41.08f, ajustada, 0.05f);
    }

    // Un renglón común de 47 letras -con espacios- cabe sin ajuste a 60 px.
    @Test
    public void unRenglonComunDe47CabeSinAjuste() {
        float letra = UbicacionSubtitulos.letra(1920, 1080);
        // «que podríamos llamar la concepción trágica de l», medido con Roboto Bold: 21,52 em.
        float ancho = 21.52f * letra;
        assertEquals(letra, UbicacionSubtitulos.letraQueCabe(letra, ancho, 1920), 0f);
        assertTrue(ancho <= 1920 * UbicacionSubtitulos.ANCHO_UTIL);
    }
}

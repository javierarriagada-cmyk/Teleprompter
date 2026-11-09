// PROTOTIPO DE LA VENTANA FLOTANTE, 09-11-2026: las reglas de la sesión de la ventana. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

// Solo la lógica, con la hora puesta a mano: qué cuenta como lectura, cuándo sale el aviso, cuándo pausa el límite, y
// que Pausa y Seguir pasen por la cuenta 3-2-1. Los valores son los de omisión de limites.ts: 240 s y 60 s antes.
public class SesionVentanaTest {
    static final int LECTURA = 240, AVISO = 60;

    static SesionVentana conLimite() { return new SesionVentana(true, LECTURA, AVISO, 0); }

    // Pausa en t y Seguir hasta volver a escuchar, con la cuenta entera: devuelve la hora al terminar la cuenta.
    // -9-nov-2026- Con el micrófono confirmado en ese mismo instante: antes la cuenta terminaba escuchando sola.
    // Antes: después de assertEquals(0, s.pasoDeCuenta(u + 3000)); venía return u + 3000;
    static long pausaYSeguir(SesionVentana s, long t, long pausaMs) {
        assertTrue(s.pausar(t));
        long u = t + pausaMs;
        assertEquals(3, s.seguir());
        assertEquals(2, s.pasoDeCuenta(u + 1000));
        assertEquals(1, s.pasoDeCuenta(u + 2000));
        assertEquals(0, s.pasoDeCuenta(u + 3000));
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(s.intentoPedido(), true, u + 3000));
        return u + 3000;
    }

    @Test public void losSegundosCuentanSoloEscuchando() {
        SesionVentana s = conLimite();
        // La cuenta inicial no cuenta.
        assertEquals(0, s.leidosMs(5000));
        assertTrue(s.empezarLectura(10_000));
        assertEquals(30_000, s.leidosMs(40_000));
        // 50 s de pausa y los 3 de la cuenta no cuentan.
        long vuelta = pausaYSeguir(s, 40_000, 50_000);
        assertEquals(30_000, s.leidosMs(vuelta));
        assertEquals(40_000, s.leidosMs(vuelta + 10_000));
        // Durante la cuenta tampoco corre.
        SesionVentana c = conLimite();
        c.empezarLectura(0);
        c.pausar(20_000);
        c.seguir();
        assertEquals(20_000, c.leidosMs(21_500));
        // Lo leído antes de abrir se suma.
        SesionVentana previa = new SesionVentana(true, LECTURA, AVISO, 12.5);
        previa.empezarLectura(0);
        assertEquals(22_500, previa.leidosMs(10_000));
    }

    @Test public void elAvisoSaleUnaVezEnLecturaMenosAviso() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(179_999));
        assertEquals(SesionVentana.Evento.AVISO, s.revisar(180_000));
        assertEquals(SesionVentana.Evento.NADA, s.revisar(180_250));
        // Ni después de una pausa vuelve a salir.
        long vuelta = pausaYSeguir(s, 190_000, 20_000);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 1000));
    }

    @Test public void elLimitePausaUnaVezEnLectura() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertEquals(SesionVentana.Evento.AVISO, s.revisar(180_000));
        // Con una pausa de 30 s de por medio, el límite cae a los 240 s leídos: 270 s de reloj.
        long vuelta = pausaYSeguir(s, 200_000, 27_000);
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 39_999));
        assertEquals(SesionVentana.Evento.LIMITE, s.revisar(vuelta + 40_000));
        assertTrue(s.enPausa());
        assertTrue(s.llegoAlLimite());
        // En la pausa del límite nada más cuenta ni vuelve a pausar.
        assertEquals(SesionVentana.Evento.NADA, s.revisar(vuelta + 60_000));
        // Seguir después del límite sigue, como en Sigo después de su pausa del límite: no vuelve a cortar.
        long otra = pausaYSeguirDesdePausa(s, vuelta + 70_000);
        assertTrue(s.escuchando());
        assertEquals(SesionVentana.Evento.NADA, s.revisar(otra + 600_000));
        assertTrue(s.escuchando());
    }

    // -9-nov-2026- Igual que pausaYSeguir: con el micrófono confirmado al terminar. Antes terminaba en return u + 3000.
    static long pausaYSeguirDesdePausa(SesionVentana s, long u) {
        assertEquals(3, s.seguir());
        s.pasoDeCuenta(u + 1000);
        s.pasoDeCuenta(u + 2000);
        assertEquals(0, s.pasoDeCuenta(u + 3000));
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(s.intentoPedido(), true, u + 3000));
        return u + 3000;
    }

    @Test public void sinLimiteNoHayAvisoNiPausa() {
        // Sigo+ o Velocidad fija: el contrato llega sin límite.
        SesionVentana s = new SesionVentana(false, LECTURA, AVISO, 0);
        s.empezarLectura(0);
        for (long t = 0; t <= 3_600_000; t += 250) assertEquals(SesionVentana.Evento.NADA, s.revisar(t));
        assertTrue(s.escuchando());
        assertFalse(s.llegoAlLimite());
    }

    // -9-nov-2026, orden «Tres correcciones», fallo 2- Al terminar el «1» se PIDE el micrófono: hasta que Vosk confirme
    // la apertura, la ventana no dice «escuchando» y el reloj del límite no corre. Antes se ponía a escuchar de una, y
    // si el micrófono no abría, la ventana y el reloj quedaban como si la persona estuviera leyendo.
    @Test public void alTerminarLaCuentaNoEscuchaNiCuentaHastaQueAbraElMicrofono() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        s.pausar(10_000);
        s.seguir();
        s.pasoDeCuenta(11_000);
        s.pasoDeCuenta(12_000);
        assertEquals(0, s.pasoDeCuenta(13_000));
        assertFalse("sin la confirmación del micrófono no se publica «escuchando»", s.escuchando());
        assertEquals("sin micrófono no corren los segundos leídos", 10_000, s.leidosMs(60_000));
        long intento = s.intentoPedido();
        assertTrue(intento > 0);
        // Falla: vuelve a Pausa, sin contar, y Seguir se puede tocar otra vez.
        assertEquals(SesionVentana.Apertura.PAUSA, s.alAbrirMicrofono(intento, false, 61_000));
        assertTrue(s.enPausa());
        assertEquals(10_000, s.leidosMs(90_000));
        // Una respuesta repetida o vieja ya no hace nada.
        assertEquals(SesionVentana.Apertura.DESCARTADA, s.alAbrirMicrofono(intento, true, 91_000));
        assertTrue(s.enPausa());
        assertEquals(3, s.seguir());
        s.pasoDeCuenta(101_000);
        s.pasoDeCuenta(102_000);
        assertEquals(0, s.pasoDeCuenta(103_000));
        long otro = s.intentoPedido();
        assertTrue(otro != intento);
        // La del intento anterior llega tarde: descartada, y el nuevo sigue esperando.
        assertEquals(SesionVentana.Apertura.DESCARTADA, s.alAbrirMicrofono(intento, true, 104_000));
        assertFalse(s.escuchando());
        // La del nuevo: escucha y cuenta desde la confirmación, no desde el «1».
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(otro, true, 105_000));
        assertTrue(s.escuchando());
        assertEquals(15_000, s.leidosMs(110_000));
        // El límite solo mira lo escuchado: esperando el micrófono no hay aviso.
        SesionVentana l = conLimite();
        l.empezarLectura(0);
        l.pausar(170_000);
        l.seguir();
        l.pasoDeCuenta(171_000);
        l.pasoDeCuenta(172_000);
        l.pasoDeCuenta(173_000);
        assertEquals(SesionVentana.Evento.NADA, l.revisar(900_000));
    }

    // -9-nov-2026- Pausa -o pantalla apagada- y cierre con la apertura pendiente: la respuesta que llega después se
    // descarta y nunca vuelve a poner «escuchando».
    @Test public void pausaOCierreConLaAperturaPendienteLaDescartan() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        s.pausar(1000);
        s.seguir();
        s.pasoDeCuenta(2000);
        s.pasoDeCuenta(3000);
        s.pasoDeCuenta(4000);
        long intento = s.intentoPedido();
        assertTrue(s.pausar(4500));
        assertEquals(0, s.intentoPedido());
        assertEquals(SesionVentana.Apertura.DESCARTADA, s.alAbrirMicrofono(intento, true, 5000));
        assertTrue(s.enPausa());
        assertEquals(1000, s.leidosMs(60_000));

        SesionVentana c = conLimite();
        c.empezarLectura(0);
        c.pausar(1000);
        c.seguir();
        c.pasoDeCuenta(2000);
        c.pasoDeCuenta(3000);
        c.pasoDeCuenta(4000);
        long i2 = c.intentoPedido();
        assertTrue(c.cerrar(4500));
        assertFalse(c.cerrar(4600));
        assertEquals(SesionVentana.Apertura.DESCARTADA, c.alAbrirMicrofono(i2, true, 5000));
        assertFalse(c.escuchando());
        assertEquals(0, c.seguir());
        assertEquals(1000, c.leidosMs(60_000));
    }

    @Test public void pausaYSeguirPasanPorLaCuenta() {
        SesionVentana s = conLimite();
        s.empezarLectura(0);
        assertTrue(s.pausar(1000));
        assertTrue(s.enPausa());
        assertFalse(s.pausar(1500));
        // Seguir no vuelve a escuchar de una: 3, 2, 1 y recién ahí.
        assertEquals(3, s.seguir());
        assertEquals(3, s.cuenta());
        assertFalse(s.escuchando());
        assertEquals(2, s.pasoDeCuenta(2000));
        assertEquals(1, s.pasoDeCuenta(3000));
        assertFalse(s.escuchando());
        assertEquals(0, s.pasoDeCuenta(4000));
        // Antes -9-nov-2026-: assertTrue(s.escuchando()); justo al terminar la cuenta. Ahora, con Vosk confirmando.
        assertFalse(s.escuchando());
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(s.intentoPedido(), true, 4000));
        assertTrue(s.escuchando());
        // Seguir sin pausa no hace nada; un paso viejo de la cuenta tampoco.
        assertEquals(0, s.seguir());
        assertEquals(-1, s.pasoDeCuenta(5000));
        // Pausa en plena cuenta: la corta, y un paso que haya quedado en la cola no la revive.
        s.pausar(6000);
        s.seguir();
        assertTrue(s.pausar(6500));
        assertEquals(-1, s.pasoDeCuenta(7000));
        assertTrue(s.enPausa());
    }

    // -9-nov-2026, orden t160u, punto 4- EL PRIMER EMPEZAR NECESITA DOS CONFIRMACIONES: terminó la cuenta de Sigo y abrió
    // el micrófono -la página de Sigo, con el intento inicial-. En cualquier orden; Pausa o cierre entre medio invalidan.
    static final long INICIAL = SesionVentana.INTENTO_INICIAL;
    static final SesionVentana.Inicial REENVIAR = SesionVentana.Inicial.REENVIAR;

    @Test public void alTerminarLaCuentaDeEmpezarNoEscuchaNiCuentaHastaQueAbraElMicrofono() {
        SesionVentana s = conLimite();
        assertEquals(REENVIAR, s.estadoDeSigo(true, false, false, 0));
        assertEquals(REENVIAR, s.estadoDeSigo(true, false, false, 1000));
        // Fin de la cuenta, sin micrófono todavía: Android manda su estado, sin escuchar y sin reloj.
        assertEquals(SesionVentana.Inicial.ESPERANDO_MICRO, s.estadoDeSigo(false, true, false, 3000));
        assertFalse(s.escuchando());
        assertEquals(0, s.leidosMs(60_000));
        assertEquals(SesionVentana.Evento.NADA, s.revisar(300_000));
        // Más estados de Sigo ya no pasan.
        assertEquals(SesionVentana.Inicial.DESCARTAR, s.estadoDeSigo(false, true, false, 3500));
        // La confirmación: desde ahí escucha y cuenta.
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(INICIAL, true, 5000));
        assertTrue(s.escuchando());
        assertEquals(1000, s.leidosMs(6000));
    }

    @Test public void conElMicrofonoAbiertoAntesDelFinDeLaCuentaEscuchaAlTerminarla() {
        SesionVentana s = conLimite();
        s.estadoDeSigo(true, false, false, 0);
        assertEquals(SesionVentana.Apertura.ANOTADA, s.alAbrirMicrofono(INICIAL, true, 1000));
        // Abrió, pero la cuenta sigue: no escucha ni cuenta.
        assertFalse(s.escuchando());
        assertEquals(0, s.leidosMs(2500));
        assertEquals(REENVIAR, s.estadoDeSigo(true, false, false, 2000));
        assertEquals(SesionVentana.Inicial.ESCUCHANDO, s.estadoDeSigo(false, true, false, 3000));
        assertTrue(s.escuchando());
        assertEquals(1000, s.leidosMs(4000));
    }

    @Test public void siLaAperturaDelPrimerEmpezarFallaQuedaEnPausaYSeguirLaReintenta() {
        // Antes del fin de la cuenta.
        SesionVentana a = conLimite();
        a.estadoDeSigo(true, false, false, 0);
        assertEquals(SesionVentana.Apertura.ANOTADA, a.alAbrirMicrofono(INICIAL, false, 1000));
        assertEquals(SesionVentana.Inicial.PAUSA, a.estadoDeSigo(false, true, false, 3000));
        assertTrue(a.enPausa());
        assertEquals(0, a.leidosMs(10_000));
        assertEquals(3, a.seguir());
        // Después del fin de la cuenta.
        SesionVentana b = conLimite();
        b.estadoDeSigo(true, false, false, 0);
        b.estadoDeSigo(false, true, false, 3000);
        assertEquals(SesionVentana.Apertura.PAUSA, b.alAbrirMicrofono(INICIAL, false, 3500));
        assertTrue(b.enPausa());
        assertEquals(0, b.leidosMs(10_000));
        assertEquals(3, b.seguir());
    }

    @Test public void pausaOCierreEnElPrimerEmpezarInvalidanLaConfirmacion() {
        // Pausa en plena cuenta de Sigo: la confirmación que llega después se descarta -la ventana suelta la captura-.
        SesionVentana a = conLimite();
        a.estadoDeSigo(true, false, false, 0);
        assertTrue(a.pausar(1000));
        assertEquals(SesionVentana.Apertura.DESCARTADA, a.alAbrirMicrofono(INICIAL, true, 1500));
        assertEquals(SesionVentana.Inicial.DESCARTAR, a.estadoDeSigo(false, true, false, 3000));
        assertTrue(a.enPausa());
        // Ni durante la cuenta del Seguir que viene después.
        assertEquals(3, a.seguir());
        assertEquals(SesionVentana.Apertura.DESCARTADA, a.alAbrirMicrofono(INICIAL, true, 4000));
        assertEquals(2, a.pasoDeCuenta(5000));
        // Pausa esperando el micrófono, con la cuenta ya terminada.
        SesionVentana b = conLimite();
        b.estadoDeSigo(true, false, false, 0);
        b.estadoDeSigo(false, true, false, 3000);
        assertTrue(b.pausar(3200));
        assertEquals(SesionVentana.Apertura.DESCARTADA, b.alAbrirMicrofono(INICIAL, true, 3500));
        assertTrue(b.enPausa());
        assertEquals(0, b.leidosMs(10_000));
        // Cierre: todo se descarta.
        SesionVentana c = conLimite();
        c.estadoDeSigo(true, false, false, 0);
        c.cerrar(1000);
        assertEquals(SesionVentana.Apertura.DESCARTADA, c.alAbrirMicrofono(INICIAL, true, 1500));
        assertEquals(SesionVentana.Inicial.DESCARTAR, c.estadoDeSigo(false, true, false, 3000));
        assertFalse(c.escuchando());
    }

    @Test public void unaAperturaDeLaPaginaConLaVentanaYaEscuchandoNoSeToca() {
        SesionVentana s = conLimite();
        s.estadoDeSigo(true, false, false, 0);
        s.estadoDeSigo(false, true, false, 3000);
        assertEquals(SesionVentana.Apertura.ESCUCHANDO, s.alAbrirMicrofono(INICIAL, true, 3100));
        // Otra vez la página -un escuchar repetido-: el oído es el de la lectura, no se suelta.
        assertEquals(SesionVentana.Apertura.IGNORADA, s.alAbrirMicrofono(INICIAL, true, 4000));
        // Y después de un Seguir confirmado, la de la página tampoco cuenta como la de Seguir.
        long t = pausaYSeguir(s, 5000, 1000);
        assertEquals(SesionVentana.Apertura.IGNORADA, s.alAbrirMicrofono(INICIAL, true, t + 100));
        assertTrue(s.escuchando());
    }

    // Antes -9-nov-2026, segunda vuelta-:
    // @Test public void dosEstadosJuntosEsperanElMicrofonoYSinCuentaNiEscucharSoloPasan() {
    //     SesionVentana s = conLimite();
    //     // Sin ver la cuenta y sin escuchar: un estado previo, pasa.
    //     assertEquals(REENVIAR, s.estadoDeSigo(false, false, false, 0));
    //     // En pausa tampoco termina la cuenta.
    //     assertEquals(REENVIAR, s.estadoDeSigo(false, true, true, 100));
    //     // La cuenta y su fin juntos: Sigo ya escucha.
    //     assertEquals(SesionVentana.Inicial.ESPERANDO_MICRO, s.estadoDeSigo(false, true, false, 3000));
    //     assertFalse(s.escuchando());
    // }
    // Razón: los dos últimos parámetros ya no son el «escuchando» y la pausa de Sigo sino su fin y su cancelación.
    @Test public void sinNumeroNiFinSoloPasaYElFinSinNumeroEsperaElMicrofono() {
        SesionVentana s = conLimite();
        // Sin número y sin fin: un estado previo, pasa. Que la cuenta no esté no es que terminó.
        assertEquals(REENVIAR, s.estadoDeSigo(false, false, false, 0));
        assertEquals(REENVIAR, s.estadoDeSigo(false, false, false, 100));
        assertTrue(s.fase() == SesionVentana.Fase.CUENTA_INICIAL);
        // El fin dicho por Sigo, aunque no se haya visto ningún número -dos estados juntos-.
        assertEquals(SesionVentana.Inicial.ESPERANDO_MICRO, s.estadoDeSigo(false, true, false, 3000));
        assertFalse(s.escuchando());
    }

    // -9-nov-2026, segunda vuelta- La cuenta cancelada en Sigo: Pausa, cero segundos, y la apertura tardía se descarta.
    @Test public void laCuentaCanceladaEnSigoPasaAPausaYDescartaLaAperturaTardia() {
        SesionVentana s = conLimite();
        s.estadoDeSigo(3, false, false, 0);
        assertEquals(SesionVentana.Inicial.CANCELADA, s.estadoDeSigo(0, false, true, 1500));
        assertTrue(s.enPausa());
        assertEquals(SesionVentana.Apertura.DESCARTADA, s.alAbrirMicrofono(INICIAL, true, 2000));
        // Ni el reloj de Android ni un fin atrasado de Sigo la reviven.
        assertEquals(SesionVentana.Inicial.DESCARTAR, s.terminarCuentaInicial(3000));
        assertEquals(SesionVentana.Inicial.DESCARTAR, s.estadoDeSigo(0, true, false, 3000));
        assertEquals(0, s.leidosMs(60_000));
        // Seguir lo reintenta.
        assertEquals(3, s.seguir());
    }

    // -9-nov-2026, segunda vuelta- El reloj de Android: el fin de la cuenta sale del primer número, sin la página de Sigo.
    @Test public void elRelojDeAndroidTerminaLaCuentaAunqueSigoNoMandeSuFin() {
        SesionVentana s = conLimite();
        assertEquals(-1, s.finCuentaInicialMs());
        s.estadoDeSigo(3, false, false, 1000);
        assertEquals(4000, s.finCuentaInicialMs());
        // Los números siguientes no lo corren.
        s.estadoDeSigo(2, false, false, 2500);
        assertEquals(4000, s.finCuentaInicialMs());
        assertEquals(SesionVentana.Apertura.ANOTADA, s.alAbrirMicrofono(INICIAL, true, 2600));
        // Sigo se durmió: el reloj termina la cuenta, y con el micrófono ya confirmado, escucha desde ahí.
        assertEquals(SesionVentana.Inicial.ESCUCHANDO, s.terminarCuentaInicial(4000));
        assertEquals(1000, s.leidosMs(5000));
        // El fin de Sigo que llega tarde no cambia nada.
        assertEquals(SesionVentana.Inicial.DESCARTAR, s.estadoDeSigo(0, true, false, 9000));
        // Si el primer número que llega es el 2, el fin es dos segundos después.
        SesionVentana t = conLimite();
        t.estadoDeSigo(2, false, false, 500);
        assertEquals(2500, t.finCuentaInicialMs());
    }
}

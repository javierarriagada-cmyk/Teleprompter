// PROTOTIPO DE LA VENTANA FLOTANTE, 10-11-2026, orden t164u: cuánto se gira la banda según cómo se sostiene el teléfono. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

// CUÁNTO SE GIRA LA BANDA -10-11-2026, orden t164u-. Javier lo midió en el g86: sobre Chrome la ventana ya gira bien,
// porque Android gira la pantalla; sobre Inicio, o sobre una Cámara que conserva su interfaz de pie, Android no la
// gira y el guion queda de costado. Hasta d991e00 VentanaDePrueba.alCambiarPantalla solo distinguía de pie y de lado
// por el ancho y el alto del área segura: no veía el teléfono, y los dos lados del teléfono miden lo mismo.
//
// Aquí se decide la COMPENSACIÓN: cuántos cuartos de vuelta, en el sentido del reloj, se gira la banda sobre la
// pantalla. Es la orientación física estable menos la rotación que Android ya aplicó -Display.getRotation-, así que
// solo se compensa la diferencia. Las dos van en las unidades de Surface.ROTATION_*: 0 de pie, 1 con el lado derecho
// del teléfono arriba, 2 cabeza abajo, 3 con el lado izquierdo arriba -lo que Android haría con la pantalla-.
//
// Sin Android, para probarlo en la JVM -OrientacionDeVentanaTest-. VentanaDePrueba le pasa los grados de
// OrientationEventListener, la rotación de la pantalla y el ajuste «Rotación automática», y pone la compensación que
// devuelve con BandaGirada. Las reglas:
//   - ESTABLE: un lado nuevo vale cuando las lecturas se quedan en él ESTABLE_MS. Casi plano -el sensor da -1- o
//     cerca del límite entre dos lados -a menos de 45 - MARGEN_GRADOS del límite- se conserva el último estable.
//   - UN SOLO GIRO SOBRE CHROME: un cambio que viene del sensor se aplica después de GRACIA_MS. Si en ese tiempo
//     Android gira la pantalla, la diferencia queda en cero y la banda gira una sola vez, con la pantalla.
//   - SI LA PANTALLA GIRA PRIMERO: si el sensor ya está en el lado nuevo, la banda acompaña a la pantalla. Si el
//     teléfono no se movió -o está plano- y la pantalla giró sola -volver a Inicio desde Chrome con el teléfono de
//     lado, o una app que se fuerza de lado-, se conserva lo que ve la persona: la compensación cambia en el acto.
//   - CABEZA ABAJO no se adopta por el sensor: no está en lo pedido -de pie, horizontal izquierdo y derecho- y un
//     teléfono inclinado hacia adelante voltearía el guion. Solo vale si la pantalla misma está cabeza abajo.
//   - «Rotación automática» desactivada: el sensor se apaga y la compensación es 0, el comportamiento de d991e00.
//   - Al cerrar la ventana o desconectarse el servicio, soltar() apaga el sensor y nada más lo enciende.
// Los tiempos son los de esta primera vuelta, sin medir en el g86: el registro anota cada decisión con su hora.
//
// LA CONFIRMACIÓN NO ESPERA OTRA LECTURA -10-11-2026, orden t165u-. Javier lo reprodujo: con la pantalla fija de pie,
// ya establecido de pie, llega UNA lectura a 90° y el teléfono queda quieto; aunque pasen tres segundos la
// compensación sigue en 0 y proximoReloj() da -1. alSensor solo confirmaba la candidata con OTRA lectura pasados los
// ESTABLE_MS, y OrientationEventListener solo avisa cuando el ángulo cambia: con el teléfono quieto puede no avisar.
// Ahora la candidata trae su propio vencimiento -desdeCandidata + ESTABLE_MS- por el mismo reloj que ya usa la gracia:
// proximoReloj() da el que llegue primero y alReloj confirma la candidata si sigue vigente, y de ahí sigue igual que
// antes -programar, con la gracia de GRACIA_MS para que Chrome gire solo-. La invalidación va en el estado, no en el
// reloj: una lectura de otro lado cambia o borra la candidata, plano la borra, desactivar la rotación automática y
// soltar() la olvidan; un vencimiento que llegue tarde no encuentra candidata y no gira nada. Una lectura de otro
// lado durante la gracia también la anula: el teléfono ya no está en el lado que se iba a aplicar.
final class OrientacionDeVentana {
    static final int SIN_DATO = -1;
    // Un lado nuevo vale a menos de 30° de su centro: 15° pasado el límite de 45°. Android gira sus pantallas con un
    // margen parecido -WindowOrientationListener, ADJACENT_ORIENTATION_ANGLE_GAP de 45°, 22,5° pasado el límite-, así
    // que el sensor de la banda llega al lado nuevo antes o junto con Android.
    static final int MARGEN_GRADOS = 30;
    static final long ESTABLE_MS = 300;
    static final long GRACIA_MS = 700;
    // Una lectura más vieja que esto no dice dónde está el teléfono ahora.
    static final long LECTURA_VIGENTE_MS = 500;

    interface Sensor {
        // false si el teléfono no tiene con qué medir -OrientationEventListener.canDetectOrientation-.
        boolean encender();
        void apagar();
    }

    private final Sensor sensor;
    private boolean auto, encendido, suelto;
    private int pantalla;
    private int estable = SIN_DATO;
    private int cruda = SIN_DATO;
    // El lado de la última lectura sin la histéresis: solo si está a menos de MARGEN_GRADOS del centro de un lado.
    // Dice si el teléfono está de verdad en ese lado -y no entre dos- cuando la pantalla gira.
    private int nucleo = SIN_DATO;
    private long horaCruda = -1;
    private int candidata = SIN_DATO;
    private long desdeCandidata;
    private int aplicada;
    private int pendiente = SIN_DATO;
    private long aplicarEn = -1;
    private String ultimaDecision = "";

    OrientacionDeVentana(Sensor sensor) { this.sensor = sensor; }

    int aplicada() { return aplicada; }
    int estable() { return estable; }
    int pantalla() { return pantalla; }
    boolean auto() { return auto; }
    boolean sensorEncendido() { return encendido; }
    boolean suelto() { return suelto; }
    // Cuándo llamar a alReloj, o -1 si no hay nada pendiente.
    // Antes -10-11-2026, orden t164u-: solo la gracia; una candidata sin otra lectura no tenía reloj y no se confirmaba.
    // long proximoReloj() { return pendiente == SIN_DATO ? -1 : aplicarEn; }
    long proximoReloj() {
        long gracia = pendiente == SIN_DATO ? -1 : aplicarEn;
        long confirmacion = confirmacionEn();
        if (gracia < 0) return confirmacion;
        if (confirmacion < 0) return gracia;
        return Math.min(gracia, confirmacion);
    }

    // Cuándo la candidata cumple ESTABLE_MS, o -1 si no hay candidata.
    long confirmacionEn() {
        return suelto || !auto || candidata == SIN_DATO ? -1 : desdeCandidata + ESTABLE_MS;
    }
    String ultimaDecision() { return ultimaDecision; }

    // El lado sin histéresis: solo cerca del centro de un lado; SIN_DATO plano o entre dos.
    static int nucleoDe(int grados) {
        if (grados < 0) return SIN_DATO;
        int g = grados % 360;
        int k = Math.round(g / 90f) % 4;
        int distancia = Math.abs(g - k * 90);
        if (distancia > 180) distancia = 360 - distancia;
        return distancia <= MARGEN_GRADOS ? (4 - k) % 4 : SIN_DATO;
    }

    // El lado del teléfono, en unidades de Surface.ROTATION_*, para los grados de OrientationEventListener -0 de pie,
    // 90 con el lado izquierdo arriba, 270 con el derecho arriba, -1 plano-. referencia es el lado que se conserva
    // cerca de un límite; SIN_DATO si no hay.
    static int ladoDe(int grados, int referencia) {
        if (grados < 0) return SIN_DATO;
        int g = grados % 360;
        int k = Math.round(g / 90f) % 4;
        int distancia = Math.abs(g - k * 90);
        if (distancia > 180) distancia = 360 - distancia;
        // 90° del sensor -el lado izquierdo arriba- es lo que Android llama ROTATION_270, y 270° es ROTATION_90.
        int lado = (4 - k) % 4;
        if (lado == referencia) return lado;
        if (distancia <= MARGEN_GRADOS) return lado;
        return referencia;
    }

    // Al abrir la ventana: la rotación de la pantalla de ese momento y el ajuste del sistema.
    void empezar(int rotacionPantalla, boolean rotacionAutomatica) {
        if (suelto) return;
        pantalla = GeometriaVentana.cuartos(rotacionPantalla);
        aplicada = 0;
        ponerAuto(rotacionAutomatica);
    }

    // «Rotación automática» cambió mientras la ventana está abierta. true si la compensación cambió.
    boolean alAuto(boolean rotacionAutomatica, long ahora) {
        if (suelto || rotacionAutomatica == auto) return false;
        ponerAuto(rotacionAutomatica);
        if (!auto) return poner(0, "rotación automática desactivada");
        return false;
    }

    private void ponerAuto(boolean on) {
        olvidar();
        if (on) {
            auto = encendido || sensor.encender();
            encendido = auto;
            ultimaDecision = auto ? "sensor encendido" : "sin sensor de orientación: la banda sigue a la pantalla";
        } else {
            auto = false;
            if (encendido) sensor.apagar();
            encendido = false;
            ultimaDecision = "rotación automática desactivada: sensor apagado";
        }
    }

    private void olvidar() {
        estable = SIN_DATO;
        cruda = SIN_DATO;
        nucleo = SIN_DATO;
        horaCruda = -1;
        candidata = SIN_DATO;
        pendiente = SIN_DATO;
        aplicarEn = -1;
    }

    // Una lectura del sensor. true si la compensación cambió y hay que encuadrar ya.
    boolean alSensor(int grados, long ahora) {
        if (suelto || !auto) return false;
        int lado = ladoDe(grados, estable);
        cruda = lado;
        nucleo = nucleoDe(grados);
        horaCruda = ahora;
        if (lado == SIN_DATO || lado == estable) { candidata = SIN_DATO; return false; }
        // Otro lado durante la gracia -10-11-2026, orden t165u-: el giro que se iba a aplicar ya no vale.
        String anulada = "";
        if (pendiente != SIN_DATO) {
            pendiente = SIN_DATO;
            aplicarEn = -1;
            anulada = "lectura en " + lado + " durante la gracia: se anula el giro a " + estable + "; ";
            ultimaDecision = anulada;
        }
        if (lado == 2 && pantalla != 2) { candidata = SIN_DATO; return false; }
        // Antes -10-11-2026, orden t164u-: la candidata se confirmaba solo aquí, con otra lectura pasados los ESTABLE_MS.
        // if (lado != candidata) { candidata = lado; desdeCandidata = ahora; return false; }
        if (lado != candidata) {
            candidata = lado;
            desdeCandidata = ahora;
            ultimaDecision = anulada + "candidata " + lado + ": se confirma en " + ESTABLE_MS + " ms si sigue";
            return false;
        }
        if (ahora - desdeCandidata < ESTABLE_MS) return false;
        // Antes -10-11-2026, orden t164u-: esto mismo, ahora en confirmar() para que el reloj también llegue aquí.
        // boolean primera = estable == SIN_DATO;
        // estable = lado;
        // candidata = SIN_DATO;
        // // La primera vez no hay giro de Android que esperar: la pantalla ya está como va a quedar.
        // return programar(ahora, primera, "sensor estable en " + lado);
        return confirmar(ahora, "sensor estable en " + lado);
    }

    // La candidata cumplió ESTABLE_MS -con otra lectura o con el reloj-: pasa a estable y sigue por programar.
    private boolean confirmar(long ahora, String motivo) {
        int lado = candidata;
        boolean primera = estable == SIN_DATO;
        estable = lado;
        candidata = SIN_DATO;
        // La primera vez no hay giro de Android que esperar: la pantalla ya está como va a quedar.
        return programar(ahora, primera, motivo);
    }

    // Llegó la hora de un cambio pendiente. true si la compensación cambió.
    // Antes -10-11-2026, orden t164u-: solo la gracia; la candidata sin otra lectura se quedaba sin confirmar.
    // boolean alReloj(long ahora) {
    //     if (suelto || pendiente == SIN_DATO || ahora < aplicarEn) return false;
    //     pendiente = SIN_DATO;
    //     aplicarEn = -1;
    //     return poner(deseada(), "gracia cumplida: Android no giró la pantalla");
    // }
    boolean alReloj(long ahora) {
        if (suelto) return false;
        boolean cambio = false;
        long confirmacion = confirmacionEn();
        // La candidata sigue vigente -ninguna lectura la cambió ni la borró- y cumplió ESTABLE_MS sin otra lectura.
        if (confirmacion >= 0 && ahora >= confirmacion) {
            cambio = confirmar(ahora, "sensor estable en " + candidata + " sin otra lectura");
        }
        if (pendiente == SIN_DATO || ahora < aplicarEn) return cambio;
        pendiente = SIN_DATO;
        aplicarEn = -1;
        return poner(deseada(), "gracia cumplida: Android no giró la pantalla") || cambio;
    }

    // La pantalla tiene otra rotación -DisplayListener u onConfigurationChanged-. true si la compensación cambió.
    boolean alPantalla(int rotacionPantalla, long ahora) {
        int r = GeometriaVentana.cuartos(rotacionPantalla);
        if (suelto || r == pantalla) return false;
        pantalla = r;
        pendiente = SIN_DATO;
        aplicarEn = -1;
        if (!auto) return poner(0, "pantalla en " + r + " sin rotación automática");
        boolean vigente = horaCruda >= 0 && ahora - horaCruda <= LECTURA_VIGENTE_MS;
        if (vigente && nucleo == r) {
            // Android giró con el teléfono: la banda acompaña a la pantalla, un solo giro.
            estable = r;
            candidata = SIN_DATO;
            return poner(0, "pantalla en " + r + " con el teléfono: un solo giro");
        }
        boolean plano = vigente && cruda == SIN_DATO;
        if (estable != SIN_DATO && (!vigente || plano || nucleo == estable)) {
            // El teléfono no se movió -sigue en el centro de su lado-, o está plano: se conserva lo que ve la persona.
            // Una lectura entre dos lados no cuenta como quieto: ahí Android puede haber girado antes que el sensor.
            return poner(deseada(), "pantalla en " + r + " sin mover el teléfono: se conserva el lado " + estable);
        }
        // El teléfono va entre dos lados: la banda sigue a la pantalla y el sensor decide cuando quede estable.
        return poner(0, "pantalla en " + r + " con el teléfono en movimiento");
    }

    // Al cerrar la ventana o desconectarse el servicio: el sensor se apaga y no se vuelve a encender.
    void soltar() {
        if (suelto) return;
        suelto = true;
        if (encendido) sensor.apagar();
        encendido = false;
        auto = false;
        olvidar();
        ultimaDecision = "sensor soltado";
    }

    private int deseada() {
        return estable == SIN_DATO ? 0 : GeometriaVentana.cuartos(estable - pantalla);
    }

    private boolean programar(long ahora, boolean inmediata, String motivo) {
        int objetivo = deseada();
        if (objetivo == aplicada) {
            pendiente = SIN_DATO;
            aplicarEn = -1;
            ultimaDecision = motivo + ": sin cambio";
            return false;
        }
        if (inmediata) return poner(objetivo, motivo + ": primera lectura");
        pendiente = objetivo;
        aplicarEn = ahora + GRACIA_MS;
        ultimaDecision = motivo + ": se espera " + GRACIA_MS + " ms por si Android gira la pantalla";
        return false;
    }

    private boolean poner(int c, String motivo) {
        int antes = aplicada;
        aplicada = GeometriaVentana.cuartos(c);
        ultimaDecision = motivo + ": compensación " + antes + " → " + aplicada;
        return aplicada != antes;
    }
}

// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

/** Copia las cuentas de src/lib/nivelVoz.ts: si se cambia una, se cambia la otra. */
final class NivelDeVoz {
    static final double DB_PISO = -60;
    static final double DB_TECHO = -20;
    static final double ATAQUE_MS = 100;
    static final double CAIDA_MS = 500;
    static final long SIN_EVENTOS_MS = 500;

    static double rmsANivel(double rms) {
        if (!(rms > 0)) return 0;
        double db = 20 * Math.log10(rms);
        return Math.min(1, Math.max(0, (db - DB_PISO) / (DB_TECHO - DB_PISO)));
    }
    static double suavizarNivel(double actual, double objetivo, double dtMs) {
        if (!(dtMs > 0)) return actual;
        double tau = objetivo > actual ? ATAQUE_MS : CAIDA_MS;
        return actual + (objetivo - actual) * (1 - Math.exp(-dtMs / tau));
    }
    static double objetivoNivel(double ultimoRms, Long ultimoEventoMs, long ahoraMs) {
        if (ultimoEventoMs == null || ahoraMs - ultimoEventoMs > SIN_EVENTOS_MS) return 0;
        return rmsANivel(ultimoRms);
    }
}

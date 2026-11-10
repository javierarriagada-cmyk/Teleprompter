// PROTOTIPO DE LA VENTANA FLOTANTE, 08-11-2026: mide si Sigo puede seguir la voz mientras otra app graba video con sonido. Esta rama no va a main ni a Play.
package com.sigoteleprompter.app;

import java.util.LinkedHashMap;
import java.util.Map;

/** Parser pequeño de JSON completo, sin Android ni org.json: también corre en la JVM. */
final class UltimasPalabras {
    private UltimasPalabras() {}

    static String de(String json, int maximo) {
        if (maximo <= 0 || json == null) return "";
        try {
            Lector p = new Lector(json);
            Object valor = p.valor(0);
            p.espacios();
            if (p.i != json.length() || !(valor instanceof Map)) return "";
            Map<?, ?> campos = (Map<?, ?>) valor;
            Object texto = campos.get("partial");
            if (!(texto instanceof String)) texto = campos.get("text");
            if (!(texto instanceof String)) return "";
            String limpio = ((String) texto).trim();
            if (limpio.isEmpty()) return "";
            String[] palabras = limpio.split("(?U)\\s+");
            StringBuilder salida = new StringBuilder();
            for (int i = Math.max(0, palabras.length - maximo); i < palabras.length; i++) {
                if (salida.length() > 0) salida.append(' ');
                salida.append(palabras[i]);
            }
            return salida.toString();
        } catch (IllegalArgumentException e) {
            // Un JSON roto no es evidencia de palabras nuevas; la sesión conserva la última útil.
            return "";
        }
    }

    private static final class Lector {
        final String s;
        int i;
        Lector(String s) { this.s = s; }
        void espacios() {
            while (i < s.length() && " \n\r\t".indexOf(s.charAt(i)) >= 0) i++;
        }
        boolean tomar(char c) {
            espacios();
            if (i < s.length() && s.charAt(i) == c) { i++; return true; }
            return false;
        }
        void exigir(char c) { if (!tomar(c)) throw new IllegalArgumentException("JSON roto"); }
        String cadena() {
            exigir('"');
            StringBuilder b = new StringBuilder();
            while (i < s.length()) {
                char c = s.charAt(i++);
                if (c == '"') return b.toString();
                if (c < 32) throw new IllegalArgumentException("Control sin escape");
                if (c == '\\') {
                    if (i == s.length()) throw new IllegalArgumentException("Escape incompleto");
                    c = s.charAt(i++);
                    switch (c) {
                        case '"': case '\\': case '/': b.append(c); break;
                        case 'b': b.append('\b'); break;
                        case 'f': b.append('\f'); break;
                        case 'n': b.append('\n'); break;
                        case 'r': b.append('\r'); break;
                        case 't': b.append('\t'); break;
                        case 'u':
                            if (i + 4 > s.length()) throw new IllegalArgumentException("Unicode incompleto");
                            String hex = s.substring(i, i + 4);
                            if (!hex.matches("[0-9a-fA-F]{4}")) throw new IllegalArgumentException("Unicode roto");
                            b.append((char) Integer.parseInt(hex, 16)); i += 4; break;
                        default: throw new IllegalArgumentException("Escape roto");
                    }
                } else b.append(c);
            }
            throw new IllegalArgumentException("Cadena incompleta");
        }
        Object valor(int profundidad) {
            if (profundidad > 64) throw new IllegalArgumentException("JSON demasiado profundo");
            espacios();
            if (i == s.length()) throw new IllegalArgumentException("Sin valor");
            char c = s.charAt(i);
            if (c == '"') return cadena();
            if (tomar('{')) {
                Map<String, Object> m = new LinkedHashMap<>();
                if (tomar('}')) return m;
                do { String k = cadena(); exigir(':'); m.put(k, valor(profundidad + 1)); } while (tomar(','));
                exigir('}'); return m;
            }
            if (tomar('[')) {
                if (!tomar(']')) {
                    do { valor(profundidad + 1); } while (tomar(','));
                    exigir(']');
                }
                return null;
            }
            int desde = i;
            while (i < s.length() && ",]} \n\r\t".indexOf(s.charAt(i)) < 0) i++;
            String literal = s.substring(desde, i);
            if (!literal.equals("true") && !literal.equals("false") && !literal.equals("null")
                && !literal.matches("-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+-]?[0-9]+)?")) {
                throw new IllegalArgumentException("Literal roto");
            }
            return null;
        }
    }
}

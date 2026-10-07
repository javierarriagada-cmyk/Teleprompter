package com.sigoteleprompter.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

// LA COPIA VIEJA DEL ESPAÑOL -tarea 104, PASO 2-. Se borra solo getExternalFilesDir(null)/model-es, una
// vez, solo en la versión de Play -el español no viene en assets- y solo cuando el español ya abrió
// desde su paquete. Lo demás queda donde estaba. Java puro: CopiaViejaDelModelo.
public class CopiaViejaDelModeloTest {
    @Rule
    public TemporaryFolder carpeta = new TemporaryFolder();

    private static File archivo(File base, String ruta) throws IOException {
        File f = new File(base, ruta);
        f.getParentFile().mkdirs();
        try (FileOutputStream s = new FileOutputStream(f)) {
            s.write(1);
        }
        return f;
    }

    @Test
    public void borraSoloLaCopiaDelEspanolUnaVezYSoloEnPlay() throws IOException {
        File base = carpeta.newFolder("files");
        archivo(base, "model-es/model-es/am/final.mdl");
        archivo(base, "model-es/model-es/uuid");
        File ingles = archivo(base, "model-en/model-en/am/final.mdl");
        File video = archivo(base, "Movies/CameraPreview/toma.mp4");
        File grabacion = archivo(base, "grabaciones/toma-1.mp4");
        File oido = archivo(base, "oido/lectura.wav");
        File suelto = archivo(base, "otro.txt");

        // APK de prueba -el español en assets-: no se toca.
        assertFalse(CopiaViejaDelModelo.limpiar(base, "es", true));
        assertTrue(new File(base, "model-es").exists());
        // Se abrió el inglés, no el español: no se toca.
        assertFalse(CopiaViejaDelModelo.limpiar(base, "en", false));
        assertTrue(new File(base, "model-es").exists());

        // Versión de Play, español abierto desde su paquete: se borra solo esa carpeta.
        assertTrue(CopiaViejaDelModelo.limpiar(base, "es", false));
        assertFalse(new File(base, "model-es").exists());
        assertTrue(ingles.exists());
        assertTrue(video.exists());
        assertTrue(grabacion.exists());
        assertTrue(oido.exists());
        assertTrue(suelto.exists());
        assertTrue(base.exists());

        // Una vez: la segunda no encuentra nada.
        assertFalse(CopiaViejaDelModelo.limpiar(base, "es", false));
        // Sin almacenamiento externo no hace nada.
        assertFalse(CopiaViejaDelModelo.limpiar(null, "es", false));
    }
}

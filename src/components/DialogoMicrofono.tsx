import React from 'react'
import { DialogoPermiso } from './DialogoPermiso'

// DIALOGO DE PERMISO DE MICROFONO NEGADO -28-09-2026-.
// Se abre cuando la persona niega el permiso de microfono. Explica por que Sigo lo necesita y
// ofrece cerrarlo ("Ahora no") o ir a los ajustes del sistema ("Abrir ajustes").
// Los estilos viven en styles-ajustes.css -.texto-dialogo, .boton-dialogo-: el componente no
// escribe tamanos ni colores a mano -T209-.
interface DialogoMicrofonoProps {
  onCerrar: () => void
  onAbrirAjustes: () => void
}

// DESDE LA TAREA 84 -29-09-2026- ES EL DIÁLOGO DE PERMISO CON EL TIPO 'microfono': el cuerpo
// que estaba aquí vive en DialogoPermiso.tsx, sin cambios en cómo se ve ni en sus data-testid.
// Este nombre se conserva para que App y las pruebas de la tarea 80 sigan diciendo lo mismo.
export function DialogoMicrofono({ onCerrar, onAbrirAjustes }: DialogoMicrofonoProps) {
  return <DialogoPermiso tipo="microfono" onCerrar={onCerrar} onAbrirAjustes={onAbrirAjustes} />
}

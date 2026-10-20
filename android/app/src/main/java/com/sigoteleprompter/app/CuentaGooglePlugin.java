package com.sigoteleprompter.app;

import android.os.CancellationSignal;

import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/**
 * ENTRAR CON GOOGLE -orden A «Entrar con Google», 20-10-2026-.
 *
 * Credential Manager con el botón «Continuar con Google» -GetSignInWithGoogleOption-, que es la forma
 * que recomienda Google hoy: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
 * Este plugin SOLO consigue el token de Google: quien abre la sesión es Firebase Authentication, del
 * lado web -src/lib/cuenta.ts, signInWithCredential-. Por eso no hay SDK nativo de Firebase ni
 * google-services.json.
 *
 * El ID de cliente web -serverClientId- llega como parámetro desde src/lib/firebaseConfig.ts: así vive
 * en un solo lugar y aquí no se escribe ningún valor de la consola.
 *
 * Nunca rechaza la llamada: contesta siempre con un objeto, para que src/lib/cuenta.ts decida el texto.
 *   { idToken, correo, nombre }   si entró
 *   { cancelado: true }           si la persona cerró la hoja: no es un error y no se muestra nada
 *   { error: "sinCuenta" }        si el teléfono no tiene ninguna cuenta de Google
 *   { error: "otro", detalle }    cualquier otra cosa
 */
@CapacitorPlugin(name = "CuentaGoogle")
public class CuentaGooglePlugin extends Plugin {

    @PluginMethod
    public void entrar(PluginCall call) {
        String idCliente = call.getString("idClienteWeb", "");
        if (idCliente == null || idCliente.isEmpty()) {
            responderError(call, "otro", "Falta el ID de cliente web");
            return;
        }
        GetSignInWithGoogleOption opcion = new GetSignInWithGoogleOption.Builder(idCliente).build();
        GetCredentialRequest pedido = new GetCredentialRequest.Builder().addCredentialOption(opcion).build();
        // Con la actividad y no con la aplicación: la hoja de Google es una pantalla del sistema y
        // necesita una actividad para abrirse -la guía oficial lo pide así-.
        CredentialManager.create(getContext()).getCredentialAsync(
            getActivity(),
            pedido,
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override
                public void onResult(GetCredentialResponse respuesta) {
                    Credential credencial = respuesta.getCredential();
                    if (!(credencial instanceof CustomCredential)
                        || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credencial.getType())) {
                        responderError(call, "otro", "Credencial inesperada: " + credencial.getType());
                        return;
                    }
                    try {
                        GoogleIdTokenCredential google = GoogleIdTokenCredential.createFrom(credencial.getData());
                        JSObject r = new JSObject();
                        r.put("idToken", google.getIdToken());
                        // getId() es el correo de la cuenta elegida.
                        r.put("correo", google.getId());
                        r.put("nombre", google.getDisplayName());
                        call.resolve(r);
                    } catch (Exception e) {
                        // GoogleIdTokenParsingException: la guía dice que suele ser una googleid vieja.
                        responderError(call, "otro", String.valueOf(e.getMessage()));
                    }
                }

                @Override
                public void onError(GetCredentialException e) {
                    if (e instanceof GetCredentialCancellationException) {
                        JSObject r = new JSObject();
                        r.put("cancelado", true);
                        call.resolve(r);
                    } else if (e instanceof NoCredentialException) {
                        // Sin ninguna cuenta de Google en el teléfono no hay nada que elegir.
                        responderError(call, "sinCuenta", null);
                    } else {
                        responderError(call, "otro", e.getType() + ": " + e.getMessage());
                    }
                }
            }
        );
    }

    /**
     * Cierra la sesión también para Credential Manager -clearCredentialState-: la guía oficial lo pide,
     * para que la próxima vez se ofrezcan todas las cuentas y no solo la última. No borra los permisos
     * que la persona ya dio a Sigo.
     */
    @PluginMethod
    public void salir(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(
            new ClearCredentialStateRequest(),
            new CancellationSignal(),
            ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override
                public void onResult(Void nada) {
                    call.resolve();
                }

                @Override
                public void onError(ClearCredentialException e) {
                    // Firebase ya cerró la sesión en la web: esto no la deja abierta. Se avisa sin romper.
                    JSObject r = new JSObject();
                    r.put("detalle", e.getType() + ": " + e.getMessage());
                    call.resolve(r);
                }
            }
        );
    }

    private static void responderError(PluginCall call, String error, String detalle) {
        JSObject r = new JSObject();
        r.put("error", error);
        if (detalle != null) r.put("detalle", detalle);
        call.resolve(r);
    }
}

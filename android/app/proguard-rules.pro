# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ==============================================================================================
# LAS REGLAS DE SIGO PARA R8 -tarea 84, parte C, 29-09-2026-.
#
# R8 encoge el código quitando lo que nadie llama y cambiando los nombres. Todo lo que se busca
# POR NOMBRE en tiempo de ejecución -reflexión, anotaciones, código nativo- lo ve como sin uso y
# lo rompería en silencio: la app compila, abre, y el plugin "no existe". Estas reglas dicen qué
# no se toca y por qué. Solo aplican al release -npm run play-: la APK de prueba es debug y R8 no
# la toca nunca. Si algo se rompe en el teléfono: npm run play -- sinR8 -app/build.gradle-.
# ==============================================================================================

# CAPACITOR ENCUENTRA LOS PLUGINS POR ANOTACIÓN Y LOS MÉTODOS POR REFLEXIÓN. El puente lee
# @CapacitorPlugin -nombre y permisos-, llama a cada @PluginMethod por su nombre desde
# JavaScript -Nativo.iniciar() busca el método "iniciar"- y vuelve a los @PermissionCallback por
# su nombre en texto -"trasPermiso"-. Capacitor trae reglas propias -consumerProguardFiles de
# @capacitor/android-, pero se escriben también aquí para no depender de que sigan viniendo.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod

# Los cuatro plugins de Sigo -ArranquePlugin, CamaraNativaPlugin, IdiomaAppPlugin,
# VoskNativoPlugin-, enteros: MainActivity los registra por clase y JavaScript los llama por
# nombre. Con sus clases de adentro -Oido, el lazo del micrófono- y PaqueteDeVoz.
-keep class com.sigoteleprompter.app.** { *; }

# Los de las dependencias: capgo camera-preview, @capacitor/app, clipboard y haptics. Capacitor
# los encuentra por el nombre de clase escrito en capacitor.plugins.json -cap sync-.
-keep class app.capgo.capacitor.camera.preview.** { *; }
-keep class com.capacitorjs.plugins.app.** { *; }
-keep class com.capacitorjs.plugins.clipboard.** { *; }
-keep class com.capacitorjs.plugins.haptics.** { *; }

# VOSK Y JNA. Vosk llama a su biblioteca nativa -libvosk.so- a través de JNA, y JNA busca las
# funciones y las clases POR NOMBRE: si R8 renombra org.vosk.LibVosk o una clase de JNA, el modelo
# no carga y el reconocedor no parte. JNA además menciona clases de escritorio -java.awt- que en
# Android no existen: se avisa a R8 que no las busque.
-keep class org.vosk.** { *; }
-keep class com.sun.jna.** { *; }
-keep class * implements com.sun.jna.** { *; }
-dontwarn java.awt.**
-dontwarn com.sun.jna.**

# MEDIA3 Y CAMERAX: traen sus propias reglas de consumidor. No se agrega nada hasta que algo falle
# -encargo, C2-: una regla de más solo engorda el paquete y esconde lo que de verdad hace falta.

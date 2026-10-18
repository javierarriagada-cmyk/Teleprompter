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

# ----------------------------------------------------------------------------------------------
# EL NÚCLEO DE CAPACITOR, ENTERO -tarea 85, 29-09-2026-. Javier lo vio en su moto g86 con la
# versión de Play: la app se caía al apretar Grabar -NullPointerException en
# Plugin.getPermissionStates, llamado desde CameraPreview.start-. Las reglas de arriba protegen los
# plugins, no el puente que los lee. R8, en su modo completo -el de AGP 8-, dio por hecho que
# nadie crea nunca un objeto del tipo de la anotación @CapacitorPlugin: es una interfaz que solo
# fabrica la máquina virtual al leer la anotación por reflexión, y R8 no ve esa fábrica. Con eso
# concluyó que PluginHandle.pluginAnnotation vale siempre null, borró el campo -usage.txt de ese
# build- y dejó Plugin.getPermissionStates reducido a "throw null" -dexdump del AAB-. Todo plugin
# que pregunta por sus permisos se caía ahí: la cámara al empezar y, en ese mismo AAB, también
# VoskNativoPlugin.escuchar, que pregunta por el micrófono.
#
# Se conserva com.getcapacitor.** completo, sin encoger ni renombrar. Buscar una por una las
# clases que el puente lee por reflexión -PluginHandle, Bridge, PluginMethodHandle, los
# callbacks, el MessageHandler del WebView- es justo el juego que ya falló una vez. Es la
# biblioteca que hace funcionar la app entera, y pesa poco -unos cientos de KB-.
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

# LAS ANOTACIONES DE CAPACITOR, COMO TIPOS. -keepattributes deja la anotación escrita en la clase,
# pero no impide que R8 trate a su tipo como "nunca creado" y pliegue a null todo lo que lo lee:
# eso fue exactamente la caída. Estas reglas conservan los tipos @interface -CapacitorPlugin,
# Permission, PermissionCallback, ActivityCallback, y PluginMethod y NativePlugin, que viven en
# com.getcapacitor- con todos sus métodos: permissions(), alias(), strings(), name().
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

# Y LAS ANOTACIONES MISMAS, CON TODO LO QUE CAPACITOR LEE DE ELLAS. RuntimeVisibleAnnotations son
# las de la clase y de los métodos -@CapacitorPlugin, @PluginMethod, @PermissionCallback-;
# RuntimeVisibleParameterAnnotations las de los parámetros; AnnotationDefault los valores por
# omisión -name() = "" y permissions() = {} cuando el plugin no los escribe, como Arranque-.
# Signature, InnerClasses y EnclosingMethod dejan que la reflexión resuelva tipos genéricos y
# clases internas. *Annotation* ya estaba arriba: se repite aquí para que esta regla se lea sola.
-keepattributes *Annotation*, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations, AnnotationDefault, Signature, InnerClasses, EnclosingMethod

# Cualquier clase con @CapacitorPlugin, entera y con su nombre, aunque no extienda Plugin
# directamente o venga de una dependencia que no esté en la lista de abajo. PluginHandle le lee
# la anotación y le busca los métodos por nombre -"trasPermiso", "handleCameraPermissionResult"-:
# un método renombrado o quitado es un plugin que no responde, en silencio.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# LO DEMÁS QUE SE REVISÓ CON EL MISMO CRITERIO -tarea 85-, en el mapping, usage.txt y el dexdump
# del AAB: nada más necesitó regla nueva.
#   - media3-transformer y media3-effect -subtítulos quemados-: no usan reflexión, y sus shaders
#     van en assets/, que R8 y shrinkResources no tocan.
#   - CameraX, media3, WorkManager, Room, Play Services y webkit traen sus propias reglas.
#   - Cordova: config.xml no declara plugins; CoreAndroid y AllowListPlugin quedan con su nombre
#     por las reglas que trae Capacitor.
#   - Galería y compartir van por MediaStore e Intent, sin reflexión. Los métodos nativos -JNI- los
#     cuida proguard-android-optimize.txt; Vosk y JNA, las reglas de más abajo.
#   - Queda un solo "throw null" en todo com.getcapacitor: Bridge$Builder.create, en el camino de
#     BridgeFragment, que Sigo no usa -MainActivity es una BridgeActivity-.
# npm run play revisa esto en cada AAB -scripts/revisarR8.mjs-.

# Los cuatro plugins de Sigo -ArranquePlugin, CamaraNativaPlugin, IdiomaAppPlugin,
# VoskNativoPlugin-, enteros: MainActivity los registra por clase y JavaScript los llama por
# nombre. Con sus clases de adentro -Oido, el lazo del micrófono- y PaqueteDeVoz.
# -tarea 88, 04-10-2026- Y el quinto, GestosPlugin: la misma regla lo cubre.
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

# MEDIAPIPE -tarea 88, 04-10-2026, el control por gestos, GestosPlugin.java-. Los .aar de MediaPipe
# Tasks 1.0.0 NO traen reglas de consumidor -no hay proguard.txt en tasks-core ni en tasks-vision-.
# Su biblioteca nativa -libmediapipe_tasks_jni.so- llama de vuelta a clases de Java POR NOMBRE desde
# JNI -los paquetes, los resultados y las opciones de cada tarea- y arma las opciones con protobuf, que
# lee sus campos por reflexión: si R8 renombra o quita algo de eso, el reconocedor no arranca y la
# fila dice "No disponible en este teléfono." en la versión de Play aunque en la de prueba funcione.
# Es lo que pasó con Capacitor en la tarea 85: se conserva entero, sin buscar clase por clase.
-keep class com.google.mediapipe.** { *; }
-keep interface com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**
# Protobuf liviano, el que usa MediaPipe para sus opciones y resultados: lee los campos por nombre.
-keep class * extends com.google.protobuf.GeneratedMessageLite { *; }
-dontwarn com.google.protobuf.**
# FLOGGER, EL REGISTRO DE GOOGLE QUE MEDIAPIPE TRAE ADENTRO -18-10-2026-. La 0.9.1 de Play salió con
# los gestos rotos -«gestos reconocedor no arranca: ExceptionInInitializerError»- aunque MediaPipe
# estaba conservado entero. Las clases de MediaPipe -Graph, AssetCache, PacketGetter...- arman su
# registro al cargarse con FluentLogger, y Flogger busca su plataforma POR NOMBRE: el texto
# "com.google.common.flogger.backend.system.DefaultPlatform" va tal cual en el paquete -classes.dex del
# AAB-, pero R8 le cambió el nombre a esa clase, a v7.b -mapping.txt-. Sin plataforma, Flogger falla al
# cargarse, y con él la primera clase de MediaPipe que lo usa. Se conserva entero, como MediaPipe y
# Capacitor: es chico, y buscar clase por clase es lo que ya falló.
-keep class com.google.common.flogger.** { *; }
-dontwarn com.google.common.flogger.**
# Lo que MediaPipe trae y en Android no siempre está: anotaciones de compilación y AutoValue.
-dontwarn com.google.auto.value.**
-dontwarn javax.annotation.**
-dontwarn com.google.errorprone.annotations.**

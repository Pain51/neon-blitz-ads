# Guia para Generar APK de Neon Blitz

## Requisitos Previos

1. **Android Studio** instalado en tu computadora
   - Descarga: https://developer.android.com/studio

2. **Java Development Kit (JDK) 17+**
   - Android Studio lo incluye automaticamente

## Pasos para Generar el APK

### 1. Descargar el Proyecto

Descarga el proyecto completo desde Replit:
- Click en los 3 puntos del menu
- Selecciona "Download as zip"

### 2. Abrir en Android Studio

1. Abre Android Studio
2. Selecciona "Open" o "File > Open"
3. Navega a la carpeta `android` dentro del proyecto descargado
4. Espera a que Gradle sincronice (puede tomar unos minutos la primera vez)

### 3. Generar APK de Debug (para pruebas)

1. Ve a **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Espera a que termine la compilacion
3. Click en "locate" en la notificacion, o navega a:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### 4. Generar APK de Release (para Play Store)

Para subir a la Play Store necesitas un APK firmado:

1. Ve a **Build > Generate Signed Bundle / APK**
2. Selecciona "APK" y click "Next"
3. Crea un nuevo keystore:
   - Click "Create new..."
   - Llena los campos (recuerda la contrasena!)
   - Guarda el archivo .jks en un lugar seguro
4. Selecciona "release" como Build Variant
5. Click "Finish"
6. El APK estara en: `android/app/build/outputs/apk/release/`

## Subir a Google Play Store

1. Crea una cuenta de desarrollador en Google Play Console
   - https://play.google.com/console
   - Costo unico: $25 USD

2. Crea una nueva aplicacion
3. Sube el APK firmado (o AAB)
4. Completa la informacion requerida:
   - Descripcion
   - Capturas de pantalla
   - Icono de la app
   - Clasificacion de contenido
   - Politica de privacidad

## Personalizar Icono y Splash Screen

Los iconos estan en:
```
android/app/src/main/res/
├── mipmap-hdpi/
├── mipmap-mdpi/
├── mipmap-xhdpi/
├── mipmap-xxhdpi/
└── mipmap-xxxhdpi/
```

Reemplaza los archivos `ic_launcher.png` con tu icono en cada tamano.

## Comandos Utiles

Desde la terminal en el directorio raiz del proyecto:

```bash
# Reconstruir el proyecto web
npm run build

# Sincronizar cambios web con Android
npx cap sync android

# Abrir en Android Studio
npx cap open android
```

## Solucion de Problemas

| Problema | Solucion |
|----------|----------|
| Gradle falla | Actualiza Android Studio y acepta licencias SDK |
| Pantalla blanca | Verifica que `npm run build` se completo |
| APK no instala | Desinstala version anterior o incrementa versionCode |

## Configuracion de la App

El archivo `capacitor.config.ts` contiene:
- **appId**: `com.neonblitz.arcade` (identificador unico)
- **appName**: `Neon Blitz` (nombre visible)
- **webDir**: `dist/public` (carpeta del build)

Para cambiar el appId, edita el archivo y ejecuta `npx cap sync android`.

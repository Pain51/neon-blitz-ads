# Guia para Generar APK de Neon Blitz

Hay dos metodos para generar el APK:
- **Metodo 1 (Recomendado)**: Usar GitHub Actions (automatico en la nube)
- **Metodo 2**: Usar Android Studio (requiere PC potente)

---

## METODO 1: GitHub Actions (Recomendado)

Este metodo compila el APK automaticamente en la nube. No necesitas Android Studio.

### Paso 1: Crear cuenta de GitHub

1. Ve a https://github.com
2. Crea una cuenta gratis si no tienes una
3. Inicia sesion

### Paso 2: Crear un repositorio nuevo

1. En GitHub, haz clic en el boton verde **"New"** o ve a https://github.com/new
2. Nombre del repositorio: `neon-blitz` (o el que prefieras)
3. Selecciona **"Public"** (gratis)
4. NO marques "Add a README file"
5. Haz clic en **"Create repository"**

### Paso 3: Descargar el proyecto de Replit

1. En Replit, descarga el proyecto como ZIP (clic derecho en Files > Download as zip)
2. Descomprime el archivo en tu computadora

### Paso 4: Subir el proyecto a GitHub

**Opcion A - Usando GitHub Desktop (mas facil):**
1. Descarga GitHub Desktop: https://desktop.github.com
2. Inicia sesion con tu cuenta de GitHub
3. File > Add Local Repository
4. Selecciona la carpeta del proyecto descomprimido
5. Haz clic en "Publish repository"

**Opcion B - Usando la web de GitHub:**
1. En tu repositorio nuevo, haz clic en "uploading an existing file"
2. Arrastra TODOS los archivos del proyecto descomprimido
3. Haz clic en "Commit changes"

### Paso 5: Esperar la compilacion

1. En tu repositorio de GitHub, ve a la pestana **"Actions"**
2. Veras un workflow llamado "Build Android APK"
3. Haz clic en el para ver el progreso
4. Espera 5-10 minutos hasta que aparezca el check verde

### Paso 6: Descargar el APK

1. Cuando termine (check verde), haz clic en el workflow completado
2. Baja hasta la seccion **"Artifacts"**
3. Haz clic en **"neon-blitz-debug-apk"** para descargar
4. Descomprime el archivo descargado
5. El APK esta dentro: `app-debug.apk`

### Paso 7: Instalar en tu telefono

1. Copia el archivo `app-debug.apk` a tu telefono Android
2. Abre el archivo en tu telefono
3. Si te pide permiso para instalar desde fuentes desconocidas, acepta
4. Instala y disfruta el juego!

---

## METODO 2: Android Studio (Alternativo)

Usa este metodo solo si tienes una PC potente con Android Studio.

### Requisitos Previos

1. **Android Studio Iguana (2023.2.1) o mas reciente**
   - Descarga: https://developer.android.com/studio

2. **Java Development Kit (JDK) 17**
   - Android Studio lo incluye automaticamente

### Pasos para Generar el APK

### 1. Descargar el Proyecto COMPLETO

**IMPORTANTE: Debes descargar TODO el proyecto, no solo la carpeta android.**

Desde Replit en tu navegador web (PC):
1. Abre tu proyecto en replit.com
2. En la barra lateral izquierda, busca el panel de "Files" (archivos)
3. Haz clic derecho en el espacio vacio o en la carpeta raiz
4. Selecciona "Download as zip"
5. Espera que se descargue el archivo .zip completo

### 2. Descomprimir y Abrir en Android Studio

1. Descomprime el archivo .zip en una carpeta de tu computadora
2. Abre Android Studio
3. Selecciona "Open" o "File > Open"
4. **Navega a la carpeta `android` DENTRO del proyecto descomprimido**
   - Ejemplo: `C:\Users\TuUsuario\Downloads\Topdown-Shooter-main\android`
5. Espera a que Gradle sincronice (puede tomar 5-10 minutos la primera vez)
6. Si te pide actualizar Gradle o plugins, acepta las actualizaciones

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

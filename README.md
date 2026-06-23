# TrackOps Mobile

Aplicación móvil de **Simon Movilidad** para registrar rutas de conducción en tiempo real, con soporte offline, sincronización con backend y telemetría simulada del vehículo.

Construida con **Expo** y **React Native**, funciona en **iOS**, **Android** y **Web**.

## Características

- **Seguimiento GPS en vivo** con mapa interactivo y trazado de ruta
- **Sesiones de conducción** con temporizador y contador de puntos registrados
- **Ubicación en segundo plano** (iOS y Android) para continuar grabando con la app minimizada
- **Modo offline-first**: las coordenadas se guardan localmente y se sincronizan al recuperar conexión
- **Telemetría simulada**: nivel de combustible, RPM del motor y kilometraje acumulado
- **Historial de sesiones** con estado de sincronización
- **Ajustes** configurables: nombre del conductor/vehículo, estado de red y permisos

## Requisitos previos

- [Node.js](https://nodejs.org/) 18 o superior
- [npm](https://www.npmjs.com/) o [pnpm](https://pnpm.io/)
- Para desarrollo nativo:
  - **iOS**: macOS con Xcode
  - **Android**: Android Studio con emulador o dispositivo físico
- [Expo Go](https://expo.dev/go) (opcional, para pruebas rápidas en dispositivo)

## Instalación

```bash
# Clonar el repositorio y entrar al directorio mobile
cd mobile

# Instalar dependencias
npm install
```

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto (opcional):

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:3002
```

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | URL base del backend para enviar telemetría | `http://localhost:3002` |

Los datos se envían al endpoint `POST /telemetry/ingest` con el payload:

```json
{
  "vehicleId": "nombre-del-conductor",
  "latitude": 0.0,
  "longitude": 0.0,
  "speed": 0,
  "engineRpm": 0,
  "fuelLevel": 100,
  "timestamp": 1710000000000
}
```

## Ejecución

```bash
# Iniciar el servidor de desarrollo de Expo
npm start

# Abrir en plataforma específica
npm run ios       # Simulador o dispositivo iOS
npm run android   # Emulador o dispositivo Android
npm run web       # Navegador web
```

Escanea el código QR con **Expo Go** (Android/iOS) o presiona la tecla correspondiente en la terminal para abrir el emulador.

## Estructura del proyecto

```
mobile/
├── app/                    # Rutas con Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx       # Pantalla principal de rastreo
│   │   ├── history.tsx     # Historial de sesiones
│   │   └── settings.tsx    # Ajustes y configuración
│   └── _layout.tsx         # Layout raíz y providers
├── components/             # Componentes reutilizables
│   ├── MapSection.*.tsx    # Mapa (implementación nativa y web)
│   ├── SessionCard.tsx
│   └── StatusBadge.tsx
├── contexts/
│   ├── TrackingContext.tsx # Estado global de sesiones y GPS
│   └── NetworkContext.tsx    # Estado de conectividad
├── tasks/
│   └── locationTask.native.ts  # Tarea de ubicación en segundo plano
├── hooks/                  # Hooks personalizados
├── constants/              # Colores, claves de almacenamiento, etc.
├── server/                 # Servidor estático para despliegue web
└── scripts/                # Scripts de build
```

## Pantallas

| Pestaña | Descripción |
|---|---|
| **Rastreo** | Mapa en vivo, inicio/fin de sesión, coordenadas actuales, telemetría y estado de sincronización |
| **Historial** | Listado de sesiones pasadas con puntos registrados y estado de sync |
| **Ajustes** | Nombre del conductor, permisos de ubicación, sincronización manual |

## Permisos

La app solicita los siguientes permisos en dispositivos nativos:

- **Ubicación en primer plano**: registrar la ruta mientras la app está abierta
- **Ubicación en segundo plano** (iOS/Android): continuar el registro con la app minimizada
- **Servicio en primer plano** (Android): notificación persistente durante el rastreo en background

## Stack tecnológico

- [Expo SDK 54](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/) 0.81
- [Expo Router](https://docs.expo.dev/router/introduction/) — navegación basada en archivos
- [TypeScript](https://www.typescriptlang.org/)
- [react-native-maps](https://github.com/react-native-maps/react-native-maps) — mapas nativos
- [expo-location](https://docs.expo.dev/versions/latest/sdk/location/) + [expo-task-manager](https://docs.expo.dev/versions/latest/sdk/task-manager/) — GPS y tareas en background
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) — persistencia local
- [@react-native-community/netinfo](https://github.com/react-native-netinfo/react-native-netinfo) — detección de conectividad
- [@tanstack/react-query](https://tanstack.com/query) — gestión de estado asíncrono

## Almacenamiento local

Los datos se persisten en AsyncStorage con las siguientes claves:

| Clave | Contenido |
|---|---|
| `driver_sessions` | Sesiones de conducción |
| `driver_coordinates` | Coordenadas GPS registradas |
| `driver_active_session` | Sesión activa en curso |
| `driver_settings` | Configuración del conductor |
| `driver_last_sync` | Timestamp de última sincronización |
| `driver_last_bg_coord` | Última coordenada registrada en background |

## Build y despliegue

Para generar builds de producción, consulta la [documentación oficial de Expo](https://docs.expo.dev/build/introduction/):

```bash
# Build para iOS/Android con EAS
npx eas build --platform ios
npx eas build --platform android

# Exportar para web
npx expo export --platform web
```

El script `scripts/build.js` incluye lógica adicional para despliegues en entornos Replit.

## Licencia

Proyecto privado — Simon Movilidad.

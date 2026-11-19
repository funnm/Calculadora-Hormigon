# Calculadora de Hormigón — Aplicación Android (Engineering Suite Pro)

Carpeta independiente con el proyecto nativo Android de **Calculadora de Hormigón** (parte de **Engineering Suite Pro** junto a **Análisis Estructural**).

## Características Android
- **100% Offline**: Toda la aplicación, estilos, iconos, Math.js y Plotly Pro están empaquetados dentro del APK y servidos en origen seguro local (`https://appassets.androidplatform.net/`).
- **Compatibilidad amplia (Android 7.0 a Android 15+)**: Transpilación automática a `chrome70` + polyfills (`globalThis`, `queueMicrotask`, `Object.hasOwn`, `Array.prototype.at`, `CanvasRenderingContext2D.roundRect`, fallbacks CSS) para funcionar incluso en tablets Android 8.0 / WebView legado.
- **Exportación nativa de archivos**: Los gráficos **PNG** y **SVG**, proyectos **JSON**, tablas **CSV** e informes académicos **.TXT** se guardan automáticamente en `Descargas/CalculadoraHormigon/` con diálogo nativo para **Abrir** o **Compartir**.
- **Impresión y PDF nativo**: Integración con `PrintManager` de Android para imprimir o guardar directamente en PDF desde cualquier pantalla.
- **Importación nativa**: Selector de archivos de Android (`ACTION_OPEN_DOCUMENT`) para abrir proyectos `.json`.
- **Integración nativa**: Sincronización de barra de estado y navegación con el tema Claro/Oscuro, navegación inferior táctil y botón Atrás inteligente (cierra modales/menú/regresa al graficador y solicita doble toque para salir).

## Comandos

Desde la carpeta `android/`:

```bash
# 1. Sincronizar cambios desde la app web (compila ../dist si hace falta)
npm run sync:build-web

# 2. Compilar APK firmado de depuración
npm run build

# 3. Instalar y abrir automáticamente en la tablet/teléfono conectado por ADB
npm run install:device

# Todo en un solo paso (web + sync + APK + instalar + abrir en dispositivo)
npm run dev:tablet
```

El APK generado queda en:
`android/build/outputs/apk/debug/calculadora-hormigon-v<version>-debug.apk`

# Calculadora de Hormigón v2.0.0 — Engineering Suite Pro

**Autor:** Paul R  
**Suite:** Engineering Suite Pro  
**Ecosistema:** Calculadora de Hormigón · Análisis Estructural · Calculadora Gráfica · Sistemas Hidráulicos  
**Repositorio:** https://github.com/funnm/Calculadora-Hormigon

**Calculadora de Hormigón** es una aplicación web (PWA 100% offline) y aplicación nativa para **Android** diseñada con el sistema visual **Apple Monochrome Pro** de **Engineering Suite Pro**.

## Características Principales

- **Dosificación Rápida en Obra (Holcim H-140 a H-350)**:
  - Cálculo de fundas de cemento (Holcim Fuerte GU 50 kg, 42.5 kg, 25 kg o personalizado), baldes y m³ de arena y grava, rango de agua en litros y porcentaje de desperdicio, tomando como referencia `Dosificacion_Hormigones_Holcim_Calculadora_Volumen1.xlsx`.
  - Cubicaje de volumen por elementos estructurales (losas, columnas rectangulares/circulares, vigas, zapatas) y estimador de presupuesto en USD.
- **Diseño Técnico ACI 211.1 / ACI 318 y Laboratorio**:
  - Datos de obra, resistencia especificada `f'c` y resistencia media requerida `f'cr`.
  - Propiedades físicas de cemento, arena, agregado grueso (densidad SSS, absorción, humedad, módulo de finura, PVSC) y gestor de aditivos químicos.
  - Análisis granulométrico integral (NTE INEN 696 / ASTM C136) y optimización por curva de Fuller.
  - Balance de volúmenes absolutos (`1 m³`), corrección por humedad/absorción y tanda de prueba de laboratorio.
- **Calidad, Regresión y Reportes**:
  - Regresión de resistencia por edades (lineal, logarítmica, exponencial, potencial y polinomial) comparada con la curva ACI (`R²` y `RMSE`).
  - Control estadístico de resistencia por lotes, desviación estándar y coeficiente de variación.
  - Exportación de reporte técnico en **PDF** (`jsPDF`), hoja de cálculo **Excel (`.xls`)** y proyectos **`.JSON`**.
- **Aplicación Android Nativa (`android/`)**:
  - Empaquetado offline completo (`package="com.calculadorahormigon.app"`), exportación nativa a `Descargas/CalculadoraHormigon/` con diálogo para Abrir/Compartir, impresión PDF nativa y compatibilidad con tablets y móviles.

## Comandos Web

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Comandos Android

```bash
npm run android:apk
```

El APK generado queda en:
`android/build/outputs/apk/debug/calculadora-hormigon-v2.0.0-debug.apk`

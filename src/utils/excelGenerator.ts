import type { ConcreteDesign } from '../types';
import {
  kgCm2ToMPa,
  calculateDesignStrength,
  calculateWaterContent,
  calculateWaterCementRatio,
  calculateCementContent,
  calculateAggregateVolume,
  solveFullerProportions,
  calculateMoistureCorrection,
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateFinalWater,
  safeDivide,
  validateConcreteDesign
} from './concreteCalculations';
import { fitAllStrengthRegressions, fitStrengthRegression, getBestStrengthRegression } from './regressionCalculations';
import { calculateStrengthControl } from './strengthControl';

type SheetCell = string | number;

const escapeHtml = (value: SheetCell): string => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const renderTable = (title: string, rows: SheetCell[][]): string => `
  <h2>${escapeHtml(title)}</h2>
  <table>
    <tbody>
      ${rows.map(row => `
        <tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
`;

const downloadWorkbook = (filename: string, html: string) => {
  const workbook = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          h2 { color: #0f172a; margin-top: 24px; }
          table { border-collapse: collapse; margin-bottom: 20px; }
          td { border: 1px solid #cbd5e1; padding: 8px 10px; mso-number-format: "\\@"; }
          tr:first-child td { font-weight: 700; background: #e0f2fe; }
        </style>
      </head>
      <body>${html}</body>
    </html>
  `;

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportConcreteExcel = (design: ConcreteDesign) => {
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const tmnMm = design.designRequirements.nominalMaxSizeIn * 25.4;
  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const waterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(waterKg, acRatio);
  const regression = fitStrengthRegression(
    design.strengthRegression.testData,
    design.strengthRegression.config.selectedModel,
    design.designRequirements.workStrengthKgCm2,
    design.strengthRegression.config.predictionAges,
  );
  const regressionResults = fitAllStrengthRegressions(
    design.strengthRegression.testData,
    design.designRequirements.workStrengthKgCm2,
    design.strengthRegression.config.predictionAges,
  );
  const bestRegression = getBestStrengthRegression(regressionResults);
  const strengthControl = calculateStrengthControl(
    design.strengthControl.samples,
    design.designRequirements.workStrengthKgCm2,
    design.strengthControl.evaluationAge,
  );
  const technicalWarnings = validateConcreteDesign(design);

  const summaryData: SheetCell[][] = [
    ['REPORTE DE DISEÑO DE HORMIGÓN - CONCRETE DESIGN PRO'],
    ['DATOS DE LA OBRA'],
    ['Proyecto', design.projectInfo.projectName],
    ['Obra', design.projectInfo.workName],
    ['Responsable', design.projectInfo.responsible],
    ['Laboratorio', design.projectInfo.laboratory],
    ['Fecha', design.projectInfo.date],
    ['PARÁMETROS DE DISEÑO'],
    ["f'c especificado (kg/cm²)", design.designRequirements.workStrengthKgCm2],
    ["f'c especificado (MPa)", fcMPa.toFixed(2)],
    ["f'cr diseño (MPa)", fcrMPa.toFixed(2)],
    ['Asentamiento (mm)', design.designRequirements.slumpMm],
    ['TMN (pulgadas)', design.designRequirements.nominalMaxSizeIn],
    ['TMN (mm)', tmnMm.toFixed(1)],
    ['CÁLCULOS UNITARIOS (1 m³)'],
    ['Agua inicial estimada (kg/m³)', initialWaterKg.toFixed(1)],
    ['Reducción por aditivos (kg/m³)', waterReductionKg.toFixed(1)],
    ['Agua final de diseño (kg/m³)', waterKg.toFixed(1)],
    ['Relación A/C', acRatio.toFixed(3)],
    ['Cemento (kg/m³)', cementKg.toFixed(1)],
    ['Contenido de aire (%)', design.materials.airContent || 0],
  ];

  const materialsData: SheetCell[][] = [
    ['Material', 'Densidad SSS (kg/m³)', 'Absorción (%)', 'Humedad (%)', 'PVSC (kg/m³)', 'Módulo finura', 'Costo ($/kg)', 'Factor CO₂ (kg/kg)'],
    ['Cemento', (design.materials.cement.specificGravityGcm3 * 1000).toFixed(0), '-', '-', '-', '-', design.materials.cement.unitCost || 0, design.materials.cement.carbonFactor || 0],
    ['Arena', design.materials.sand.densitySSD, design.materials.sand.absorption, design.materials.sand.moisture, '-', design.materials.sand.finenessModulus || '-', design.materials.sand.unitCost || 0, design.materials.sand.carbonFactor || 0],
    ['Agregado grueso', design.materials.gravel.densitySSD, design.materials.gravel.absorption, design.materials.gravel.moisture, design.materials.gravel.pvsc || '-', '-', design.materials.gravel.unitCost || 0, design.materials.gravel.carbonFactor || 0],
  ];

  (design.materials.additives || []).forEach(additive => {
    materialsData.push([
      `Aditivo: ${additive.name} (${additive.additiveType || additive.type})`,
      additive.densityKgL ? `${additive.densityKgL} kg/L` : additive.density || '-',
      '-',
      '-',
      '-',
      '-',
      additive.unitCost || 0,
      additive.carbonFactor || 0
    ]);
  });

  const aggVol = calculateAggregateVolume(
    waterKg,
    cementKg,
    design.materials.cement.specificGravityGcm3,
    design.materials.airContent || 0,
    design.materials.additives || []
  );

  const proportions = solveFullerProportions(
    design.materials.aggregateBlend?.finePercent,
    design.materials.aggregateBlend?.coarsePercent
  );
  const drySandKg = aggVol * (proportions.sand / 100) * design.materials.sand.densitySSD;
  const dryGravelKg = aggVol * (proportions.gravel / 100) * design.materials.gravel.densitySSD;
  const sandCorrection = calculateMoistureCorrection(drySandKg, design.materials.sand.moisture, design.materials.sand.absorption);
  const gravelCorrection = calculateMoistureCorrection(dryGravelKg, design.materials.gravel.moisture, design.materials.gravel.absorption);
  const additivesSummary = calculateAdditivesSummary(design.materials.additives || [], cementKg);
  const correctedWaterKg = Math.max(0, waterKg - sandCorrection.contribution - gravelCorrection.contribution);

  const dosageData: SheetCell[][] = [
    ['Material', 'Masa seca (kg)', 'Masa húmeda (kg)', 'Proporción'],
    ['Cemento', cementKg.toFixed(1), cementKg.toFixed(1), '1.00'],
    ['Arena', drySandKg.toFixed(1), sandCorrection.wetMass.toFixed(1), safeDivide(drySandKg, cementKg).toFixed(2)],
    ['Agregado grueso', dryGravelKg.toFixed(1), gravelCorrection.wetMass.toFixed(1), safeDivide(dryGravelKg, cementKg).toFixed(2)],
    ...additivesSummary.rows.map(({ additive, massKgM3 }) => [
      `Aditivo (${additive.name})`,
      massKgM3.toFixed(2),
      massKgM3.toFixed(2),
      safeDivide(massKgM3, cementKg).toFixed(3)
    ] as SheetCell[]),
    ['Agua de mezclado', waterKg.toFixed(1), correctedWaterKg.toFixed(1), safeDivide(correctedWaterKg, cementKg).toFixed(2)],
  ];

  const regressionSummaryData: SheetCell[][] = [
    ['Parametro', 'Valor'],
    ['Modelo seleccionado', regression.label],
    ['Mejor modelo recomendado', bestRegression.label],
    ['Ecuacion', regression.equation],
    ['R2', regression.r2.toFixed(4)],
    ['RMSE (kg/cm2)', regression.rmse.toFixed(2)],
    ['R2 mejor modelo', bestRegression.r2.toFixed(4)],
    ['RMSE mejor modelo (kg/cm2)', bestRegression.rmse.toFixed(2)],
    ['Ensayos usados', regression.pointsUsed],
    ['Estado', regression.valid ? 'Curva ajustada correctamente' : regression.message],
  ];

  const regressionModelsData: SheetCell[][] = [
    ['Modelo', 'Ecuacion', 'R2', 'RMSE (kg/cm2)', 'Ensayos', 'Estado'],
    ...regressionResults.map(modelResult => [
      modelResult.label,
      modelResult.equation,
      modelResult.r2.toFixed(4),
      modelResult.rmse.toFixed(2),
      modelResult.pointsUsed,
      modelResult.valid ? (modelResult.model === bestRegression.model ? 'Recomendado' : 'Calculado') : modelResult.message,
    ] as SheetCell[]),
  ];

  const regressionPredictionData: SheetCell[][] = [
    ['Edad (dias)', 'Regresion (kg/cm2)', 'ACI (kg/cm2)', 'Diferencia', '% objetivo'],
    ...regression.predictions.map(prediction => [
      prediction.ageDays,
      prediction.adjustedKgCm2.toFixed(1),
      prediction.aciKgCm2.toFixed(1),
      prediction.differenceKgCm2.toFixed(1),
      `${prediction.targetPercent.toFixed(1)}%`,
    ] as SheetCell[]),
  ];

  const strengthControlSummaryData: SheetCell[][] = [
    ['Parametro', 'Valor'],
    ['Estado global', strengthControl.status.toUpperCase()],
    ['Edad de evaluacion', `${strengthControl.evaluationAge} dias`],
    ['Ensayos evaluados', `${strengthControl.sampleCount} de ${strengthControl.totalSamples}`],
    ['Lotes', strengthControl.lotCount],
    ['Promedio (kg/cm2)', strengthControl.averageKgCm2.toFixed(1)],
    ['Desviacion estandar (kg/cm2)', strengthControl.standardDeviationKgCm2.toFixed(2)],
    ['Coeficiente de variacion (%)', strengthControl.coefficientVariationPercent.toFixed(2)],
    ['Resistencia minima (kg/cm2)', strengthControl.minimumKgCm2.toFixed(1)],
    ["f'c objetivo (kg/cm2)", strengthControl.targetKgCm2.toFixed(1)],
  ];

  const strengthControlLotsData: SheetCell[][] = [
    ['Lote', 'Ensayos', 'Promedio', 'Desv. estandar', 'CV', 'Minima', 'Cumplimiento', 'Estado'],
    ...(strengthControl.lots.length
      ? strengthControl.lots.map(lot => [
        lot.lot,
        lot.sampleCount,
        lot.averageKgCm2.toFixed(1),
        lot.standardDeviationKgCm2.toFixed(2),
        `${lot.coefficientVariationPercent.toFixed(2)}%`,
        lot.minimumKgCm2.toFixed(1),
        `${lot.compliancePercent.toFixed(1)}%`,
        lot.status.toUpperCase(),
      ] as SheetCell[])
      : [['Sin lotes', 0, '-', '-', '-', '-', '-', 'OBSERVED']]),
  ];

  const strengthControlChartData: SheetCell[][] = [
    ['Ensayo', 'Lote', 'Resistencia', "f'c", 'Limite 90%', 'Limite 85%', 'Promedio', 'LCS', 'LCI'],
    ...(strengthControl.chartData.length
      ? strengthControl.chartData.map(point => [
        point.sequence,
        point.lot,
        point.strengthKgCm2.toFixed(1),
        point.targetKgCm2.toFixed(1),
        point.observationLimitKgCm2.toFixed(1),
        point.rejectionLimitKgCm2.toFixed(1),
        point.meanKgCm2.toFixed(1),
        point.upperControlLimitKgCm2.toFixed(1),
        point.lowerControlLimitKgCm2.toFixed(1),
      ] as SheetCell[])
      : [['Sin datos', '-', '-', '-', '-', '-', '-', '-', '-']]),
  ];

  const warningData: SheetCell[][] = [
    ['Severidad', 'Modulo', 'Advertencia', 'Recomendacion'],
    ...(technicalWarnings.length > 0 || regression.warnings.length > 0 || strengthControl.warnings.length > 0
      ? [
        ...technicalWarnings.map(warning => [
        warning.severity.toUpperCase(),
        warning.module,
        `${warning.title}. ${warning.message}`,
        warning.recommendation,
        ] as SheetCell[]),
        ...regression.warnings.map(warning => [
          'WARNING',
          'Regresion',
          warning,
          'Agregar mas edades de ensayo o revisar dispersion de laboratorio.',
        ] as SheetCell[]),
        ...strengthControl.warnings.map(warning => [
          'WARNING',
          'Control estadistico',
          warning,
          'Tomar muestras adicionales, revisar curado y separar lotes atipicos.',
        ] as SheetCell[]),
      ]
      : [['OK', 'Revision general', 'No hay advertencias tecnicas activas.', 'Mantener control de laboratorio y curado.']]),
  ];

  const workbookHtml = [
    renderTable('Resumen Diseño', summaryData),
    renderTable('Materiales', materialsData),
    renderTable('Dosificación', dosageData),
    renderTable('Regresion de Resistencia', regressionSummaryData),
    renderTable('Comparacion de Modelos de Regresion', regressionModelsData),
    renderTable('Predicciones de Resistencia', regressionPredictionData),
    renderTable('Control Estadistico de Resistencia', strengthControlSummaryData),
    renderTable('Control por Lote', strengthControlLotsData),
    renderTable('Datos para Grafico de Control', strengthControlChartData),
    renderTable('Advertencias Tecnicas', warningData),
  ].join('');

  downloadWorkbook(`Concrete_Design_${design.projectInfo.projectName.replace(/\s+/g, '_')}.xls`, workbookHtml);
};

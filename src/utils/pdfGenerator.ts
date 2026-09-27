import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConcreteDesign } from '../types';
import { 
  kgCm2ToMPa, 
  calculateDesignStrength, 
  calculateWaterContent, 
  calculateWaterCementRatio, 
  calculateCementContent,
  calculateMoistureCorrection,
  calculateAggregateVolume,
  solveFullerProportions,
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateFinalWater,
  safeDivide,
  validateConcreteDesign
} from './concreteCalculations';
import { fitAllStrengthRegressions, fitStrengthRegression, getBestStrengthRegression, type StrengthRegressionResult } from './regressionCalculations';
import { calculateStrengthControl, type StrengthControlResult } from './strengthControl';

type AutoTableDoc = jsPDF & { lastAutoTable?: { finalY: number } };
type TableCell = string | number;

const lastTableY = (doc: jsPDF, fallback: number): number => (doc as AutoTableDoc).lastAutoTable?.finalY ?? fallback;
const appVersion = import.meta.env.VITE_APP_VERSION || 'dev';

const drawRegressionChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  selectedRegression: StrengthRegressionResult,
  bestRegression: StrengthRegressionResult,
  target28KgCm2: number,
) => {
  const chartRows = selectedRegression.chartData.filter((point) => point.ageDays % 3 === 0 || [1, 7, 14, 28, 56, 90].includes(point.ageDays));
  const bestRows = bestRegression.chartData.filter((point) => point.ageDays % 3 === 0 || [1, 7, 14, 28, 56, 90].includes(point.ageDays));
  const maxAge = Math.max(90, ...chartRows.map(point => point.ageDays), ...bestRows.map(point => point.ageDays));
  const maxStrength = Math.max(
    target28KgCm2,
    ...chartRows.flatMap(point => [point.aciKgCm2, point.adjustedKgCm2 || 0, point.measuredKgCm2 || 0]),
    ...bestRows.map(point => point.adjustedKgCm2 || 0),
  ) * 1.12 || 1;

  const plotX = (ageDays: number) => x + (ageDays / maxAge) * width;
  const plotY = (strength: number) => y + height - (Math.max(0, strength) / maxStrength) * height;

  const drawSeries = (rows: typeof chartRows, valueKey: 'aciKgCm2' | 'adjustedKgCm2', color: [number, number, number], dashed = false) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.8);
    doc.setLineDashPattern(dashed ? [2, 2] : [], 0);

    let previous: { x: number; y: number } | null = null;
    rows.forEach((point) => {
      const value = point[valueKey];
      if (value === null || value === undefined) {
        previous = null;
        return;
      }

      const current = { x: plotX(point.ageDays), y: plotY(value) };
      if (previous) doc.line(previous.x, previous.y, current.x, current.y);
      previous = current;
    });
    doc.setLineDashPattern([], 0);
  };

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(x, y, width, height);
  doc.line(x, y + height, x + width, y + height);
  doc.line(x, y, x, y + height);

  [7, 28, 56, 90].forEach((age) => {
    const xPosition = plotX(age);
    doc.setDrawColor(226, 232, 240);
    doc.line(xPosition, y, xPosition, y + height);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(`${age}d`, xPosition, y + height + 4, { align: 'center' });
  });

  const targetY = plotY(target28KgCm2);
  doc.setDrawColor(16, 185, 129);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(x, targetY, x + width, targetY);
  doc.setLineDashPattern([], 0);

  drawSeries(chartRows, 'aciKgCm2', [100, 116, 139], true);
  drawSeries(chartRows, 'adjustedKgCm2', [15, 23, 42]);
  if (bestRegression.model !== selectedRegression.model) {
    drawSeries(bestRows, 'adjustedKgCm2', [14, 165, 233], false);
  }

  selectedRegression.chartData
    .filter(point => point.measuredKgCm2 !== null)
    .forEach((point) => {
      doc.setFillColor(14, 165, 233);
      doc.circle(plotX(point.ageDays), plotY(point.measuredKgCm2 || 0), 1.3, 'F');
    });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text('Grafica: ACI, regresion seleccionada, mejor modelo y ensayos reales', x, y - 3);
};

const drawStrengthControlChart = (
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  control: StrengthControlResult,
) => {
  const rows = control.chartData;
  if (!rows.length) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text('Sin ensayos validos para graficar control estadistico.', x, y + 10);
    return;
  }

  const maxStrength = Math.max(
    control.targetKgCm2,
    control.averageKgCm2,
    ...rows.flatMap(point => [
      point.strengthKgCm2,
      point.upperControlLimitKgCm2,
      point.targetKgCm2,
    ]),
  ) * 1.12 || 1;
  const sequenceDenominator = Math.max(1, rows.length - 1);
  const plotX = (sequence: number) => x + ((sequence - 1) / sequenceDenominator) * width;
  const plotY = (strength: number) => y + height - (Math.max(0, strength) / maxStrength) * height;

  const drawHorizontal = (value: number, color: [number, number, number], label: string) => {
    const lineY = plotY(value);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.6);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(x, lineY, x + width, lineY);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(...color);
    doc.setFontSize(7);
    doc.text(label, x + width + 2, lineY + 1.5);
  };

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(x, y, width, height);
  drawHorizontal(control.targetKgCm2, [16, 185, 129], "f'c");
  drawHorizontal(control.targetKgCm2 * 0.9, [245, 158, 11], '90%');
  drawHorizontal(control.targetKgCm2 * 0.85, [239, 68, 68], '85%');
  drawHorizontal(control.averageKgCm2, [37, 99, 235], 'Prom.');

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.9);
  rows.forEach((point, index) => {
    if (index > 0) {
      const previous = rows[index - 1];
      doc.line(plotX(previous.sequence), plotY(previous.strengthKgCm2), plotX(point.sequence), plotY(point.strengthKgCm2));
    }
    doc.setFillColor(15, 23, 42);
    doc.circle(plotX(point.sequence), plotY(point.strengthKgCm2), 1.4, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(String(point.sequence), plotX(point.sequence), y + height + 4, { align: 'center' });
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text('Grafica de control: ensayos, promedio, f\'c y limites 90% / 85%', x, y - 3);
};

export const generateConcretePDF = (design: ConcreteDesign) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME TÉCNICO DE DISEÑO', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text('CONCRETE DESIGN PRO - INGENIERÍA DE MEZCLAS', pageWidth / 2, 30, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Autor: Paul R | Version ${appVersion}`, pageWidth / 2, 36, { align: 'center' });

  // Project Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text('1. IDENTIFICACIÓN DEL PROYECTO', 14, 55);
  doc.line(14, 57, 80, 57);

  autoTable(doc, {
    startY: 60,
    body: [
      ['Proyecto:', design.projectInfo.projectName, 'Fecha:', design.projectInfo.date],
      ['Responsable:', design.projectInfo.responsible, 'Grupo:', design.projectInfo.group],
      ['f\'c Especificado:', `${design.designRequirements.workStrengthKgCm2} kg/cm²`, 'TMN:', `${design.designRequirements.nominalMaxSizeIn}"`],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
  });

  // Calculations
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

  doc.setFontSize(14);
  doc.text('2. PARÁMETROS DE DISEÑO CALCULADOS', 14, lastTableY(doc, 75) + 15);
  
  autoTable(doc, {
    startY: lastTableY(doc, 75) + 20,
    head: [['Parámetro', 'Valor Calculado', 'Unidad']],
    body: [
      ['Resistencia Media Requerida (f\'cr)', fcrMPa.toFixed(2), 'MPa'],
      ['Agua Inicial Estimada', initialWaterKg.toFixed(1), 'kg/m³'],
      ['Reducción por Aditivos', waterReductionKg.toFixed(1), 'kg/m³'],
      ['Agua Final de Diseño', waterKg.toFixed(1), 'kg/m³'],
      ['Relación Agua / Cemento (A/C)', acRatio.toFixed(3), '-'],
      ['Contenido de Cemento', cementKg.toFixed(1), 'kg/m³'],
      ['Contenido de Aire', (design.materials.airContent || 0).toFixed(1), '%'],
    ],
    headStyles: { fillColor: [14, 165, 233] }, // Sky 500
  });

  // Materials
  doc.setFontSize(14);
  doc.text('3. PROPIEDADES DE LOS MATERIALES', 14, lastTableY(doc, 105) + 15);

  autoTable(doc, {
    startY: lastTableY(doc, 105) + 20,
    head: [['Material', 'Densidad SSS', 'Humedad %', 'Absorción %', 'Módulo Finura']],
    body: [
      ['Arena', design.materials.sand.densitySSD, design.materials.sand.moisture, design.materials.sand.absorption, design.materials.sand.finenessModulus || '-'],
      ['Agregado Grueso', design.materials.gravel.densitySSD, design.materials.gravel.moisture, design.materials.gravel.absorption, '-'],
    ],
    headStyles: { fillColor: [51, 65, 85] }, // Slate 700
  });

  // 4. Optimización y Agregados (Dinámico)
  const airContent = design.materials.airContent || 0;
  const aggVol = calculateAggregateVolume(
    waterKg,
    cementKg,
    design.materials.cement.specificGravityGcm3,
    airContent,
    design.materials.additives || []
  );

  const props = solveFullerProportions(
    design.materials.aggregateBlend?.finePercent,
    design.materials.aggregateBlend?.coarsePercent
  );
  const drySandKg = aggVol * (props.sand / 100) * design.materials.sand.densitySSD;
  const dryGravelKg = aggVol * (props.gravel / 100) * design.materials.gravel.densitySSD;

  const sandCorr = calculateMoistureCorrection(drySandKg, design.materials.sand.moisture, design.materials.sand.absorption);
  const gravelCorr = calculateMoistureCorrection(dryGravelKg, design.materials.gravel.moisture, design.materials.gravel.absorption);

  let additivesCost = 0;
  let additivesCO2 = 0;
  const additivesRows: TableCell[][] = [];
  const additivesSummary = calculateAdditivesSummary(design.materials.additives || [], cementKg);
  
  additivesSummary.rows.forEach(({ additive, massKgM3 }) => {
    additivesCost += massKgM3 * (additive.unitCost || 0);
    additivesCO2 += massKgM3 * (additive.carbonFactor || 0);
    additivesRows.push([`Aditivo (${additive.name})`, massKgM3.toFixed(2), massKgM3.toFixed(2), safeDivide(massKgM3, cementKg).toFixed(3)]);
  });

  const totalWaterContribution = sandCorr.contribution + gravelCorr.contribution;
  const finalWaterKg = Math.max(0, waterKg - totalWaterContribution);
  
  doc.addPage();
  doc.setFontSize(14);
  doc.text('4. DOSIFICACIÓN FINAL (POR m³)', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Material', 'Peso Seco (kg)', 'Peso Húmedo (kg)', 'Proporción']],
    body: [
      ['Cemento', cementKg.toFixed(1), cementKg.toFixed(1), '1.00'],
      ['Arena', drySandKg.toFixed(1), sandCorr.wetMass.toFixed(1), safeDivide(drySandKg, cementKg).toFixed(2)],
      ['Agregado Grueso', dryGravelKg.toFixed(1), gravelCorr.wetMass.toFixed(1), safeDivide(dryGravelKg, cementKg).toFixed(2)],
      ...additivesRows,
      ['Agua de Mezclado', waterKg.toFixed(1), finalWaterKg.toFixed(1), safeDivide(finalWaterKg, cementKg).toFixed(2)],
    ],
    headStyles: { fillColor: [22, 163, 74] }, // Green 600
  });

  // Economic & Environmental Analysis
  const cementCost = cementKg * (design.materials.cement.unitCost || 0);
  const sandCost = drySandKg * (design.materials.sand.unitCost || 0);
  const gravelCost = dryGravelKg * (design.materials.gravel.unitCost || 0);
  const totalCost = cementCost + sandCost + gravelCost + additivesCost;

  const totalCO2 = 
    (cementKg * (design.materials.cement.carbonFactor || 0)) + 
    (drySandKg * (design.materials.sand.carbonFactor || 0)) + 
    (dryGravelKg * (design.materials.gravel.carbonFactor || 0)) + additivesCO2;

  doc.setFontSize(14);
  doc.text('5. ANÁLISIS ECONÓMICO Y AMBIENTAL (POR m³)', 14, lastTableY(doc, 90) + 15);

  autoTable(doc, {
    startY: lastTableY(doc, 90) + 20,
    head: [['Métrica', 'Valor Estimado', 'Detalle']],
    body: [
      ['Costo Total de Materiales', `$${totalCost.toFixed(2)} USD`, `Cemento: $${cementCost.toFixed(2)} | Agregados: $${(sandCost + gravelCost).toFixed(2)}`],
      ['Huella de Carbono (CO2)', `${totalCO2.toFixed(1)} kg CO2`, 'Suma ponderada por factores de emisión de los materiales.'],
    ],
    headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('6. REGRESION DE RESISTENCIA', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Parametro', 'Valor']],
    body: [
      ['Modelo seleccionado', regression.label],
      ['Mejor modelo recomendado', bestRegression.label],
      ['Ecuacion', regression.equation],
      ['R2', regression.r2.toFixed(4)],
      ['RMSE', `${regression.rmse.toFixed(2)} kg/cm2`],
      ['R2 mejor modelo', bestRegression.r2.toFixed(4)],
      ['RMSE mejor modelo', `${bestRegression.rmse.toFixed(2)} kg/cm2`],
      ['Ensayos usados', regression.pointsUsed],
      ['Estado', regression.valid ? 'Curva ajustada correctamente' : regression.message],
    ],
    headStyles: { fillColor: [15, 23, 42] },
  });

  drawRegressionChart(doc, 18, lastTableY(doc, 70) + 18, pageWidth - 36, 70, regression, bestRegression, design.designRequirements.workStrengthKgCm2);

  autoTable(doc, {
    startY: lastTableY(doc, 70) + 100,
    head: [['Modelo', 'R2', 'RMSE', 'Ensayos', 'Estado']],
    body: regressionResults.map(modelResult => [
      modelResult.label,
      modelResult.r2.toFixed(4),
      modelResult.rmse.toFixed(2),
      modelResult.pointsUsed,
      modelResult.valid ? (modelResult.model === bestRegression.model ? 'Recomendado' : 'Calculado') : modelResult.message,
    ]),
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 8 },
  });

  autoTable(doc, {
    startY: lastTableY(doc, 170) + 12,
    head: [['Edad (dias)', 'Regresion kg/cm2', 'ACI kg/cm2', 'Diferencia', '% objetivo']],
    body: regression.predictions.map(prediction => [
      prediction.ageDays,
      prediction.adjustedKgCm2.toFixed(1),
      prediction.aciKgCm2.toFixed(1),
      prediction.differenceKgCm2.toFixed(1),
      `${prediction.targetPercent.toFixed(1)}%`,
    ]),
    headStyles: { fillColor: [14, 165, 233] },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('7. CONTROL ESTADISTICO DE RESISTENCIA', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Metrica', 'Valor']],
    body: [
      ['Estado global', strengthControl.status.toUpperCase()],
      ['Edad de evaluacion', `${strengthControl.evaluationAge} dias`],
      ['Ensayos evaluados', `${strengthControl.sampleCount} de ${strengthControl.totalSamples}`],
      ['Lotes', strengthControl.lotCount],
      ['Promedio', `${strengthControl.averageKgCm2.toFixed(1)} kg/cm2`],
      ['Desviacion estandar', `${strengthControl.standardDeviationKgCm2.toFixed(2)} kg/cm2`],
      ['Coeficiente de variacion', `${strengthControl.coefficientVariationPercent.toFixed(2)}%`],
      ['Resistencia minima', `${strengthControl.minimumKgCm2.toFixed(1)} kg/cm2`],
      ["f'c objetivo", `${strengthControl.targetKgCm2.toFixed(1)} kg/cm2`],
    ],
    headStyles: { fillColor: [15, 23, 42] },
  });

  drawStrengthControlChart(doc, 18, lastTableY(doc, 70) + 18, pageWidth - 42, 62, strengthControl);

  autoTable(doc, {
    startY: lastTableY(doc, 70) + 92,
    head: [['Lote', 'Ensayos', 'Promedio', 'Desv.', 'CV', 'Minima', 'Cumplimiento', 'Estado']],
    body: strengthControl.lots.length ? strengthControl.lots.map(lot => [
      lot.lot,
      lot.sampleCount,
      lot.averageKgCm2.toFixed(1),
      lot.standardDeviationKgCm2.toFixed(2),
      `${lot.coefficientVariationPercent.toFixed(2)}%`,
      lot.minimumKgCm2.toFixed(1),
      `${lot.compliancePercent.toFixed(1)}%`,
      lot.status.toUpperCase(),
    ]) : [['Sin lotes', 0, '-', '-', '-', '-', '-', 'OBSERVED']],
    headStyles: { fillColor: [51, 65, 85] },
    styles: { fontSize: 8 },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.text('8. ADVERTENCIAS TECNICAS DEL DISENO', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Severidad', 'Modulo', 'Advertencia', 'Recomendacion']],
    body: technicalWarnings.length > 0 || regression.warnings.length > 0 || strengthControl.warnings.length > 0
      ? [
        ...technicalWarnings.map(warning => [
        warning.severity.toUpperCase(),
        warning.module,
        `${warning.title}. ${warning.message}`,
        warning.recommendation,
        ]),
        ...regression.warnings.map(warning => [
          'WARNING',
          'Regresion',
          warning,
          'Agregar mas edades de ensayo o revisar dispersion de laboratorio.',
        ]),
        ...strengthControl.warnings.map(warning => [
          'WARNING',
          'Control estadistico',
          warning,
          'Tomar muestras adicionales, revisar curado y separar lotes atipicos.',
        ]),
      ]
      : [['OK', 'Revision general', 'No hay advertencias tecnicas activas.', 'Mantener control de laboratorio y curado.']],
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8 },
  });

  doc.setFontSize(14);
  doc.text('9. CONCLUSIONES AUTOMATICAS', 14, lastTableY(doc, 120) + 15);

  const conclusionRows: TableCell[][] = [
    ['Dosificacion', technicalWarnings.length ? 'Requiere revision tecnica antes de liberar mezcla.' : 'Sin alertas criticas activas en la revision automatica.'],
    ['Regresion', bestRegression.valid ? `El modelo recomendado es ${bestRegression.label} con R2 ${bestRegression.r2.toFixed(4)} y RMSE ${bestRegression.rmse.toFixed(2)} kg/cm2.` : 'No hay datos suficientes para recomendar un modelo.'],
    ['Control estadistico', `Estado ${strengthControl.status.toUpperCase()} con promedio ${strengthControl.averageKgCm2.toFixed(1)} kg/cm2, CV ${strengthControl.coefficientVariationPercent.toFixed(2)}% y minima ${strengthControl.minimumKgCm2.toFixed(1)} kg/cm2.`],
    ['Control de calidad', 'Validar resultados con cilindros adicionales, curado controlado y revision de dispersion de laboratorio.'],
  ];

  autoTable(doc, {
    startY: lastTableY(doc, 120) + 20,
    head: [['Area', 'Conclusion']],
    body: conclusionRows,
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 9 },
  });

  // Footer
  const finalY = lastTableY(doc, 130) + 30;
  doc.line(20, finalY, 80, finalY);
  doc.text('Firma Responsable', 50, finalY + 7, { align: 'center' });
  
  doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
  doc.text('Sello Laboratorio', pageWidth - 50, finalY + 7, { align: 'center' });

  doc.save(`Reporte_Hormigon_${design.projectInfo.projectName.replace(/\s+/g, '_')}.pdf`);
};

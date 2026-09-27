/**
 * Utilidades de cálculo para el diseño de hormigón estructural.
 * La lógica se mantiene fuera de los componentes para que los resultados sean
 * verificables y reutilizables en pantalla, PDF y Excel.
 */
import type { Additive, ConcreteDesign } from '../types';

export interface AdditiveDosageResult {
  additive: Additive;
  massKgM3: number;
  volumeLM3: number;
  volumeM3: number;
  densityKgL: number;
  waterReductionPercent: number;
}

export interface AdditivesSummary {
  rows: AdditiveDosageResult[];
  totalMassKgM3: number;
  totalVolumeLM3: number;
  totalAbsoluteVolumeM3: number;
  totalWaterReductionPercent: number;
}

export interface ConcreteDesignMetrics {
  fcMPa: number;
  fcrMPa: number;
  tmnMm: number;
  initialWaterKg: number;
  waterReductionKg: number;
  waterKg: number;
  waterCementRatio: number;
  cementKg: number;
  cementVolumeM3: number;
  waterVolumeM3: number;
  airVolumeM3: number;
  additivesVolumeM3: number;
  aggregateVolumeM3: number;
  nonAggregateVolumeM3: number;
  absoluteVolumeTotalM3: number;
  drySandKg: number;
  dryGravelKg: number;
  aggregateFinePercent: number;
  aggregateCoarsePercent: number;
  aggregateBlendTotal: number;
  minCementKgM3: number;
  maxWaterCementRatio: number;
}

export type TechnicalWarningSeverity = 'info' | 'warning' | 'danger';

export interface TechnicalWarning {
  id: string;
  module: string;
  severity: TechnicalWarningSeverity;
  title: string;
  message: string;
  recommendation: string;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const asFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asNumber = asFiniteNumber;

export const safeDivide = (numerator: unknown, denominator: unknown, fallback = 0): number => {
  const safeNumerator = asFiniteNumber(numerator);
  const safeDenominator = asFiniteNumber(denominator);
  if (Math.abs(safeDenominator) <= 1e-12) return fallback;
  const result = safeNumerator / safeDenominator;
  return Number.isFinite(result) ? result : fallback;
};

const getAdditiveDensityKgL = (additive: Additive): number => {
  const directDensity = asNumber(additive.densityKgL, 0);
  if (directDensity > 0) return directDensity;

  const legacyDensity = asNumber(additive.density, 0);
  if (legacyDensity > 20) return legacyDensity / 1000;
  if (legacyDensity > 0) return legacyDensity;

  return additive.type === 'Solid' ? 1.2 : 1.1;
};

export const kgCm2ToMPa = (value: number): number => Math.max(0, asNumber(value)) * 0.0980665;
export const mpaToKgCm2 = (value: number): number => Math.max(0, asNumber(value)) / 0.0980665;
export const inchesToMm = (value: number): number => Math.max(0, asNumber(value)) * 25.4;

/**
 * Resistencia media requerida cuando no hay registros históricos.
 */
export const calculateDesignStrength = (fcMPa: number): number => {
  const safeFc = Math.max(0, asNumber(fcMPa));
  if (safeFc < 21) return safeFc + 7;
  if (safeFc <= 35) return safeFc + 8.5;
  return 1.1 * safeFc + 5;
};

export const interpolate = (x: number, x1: number, y1: number, x2: number, y2: number): number => {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
};

const interpolateSeries = (x: number, points: Array<[number, number]>): number => {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (x <= sorted[0][0]) return sorted[0][1];
  if (x >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const [x1, y1] = sorted[i];
    const [x2, y2] = sorted[i + 1];
    if (x >= x1 && x <= x2) return interpolate(x, x1, y1, x2, y2);
  }

  return sorted[sorted.length - 1][1];
};

const waterTable = [
  { slump: 37.5, values: [[9.5, 207], [12.5, 199], [19, 190], [25, 179], [38, 166], [50, 154]] },
  { slump: 87.5, values: [[9.5, 228], [12.5, 216], [19, 205], [25, 193], [38, 181], [50, 169]] },
  { slump: 162.5, values: [[9.5, 243], [12.5, 228], [19, 216], [25, 202], [38, 190], [50, 178]] },
] satisfies Array<{ slump: number; values: Array<[number, number]> }>;

/**
 * Agua inicial interpolada por asentamiento y tamaño máximo nominal.
 */
export const calculateWaterContent = (tmnMm: number, slumpMm = 75): number => {
  const safeTmn = Math.max(9.5, asNumber(tmnMm, 25));
  const safeSlump = Math.max(25, asNumber(slumpMm, 75));
  const bySlump = waterTable.map(row => [row.slump, interpolateSeries(safeTmn, row.values)] as [number, number]);
  return interpolateSeries(safeSlump, bySlump);
};

export const calculateInitialWater = calculateWaterContent;

/**
 * Relación agua/cemento interpolada por resistencia media requerida.
 */
export const calculateWaterCementRatio = (fcrMPa: number): number => {
  const points: Array<[number, number]> = [
    [15, 0.70],
    [20, 0.60],
    [25, 0.50],
    [30, 0.45],
    [35, 0.40],
    [40, 0.35],
  ];
  return clamp(interpolateSeries(asNumber(fcrMPa, 25), points), 0.3, 0.8);
};

export const calculateWaterReduction = (initialWater: number, reductionPercent: number): number => {
  const safePercent = clamp(asNumber(reductionPercent), 0, 40);
  return Math.max(0, asNumber(initialWater)) * safePercent / 100;
};

export const calculateFinalWater = (initialWater: number, reductionKgM3: number): number => {
  return Math.max(0, asNumber(initialWater) - Math.max(0, asNumber(reductionKgM3)));
};

export const calculateCementContent = (waterKg: number, acRatio: number): number => {
  const safeRatio = asNumber(acRatio);
  if (safeRatio <= 0) return 0;
  return Math.max(0, asNumber(waterKg)) / safeRatio;
};

export const calculateCementVolume = (cementKg: number, densityGcm3: number): number => {
  const densityKgM3 = asNumber(densityGcm3) * 1000;
  if (densityKgM3 <= 0) return 0;
  return Math.max(0, asNumber(cementKg)) / densityKgM3;
};

export const calculateAdditiveDosage = (additive: Additive, cementKgM3: number): AdditiveDosageResult => {
  const enabled = additive.enabled ?? true;
  const cement = Math.max(0, asNumber(cementKgM3));
  const densityKgL = getAdditiveDensityKgL(additive);
  const dosageValue = Math.max(0, asNumber(additive.dosageValue ?? additive.dosagePercent));
  const dosageUnit = additive.dosageUnit ?? 'percentCement';

  if (!enabled || cement <= 0 || densityKgL <= 0) {
    return { additive, massKgM3: 0, volumeLM3: 0, volumeM3: 0, densityKgL, waterReductionPercent: 0 };
  }

  const [massKgM3, volumeLM3] = (() => {
    if (dosageUnit === 'percentCement') {
      const mass = cement * dosageValue / 100;
      return [mass, mass / densityKgL];
    }

    if (dosageUnit === 'mlPerKgCement') {
      const volume = cement * dosageValue / 1000;
      return [volume * densityKgL, volume];
    }

    if (dosageUnit === 'literPerM3') {
      return [dosageValue * densityKgL, dosageValue];
    }

    return [dosageValue, dosageValue / densityKgL];
  })();

  return {
    additive,
    massKgM3,
    volumeLM3,
    volumeM3: volumeLM3 / 1000,
    densityKgL,
    waterReductionPercent: clamp(asNumber(additive.waterReductionPercent), 0, 40),
  };
};

export const calculateAdditivesSummary = (additives: Additive[], cementKgM3: number): AdditivesSummary => {
  const rows = (additives || []).map(additive => calculateAdditiveDosage(additive, cementKgM3));

  return rows.reduce<AdditivesSummary>((summary, row) => ({
    rows: summary.rows.concat(row),
    totalMassKgM3: summary.totalMassKgM3 + row.massKgM3,
    totalVolumeLM3: summary.totalVolumeLM3 + row.volumeLM3,
    totalAbsoluteVolumeM3: summary.totalAbsoluteVolumeM3 + row.volumeM3,
    totalWaterReductionPercent: clamp(summary.totalWaterReductionPercent + row.waterReductionPercent, 0, 40),
  }), {
    rows: [],
    totalMassKgM3: 0,
    totalVolumeLM3: 0,
    totalAbsoluteVolumeM3: 0,
    totalWaterReductionPercent: 0,
  });
};

export const calculateAdditivesWaterReduction = (initialWater: number, additives: Additive[]): number => {
  const percent = (additives || []).reduce((total, additive) => (
    total + ((additive.enabled ?? true) ? clamp(asNumber(additive.waterReductionPercent), 0, 40) : 0)
  ), 0);

  return calculateWaterReduction(initialWater, clamp(percent, 0, 40));
};

export const calculateAirVolume = (airPercent: number): number => clamp(asNumber(airPercent), 0, 12) / 100;

/**
 * Volumen restante para arena y agregado grueso en 1 m³.
 */
export const calculateAggregateVolume = (
  waterKg: number,
  cementKg: number,
  cementDensityGcm3: number,
  airPercent = 0,
  additives: Additive[] = []
): number => {
  const volWater = Math.max(0, asNumber(waterKg)) / 1000;
  const volCement = calculateCementVolume(cementKg, cementDensityGcm3);
  const volAir = calculateAirVolume(airPercent);
  const volAdditives = calculateAdditivesSummary(additives, cementKg).totalAbsoluteVolumeM3;

  return Math.max(0, 1 - volWater - volCement - volAir - volAdditives);
};

/**
 * Corrección por humedad: positivo aporta agua, negativo absorbe agua.
 */
export const calculateMoistureCorrection = (
  dryMass: number,
  moisturePerc: number,
  absorptionPerc: number
) => {
  const safeDryMass = Math.max(0, asNumber(dryMass));
  const moisture = Math.max(0, asNumber(moisturePerc));
  const absorption = Math.max(0, asNumber(absorptionPerc));

  const wetMass = safeDryMass * (1 + moisture / 100);
  const contribution = safeDryMass * (moisture - absorption) / 100;
  return { wetMass, contribution };
};

export const scaleToVolume = (kgM3: number, liters: number): number => {
  return Math.max(0, asNumber(kgM3)) * (Math.max(0, asNumber(liters)) / 1000);
};

export const calculateSieveResults = (retainedWeights: number[]) => {
  const total = retainedWeights.reduce((a, b) => a + Math.max(0, asNumber(b)), 0);
  let accumulated = 0;
  return retainedWeights.map(w => {
    accumulated += Math.max(0, asNumber(w));
    const percAccumulated = total > 0 ? (accumulated / total) * 100 : 0;
    return {
      retained: w,
      accumulated,
      percAccumulated,
      percPassing: 100 - percAccumulated,
    };
  });
};

export const calculateFullerPassing = (d: number, D: number): number => {
  const size = asNumber(d);
  const maxSize = asNumber(D);
  if (size >= maxSize) return 100;
  if (size <= 0 || maxSize <= 0) return 0;
  return 100 * Math.sqrt(size / maxSize);
};

export const solveFullerProportions = (finePercent = 40, coarsePercent = 60) => {
  const fine = Math.max(0, asNumber(finePercent, 40));
  const coarse = Math.max(0, asNumber(coarsePercent, 60));
  const total = fine + coarse;

  if (total <= 0) {
    return { sand: 40, gravel: 60 };
  }

  return {
    sand: fine / total * 100,
    gravel: coarse / total * 100,
  };
};

const normalizeCondition = (condition: string): string => (
  condition
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
);

const getMaximumWaterCementRatio = (exposureCondition: string): number => {
  const condition = normalizeCondition(exposureCondition || '');
  if (condition.includes('marino') || condition.includes('congel') || condition.includes('quim')) return 0.45;
  if (condition.includes('sulfato') || condition.includes('humed')) return 0.50;
  return 0.60;
};

const getMinimumCement = (exposureCondition: string): number => {
  const condition = normalizeCondition(exposureCondition || '');
  if (condition.includes('marino') || condition.includes('congel') || condition.includes('quim')) return 320;
  if (condition.includes('sulfato') || condition.includes('humed')) return 300;
  return 280;
};

const createWarning = (
  id: string,
  module: string,
  severity: TechnicalWarningSeverity,
  title: string,
  message: string,
  recommendation: string,
): TechnicalWarning => ({ id, module, severity, title, message, recommendation });

export const technicalWarningMessages = {
  waterCementHigh: (ratio: number, limit: number) => createWarning(
    'water-cement-high',
    'Agua / Cemento',
    ratio > 0.65 ? 'danger' : 'warning',
    'Relacion agua/cemento elevada',
    `La relacion A/C calculada es ${ratio.toFixed(3)} y supera el limite tecnico de ${limit.toFixed(2)} para la exposicion seleccionada.`,
    'Reducir agua efectiva, usar aditivo reductor o aumentar cemento hasta cumplir durabilidad.',
  ),
  waterCementLow: (ratio: number) => createWarning(
    'water-cement-low',
    'Agua / Cemento',
    'info',
    'Relacion agua/cemento muy baja',
    `La relacion A/C calculada es ${ratio.toFixed(3)}. Puede mejorar resistencia, pero puede afectar trabajabilidad.`,
    'Verificar asentamiento, aditivos y energia de compactacion antes de liberar la dosificacion.',
  ),
  cementLow: (cementKg: number, minimum: number) => createWarning(
    'cement-low',
    'Dosificacion',
    'warning',
    'Contenido de cemento bajo',
    `El cemento calculado es ${cementKg.toFixed(1)} kg/m3, por debajo del minimo recomendado de ${minimum.toFixed(0)} kg/m3.`,
    'Ajustar agua, A/C o requisitos de durabilidad para elevar el contenido de pasta.',
  ),
  cementHigh: (cementKg: number) => createWarning(
    'cement-high',
    'Dosificacion',
    cementKg > 560 ? 'danger' : 'warning',
    'Contenido de cemento alto',
    `El cemento calculado es ${cementKg.toFixed(1)} kg/m3. Esto puede elevar calor de hidratacion, retraccion y costo.`,
    'Revisar resistencia objetivo, aditivos, TMN y granulometria para optimizar la pasta.',
  ),
  aggregateBlend: (total: number) => createWarning(
    'aggregate-blend-total',
    'Volumen Absoluto',
    'warning',
    'Suma de agregados fuera de 100%',
    `La mezcla arena/agregado grueso suma ${total.toFixed(2)}%.`,
    'Ajustar los porcentajes de arena y agregado grueso para que el reparto total sea 100%.',
  ),
  absoluteVolume: (total: number) => createWarning(
    'absolute-volume-balance',
    'Volumen Absoluto',
    Math.abs(total - 1) > 0.05 ? 'danger' : 'warning',
    'Balance de volumen absoluto inconsistente',
    `La suma volumetrica calculada es ${total.toFixed(4)} m3 por m3 de hormigon.`,
    'Revisar densidades, aire, aditivos y agua antes de usar la dosificacion.',
  ),
  aggregateVolumeLow: (volume: number) => createWarning(
    'aggregate-volume-low',
    'Volumen Absoluto',
    'danger',
    'Volumen disponible para agregados insuficiente',
    `El volumen calculado para agregados es ${volume.toFixed(4)} m3/m3.`,
    'Reducir volumen de pasta, aire o aditivos; tambien revise densidad del cemento.',
  ),
};

export const calculateConcreteDesignMetrics = (design: ConcreteDesign): ConcreteDesignMetrics => {
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const tmnMm = inchesToMm(design.designRequirements.nominalMaxSizeIn);
  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const waterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const waterCementRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(waterKg, waterCementRatio);
  const cementVolumeM3 = calculateCementVolume(cementKg, design.materials.cement.specificGravityGcm3);
  const waterVolumeM3 = Math.max(0, asNumber(waterKg)) / 1000;
  const airVolumeM3 = calculateAirVolume(design.materials.airContent);
  const additivesVolumeM3 = calculateAdditivesSummary(design.materials.additives || [], cementKg).totalAbsoluteVolumeM3;
  const aggregateVolumeM3 = calculateAggregateVolume(
    waterKg,
    cementKg,
    design.materials.cement.specificGravityGcm3,
    design.materials.airContent,
    design.materials.additives || [],
  );
  const aggregateFinePercent = Math.max(0, asNumber(design.materials.aggregateBlend?.finePercent, 40));
  const aggregateCoarsePercent = Math.max(0, asNumber(design.materials.aggregateBlend?.coarsePercent, 60));
  const aggregateBlendTotal = aggregateFinePercent + aggregateCoarsePercent;
  const proportions = solveFullerProportions(aggregateFinePercent, aggregateCoarsePercent);
  const drySandKg = aggregateVolumeM3 * (proportions.sand / 100) * Math.max(0, asNumber(design.materials.sand.densitySSD));
  const dryGravelKg = aggregateVolumeM3 * (proportions.gravel / 100) * Math.max(0, asNumber(design.materials.gravel.densitySSD));
  const nonAggregateVolumeM3 = waterVolumeM3 + cementVolumeM3 + airVolumeM3 + additivesVolumeM3;
  const absoluteVolumeTotalM3 = nonAggregateVolumeM3 + aggregateVolumeM3;

  return {
    fcMPa,
    fcrMPa,
    tmnMm,
    initialWaterKg,
    waterReductionKg,
    waterKg,
    waterCementRatio,
    cementKg,
    cementVolumeM3,
    waterVolumeM3,
    airVolumeM3,
    additivesVolumeM3,
    aggregateVolumeM3,
    nonAggregateVolumeM3,
    absoluteVolumeTotalM3,
    drySandKg,
    dryGravelKg,
    aggregateFinePercent,
    aggregateCoarsePercent,
    aggregateBlendTotal,
    minCementKgM3: getMinimumCement(design.designRequirements.exposureCondition),
    maxWaterCementRatio: getMaximumWaterCementRatio(design.designRequirements.exposureCondition),
  };
};

export const validateConcreteDesign = (design: ConcreteDesign): TechnicalWarning[] => {
  const metrics = calculateConcreteDesignMetrics(design);
  const warnings: TechnicalWarning[] = [];

  if (asNumber(design.designRequirements.workStrengthKgCm2) <= 0) {
    warnings.push(createWarning(
      'strength-invalid',
      'Datos de Obra',
      'danger',
      'Resistencia objetivo invalida',
      'La resistencia especificada debe ser mayor que cero para calcular fcr, A/C y dosificacion.',
      'Ingresar una resistencia f\'c valida en kg/cm2.',
    ));
  }

  if (asNumber(design.materials.cement.specificGravityGcm3) <= 0) {
    warnings.push(createWarning(
      'cement-density-invalid',
      'Materiales',
      'danger',
      'Densidad de cemento invalida',
      'La densidad relativa del cemento no puede ser cero o negativa.',
      'Usar un valor tipico cercano a 3.10 a 3.15 g/cm3 o el dato de laboratorio.',
    ));
  }

  if (asNumber(design.designRequirements.slumpMm) <= 0 || asNumber(design.designRequirements.slumpMm) > 250) {
    warnings.push(createWarning(
      'slump-range',
      'Datos de Obra',
      'warning',
      'Asentamiento fuera de rango habitual',
      `El asentamiento ingresado es ${asNumber(design.designRequirements.slumpMm).toFixed(1)} mm.`,
      'Verificar consistencia requerida, metodo de colocacion y uso de aditivos antes de dosificar.',
    ));
  }

  if (asNumber(design.designRequirements.nominalMaxSizeIn) <= 0 || asNumber(design.designRequirements.nominalMaxSizeIn) > 3) {
    warnings.push(createWarning(
      'tmn-range',
      'Datos de Obra',
      'warning',
      'Tamano maximo nominal poco realista',
      `El TMN ingresado es ${asNumber(design.designRequirements.nominalMaxSizeIn).toFixed(2)} pulgadas.`,
      'Usar un TMN compatible con separacion de acero, espesor del elemento y disponibilidad de agregado.',
    ));
  }

  if (asNumber(design.materials.sand.densitySSD) <= 0 || asNumber(design.materials.gravel.densitySSD) <= 0) {
    warnings.push(createWarning(
      'aggregate-density-invalid',
      'Materiales',
      'danger',
      'Densidad de agregados invalida',
      'La arena y el agregado grueso necesitan densidades SSS positivas para el volumen absoluto.',
      'Corregir las densidades de laboratorio antes de dosificar.',
    ));
  }

  if (metrics.waterCementRatio > metrics.maxWaterCementRatio) {
    warnings.push(technicalWarningMessages.waterCementHigh(metrics.waterCementRatio, metrics.maxWaterCementRatio));
  }

  if (metrics.waterKg < 110 || metrics.waterKg > 240) {
    warnings.push(createWarning(
      'water-content-range',
      'Agua / Cemento',
      metrics.waterKg > 260 ? 'danger' : 'warning',
      'Contenido de agua fuera de rango habitual',
      `El agua efectiva calculada es ${metrics.waterKg.toFixed(1)} kg/m3.`,
      'Revisar asentamiento, TMN, absorcion, humedad y reduccion por aditivos.',
    ));
  }

  if (metrics.initialWaterKg > 0 && metrics.waterReductionKg > metrics.initialWaterKg * 0.35) {
    warnings.push(createWarning(
      'water-reduction-high',
      'Aditivos',
      'warning',
      'Reduccion de agua elevada',
      `La reduccion por aditivos es ${metrics.waterReductionKg.toFixed(1)} kg/m3 sobre ${metrics.initialWaterKg.toFixed(1)} kg/m3 iniciales.`,
      'Confirmar dosis maxima del fabricante y hacer mezcla de prueba para validar trabajabilidad.',
    ));
  }

  if (metrics.waterCementRatio < 0.32 && metrics.waterCementRatio > 0) {
    warnings.push(technicalWarningMessages.waterCementLow(metrics.waterCementRatio));
  }

  if (metrics.cementKg < metrics.minCementKgM3 && metrics.cementKg > 0) {
    warnings.push(technicalWarningMessages.cementLow(metrics.cementKg, metrics.minCementKgM3));
  }

  if (metrics.cementKg > 500) {
    warnings.push(technicalWarningMessages.cementHigh(metrics.cementKg));
  }

  if (Math.abs(metrics.aggregateBlendTotal - 100) > 0.5) {
    warnings.push(technicalWarningMessages.aggregateBlend(metrics.aggregateBlendTotal));
  }

  if (metrics.aggregateFinePercent > 100 || metrics.aggregateCoarsePercent > 100) {
    warnings.push(createWarning(
      'aggregate-percent-range',
      'Volumen Absoluto',
      'warning',
      'Porcentaje de agregado fuera de rango',
      'Ningun componente del reparto de agregados debe superar 100%.',
      'Usar porcentajes complementarios dentro del intervalo 0 a 100%.',
    ));
  }

  if (metrics.nonAggregateVolumeM3 >= 1 || metrics.aggregateVolumeM3 <= 0.05) {
    warnings.push(technicalWarningMessages.aggregateVolumeLow(metrics.aggregateVolumeM3));
  } else if (Math.abs(metrics.absoluteVolumeTotalM3 - 1) > 0.015) {
    warnings.push(technicalWarningMessages.absoluteVolume(metrics.absoluteVolumeTotalM3));
  }

  if (metrics.drySandKg <= 0 || metrics.dryGravelKg <= 0) {
    warnings.push(createWarning(
      'aggregate-mass-invalid',
      'Volumen Absoluto',
      'danger',
      'Masa de agregados no calculable',
      `Arena seca ${metrics.drySandKg.toFixed(1)} kg/m3 y agregado grueso ${metrics.dryGravelKg.toFixed(1)} kg/m3.`,
      'Revisar volumen disponible, densidades SSS y reparto arena/agregado grueso.',
    ));
  }

  if (asNumber(design.materials.airContent) < 0 || asNumber(design.materials.airContent) > 8) {
    warnings.push(createWarning(
      'air-content-range',
      'Materiales',
      'warning',
      'Aire incluido fuera de rango habitual',
      `El aire incluido es ${asNumber(design.materials.airContent).toFixed(1)}%.`,
      'Verificar si el hormigon requiere aire incorporado especial por exposicion.',
    ));
  }

  return warnings;
};

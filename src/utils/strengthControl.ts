import type { StrengthControlSample } from '../types';

export type StrengthControlStatus = 'accepted' | 'observed' | 'rejected';

export interface StrengthControlLotResult {
  lot: string;
  sampleCount: number;
  averageKgCm2: number;
  standardDeviationKgCm2: number;
  coefficientVariationPercent: number;
  minimumKgCm2: number;
  targetKgCm2: number;
  compliancePercent: number;
  status: StrengthControlStatus;
  warnings: string[];
}

export interface StrengthControlChartPoint {
  sequence: number;
  label: string;
  lot: string;
  strengthKgCm2: number;
  targetKgCm2: number;
  observationLimitKgCm2: number;
  rejectionLimitKgCm2: number;
  meanKgCm2: number;
  upperControlLimitKgCm2: number;
  lowerControlLimitKgCm2: number;
}

export interface StrengthControlResult {
  targetKgCm2: number;
  sampleCount: number;
  lotCount: number;
  averageKgCm2: number;
  standardDeviationKgCm2: number;
  coefficientVariationPercent: number;
  minimumKgCm2: number;
  status: StrengthControlStatus;
  warnings: string[];
  lots: StrengthControlLotResult[];
  chartData: StrengthControlChartPoint[];
  evaluationAge: number;
  totalSamples: number;
}

const round = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const asFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeLot = (lot: unknown): string => {
  const value = String(lot || '').trim();
  return value || 'Lote sin nombre';
};

export const sanitizeStrengthControlSamples = (samples: StrengthControlSample[]): StrengthControlSample[] => (
  (samples || [])
    .map((sample, index) => ({
      id: sample.id || `control-${index + 1}`,
      lot: sanitizeLot(sample.lot),
      ageDays: Math.max(1, Math.round(asFiniteNumber(sample.ageDays, 28))),
      strengthKgCm2: Math.max(0, asFiniteNumber(sample.strengthKgCm2)),
    }))
    .filter(sample => sample.strengthKgCm2 > 0)
);

const standardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
};

const getWorstStatus = (statuses: StrengthControlStatus[]): StrengthControlStatus => {
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.includes('observed')) return 'observed';
  return 'accepted';
};

const evaluateLotStatus = (
  sampleCount: number,
  average: number,
  minimum: number,
  coefficientVariation: number,
  target: number,
): StrengthControlStatus => {
  if (target <= 0 || sampleCount === 0) return 'rejected';
  if (minimum < target * 0.85 || average < target * 0.95) return 'rejected';
  if (sampleCount < 3) return 'observed';
  if (average >= target && minimum >= target * 0.9 && coefficientVariation <= 12) return 'accepted';
  return 'observed';
};

const buildLotWarnings = (
  sampleCount: number,
  average: number,
  minimum: number,
  coefficientVariation: number,
  target: number,
): string[] => {
  const warnings: string[] = [];

  if (sampleCount < 3) {
    warnings.push('El lote tiene menos de 3 ensayos; usar como control preliminar.');
  }

  if (target <= 0) {
    warnings.push("El f'c objetivo debe ser mayor que cero para evaluar cumplimiento.");
  }

  if (minimum < target * 0.85) {
    warnings.push("La resistencia minima cae bajo el 85% del f'c.");
  } else if (minimum < target * 0.9) {
    warnings.push("La resistencia minima cae bajo el 90% del f'c.");
  }

  if (average < target) {
    warnings.push("El promedio del lote queda bajo el f'c especificado.");
  }

  if (coefficientVariation > 18) {
    warnings.push('Coeficiente de variacion muy alto; revisar dispersion de laboratorio.');
  } else if (coefficientVariation > 12) {
    warnings.push('Coeficiente de variacion elevado; mantener el lote observado.');
  }

  return warnings;
};

const calculateLot = (lot: string, samples: StrengthControlSample[], target: number): StrengthControlLotResult => {
  const values = samples.map(sample => sample.strengthKgCm2);
  const sampleCount = values.length;
  const average = sampleCount ? values.reduce((sum, value) => sum + value, 0) / sampleCount : 0;
  const deviation = standardDeviation(values);
  const coefficientVariation = average > 0 ? (deviation / average) * 100 : 0;
  const minimum = sampleCount ? Math.min(...values) : 0;
  const status = evaluateLotStatus(sampleCount, average, minimum, coefficientVariation, target);

  return {
    lot,
    sampleCount,
    averageKgCm2: round(average, 2),
    standardDeviationKgCm2: round(deviation, 2),
    coefficientVariationPercent: round(coefficientVariation, 2),
    minimumKgCm2: round(minimum, 2),
    targetKgCm2: round(target, 2),
    compliancePercent: target > 0 ? round((average / target) * 100, 1) : 0,
    status,
    warnings: buildLotWarnings(sampleCount, average, minimum, coefficientVariation, target),
  };
};

const buildChartData = (
  samples: StrengthControlSample[],
  target: number,
  mean: number,
  deviation: number,
): StrengthControlChartPoint[] => {
  const upperControlLimit = mean + deviation * 2;
  const lowerControlLimit = Math.max(0, mean - deviation * 2);

  return samples.map((sample, index) => ({
    sequence: index + 1,
    label: `${sample.lot} #${index + 1}`,
    lot: sample.lot,
    strengthKgCm2: round(sample.strengthKgCm2, 2),
    targetKgCm2: round(target, 2),
    observationLimitKgCm2: round(target * 0.9, 2),
    rejectionLimitKgCm2: round(target * 0.85, 2),
    meanKgCm2: round(mean, 2),
    upperControlLimitKgCm2: round(upperControlLimit, 2),
    lowerControlLimitKgCm2: round(lowerControlLimit, 2),
  }));
};

export const calculateStrengthControl = (
  samples: StrengthControlSample[],
  targetKgCm2: number,
  evaluationAge = 28,
): StrengthControlResult => {
  const target = Math.max(0, asFiniteNumber(targetKgCm2));
  const ageForControl = Math.max(1, Math.round(asFiniteNumber(evaluationAge, 28)));
  const allCleanSamples = sanitizeStrengthControlSamples(samples);
  const cleanSamples = allCleanSamples.filter(s => s.ageDays === ageForControl);

  const values = cleanSamples.map(sample => sample.strengthKgCm2);
  const sampleCount = values.length;
  const average = sampleCount ? values.reduce((sum, value) => sum + value, 0) / sampleCount : 0;
  const deviation = standardDeviation(values);
  const coefficientVariation = average > 0 ? (deviation / average) * 100 : 0;
  const minimum = sampleCount ? Math.min(...values) : 0;
  const lotsByName = cleanSamples.reduce<Record<string, StrengthControlSample[]>>((acc, sample) => {
    acc[sample.lot] = [...(acc[sample.lot] || []), sample];
    return acc;
  }, {});
  const lots = Object.entries(lotsByName).map(([lot, lotSamples]) => calculateLot(lot, lotSamples, target));
  const status = lots.length ? getWorstStatus(lots.map(lot => lot.status)) : 'observed';
  const hasMixedAges = allCleanSamples.some(s => s.ageDays !== ageForControl);

  const warnings = [
    ...(sampleCount === 0 ? [`No hay ensayos de ${ageForControl} dias para evaluar el control estadistico.`] : []),
    ...(hasMixedAges ? [`Existen ensayos con edades distintas a ${ageForControl} dias que no se incluyeron en la evaluacion tecnica.`] : []),
    ...(target <= 0 ? ["El f'c objetivo no permite evaluar cumplimiento (f'c = 0)."] : []),
    ...(sampleCount > 0 && sampleCount < 3 ? [`El control global a ${ageForControl} dias tiene menos de 3 ensayos.`] : []),
    ...lots.flatMap(lot => lot.warnings.map(warning => `${lot.lot}: ${warning}`)),
  ];

  return {
    targetKgCm2: round(target, 2),
    sampleCount,
    lotCount: lots.length,
    averageKgCm2: round(average, 2),
    standardDeviationKgCm2: round(deviation, 2),
    coefficientVariationPercent: round(coefficientVariation, 2),
    minimumKgCm2: round(minimum, 2),
    status,
    warnings,
    lots,
    chartData: buildChartData(cleanSamples, target, average, deviation),
    evaluationAge: ageForControl,
    totalSamples: allCleanSamples.length,
  };
};

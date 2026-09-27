import type { RegressionModelType, StrengthTestDataPoint } from '../types';

export const defaultPredictionAges = [3, 7, 14, 21, 28, 56, 90];

export interface RegressionModelOption {
  id: RegressionModelType;
  label: string;
  description: string;
  requiredPoints: number;
}

export interface RegressionPrediction {
  ageDays: number;
  adjustedKgCm2: number;
  aciKgCm2: number;
  differenceKgCm2: number;
  targetPercent: number;
}

export interface StrengthChartPoint {
  ageDays: number;
  aciKgCm2: number;
  adjustedKgCm2: number | null;
  measuredKgCm2: number | null;
}

export type StrengthComparisonChartPoint = StrengthChartPoint & Partial<Record<`${RegressionModelType}KgCm2`, number | null>>;

export interface StrengthRegressionResult {
  model: RegressionModelType;
  label: string;
  valid: boolean;
  message: string;
  equation: string;
  r2: number;
  rmse: number;
  pointsUsed: number;
  requiredPoints: number;
  parameters: {
    a: number;
    b: number;
  };
  coefficients: number[];
  predictions: RegressionPrediction[];
  chartData: StrengthChartPoint[];
  warnings: string[];
}

export const regressionModelOptions: RegressionModelOption[] = [
  { id: 'linear', label: 'Lineal', description: 'f(t) = a + bt', requiredPoints: 2 },
  { id: 'logarithmic', label: 'Logaritmica', description: 'f(t) = a + b ln(t)', requiredPoints: 2 },
  { id: 'exponential', label: 'Exponencial', description: 'f(t) = a e^(bt)', requiredPoints: 2 },
  { id: 'power', label: 'Potencial', description: 'f(t) = a t^b', requiredPoints: 2 },
  { id: 'polynomial2', label: 'Polinomica grado 2', description: 'f(t) = a + bt + ct^2', requiredPoints: 3 },
  { id: 'polynomial3', label: 'Polinomica grado 3', description: 'f(t) = a + bt + ct^2 + dt^3', requiredPoints: 4 },
];

const round = (value: number, digits = 2): number => {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const asFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampStrength = (value: number): number => round(Math.max(0, asFiniteNumber(value)), 2);

const getModelOption = (model: RegressionModelType): RegressionModelOption => (
  regressionModelOptions.find(option => option.id === model) || regressionModelOptions[0]
);

const uniqueSortedAges = (ages: number[]): number[] => (
  Array.from(new Set(ages.map(age => Math.max(1, Math.round(asFiniteNumber(age, 1)))))).sort((a, b) => a - b)
);

const formatSigned = (value: number, digits = 4): string => {
  const rounded = round(Math.abs(value), digits);
  return value < 0 ? `- ${rounded}` : `+ ${rounded}`;
};

const isLogStrengthModel = (model: RegressionModelType): boolean => model === 'power' || model === 'exponential';

const cleanTestData = (points: StrengthTestDataPoint[], model: RegressionModelType): StrengthTestDataPoint[] => {
  const grouped = (points || []).reduce<Record<number, { total: number; count: number; id: string }>>((acc, point, index) => {
    const ageDays = Math.round(asFiniteNumber(point.ageDays));
    const strengthKgCm2 = asFiniteNumber(point.strengthKgCm2);
    const strengthIsValid = isLogStrengthModel(model) ? strengthKgCm2 > 0 : strengthKgCm2 >= 0;

    if (ageDays <= 0 || !strengthIsValid) return acc;

    const current = acc[ageDays] || { total: 0, count: 0, id: point.id || `ensayo-${index + 1}` };
    acc[ageDays] = {
      total: current.total + strengthKgCm2,
      count: current.count + 1,
      id: current.id,
    };
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([ageDays, value]) => ({
      id: value.id,
      ageDays: Number(ageDays),
      strengthKgCm2: value.total / value.count,
    }))
    .sort((a, b) => a.ageDays - b.ageDays);
};

const countUniqueAges = (points: StrengthTestDataPoint[]): number => new Set(points.map(point => point.ageDays)).size;

const linearLeastSquares = (xValues: number[], yValues: number[]): { intercept: number; slope: number } | null => {
  if (xValues.length !== yValues.length || xValues.length < 2) return null;

  const n = xValues.length;
  const sumX = xValues.reduce((sum, value) => sum + value, 0);
  const sumY = yValues.reduce((sum, value) => sum + value, 0);
  const sumXY = xValues.reduce((sum, value, index) => sum + value * yValues[index], 0);
  const sumX2 = xValues.reduce((sum, value) => sum + value * value, 0);
  const denominator = n * sumX2 - sumX * sumX;

  if (Math.abs(denominator) < 1e-12) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return {
    intercept: asFiniteNumber(intercept),
    slope: asFiniteNumber(slope),
  };
};

const solveLinearSystem = (matrix: number[][], vector: number[]): number[] | null => {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let column = 0; column < n; column += 1) {
    let pivotRow = column;
    for (let row = column + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivotRow][column])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][column]) < 1e-12) return null;

    [augmented[column], augmented[pivotRow]] = [augmented[pivotRow], augmented[column]];

    const pivot = augmented[column][column];
    for (let cell = column; cell <= n; cell += 1) {
      augmented[column][cell] /= pivot;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= n; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }

  return augmented.map(row => asFiniteNumber(row[n]));
};

const polynomialLeastSquares = (xValues: number[], yValues: number[], degree: number): number[] | null => {
  if (xValues.length !== yValues.length || xValues.length < degree + 1) return null;
  if (new Set(xValues).size < degree + 1) return null;

  const size = degree + 1;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const vector = Array.from({ length: size }, () => 0);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      matrix[row][column] = xValues.reduce((sum, x) => sum + x ** (row + column), 0);
    }
    vector[row] = xValues.reduce((sum, x, index) => sum + yValues[index] * (x ** row), 0);
  }

  return solveLinearSystem(matrix, vector);
};

const calculateR2 = (actual: number[], predicted: number[]): number => {
  if (actual.length !== predicted.length || actual.length < 2) return 0;

  const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;
  const total = actual.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const residual = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);

  if (total <= 1e-12) return residual <= 1e-12 ? 1 : 0;
  return Math.max(0, Math.min(1, 1 - residual / total));
};

const calculateRmse = (actual: number[], predicted: number[]): number => {
  if (actual.length !== predicted.length || actual.length === 0) return 0;
  const mse = actual.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0) / actual.length;
  return Math.sqrt(Math.max(0, mse));
};

export const calculateAciStrength = (target28KgCm2: number, ageDays: number): number => {
  const target = Math.max(0, asFiniteNumber(target28KgCm2));
  const age = Math.max(1, asFiniteNumber(ageDays, 1));
  const aciFactor = age / (4 + 0.85 * age);
  const factor28 = 28 / (4 + 0.85 * 28);

  if (factor28 <= 0) return target;
  return round(target * (aciFactor / factor28), 2);
};

const buildPolynomialEquation = (coefficients: number[]): string => {
  const terms = coefficients.map((coefficient, index) => {
    if (index === 0) return `${round(coefficient, 4)}`;
    const power = index === 1 ? 't' : `t^${index}`;
    return `${formatSigned(coefficient, 6)} ${power}`;
  });

  return `f(t) = ${terms.join(' ')}`;
};

const buildEquation = (model: RegressionModelType, coefficients: number[]): string => {
  const [a = 0, b = 0] = coefficients;

  if (model === 'linear') return `f(t) = ${round(a, 4)} ${formatSigned(b)} t`;
  if (model === 'logarithmic') return `f(t) = ${round(a, 4)} ${formatSigned(b)} ln(t)`;
  if (model === 'exponential') return `f(t) = ${round(a, 4)} e^(${round(b, 6)}t)`;
  if (model === 'power') return `f(t) = ${round(a, 4)} t^${round(b, 6)}`;
  return buildPolynomialEquation(coefficients);
};

export const predictStrengthForModel = (
  model: RegressionModelType,
  coefficients: number[],
  ageDays: number,
): number => {
  const age = Math.max(1, asFiniteNumber(ageDays, 1));
  const [a = 0, b = 0] = coefficients;

  const value = (() => {
    if (model === 'linear') return a + b * age;
    if (model === 'logarithmic') return a + b * Math.log(age);
    if (model === 'exponential') return a * Math.exp(b * age);
    if (model === 'power') return a * (age ** b);
    return coefficients.reduce((sum, coefficient, power) => sum + coefficient * (age ** power), 0);
  })();

  return clampStrength(value);
};

const buildPredictions = (
  model: RegressionModelType,
  coefficients: number[],
  target28KgCm2: number,
  predictionAges: number[],
): RegressionPrediction[] => {
  const target = Math.max(0, asFiniteNumber(target28KgCm2));
  const ages = uniqueSortedAges(predictionAges.length ? predictionAges : defaultPredictionAges);

  return ages.map(ageDays => {
    const adjustedKgCm2 = predictStrengthForModel(model, coefficients, ageDays);
    const aciKgCm2 = calculateAciStrength(target, ageDays);

    return {
      ageDays,
      adjustedKgCm2,
      aciKgCm2,
      differenceKgCm2: round(adjustedKgCm2 - aciKgCm2, 2),
      targetPercent: target > 0 ? round((adjustedKgCm2 / target) * 100, 1) : 0,
    };
  });
};

const buildChartData = (
  points: StrengthTestDataPoint[],
  predictor: ((ageDays: number) => number) | null,
  target28KgCm2: number,
  predictionAges: number[] = defaultPredictionAges,
): StrengthChartPoint[] => {
  const measuredByAge = points.reduce<Record<number, { total: number; count: number }>>((acc, point) => {
    const age = Math.max(1, Math.round(asFiniteNumber(point.ageDays, 1)));
    const current = acc[age] || { total: 0, count: 0 };
    acc[age] = {
      total: current.total + Math.max(0, asFiniteNumber(point.strengthKgCm2)),
      count: current.count + 1,
    };
    return acc;
  }, {});

  const maxDataAge = Math.max(
    90,
    ...points.map(point => asFiniteNumber(point.ageDays, 1)),
    ...predictionAges.map(age => asFiniteNumber(age, 1)),
  );
  const ages = uniqueSortedAges([
    ...Array.from({ length: Math.ceil(maxDataAge) }, (_, index) => index + 1),
    ...points.map(point => point.ageDays),
    ...predictionAges,
  ]);

  return ages.map(ageDays => ({
    ageDays,
    aciKgCm2: calculateAciStrength(target28KgCm2, ageDays),
    adjustedKgCm2: predictor ? predictor(ageDays) : null,
    measuredKgCm2: measuredByAge[ageDays] ? round(measuredByAge[ageDays].total / measuredByAge[ageDays].count, 2) : null,
  }));
};

const buildFitWarnings = (
  originalPoints: StrengthTestDataPoint[],
  cleanPoints: StrengthTestDataPoint[],
  model: RegressionModelType,
  predictionAges: number[],
  predictedValues: number[],
): string[] => {
  const warnings: string[] = [];
  const option = getModelOption(model);
  const originalValidAges = (originalPoints || []).filter(point => asFiniteNumber(point.ageDays) > 0).length;

  if (cleanPoints.length < 4) {
    warnings.push('Con menos de 4 ensayos, la regresion debe usarse solo como apoyo preliminar.');
  }

  if (cleanPoints.length < option.requiredPoints + 2 && model.startsWith('polynomial')) {
    warnings.push('El modelo polinomico puede sobreajustarse con pocos puntos de laboratorio.');
  }

  if (cleanPoints.length < originalValidAges && isLogStrengthModel(model)) {
    warnings.push('El modelo descarto resistencias cero o negativas porque usa logaritmos.');
  }

  if (!cleanPoints.some(point => point.ageDays === 28)) {
    warnings.push('No hay ensayo a 28 dias; la comparacion con f\'c debe verificarse en laboratorio.');
  }

  const maxAge = Math.max(...cleanPoints.map(point => point.ageDays), 0);
  const maxPredictionAge = Math.max(...predictionAges, 0);
  if (maxAge > 0 && maxPredictionAge > maxAge * 1.5) {
    warnings.push('Hay predicciones fuera del rango ensayado; tratarlas como extrapolacion.');
  }

  const hasStrengthDrop = cleanPoints.some((point, index) => {
    if (index === 0) return false;
    const previous = cleanPoints[index - 1];
    return point.strengthKgCm2 < previous.strengthKgCm2 * 0.92;
  });

  if (hasStrengthDrop) {
    warnings.push('Los ensayos no son monotonicamente crecientes; revisar curado, dispersion o captura de datos.');
  }

  if (predictedValues.some(value => value <= 0)) {
    warnings.push('El ajuste produjo valores no positivos en algun punto; se limitaron a cero para evitar resultados absurdos.');
  }

  return warnings;
};

const emptyResult = (
  model: RegressionModelType,
  target28KgCm2: number,
  predictionAges: number[],
  message: string,
): StrengthRegressionResult => {
  const option = getModelOption(model);
  const ages = uniqueSortedAges([...predictionAges, ...defaultPredictionAges]);
  const predictions = ages.map(ageDays => {
    const aciKgCm2 = calculateAciStrength(target28KgCm2, ageDays);
    return {
      ageDays,
      adjustedKgCm2: 0,
      aciKgCm2,
      differenceKgCm2: -aciKgCm2,
      targetPercent: 0,
    };
  });

  return {
    model,
    label: option.label,
    valid: false,
    message,
    equation: 'Datos insuficientes',
    r2: 0,
    rmse: 0,
    pointsUsed: 0,
    requiredPoints: option.requiredPoints,
    parameters: { a: 0, b: 0 },
    coefficients: [],
    predictions,
    chartData: buildChartData([], null, target28KgCm2, ages),
    warnings: [message],
  };
};

const fitSimpleModel = (
  cleanPoints: StrengthTestDataPoint[],
  model: RegressionModelType,
): number[] | null => {
  const transformed = cleanPoints.map(point => {
    if (model === 'linear') return { x: point.ageDays, y: point.strengthKgCm2 };
    if (model === 'logarithmic') return { x: Math.log(point.ageDays), y: point.strengthKgCm2 };
    if (model === 'exponential') return { x: point.ageDays, y: Math.log(point.strengthKgCm2) };
    return { x: Math.log(point.ageDays), y: Math.log(point.strengthKgCm2) };
  });

  const fit = linearLeastSquares(
    transformed.map(point => point.x),
    transformed.map(point => point.y),
  );

  if (!fit) return null;

  if (model === 'exponential' || model === 'power') {
    return [Math.exp(fit.intercept), fit.slope];
  }

  return [fit.intercept, fit.slope];
};

const fitPolynomialModel = (
  cleanPoints: StrengthTestDataPoint[],
  degree: 2 | 3,
): number[] | null => polynomialLeastSquares(
  cleanPoints.map(point => point.ageDays),
  cleanPoints.map(point => point.strengthKgCm2),
  degree,
);

export const fitStrengthRegression = (
  points: StrengthTestDataPoint[],
  model: RegressionModelType,
  target28KgCm2: number,
  predictionAges: number[] = defaultPredictionAges,
): StrengthRegressionResult => {
  const option = getModelOption(model);
  const cleanPoints = cleanTestData(points, model);

  if (cleanPoints.length < option.requiredPoints || countUniqueAges(cleanPoints) < option.requiredPoints) {
    return emptyResult(
      model,
      target28KgCm2,
      predictionAges,
      `Se requieren al menos ${option.requiredPoints} edades validas para el modelo ${option.label}.`,
    );
  }

  const coefficients = (() => {
    if (model === 'polynomial2') return fitPolynomialModel(cleanPoints, 2);
    if (model === 'polynomial3') return fitPolynomialModel(cleanPoints, 3);
    return fitSimpleModel(cleanPoints, model);
  })();

  if (!coefficients || coefficients.some(value => !Number.isFinite(value))) {
    return emptyResult(model, target28KgCm2, predictionAges, 'No se pudo ajustar una curva estable con las edades ingresadas.');
  }

  const predictor = (ageDays: number) => predictStrengthForModel(model, coefficients, ageDays);
  const actualValues = cleanPoints.map(point => point.strengthKgCm2);
  const predictedValues = cleanPoints.map(point => predictor(point.ageDays));
  const r2 = round(calculateR2(actualValues, predictedValues), 4);
  const rmse = round(calculateRmse(actualValues, predictedValues), 2);
  const predictions = buildPredictions(model, coefficients, target28KgCm2, predictionAges);
  const warnings = buildFitWarnings(points, cleanPoints, model, predictionAges, predictedValues);

  return {
    model,
    label: option.label,
    valid: true,
    message: warnings.length ? 'Regresion calculada con advertencias tecnicas.' : 'Regresion calculada correctamente.',
    equation: buildEquation(model, coefficients),
    r2,
    rmse,
    pointsUsed: cleanPoints.length,
    requiredPoints: option.requiredPoints,
    parameters: {
      a: round(coefficients[0] || 0, 6),
      b: round(coefficients[1] || 0, 6),
    },
    coefficients: coefficients.map(value => round(value, 8)),
    predictions,
    chartData: buildChartData(cleanPoints, predictor, target28KgCm2, predictionAges),
    warnings,
  };
};

export const fitAllStrengthRegressions = (
  points: StrengthTestDataPoint[],
  target28KgCm2: number,
  predictionAges: number[] = defaultPredictionAges,
): StrengthRegressionResult[] => (
  regressionModelOptions.map(option => fitStrengthRegression(points, option.id, target28KgCm2, predictionAges))
);

const modelComplexity = (model: RegressionModelType): number => {
  if (model === 'polynomial3') return 4;
  if (model === 'polynomial2') return 3;
  return 2;
};

const modelScore = (result: StrengthRegressionResult): number => {
  if (!result.valid) return -Infinity;
  const complexity = modelComplexity(result.model);
  const complexityPenalty = Math.max(0, complexity - 2) * 0.015;
  const lowDataPenalty = result.pointsUsed <= result.requiredPoints + 1 ? 0.035 : 0;
  const errorPenalty = Math.min(0.12, result.rmse / 1000);
  return result.r2 - complexityPenalty - lowDataPenalty - errorPenalty;
};

export const getBestStrengthRegression = (results: StrengthRegressionResult[]): StrengthRegressionResult => {
  const validResults = results.filter(result => result.valid);
  if (!validResults.length) return results[0];

  return [...validResults].sort((a, b) => {
    const scoreDiff = modelScore(b) - modelScore(a);
    if (Math.abs(scoreDiff) > 1e-9) return scoreDiff;
    const rmseDiff = a.rmse - b.rmse;
    if (Math.abs(rmseDiff) > 1e-9) return rmseDiff;
    return modelComplexity(a.model) - modelComplexity(b.model);
  })[0];
};

export const fitBestStrengthRegression = (
  points: StrengthTestDataPoint[],
  target28KgCm2: number,
  predictionAges: number[] = defaultPredictionAges,
): StrengthRegressionResult => getBestStrengthRegression(fitAllStrengthRegressions(points, target28KgCm2, predictionAges));

export const buildStrengthComparisonChartData = (
  results: StrengthRegressionResult[],
  activeResult: StrengthRegressionResult,
): StrengthComparisonChartPoint[] => (
  activeResult.chartData.map(point => {
    const comparisonPoint: StrengthComparisonChartPoint = { ...point };
    results.forEach(result => {
      comparisonPoint[`${result.model}KgCm2`] = result.valid
        ? result.chartData.find(row => row.ageDays === point.ageDays)?.adjustedKgCm2 ?? null
        : null;
    });
    return comparisonPoint;
  })
);

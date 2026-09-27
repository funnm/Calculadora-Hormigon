export interface ProjectInfo {
  responsible: string;
  projectName: string;
  workName: string;
  group: string;
  laboratory: string;
  location: string;
  structuralElement: string;
  concreteUse: string;
  date: string;
  observations: string;
}

export interface DesignRequirements {
  workStrengthKgCm2: number;
  consistency: string;
  slumpMm: number;
  nominalMaxSizeIn: number;
  ageDays: number;
  exposureCondition: string;
  cementType: string;
  concreteType: string;
}

export interface AggregateProperties {
  densitySSD: number;
  absorption: number;
  moisture: number;
  finenessModulus?: number;
  pvsc?: number;
  unitCost?: number; // Costo por kg
  carbonFactor?: number; // kg CO2 por kg de material
}

export interface CementProperties {
  specificGravityGcm3: number;
  unitCost?: number; // Costo por kg (ej. saco 50kg = $8 -> 0.16 $/kg)
  carbonFactor?: number; // kg CO2 por kg
}

export type AdditivePhysicalState = 'Liquid' | 'Solid';
export type AdditiveDosageUnit = 'percentCement' | 'mlPerKgCement' | 'literPerM3' | 'kgPerM3';

export interface Additive {
  id: string;
  enabled?: boolean;
  name: string;
  commercialName?: string;
  type: AdditivePhysicalState; // Estado físico para el balance de volumen.
  additiveType?: string;
  dosagePercent: number; // Compatibilidad: porcentaje respecto al peso del cemento
  dosageValue?: number;
  dosageUnit?: AdditiveDosageUnit;
  density?: number; // kg/m³ para aditivos sólidos heredados
  densityKgL?: number;
  waterReductionPercent?: number;
  observations?: string;
  unitCost?: number; // Costo por kg
  carbonFactor?: number; // kg CO2 por kg
}

export interface MaterialProperties {
  cement: CementProperties;
  sand: AggregateProperties;
  gravel: AggregateProperties;
  aggregateBlend: {
    finePercent: number;
    coarsePercent: number;
  };
  airContent: number;
  additives: Additive[];
}

export interface SieveData {
  size: number | string; // e.g. 32, 16, 'Fondo'
  sandRetained: number;
  gravelRetained: number;
}

export interface SieveAnalysisData {
  data: {
    size: number | string;
    sandRetained: number;
    gravelRetained: number;
  }[];
}

export interface SavedMaterial {
  id: string;
  type: 'cement' | 'sand' | 'gravel';
  name: string;
  properties: CementProperties | AggregateProperties;
}

export interface SieveAnalysis {
  data: SieveData[];
}

export type RegressionModelType =
  | 'linear'
  | 'logarithmic'
  | 'exponential'
  | 'power'
  | 'polynomial2'
  | 'polynomial3';

export interface StrengthTestDataPoint {
  id: string;
  ageDays: number;
  strengthKgCm2: number;
}

export interface RegressionConfiguration {
  selectedModel: RegressionModelType;
  compareAciCurve: boolean;
  targetAgeDays: number;
  predictionAges: number[];
  compareAllModels?: boolean;
}

export interface StrengthRegression {
  testData: StrengthTestDataPoint[];
  config: RegressionConfiguration;
}

export interface StrengthControlSample {
  id: string;
  lot: string;
  ageDays: number;
  strengthKgCm2: number;
}

export interface StrengthControl {
  samples: StrengthControlSample[];
  evaluationAge?: number;
}

export interface ConcreteDesign {
  id: string;
  projectInfo: ProjectInfo;
  designRequirements: DesignRequirements;
  materials: MaterialProperties;
  sieveAnalysis: SieveAnalysis;
  strengthRegression: StrengthRegression;
  strengthControl: StrengthControl;
  status: 'Datos incompletos' | 'Diseño calculado' | 'Corrección por humedad realizada' | 'Diseño final listo';
  labVolumeLiters: number;
}

export interface AppSettings {
  resistanceUnit: 'kg/cm2' | 'MPa';
  volumeUnit: 'L' | 'm3';
  massUnit: 'kg' | 'g';
  reportPaperSize: 'a4' | 'letter';
  defaultLaboratory: string;
  defaultResponsible: string;
  defaultFineAggregatePercent: number;
  defaultCoarseAggregatePercent: number;
  theme: 'light' | 'dark';
}

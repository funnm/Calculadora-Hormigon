import type { AppSettings, ConcreteDesign } from '../types';

export const defaultSettings: AppSettings = {
  resistanceUnit: 'kg/cm2',
  volumeUnit: 'L',
  massUnit: 'kg',
  reportPaperSize: 'a4',
  defaultLaboratory: 'Laboratorio de Materiales',
  defaultResponsible: 'Estudiante',
  defaultFineAggregatePercent: 40,
  defaultCoarseAggregatePercent: 60,
  theme: 'light',
};

export const createNewDesign = (id?: string, settings: AppSettings = defaultSettings): ConcreteDesign => ({
  id: id || Date.now().toString(),
  projectInfo: {
    responsible: settings.defaultResponsible,
    projectName: 'Diseño de hormigón estructural',
    workName: 'Obra de referencia',
    group: settings.defaultLaboratory,
    laboratory: settings.defaultLaboratory,
    location: 'Por definir',
    structuralElement: 'Elemento estructural',
    concreteUse: 'Hormigón estructural',
    date: new Date().toISOString().split('T')[0],
    observations: ''
  },
  designRequirements: {
    workStrengthKgCm2: 180,
    consistency: '75 - 100 mm',
    slumpMm: 75,
    nominalMaxSizeIn: 1.0,
    ageDays: 28,
    exposureCondition: 'Normal',
    cementType: 'Cemento Portland Tipo I',
    concreteType: 'Hormigón estructural'
  },
  materials: {
    cement: {
      specificGravityGcm3: 3.12,
      unitCost: 0.16,
      carbonFactor: 0.90
    },
    sand: {
      densitySSD: 2600,
      absorption: 3,
      moisture: 5,
      finenessModulus: 2.8,
      unitCost: 0.015,
      carbonFactor: 0.005
    },
    gravel: {
      densitySSD: 2650,
      pvsc: 1160,
      absorption: 2,
      moisture: 1,
      unitCost: 0.018,
      carbonFactor: 0.008
    },
    aggregateBlend: {
      finePercent: settings.defaultFineAggregatePercent,
      coarsePercent: settings.defaultCoarseAggregatePercent,
    },
    airContent: 2,
    additives: [
      {
        id: 'sample-plastificante',
        enabled: true,
        name: 'Plastificante de referencia',
        commercialName: 'Plastificante de referencia',
        type: 'Liquid',
        additiveType: 'Plastificante',
        dosagePercent: 0.8,
        dosageValue: 0.8,
        dosageUnit: 'percentCement',
        densityKgL: 1.1,
        density: 1100,
        waterReductionPercent: 8,
        observations: 'Ejemplo base para mezcla de referencia.',
        unitCost: 0,
        carbonFactor: 0
      }
    ]
  },
  sieveAnalysis: {
    data: [
      { size: 32, sandRetained: 0, gravelRetained: 0 },
      { size: 16, sandRetained: 0, gravelRetained: 500 },
      { size: 8, sandRetained: 0, gravelRetained: 1500 },
      { size: 4, sandRetained: 0, gravelRetained: 2500 },
      { size: 2, sandRetained: 200, gravelRetained: 1700 },
      { size: 1, sandRetained: 120, gravelRetained: 0 },
      { size: 0.5, sandRetained: 100, gravelRetained: 0 },
      { size: 0.25, sandRetained: 200, gravelRetained: 0 },
      { size: 0.125, sandRetained: 150, gravelRetained: 0 },
      { size: 0.063, sandRetained: 230, gravelRetained: 0 },
      { size: 'Fondo', sandRetained: 0, gravelRetained: 0 }
    ]
  },
  strengthRegression: {
    testData: [
      { id: 'ensayo-3', ageDays: 3, strengthKgCm2: 82 },
      { id: 'ensayo-7', ageDays: 7, strengthKgCm2: 124 },
      { id: 'ensayo-14', ageDays: 14, strengthKgCm2: 156 },
      { id: 'ensayo-28', ageDays: 28, strengthKgCm2: 186 },
      { id: 'ensayo-56', ageDays: 56, strengthKgCm2: 213 },
      { id: 'ensayo-90', ageDays: 90, strengthKgCm2: 226 }
    ],
    config: {
      selectedModel: 'logarithmic',
      compareAciCurve: true,
      targetAgeDays: 28,
      predictionAges: [3, 7, 14, 21, 28, 56, 90],
      compareAllModels: true
    }
  },
  strengthControl: {
    samples: [
      { id: 'lote-a-1', lot: 'Lote A', ageDays: 28, strengthKgCm2: 184 },
      { id: 'lote-a-2', lot: 'Lote A', ageDays: 28, strengthKgCm2: 188 },
      { id: 'lote-a-3', lot: 'Lote A', ageDays: 28, strengthKgCm2: 181 },
      { id: 'lote-b-1', lot: 'Lote B', ageDays: 28, strengthKgCm2: 176 },
      { id: 'lote-b-2', lot: 'Lote B', ageDays: 28, strengthKgCm2: 182 },
      { id: 'lote-b-3', lot: 'Lote B', ageDays: 28, strengthKgCm2: 179 }
    ],
    evaluationAge: 28,
  },
  status: 'Datos incompletos',
  labVolumeLiters: 10
});

export const normalizeConcreteDesign = (design: Partial<ConcreteDesign>, settings: AppSettings = defaultSettings): ConcreteDesign => {
  const fallback = createNewDesign(design.id || '1', settings);

  return {
    ...fallback,
    ...design,
    projectInfo: {
      ...fallback.projectInfo,
      ...design.projectInfo,
      laboratory: design.projectInfo?.laboratory || design.projectInfo?.group || fallback.projectInfo.laboratory,
    },
    designRequirements: {
      ...fallback.designRequirements,
      ...design.designRequirements,
    },
    materials: {
      ...fallback.materials,
      ...design.materials,
      cement: {
        ...fallback.materials.cement,
        ...design.materials?.cement,
      },
      sand: {
        ...fallback.materials.sand,
        ...design.materials?.sand,
      },
      gravel: {
        ...fallback.materials.gravel,
        ...design.materials?.gravel,
      },
      aggregateBlend: {
        ...fallback.materials.aggregateBlend,
        ...design.materials?.aggregateBlend,
      },
      additives: (design.materials?.additives || fallback.materials.additives).map(additive => ({
        enabled: true,
        additiveType: additive.type === 'Solid' ? 'Otro' : 'Plastificante',
        dosageUnit: 'percentCement' as const,
        dosageValue: additive.dosagePercent,
        densityKgL: additive.density && additive.density > 20 ? additive.density / 1000 : additive.density || 1.1,
        waterReductionPercent: 0,
        ...additive,
      })),
    },
    sieveAnalysis: {
      ...fallback.sieveAnalysis,
      ...design.sieveAnalysis,
      data: design.sieveAnalysis?.data || fallback.sieveAnalysis.data,
    },
    strengthRegression: {
      ...fallback.strengthRegression,
      ...design.strengthRegression,
      testData: design.strengthRegression?.testData || fallback.strengthRegression.testData,
      config: {
        ...fallback.strengthRegression.config,
        ...design.strengthRegression?.config,
        predictionAges: design.strengthRegression?.config?.predictionAges || fallback.strengthRegression.config.predictionAges,
        compareAllModels: design.strengthRegression?.config?.compareAllModels ?? fallback.strengthRegression.config.compareAllModels,
      },
    },
    strengthControl: {
      ...fallback.strengthControl,
      ...design.strengthControl,
      samples: design.strengthControl?.samples || fallback.strengthControl.samples,
      evaluationAge: design.strengthControl?.evaluationAge || fallback.strengthControl.evaluationAge || 28,
    },
  };
};

export const initialConcreteDesign = createNewDesign('1');

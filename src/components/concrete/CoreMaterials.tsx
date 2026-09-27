import React from 'react';
import type { MaterialProperties } from '../../types';
import { Box, Mountain, FlaskConical, Droplets, Info, Beaker, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CoreMaterialsProps {
  materials: MaterialProperties;
}

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatNumber = (value: unknown, digits = 2): string => asNumber(value).toLocaleString('es-EC', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

export const CoreMaterials: React.FC<CoreMaterialsProps> = ({ materials }) => {
  const enabledAdditives = (materials.additives || []).filter(additive => additive.enabled ?? true);
  const finePercent = asNumber(materials.aggregateBlend?.finePercent, 40);
  const coarsePercent = asNumber(materials.aggregateBlend?.coarsePercent, 60);
  const blendTotal = finePercent + coarsePercent;

  const components = [
    {
      title: 'Cemento',
      subtitle: 'Aglomerante principal',
      icon: <FlaskConical className="text-blue-600" size={24} />,
      color: 'border-l-blue-600',
      metrics: [
        { label: 'Densidad relativa', value: formatNumber(materials.cement.specificGravityGcm3, 2), unit: 'g/cm³' },
        { label: 'Peso específico', value: formatNumber(asNumber(materials.cement.specificGravityGcm3, 3.12) * 1000, 0), unit: 'kg/m³' },
        { label: 'Costo', value: formatNumber(materials.cement.unitCost, 3), unit: '$/kg' },
      ],
      valid: asNumber(materials.cement.specificGravityGcm3) > 0,
    },
    {
      title: 'Agua',
      subtitle: 'Agua de mezclado',
      icon: <Droplets className="text-cyan-500" size={24} />,
      color: 'border-l-cyan-500',
      metrics: [
        { label: 'Densidad base', value: '1.000', unit: 'kg/m³' },
        { label: 'Condición', value: 'Potable', unit: '' },
        { label: 'Uso', value: 'Mezcla', unit: '' },
      ],
      valid: true,
    },
    {
      title: 'Arena',
      subtitle: 'Agregado fino',
      icon: <Box className="text-amber-500" size={24} />,
      color: 'border-l-amber-500',
      metrics: [
        { label: 'Densidad SSS', value: formatNumber(materials.sand.densitySSD, 0), unit: 'kg/m³' },
        { label: 'Absorción', value: formatNumber(materials.sand.absorption, 2), unit: '%' },
        { label: 'Humedad', value: formatNumber(materials.sand.moisture, 2), unit: '%' },
        { label: 'Módulo finura', value: formatNumber(materials.sand.finenessModulus, 2), unit: '' },
      ],
      valid: asNumber(materials.sand.densitySSD) > 0 && asNumber(materials.sand.absorption) >= 0 && asNumber(materials.sand.moisture) >= 0,
    },
    {
      title: 'Agregado grueso',
      subtitle: 'Material pétreo retenido',
      icon: <Mountain className="text-slate-500" size={24} />,
      color: 'border-l-slate-500',
      metrics: [
        { label: 'Densidad SSS', value: formatNumber(materials.gravel.densitySSD, 0), unit: 'kg/m³' },
        { label: 'Absorción', value: formatNumber(materials.gravel.absorption, 2), unit: '%' },
        { label: 'Humedad', value: formatNumber(materials.gravel.moisture, 2), unit: '%' },
        { label: 'PVSC', value: formatNumber(materials.gravel.pvsc, 0), unit: 'kg/m³' },
      ],
      valid: asNumber(materials.gravel.densitySSD) > 0 && asNumber(materials.gravel.absorption) >= 0 && asNumber(materials.gravel.moisture) >= 0,
    },
    {
      title: 'Aditivos',
      subtitle: enabledAdditives.length > 0 ? `${enabledAdditives.length} activo(s)` : 'Sin aditivos activos',
      icon: <Beaker className="text-emerald-500" size={24} />,
      color: 'border-l-emerald-500',
      metrics: enabledAdditives.length > 0
        ? enabledAdditives.slice(0, 3).map(additive => ({
          label: additive.additiveType || 'Aditivo',
          value: additive.name,
          unit: additive.dosageUnit === 'percentCement' ? `${formatNumber(additive.dosageValue ?? additive.dosagePercent, 2)}%` : '',
        }))
        : [
          { label: 'Estado', value: 'No configurado', unit: '' },
          { label: 'Impacto', value: 'Sin reducción', unit: '' },
        ],
      valid: true,
    },
  ];

  const validations = [
    { label: 'Densidad de cemento válida', ok: asNumber(materials.cement.specificGravityGcm3) > 0 },
    { label: 'Densidad de arena válida', ok: asNumber(materials.sand.densitySSD) > 0 },
    { label: 'Densidad de agregado grueso válida', ok: asNumber(materials.gravel.densitySSD) > 0 },
    { label: 'Absorciones y humedades no negativas', ok: asNumber(materials.sand.absorption) >= 0 && asNumber(materials.sand.moisture) >= 0 && asNumber(materials.gravel.absorption) >= 0 && asNumber(materials.gravel.moisture) >= 0 },
    { label: 'Reparto arena/agregado grueso suma 100%', ok: Math.abs(blendTotal - 100) < 0.01 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl">
        <h3 className="text-2xl font-black mb-2 tracking-tight">Componentes Base del Diseño</h3>
        <p className="text-slate-400 font-medium">
          Resumen técnico de cemento, agua, arena, agregado grueso y aditivos usados por el motor de cálculo.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {components.map(component => (
          <div key={component.title} className={`pro-card border-l-8 ${component.color} hover:translate-y-[-4px] transition-transform cursor-default`}>
            <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                  {component.icon}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{component.title}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{component.subtitle}</p>
                </div>
              </div>
              {component.valid ? <CheckCircle2 className="text-success shrink-0" size={20} /> : <AlertTriangle className="text-warning shrink-0" size={20} />}
            </div>

            <div className="space-y-5">
              {component.metrics.map(metric => (
                <div key={`${component.title}-${metric.label}`}>
                  <p className="label-tech">{metric.label}</p>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter break-words">{metric.value}</span>
                    {metric.unit && <span className="text-[10px] font-bold text-slate-400 uppercase">{metric.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="pro-card">
          <h4 className="text-xl font-black text-slate-900 dark:text-white mb-6">Reparto de agregados</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <p className="label-tech text-amber-600">Arena</p>
              <p className="text-4xl font-black text-amber-600">{formatNumber(finePercent, 2)}%</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="label-tech">Agregado grueso</p>
              <p className="text-4xl font-black text-slate-700 dark:text-slate-100">{formatNumber(coarsePercent, 2)}%</p>
            </div>
          </div>
        </div>

        <div className="pro-card">
          <h4 className="text-xl font-black text-slate-900 dark:text-white mb-6">Validaciones rápidas</h4>
          <div className="space-y-3">
            {validations.map(validation => (
              <div key={validation.label} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900">
                {validation.ok ? <CheckCircle2 className="text-success" size={18} /> : <AlertTriangle className="text-warning" size={18} />}
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{validation.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pro-card !p-6 flex items-start gap-4 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50">
        <Info size={24} className="text-blue-500 shrink-0 mt-1" />
        <div>
          <h5 className="font-black text-blue-900 dark:text-blue-200 text-sm uppercase tracking-widest mb-1">Información técnica</h5>
          <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed italic">
            Esta sección es una revisión rápida de los componentes permitidos por el diseño: cemento, agua, arena, agregado grueso y aditivos. Las propiedades editables se modifican en Materiales Detalle, Aditivos / Adiciones y Vol. Absoluto.
          </p>
        </div>
      </div>
    </div>
  );
};

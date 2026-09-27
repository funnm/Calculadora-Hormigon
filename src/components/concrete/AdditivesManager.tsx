import React from 'react';
import type { Additive, AdditiveDosageUnit, AdditivePhysicalState, ConcreteDesign } from '../../types';
import {
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateCementContent,
  calculateDesignStrength,
  calculateFinalWater,
  calculateWaterCementRatio,
  calculateWaterContent,
  kgCm2ToMPa,
} from '../../utils/concreteCalculations';
import { AlertCircle, Beaker, FlaskConical, Plus, Save, Trash2 } from 'lucide-react';

interface AdditivesManagerProps {
  design: ConcreteDesign;
  onChange: (field: string, value: unknown) => void;
}

const additiveTypes = [
  'Plastificante',
  'Superplastificante',
  'Retardante',
  'Acelerante',
  'Incorporador de aire',
  'Reductor de agua',
  'Impermeabilizante',
  'Otro',
];

const dosageUnits: Array<{ value: AdditiveDosageUnit; label: string }> = [
  { value: 'percentCement', label: '% del peso del cemento' },
  { value: 'mlPerKgCement', label: 'ml por kg de cemento' },
  { value: 'literPerM3', label: 'L por m³' },
  { value: 'kgPerM3', label: 'kg por m³' },
];

const getUniqueAdditiveId = (additives: Additive[]): string => {
  let index = additives.length + 1;
  let id = `aditivo-${index}`;
  while (additives.some(additive => additive.id === id)) {
    index += 1;
    id = `aditivo-${index}`;
  }
  return id;
};

const numberValue = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const AdditivesManager: React.FC<AdditivesManagerProps> = ({ design, onChange }) => {
  const additives = design.materials.additives || [];
  const tmnMm = design.designRequirements.nominalMaxSizeIn * 25.4;
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, additives);
  const adjustedWaterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(adjustedWaterKg, acRatio);
  const additivesSummary = calculateAdditivesSummary(additives, cementKg);

  const handleAdd = () => {
    const newAdditive: Additive = {
      id: getUniqueAdditiveId(additives),
      enabled: true,
      name: 'Nuevo aditivo',
      commercialName: '',
      type: 'Liquid',
      additiveType: 'Plastificante',
      dosagePercent: 0.8,
      dosageValue: 0.8,
      dosageUnit: 'percentCement',
      densityKgL: 1.1,
      density: 1100,
      waterReductionPercent: 8,
      observations: '',
      unitCost: 0,
      carbonFactor: 0,
    };

    onChange('materials.additives', [...additives, newAdditive]);
  };

  const handleDelete = (id: string) => {
    onChange('materials.additives', additives.filter(additive => additive.id !== id));
  };

  const handlePatch = (id: string, patch: Partial<Additive>) => {
    onChange('materials.additives', additives.map(additive => (
      additive.id === id ? { ...additive, ...patch } : additive
    )));
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="glass-panel p-10 rounded-[3rem] border border-white/10 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
              <FlaskConical className="text-primary" size={32} />
              Módulo de Aditivos
            </h3>
            <p className="label-tech mt-2 text-slate-500">
              Dosificación, volumen absoluto y reducción de agua para aditivos químicos o adiciones.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="pro-btn-primary !px-6"
          >
            <Plus size={20} /> Añadir aditivo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Agua inicial', value: initialWaterKg, unit: 'kg/m³', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { label: 'Reducción por aditivo', value: waterReductionKg, unit: 'kg/m³', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Agua ajustada', value: adjustedWaterKg, unit: 'kg/m³', color: 'text-primary', bg: 'bg-sky-50 dark:bg-sky-900/10' },
          { label: 'Cemento recalculado', value: cementKg, unit: 'kg/m³', color: 'text-slate-700 dark:text-slate-100', bg: 'bg-slate-50 dark:bg-slate-900' },
        ].map(item => (
          <div key={item.label} className={`p-7 rounded-[2rem] border border-slate-100 dark:border-slate-800 ${item.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">{item.label}</p>
            <p className={`text-4xl font-black tracking-tighter ${item.color}`}>{item.value.toFixed(2)}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{item.unit}</p>
          </div>
        ))}
      </div>

      {additives.length === 0 ? (
        <div className="text-center p-16 glass-panel rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700">
          <FlaskConical size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-6" />
          <h4 className="text-2xl font-black text-slate-500 dark:text-slate-400 mb-2">No hay aditivos registrados</h4>
          <p className="text-slate-400 font-medium max-w-sm mx-auto">
            Puedes añadir plastificantes, superplastificantes, retardantes, acelerantes, incorporadores de aire u otros.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {additivesSummary.rows.map(({ additive, massKgM3, volumeLM3, volumeM3, waterReductionPercent }) => (
            <div key={additive.id} className="pro-card border-l-8 border-l-emerald-500">
              <div className="flex flex-col xl:flex-row justify-between gap-8 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-4">
                  <div className={`${additive.enabled ?? true ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'} p-3 rounded-2xl`}>
                    <Beaker size={24} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">{additive.name || 'Aditivo sin nombre'}</h4>
                    <p className="label-tech mt-1">{additive.additiveType || 'Aditivo'} · {additive.type === 'Solid' ? 'Adición sólida' : 'Aditivo líquido'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={additive.enabled ?? true}
                      onChange={event => handlePatch(additive.id, { enabled: event.target.checked })}
                      className="accent-emerald-500"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Usar</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDelete(additive.id)}
                    className="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Eliminar aditivo"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="space-y-2 xl:col-span-2">
                  <label className="label-tech">Nombre comercial</label>
                  <input
                    className="pro-input pro-input-editable"
                    value={additive.name}
                    onChange={event => handlePatch(additive.id, { name: event.target.value, commercialName: event.target.value })}
                    placeholder="Ej. SikaPlast, MasterGlenium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Tipo de aditivo</label>
                  <select
                    className="pro-input pro-input-editable bg-white dark:bg-slate-800"
                    value={additive.additiveType || 'Plastificante'}
                    onChange={event => handlePatch(additive.id, { additiveType: event.target.value })}
                  >
                    {additiveTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Estado</label>
                  <select
                    className="pro-input pro-input-editable bg-white dark:bg-slate-800"
                    value={additive.type}
                    onChange={event => handlePatch(additive.id, { type: event.target.value as AdditivePhysicalState })}
                  >
                    <option value="Liquid">Líquido</option>
                    <option value="Solid">Sólido</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="label-tech text-primary">Dosis recomendada</label>
                  <input
                    type="number"
                    step="0.01"
                    className="pro-input pro-input-editable text-primary font-black"
                    value={additive.dosageValue ?? additive.dosagePercent}
                    onChange={event => {
                      const dosageValue = numberValue(event.target.value);
                      handlePatch(additive.id, { dosageValue, dosagePercent: dosageValue });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Unidad</label>
                  <select
                    className="pro-input pro-input-editable bg-white dark:bg-slate-800"
                    value={additive.dosageUnit ?? 'percentCement'}
                    onChange={event => handlePatch(additive.id, { dosageUnit: event.target.value as AdditiveDosageUnit })}
                  >
                    {dosageUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Densidad</label>
                  <input
                    type="number"
                    step="0.01"
                    className="pro-input pro-input-editable font-black"
                    value={additive.densityKgL ?? 1.1}
                    onChange={event => {
                      const densityKgL = numberValue(event.target.value);
                      handlePatch(additive.id, { densityKgL, density: densityKgL * 1000 });
                    }}
                  />
                  <p className="text-[10px] font-bold text-slate-400">kg/L</p>
                </div>
                <div className="space-y-2">
                  <label className="label-tech text-emerald-600">Reducción de agua</label>
                  <input
                    type="number"
                    step="0.1"
                    max="40"
                    min="0"
                    className="pro-input pro-input-editable text-emerald-600 font-black"
                    value={additive.waterReductionPercent ?? 0}
                    onChange={event => handlePatch(additive.id, { waterReductionPercent: numberValue(event.target.value) })}
                  />
                  <p className="text-[10px] font-bold text-slate-400">% sobre agua inicial</p>
                </div>

                <div className="space-y-2">
                  <label className="label-tech">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    className="pro-input pro-input-editable"
                    value={additive.unitCost ?? 0}
                    onChange={event => handlePatch(additive.id, { unitCost: numberValue(event.target.value) })}
                  />
                  <p className="text-[10px] font-bold text-slate-400">$/kg</p>
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Factor CO₂</label>
                  <input
                    type="number"
                    step="0.01"
                    className="pro-input pro-input-editable"
                    value={additive.carbonFactor ?? 0}
                    onChange={event => handlePatch(additive.id, { carbonFactor: numberValue(event.target.value) })}
                  />
                  <p className="text-[10px] font-bold text-slate-400">kg CO₂/kg</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="label-tech">Observaciones</label>
                  <input
                    className="pro-input pro-input-editable"
                    value={additive.observations ?? ''}
                    onChange={event => handlePatch(additive.id, { observations: event.target.value })}
                    placeholder="Efecto esperado, rango recomendado o nota de proveedor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                {[
                  { label: 'Masa', value: massKgM3, unit: 'kg/m³' },
                  { label: 'Volumen', value: volumeLM3, unit: 'L/m³' },
                  { label: 'Vol. absoluto', value: volumeM3, unit: 'm³/m³' },
                  { label: 'Reducción', value: waterReductionPercent, unit: '%' },
                ].map(metric => (
                  <div key={metric.label} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metric.value.toFixed(metric.unit === '%' ? 1 : 3)}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{metric.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 p-6 glass-panel rounded-2xl border-l-4 border-l-blue-500">
        <AlertCircle size={24} className="text-blue-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Fórmulas aplicadas</p>
          <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
            La dosis puede calcularse por porcentaje del cemento, ml/kg, L/m³ o kg/m³. La reducción total de agua se limita a 40% para evitar valores fuera de rango.
          </p>
        </div>
        <Save className="text-slate-300 ml-auto hidden md:block" size={24} />
      </div>
    </div>
  );
};

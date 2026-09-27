import React from 'react';
import type { ConcreteDesign } from '../../types';
import {
  calculateMoistureCorrection,
  scaleToVolume,
  kgCm2ToMPa,
  calculateDesignStrength,
  calculateWaterContent,
  calculateWaterCementRatio,
  calculateCementContent,
  calculateAggregateVolume,
  solveFullerProportions,
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateFinalWater,
  safeDivide,
  asFiniteNumber
} from '../../utils/concreteCalculations';
import { Droplet, Scale, Beaker, Info, ShieldCheck, AlertTriangle } from 'lucide-react';

interface FinalMixProps {
  design: ConcreteDesign;
  onChange: (field: string, value: unknown) => void;
}

interface BatchItem {
  name: string;
  wet: number;
  lab: number;
  color: string;
  bg: string;
  unit?: string;
}

const hasPositiveValue = (...values: Array<number | undefined>): boolean => (
  values.some((value) => asFiniteNumber(value, 0) > 0)
);

const getSafeLabVolume = (value: unknown): number => {
  const parsed = asFiniteNumber(value, 10);
  if (parsed <= 0) return 10;
  return Math.min(parsed, 1000);
};

export const FinalMix: React.FC<FinalMixProps> = ({ design, onChange }) => {
  // 1. Cálculos Base (Dinámicos)
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const tmnMm = design.designRequirements.nominalMaxSizeIn * 25.4;

  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const designWaterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const initialCementKg = calculateCementContent(designWaterKg, acRatio);

  // 2. Volumen Absoluto de Agregados
  const aggVol = calculateAggregateVolume(
    designWaterKg,
    initialCementKg,
    design.materials.cement.specificGravityGcm3,
    design.materials.airContent || 0,
    design.materials.additives || []
  );

  // 3. Masas Secas de Agregados (Fuller)
  const props = solveFullerProportions(
    design.materials.aggregateBlend?.finePercent,
    design.materials.aggregateBlend?.coarsePercent
  );
  const drySandKg = aggVol * (props.sand / 100) * Math.max(0, asFiniteNumber(design.materials.sand.densitySSD));
  const dryGravelKg = aggVol * (props.gravel / 100) * Math.max(0, asFiniteNumber(design.materials.gravel.densitySSD));

  // 4. Corrección por Humedad
  const sandCorrected = calculateMoistureCorrection(drySandKg, design.materials.sand.moisture, design.materials.sand.absorption);
  const gravelCorrected = calculateMoistureCorrection(dryGravelKg, design.materials.gravel.moisture, design.materials.gravel.absorption);

  // Cálculo de aditivos, costos e impacto ambiental.
  let additivesCost = 0;
  let additivesCO2 = 0;
  const additivesBatch: BatchItem[] = [];
  const additivesSummary = calculateAdditivesSummary(design.materials.additives || [], initialCementKg);
  const labVolume = getSafeLabVolume(design.labVolumeLiters);

  additivesSummary.rows.forEach(({ additive, massKgM3, volumeLM3 }) => {
    additivesCost += massKgM3 * asFiniteNumber(additive.unitCost, 0);
    additivesCO2 += massKgM3 * asFiniteNumber(additive.carbonFactor, 0);

    additivesBatch.push({
      name: additive.name || 'Aditivo',
      wet: massKgM3,
      lab: scaleToVolume(massKgM3, labVolume),
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      unit: volumeLM3 > 0 ? 'kg / L segun densidad' : 'kg'
    });
  });

  const totalWaterContribution = sandCorrected.contribution + gravelCorrected.contribution;
  const finalWaterKg = Math.max(0, designWaterKg - totalWaterContribution);
  const finalSandRatio = safeDivide(sandCorrected.wetMass, initialCementKg);
  const finalGravelRatio = safeDivide(gravelCorrected.wetMass, initialCementKg);
  const finalWaterRatio = safeDivide(finalWaterKg, initialCementKg);
  const waterStatus = totalWaterContribution > 0
    ? 'Los agregados aportan agua: se resta agua de mezcla.'
    : totalWaterContribution < 0
      ? 'Los agregados absorben agua: se adiciona agua de mezcla.'
      : 'Agregados en equilibrio hídrico.';
  const isLabVolumeDefaulted = asFiniteNumber(design.labVolumeLiters, 10) <= 0;

  const batchData: BatchItem[] = [
    { name: 'Agua', wet: finalWaterKg, lab: scaleToVolume(finalWaterKg, labVolume), color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', unit: 'kg ≈ L' },
    { name: 'Cemento', wet: initialCementKg, lab: scaleToVolume(initialCementKg, labVolume), color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800', unit: 'kg' },
    { name: 'Arena', wet: sandCorrected.wetMass, lab: scaleToVolume(sandCorrected.wetMass, labVolume), color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', unit: 'kg húmedos' },
    { name: 'Agregado Grueso', wet: gravelCorrected.wetMass, lab: scaleToVolume(gravelCorrected.wetMass, labVolume), color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800', unit: 'kg húmedos' },
    ...additivesBatch
  ];

  const cementCost = initialCementKg * asFiniteNumber(design.materials.cement.unitCost, 0);
  const sandCost = drySandKg * asFiniteNumber(design.materials.sand.unitCost, 0);
  const gravelCost = dryGravelKg * asFiniteNumber(design.materials.gravel.unitCost, 0);
  const totalCost = cementCost + sandCost + gravelCost + additivesCost;
  const totalCO2 =
    initialCementKg * asFiniteNumber(design.materials.cement.carbonFactor, 0) +
    drySandKg * asFiniteNumber(design.materials.sand.carbonFactor, 0) +
    dryGravelKg * asFiniteNumber(design.materials.gravel.carbonFactor, 0) +
    additivesCO2;
  const hasCostData = hasPositiveValue(
    design.materials.cement.unitCost,
    design.materials.sand.unitCost,
    design.materials.gravel.unitCost,
    ...((design.materials.additives || []).map((additive) => additive.unitCost))
  );
  const hasCarbonData = hasPositiveValue(
    design.materials.cement.carbonFactor,
    design.materials.sand.carbonFactor,
    design.materials.gravel.carbonFactor,
    ...((design.materials.additives || []).map((additive) => additive.carbonFactor))
  );

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <Droplet className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Corrección Hídrica por Agregados</h3>
            <p className="label-tech mt-1">Ajuste de pesos por contenido de humedad y absorción.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
           <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
             <p className="label-tech tracking-[0.25em]">Agua de Diseño</p>
             <p className="text-4xl font-black text-slate-800 dark:text-white">{designWaterKg.toFixed(1)} <span className="text-sm font-bold opacity-40 uppercase">kg/m³</span></p>
             <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Inicial: {initialWaterKg.toFixed(1)} · Reducción: {waterReductionKg.toFixed(1)}</p>
           </div>
           <div className={`p-8 rounded-[2.5rem] border transition-colors ${totalWaterContribution > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/50' : 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/50'}`}>
             <p className={`label-tech tracking-[0.25em] ${totalWaterContribution > 0 ? 'text-red-500' : 'text-green-500'}`}>Aporte de Agregados</p>
             <p className={`text-4xl font-black ${totalWaterContribution > 0 ? 'text-red-600' : 'text-green-600'}`}>
               {totalWaterContribution > 0 ? '-' : '+'}{Math.abs(totalWaterContribution).toFixed(2)} <span className="text-sm font-bold opacity-40 uppercase">kg/m³</span>
             </p>
             <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">{waterStatus}</p>
           </div>
           <div className="p-8 bg-primary dark:bg-primary-dark rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                <Droplet size={60} />
             </div>
             <p className="label-tech text-blue-100 opacity-80 tracking-[0.25em]">Agua de Mezclado</p>
             <p className="text-5xl font-black tracking-tighter">{finalWaterKg.toFixed(1)} <span className="text-sm font-bold opacity-50 uppercase">kg/m³</span></p>
           </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-900 dark:bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-6">Material Componente</th>
                <th className="p-6 text-center border-l border-white/5">Peso Seco</th>
                <th className="p-6 text-center border-l border-white/5">Humedad / Abs.</th>
                <th className="p-6 text-center border-l border-white/5 bg-primary/20">Peso Húmedo</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300 font-bold">
               {[
                 { name: 'Arena', dry: drySandKg, wn: design.materials.sand.moisture, abs: design.materials.sand.absorption, wet: sandCorrected.wetMass, contribution: sandCorrected.contribution },
                 { name: 'Agregado Grueso', dry: dryGravelKg, wn: design.materials.gravel.moisture, abs: design.materials.gravel.absorption, wet: gravelCorrected.wetMass, contribution: gravelCorrected.contribution },
               ].map((m, i) => (
                 <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                   <td className="p-5">{m.name}</td>
                   <td className="p-5 text-center text-slate-400">{m.dry.toFixed(1)}</td>
                   <td className="p-5 text-center">
                      <div className="inline-flex flex-wrap justify-center gap-2">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px]">Wn: {asFiniteNumber(m.wn).toFixed(2)}%</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[10px]">Abs: {asFiniteNumber(m.abs).toFixed(2)}%</span>
                        <span className="bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-[10px] text-blue-600 dark:text-blue-300">Agua: {m.contribution.toFixed(2)} kg</span>
                      </div>
                   </td>
                   <td className="p-5 text-center font-black text-slate-900 dark:text-white text-lg">{m.wet.toFixed(1)}</td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pro-card">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-12 pb-6 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
              <Scale className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Dosificación para Mezcla de Laboratorio</h3>
              <p className="label-tech mt-1">Escalamiento de cantidades por volumen de prueba.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
             <div className="text-right">
                <p className="label-tech mb-0">Volumen Lab</p>
                <p className="text-[10px] font-bold text-slate-400">Capacidad Total</p>
             </div>
             <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  className="w-24 bg-white dark:bg-slate-800 border-2 border-primary/20 rounded-xl p-2 text-center text-xl font-black text-primary outline-none focus:border-primary transition-all"
                  value={labVolume}
                  onChange={(e) => onChange('labVolumeLiters', getSafeLabVolume(e.target.value))}
                />
                <span className="font-black text-slate-400 uppercase tracking-widest text-xs">Litros</span>
             </div>
          </div>
        </div>

        {isLabVolumeDefaulted && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm font-bold leading-relaxed">El volumen de laboratorio guardado era inválido o cero. Se usa 10 L como valor seguro para evitar cantidades no calculables.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
           {batchData.map((item, i) => (
             <div key={i} className="pro-card !p-6 border-none shadow-lg hover:-translate-y-1 transition-all group overflow-hidden relative">
               <div className={`absolute top-0 left-0 w-1 h-full ${item.color.replace('text', 'bg')}`}></div>
               <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${item.color}`}>{item.name}</p>
               <div className="space-y-4">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 mb-1">MÉTRICO (1 m³)</p>
                   <p className="text-xl font-black text-slate-900 dark:text-white">{item.wet.toFixed(1)}</p>
                   <p className="text-[10px] text-slate-400 font-bold mt-1">{item.unit ?? 'kg'}</p>
                 </div>
                 <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                   <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-tighter">CARGA ({labVolume}L)</p>
                   <p className="text-4xl font-black text-primary group-hover:scale-110 transition-transform origin-left">{item.lab.toFixed(3)}</p>
                   <p className="text-[10px] text-slate-400 font-bold mt-1">KILOGRAMOS</p>
                 </div>
               </div>
             </div>
           ))}
        </div>

        <div className="mt-12 p-10 bg-slate-950 text-white rounded-[3rem] relative overflow-hidden group shadow-2xl border border-white/5">
           <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150 transition-transform duration-1000 group-hover:rotate-45">
             <Beaker size={120} />
           </div>
           <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
             <div>
               <div className="flex items-center gap-2 mb-4">
                 <ShieldCheck className="text-success" size={20} />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Proporciones Finales de Obra (Peso)</p>
               </div>
               <p className="text-5xl sm:text-6xl font-black tracking-tighter font-mono italic text-left">
                 1 : <span className="text-amber-500">{finalSandRatio.toFixed(2)}</span> : <span className="text-slate-400">{finalGravelRatio.toFixed(2)}</span> : <span className="text-blue-500">{finalWaterRatio.toFixed(2)}</span>
               </p>
               <div className="mt-6 flex flex-wrap gap-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span>C: 1.00</span>
                  <span>A: {finalSandRatio.toFixed(2)}</span>
                  <span>G: {finalGravelRatio.toFixed(2)}</span>
                  <span>W: {finalWaterRatio.toFixed(2)}</span>
               </div>
             </div>
             <div className="bg-white/5 backdrop-blur-md px-10 py-6 rounded-3xl border border-white/10 text-center">
                <Info className="text-blue-400 mx-auto mb-3" size={24} />
                <p className="text-xs font-bold text-slate-400 max-w-[220px] leading-relaxed italic">Cantidades ajustadas por humedad para dosificación directa en mezcladora.</p>
             </div>
           </div>
        </div>

        {(hasCostData || hasCarbonData) && (
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
            {hasCostData && (
              <div className="p-10 bg-green-50 dark:bg-green-900/10 border-2 border-green-500/20 rounded-[3rem] relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600 dark:text-green-500 mb-2">Estimación de Costo</p>
                  <p className="text-5xl font-black text-slate-900 dark:text-white">${totalCost.toFixed(2)} <span className="text-xl font-bold text-slate-500 uppercase">/ m³</span></p>
                </div>
                <div className="flex gap-6">
                   <div className="text-center">
                     <p className="text-[10px] font-bold text-slate-500 uppercase">Cemento</p>
                     <p className="text-lg font-black text-slate-800 dark:text-slate-200">${cementCost.toFixed(2)}</p>
                   </div>
                   <div className="text-center border-l border-green-500/20 pl-6">
                     <p className="text-[10px] font-bold text-slate-500 uppercase">Agregados & Aditivos</p>
                     <p className="text-lg font-black text-slate-800 dark:text-slate-200">${(sandCost + gravelCost + additivesCost).toFixed(2)}</p>
                   </div>
                </div>
              </div>
            )}

            {hasCarbonData && (
              <div className="p-10 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500/20 rounded-[3rem] relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 mb-2">Huella de Carbono</p>
                   <p className="text-5xl font-black text-slate-900 dark:text-white">
                     {totalCO2.toFixed(1)}
                     <span className="text-xl font-bold text-slate-500 uppercase"> kg CO₂</span>
                   </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 max-w-[150px] leading-relaxed italic">Impacto ambiental estimado por metro cúbico.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
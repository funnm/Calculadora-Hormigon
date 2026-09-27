import React from 'react';
import type { ConcreteDesign } from '../../types';
import {
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateFinalWater,
  calculateMoistureCorrection,
  scaleToVolume,
  kgCm2ToMPa,
  calculateDesignStrength,
  calculateWaterContent,
  calculateWaterCementRatio,
  calculateCementContent,
  calculateAggregateVolume,
  solveFullerProportions,
  safeDivide
} from '../../utils/concreteCalculations';
import { Scale, Beaker, Droplet, Hash, Box, Mountain } from 'lucide-react';

interface CoreDosingProps {
  design: ConcreteDesign;
}

export const CoreDosing: React.FC<CoreDosingProps> = ({ design }) => {
  // 1. Recalcular masas base (1 m3)
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const tmnMm = design.designRequirements.nominalMaxSizeIn * 25.4;
  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const waterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(waterKg, acRatio);

  // Masas secas teóricas (basadas en los porcentajes de Fuller para 1m3)
  const aggVol = calculateAggregateVolume(
    waterKg,
    cementKg,
    design.materials.cement.specificGravityGcm3,
    design.materials.airContent || 0,
    design.materials.additives || []
  );
  
  const props = solveFullerProportions(
    design.materials.aggregateBlend?.finePercent,
    design.materials.aggregateBlend?.coarsePercent
  );
  const drySandKg = aggVol * (props.sand / 100) * design.materials.sand.densitySSD;
  const dryGravelKg = aggVol * (props.gravel / 100) * design.materials.gravel.densitySSD;

  // 2. Aplicar correcciones hídricas individuales
  const sandCorr = calculateMoistureCorrection(drySandKg, design.materials.sand.moisture, design.materials.sand.absorption);
  const gravelCorr = calculateMoistureCorrection(dryGravelKg, design.materials.gravel.moisture, design.materials.gravel.absorption);

  // 3. Agrupar por categorías solicitadas
  const fineAggregateWet = sandCorr.wetMass;
  const coarseAggregateWet = gravelCorr.wetMass;
  
  const additivesSummary = calculateAdditivesSummary(design.materials.additives || [], cementKg);

  const totalWaterContribution = sandCorr.contribution + gravelCorr.contribution;
  const correctedWater = Math.max(0, waterKg - totalWaterContribution);
  const sandRatio = safeDivide(fineAggregateWet, cementKg);
  const gravelRatio = safeDivide(coarseAggregateWet, cementKg);
  const waterRatio = safeDivide(correctedWater, cementKg);

  const labVol = design.labVolumeLiters || 10;

  const summary = [
    { 
      name: 'Cemento', 
      icon: <Hash className="text-blue-600" />, 
      m3: cementKg, 
      lab: scaleToVolume(cementKg, labVol), 
      unit: 'kg', 
      color: 'border-blue-600',
      desc: 'Masa aglomerante sin corrección.' 
    },
    { 
      name: 'Arena (Fino)', 
      icon: <Box className="text-amber-500" />, 
      m3: fineAggregateWet, 
      lab: scaleToVolume(fineAggregateWet, labVol), 
      unit: 'kg', 
      color: 'border-amber-500',
      desc: 'Masa húmeda de arena fina.' 
    },
    { 
      name: 'Agregado Grueso', 
      icon: <Mountain className="text-slate-600" />, 
      m3: coarseAggregateWet, 
      lab: scaleToVolume(coarseAggregateWet, labVol), 
      unit: 'kg', 
      color: 'border-slate-600',
      desc: 'Masa húmeda de agregado grueso.' 
    },
    { 
      name: 'Agua Efectiva', 
      icon: <Droplet className="text-cyan-500" />, 
      m3: correctedWater, 
      lab: scaleToVolume(correctedWater, labVol), 
      unit: 'L/kg', 
      color: 'border-cyan-500',
      desc: 'Volumen corregido por aporte/absorción.' 
    }
  ];

  if (additivesSummary.totalMassKgM3 > 0) {
    summary.splice(3, 0, {
      name: 'Aditivos',
      icon: <Beaker className="text-emerald-500" />,
      m3: additivesSummary.totalMassKgM3,
      lab: scaleToVolume(additivesSummary.totalMassKgM3, labVol),
      unit: 'kg',
      color: 'border-emerald-500',
      desc: 'Suma de masa de aditivos dosificados.'
    });
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
           <Scale size={100} />
        </div>
        <div className="relative z-10">
          <h3 className="text-3xl font-black mb-2 tracking-tighter">Dosificación de Mezcla Simplificada</h3>
          <p className="text-slate-400 font-medium max-w-2xl text-lg">Resumen de materiales críticos agrupados para carga directa en mezcladora o ensayos de laboratorio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {summary.map((item, i) => (
           <div key={i} className={`pro-card border-l-8 ${item.color} group hover:shadow-2xl transition-all duration-500`}>
              <div className="flex justify-between items-start mb-8">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl group-hover:scale-110 transition-transform">
                       {item.icon}
                    </div>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{item.name}</h4>
                 </div>
                 <div className="bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Calculado
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <p className="label-tech text-slate-400">Masa por m³</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{item.m3.toFixed(2)}</span>
                       <span className="text-xs font-bold text-slate-400 uppercase">kg</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="label-tech text-primary font-black">Carga Lab ({labVol}L)</p>
                    <div className="flex items-baseline gap-2">
                       <span className="text-4xl font-black text-primary tracking-tighter">{item.lab.toFixed(3)}</span>
                       <span className="text-xs font-bold text-primary opacity-60 uppercase">{item.unit}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-slate-400 text-xs font-medium italic">
                 {item.desc}
              </div>
           </div>
         ))}
      </div>

      <div className="pro-card bg-primary text-white border-none shadow-2xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-black/10"></div>
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
               <h4 className="text-xs font-black uppercase tracking-[0.4em] text-blue-100 mb-4 opacity-80">Proporción de Obra Agrupada</h4>
               <p className="text-6xl font-black tracking-tighter font-mono italic">
                 1 : {sandRatio.toFixed(2)} : {gravelRatio.toFixed(2)} : {waterRatio.toFixed(2)}
               </p>
               <p className="text-xs font-bold text-blue-200 mt-6 uppercase tracking-widest">Cemento : Arena : Grueso : Agua</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center">
               <Beaker size={48} className="text-white mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Mezcla Homogénea</p>
            </div>
         </div>
      </div>
    </div>
  );
};

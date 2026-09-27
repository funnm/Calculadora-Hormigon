import React from 'react';
import type { ConcreteDesign } from '../../types';
import { 
  calculateDesignStrength, 
  kgCm2ToMPa, 
  calculateWaterContent, 
  calculateWaterCementRatio, 
  calculateCementContent, 
  calculateCementVolume,
  calculateAdditivesWaterReduction,
  calculateFinalWater
} from '../../utils/concreteCalculations';
import { Droplet, FlaskConical, Hash, AlertCircle } from 'lucide-react';

interface WaterCementDesignProps {
  design: ConcreteDesign;
}

export const WaterCementDesign: React.FC<WaterCementDesignProps> = ({ design }) => {
  const { designRequirements } = design;
  const fcMPa = kgCm2ToMPa(designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  
  const tmnMm = designRequirements.nominalMaxSizeIn * 25.4;
  const initialWaterKg = calculateWaterContent(tmnMm, designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const waterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(waterKg, acRatio);
  const cementVol = calculateCementVolume(cementKg, design.materials.cement.specificGravityGcm3);

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="pro-card border-t-8 border-t-blue-500">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl">
              <Droplet className="text-blue-600" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Cálculo de Agua</h3>
              <p className="label-tech mt-1">Estimación según TMN y Asentamiento.</p>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Tamaño Nominal</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{tmnMm.toFixed(1)} mm</span>
            </div>
            
            <div className="text-center p-10 bg-blue-50 dark:bg-blue-900/10 rounded-[3rem] border border-blue-200 dark:border-blue-900 shadow-inner relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 rounded-full"></div>
               <p className="label-tech text-blue-600 dark:text-blue-400 mb-4 tracking-[0.25em]">Masa de Agua Requerida</p>
               <p className="text-7xl font-black text-blue-700 dark:text-blue-300 tracking-tighter">{waterKg.toFixed(1)}</p>
               <p className="text-xs font-black text-blue-400 mt-2 uppercase tracking-widest">kg/m³ o Litros/m³</p>
            </div>
            
            <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <AlertCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
               <p className="text-[11px] text-slate-500 font-medium italic">Valor interpolado: {initialWaterKg.toFixed(1)} kg/m³. Reducción por aditivos: {waterReductionKg.toFixed(1)} kg/m³.</p>
            </div>
          </div>
        </div>

        <div className="pro-card border-t-8 border-t-amber-500">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl">
              <Hash className="text-amber-600" size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Relación Agua/Cemento</h3>
              <p className="label-tech mt-1">Relación por Durabilidad y Resistencia.</p>
            </div>
          </div>
          
          <div className="space-y-8">
            <div className="flex justify-between items-center p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Resistencia Diseño</span>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{fcrMPa.toFixed(2)} MPa</span>
            </div>
            
            <div className="text-center p-10 bg-amber-50 dark:bg-amber-900/10 rounded-[3rem] border border-amber-200 dark:border-amber-900 shadow-inner relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 rounded-full"></div>
               <p className="label-tech text-amber-600 dark:text-amber-400 mb-4 tracking-[0.25em]">Factor A/C</p>
               <p className="text-7xl font-black text-amber-700 dark:text-amber-500 tracking-tighter">{acRatio.toFixed(3)}</p>
               <p className="text-xs font-black text-amber-400 mt-2 uppercase tracking-widest">Adimensional</p>
            </div>

            <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
               <AlertCircle size={18} className="text-slate-400 shrink-0 mt-0.5" />
               <p className="text-[11px] text-slate-500 font-medium italic">Basado en la curva de resistencia media recomendada por el ACI.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pro-card border-l-8 border-l-primary shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 -mr-12 -mt-12 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
          <FlaskConical size={160} />
        </div>
        <div className="flex items-center gap-4 mb-12 pb-6 border-b border-slate-100 dark:border-slate-800 relative z-10">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <FlaskConical className="text-white" size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Contenido Teórico de Cemento</h3>
            <p className="label-tech mt-1">Concentración de aglomerante por metro cúbico.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
          <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 transition-all duration-500">
             <div className="flex justify-between items-start mb-6">
               <p className="label-tech text-primary tracking-[0.3em]">Masa Requerida</p>
               <div className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/10 tracking-widest">KG/M³</div>
             </div>
             <p className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">{cementKg.toFixed(1)}</p>
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold italic">Fórmula: Agua / (A/C)</span>
                <span className="text-xs font-black uppercase">{Math.round(cementKg / 50)} Sacos (50kg)</span>
             </div>
          </div>
          
          <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 group hover:bg-white dark:hover:bg-slate-800 transition-all duration-500">
             <div className="flex justify-between items-start mb-6">
               <p className="label-tech text-slate-400 tracking-[0.3em]">Volumen Absoluto</p>
               <div className="bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 tracking-widest">M³</div>
             </div>
             <p className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">{cementVol.toFixed(4)}</p>
             <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-slate-400">
                <span className="text-xs font-bold italic">Fórmula: Masa / Peso Esp.</span>
                <span className="text-xs font-black uppercase">Ocupación Volumétrica</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

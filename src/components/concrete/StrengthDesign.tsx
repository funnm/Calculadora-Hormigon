import React from 'react';
import type { DesignRequirements } from '../../types';
import { calculateDesignStrength, kgCm2ToMPa, mpaToKgCm2 } from '../../utils/concreteCalculations';
import { Target, ArrowRight, Zap, Calculator } from 'lucide-react';

interface StrengthDesignProps {
  designRequirements: DesignRequirements;
}

export const StrengthDesign: React.FC<StrengthDesignProps> = ({ designRequirements }) => {
  const fcKgCm2 = designRequirements.workStrengthKgCm2;
  const fcMPa = kgCm2ToMPa(fcKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const fcrKgCm2 = mpaToKgCm2(fcrMPa);

  const formulaUsed = fcMPa < 21
    ? "f'cr = f'c + 7.0"
    : fcMPa <= 35
      ? "f'cr = f'c + 8.5"
      : "f'cr = 1.1 * f'c + 5.0";

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in">
      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <Target className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Resistencia Media Requerida</h3>
            <p className="label-tech mt-1">Determinación de f'cr según variabilidad estadística ACI.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <div className="p-10 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-slate-100 dark:border-slate-800 text-center relative group transition-all hover:bg-white dark:hover:bg-slate-800">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <p className="label-tech text-slate-400 mb-4 tracking-[0.25em]">Resistencia Obra (f'c)</p>
            <p className="text-6xl font-black text-slate-800 dark:text-white tracking-tighter">{fcKgCm2.toFixed(1)}</p>
            <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">kg/cm²</p>
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
               <p className="text-xl font-black text-slate-500">{fcMPa.toFixed(2)} MPa</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner">
                <ArrowRight size={32} />
             </div>
             <div className="bg-slate-900 dark:bg-primary px-4 py-2 rounded-xl">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Criterio ACI 318</p>
             </div>
          </div>

          <div className="p-10 bg-primary dark:bg-primary-dark rounded-[3rem] border-none text-center shadow-2xl shadow-primary/30 relative overflow-hidden group hover:scale-[1.02] transition-all">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            <p className="label-tech text-blue-100 mb-4 tracking-[0.25em] opacity-80">Resistencia Diseño (f'cr)</p>
            <p className="text-6xl font-black text-white tracking-tighter">{fcrKgCm2.toFixed(1)}</p>
            <p className="text-xs font-bold text-blue-200 mt-2 uppercase tracking-widest">kg/cm²</p>
            <div className="mt-8 pt-6 border-t border-white/10">
               <p className="text-xl font-black text-white">{fcrMPa.toFixed(2)} MPa</p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-slate-50 dark:bg-slate-950/50 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex items-start gap-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg">
                 <Calculator className="text-primary" size={24} />
              </div>
              <div>
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Ecuación de Cálculo</h4>
                 <p className="text-2xl font-black text-primary font-mono tracking-tighter">{formulaUsed}</p>
                 <p className="text-xs text-slate-500 mt-3 leading-relaxed font-medium">Interpolación aplicada para hormigones de alta variabilidad sin datos previos.</p>
              </div>
           </div>

           <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2.5rem] border border-amber-200 dark:border-amber-900/50 flex items-start gap-6">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg">
                 <Zap className="text-amber-500" size={24} />
              </div>
              <div>
                 <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2">Análisis de Desviación</h4>
                 <p className="text-sm font-bold text-amber-900 dark:text-amber-100 leading-relaxed italic">"El incremento de resistencia garantiza una probabilidad inferior al 1% de que el promedio de 3 cilindros sea menor al f'c especificado."</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

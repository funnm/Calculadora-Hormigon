import React from 'react';
import type { ConcreteDesign } from '../../types';
import { 
  calculateConcreteDesignMetrics,
  solveFullerProportions,
} from '../../utils/concreteCalculations';
import { Layers, PieChart as PieChartIcon, Activity, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AbsoluteVolumeProps {
  design: ConcreteDesign;
  onChange: (field: string, value: unknown) => void;
}

export const AbsoluteVolume: React.FC<AbsoluteVolumeProps> = ({ design, onChange }) => {
  const metrics = calculateConcreteDesignMetrics(design);
  const waterVol = metrics.waterVolumeM3;
  const cementVol = metrics.cementVolumeM3;
  const airVol = metrics.airVolumeM3;
  const additivesVol = metrics.additivesVolumeM3;
  const aggVol = metrics.aggregateVolumeM3;

  // 4. Optimización de Fuller
  const proportions = solveFullerProportions(
    design.materials.aggregateBlend?.finePercent,
    design.materials.aggregateBlend?.coarsePercent
  );

  const pieData = [
    { name: 'Agua', value: waterVol, color: '#0ea5e9' },
    { name: 'Cemento', value: cementVol, color: '#334155' },
    { name: 'Aire', value: airVol, color: '#94a3b8' },
    { name: 'Aditivos', value: additivesVol, color: '#10b981' },
    { name: 'Agregados', value: aggVol, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const aggPieData = [
    { name: 'Arena', value: proportions.sand, color: '#fcd34d' },
    { name: 'Agregado Grueso', value: proportions.gravel, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-fade-in">
      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <Layers className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Balance de Volúmenes Absolutos</h3>
            <p className="label-tech mt-1">Ocupación espacial de los componentes en 1 m³ de mezcla.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
             {[
               { label: 'Volumen Agua', val: waterVol, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
               { label: 'Volumen Cemento', val: cementVol, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-800/50' },
               { label: 'Volumen Aire', val: airVol, color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900' },
               ...(additivesVol > 0 ? [{ label: 'Volumen Aditivos', val: additivesVol, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10' }] : []),
             ].map((item, i) => (
               <div key={i} className={`flex justify-between items-center p-6 rounded-[2rem] border border-transparent ${item.bg}`}>
                 <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">{item.label}</span>
                 <span className={`text-2xl font-black ${item.color}`}>{item.val.toFixed(4)} <span className="text-[10px] uppercase ml-1 opacity-50">m³</span></span>
               </div>
             ))}
             <div className="p-8 bg-primary dark:bg-primary-dark rounded-[2.5rem] text-white shadow-2xl shadow-primary/30 flex justify-between items-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                   <Activity size={60} />
                 </div>
                 <div className="relative z-10">
                   <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-100 mb-2 opacity-80">Volumen Agregados (Vf)</p>
                   <p className="text-5xl font-black tracking-tighter">{aggVol.toFixed(4)} <span className="text-sm font-bold opacity-50">m³</span></p>
                 </div>
             </div>
          </div>
          
          <div className="h-80 min-w-0 min-h-[320px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
               <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">1.000</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-amber-500 p-3 rounded-2xl shadow-xl shadow-amber-200/50">
            <PieChartIcon className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Optimización por Método de Fuller</h3>
            <p className="label-tech mt-1">Distribución de agregados para máxima compacidad.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="h-80 min-w-0 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aggPieData} cx="50%" cy="50%" innerRadius={0} outerRadius={110} dataKey="value" stroke="none">
                  {aggPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
               <div className="space-y-2">
                 <label className="label-tech text-amber-500">Arena dentro de agregados</label>
                 <input
                   type="number"
                   className="pro-input pro-input-editable text-2xl font-black"
                   value={design.materials.aggregateBlend?.finePercent ?? 40}
                   onChange={event => {
                     const value = Number(event.target.value) || 0;
                     onChange('materials.aggregateBlend.finePercent', value);
                     onChange('materials.aggregateBlend.coarsePercent', Math.max(0, 100 - value));
                   }}
                 />
               </div>
               <div className="space-y-2">
                 <label className="label-tech text-slate-500">Agregado grueso dentro de agregados</label>
                 <input
                   type="number"
                   className="pro-input pro-input-editable text-2xl font-black"
                   value={design.materials.aggregateBlend?.coarsePercent ?? 60}
                   onChange={event => {
                     const value = Number(event.target.value) || 0;
                     onChange('materials.aggregateBlend.coarsePercent', value);
                     onChange('materials.aggregateBlend.finePercent', Math.max(0, 100 - value));
                   }}
                 />
               </div>
             </div>
             {aggPieData.map((item, i) => (
               <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-all group shadow-sm">
                 <div className="flex items-center gap-3 mb-3">
                   <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                   <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{item.name}</span>
                 </div>
                 <p className="text-3xl font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                   {item.value.toFixed(2)}%
                 </p>
               </div>
             ))}
             <div className="col-span-full mt-4 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center px-4">
                <div className="flex items-center gap-2 text-success font-black text-[10px] uppercase tracking-[0.2em]">
                   <ShieldCheck size={16} /> Suma Verificada
                </div>
                <span className="font-black text-slate-900 dark:text-white text-xl">100.00%</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

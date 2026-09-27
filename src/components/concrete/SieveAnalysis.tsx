import React from 'react';
import type { SieveAnalysis as SieveAnalysisType } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Filter, Layers } from 'lucide-react';

interface SieveAnalysisProps {
  sieveData: SieveAnalysisType;
  nominalMaxSizeIn: number;
  onChange: (index: number, field: string, value: number) => void;
}

const parseFiniteInput = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const SieveAnalysis: React.FC<SieveAnalysisProps> = ({ sieveData, nominalMaxSizeIn, onChange }) => {
  const nominalMaxSizeMm = nominalMaxSizeIn * 25.4;
  
  const totalSand = sieveData.data.reduce((acc, row) => acc + row.sandRetained, 0);
  const totalGravel = sieveData.data.reduce((acc, row) => acc + row.gravelRetained, 0);

  const processedData: Array<SieveAnalysisType['data'][number] & {
    sizeNum: number;
    sandPass: number;
    gravelPass: number;
    fuller: number;
    sandRetainedAccumulated: number;
    gravelRetainedAccumulated: number;
  }> = sieveData.data.map((row, index) => {
    const accumulatedRows = sieveData.data.slice(0, index + 1);
    const accSand = accumulatedRows.reduce((sum, item) => sum + item.sandRetained, 0);
    const accGravel = accumulatedRows.reduce((sum, item) => sum + item.gravelRetained, 0);
    const sizeNum = typeof row.size === 'number' ? row.size : 0.01;
    return {
      ...row, sizeNum,
      sandRetainedAccumulated: accSand,
      gravelRetainedAccumulated: accGravel,
      sandPass: totalSand ? 100 - (accSand / totalSand) * 100 : 100,
      gravelPass: totalGravel ? 100 - (accGravel / totalGravel) * 100 : 100,
      fuller: typeof row.size === 'number' ? Math.min(100, 100 * Math.sqrt(row.size / nominalMaxSizeMm)) : 0
    };
  });

  const chartData = [...processedData].filter(r => typeof r.size === 'number').reverse();

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <Filter className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Análisis Granulométrico Integral</h3>
            <p className="label-tech mt-1">Determinación de pesos retenidos y porcentajes pasantes.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 shadow-inner bg-slate-50/30 dark:bg-slate-950/20 mb-10">
          <table className="w-full text-sm text-center border-collapse">
            <thead className="bg-slate-900 dark:bg-slate-950 text-white font-black uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-5">Tamiz (mm)</th>
                <th className="p-5 border-l border-white/5">Arena</th>
                <th className="p-5 border-l border-white/5">Agregado Grueso</th>
                <th className="p-5 border-l border-white/5 bg-primary/20">Fuller %</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300 font-bold">
              {processedData.map((row, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 transition-colors">
                  <td className="p-3 bg-slate-100 dark:bg-slate-800/50 font-black text-slate-500">{row.size}</td>
                  <td className="p-3">
                    <input type="number" className="w-full bg-transparent border-none text-center font-black text-slate-900 dark:text-white focus:ring-0" value={row.sandRetained} onChange={(e) => onChange(index, 'sandRetained', parseFiniteInput(e.target.value))} />
                  </td>
                  <td className="p-3 border-l border-slate-50 dark:border-slate-800">
                    <input type="number" className="w-full bg-transparent border-none text-center font-black text-slate-900 dark:text-white focus:ring-0" value={row.gravelRetained} onChange={(e) => onChange(index, 'gravelRetained', parseFiniteInput(e.target.value))} />
                  </td>
                  <td className="p-3 font-black text-primary bg-primary/5">{row.fuller.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                <td className="p-5">Totales (g)</td>
                <td className="p-5 border-l border-white/5">{totalSand}</td>
                <td className="p-5 border-l border-white/5">{totalGravel}</td>
                <td className="p-5 border-l border-white/5">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pro-card !p-10 bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 relative">
           <div className="flex justify-between items-center mb-10">
              <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                 <Layers size={20} className="text-primary" /> Curvas Granulométricas y Parábola de Fuller
              </h4>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-3 h-3 bg-primary rounded-full"></div><span className="text-[10px] font-black uppercase text-slate-400">Fuller Ideal</span></div>
              </div>
           </div>
           <div className="h-[450px] w-full min-w-0 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" />
                <XAxis dataKey="size" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px' }} />
                <Line type="monotone" dataKey="sandPass" name="Arena" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="gravelPass" name="Agregado Grueso" stroke="#64748b" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="fuller" name="Línea de Fuller" stroke="#0ea5e9" strokeWidth={6} strokeDasharray="10 10" dot={false} />
              </LineChart>
            </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

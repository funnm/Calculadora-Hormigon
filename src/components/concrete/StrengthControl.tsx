import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import type { DesignRequirements, StrengthControl as StrengthControlData, StrengthControlSample } from '../../types';
import { calculateStrengthControl, type StrengthControlStatus } from '../../utils/strengthControl';

interface StrengthControlProps {
  designRequirements: DesignRequirements;
  control: StrengthControlData;
  onChange: (field: string, value: unknown) => void;
}

const numberValue = (value: string, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createSampleId = (samples: StrengthControlSample[]): string => {
  let index = samples.length + 1;
  let id = `control-${index}`;
  while (samples.some(sample => sample.id === id)) {
    index += 1;
    id = `control-${index}`;
  }
  return id;
};

const statusLabel: Record<StrengthControlStatus, string> = {
  accepted: 'Aceptado',
  observed: 'Observado',
  rejected: 'Rechazado',
};

const statusClass: Record<StrengthControlStatus, string> = {
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:border-emerald-900/40',
  observed: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/10 dark:text-amber-300 dark:border-amber-900/40',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-300 dark:border-red-900/40',
};

const statusIcon = (status: StrengthControlStatus) => (
  status === 'accepted' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />
);

export const StrengthControl: React.FC<StrengthControlProps> = ({ designRequirements, control, onChange }) => {
  const samples = control.samples || [];
  const evaluationAge = control.evaluationAge || 28;
  const targetKgCm2 = Math.max(0, Number(designRequirements.workStrengthKgCm2) || 0);
  const result = calculateStrengthControl(samples, targetKgCm2, evaluationAge);

  const updateSamples = (nextSamples: StrengthControlSample[]) => {
    onChange('strengthControl.samples', nextSamples);
  };

  const handleAddSample = () => {
    const lastLot = samples.at(-1)?.lot || 'Lote A';
    updateSamples([
      ...samples,
      {
        id: createSampleId(samples),
        lot: lastLot,
        ageDays: evaluationAge,
        strengthKgCm2: targetKgCm2,
      },
    ]);
  };

  const handlePatchSample = (id: string, patch: Partial<StrengthControlSample>) => {
    updateSamples(samples.map(sample => (sample.id === id ? { ...sample, ...patch } : sample)));
  };

  const handleDeleteSample = (id: string) => {
    updateSamples(samples.filter(sample => sample.id !== id));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
          <ClipboardCheck size={130} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200 mb-3">Control estadistico</p>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Resistencia por lotes</h3>
            <p className="text-slate-400 font-medium max-w-2xl mt-3">
              Promedio, dispersion, coeficiente de variacion, resistencia minima y cumplimiento del f'c por lote.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 self-start lg:self-center">
            <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Edad de evaluacion</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  className="bg-transparent text-2xl font-black text-white w-20 outline-none border-b border-white/20 focus:border-white transition-colors"
                  value={evaluationAge}
                  onChange={e => onChange('strengthControl.evaluationAge', numberValue(e.target.value, 28))}
                />
                <span className="text-sm font-bold text-slate-500 uppercase">dias</span>
              </div>
            </div>
            <div className={`rounded-2xl border px-5 py-4 ${statusClass[result.status]}`}>
              <div className="flex items-center gap-3">
                {statusIcon(result.status)}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Estado global</p>
                  <p className="text-2xl font-black">{statusLabel[result.status]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {[
          { label: 'Promedio', value: result.averageKgCm2.toFixed(1), unit: `kg/cm2 (${result.evaluationAge}d)` },
          { label: 'Desv. estandar', value: result.standardDeviationKgCm2.toFixed(2), unit: 'kg/cm2' },
          { label: 'Coef. variacion', value: result.coefficientVariationPercent.toFixed(2), unit: '%' },
          { label: 'Resistencia minima', value: result.minimumKgCm2.toFixed(1), unit: 'kg/cm2' },
          { label: 'Lotes evaluados', value: String(result.lotCount), unit: `${result.sampleCount} de ${result.totalSamples} ensayos` },
        ].map(metric => (
          <div key={metric.label} className="pro-card !p-6">
            <p className="label-tech">{metric.label}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{metric.value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{metric.unit}</p>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <section className="pro-card !p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-300 shrink-0 mt-1" size={22} />
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Advertencias de control</h4>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.warnings.slice(0, 6).map(warning => (
                  <p key={warning} className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/40 text-xs font-bold text-slate-700 dark:text-slate-200">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-5 pro-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Ensayos por lote</h4>
              <p className="label-tech mt-1">Ingreso de resistencia a compresion</p>
            </div>
            <button type="button" onClick={handleAddSample} className="pro-btn-primary !px-5 !py-3">
              <Plus size={18} /> Agregar
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="p-4">Lote</th>
                  <th className="p-4">Edad</th>
                  <th className="p-4">Resistencia</th>
                  <th className="p-4 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {samples.length === 0 && (
                  <tr className="bg-white/40 dark:bg-slate-950/20">
                    <td colSpan={4} className="p-5 text-center text-sm font-bold text-slate-500">
                      Agrega ensayos para calcular el control estadistico.
                    </td>
                  </tr>
                )}
                {samples.map(sample => (
                  <tr key={sample.id} className="bg-white/40 dark:bg-slate-950/20">
                    <td className="p-3 min-w-[150px]">
                      <input
                        className="pro-input pro-input-editable !p-3 text-base"
                        value={sample.lot}
                        onChange={event => handlePatchSample(sample.id, { lot: event.target.value })}
                      />
                    </td>
                    <td className="p-3 min-w-[115px]">
                      <input
                        type="number"
                        min="1"
                        className="pro-input pro-input-editable !p-3 text-base"
                        value={sample.ageDays}
                        onChange={event => handlePatchSample(sample.id, { ageDays: numberValue(event.target.value, 28) })}
                      />
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">dias</p>
                    </td>
                    <td className="p-3 min-w-[155px]">
                      <input
                        type="number"
                        min="0"
                        className="pro-input pro-input-editable !p-3 text-base font-black text-primary"
                        value={sample.strengthKgCm2}
                        onChange={event => handlePatchSample(sample.id, { strengthKgCm2: numberValue(event.target.value) })}
                      />
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">kg/cm2</p>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSample(sample.id)}
                        className="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar ensayo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-7 pro-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Grafico de control</h4>
              <p className="label-tech mt-1">Lineas f'c, 90%, 85% y limites estadisticos</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <p className="label-tech mb-1">f'c</p>
              <p className="text-2xl font-black text-primary">{result.targetKgCm2.toFixed(0)} kg/cm2</p>
            </div>
          </div>

          <div className="h-[430px] min-w-0 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.chartData} margin={{ top: 20, right: 24, left: 8, bottom: 28 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" />
                <XAxis
                  dataKey="sequence"
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Ensayo', position: 'insideBottom', offset: -16, fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "f'c (kg/cm2)", angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff', fontWeight: 'bold', padding: '14px' }}
                  formatter={(value, name) => [`${Number(value).toFixed(1)} kg/cm2`, name]}
                  labelFormatter={(label) => `Ensayo ${label}`}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '24px' }} />
                <ReferenceLine y={result.targetKgCm2} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'top', value: "f'c", fill: '#10b981', fontSize: 12, fontWeight: 800 }} />
                <ReferenceLine y={result.targetKgCm2 * 0.9} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={2} />
                <ReferenceLine y={result.targetKgCm2 * 0.85} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} />
                <Line type="monotone" dataKey="strengthKgCm2" name="Ensayos" stroke="#0f172a" strokeWidth={4} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="meanKgCm2" name="Promedio" stroke="#2563eb" strokeWidth={2.5} dot={false} strokeDasharray="8 8" />
                <Line type="monotone" dataKey="upperControlLimitKgCm2" name="LCS" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="3 5" />
                <Line type="monotone" dataKey="lowerControlLimitKgCm2" name="LCI" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="3 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="pro-card">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-primary" size={24} />
          <h4 className="text-xl font-black text-slate-900 dark:text-white">Resumen por lote</h4>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm text-center">
            <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
              <tr>
                <th className="p-4">Lote</th>
                <th className="p-4">Ensayos</th>
                <th className="p-4">Promedio</th>
                <th className="p-4">Desv.</th>
                <th className="p-4">CV</th>
                <th className="p-4">Minima</th>
                <th className="p-4">Cumplimiento</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.lots.map(lot => (
                <tr key={lot.lot} className="bg-white/40 dark:bg-slate-950/20">
                  <td className="p-4 font-black text-slate-900 dark:text-white">{lot.lot}</td>
                  <td className="p-4 font-bold text-slate-500">{lot.sampleCount}</td>
                  <td className="p-4 font-black text-primary">{lot.averageKgCm2.toFixed(1)}</td>
                  <td className="p-4 font-bold text-slate-500">{lot.standardDeviationKgCm2.toFixed(2)}</td>
                  <td className="p-4 font-bold text-slate-500">{lot.coefficientVariationPercent.toFixed(2)}%</td>
                  <td className="p-4 font-black text-slate-900 dark:text-white">{lot.minimumKgCm2.toFixed(1)}</td>
                  <td className="p-4 font-black text-slate-700 dark:text-slate-200">{lot.compliancePercent.toFixed(1)}%</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-2xl border text-xs font-black ${statusClass[lot.status]}`}>
                      {statusIcon(lot.status)}
                      {statusLabel[lot.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

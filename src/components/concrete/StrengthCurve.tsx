import React from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DesignRequirements, RegressionConfiguration, RegressionModelType, StrengthRegression, StrengthTestDataPoint } from '../../types';
import {
  buildStrengthComparisonChartData,
  defaultPredictionAges,
  fitAllStrengthRegressions,
  fitStrengthRegression,
  getBestStrengthRegression,
  regressionModelOptions,
} from '../../utils/regressionCalculations';
import { AlertTriangle, BarChart3, CheckCircle2, Plus, Trash2, TrendingUp } from 'lucide-react';

interface StrengthCurveProps {
  designRequirements: DesignRequirements;
  regression: StrengthRegression;
  onChange: (field: string, value: unknown) => void;
}

const numberValue = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createPointId = (points: StrengthTestDataPoint[]): string => {
  let index = points.length + 1;
  let id = `ensayo-${index}`;
  while (points.some(point => point.id === id)) {
    index += 1;
    id = `ensayo-${index}`;
  }
  return id;
};

const severityClass = (isOk: boolean): string => (
  isOk
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/10 dark:text-emerald-300 dark:border-emerald-900/50'
    : 'bg-white text-slate-950 border-slate-300 dark:bg-slate-900 dark:text-white dark:border-slate-700'
);

const modelColors: Record<RegressionModelType, string> = {
  linear: '#0f172a',
  logarithmic: '#2563eb',
  exponential: '#059669',
  power: '#7c3aed',
  polynomial2: '#ea580c',
  polynomial3: '#be123c',
};

const parsePredictionAges = (value: string): number[] => {
  const ages = value
    .split(/[,\s;]+/)
    .map(item => Math.round(Number(item)))
    .filter(age => Number.isFinite(age) && age > 0 && age <= 365);

  return Array.from(new Set(ages)).sort((a, b) => a - b);
};

export const StrengthCurve: React.FC<StrengthCurveProps> = ({ designRequirements, regression, onChange }) => {
  const fc28 = Math.max(0, Number(designRequirements.workStrengthKgCm2) || 0);
  const testData = regression.testData || [];
  const config: RegressionConfiguration = {
    selectedModel: regression.config?.selectedModel || 'power',
    compareAciCurve: regression.config?.compareAciCurve ?? true,
    targetAgeDays: regression.config?.targetAgeDays || 28,
    predictionAges: regression.config?.predictionAges?.length ? regression.config.predictionAges : defaultPredictionAges,
    compareAllModels: regression.config?.compareAllModels ?? true,
  };
  const result = fitStrengthRegression(testData, config.selectedModel, fc28, config.predictionAges);
  const allResults = fitAllStrengthRegressions(testData, fc28, config.predictionAges);
  const bestResult = getBestStrengthRegression(allResults);
  const comparisonChartData = buildStrengthComparisonChartData(allResults, result);
  const prediction28 = result.predictions.find(prediction => prediction.ageDays === 28);
  const bestPrediction28 = bestResult.predictions.find(prediction => prediction.ageDays === 28);
  const passesTarget = Boolean(prediction28 && prediction28.adjustedKgCm2 >= fc28);

  const updateConfig = (patch: Partial<RegressionConfiguration>) => {
    onChange('strengthRegression.config', { ...config, ...patch });
  };

  const updateRows = (rows: StrengthTestDataPoint[]) => {
    onChange('strengthRegression.testData', rows);
  };

  const handleAddRow = () => {
    const lastAge = testData.length ? Math.max(...testData.map(point => Number(point.ageDays) || 0)) : 0;
    const nextStandardAge = [3, 7, 14, 28, 56, 90].find(age => !testData.some(point => Number(point.ageDays) === age));
    updateRows([
      ...testData,
      {
        id: createPointId(testData),
        ageDays: nextStandardAge || Math.max(1, lastAge + 7),
        strengthKgCm2: fc28,
      },
    ]);
  };

  const handlePatchRow = (id: string, patch: Partial<StrengthTestDataPoint>) => {
    updateRows(testData.map(point => (point.id === id ? { ...point, ...patch } : point)));
  };

  const handleDeleteRow = (id: string) => {
    updateRows(testData.filter(point => point.id !== id));
  };

  const chartData = result.chartData;
  const displayChartData = config.compareAllModels ? comparisonChartData : chartData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200 mb-3">Regresion de Resistencia</p>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight">Curva ajustada por ensayos</h3>
            <p className="text-slate-400 font-medium max-w-2xl mt-3">
              Comparacion entre datos reales de laboratorio, curva ACI teorica y modelos estadisticos de resistencia.
            </p>
          </div>
          <div className={`rounded-2xl border px-5 py-4 self-start ${severityClass(passesTarget)}`}>
            <div className="flex items-center gap-3">
              {passesTarget ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Prediccion a 28 dias</p>
                <p className="text-2xl font-black">
                  {prediction28 ? prediction28.adjustedKgCm2.toFixed(1) : '0.0'} kg/cm2
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!passesTarget && prediction28 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-start gap-4">
          <AlertTriangle className="text-slate-900 dark:text-white shrink-0 mt-1" size={24} />
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Advertencia tecnica</h4>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
              La curva ajustada predice {prediction28.adjustedKgCm2.toFixed(1)} kg/cm2 a 28 dias, por debajo del objetivo de {fc28.toFixed(1)} kg/cm2.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="pro-card !p-6 border-l-8 border-l-slate-900 dark:border-l-white">
          <p className="label-tech">Mejor modelo recomendado</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{bestResult.label}</p>
          <p className="text-xs font-bold text-slate-500 mt-2">
            R2 {bestResult.r2.toFixed(4)} | RMSE {bestResult.rmse.toFixed(2)} kg/cm2
          </p>
        </div>
        <div className="pro-card !p-6">
          <p className="label-tech">Prediccion recomendada a 28 dias</p>
          <p className="text-3xl font-black text-primary">
            {bestPrediction28 ? bestPrediction28.adjustedKgCm2.toFixed(1) : '0.0'} kg/cm2
          </p>
          <p className="text-xs font-bold text-slate-500 mt-2">Modelo {bestResult.label}</p>
        </div>
        <div className="pro-card !p-6">
          <p className="label-tech">Calidad de datos</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{result.pointsUsed}</p>
          <p className="text-xs font-bold text-slate-500 mt-2">
            {result.pointsUsed < 4 ? 'Pocos datos para una recomendacion definitiva.' : 'Datos suficientes para comparar modelos.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-5 pro-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Datos de ensayo</h4>
              <p className="label-tech mt-1">Edad y resistencia a compresion</p>
            </div>
            <button type="button" onClick={handleAddRow} className="pro-btn-primary !px-5 !py-3">
              <Plus size={18} /> Agregar
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="p-4">Edad</th>
                  <th className="p-4">Resistencia</th>
                  <th className="p-4 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {testData.length === 0 && (
                  <tr className="bg-white/40 dark:bg-slate-950/20">
                    <td colSpan={3} className="p-5 text-center text-sm font-bold text-slate-500">
                      Agrega al menos dos ensayos para calcular regresiones.
                    </td>
                  </tr>
                )}
                {testData.map(point => (
                  <tr key={point.id} className="bg-white/40 dark:bg-slate-950/20">
                    <td className="p-3 min-w-[130px]">
                      <input
                        type="number"
                        min="1"
                        className="pro-input pro-input-editable !p-3 text-base"
                        value={point.ageDays}
                        onChange={event => handlePatchRow(point.id, { ageDays: numberValue(event.target.value) })}
                      />
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">dias</p>
                    </td>
                    <td className="p-3 min-w-[160px]">
                      <input
                        type="number"
                        min="0"
                        className="pro-input pro-input-editable !p-3 text-base font-black text-primary"
                        value={point.strengthKgCm2}
                        onChange={event => handlePatchRow(point.id, { strengthKgCm2: numberValue(event.target.value) })}
                      />
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">kg/cm2</p>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(point.id)}
                        className="p-3 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar fila"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-tech">Modelo activo</label>
              <select
                className="pro-input pro-input-editable bg-white dark:bg-slate-800"
                value={config.selectedModel}
                onChange={event => updateConfig({ selectedModel: event.target.value as RegressionModelType })}
              >
                {regressionModelOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer self-end">
              <input
                type="checkbox"
                className="accent-slate-900"
                checked={config.compareAciCurve}
                onChange={event => updateConfig({ compareAciCurve: event.target.checked })}
              />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Comparar ACI</span>
            </label>
            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                className="accent-slate-900"
                checked={config.compareAllModels}
                onChange={event => updateConfig({ compareAllModels: event.target.checked })}
              />
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">Mostrar todas las curvas</span>
            </label>
            <div className="sm:col-span-2">
              <label className="label-tech">Edades de prediccion</label>
              <input
                key={config.predictionAges.join('-')}
                className="pro-input pro-input-editable bg-white dark:bg-slate-800"
                defaultValue={config.predictionAges.join(', ')}
                onBlur={event => {
                  const ages = parsePredictionAges(event.target.value);
                  updateConfig({ predictionAges: ages.length ? ages : defaultPredictionAges });
                }}
                placeholder="3, 7, 14, 28, 56, 90"
              />
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Separar por coma, espacio o punto y coma.</p>
            </div>
          </div>
        </section>

        <section className="xl:col-span-7 pro-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white">Grafico comparativo</h4>
              <p className="label-tech mt-1">{result.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[260px]">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="label-tech mb-1">R2</p>
                <p className="text-2xl font-black text-primary">{result.r2.toFixed(4)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="label-tech mb-1">RMSE</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{result.rmse.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="h-[430px] min-w-0 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={displayChartData} margin={{ top: 20, right: 22, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#cbd5e1" />
                <XAxis
                  dataKey="ageDays"
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 800 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Edad (dias)', position: 'insideBottom', offset: -14, fill: '#64748b', fontSize: 12, fontWeight: 800 }}
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
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '24px' }} />
                <ReferenceLine y={fc28} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'top', value: 'Objetivo 28 dias', fill: '#10b981', fontSize: 12, fontWeight: 800 }} />
                {config.compareAciCurve && (
                  <Line type="monotone" dataKey="aciKgCm2" name="ACI teorica" stroke="#64748b" strokeWidth={3} strokeDasharray="8 8" dot={false} />
                )}
                {config.compareAllModels ? allResults.filter(modelResult => modelResult.valid).map(modelResult => (
                  <Line
                    key={modelResult.model}
                    type="monotone"
                    dataKey={`${modelResult.model}KgCm2`}
                    name={`${modelResult.label}${modelResult.model === bestResult.model ? ' (mejor)' : ''}`}
                    stroke={modelColors[modelResult.model]}
                    strokeWidth={modelResult.model === config.selectedModel ? 4 : 2.5}
                    strokeDasharray={modelResult.model === bestResult.model ? undefined : '5 5'}
                    dot={false}
                    connectNulls
                  />
                )) : (
                  <Line type="monotone" dataKey="adjustedKgCm2" name={`Regresion ${result.label}`} stroke="#0f172a" strokeWidth={4} dot={false} connectNulls />
                )}
                <Scatter dataKey="measuredKgCm2" name="Ensayos" fill="#0ea5e9" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-1 pro-card">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-primary" size={24} />
            <h4 className="text-xl font-black text-slate-900 dark:text-white">Ecuacion ajustada</h4>
          </div>
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <p className="text-xl font-black text-primary font-mono break-words">{result.equation}</p>
            <p className="text-xs font-bold text-slate-500 mt-4">
              Modelo: {result.label}. R2={result.r2.toFixed(4)}. RMSE={result.rmse.toFixed(2)} kg/cm2.
            </p>
          </div>

          {result.warnings.length > 0 && (
            <div className="mt-5 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-300" size={18} />
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                  {result.warnings.length} advertencias de regresion
                </p>
              </div>
              <div className="space-y-3">
              {result.warnings.map(warning => (
                <div key={warning} className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-100 dark:border-amber-900/40 flex gap-3">
                  <AlertTriangle className="text-amber-600 dark:text-amber-300 shrink-0" size={18} />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{warning}</p>
                </div>
              ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {allResults.map(modelResult => (
              <button
                key={modelResult.model}
                type="button"
                onClick={() => updateConfig({ selectedModel: modelResult.model })}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${modelResult.model === config.selectedModel ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-primary/40'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">{modelResult.label}</span>
                  <span className="text-xs font-black">
                    {modelResult.valid ? `R2 ${modelResult.r2.toFixed(4)} | RMSE ${modelResult.rmse.toFixed(2)}` : 'Sin datos'}
                  </span>
                </div>
                {modelResult.model === bestResult.model && (
                  <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-70">Modelo recomendado</p>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="xl:col-span-2 pro-card">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="text-primary" size={24} />
            <h4 className="text-xl font-black text-slate-900 dark:text-white">Predicciones tecnicas</h4>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-sm text-center">
              <thead className="bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black">
                <tr>
                  <th className="p-4">Edad</th>
                  <th className="p-4">Regresion</th>
                  <th className="p-4">ACI</th>
                  <th className="p-4">Diferencia</th>
                  <th className="p-4">% Objetivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.predictions.map(prediction => (
                  <tr key={prediction.ageDays} className={prediction.ageDays === 28 && prediction.adjustedKgCm2 < fc28 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-white/40 dark:bg-slate-950/20'}>
                    <td className="p-4 font-black text-slate-900 dark:text-white">{prediction.ageDays} d</td>
                    <td className="p-4 font-black text-primary">{prediction.adjustedKgCm2.toFixed(1)}</td>
                    <td className="p-4 font-bold text-slate-500">{prediction.aciKgCm2.toFixed(1)}</td>
                    <td className={`p-4 font-black ${prediction.differenceKgCm2 >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {prediction.differenceKgCm2 >= 0 ? '+' : ''}{prediction.differenceKgCm2.toFixed(1)}
                    </td>
                    <td className="p-4 font-black text-slate-700 dark:text-slate-200">{prediction.targetPercent.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

import React from 'react';
import type { ConcreteDesign } from '../../types';
import {
  calculateAdditivesSummary,
  calculateAdditivesWaterReduction,
  calculateCementContent,
  calculateDesignStrength,
  calculateFinalWater,
  calculateWaterCementRatio,
  calculateWaterContent,
  kgCm2ToMPa,
  validateConcreteDesign,
} from '../../utils/concreteCalculations';
import { fitAllStrengthRegressions, fitStrengthRegression, getBestStrengthRegression } from '../../utils/regressionCalculations';
import { calculateStrengthControl } from '../../utils/strengthControl';
import { AlertTriangle, BarChart3, ClipboardCheck, FileDown, FileSpreadsheet, FileText, ShieldCheck, TrendingUp } from 'lucide-react';

interface ReportPageProps {
  design: ConcreteDesign;
  onGeneratePDF: () => void;
  onExportExcel: () => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ design, onGeneratePDF, onExportExcel }) => {
  const fcMPa = kgCm2ToMPa(design.designRequirements.workStrengthKgCm2);
  const fcrMPa = calculateDesignStrength(fcMPa);
  const tmnMm = design.designRequirements.nominalMaxSizeIn * 25.4;
  const initialWaterKg = calculateWaterContent(tmnMm, design.designRequirements.slumpMm);
  const waterReductionKg = calculateAdditivesWaterReduction(initialWaterKg, design.materials.additives || []);
  const finalWaterKg = calculateFinalWater(initialWaterKg, waterReductionKg);
  const acRatio = calculateWaterCementRatio(fcrMPa);
  const cementKg = calculateCementContent(finalWaterKg, acRatio);
  const additivesSummary = calculateAdditivesSummary(design.materials.additives || [], cementKg);
  const regression = fitStrengthRegression(
    design.strengthRegression.testData,
    design.strengthRegression.config.selectedModel,
    design.designRequirements.workStrengthKgCm2,
    design.strengthRegression.config.predictionAges,
  );
  const regressionResults = fitAllStrengthRegressions(
    design.strengthRegression.testData,
    design.designRequirements.workStrengthKgCm2,
    design.strengthRegression.config.predictionAges,
  );
  const bestRegression = getBestStrengthRegression(regressionResults);
  const prediction28 = regression.predictions.find(prediction => prediction.ageDays === 28);
  const bestPrediction28 = bestRegression.predictions.find(prediction => prediction.ageDays === 28);
  const strengthControl = calculateStrengthControl(
    design.strengthControl.samples,
    design.designRequirements.workStrengthKgCm2,
  );
  const warnings = validateConcreteDesign(design);

  const reportSections = [
    'Portada y datos generales',
    'Propiedades de materiales',
    'Resistencia especificada y f\'cr',
    'Agua inicial y reducción por aditivos',
    'Relación agua/cemento y cemento',
    'Volumen absoluto',
    'Corrección por humedad',
    'Dosificación final',
    'Cantidades para laboratorio',
    'Regresion de resistencia',
    'Control estadistico de resistencia',
    'Advertencias tecnicas',
    'Observaciones y firma',
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <h3 className="text-3xl font-black flex items-center gap-4">
              <FileText className="text-primary" size={32} />
              Reporte Técnico
            </h3>
            <p className="text-slate-400 font-medium mt-2">Vista previa de los datos que se exportan a PDF y Excel.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onExportExcel} className="pro-btn-secondary !bg-white/10 !text-white !border-white/10">
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button type="button" onClick={onGeneratePDF} className="pro-btn-primary">
              <FileDown size={18} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'f\'cr', value: fcrMPa.toFixed(2), unit: 'MPa' },
          { label: 'Agua final', value: finalWaterKg.toFixed(1), unit: 'kg/m³' },
          { label: 'A/C', value: acRatio.toFixed(3), unit: '-' },
          { label: 'Cemento', value: cementKg.toFixed(1), unit: 'kg/m³' },
          { label: 'R2 regresion', value: regression.r2.toFixed(4), unit: regression.label },
          { label: 'RMSE regresion', value: regression.rmse.toFixed(2), unit: 'kg/cm2' },
          { label: 'Pred. 28 dias', value: prediction28 ? prediction28.adjustedKgCm2.toFixed(1) : '0.0', unit: 'kg/cm2' },
          { label: 'Control lotes', value: strengthControl.averageKgCm2.toFixed(1), unit: strengthControl.status },
        ].map(metric => (
          <div key={metric.label} className="pro-card !p-7">
            <p className="label-tech">{metric.label}</p>
            <p className="text-4xl font-black text-slate-900 dark:text-white">{metric.value}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{metric.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="pro-card">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <TrendingUp className="text-primary" size={24} />
            Regresion incluida
          </h4>
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <p className="label-tech">Ecuacion</p>
              <p className="text-lg font-black text-primary font-mono break-words">{regression.equation}</p>
              <p className="text-xs font-bold text-slate-500 mt-3">
                R2 {regression.r2.toFixed(4)} | RMSE {regression.rmse.toFixed(2)} kg/cm2
              </p>
            </div>
            <div className="p-5 bg-slate-900 text-white rounded-2xl border border-slate-800">
              <p className="label-tech text-slate-400">Mejor modelo recomendado</p>
              <p className="text-2xl font-black">{bestRegression.label}</p>
              <p className="text-xs font-bold text-slate-400 mt-2">
                R2 {bestRegression.r2.toFixed(4)} | RMSE {bestRegression.rmse.toFixed(2)} kg/cm2
                {bestPrediction28 ? ` | 28 dias ${bestPrediction28.adjustedKgCm2.toFixed(1)} kg/cm2` : ''}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {regression.predictions.slice(0, 4).map(prediction => (
                <div key={prediction.ageDays} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="label-tech">{prediction.ageDays} dias</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{prediction.adjustedKgCm2.toFixed(1)}</p>
                  <p className="text-[10px] font-bold text-slate-400">kg/cm2</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pro-card">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <ClipboardCheck className="text-primary" size={24} />
            Control estadistico exportado
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Promedio', value: strengthControl.averageKgCm2.toFixed(1), unit: 'kg/cm2' },
                { label: 'Desv. estandar', value: strengthControl.standardDeviationKgCm2.toFixed(2), unit: 'kg/cm2' },
                { label: 'CV', value: strengthControl.coefficientVariationPercent.toFixed(2), unit: '%' },
                { label: 'Minima', value: strengthControl.minimumKgCm2.toFixed(1), unit: 'kg/cm2' },
              ].map(metric => (
                <div key={metric.label} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="label-tech">{metric.label}</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{metric.value}</p>
                  <p className="text-[10px] font-bold text-slate-400">{metric.unit}</p>
                </div>
              ))}
            </div>
            {strengthControl.lots.slice(0, 4).map(lot => (
              <div key={lot.lot} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="font-black text-slate-900 dark:text-white">{lot.lot} - {lot.status}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  Prom. {lot.averageKgCm2.toFixed(1)} kg/cm2 · CV {lot.coefficientVariationPercent.toFixed(2)}% · min. {lot.minimumKgCm2.toFixed(1)} kg/cm2
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pro-card">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <AlertTriangle className={warnings.length ? 'text-amber-500' : 'text-success'} size={24} />
            Advertencias exportadas
          </h4>
          <div className="space-y-4">
            {warnings.length === 0 ? (
              <p className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 font-black text-emerald-700 dark:text-emerald-300">
                No hay advertencias tecnicas activas.
              </p>
            ) : warnings.slice(0, 4).map(warning => (
              <div key={warning.id} className="p-5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{warning.module}</p>
                <p className="font-black text-slate-900 dark:text-white mt-1">{warning.title}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">{warning.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="pro-card">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <ShieldCheck className="text-success" size={24} />
            Contenido del reporte
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportSections.map(section => (
              <div key={section} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300">
                {section}
              </div>
            ))}
          </div>
        </div>

        <div className="pro-card">
          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
            <BarChart3 className="text-primary" size={24} />
            Resumen de aditivos
          </h4>
          <div className="space-y-4">
            {additivesSummary.rows.length === 0 ? (
              <p className="text-slate-400 font-bold">Este diseño no tiene aditivos activos.</p>
            ) : additivesSummary.rows.map(({ additive, massKgM3, volumeLM3, waterReductionPercent }) => (
              <div key={additive.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="font-black text-slate-900 dark:text-white">{additive.name}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  {massKgM3.toFixed(3)} kg/m³ · {volumeLM3.toFixed(3)} L/m³ · reducción {waterReductionPercent.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

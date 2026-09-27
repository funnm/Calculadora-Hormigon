import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  Droplet, 
  Layers, 
  Gauge, 
  ClipboardCheck, 
  AlertTriangle, 
  Plus, 
  ClipboardCheck as ClipboardIcon 
} from 'lucide-react';
import type { ConcreteDesign } from '../../types';
import type { ConcreteDesignMetrics, TechnicalWarning } from '../../utils/concreteCalculations';
import type { StrengthRegressionResult, RegressionPrediction } from '../../utils/regressionCalculations';
import type { StrengthControlResult } from '../../utils/strengthControl';
import { ModuleStatusGrid } from './ModuleStatusGrid';
import { DesignWarningsPanel } from './DesignWarningsPanel';
import { ProjectSessionList } from './ProjectSessionList';
import { TechnicalSequence } from './TechnicalSequence';

interface DashboardPageProps {
  currentDesign: ConcreteDesign;
  designs: ConcreteDesign[];
  activeDesignId: string;
  designMetrics: ConcreteDesignMetrics;
  recommendedRegression: StrengthRegressionResult;
  regression28: RegressionPrediction | undefined;
  strengthControlResult: StrengthControlResult;
  designWarnings: TechnicalWarning[];
  criticalWarnings: number;
  warningCount: number;
  setActiveTab: (tab: string) => void;
  setActiveDesignId: (id: string) => void;
  handleNewProject: () => void;
  deleteDesign: (id: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentDesign,
  designs,
  activeDesignId,
  designMetrics,
  recommendedRegression,
  regression28,
  strengthControlResult,
  designWarnings,
  criticalWarnings,
  warningCount,
  setActiveTab,
  setActiveDesignId,
  handleNewProject,
  deleteDesign,
}) => {
  const modules = [
    { id: 'project-info', title: 'Datos de Obra', ok: Boolean(currentDesign.projectInfo.projectName && currentDesign.designRequirements.workStrengthKgCm2 > 0) },
    { id: 'materials', title: 'Materiales', ok: designMetrics.cementVolumeM3 > 0 && designMetrics.drySandKg > 0 && designMetrics.dryGravelKg > 0 },
    { id: 'strength-curve', title: 'Regresion', ok: recommendedRegression.valid && recommendedRegression.r2 >= 0.85 },
    { id: 'strength-control', title: 'Control Estadistico', ok: strengthControlResult.status === 'accepted' },
    { id: 'water-cement', title: 'Agua / Cemento', ok: designMetrics.waterCementRatio <= designMetrics.maxWaterCementRatio },
    { id: 'volume', title: 'Volumen Absoluto', ok: Math.abs(designMetrics.absoluteVolumeTotalM3 - 1) <= 0.015 && designMetrics.aggregateVolumeM3 > 0.05 },
    { id: 'final-mix', title: 'Mezcla Final', ok: criticalWarnings === 0 },
  ];

  const sequenceSteps = [
    { step: 1, title: 'Datos y materiales', desc: `${designMetrics.tmnMm.toFixed(1)} mm TMN`, tabId: 'project-info' },
    { step: 2, title: 'Regresion', desc: `${recommendedRegression.label} R2 ${recommendedRegression.r2.toFixed(3)}`, tabId: 'strength-curve' },
    { step: 3, title: 'Dosificacion', desc: `${designMetrics.cementKg.toFixed(0)} kg/m3 cemento`, tabId: 'final-mix' },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-left min-w-0">
      <div className="pro-card apple-hero-panel border-none relative overflow-hidden">
        <div className="relative z-10 grid min-w-0 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8 items-center">
          <div className="space-y-6 min-w-0">
            <div className="inline-flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-xl">
              <ShieldCheck className="text-accent" size={20} />
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/80">
                Motor técnico de dosificación
              </span>
            </div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight text-white tracking-tight">
                {currentDesign.projectInfo.projectName || 'Sin nombre'}
              </h2>
              <p className="text-white/60 text-base sm:text-lg font-medium max-w-3xl mt-4 leading-relaxed">
                Estado integral del diseño: resistencia, A/C, cemento, volumen absoluto y alertas técnicas.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setActiveTab('project-info')}
                className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-100 transition-all active:scale-95 group"
              >
                Datos de mezcla
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setActiveTab('strength-curve')}
                className="bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95"
              >
                <TrendingUp size={20} /> Regresión
              </button>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "f'c objetivo", value: (Number(currentDesign.designRequirements.workStrengthKgCm2) || 0).toFixed(0), unit: 'kg/cm2', color: 'text-white' },
              { label: 'A/C calculada', value: designMetrics.waterCementRatio.toFixed(3), unit: `lim. ${designMetrics.maxWaterCementRatio.toFixed(2)}`, color: designMetrics.waterCementRatio <= designMetrics.maxWaterCementRatio ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'Cemento', value: designMetrics.cementKg.toFixed(0), unit: 'kg/m3', color: designMetrics.cementKg >= designMetrics.minCementKgM3 ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'R2 recomendado', value: recommendedRegression.r2.toFixed(3), unit: recommendedRegression.label, color: recommendedRegression.r2 >= 0.9 ? 'text-emerald-400' : 'text-accent' },
            ].map(stat => (
              <div key={stat.label} className="min-w-0 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/40 mb-2">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] font-bold text-white/40 mt-1 uppercase tracking-widest">{stat.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
        {[
          { label: 'Agua efectiva', value: designMetrics.waterKg.toFixed(1), unit: 'kg/m3', icon: Droplet, ok: true },
          { label: 'Volumen agregados', value: designMetrics.aggregateVolumeM3.toFixed(4), unit: 'm3/m3', icon: Layers, ok: designMetrics.aggregateVolumeM3 > 0.05 },
          { label: 'Pred. 28 días', value: regression28 ? regression28.adjustedKgCm2.toFixed(1) : '0.0', unit: 'kg/cm2', icon: Gauge, ok: regression28 && regression28.adjustedKgCm2 >= currentDesign.designRequirements.workStrengthKgCm2 },
          { label: 'Control lotes', value: strengthControlResult.averageKgCm2.toFixed(1), unit: strengthControlResult.status, icon: ClipboardCheck, ok: strengthControlResult.status === 'accepted' },
          { label: 'Alertas activas', value: String(warningCount), unit: `${criticalWarnings} críticas`, icon: AlertTriangle, ok: warningCount === 0 },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="pro-card !p-6 border-l-4 border-l-slate-200 dark:border-l-slate-700 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="label-tech">{card.label}</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{card.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{card.unit}</p>
                </div>
                <div className={`p-3 rounded-2xl ${card.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 pro-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <ClipboardIcon className="text-accent" size={26} />
              Estado por módulo
            </h3>
            <button
              onClick={handleNewProject}
              className="bg-accent/10 text-accent hover:bg-accent hover:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              <Plus size={18} /> Nuevo proyecto
            </button>
          </div>
          <ModuleStatusGrid modules={modules} onModuleClick={setActiveTab} />
        </section>

        <DesignWarningsPanel warnings={designWarnings} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <ProjectSessionList 
          designs={designs} 
          activeDesignId={activeDesignId} 
          onSelectDesign={setActiveDesignId} 
          onDeleteDesign={deleteDesign} 
        />

        <TechnicalSequence steps={sequenceSteps} onStepClick={setActiveTab} />
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TechnicalWarning } from '../../utils/concreteCalculations';

interface DesignWarningsPanelProps {
  warnings: TechnicalWarning[];
}

export const DesignWarningsPanel: React.FC<DesignWarningsPanelProps> = ({ warnings }) => {
  const warningCount = warnings.length;

  return (
    <section className="pro-card text-left">
      <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-6">
        <AlertTriangle className={warningCount ? 'text-amber-500' : 'text-emerald-500'} size={26} />
        Advertencias
      </h3>
      {warnings.length === 0 ? (
        <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/40">
          <p className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={20} /> Sin alertas tecnicas
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {warnings.slice(0, 5).map(warning => (
            <div key={warning.id} className={`p-4 rounded-2xl border ${warning.severity === 'danger' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/40' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/40'}`}>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">{warning.module}</p>
              <p className="font-black text-slate-900 dark:text-white mt-1">{warning.title}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{warning.message}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-3">Recomendacion</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{warning.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

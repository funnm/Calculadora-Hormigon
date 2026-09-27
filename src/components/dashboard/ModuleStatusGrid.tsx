import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ModuleStatus {
  id: string;
  title: string;
  ok: boolean;
}

interface ModuleStatusGridProps {
  modules: ModuleStatus[];
  onModuleClick: (id: string) => void;
}

export const ModuleStatusGrid: React.FC<ModuleStatusGridProps> = ({ modules, onModuleClick }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {modules.map(module => (
      <button
        key={module.id}
        type="button"
        onClick={() => onModuleClick(module.id)}
        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-left hover:border-primary/40 transition-all"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-800 dark:text-white">{module.title}</p>
          {module.ok ? <CheckCircle2 className="text-emerald-500" size={19} /> : <AlertTriangle className="text-amber-500" size={19} />}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">
          {module.ok ? 'Operativo' : 'Revisar'}
        </p>
      </button>
    ))}
  </div>
);

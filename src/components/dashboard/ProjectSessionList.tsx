import React from 'react';
import { History, FileText, Trash2, ChevronRight } from 'lucide-react';
import type { ConcreteDesign } from '../../types';

interface ProjectSessionListProps {
  designs: ConcreteDesign[];
  activeDesignId: string;
  onSelectDesign: (id: string) => void;
  onDeleteDesign: (id: string) => void;
}

export const ProjectSessionList: React.FC<ProjectSessionListProps> = ({
  designs,
  activeDesignId,
  onSelectDesign,
  onDeleteDesign,
}) => (
  <section className="xl:col-span-2 pro-card text-left">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-4">
        <History className="text-primary" size={28} />
        Proyectos en sesion
      </h3>
    </div>
    <div className="space-y-4 text-left">
      {designs.map(d => (
        <div
          key={d.id}
          onClick={() => onSelectDesign(d.id)}
          className={`p-5 sm:p-6 rounded-2xl border-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 transition-all duration-300 cursor-pointer group ${
            activeDesignId === d.id
              ? 'bg-slate-900 border-slate-900 shadow-2xl'
              : 'bg-slate-50/50 dark:bg-slate-900/30 border-transparent hover:border-primary/30 hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className={`p-3 rounded-2xl shadow-xl transition-all duration-300 ${
              activeDesignId === d.id ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-slate-400'
            }`}>
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <p className={`text-lg font-black truncate ${activeDesignId === d.id ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{d.projectInfo.projectName}</p>
              <div className="flex flex-wrap gap-3 mt-1.5 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d.projectInfo.date}</p>
                <span className={`text-[10px] font-black px-3 py-0.5 rounded-full ${activeDesignId === d.id ? 'bg-primary/20 text-primary' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>{d.status}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 self-end sm:self-auto">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDeleteDesign(d.id);
              }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300"
              title="Eliminar proyecto"
            >
              <Trash2 size={19} />
            </button>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              activeDesignId === d.id ? 'bg-white/10 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            } group-hover:scale-105`}>
              <ChevronRight size={22} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

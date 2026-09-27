import React, { useMemo, useRef, useState } from 'react';
import type { ConcreteDesign } from '../../types';
import { Download, FileJson, History, Search, Trash2, Upload, Copy, ChevronRight } from 'lucide-react';

interface HistoryPageProps {
  designs: ConcreteDesign[];
  activeDesignId: string;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (designs: ConcreteDesign[]) => void;
  onExport: (design?: ConcreteDesign) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  designs,
  activeDesignId,
  onSelect,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
}) => {
  const [search, setSearch] = useState('');
  const [strengthFilter, setStrengthFilter] = useState('');
  const [additiveFilter, setAdditiveFilter] = useState<'all' | 'with' | 'without'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDesigns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const minStrength = Number(strengthFilter) || 0;

    return designs.filter(design => {
      const projectName = design.projectInfo.projectName.toLowerCase();
      const responsible = design.projectInfo.responsible.toLowerCase();
      const matchesSearch = !normalizedSearch || projectName.includes(normalizedSearch) || responsible.includes(normalizedSearch);
      const matchesStrength = !minStrength || design.designRequirements.workStrengthKgCm2 >= minStrength;
      const hasAdditives = (design.materials.additives || []).some(additive => additive.enabled ?? true);
      const matchesAdditives = additiveFilter === 'all' || (additiveFilter === 'with' ? hasAdditives : !hasAdditives);
      return matchesSearch && matchesStrength && matchesAdditives;
    });
  }, [additiveFilter, designs, search, strengthFilter]);

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = JSON.parse(text) as ConcreteDesign | ConcreteDesign[];
    onImport(Array.isArray(parsed) ? parsed : [parsed]);
    event.target.value = '';
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between gap-8">
          <div>
            <h3 className="text-3xl font-black flex items-center gap-4">
              <History className="text-primary" size={32} />
              Historial de Diseños
            </h3>
            <p className="text-slate-400 font-medium mt-2">Buscar, duplicar, importar y exportar diseños guardados en localStorage.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onExport()} className="pro-btn-secondary !bg-white/10 !text-white !border-white/10">
              <Download size={18} /> Exportar historial
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="pro-btn-primary">
              <Upload size={18} /> Importar JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>
      </div>

      <div className="pro-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="pro-input pro-input-editable pl-12"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por proyecto o responsable"
            />
          </div>
          <input
            type="number"
            className="pro-input pro-input-editable"
            value={strengthFilter}
            onChange={event => setStrengthFilter(event.target.value)}
            placeholder="f'c mínimo kg/cm²"
          />
          <select
            className="pro-input pro-input-editable bg-white dark:bg-slate-800"
            value={additiveFilter}
            onChange={event => setAdditiveFilter(event.target.value as 'all' | 'with' | 'without')}
          >
            <option value="all">Todos los diseños</option>
            <option value="with">Con aditivos</option>
            <option value="without">Sin aditivos</option>
          </select>
        </div>
      </div>

      <div className="space-y-5">
        {filteredDesigns.map(design => {
          const isActive = design.id === activeDesignId;
          const hasAdditives = (design.materials.additives || []).some(additive => additive.enabled ?? true);

          return (
            <div key={design.id} className={`pro-card border-2 ${isActive ? 'border-primary' : 'border-transparent'}`}>
              <div className="flex flex-col xl:flex-row justify-between gap-6">
                <button type="button" onClick={() => onSelect(design.id)} className="flex items-center gap-5 text-left flex-1">
                  <div className={`p-4 rounded-2xl ${isActive ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}>
                    <FileJson size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">{design.projectInfo.projectName}</h4>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      {design.projectInfo.date} · {design.projectInfo.responsible} · f'c {design.designRequirements.workStrengthKgCm2} kg/cm²
                    </p>
                  </div>
                  <ChevronRight className="ml-auto text-slate-300" size={22} />
                </button>

                <div className="flex flex-wrap gap-3 items-center">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-full ${hasAdditives ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    {hasAdditives ? 'Con aditivo' : 'Sin aditivo'}
                  </span>
                  <button type="button" onClick={() => onExport(design)} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary">
                    <Download size={18} />
                  </button>
                  <button type="button" onClick={() => onDuplicate(design.id)} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-primary">
                    <Copy size={18} />
                  </button>
                  <button type="button" onClick={() => onDelete(design.id)} className="p-3 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

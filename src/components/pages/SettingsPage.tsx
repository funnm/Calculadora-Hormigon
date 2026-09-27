import React from 'react';
import type { AppSettings } from '../../types';
import { Settings, SlidersHorizontal } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onApplyDefaults: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onChange, onApplyDefaults }) => {
  const patchSettings = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-fade-in">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl">
        <h3 className="text-3xl font-black flex items-center gap-4">
          <Settings className="text-primary" size={32} />
          Configuración
        </h3>
        <p className="text-slate-400 font-medium mt-2">Unidades, datos predeterminados del laboratorio y porcentajes base de agregados.</p>
      </div>

      <div className="pro-card">
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <SlidersHorizontal className="text-white" size={24} />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">Preferencias Generales</h4>
            <p className="label-tech mt-1">Valores usados por defecto en nuevos diseños y reportes.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="label-tech">Unidad de resistencia</label>
            <select className="pro-input pro-input-editable bg-white dark:bg-slate-800" value={settings.resistanceUnit} onChange={event => patchSettings({ resistanceUnit: event.target.value as AppSettings['resistanceUnit'] })}>
              <option value="kg/cm2">kg/cm²</option>
              <option value="MPa">MPa</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Unidad de volumen</label>
            <select className="pro-input pro-input-editable bg-white dark:bg-slate-800" value={settings.volumeUnit} onChange={event => patchSettings({ volumeUnit: event.target.value as AppSettings['volumeUnit'] })}>
              <option value="L">Litros</option>
              <option value="m3">m³</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Unidad de masa</label>
            <select className="pro-input pro-input-editable bg-white dark:bg-slate-800" value={settings.massUnit} onChange={event => patchSettings({ massUnit: event.target.value as AppSettings['massUnit'] })}>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Papel para reportes</label>
            <select className="pro-input pro-input-editable bg-white dark:bg-slate-800" value={settings.reportPaperSize} onChange={event => patchSettings({ reportPaperSize: event.target.value as AppSettings['reportPaperSize'] })}>
              <option value="a4">A4</option>
              <option value="letter">Carta</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Responsable predeterminado</label>
            <input className="pro-input pro-input-editable" value={settings.defaultResponsible} onChange={event => patchSettings({ defaultResponsible: event.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="label-tech">Laboratorio predeterminado</label>
            <input className="pro-input pro-input-editable" value={settings.defaultLaboratory} onChange={event => patchSettings({ defaultLaboratory: event.target.value })} />
          </div>

          <div className="space-y-2">
            <label className="label-tech">Arena predeterminada</label>
            <input type="number" className="pro-input pro-input-editable" value={settings.defaultFineAggregatePercent} onChange={event => patchSettings({ defaultFineAggregatePercent: Number(event.target.value) || 0 })} />
            <p className="text-[10px] font-bold text-slate-400">% del volumen de agregados</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Agregado grueso predeterminado</label>
            <input type="number" className="pro-input pro-input-editable" value={settings.defaultCoarseAggregatePercent} onChange={event => patchSettings({ defaultCoarseAggregatePercent: Number(event.target.value) || 0 })} />
            <p className="text-[10px] font-bold text-slate-400">% del volumen de agregados</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Tema</label>
            <select className="pro-input pro-input-editable bg-white dark:bg-slate-800" value={settings.theme} onChange={event => patchSettings({ theme: event.target.value as AppSettings['theme'] })}>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button type="button" onClick={onApplyDefaults} className="pro-btn-primary">
            Aplicar responsable y laboratorio al diseño activo
          </button>
        </div>
      </div>
    </div>
  );
};

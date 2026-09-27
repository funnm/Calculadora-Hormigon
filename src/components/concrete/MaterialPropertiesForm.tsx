import React, { useState } from 'react';
import type { AggregateProperties, CementProperties, MaterialProperties, SavedMaterial, Additive } from '../../types';
import { FlaskConical, Mountain, Box, Hash, Save, Beaker, Plus, Trash2 } from 'lucide-react';

interface MaterialPropertiesFormProps {
  materials: MaterialProperties;
  onChange: (field: string, value: unknown) => void;
}

type MaterialLibraryType = 'cement' | 'sand' | 'gravel';
type MaterialLibraryProperties = CementProperties | AggregateProperties;
type AggregateFieldKey = keyof AggregateProperties;

const createLocalId = (prefix: string, existingIds: string[]): string => {
  let index = existingIds.length + 1;
  let id = `${prefix}-${index}`;
  while (existingIds.includes(id)) {
    index += 1;
    id = `${prefix}-${index}`;
  }
  return id;
};

const finiteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const MaterialPropertiesForm: React.FC<MaterialPropertiesFormProps> = ({ materials, onChange }) => {
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>(() => {
    const saved = localStorage.getItem('concrete-material-library');
    return saved ? JSON.parse(saved) : [];
  });

  const handleSaveMaterial = (type: MaterialLibraryType, properties: MaterialLibraryProperties) => {
    const name = window.prompt(`Ingresa un nombre para guardar este material en tu librería local:`);
    if (!name) return;
    const newMaterial: SavedMaterial = {
      id: createLocalId('material', savedMaterials.map(material => material.id)),
      type,
      name,
      properties
    };
    const updated = [...savedMaterials, newMaterial];
    setSavedMaterials(updated);
    localStorage.setItem('concrete-material-library', JSON.stringify(updated));
  };

  const handleLoadMaterial = (e: React.ChangeEvent<HTMLSelectElement>, targetPath: string) => {
    const id = e.target.value;
    if (!id) return;
    const material = savedMaterials.find(m => m.id === id);
    if (material) {
      Object.keys(material.properties).forEach(key => {
        onChange(`materials.${targetPath}.${key}`, material.properties[key as keyof MaterialLibraryProperties]);
      });
    }
    e.target.value = ''; // Reset select
  };

  const handleAddAdditive = () => {
    const newAdditive: Additive = {
      id: createLocalId('aditivo', (materials.additives || []).map(additive => additive.id)),
      enabled: true,
      name: 'Nuevo Aditivo',
      commercialName: 'Nuevo Aditivo',
      type: 'Liquid',
      additiveType: 'Plastificante',
      dosagePercent: 1.0,
      dosageValue: 1.0,
      dosageUnit: 'percentCement',
      densityKgL: 1.1,
      density: 1000,
      waterReductionPercent: 0,
      unitCost: 0,
      carbonFactor: 0
    };
    onChange('materials.additives', [...(materials.additives || []), newAdditive]);
  };

  const handleUpdateAdditive = (id: string, field: keyof Additive, value: unknown) => {
    const updated = (materials.additives || []).map(a => 
      a.id === id ? { ...a, [field]: value } : a
    );
    onChange('materials.additives', updated);
  };

  const handleRemoveAdditive = (id: string) => {
    const updated = (materials.additives || []).filter(a => a.id !== id);
    onChange('materials.additives', updated);
  };

  const renderLibraryControls = (type: MaterialLibraryType, currentProps: MaterialLibraryProperties, path: string) => {
    const available = savedMaterials.filter(m => m.type === type);
    return (
      <div className="flex items-center gap-3 ml-auto relative z-20">
        <select 
          onChange={(e) => handleLoadMaterial(e, path)}
          className="pro-input !py-2 !px-4 text-xs font-bold text-slate-600 dark:text-slate-300 w-48 cursor-pointer"
          defaultValue=""
        >
          <option value="" disabled>Cargar de librería...</option>
          {available.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button 
          type="button"
          onClick={() => handleSaveMaterial(type, currentProps)}
          className="bg-primary/10 text-primary hover:bg-primary hover:text-white p-2.5 rounded-xl transition-colors shadow-sm"
          title="Guardar propiedades actuales en la librería"
        >
          <Save size={18} />
        </button>
      </div>
    );
  };

  const renderAggregate = (title: string, path: 'sand' | 'gravel', Icon: React.ElementType, color: string) => {
    const libraryType = path === 'sand' ? 'sand' : 'gravel';
    const fields: Array<{ key: AggregateFieldKey; label: string; unit: string; hide?: boolean }> = [
      { key: 'densitySSD', label: 'Densidad SSS', unit: 'kg/m³' },
      { key: 'absorption', label: 'Absorción', unit: '%' },
      { key: 'moisture', label: 'Humedad', unit: '%' },
      { key: 'pvsc', label: 'PVSC', unit: 'kg/m³', hide: path === 'sand' },
      { key: 'finenessModulus', label: 'Módulo de Finura', unit: '', hide: path !== 'sand' },
      { key: 'unitCost', label: 'Costo Unitario', unit: '$/kg' },
      { key: 'carbonFactor', label: 'Factor CO₂', unit: 'kg CO₂/kg' },
    ];

    return (
      <div className="pro-card hover:border-primary/20 transition-all group">
        <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-900`}>
             <Icon className={color} size={24} />
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white group-hover:text-primary transition-colors">
            {title}
          </h4>
          {renderLibraryControls(libraryType, materials[path], path)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {fields.map(field => {
            if (field.hide) return null;
            
            return (
              <div key={field.key} className="space-y-2">
                <label className="label-tech">{field.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    className="pro-input pro-input-editable text-xl font-black pr-12"
                    value={materials[path][field.key] ?? ''}
                    onChange={(e) => onChange(`materials.${path}.${field.key}`, e.target.value)}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest pointer-events-none">
                    {field.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      {/* Cement Section */}
      <div className="pro-card border-l-8 border-l-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 -mr-8 -mt-8 rotate-12 scale-150">
           <Hash size={120} />
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800 relative z-10">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <FlaskConical className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Propiedades del Cemento</h3>
            <p className="label-tech mt-1">Valores específicos para el balance de masas.</p>
          </div>
          {renderLibraryControls('cement', materials.cement, 'cement')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
          <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <label className="label-tech">Densidad Relativa (g/cm³)</label>
            <input
              type="number"
              step="0.01"
              className="pro-input pro-input-editable text-3xl font-black"
              value={materials.cement.specificGravityGcm3 ?? ''}
              onChange={(e) => onChange('materials.cement.specificGravityGcm3', e.target.value)}
            />
          </div>
          <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <label className="label-tech text-success">Costo Unitario ($/kg)</label>
            <input
              type="number"
              step="0.001"
              className="pro-input pro-input-editable text-3xl font-black text-success"
              value={materials.cement.unitCost ?? ''}
              onChange={(e) => onChange('materials.cement.unitCost', e.target.value)}
            />
          </div>
          <div className="space-y-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <label className="label-tech text-emerald-600">Factor CO₂ (kg/kg)</label>
            <input
              type="number"
              step="0.001"
              className="pro-input pro-input-editable text-3xl font-black text-emerald-600"
              value={materials.cement.carbonFactor ?? ''}
              onChange={(e) => onChange('materials.cement.carbonFactor', e.target.value)}
            />
          </div>
          <div className="space-y-3 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900 flex flex-col justify-center">
            <label className="label-tech text-blue-600">Masa Volumétrica</label>
            <p className="text-4xl font-black text-blue-700 dark:text-blue-300">
               {(finiteNumber(materials.cement.specificGravityGcm3) * 1000).toLocaleString()}
               <span className="text-sm font-bold opacity-60 ml-1">kg/m³</span>
            </p>
          </div>
        </div>
      </div>

      {/* Aggregates Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {renderAggregate('Arena Fina', 'sand', Box, 'text-amber-500')}
        {renderAggregate('Agregado Grueso', 'gravel', Mountain, 'text-slate-500')}
      </div>

      {/* Additives Section */}
      <div className="pro-card border-l-8 border-l-emerald-500 relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl shadow-xl shadow-emerald-500/20">
              <Beaker className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Aditivos Químicos</h3>
              <p className="label-tech mt-1">Configuración de reductores de agua, acelerantes, etc.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleAddAdditive}
            className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Plus size={18} /> Agregar Aditivo
          </button>
        </div>

        <div className="space-y-6">
          {(materials.additives || []).length === 0 ? (
            <p className="text-slate-500 text-center py-8 font-medium">No hay aditivos configurados en este diseño.</p>
          ) : (
            (materials.additives || []).map((add) => (
              <div key={add.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 relative group">
                <button 
                  type="button"
                  onClick={() => handleRemoveAdditive(add.id)}
                  className="absolute -top-3 -right-3 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm z-10 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
                <div className="lg:col-span-2 space-y-2">
                  <label className="label-tech">Nombre</label>
                  <input type="text" className="pro-input pro-input-editable font-black w-full" value={add.name} onChange={e => handleUpdateAdditive(add.id, 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Estado</label>
                  <select className="pro-input pro-input-editable w-full font-bold text-sm" value={add.type} onChange={e => handleUpdateAdditive(add.id, 'type', e.target.value)}>
                    <option value="Liquid">Líquido</option>
                    <option value="Solid">Sólido</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Dosis (% cem)</label>
                  <input type="number" step="0.01" className="pro-input pro-input-editable font-black w-full" value={add.dosagePercent ?? ''} onChange={e => {
                    const value = Number(e.target.value) || 0;
                    handleUpdateAdditive(add.id, 'dosagePercent', value);
                    handleUpdateAdditive(add.id, 'dosageValue', value);
                  }} />
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Densidad (kg/m³)</label>
                  <input type="number" step="1" className="pro-input pro-input-editable font-black w-full" value={add.density ?? ''} onChange={e => {
                    const density = Number(e.target.value) || 0;
                    handleUpdateAdditive(add.id, 'density', density);
                    handleUpdateAdditive(add.id, 'densityKgL', density / 1000);
                  }} />
                </div>
                <div className="space-y-2">
                  <label className="label-tech">Costo ($/kg)</label>
                  <input type="number" step="0.01" className="pro-input pro-input-editable font-black w-full" value={add.unitCost ?? ''} onChange={e => handleUpdateAdditive(add.id, 'unitCost', Number(e.target.value) || 0)} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

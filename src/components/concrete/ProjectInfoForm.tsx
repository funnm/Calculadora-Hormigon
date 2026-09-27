import React from 'react';
import type { ProjectInfo, DesignRequirements, MaterialProperties } from '../../types';
import { kgCm2ToMPa, mpaToKgCm2 } from '../../utils/concreteCalculations';
import { FileText, ShieldCheck, Target } from 'lucide-react';

interface ProjectInfoFormProps {
  projectInfo: ProjectInfo;
  designRequirements: DesignRequirements;
  materials: MaterialProperties;
  onChange: (field: string, value: unknown) => void;
}

const concreteTypes = [
  'Hormigón normal',
  'Hormigón estructural',
  'Hormigón para pavimento',
  'Hormigón bombeable',
  'Hormigón con aditivo plastificante',
  'Hormigón con aditivo superplastificante',
  'Hormigón con aditivo acelerante',
  'Hormigón con aditivo retardante',
];

const exposureConditions = [
  'Normal',
  'Ambiente húmedo',
  'Ambiente marino',
  'Sulfatos',
  'Ciclos de congelamiento',
  'Alta resistencia química',
];

export const ProjectInfoForm: React.FC<ProjectInfoFormProps> = ({ projectInfo, designRequirements, materials, onChange }) => {
  const fcMPa = kgCm2ToMPa(designRequirements.workStrengthKgCm2);
  const tmnMm = designRequirements.nominalMaxSizeIn * 25.4;

  const projectFields = [
    { label: 'Nombre del proyecto', path: 'projectInfo.projectName', value: projectInfo.projectName, placeholder: 'Ej. Diseño de hormigón estructural' },
    { label: 'Nombre de la obra', path: 'projectInfo.workName', value: projectInfo.workName, placeholder: 'Ej. Edificio central' },
    { label: 'Responsable', path: 'projectInfo.responsible', value: projectInfo.responsible, placeholder: 'Nombre completo' },
    { label: 'Institución / laboratorio', path: 'projectInfo.laboratory', value: projectInfo.laboratory, placeholder: 'Laboratorio de materiales' },
    { label: 'Grupo / área', path: 'projectInfo.group', value: projectInfo.group, placeholder: 'Grupo H' },
    { label: 'Ubicación', path: 'projectInfo.location', value: projectInfo.location, placeholder: 'Ciudad / obra' },
    { label: 'Tipo de elemento', path: 'projectInfo.structuralElement', value: projectInfo.structuralElement, placeholder: 'Viga, losa, columna...' },
    { label: 'Uso del hormigón', path: 'projectInfo.concreteUse', value: projectInfo.concreteUse, placeholder: 'Estructural, pavimento...' },
    { label: 'Fecha', path: 'projectInfo.date', value: projectInfo.date, type: 'date' },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
      <div className="pro-card border-t-8 border-t-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ShieldCheck size={120} />
        </div>
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20">
            <FileText className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Datos Generales del Diseño</h3>
            <p className="label-tech mt-1">Identificación del proyecto, obra, laboratorio y responsable.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {projectFields.map(field => (
            <div key={field.path} className="space-y-2">
              <label className="label-tech">{field.label}</label>
              <input
                type={field.type || 'text'}
                placeholder={field.placeholder}
                className="pro-input pro-input-editable"
                value={field.value || ''}
                onChange={event => onChange(field.path, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-10 space-y-2">
          <label className="label-tech">Observaciones</label>
          <textarea
            className="pro-input pro-input-editable min-h-[140px] resize-none text-base font-medium"
            placeholder="Condiciones ambientales, notas de laboratorio, procedencia de materiales o restricciones de obra."
            value={projectInfo.observations || ''}
            onChange={event => onChange('projectInfo.observations', event.target.value)}
          />
        </div>
      </div>

      <div className="pro-card border-t-8 border-t-warning">
        <div className="flex flex-wrap items-center gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="bg-warning p-3 rounded-2xl shadow-xl shadow-warning/20">
            <Target className="text-white" size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Parámetros Técnicos</h3>
            <p className="label-tech mt-1">Resistencia, asentamiento, TMN, exposición, cemento y tipo de hormigón.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          <div className="space-y-2">
            <label className="label-tech text-primary">f'c especificado</label>
            <input
              type="number"
              className="pro-input pro-input-editable font-black text-3xl text-primary"
              value={designRequirements.workStrengthKgCm2}
              onChange={event => onChange('designRequirements.workStrengthKgCm2', Number(event.target.value) || 0)}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">kg/cm²</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">f'c equivalente</label>
            <input
              type="number"
              step="0.01"
              className="pro-input pro-input-editable text-2xl"
              value={fcMPa.toFixed(2)}
              onChange={event => onChange('designRequirements.workStrengthKgCm2', mpaToKgCm2(Number(event.target.value) || 0))}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">MPa</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Edad de diseño</label>
            <input
              type="number"
              className="pro-input pro-input-editable text-2xl"
              value={designRequirements.ageDays}
              onChange={event => onChange('designRequirements.ageDays', Number(event.target.value) || 0)}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">días</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Asentamiento</label>
            <input
              type="number"
              className="pro-input pro-input-editable text-2xl"
              value={designRequirements.slumpMm}
              onChange={event => onChange('designRequirements.slumpMm', Number(event.target.value) || 0)}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">mm · rango: {designRequirements.consistency}</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">TMN</label>
            <input
              type="number"
              step="0.25"
              className="pro-input pro-input-editable text-2xl"
              value={designRequirements.nominalMaxSizeIn}
              onChange={event => onChange('designRequirements.nominalMaxSizeIn', Number(event.target.value) || 0)}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">pulgadas · {tmnMm.toFixed(1)} mm</p>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Condición de exposición</label>
            <select
              className="pro-input pro-input-editable bg-white dark:bg-slate-800"
              value={designRequirements.exposureCondition}
              onChange={event => onChange('designRequirements.exposureCondition', event.target.value)}
            >
              {exposureConditions.map(condition => <option key={condition} value={condition}>{condition}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech">Tipo de cemento</label>
            <input
              className="pro-input pro-input-editable"
              value={designRequirements.cementType}
              onChange={event => onChange('designRequirements.cementType', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="label-tech">Tipo de hormigón</label>
            <select
              className="pro-input pro-input-editable bg-white dark:bg-slate-800"
              value={designRequirements.concreteType}
              onChange={event => onChange('designRequirements.concreteType', event.target.value)}
            >
              {concreteTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="label-tech text-emerald-600">Aire incluido</label>
            <input
              type="number"
              step="0.1"
              className="pro-input pro-input-editable text-2xl font-black text-emerald-600"
              value={materials.airContent || 0}
              onChange={event => onChange('materials.airContent', Number(event.target.value) || 0)}
            />
            <p className="text-[10px] font-bold text-slate-400 mt-2">% del volumen</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { BookOpen, ChevronRight, FileText, Beaker, Pipette, ShieldCheck } from 'lucide-react';

export const TechnicalDocumentation: React.FC = () => {
  const sections = [
    {
      title: '1. Análisis Granulométrico',
      norm: 'NTE INEN 696 / ASTM C136',
      icon: <FileText className="text-primary" size={24} />,
      steps: [
        'Secado: Secar la muestra de agregado en el horno a 110 ± 5 °C.',
        'Tamizado: Pasar la muestra por una serie de tamices estandarizados.',
        'Pesaje: Determinar la masa retenida en cada tamiz con precisión.',
        'Cálculo: Determinar el porcentaje acumulado que pasa para graficar la curva.'
      ],
      determinations: ['Módulo de Finura (MF)', 'Tamaño Máximo Nominal (TMN)', '% Pasa Acumulado']
    },
    {
      title: '2. Densidad y Absorción (Agregado Grueso)',
      norm: 'NTE INEN 857 / ASTM C127',
      icon: <Pipette className="text-primary" size={24} />,
      steps: [
        'Saturación: Sumergir el agregado en agua por 24 horas.',
        'Estado SSS: Secar superficialmente las partículas (Saturado Superficialmente Seco).',
        'Pesaje Sumergido: Pesar la muestra dentro de un canastillo sumergido en agua.',
        'Peso Seco: Secar en horno y pesar la muestra final.'
      ],
      determinations: ['Densidad SSS (kg/m³)', 'Porcentaje de Absorción (%)']
    },
    {
      title: '3. Método de Mezcla de Fuller',
      norm: 'Optimización Granulométrica',
      icon: <Beaker className="text-primary" size={24} />,
      steps: [
        'Curva Ideal: Definir la parábola de Fuller basada en el TMN del diseño.',
        'Combinación: Ajustar las proporciones de arena y agregado grueso para aproximarse a la curva ideal.',
        'Balance Volumétrico: Asegurar que la suma de volúmenes absolutos sea igual a 1 m³.',
        'Ajuste Final: Corregir por contenido de aire y aditivos químicos.'
      ],
      determinations: ['Porcentajes Óptimos de Agregados', 'Volumen de Vacíos']
    }
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto animate-fade-in pb-16">
      <div className="pro-card bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-20 scale-150 text-primary">
          <BookOpen size={120} />
        </div>
        <div className="relative z-10 flex items-center gap-6">
           <div className="bg-primary p-5 rounded-[2rem] shadow-2xl shadow-primary/30">
             <ShieldCheck size={48} className="text-white" />
           </div>
           <div>
             <h2 className="text-4xl font-black tracking-tighter">Base Normativa Técnica</h2>
             <p className="text-slate-400 text-lg font-medium mt-1">Estándares internacionales aplicados al diseño de hormigón estructural.</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {sections.map((section, idx) => (
          <div key={idx} className="pro-card group hover:shadow-2xl transition-all border-l-8 border-l-primary">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="lg:w-1/3 lg:border-r border-slate-100 dark:border-slate-800 lg:pr-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl">
                     {section.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{section.title}</h3>
                </div>
                <div className="inline-flex flex-col bg-slate-50 dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referencia</span>
                  <span className="text-base font-bold text-primary">{section.norm}</span>
                </div>
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parámetros Críticos</p>
                   <div className="flex flex-wrap gap-2">
                     {section.determinations.map((det, i) => (
                       <span key={i} className="bg-primary/5 dark:bg-primary/10 text-primary text-[11px] font-black px-3 py-1.5 rounded-xl border border-primary/10">
                         {det}
                       </span>
                     ))}
                   </div>
                </div>
              </div>

              <div className="lg:w-2/3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Protocolo de Ensayo</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-5 items-start">
                      <div className="w-8 h-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl flex items-center justify-center text-sm font-black shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm font-bold leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                   <div className="flex items-center gap-3 text-success">
                      <div className="w-2 h-2 bg-success rounded-full animate-ping"></div>
                      <span className="text-xs font-black uppercase tracking-widest">Validado para NTC / ASTM</span>
                   </div>
                   <button className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                      Descargar Guía Completa <ChevronRight size={16} />
                   </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pro-card !bg-primary text-white border-none shadow-2xl shadow-primary/30 relative overflow-hidden">
         <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
         <div className="relative z-10">
            <h3 className="text-2xl font-black mb-4">Nota Técnica sobre f'cr</h3>
            <p className="text-blue-50 text-base font-medium leading-relaxed max-w-4xl">
              La resistencia media requerida (f'cr) es mayor que la resistencia especificada (f'c) para compensar la variabilidad estadística propia de la producción de hormigón. 
              En esta aplicacion utilizamos los factores de seguridad recomendados por el ACI 318, garantizando que el diseño cumpla con los estándares de seguridad estructural.
            </p>
         </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Activity } from 'lucide-react';

interface SequenceStep {
  step: number;
  title: string;
  desc: string;
  tabId: string;
}

interface TechnicalSequenceProps {
  steps: SequenceStep[];
  onStepClick: (tabId: string) => void;
}

export const TechnicalSequence: React.FC<TechnicalSequenceProps> = ({ steps, onStepClick }) => (
  <section className="pro-card bg-primary text-white border-none shadow-2xl relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
      <Activity size={120} />
    </div>
    <h3 className="text-xl font-black mb-8 relative z-10 flex items-center gap-3 text-left">
      <div className="w-1.5 h-6 bg-white rounded-full"></div>
      Secuencia tecnica
    </h3>
    <div className="space-y-6 relative z-10 text-left">
      {steps.map(s => (
        <button
          key={s.step}
          type="button"
          onClick={() => onStepClick(s.tabId)}
          className="w-full flex gap-4 text-left group"
        >
          <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center font-black group-hover:bg-white group-hover:text-primary transition-all duration-300">
            {s.step}
          </div>
          <div>
            <p className="font-bold text-white text-base leading-none">{s.title}</p>
            <p className="text-[11px] text-blue-100 font-medium leading-relaxed mt-2">{s.desc}</p>
          </div>
        </button>
      ))}
    </div>
  </section>
);

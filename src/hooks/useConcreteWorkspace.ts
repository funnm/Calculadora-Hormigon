import { useEffect, useState } from 'react';
import type { AppSettings, ConcreteDesign } from '../types';
import { createNewDesign, defaultSettings, initialConcreteDesign, normalizeConcreteDesign } from '../utils/initialState';

const readStoredSettings = (): AppSettings => {
  const saved = localStorage.getItem('concrete-settings');
  if (!saved) return defaultSettings;

  try {
    return { ...defaultSettings, ...JSON.parse(saved) };
  } catch {
    return defaultSettings;
  }
};

const readStoredDesigns = (): ConcreteDesign[] => {
  const saved = localStorage.getItem('concrete-designs');
  if (!saved) return [initialConcreteDesign as ConcreteDesign];

  try {
    const parsed = JSON.parse(saved) as Partial<ConcreteDesign>[];
    const normalized = parsed.map(design => normalizeConcreteDesign(design));
    return normalized.length > 0 ? normalized : [initialConcreteDesign as ConcreteDesign];
  } catch {
    return [initialConcreteDesign as ConcreteDesign];
  }
};

export const useConcreteWorkspace = () => {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);
  const [designs, setDesigns] = useState<ConcreteDesign[]>(readStoredDesigns);
  const [activeDesignId, setActiveDesignId] = useState('1');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('concrete-dark-mode') === 'true');

  const currentDesign = designs.find(design => design.id === activeDesignId) || designs[0];
  const currentDesignId = currentDesign?.id || activeDesignId;

  useEffect(() => {
    localStorage.setItem('concrete-designs', JSON.stringify(designs));
  }, [designs]);

  useEffect(() => {
    localStorage.setItem('concrete-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('concrete-dark-mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleUpdate = (path: string, value: unknown) => {
    const keys = path.split('.');
    setDesigns(prev => prev.map(design => {
      if (design.id !== currentDesignId) return design;

      const nextDesign = JSON.parse(JSON.stringify(design));
      let current = nextDesign as Record<string, unknown>;

      for (let i = 0; i < keys.length - 1; i += 1) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') current[key] = {};
        current = current[key] as Record<string, unknown>;
      }

      current[keys[keys.length - 1]] = value;
      return nextDesign as ConcreteDesign;
    }));
  };

  const handleSieveUpdate = (index: number, field: string, value: number) => {
    setDesigns(prev => prev.map(design => {
      if (design.id !== currentDesignId) return design;

      const nextDesign = JSON.parse(JSON.stringify(design)) as ConcreteDesign;
      nextDesign.sieveAnalysis.data[index] = {
        ...nextDesign.sieveAnalysis.data[index],
        [field]: value,
      };
      return nextDesign;
    }));
  };

  const handleNewProject = () => {
    const newDesign = createNewDesign(undefined, settings);
    setDesigns(prev => [...prev, newDesign as ConcreteDesign]);
    setActiveDesignId(newDesign.id);
    setActiveTab('project-info');
  };

  const deleteDesign = (id: string) => {
    if (designs.length === 1) {
      const newDesign = createNewDesign(undefined, settings);
      setDesigns([newDesign as ConcreteDesign]);
      setActiveDesignId(newDesign.id);
      return;
    }

    const filtered = designs.filter(design => design.id !== id);
    setDesigns(filtered);
    if (currentDesignId === id) {
      setActiveDesignId(filtered[0].id);
    }
  };

  const handleDuplicateDesign = (id: string) => {
    const design = designs.find(item => item.id === id);
    if (!design) return;

    const duplicate = normalizeConcreteDesign({
      ...JSON.parse(JSON.stringify(design)),
      id: `${Date.now()}`,
      projectInfo: {
        ...design.projectInfo,
        projectName: `${design.projectInfo.projectName} (copia)`,
        date: new Date().toISOString().split('T')[0],
      },
    }, settings);

    setDesigns(prev => [...prev, duplicate]);
    setActiveDesignId(duplicate.id);
    setActiveTab('project-info');
  };

  const handleImportDesigns = (incomingDesigns: ConcreteDesign[]) => {
    const normalized = incomingDesigns.map(design => normalizeConcreteDesign({
      ...design,
      id: designs.some(existing => existing.id === design.id) ? `${Date.now()}-${design.id}` : design.id,
    }, settings));

    setDesigns(prev => [...prev, ...normalized]);
    if (normalized[0]) {
      setActiveDesignId(normalized[0].id);
      setActiveTab('history');
    }
  };

  const handleSettingsChange = (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    setDarkMode(nextSettings.theme === 'dark');
  };

  const applySettingsToCurrentDesign = () => {
    handleUpdate('projectInfo.responsible', settings.defaultResponsible);
    handleUpdate('projectInfo.group', settings.defaultLaboratory);
    handleUpdate('projectInfo.laboratory', settings.defaultLaboratory);
    handleUpdate('materials.aggregateBlend.finePercent', settings.defaultFineAggregatePercent);
    handleUpdate('materials.aggregateBlend.coarsePercent', settings.defaultCoarseAggregatePercent);
  };

  const toggleDarkMode = () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    setSettings(prev => ({ ...prev, theme: nextDarkMode ? 'dark' : 'light' }));
  };

  return {
    settings,
    designs,
    activeDesignId: currentDesignId,
    activeTab,
    darkMode,
    currentDesign,
    setActiveDesignId,
    setActiveTab,
    handleNewProject,
    deleteDesign,
    handleDuplicateDesign,
    handleImportDesigns,
    handleSettingsChange,
    applySettingsToCurrentDesign,
    handleUpdate,
    handleSieveUpdate,
    toggleDarkMode,
  };
};

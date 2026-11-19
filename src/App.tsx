import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Box,
  Calculator,
  ChevronDown,
  ClipboardCheck,
  CloudCheck,
  Download,
  FileDown,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  History,
  Layers,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  Scale,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { useConcreteWorkspace } from './hooks/useConcreteWorkspace';
import {
  calculateConcreteDesignMetrics,
  validateConcreteDesign,
} from './utils/concreteCalculations';
import {
  fitAllStrengthRegressions,
  getBestStrengthRegression,
} from './utils/regressionCalculations';
import { calculateStrengthControl } from './utils/strengthControl';
import { generateConcretePDF } from './utils/pdfGenerator';
import { exportConcreteExcel } from './utils/excelGenerator';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { QuickFieldDosage } from './components/concrete/QuickFieldDosage';
import { ProjectInfoForm } from './components/concrete/ProjectInfoForm';
import { CoreMaterials } from './components/concrete/CoreMaterials';
import { MaterialPropertiesForm } from './components/concrete/MaterialPropertiesForm';
import { AdditivesManager } from './components/concrete/AdditivesManager';
import { SieveAnalysis } from './components/concrete/SieveAnalysis';
import { StrengthDesign } from './components/concrete/StrengthDesign';
import { WaterCementDesign } from './components/concrete/WaterCementDesign';
import { AbsoluteVolume } from './components/concrete/AbsoluteVolume';
import { CoreDosing } from './components/concrete/CoreDosing';
import { FinalMix } from './components/concrete/FinalMix';
import { StrengthCurve } from './components/concrete/StrengthCurve';
import { StrengthControl } from './components/concrete/StrengthControl';
import { ReportPage } from './components/pages/ReportPage';
import { HistoryPage } from './components/pages/HistoryPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { TechnicalDocumentation } from './components/documentation/TechnicalDocumentation';
import { Footer } from './components/common/Footer';
import {
  APP_NAME,
  APP_VERSION_LABEL,
  SITE_AUTHOR,
  SUITE_APPS,
  SUITE_NAME,
} from './config/site';
import type { ConcreteDesign } from './types';

interface AndroidBridgeWindow extends Window {
  AndroidBridge?: {
    saveExportFile?: (content: string, filename: string, mimeType: string, isBase64: boolean) => boolean;
    printPage?: () => boolean;
  };
  __handleAndroidBack?: () => string;
}

const WORK_MODULES = [
  { id: 'dashboard', label: 'Panel General', shortLabel: 'Panel', icon: LayoutDashboard },
  { id: 'quick-site', label: 'Dosificación en Obra', shortLabel: 'Obra', icon: Calculator },
  { id: 'project-info', label: 'Datos de Obra', shortLabel: 'Datos', icon: FileText },
  { id: 'materials', label: 'Materiales y Aditivos', shortLabel: 'Materiales', icon: Box },
  { id: 'sieve', label: 'Granulometría (Fuller)', shortLabel: 'Tamices', icon: Filter },
  { id: 'dosing', label: 'Diseño ACI y Volumen', shortLabel: 'Diseño ACI', icon: Layers },
  { id: 'final-mix', label: 'Mezcla Final y Humedad', shortLabel: 'Mezcla', icon: Scale },
  { id: 'strength-curve', label: 'Regresión Resistencia', shortLabel: 'Regresión', icon: TrendingUp },
  { id: 'strength-control', label: 'Control Estadístico', shortLabel: 'Control', icon: ClipboardCheck },
];

const OUTPUT_MODULES = [
  { id: 'report', label: 'Reporte Técnico', icon: FileDown },
  { id: 'history', label: 'Gestor de Proyectos', icon: History },
  { id: 'docs', label: 'Base Normativa', icon: BookOpen },
  { id: 'settings', label: 'Configuración', icon: Settings },
];

export function App() {
  const {
    settings,
    designs,
    activeDesignId,
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
  } = useConcreteWorkspace();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [cookieAccepted, setCookieAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('concrete_cookie_consent_v2') === 'accepted';
    } catch {
      return true;
    }
  });

  const fileMenuRef = useRef<HTMLDivElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
  };

  useEffect(() => {
    if (!toastMsg) return;
    const timer = window.setTimeout(() => setToastMsg(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMsg]);

  useEffect(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
      preloader.classList.add('hide');
      window.setTimeout(() => preloader.remove(), 350);
    }
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    if (fileMenuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [fileMenuOpen]);

  // Android hardware back button integration
  useEffect(() => {
    (window as AndroidBridgeWindow).__handleAndroidBack = () => {
      if (mobileSidebarOpen) {
        setMobileSidebarOpen(false);
        return 'handled';
      }
      if (fileMenuOpen) {
        setFileMenuOpen(false);
        return 'handled';
      }
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return 'handled';
      }
      return 'exit';
    };
  }, [mobileSidebarOpen, fileMenuOpen, activeTab, setActiveTab]);

  // Computed metrics for active ConcreteDesign
  const designMetrics = useMemo(
    () => calculateConcreteDesignMetrics(currentDesign),
    [currentDesign]
  );

  const designWarnings = useMemo(
    () => validateConcreteDesign(currentDesign),
    [currentDesign]
  );

  const criticalWarnings = useMemo(
    () => designWarnings.filter((w) => w.severity === 'danger').length,
    [designWarnings]
  );

  const recommendedRegression = useMemo(() => {
    const all = fitAllStrengthRegressions(
      currentDesign.strengthRegression.testData,
      currentDesign.designRequirements.workStrengthKgCm2,
      currentDesign.strengthRegression.config.predictionAges
    );
    return getBestStrengthRegression(all);
  }, [currentDesign]);

  const regression28 = useMemo(
    () => recommendedRegression.predictions.find((p) => p.ageDays === 28),
    [recommendedRegression]
  );

  const strengthControlResult = useMemo(
    () =>
      calculateStrengthControl(
        currentDesign.strengthControl.samples,
        currentDesign.designRequirements.workStrengthKgCm2,
        currentDesign.strengthControl.evaluationAge
      ),
    [currentDesign]
  );

  const selectModule = (tabId: string) => {
    setActiveTab(tabId);
    setMobileSidebarOpen(false);
    setFileMenuOpen(false);
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 1024) {
      setMobileSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  };

  const handleExportJSON = (targetDesign?: ConcreteDesign) => {
    const payload = targetDesign ? targetDesign : designs;
    const json = JSON.stringify(payload, null, 2);
    const filename = targetDesign
      ? `Hormigon_${targetDesign.projectInfo.projectName.replace(/\s+/g, '_')}.json`
      : `Proyectos_Hormigon_${new Date().toISOString().slice(0, 10)}.json`;

    const bridge = (window as AndroidBridgeWindow).AndroidBridge;
    if (bridge?.saveExportFile) {
      bridge.saveExportFile(json, filename, 'application/json', false);
      showToast('Archivo JSON exportado');
      return;
    }

    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Archivo JSON exportado');
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ConcreteDesign | ConcreteDesign[];
      handleImportDesigns(Array.isArray(parsed) ? parsed : [parsed]);
      showToast('Proyecto(s) importado(s) correctamente');
    } catch {
      showToast('Error al leer archivo JSON');
    }
    e.target.value = '';
  };

  const handleGeneratePDF = () => {
    generateConcretePDF(currentDesign);
    showToast('Reporte PDF generado');
    setFileMenuOpen(false);
  };

  const handleExportExcel = () => {
    exportConcreteExcel(currentDesign);
    showToast('Hoja de cálculo XLS exportada');
    setFileMenuOpen(false);
  };

  const handlePrint = () => {
    setFileMenuOpen(false);
    const bridge = (window as AndroidBridgeWindow).AndroidBridge;
    if (bridge?.printPage) {
      bridge.printPage();
      return;
    }
    window.print();
  };

  const handleAcceptCookies = () => {
    setCookieAccepted(true);
    try {
      localStorage.setItem('concrete_cookie_consent_v2', 'accepted');
    } catch {
      // ignore
    }
  };

  return (
    <div className={`suite-app-root ${darkMode ? 'dark' : ''}`}>
      {/* Hidden JSON importer */}
      <input
        ref={importJsonRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportJSONFile}
      />

      {/* TOPBAR */}
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={handleToggleSidebar}
            title="Alternar panel lateral"
            aria-label="Alternar panel lateral"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Archivo Dropdown */}
          <div className="file-dropdown" ref={fileMenuRef}>
            <button
              type="button"
              className={`topbar-file-btn ${fileMenuOpen ? 'active' : ''}`}
              onClick={() => setFileMenuOpen((v) => !v)}
              aria-expanded={fileMenuOpen}
            >
              <FolderOpen size={15} />
              <span>Archivo</span>
              <ChevronDown size={13} className={fileMenuOpen ? 'chevron-open' : ''} />
            </button>

            {fileMenuOpen && (
              <div className="dropdown-menu-pro" role="menu">
                <button
                  type="button"
                  className="dropdown-item-pro strong"
                  onClick={() => {
                    handleNewProject();
                    setFileMenuOpen(false);
                    showToast('Nuevo proyecto creado');
                  }}
                >
                  <Plus size={15} />
                  <span>Nuevo Proyecto ACI</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-pro"
                  onClick={() => selectModule('quick-site')}
                >
                  <Calculator size={15} />
                  <span>Dosificación Rápida en Obra (Holcim)</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-pro"
                  onClick={() => selectModule('history')}
                >
                  <History size={15} />
                  <span>Gestor de Proyectos ({designs.length})</span>
                </button>
                <button
                  type="button"
                  className="dropdown-item-pro"
                  onClick={() => {
                    setFileMenuOpen(false);
                    importJsonRef.current?.click();
                  }}
                >
                  <Upload size={15} />
                  <span>Importar Proyecto (.JSON)...</span>
                </button>

                <div className="dropdown-divider-pro" />

                <button
                  type="button"
                  className="dropdown-item-pro"
                  onClick={() => {
                    setFileMenuOpen(false);
                    handleExportJSON(currentDesign);
                  }}
                >
                  <FileJson size={15} />
                  <span>Guardar Proyecto (.JSON)</span>
                </button>
                <button type="button" className="dropdown-item-pro" onClick={handleGeneratePDF}>
                  <FileDown size={15} className="icon-danger" />
                  <span>Reporte Técnico (.PDF)</span>
                </button>
                <button type="button" className="dropdown-item-pro" onClick={handleExportExcel}>
                  <FileSpreadsheet size={15} className="icon-success" />
                  <span>Hoja de Cálculo (.XLS)</span>
                </button>
                <button type="button" className="dropdown-item-pro" onClick={handlePrint}>
                  <Printer size={15} />
                  <span>Imprimir / Guardar Vista PDF</span>
                </button>

                <div className="dropdown-divider-pro" />

                <a className="dropdown-item-pro" href="/cookies.html" onClick={() => setFileMenuOpen(false)}>
                  <ShieldCheck size={15} />
                  <span>Política de Datos y Cookies</span>
                </a>
                <a className="dropdown-item-pro" href="/contacto.html" onClick={() => setFileMenuOpen(false)}>
                  <Activity size={15} />
                  <span>Contacto y Soporte</span>
                </a>
              </div>
            )}
          </div>

          <div className="topbar-divider hide-xs" />

          <button
            type="button"
            className="project-title-trigger"
            onClick={() => selectModule('project-info')}
            title="Editar datos del proyecto activo"
          >
            <span className="project-name-text">
              {currentDesign.projectInfo.projectName || 'Diseño de Hormigón'}
            </span>
            <span className="project-meta-pill">
              f&apos;c {currentDesign.designRequirements.workStrengthKgCm2} kg/cm² · A/C{' '}
              {designMetrics.waterCementRatio.toFixed(2)}
            </span>
          </button>

          <span className="save-status-pill visible">
            <CloudCheck size={14} />
            <span>Local</span>
          </span>
        </div>

        <div className="topbar-menu">
          <button
            type="button"
            className="topbar-item desktop-only-btn"
            onClick={() => selectModule('quick-site')}
            title="Dosificación Rápida en Obra (Holcim)"
          >
            <Calculator size={15} />
            <span className="topbar-item-label">Obra</span>
          </button>

          <button
            type="button"
            className="topbar-item desktop-only-btn"
            onClick={handleGeneratePDF}
            title="Exportar Reporte Técnico PDF"
          >
            <Download size={15} />
            <span className="topbar-item-label">PDF</span>
          </button>

          <button
            type="button"
            className="topbar-icon-btn"
            onClick={toggleDarkMode}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            className={`topbar-icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => selectModule('settings')}
            title="Configuración"
            aria-label="Configuración"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </header>

      {/* APP CONTAINER: SIDEBAR + MAIN CONTENT */}
      <div className="app-container">
        {mobileSidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <aside
          className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${
            mobileSidebarOpen ? 'show-mobile' : ''
          }`}
          aria-label="Navegación principal"
        >
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <div className="brand-icon" aria-hidden="true">
                <span className="brand-symbol">H</span>
              </div>
              <div className="sidebar-brand-text">
                <h1 className="sidebar-title">{APP_NAME}</h1>
                <div className="sidebar-version-row">
                  <span className="sidebar-version-badge">{APP_VERSION_LABEL}</span>
                  <span className="sidebar-suite-tag">{SUITE_NAME}</span>
                </div>
                <div className="sidebar-author">Creado por {SITE_AUTHOR}</div>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-close-mobile"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          <div className="sidebar-body custom-scrollbar">
            <div className="nav-section-title">Módulos de Diseño</div>
            <nav className="sidebar-nav">
              {WORK_MODULES.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-link-custom ${isActive ? 'active' : ''}`}
                    onClick={() => selectModule(item.id)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="nav-section-title">Reportes y Gestión</div>
            <nav className="sidebar-nav">
              {OUTPUT_MODULES.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-link-custom ${isActive ? 'active' : ''}`}
                    onClick={() => selectModule(item.id)}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="nav-section-title">Resumen Técnico Activo</div>
            <div className="sidebar-panel-box">
              <div className="sidebar-metric-line">
                <span>Resistencia f&apos;c</span>
                <strong>{currentDesign.designRequirements.workStrengthKgCm2} kg/cm²</strong>
              </div>
              <div className="sidebar-metric-line">
                <span>f&apos;cr diseño</span>
                <strong>{designMetrics.fcrMPa.toFixed(2)} MPa</strong>
              </div>
              <div className="sidebar-metric-line">
                <span>Relación A/C</span>
                <strong>{designMetrics.waterCementRatio.toFixed(3)}</strong>
              </div>
              <div className="sidebar-metric-line">
                <span>Cemento / Agua</span>
                <strong>
                  {designMetrics.cementKg.toFixed(0)} / {designMetrics.waterKg.toFixed(0)} kg/m³
                </strong>
              </div>
              <div className="sidebar-actions-grid">
                <button type="button" className="sidebar-tool-btn primary" onClick={handleGeneratePDF}>
                  <FileDown size={14} /> Exportar PDF
                </button>
                <button type="button" className="sidebar-tool-btn" onClick={handleExportExcel}>
                  <FileSpreadsheet size={14} /> Exportar XLS
                </button>
              </div>
            </div>

            <div className="sidebar-panel-box suite-ecosystem-mini">
              <div className="suite-ecosystem-head">
                <Layers size={14} />
                <strong>{SUITE_NAME}</strong>
              </div>
              <div className="suite-ecosystem-items">
                {SUITE_APPS.map((app) => (
                  <span
                    key={app.id}
                    className={`suite-pill ${app.current ? 'active-app' : ''}`}
                    title={app.tagline}
                  >
                    {app.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="main-content custom-scrollbar" ref={mainScrollRef}>
          <div className="module-page-container">
            {activeTab === 'dashboard' && (
              <DashboardPage
                currentDesign={currentDesign}
                designs={designs}
                activeDesignId={activeDesignId}
                designMetrics={designMetrics}
                recommendedRegression={recommendedRegression}
                regression28={regression28}
                strengthControlResult={strengthControlResult}
                designWarnings={designWarnings}
                criticalWarnings={criticalWarnings}
                warningCount={designWarnings.length}
                setActiveTab={selectModule}
                setActiveDesignId={setActiveDesignId}
                handleNewProject={handleNewProject}
                deleteDesign={deleteDesign}
              />
            )}

            {activeTab === 'quick-site' && (
              <QuickFieldDosage
                onApplyToAciDesign={(fcKgCm2, cementName) => {
                  handleUpdate('designRequirements.workStrengthKgCm2', fcKgCm2);
                  handleUpdate('designRequirements.cementType', cementName);
                  showToast(`f'c = ${fcKgCm2} kg/cm² aplicado al Diseño ACI`);
                  selectModule('dosing');
                }}
              />
            )}

            {activeTab === 'project-info' && (
              <ProjectInfoForm
                projectInfo={currentDesign.projectInfo}
                designRequirements={currentDesign.designRequirements}
                materials={currentDesign.materials}
                onChange={handleUpdate}
              />
            )}

            {activeTab === 'materials' && (
              <div className="space-y-8">
                <CoreMaterials materials={currentDesign.materials} />
                <MaterialPropertiesForm materials={currentDesign.materials} onChange={handleUpdate} />
                <AdditivesManager design={currentDesign} onChange={handleUpdate} />
              </div>
            )}

            {activeTab === 'sieve' && (
              <SieveAnalysis
                sieveData={currentDesign.sieveAnalysis}
                nominalMaxSizeIn={currentDesign.designRequirements.nominalMaxSizeIn}
                onChange={handleSieveUpdate}
              />
            )}

            {activeTab === 'dosing' && (
              <div className="space-y-8">
                <StrengthDesign designRequirements={currentDesign.designRequirements} />
                <WaterCementDesign design={currentDesign} />
                <AbsoluteVolume design={currentDesign} onChange={handleUpdate} />
              </div>
            )}

            {activeTab === 'final-mix' && (
              <div className="space-y-8">
                <CoreDosing design={currentDesign} />
                <FinalMix design={currentDesign} onChange={handleUpdate} />
              </div>
            )}

            {activeTab === 'strength-curve' && (
              <StrengthCurve
                designRequirements={currentDesign.designRequirements}
                regression={currentDesign.strengthRegression}
                onChange={handleUpdate}
              />
            )}

            {activeTab === 'strength-control' && (
              <StrengthControl
                designRequirements={currentDesign.designRequirements}
                control={currentDesign.strengthControl}
                onChange={handleUpdate}
              />
            )}

            {activeTab === 'report' && (
              <ReportPage
                design={currentDesign}
                onGeneratePDF={handleGeneratePDF}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'history' && (
              <HistoryPage
                designs={designs}
                activeDesignId={activeDesignId}
                onSelect={(id) => {
                  setActiveDesignId(id);
                  selectModule('dashboard');
                }}
                onDuplicate={handleDuplicateDesign}
                onDelete={deleteDesign}
                onImport={handleImportDesigns}
                onExport={handleExportJSON}
              />
            )}

            {activeTab === 'docs' && <TechnicalDocumentation />}

            {activeTab === 'settings' && (
              <SettingsPage
                settings={settings}
                onChange={handleSettingsChange}
                onApplyDefaults={() => {
                  applySettingsToCurrentDesign();
                  showToast('Preferencias aplicadas al diseño activo');
                }}
              />
            )}

            <Footer onSelectTab={selectModule} />
          </div>
        </main>
      </div>

      {/* MOBILE / TABLET BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav" aria-label="Navegación rápida inferior">
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => selectModule('dashboard')}
        >
          <LayoutDashboard size={17} />
          <span>Panel</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'quick-site' ? 'active' : ''}`}
          onClick={() => selectModule('quick-site')}
        >
          <Calculator size={17} />
          <span>Obra</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => selectModule('materials')}
        >
          <Box size={17} />
          <span>Materiales</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'final-mix' || activeTab === 'dosing' ? 'active' : ''}`}
          onClick={() => selectModule('final-mix')}
        >
          <Scale size={17} />
          <span>Mezcla</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => selectModule('report')}
        >
          <FileDown size={17} />
          <span>Reporte</span>
        </button>
        <button
          type="button"
          className={`mobile-nav-item ${mobileSidebarOpen ? 'active' : ''}`}
          onClick={() => setMobileSidebarOpen((v) => !v)}
        >
          <Menu size={17} />
          <span>Menú</span>
        </button>
      </nav>

      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="app-toast-pro" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}

      {/* COOKIE CONSENT BANNER */}
      {!cookieAccepted && (
        <aside className="cookie-banner" aria-label="Aviso de almacenamiento local">
          <div className="cookie-banner-text">
            <strong>Almacenamiento 100% Local</strong>
            <p>
              {APP_NAME} guarda tus diseños de mezcla, materiales y preferencias únicamente en tu dispositivo.
            </p>
          </div>
          <div className="cookie-banner-actions">
            <button type="button" className="pro-btn-primary !py-1.5 !px-3.5 text-xs" onClick={handleAcceptCookies}>
              Entendido
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;

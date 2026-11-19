import React, { useMemo, useState } from 'react';
import {
  Calculator,
  ClipboardCheck,
  DollarSign,
  Droplet,
  FileText,
  Layers,
  Package,
  Plus,
  Scale,
  Shovel,
  Trash2,
  ArrowRight,
} from 'lucide-react';

export type StrengthKey = 'H-140' | 'H-180' | 'H-210' | 'H-240' | 'H-280' | 'H-300' | 'H-350';

interface MixPreset {
  key: StrengthKey;
  fcKgCm2: number;
  fcMpa: number;
  cementKgM3: number;
  sandBucketsM3: number;
  gravelBucketsM3: number;
  waterMinLM3: number;
  waterMaxLM3: number;
  typicalUse: string;
}

interface CementPreset {
  id: string;
  name: string;
  bagKg: number;
}

interface ElementRow {
  id: string;
  name: string;
  kind: 'slab' | 'column_rect' | 'column_circ' | 'beam' | 'footing';
  count: number;
  dimA: number; // Largo o diámetro (m)
  dimB: number; // Ancho (m)
  dimH: number; // Espesor o altura (m)
}

const BUCKET_CAPACITY_FROM_EXCEL = 25.319665991606939;

const MIX_PRESETS: MixPreset[] = [
  { key: 'H-140', fcKgCm2: 140, fcMpa: 13.73, cementKgM3: 250, sandBucketsM3: 20, gravelBucketsM3: 28, waterMinLM3: 140, waterMaxLM3: 150, typicalUse: 'Replantillos, bordillos y elementos no estructurales' },
  { key: 'H-180', fcKgCm2: 180, fcMpa: 17.65, cementKgM3: 300, sandBucketsM3: 21.6, gravelBucketsM3: 28.8, waterMinLM3: 156, waterMaxLM3: 168, typicalUse: 'Contrapisos, aceras, cadenas y muros ligeros' },
  { key: 'H-210', fcKgCm2: 210, fcMpa: 21.0, cementKgM3: 350, sandBucketsM3: 22.4, gravelBucketsM3: 28, waterMinLM3: 175, waterMaxLM3: 189, typicalUse: 'Losas, vigas, columnas y zapatas residenciales' },
  { key: 'H-240', fcKgCm2: 240, fcMpa: 23.54, cementKgM3: 400, sandBucketsM3: 22.4, gravelBucketsM3: 32, waterMinLM3: 184, waterMaxLM3: 200, typicalUse: 'Pórticos estructurales, cimentaciones y muros de contención' },
  { key: 'H-280', fcKgCm2: 280, fcMpa: 27.46, cementKgM3: 450, sandBucketsM3: 21.6, gravelBucketsM3: 32.4, waterMinLM3: 189, waterMaxLM3: 207, typicalUse: 'Columnas de alta carga, pavimentos pesados y cisternas' },
  { key: 'H-300', fcKgCm2: 300, fcMpa: 29.42, cementKgM3: 475, sandBucketsM3: 22.8, gravelBucketsM3: 30.4, waterMinLM3: 195, waterMaxLM3: 214, typicalUse: 'Elementos industriales, puentes y prefabricados' },
  { key: 'H-350', fcKgCm2: 350, fcMpa: 34.32, cementKgM3: 500, sandBucketsM3: 20, gravelBucketsM3: 32, waterMinLM3: 190, waterMaxLM3: 210, typicalUse: 'Hormigón de alta resistencia estructural e infraestructura' },
];

const CEMENT_PRESETS: CementPreset[] = [
  { id: 'holcim-fuerte-gu', name: 'Holcim Fuerte Tipo GU (50 kg)', bagKg: 50 },
  { id: 'holcim-maestro', name: 'Holcim Maestro / Ultra (50 kg)', bagKg: 50 },
  { id: 'cemento-42-5', name: 'Cemento Estándar (42.5 kg)', bagKg: 42.5 },
  { id: 'cemento-25', name: 'Cemento Funda Compacta (25 kg)', bagKg: 25 },
  { id: 'custom', name: 'Personalizado / Otro cemento', bagKg: 50 },
];

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);

const computeElementVolume = (row: ElementRow): number => {
  const n = Math.max(0, row.count || 0);
  const a = Math.max(0, row.dimA || 0);
  const b = Math.max(0, row.dimB || 0);
  const h = Math.max(0, row.dimH || 0);
  if (row.kind === 'column_circ') {
    const radius = a / 2;
    return n * Math.PI * radius * radius * h;
  }
  return n * a * b * h;
};

interface QuickFieldDosageProps {
  onApplyToAciDesign?: (fcKgCm2: number, cementType: string) => void;
}

export const QuickFieldDosage: React.FC<QuickFieldDosageProps> = ({ onApplyToAciDesign }) => {
  const [strength, setStrength] = useState<StrengthKey>('H-210');
  const [volumeM3, setVolumeM3] = useState(6.4);
  const [wastePercent, setWastePercent] = useState(5);
  const [bucketLiters, setBucketLiters] = useState(BUCKET_CAPACITY_FROM_EXCEL);
  const [cementId, setCementId] = useState(CEMENT_PRESETS[0].id);
  const [customCementName, setCustomCementName] = useState('Cemento Portland GU');
  const [customBagKg, setCustomBagKg] = useState(50);

  // Unit costs (USD)
  const [bagPriceUsd, setBagPriceUsd] = useState(8.5);
  const [sandM3PriceUsd, setSandM3PriceUsd] = useState(18);
  const [gravelM3PriceUsd, setGravelM3PriceUsd] = useState(22);

  // Structural elements volume builder
  const [elements, setElements] = useState<ElementRow[]>([
    { id: 'el-1', name: 'Losa de entrepiso N+3.00', kind: 'slab', count: 1, dimA: 8, dimB: 5, dimH: 0.12 },
    { id: 'el-2', name: 'Columnas C1 (30×30 cm)', kind: 'column_rect', count: 6, dimA: 0.3, dimB: 0.3, dimH: 3.0 },
  ]);

  const elementsTotalVolume = useMemo(
    () => elements.reduce((acc, row) => acc + computeElementVolume(row), 0),
    [elements]
  );

  const selectedMix = MIX_PRESETS.find((mix) => mix.key === strength) ?? MIX_PRESETS[2];
  const selectedCementPreset = CEMENT_PRESETS.find((cement) => cement.id === cementId) ?? CEMENT_PRESETS[0];
  const selectedCement = {
    name: cementId === 'custom' ? customCementName.trim() || 'Otro cemento' : selectedCementPreset.name,
    bagKg: clampNumber(cementId === 'custom' ? customBagKg : selectedCementPreset.bagKg, 1, 100),
  };

  const results = useMemo(() => {
    const safeVolume = clampNumber(volumeM3, 0, 100000);
    const safeWastePercent = clampNumber(wastePercent, 0, 50);
    const safeBucketLiters = clampNumber(bucketLiters, 1, 80);
    const factor = 1 + safeWastePercent / 100;
    const totalVolume = safeVolume * factor;
    const bagsM3 = selectedMix.cementKgM3 / selectedCement.bagKg;
    const cementKg = selectedMix.cementKgM3 * totalVolume;
    const bagsExact = cementKg / selectedCement.bagKg;
    const bagsToBuy = Math.ceil(bagsExact);
    const sandBuckets = selectedMix.sandBucketsM3 * totalVolume;
    const gravelBuckets = selectedMix.gravelBucketsM3 * totalVolume;
    const sandLiters = sandBuckets * safeBucketLiters;
    const gravelLiters = gravelBuckets * safeBucketLiters;
    const sandM3 = sandLiters / 1000;
    const gravelM3 = gravelLiters / 1000;
    const waterMin = selectedMix.waterMinLM3 * totalVolume;
    const waterMax = selectedMix.waterMaxLM3 * totalVolume;

    const costCement = bagsToBuy * Math.max(0, bagPriceUsd);
    const costSand = sandM3 * Math.max(0, sandM3PriceUsd);
    const costGravel = gravelM3 * Math.max(0, gravelM3PriceUsd);
    const totalCostUsd = costCement + costSand + costGravel;

    return {
      bagsM3,
      bagsExact,
      bagsToBuy,
      cementKg,
      gravelBuckets,
      gravelLiters,
      gravelM3,
      sandBuckets,
      sandLiters,
      sandM3,
      totalVolume,
      waterMin,
      waterMax,
      waterMinPerBag: bagsM3 > 0 ? selectedMix.waterMinLM3 / bagsM3 : 0,
      waterMaxPerBag: bagsM3 > 0 ? selectedMix.waterMaxLM3 / bagsM3 : 0,
      sandBucketsPerBag: bagsM3 > 0 ? selectedMix.sandBucketsM3 / bagsM3 : 0,
      gravelBucketsPerBag: bagsM3 > 0 ? selectedMix.gravelBucketsM3 / bagsM3 : 0,
      costCement,
      costSand,
      costGravel,
      totalCostUsd,
    };
  }, [bucketLiters, selectedCement.bagKg, selectedMix, volumeM3, wastePercent, bagPriceUsd, sandM3PriceUsd, gravelM3PriceUsd]);

  const handleAddElement = () => {
    setElements((prev) => [
      ...prev,
      {
        id: `el-${prev.length + 1}-${Math.round(Math.random() * 1000)}`,
        name: `Elemento ${prev.length + 1}`,
        kind: 'beam',
        count: 1,
        dimA: 4.0,
        dimB: 0.25,
        dimH: 0.35,
      },
    ]);
  };

  const handleUpdateElement = (id: string, patch: Partial<ElementRow>) => {
    setElements((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleRemoveElement = (id: string) => {
    setElements((prev) => prev.filter((row) => row.id !== id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main 2-column Field Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form className="lg:col-span-5 pro-card space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="card-head-line">
            <h3>
              <Calculator size={18} /> Parámetros de Dosificación en Obra
            </h3>
            <span className="badge-pill">{selectedMix.key}</span>
          </div>

          <label className="field-label">
            Tipo de cemento
            <select className="pro-input" value={cementId} onChange={(e) => setCementId(e.target.value)}>
              {CEMENT_PRESETS.map((cement) => (
                <option key={cement.id} value={cement.id}>
                  {cement.name}
                </option>
              ))}
            </select>
          </label>

          {cementId === 'custom' && (
            <label className="field-label">
              Nombre del cemento personalizado
              <input
                className="pro-input"
                type="text"
                value={customCementName}
                onChange={(e) => setCustomCementName(e.target.value)}
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="field-label">
              Resistencia objetivo
              <select
                className="pro-input"
                value={strength}
                onChange={(e) => setStrength(e.target.value as StrengthKey)}
              >
                {MIX_PRESETS.map((mix) => (
                  <option key={mix.key} value={mix.key}>
                    {mix.key} ({mix.fcKgCm2} kg/cm² · {formatNumber(mix.fcMpa, 1)} MPa)
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Peso por funda (kg)
              <input
                className="pro-input"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={selectedCement.bagKg}
                onChange={(e) => {
                  setCementId('custom');
                  setCustomBagKg(Number(e.target.value));
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="field-label">
              Volumen neto (m³)
              <input
                className="pro-input"
                type="number"
                min="0"
                step="0.05"
                value={volumeM3}
                onChange={(e) => setVolumeM3(Number(e.target.value))}
              />
            </label>

            <label className="field-label">
              Desperdicio (%)
              <input
                className="pro-input"
                type="number"
                min="0"
                max="50"
                step="1"
                value={wastePercent}
                onChange={(e) => setWastePercent(Number(e.target.value))}
              />
            </label>

            <label className="field-label">
              Balde (Litros)
              <input
                className="pro-input"
                type="number"
                min="1"
                max="80"
                step="0.1"
                value={Number(bucketLiters.toFixed(2))}
                onChange={(e) => setBucketLiters(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="card-subtle text-xs space-y-1">
            <strong className="block">Uso recomendado ({selectedMix.key}):</strong>
            <span className="text-muted">{selectedMix.typicalUse}. Base Holcim: balde estándar de {formatNumber(BUCKET_CAPACITY_FROM_EXCEL, 2)} L.</span>
          </div>

          {onApplyToAciDesign && (
            <button
              type="button"
              className="pro-btn-secondary w-full justify-center"
              onClick={() => onApplyToAciDesign(selectedMix.fcKgCm2, selectedCement.name)}
            >
              Sincronizar f&apos;c ({selectedMix.fcKgCm2} kg/cm²) con Diseño ACI <ArrowRight size={15} />
            </button>
          )}
        </form>

        {/* Right Summary & Quantities */}
        <div className="lg:col-span-7 pro-card space-y-4">
          <div className="card-head-line">
            <h3>
              <ClipboardCheck size={18} /> Cantidades Totales de Obra ({selectedCement.name})
            </h3>
            <span className="badge-pill">Vol. total: {formatNumber(results.totalVolume, 2)} m³</span>
          </div>

          <div className="hero-kpi-banner">
            <div>
              <span className="hero-kpi-label">FUNDAS DE CEMENTO A COMPRAR</span>
              <div className="hero-kpi-number">{formatNumber(results.bagsToBuy, 0)} fundas</div>
              <span className="hero-kpi-sub">
                {formatNumber(results.bagsExact, 2)} fundas exactas · {formatNumber(results.cementKg, 0)} kg totales (incluye {wastePercent}% desperdicio)
              </span>
            </div>
            <div className="hero-kpi-cost">
              <span className="hero-kpi-label">PRESUPUESTO ESTIMADO</span>
              <div className="hero-kpi-price">${formatNumber(results.totalCostUsd, 2)} USD</div>
              <span className="hero-kpi-sub">Cemento + Arena + Grava</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="kpi-mini-card">
              <div className="kpi-mini-head">
                <Scale size={16} /> <span>Cemento</span>
              </div>
              <strong>{formatNumber(results.cementKg, 0)} kg</strong>
              <small>{formatNumber(results.bagsM3, 2)} fundas / m³</small>
            </div>

            <div className="kpi-mini-card">
              <div className="kpi-mini-head">
                <Shovel size={16} /> <span>Arena Fina</span>
              </div>
              <strong>{formatNumber(results.sandM3, 2)} m³</strong>
              <small>{formatNumber(results.sandBuckets, 1)} baldes</small>
            </div>

            <div className="kpi-mini-card">
              <div className="kpi-mini-head">
                <Package size={16} /> <span>Grava / Ripio</span>
              </div>
              <strong>{formatNumber(results.gravelM3, 2)} m³</strong>
              <small>{formatNumber(results.gravelBuckets, 1)} baldes</small>
            </div>

            <div className="kpi-mini-card">
              <div className="kpi-mini-head">
                <Droplet size={16} /> <span>Agua Limpia</span>
              </div>
              <strong>
                {formatNumber(results.waterMin, 0)}–{formatNumber(results.waterMax, 0)} L
              </strong>
              <small>Agregar gradualmente</small>
            </div>
          </div>

          {/* Reference per 1 Bag & Cost Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="card-subtle space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                <Package size={15} /> Dosificación por 1 Funda ({selectedCement.bagKg} kg)
              </h4>
              <div className="quick-kv-row">
                <span>Arena por funda</span>
                <strong>{formatNumber(results.sandBucketsPerBag, 2)} baldes</strong>
              </div>
              <div className="quick-kv-row">
                <span>Grava por funda</span>
                <strong>{formatNumber(results.gravelBucketsPerBag, 2)} baldes</strong>
              </div>
              <div className="quick-kv-row">
                <span>Agua por funda</span>
                <strong>
                  {formatNumber(results.waterMinPerBag, 1)} – {formatNumber(results.waterMaxPerBag, 1)} L
                </strong>
              </div>
            </div>

            <div className="card-subtle space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={15} /> Precios Unitarios Referenciales (USD)
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <label className="field-label text-xs">
                  Funda ($)
                  <input
                    className="pro-input"
                    type="number"
                    min="0"
                    step="0.25"
                    value={bagPriceUsd}
                    onChange={(e) => setBagPriceUsd(Number(e.target.value))}
                  />
                </label>
                <label className="field-label text-xs">
                  Arena $/m³
                  <input
                    className="pro-input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={sandM3PriceUsd}
                    onChange={(e) => setSandM3PriceUsd(Number(e.target.value))}
                  />
                </label>
                <label className="field-label text-xs">
                  Grava $/m³
                  <input
                    className="pro-input"
                    type="number"
                    min="0"
                    step="0.5"
                    value={gravelM3PriceUsd}
                    onChange={(e) => setGravelM3PriceUsd(Number(e.target.value))}
                  />
                </label>
              </div>
              <div className="text-xs text-muted pt-1">
                Cemento: <strong>${formatNumber(results.costCement, 2)}</strong> · Arena:{' '}
                <strong>${formatNumber(results.costSand, 2)}</strong> · Grava:{' '}
                <strong>${formatNumber(results.costGravel, 2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Structural Elements Volume Calculator */}
      <div className="pro-card space-y-4">
        <div className="card-head-line">
          <h3>
            <Layers size={18} /> Cubicaje de Volumen por Elementos Estructurales
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-pill">Suma: {formatNumber(elementsTotalVolume, 2)} m³</span>
            <button type="button" className="pro-btn-secondary !py-1.5 !px-3 text-xs" onClick={handleAddElement}>
              <Plus size={14} /> Agregar Elemento
            </button>
            <button
              type="button"
              className="pro-btn-primary !py-1.5 !px-3 text-xs"
              onClick={() => setVolumeM3(Number(elementsTotalVolume.toFixed(2)))}
            >
              Usar {formatNumber(elementsTotalVolume, 2)} m³ en Calculadora
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="pro-table">
            <thead>
              <tr>
                <th>Elemento / Descripción</th>
                <th>Geometría</th>
                <th>Cant.</th>
                <th>Largo / Diám. (m)</th>
                <th>Ancho (m)</th>
                <th>Altura / Esp. (m)</th>
                <th>Subtotal (m³)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {elements.map((row) => {
                const subVol = computeElementVolume(row);
                return (
                  <tr key={row.id}>
                    <td>
                      <input
                        className="pro-input !py-1.5"
                        value={row.name}
                        onChange={(e) => handleUpdateElement(row.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className="pro-input !py-1.5"
                        value={row.kind}
                        onChange={(e) =>
                          handleUpdateElement(row.id, { kind: e.target.value as ElementRow['kind'] })
                        }
                      >
                        <option value="slab">Losa / Contrapiso</option>
                        <option value="column_rect">Columna Rectangular</option>
                        <option value="column_circ">Columna Circular</option>
                        <option value="beam">Viga / Cadena</option>
                        <option value="footing">Zapata / Plinto</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="pro-input !py-1.5 w-20"
                        value={row.count}
                        onChange={(e) => handleUpdateElement(row.id, { count: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        className="pro-input !py-1.5 w-24"
                        value={row.dimA}
                        onChange={(e) => handleUpdateElement(row.id, { dimA: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      {row.kind === 'column_circ' ? (
                        <span className="text-xs text-muted">Circular (Ø)</span>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          className="pro-input !py-1.5 w-24"
                          value={row.dimB}
                          onChange={(e) => handleUpdateElement(row.id, { dimB: Number(e.target.value) })}
                        />
                      )}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.05"
                        className="pro-input !py-1.5 w-24"
                        value={row.dimH}
                        onChange={(e) => handleUpdateElement(row.id, { dimH: Number(e.target.value) })}
                      />
                    </td>
                    <td className="font-mono font-bold">{formatNumber(subVol, 3)} m³</td>
                    <td>
                      <button
                        type="button"
                        className="icon-action-btn danger"
                        onClick={() => handleRemoveElement(row.id)}
                        title="Eliminar fila"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reference Base Table per 1 m³ */}
      <div className="pro-card space-y-4">
        <div className="card-head-line">
          <h3>
            <FileText size={18} /> Tabla Maestra de Dosificación por 1 m³ (Referencia Holcim)
          </h3>
          <span className="badge-pill">H-140 a H-350</span>
        </div>

        <div className="table-wrap">
          <table className="pro-table">
            <thead>
              <tr>
                <th>Clase</th>
                <th>f&apos;c (kg/cm²)</th>
                <th>f&apos;c (MPa)</th>
                <th>Cemento (kg/m³)</th>
                <th>Fundas / m³</th>
                <th>Arena (baldes)</th>
                <th>Grava (baldes)</th>
                <th>Agua (L/m³)</th>
                <th>Aplicación típica</th>
              </tr>
            </thead>
            <tbody>
              {MIX_PRESETS.map((mix) => {
                const bags = mix.cementKgM3 / selectedCement.bagKg;
                const isSelected = mix.key === strength;
                return (
                  <tr
                    key={mix.key}
                    className={isSelected ? 'active-table-row cursor-pointer' : 'cursor-pointer'}
                    onClick={() => setStrength(mix.key)}
                  >
                    <td className="font-extrabold">{mix.key}</td>
                    <td>{mix.fcKgCm2}</td>
                    <td>{formatNumber(mix.fcMpa, 2)}</td>
                    <td>{formatNumber(mix.cementKgM3, 0)}</td>
                    <td className="font-mono font-bold">{formatNumber(bags, 2)}</td>
                    <td>{formatNumber(mix.sandBucketsM3, 1)}</td>
                    <td>{formatNumber(mix.gravelBucketsM3, 1)}</td>
                    <td>
                      {formatNumber(mix.waterMinLM3, 0)} – {formatNumber(mix.waterMaxLM3, 0)}
                    </td>
                    <td className="text-xs text-muted">{mix.typicalUse}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

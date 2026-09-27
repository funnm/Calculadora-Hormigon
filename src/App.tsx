import { useMemo, useState, type ReactNode } from 'react';
import {
  Calculator,
  ClipboardCheck,
  Droplet,
  FileText,
  Hash,
  Moon,
  Package,
  Scale,
  Shovel,
  Sun,
} from 'lucide-react';

type StrengthKey = 'H-140' | 'H-180' | 'H-210' | 'H-240' | 'H-280' | 'H-300' | 'H-350';

interface MixPreset {
  key: StrengthKey;
  fcMpa: number;
  cementKgM3: number;
  sandBucketsM3: number;
  gravelBucketsM3: number;
  waterMinLM3: number;
  waterMaxLM3: number;
}

interface CementPreset {
  id: string;
  name: string;
  bagKg: number;
}

const bucketCapacityFromExcel = 25.319665991606939;

const mixPresets: MixPreset[] = [
  { key: 'H-140', fcMpa: 13.73, cementKgM3: 250, sandBucketsM3: 20, gravelBucketsM3: 28, waterMinLM3: 140, waterMaxLM3: 150 },
  { key: 'H-180', fcMpa: 17.65, cementKgM3: 300, sandBucketsM3: 21.6, gravelBucketsM3: 28.8, waterMinLM3: 156, waterMaxLM3: 168 },
  { key: 'H-210', fcMpa: 21, cementKgM3: 350, sandBucketsM3: 22.4, gravelBucketsM3: 28, waterMinLM3: 175, waterMaxLM3: 189 },
  { key: 'H-240', fcMpa: 23.54, cementKgM3: 400, sandBucketsM3: 22.4, gravelBucketsM3: 32, waterMinLM3: 184, waterMaxLM3: 200 },
  { key: 'H-280', fcMpa: 27.46, cementKgM3: 450, sandBucketsM3: 21.6, gravelBucketsM3: 32.4, waterMinLM3: 189, waterMaxLM3: 207 },
  { key: 'H-300', fcMpa: 29.42, cementKgM3: 475, sandBucketsM3: 22.8, gravelBucketsM3: 30.4, waterMinLM3: 195, waterMaxLM3: 214 },
  { key: 'H-350', fcMpa: 34.32, cementKgM3: 500, sandBucketsM3: 20, gravelBucketsM3: 32, waterMinLM3: 190, waterMaxLM3: 210 },
];

const cementPresets: CementPreset[] = [
  { id: 'holcim-fuerte-gu', name: 'Holcim Fuerte Tipo GU', bagKg: 50 },
  { id: 'cemento-50', name: 'Cemento funda 50 kg', bagKg: 50 },
  { id: 'cemento-42-5', name: 'Cemento funda 42.5 kg', bagKg: 42.5 },
  { id: 'cemento-25', name: 'Cemento funda 25 kg', bagKg: 25 },
  { id: 'custom', name: 'Otro cemento', bagKg: 50 },
];

const clampNumber = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const formatNumber = (value: number, digits = 2) => (
  new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
);

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [strength, setStrength] = useState<StrengthKey>('H-210');
  const [volumeM3, setVolumeM3] = useState(6.4);
  const [wastePercent, setWastePercent] = useState(0);
  const [bucketLiters, setBucketLiters] = useState(bucketCapacityFromExcel);
  const [cementId, setCementId] = useState(cementPresets[0].id);
  const [customCementName, setCustomCementName] = useState('Mi cemento');
  const [customBagKg, setCustomBagKg] = useState(50);

  const selectedMix = mixPresets.find((mix) => mix.key === strength) ?? mixPresets[2];
  const selectedCementPreset = cementPresets.find((cement) => cement.id === cementId) ?? cementPresets[0];
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
    const waterMin = selectedMix.waterMinLM3 * totalVolume;
    const waterMax = selectedMix.waterMaxLM3 * totalVolume;

    return {
      bagsM3,
      bagsExact,
      bagsToBuy,
      cementKg,
      gravelBuckets,
      gravelLiters,
      gravelM3: gravelLiters / 1000,
      sandBuckets,
      sandLiters,
      sandM3: sandLiters / 1000,
      totalVolume,
      waterMin,
      waterMax,
      waterMinPerBag: bagsM3 > 0 ? selectedMix.waterMinLM3 / bagsM3 : 0,
      waterMaxPerBag: bagsM3 > 0 ? selectedMix.waterMaxLM3 / bagsM3 : 0,
      sandBucketsPerBag: bagsM3 > 0 ? selectedMix.sandBucketsM3 / bagsM3 : 0,
      gravelBucketsPerBag: bagsM3 > 0 ? selectedMix.gravelBucketsM3 / bagsM3 : 0,
    };
  }, [bucketLiters, selectedCement.bagKg, selectedMix, volumeM3, wastePercent]);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <main className="app-shell">
        <header className="app-header">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden="true">
              <Hash size={24} />
            </div>
            <div>
              <p className="eyebrow">Creado por Paul R</p>
              <h1>Calculadora de hormigon</h1>
              <p className="header-copy">Calcula fundas de cemento, arena, grava y agua para un volumen de obra.</p>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => setDarkMode((current) => !current)}
            title={darkMode ? 'Usar modo claro' : 'Usar modo oscuro'}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </header>

        <section className="calculator-grid" aria-label="Calculadora principal">
          <form className="tool-panel" onSubmit={(event) => event.preventDefault()}>
            <div className="section-heading">
              <Calculator size={22} aria-hidden="true" />
              <div>
                <p className="eyebrow">Entradas</p>
                <h2>Datos de la mezcla</h2>
              </div>
            </div>

            <label className="field-group">
              <span>Tipo de cemento</span>
              <select className="field-control" value={cementId} onChange={(event) => setCementId(event.target.value)}>
                {cementPresets.map((cement) => (
                  <option key={cement.id} value={cement.id}>{cement.name}</option>
                ))}
              </select>
            </label>

            {cementId === 'custom' && (
              <label className="field-group">
                <span>Nombre del cemento</span>
                <input
                  className="field-control"
                  value={customCementName}
                  onChange={(event) => setCustomCementName(event.target.value)}
                  type="text"
                />
              </label>
            )}

            <div className="input-pair">
              <label className="field-group">
                <span>Resistencia</span>
                <select className="field-control" value={strength} onChange={(event) => setStrength(event.target.value as StrengthKey)}>
                  {mixPresets.map((mix) => (
                    <option key={mix.key} value={mix.key}>{mix.key} - {formatNumber(mix.fcMpa, 2)} MPa</option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span>Peso por funda</span>
                <input
                  className="field-control"
                  min="1"
                  max="100"
                  step="0.5"
                  value={selectedCement.bagKg}
                  onChange={(event) => {
                    setCementId('custom');
                    setCustomBagKg(Number(event.target.value));
                  }}
                  type="number"
                />
              </label>
            </div>

            <div className="input-pair">
              <label className="field-group">
                <span>Volumen de hormigon</span>
                <input
                  className="field-control"
                  min="0"
                  step="0.01"
                  value={volumeM3}
                  onChange={(event) => setVolumeM3(Number(event.target.value))}
                  type="number"
                />
              </label>

              <label className="field-group">
                <span>Desperdicio (%)</span>
                <input
                  className="field-control"
                  min="0"
                  max="50"
                  step="1"
                  value={wastePercent}
                  onChange={(event) => setWastePercent(Number(event.target.value))}
                  type="number"
                />
              </label>
            </div>

            <label className="field-group">
              <span>Capacidad del balde (L)</span>
              <input
                className="field-control"
                min="1"
                max="80"
                step="0.01"
                value={bucketLiters}
                onChange={(event) => setBucketLiters(Number(event.target.value))}
                type="number"
              />
            </label>

            <div className="source-note">
              Base tomada del Excel Holcim: balde promedio de {formatNumber(bucketCapacityFromExcel, 2)} L y dosificaciones H-140 a H-350.
            </div>
          </form>

          <section className="summary-panel" aria-label="Resultados principales">
            <div className="section-heading">
              <ClipboardCheck size={22} aria-hidden="true" />
              <div>
                <p className="eyebrow">Resultado</p>
                <h2>{selectedCement.name}</h2>
              </div>
            </div>

            <div className="hero-result">
              <p>Fundas a comprar</p>
              <strong>{formatNumber(results.bagsToBuy, 0)}</strong>
              <span>{formatNumber(results.bagsExact, 2)} fundas exactas para {formatNumber(results.totalVolume, 2)} m3</span>
            </div>

            <div className="result-grid">
              <ResultTile icon={<Scale size={20} />} label="Cemento" value={`${formatNumber(results.cementKg, 0)} kg`} detail={`${formatNumber(results.bagsM3, 2)} fundas/m3`} />
              <ResultTile icon={<Shovel size={20} />} label="Arena" value={`${formatNumber(results.sandBuckets, 2)} baldes`} detail={`${formatNumber(results.sandM3, 2)} m3`} />
              <ResultTile icon={<Package size={20} />} label="Grava" value={`${formatNumber(results.gravelBuckets, 2)} baldes`} detail={`${formatNumber(results.gravelM3, 2)} m3`} />
              <ResultTile icon={<Droplet size={20} />} label="Agua" value={`${formatNumber(results.waterMin, 0)} - ${formatNumber(results.waterMax, 0)} L`} detail="Agregar poco a poco" />
            </div>
          </section>
        </section>

        <section className="detail-grid">
          <div className="tool-panel">
            <div className="section-heading">
              <Package size={22} aria-hidden="true" />
              <div>
                <p className="eyebrow">Por funda</p>
                <h2>Referencia rapida</h2>
              </div>
            </div>
            <div className="quick-list">
              <QuickRow label="Arena" value={`${formatNumber(results.sandBucketsPerBag, 2)} baldes`} />
              <QuickRow label="Grava" value={`${formatNumber(results.gravelBucketsPerBag, 2)} baldes`} />
              <QuickRow label="Agua" value={`${formatNumber(results.waterMinPerBag, 1)} - ${formatNumber(results.waterMaxPerBag, 1)} L`} />
              <QuickRow label="Cemento" value={`${formatNumber(selectedCement.bagKg, 1)} kg`} />
            </div>
          </div>

          <div className="tool-panel">
            <div className="section-heading">
              <FileText size={22} aria-hidden="true" />
              <div>
                <p className="eyebrow">Control</p>
                <h2>Notas de obra</h2>
              </div>
            </div>
            <ul className="notes-list">
              <li>La dosificacion es referencial y debe ajustarse con humedad real de arena y grava.</li>
              <li>No agregues toda el agua al inicio; corrige segun trabajabilidad.</li>
              <li>Antes de vaciar en obra, valida la mezcla con una prueba corta.</li>
            </ul>
          </div>
        </section>

        <section className="table-panel" aria-label="Tabla base de dosificacion">
          <div className="section-heading">
            <FileText size={22} aria-hidden="true" />
            <div>
              <p className="eyebrow">Tabla base</p>
              <h2>Dosificacion por 1 m3</h2>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Resistencia</th>
                  <th>f'c MPa</th>
                  <th>Cemento kg/m3</th>
                  <th>Fundas/m3</th>
                  <th>Arena baldes</th>
                  <th>Grava baldes</th>
                  <th>Agua L/m3</th>
                </tr>
              </thead>
              <tbody>
                {mixPresets.map((mix) => {
                  const bags = mix.cementKgM3 / selectedCement.bagKg;
                  return (
                    <tr key={mix.key} className={mix.key === strength ? 'active-row' : undefined}>
                      <td>{mix.key}</td>
                      <td>{formatNumber(mix.fcMpa, 2)}</td>
                      <td>{formatNumber(mix.cementKgM3, 0)}</td>
                      <td>{formatNumber(bags, 2)}</td>
                      <td>{formatNumber(mix.sandBucketsM3, 2)}</td>
                      <td>{formatNumber(mix.gravelBucketsM3, 2)}</td>
                      <td>{formatNumber(mix.waterMinLM3, 0)} - {formatNumber(mix.waterMaxLM3, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function ResultTile({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="result-tile">
      <div className="tile-icon" aria-hidden="true">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="quick-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;

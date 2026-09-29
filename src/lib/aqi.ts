// AirPulse AI — AQI computation, baselines, anomaly detection, causes, alerts.
// AQI breakpoints follow the CPCB India AQI method (2014).

export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3' | 'nh3';

export type PollutantMeta = { key: PollutantKey; name: string; unit: string };

export const POLLUTANTS: PollutantMeta[] = [
  { key: 'pm25', name: 'PM2.5', unit: 'µg/m³' },
  { key: 'pm10', name: 'PM10', unit: 'µg/m³' },
  { key: 'no2', name: 'NO₂', unit: 'µg/m³' },
  { key: 'so2', name: 'SO₂', unit: 'µg/m³' },
  { key: 'co', name: 'CO', unit: 'mg/m³' },
  { key: 'o3', name: 'O₃', unit: 'µg/m³' },
  { key: 'nh3', name: 'NH₃', unit: 'µg/m³' },
];

// CPCB sub-index breakpoints: [concentration low, high, index low, high]
type Breakpoint = [number, number, number, number];

const BANDS: Record<PollutantKey, Breakpoint[]> = {
  pm25: [[0, 30, 0, 50], [31, 60, 51, 100], [61, 90, 101, 200], [91, 120, 201, 300], [121, 250, 301, 400], [251, 500, 401, 500]],
  pm10: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 250, 101, 200], [251, 350, 201, 300], [351, 430, 301, 400], [431, 600, 401, 500]],
  no2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 180, 101, 200], [181, 280, 201, 300], [281, 400, 301, 400], [401, 800, 401, 500]],
  so2: [[0, 40, 0, 50], [41, 80, 51, 100], [81, 380, 101, 200], [381, 800, 201, 300], [801, 1600, 301, 400], [1601, 2000, 401, 500]],
  co: [[0, 1, 0, 50], [1.1, 2, 51, 100], [2.1, 10, 101, 200], [10.1, 17, 201, 300], [17.1, 34, 301, 400], [34.1, 50, 401, 500]],
  o3: [[0, 50, 0, 50], [51, 100, 51, 100], [101, 168, 101, 200], [169, 208, 201, 300], [209, 748, 301, 400], [749, 1000, 401, 500]],
  nh3: [[0, 200, 0, 50], [201, 400, 51, 100], [401, 800, 101, 200], [801, 1200, 201, 300], [1201, 1800, 301, 400], [1801, 2400, 401, 500]],
};

export function subIndex(value: number, key: PollutantKey): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  const band = BANDS[key].find(([lo, hi]) => value >= lo && value <= hi);
  if (!band) return value > (BANDS[key][BANDS[key].length - 1]?.[1] ?? 0) ? 500 : 0;
  const [bLo, bHi, iLo, iHi] = band;
  return Math.round(((iHi - iLo) / (bHi - bLo)) * (value - bLo) + iLo);
}

export type Concentrations = Partial<Record<PollutantKey, number>>;

export type AqiResult = {
  value: number;
  dominant: PollutantKey | null;
  subIndexes: { key: PollutantKey; name: string; unit: string; concentration: number; index: number }[];
};

export function computeAqi(c: Concentrations): AqiResult {
  const subIndexes = POLLUTANTS
    .filter((p) => typeof c[p.key] === 'number')
    .map((p) => ({ ...p, concentration: c[p.key] as number, index: subIndex(c[p.key] as number, p.key) }));
  if (!subIndexes.length) return { value: 0, dominant: null, subIndexes };
  const top = subIndexes.reduce((a, b) => (b.index > a.index ? b : a));
  return { value: top.index, dominant: top.key, subIndexes };
}

export type Category = { label: string; color: string; bg: string; text: string; level: 1 | 2 | 3 | 4 | 5 | 6 };

const CATEGORIES: Category[] = [
  { label: 'Good', color: '#16a36a', bg: '#e5f7ee', text: 'Air quality is satisfactory; risk is low.', level: 1 },
  { label: 'Satisfactory', color: '#82b735', bg: '#f0f7df', text: 'Minor breathing discomfort may occur in sensitive people.', level: 2 },
  { label: 'Moderate', color: '#e9b329', bg: '#fff6d9', text: 'People with lung, heart or asthma conditions should limit prolonged exertion.', level: 3 },
  { label: 'Poor', color: '#ef8734', bg: '#fff0e2', text: 'Prolonged exposure may cause breathing discomfort.', level: 4 },
  { label: 'Very Poor', color: '#e84e55', bg: '#ffeaeb', text: 'Respiratory effects may occur with prolonged exposure.', level: 5 },
  { label: 'Severe', color: '#9b2638', bg: '#f9e5e9', text: 'Health impacts possible even in healthy people; reduce outdoor exposure.', level: 6 },
];

export function category(aqi: number): Category {
  if (aqi <= 50) return CATEGORIES[0];
  if (aqi <= 100) return CATEGORIES[1];
  if (aqi <= 200) return CATEGORIES[2];
  if (aqi <= 300) return CATEGORIES[3];
  if (aqi <= 400) return CATEGORIES[4];
  return CATEGORIES[5];
}

// ---------- Baselines ----------

export type MonthlyBaseline = { month: number; medianAqi: number; p25: number; p75: number };

export type Baseline = {
  medianAqi: number;
  p25: number;
  p75: number;
  monthly: MonthlyBaseline[];
  typicalConcentrations: Concentrations;
};

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeBaseline(history: { month: number; aqi: number; concentrations: Concentrations }[]): Baseline {
  const sorted = history.map((h) => h.aqi).sort((a, b) => a - b);
  const monthly: MonthlyBaseline[] = [];
  for (let m = 0; m < 12; m++) {
    const rows = history.filter((h) => h.month === m).map((h) => h.aqi).sort((a, b) => a - b);
    if (rows.length) monthly.push({ month: m, medianAqi: Math.round(quantile(rows, 0.5)), p25: Math.round(quantile(rows, 0.25)), p75: Math.round(quantile(rows, 0.75)) });
  }
  const typicalConcentrations: Concentrations = {};
  for (const p of POLLUTANTS) {
    const vals = history.map((h) => h.concentrations[p.key]).filter((v): v is number => typeof v === 'number').sort((a, b) => a - b);
    if (vals.length) typicalConcentrations[p.key] = Math.round(quantile(vals, 0.5) * 10) / 10;
  }
  return {
    medianAqi: Math.round(quantile(sorted, 0.5)),
    p25: Math.round(quantile(sorted, 0.25)),
    p75: Math.round(quantile(sorted, 0.75)),
    monthly,
    typicalConcentrations,
  };
}

// ---------- Anomaly detection ----------

export type Anomaly = {
  isAnomalous: boolean;
  reasons: string[];
  healthFlag: boolean;
  healthDetail: string;
  deviationFlag: boolean;
  deviationDetail: string;
  deviationRatio: number | null;
  seasonalMedian: number | null;
  confidence: number;
};

export function detectAnomaly(aqiValue: number, baseline: Baseline, month: number, dataMode: 'DEMO' | 'MODEL'): Anomaly {
  const cat = category(aqiValue);
  const reasons: string[] = [];
  const healthFlag = cat.level >= 4;
  if (healthFlag) reasons.push(`CPCB health category: ${cat.label} (AQI ${aqiValue} ≥ 301/201 bands)`);

  const seasonal = baseline.monthly.find((m) => m.month === month) ?? null;
  const seasonalMedian = seasonal ? seasonal.medianAqi : null;
  const reference = seasonalMedian ?? baseline.medianAqi;
  const ratio = reference > 0 ? aqiValue / reference : null;
  const deviationFlag = ratio !== null && ratio >= 1.5;
  if (deviationFlag && ratio !== null) {
    reasons.push(`Statistical deviation: ${Math.round(ratio * 100)}% of the ${seasonal ? 'seasonal' : 'all-year'} median baseline (${reference})`);
  }

  // Confidence: MODEL data with full seasonal history is strongest; DEMO is indicative only.
  let confidence = dataMode === 'MODEL' ? 0.6 : 0.35;
  if (seasonal) confidence += 0.15;
  if (aqiValue > 0 && baseline.medianAqi > 0) confidence += 0.05;
  confidence = Math.min(0.9, Math.round(confidence * 100) / 100);

  return {
    isAnomalous: healthFlag || deviationFlag,
    reasons,
    healthFlag,
    healthDetail: healthFlag ? `AQI ${aqiValue} falls in the ${cat.label} band (CPCB).` : `AQI ${aqiValue} is within acceptable CPCB bands (${cat.label}).`,
    deviationFlag: deviationFlag,
    deviationDetail: deviationFlag && ratio !== null
      ? `About ${Math.round((ratio - 1) * 100)}% above the typical ${seasonal ? seasonal.month + 1 + '/' + new Date(2026, seasonal.month, 1).toLocaleString('en', { month: 'short' }) + ' median' : 'annual median'} of ${reference}.`
      : 'Within the usual range for this location.',
    deviationRatio: ratio,
    seasonalMedian,
    confidence,
  };
}

// ---------- Possible causes ----------

export type PossibleCause = { label: string; basis: string; likelihood: 'Higher' | 'Moderate' | 'Lower' };

export function inferCauses(c: Concentrations, a: AqiResult, temp: number, wind: number, humidity: number): PossibleCause[] {
  const out: PossibleCause[] = [];
  const pm = (c.pm25 ?? 0) + (c.pm10 ?? 0) / 2;
  if (a.dominant === 'pm25' || a.dominant === 'pm10') {
    if ((c.pm10 ?? 0) > 150 && (c.pm25 ?? 0) < (c.pm10 ?? 0) / 2.5) {
      out.push({ label: 'Construction / road dust', basis: 'PM10 strongly elevated relative to PM2.5 — typical of dust resuspension.', likelihood: 'Higher' });
    } else if (pm > 90) {
      out.push({ label: 'Combustion sources (traffic, biomass, waste burning)', basis: 'Fine particles (PM2.5) dominate — combustion is a common contributor.', likelihood: 'Higher' });
    }
  }
  if ((c.no2 ?? 0) > 60) out.push({ label: 'Traffic emissions', basis: 'Elevated NO₂ often accompanies road-traffic density.', likelihood: (c.no2 ?? 0) > 90 ? 'Higher' : 'Moderate' });
  if ((c.so2 ?? 0) > 60) out.push({ label: 'Industrial emissions', basis: 'Elevated SO₂ can indicate industrial or power-plant plumes.', likelihood: 'Moderate' });
  if ((c.o3 ?? 0) > 120 && temp > 30) out.push({ label: 'Photochemical ozone formation', basis: 'High O₃ with warm, sunny conditions favors secondary formation.', likelihood: 'Moderate' });
  if (wind < 6) out.push({ label: 'Stagnant weather trapping pollutants', basis: `Low wind (${wind.toFixed(1)} km/h) reduces dispersion.`, likelihood: 'Moderate' });
  if (humidity > 80) out.push({ label: 'Humid haze / hygroscopic growth', basis: 'High humidity can amplify particle visibility effects.', likelihood: 'Lower' });
  if (!out.length) out.push({ label: 'No specific contributor indicated', basis: 'Pollutant mix and weather do not clearly point to a source.', likelihood: 'Lower' });
  return out.slice(0, 4);
}

export const CAUSE_DISCLAIMER = 'Possible contributors inferred from pollutant mix and weather. Confirmation requires direct evidence such as emission inventories, site inspection or wind-sector analysis.';

// ---------- Alerts ----------

export type Severity = 'Watch' | 'Alert' | 'Emergency';

export type GeneratedAlert = {
  id: string;
  locationId: string;
  locationName: string;
  aqi: number;
  categoryLabel: string;
  baselineMedian: number;
  seasonalMedian: number | null;
  deviationPct: number | null;
  dominant: string;
  severity: Severity;
  detectedAt: string;
  possibleCauses: string[];
  confidence: number;
  precautions: string[];
  reasonsCount: number;
};

export function severityFor(aqi: number, anomaly: Anomaly): Severity {
  if (aqi > 300 || (anomaly.deviationRatio ?? 0) >= 2.5) return 'Emergency';
  if (aqi > 200 || anomaly.deviationFlag) return 'Alert';
  return 'Watch';
}

export function precautionsFor(aqi: number): string[] {
  const base = ['Sensitive groups: reduce prolonged outdoor exertion.', 'Track official CPCB/SPCB advisories for your area.'];
  if (aqi > 200) base.unshift('Wear a well-fitted N95/FFP2 mask outdoors; keep windows closed during peak hours.');
  if (aqi > 300) base.unshift('Avoid outdoor activity; consider air purifiers indoors; check on vulnerable people.');
  return base;
}

export function generateAlert(locationId: string, locationName: string, a: AqiResult, anomaly: Anomaly, severity: Severity, causes: PossibleCause[]): GeneratedAlert {
  const cat = category(a.value);
  return {
    id: `${locationId}-${Date.now()}`,
    locationId,
    locationName,
    aqi: a.value,
    categoryLabel: cat.label,
    baselineMedian: anomaly.seasonalMedian ?? 0,
    seasonalMedian: anomaly.seasonalMedian,
    deviationPct: anomaly.deviationRatio !== null ? Math.round((anomaly.deviationRatio - 1) * 100) : null,
    dominant: a.dominant ? POLLUTANTS.find((p) => p.key === a.dominant)?.name ?? a.dominant : '—',
    severity,
    detectedAt: new Date().toISOString(),
    possibleCauses: causes.filter((c) => c.likelihood !== 'Lower').map((c) => c.label),
    confidence: anomaly.confidence,
    precautions: precautionsFor(a.value),
    reasonsCount: anomaly.reasons.length,
  };
}

// Resolve a triggered alert: has pollution returned to baseline?
export function resolveStatus(alert: GeneratedAlert, currentAqi: number, baselineMedian: number): 'Active' | 'Returned to baseline' {
  return currentAqi <= Math.max(baselineMedian * 1.1, baselineMedian + 5) ? 'Returned to baseline' : 'Active';
}

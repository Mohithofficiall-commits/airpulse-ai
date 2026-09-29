import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity, Bell, ChevronDown, CircleHelp, CircleAlert, CheckCircle2,
  Database, Download, Gauge, Map as MapIcon,
  Menu, Search, Settings as SettingsIcon, SlidersHorizontal, Sparkles,
  Wind, X, RefreshCw, TrendingUp, Thermometer, Droplets, Navigation,
  Info, FlaskConical, TriangleAlert, LineChart as LineChartIcon,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  POLLUTANTS, category, detectAnomaly, inferCauses, CAUSE_DISCLAIMER,
  generateAlert, resolveStatus, severityFor, subIndex,
  type GeneratedAlert, type PollutantKey,
} from '@/lib/aqi';
import { COMPUTED, CURRENT_MONTH, DATA_NOTICE, STATES, findStation, type StationComputed } from '@/lib/data';

type View = 'explorer' | 'map' | 'investigate' | 'alerts' | 'settings';

const navItems = [
  { id: 'explorer', label: 'All-India Explorer', icon: Search, group: 'COMMAND' },
  { id: 'map', label: 'Live Map', icon: MapIcon, group: 'COMMAND' },
  { id: 'investigate', label: 'Investigations', icon: FlaskConical, group: 'INTELLIGENCE' },
  { id: 'alerts', label: 'Alerts', icon: Bell, group: 'INTELLIGENCE' },
  { id: 'settings', label: 'Settings', icon: SettingsIcon, group: 'SYSTEM' },
] as const;

const SEASONS = [
  { name: 'Winter (Dec–Feb)', months: [11, 0, 1] },
  { name: 'Summer (Mar–May)', months: [2, 3, 4] },
  { name: 'Monsoon (Jun–Sep)', months: [5, 6, 7, 8] },
  { name: 'Post-monsoon (Oct–Nov)', months: [9, 10] },
];

const monthLabel = (m: number) => new Date(2026, m, 1).toLocaleString('en', { month: 'short' });

function Badge({ children, color = '#087443', bg = '#e5f7ee' }: { children: ReactNode; color?: string; bg?: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide" style={{ color, background: bg }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{children}</span>;
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-[#e3ece8] bg-white shadow-[0_5px_22px_rgba(26,65,52,.045)] ${className}`}>{children}</section>;
}
function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-[#183c32]">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[#7a9188]">{subtitle}</p>}</div>{action}</div>;
}
function modeBadgeColors(mode: 'DEMO' | 'MODEL') {
  return mode === 'MODEL' ? { color: '#087443', bg: '#e5f7ee' } : { color: '#3c6556', bg: '#eef3f1' };
}

function MapContents({ points, onSelect, selectedId }: { points: StationComputed[]; onSelect: (id: string) => void; selectedId: string }) {
  const map = useMap();
  return <>{points.map(({ station, aqi }) => {
    const c = category(aqi.value);
    return <CircleMarker key={station.id} center={[station.lat, station.lng]} radius={station.id === selectedId ? 11 : 8} pathOptions={{ color: '#fff', weight: 2, fillColor: c.color, fillOpacity: .95 }} eventHandlers={{ click: () => { onSelect(station.id); map.flyTo([station.lat, station.lng], 7, { duration: .5 }); } }}>
      <Popup><div style={{ minWidth: 160 }}><strong>{station.city}</strong><br />AQI {aqi.value} · {c.label}<br /><small>{aqi.dominant ? POLLUTANTS.find(p => p.key === aqi.dominant)?.name : '—'} dominant</small><br /><small>{station.sourceKind} · {station.updated}</small></div></Popup>
    </CircleMarker>;
  })}</>;
}

function AirMap({ points, selectedId, onSelect }: { points: StationComputed[]; selectedId: string; onSelect: (id: string) => void }) {
  return <div className="h-[380px] overflow-hidden rounded-xl border border-[#e3ece8]"><MapContainer center={[22.8, 79.2]} zoom={5} scrollWheelZoom className="h-full w-full">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapContents points={points} selectedId={selectedId} onSelect={onSelect} />
  </MapContainer></div>;
}

function Metric({ label, value, unit, icon: Icon, tone = '#07845b', sub }: { label: string; value: string | number; unit?: string; icon: typeof Activity; tone?: string; sub?: string }) {
  return <Card className="p-4"><div className="flex items-start justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#849991]">{label}</span><span className="rounded-lg p-2" style={{ background: `${tone}13`, color: tone }}><Icon size={17} /></span></div><div className="mt-3 flex items-baseline gap-1.5"><span className="text-2xl font-bold tracking-tight text-[#193a31]">{value}</span>{unit && <span className="text-xs text-[#8aa097]">{unit}</span>}</div>{sub && <p className="mt-1 text-xs text-[#81978f]">{sub}</p>}</Card>;
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone = pct >= 70 ? '#159767' : pct >= 50 ? '#b8860b' : '#c2542d';
  return <div><div className="flex items-center justify-between text-xs"><span className="font-semibold text-[#4b6b5e]">Data confidence</span><span style={{ color: tone }} className="font-bold">{pct}%</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#edf3ef]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} /></div><p className="mt-1 text-[10px] leading-4 text-[#91a49b]">Higher when modelled data covers the same season.</p></div>;
}

const emptyAlertHistory: GeneratedAlert[] = [];

export default function App() {
  const [view, setView] = useState<View>('explorer');
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('All states');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [selectedId, setSelectedId] = useState('DL-ANI');
  const [alertRules, setAlertRules] = useState<{ id: number; stationId: string; threshold: number; enabled: boolean }[]>([
    { id: 1, stationId: 'DL-ANI', threshold: 150, enabled: true },
  ]);
  const [alertHistory, setAlertHistory] = useState<GeneratedAlert[]>(emptyAlertHistory);
  const [alertThreshold, setAlertThreshold] = useState(150);
  const [toast, setToast] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const notify = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 3600); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COMPUTED.filter(({ station, aqi }) => {
      const matchesQ = !q || [station.city, station.district, station.state, station.station, station.id].join(' ').toLowerCase().includes(q);
      const matchesState = stateFilter === 'All states' || station.state === stateFilter;
      const matchesCat = categoryFilter === 'All categories' || category(aqi.value).label === categoryFilter;
      return matchesQ && matchesState && matchesCat;
    });
  }, [search, stateFilter, categoryFilter]);

  const selected = findStation(selectedId) ?? COMPUTED[0];
  const { station: sel, aqi: selAqi, baseline: selBaseline } = selected;
  const selCategory = category(selAqi.value);
  const selMode = sel.sourceKind;

  const selAnomaly = useMemo(() => detectAnomaly(selAqi.value, selBaseline, CURRENT_MONTH, selMode), [selAqi, selBaseline, selMode]);
  const selCauses = useMemo(() => inferCauses(sel.current, selAqi, sel.temp, sel.wind, sel.humidity), [sel, selAqi]);
  const seasonal = selBaseline.monthly.find((m) => m.month === CURRENT_MONTH) ?? null;

  const monthlyChart = selBaseline.monthly.map((m) => ({
    month: monthLabel(m.month),
    median: m.medianAqi,
    p25: m.p25,
    p75: m.p75,
    current: m.month === CURRENT_MONTH ? selAqi.value : null,
  }));

  const pollutantRows = POLLUTANTS.filter((p) => typeof sel.current[p.key] === 'number').map((p) => {
    const concentration = sel.current[p.key] as number;
    return { ...p, concentration, index: subIndex(concentration, p.key), scale: p.key === 'co' ? 50 : p.key === 'so2' ? 2000 : p.key === 'nh3' ? 2400 : p.key === 'o3' ? 1000 : p.key === 'no2' ? 800 : p.key === 'pm10' ? 600 : 500 };
  });

  const runDetection = () => {
    const created: GeneratedAlert[] = [];
    for (const { station, aqi, baseline } of COMPUTED) {
      const anomaly = detectAnomaly(aqi.value, baseline, CURRENT_MONTH, station.sourceKind);
      const rule = alertRules.find((r) => r.stationId === station.id && r.enabled);
      if (!anomaly.isAnomalous && !rule) continue;
      if (rule && aqi.value < rule.threshold && !anomaly.isAnomalous) continue;
      const severity = severityFor(aqi.value, anomaly);
      if (severity === 'Watch' && !anomaly.healthFlag && !anomaly.deviationFlag) continue;
      const causes = inferCauses(station.current, aqi, station.temp, station.wind, station.humidity);
      created.push(generateAlert(station.id, `${station.city} — ${station.station}`, aqi, anomaly, severity, causes));
    }
    created.sort((a, b) => b.aqi - a.aqi);
    setAlertHistory((prev) => [...created, ...prev.filter((p) => !created.some((c) => c.locationId === p.locationId))].slice(0, 40));
    setLastRun(new Date().toLocaleTimeString());
    notify(created.length ? `${created.length} anomaly alert(s) generated.` : 'No anomalies above thresholds right now.');
  };

  const exportCSV = () => {
    const rows = [['Station ID', 'City', 'District', 'State', 'Station', 'AQI', 'Category', 'Dominant', 'Median AQI (12mo)', 'Seasonal median (Sep)', 'Mode', 'Source', 'Timestamp'],
    ...COMPUTED.map(({ station, aqi, baseline }) => {
      const sep = baseline.monthly.find((m) => m.month === CURRENT_MONTH);
      return [station.id, station.city, station.district, station.state, station.station, aqi.value, category(aqi.value).label, aqi.dominant ?? '—', baseline.medianAqi, sep?.medianAqi ?? '—', station.sourceKind, station.sourceDetail, station.updated];
    })];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'airpulse-all-india-explorer.csv'; a.click(); URL.revokeObjectURL(url);
    notify('Explorer CSV exported with mode and source labels.');
  };

  const activeAlerts = alertHistory.filter((a) => resolveStatus(a, findStation(a.locationId)?.aqi.value ?? a.aqi, a.baselineMedian) === 'Active');

  const openStation = (id: string, next: View = 'investigate') => { setSelectedId(id); setView(next); };

  return <div className="flex min-h-screen bg-[#f4f7f6] text-[#203b33]">
    <aside className={`${collapsed ? 'w-[76px]' : 'w-[258px]'} fixed inset-y-0 left-0 z-30 flex flex-col border-r border-[#e4ece8] bg-white transition-all duration-200`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-[#edf2ef] px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123d32] text-white"><Wind size={22} /></div>
        {!collapsed && <div className="min-w-0"><div className="text-[17px] font-bold tracking-tight text-[#183c32]">AirPulse AI</div><div className="text-[11px] text-[#83a095]">Urban Air Intelligence</div></div>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {(['COMMAND', 'INTELLIGENCE', 'SYSTEM'] as const).map((group) => <div key={group} className="mb-5">
          {!collapsed && <div className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-[#a4b8b0]">{group}</div>}
          {navItems.filter((n) => n.group === group).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setView(item.id)} title={item.label} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${view === item.id ? 'bg-[#173b32] font-semibold text-white shadow-sm' : 'text-[#49675c] hover:bg-[#f0f6f3]'}`}><Icon size={18} className={view === item.id ? 'text-[#12b981]' : 'text-[#648278]'} />{!collapsed && <span className="flex-1">{item.label}</span>}{!collapsed && item.id === 'alerts' && activeAlerts.length > 0 && <span className="rounded-full bg-[#fff0f0] px-2 py-0.5 text-[10px] font-bold text-[#db555b]">{activeAlerts.length}</span>}</button>; })}
        </div>)}
      </div>
      <div className="border-t border-[#edf2ef] p-3"><button onClick={() => setCollapsed((v) => !v)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm text-[#668177] hover:bg-[#f3f7f5]"><Menu size={17} />{!collapsed && 'Collapse sidebar'}</button>{!collapsed && <div className="mt-2 rounded-xl bg-[#f4f8f6] p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#89a198]">Coverage</div><div className="mt-1 flex items-center gap-2 text-xs font-semibold text-[#3c6556]"><span className="h-2 w-2 rounded-full bg-[#12b981]" /> {COMPUTED.length} stations online</div><p className="mt-1 text-[10px] leading-4 text-[#91a49d]">Station-based coverage across {STATES.length} states.</p></div>}</div>
    </aside>

    <main className={`min-w-0 flex-1 transition-all ${collapsed ? 'ml-[76px]' : 'ml-[258px]'}`}>
      <header className="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e4ece8] bg-white/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex min-w-[240px] flex-1 items-center gap-3"><div className="relative w-full max-w-[520px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#88a198]" size={17} /><input value={search} onChange={(e) => { setSearch(e.target.value); setView('explorer'); }} placeholder="Search state, city, town, district or station…" className="w-full rounded-xl border border-[#dce8e2] bg-[#fcfefd] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0b9466] focus:ring-2 focus:ring-[#0b9466]/10" /></div></div>
        <div className="flex items-center gap-2">
          <Badge {...modeBadgeColors(selMode)}>{selMode === 'MODEL' ? 'MODEL' : 'OBSERVED'} DATA</Badge>
          <div className="relative"><button onClick={() => setView('alerts')} className="relative rounded-xl border border-[#e1ebe6] p-2.5 text-[#527166] hover:bg-[#f4f8f6]" title="Alerts"><Bell size={17} />{activeAlerts.length > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e35a5e]" />}</button></div>
          <button onClick={() => setShowProfile((v) => !v)} className="flex items-center gap-2 rounded-xl border border-[#e1ebe6] px-3 py-2 text-sm text-[#49675c]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e6f4ed] text-[#087c55]"><Activity size={15} /></span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold">Air Quality Analyst</span><span className="block text-[10px] text-[#8ca198]">Local workspace</span></span><ChevronDown size={14} /></button>
          {showProfile && <div className="absolute right-5 top-[66px] z-50 rounded-xl border border-[#e0eae5] bg-white p-3 shadow-xl"><button onClick={() => { setView('settings'); setShowProfile(false); }} className="text-sm">Workspace settings</button></div>}
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-4 md:p-7">
        {/* ---------------- EXPLORER ---------------- */}
        {view === 'explorer' && <>
          <SectionTitle title="All-India City & Station Explorer" subtitle="Search by state, city, town, district or monitoring station"
            action={<button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-3 py-2 text-xs font-semibold text-[#3c6556]"><Download size={14} /> Export CSV</button>} />
          <div className="mb-4 rounded-xl border border-[#d7e8f4] bg-[#eef6fc] px-4 py-3 text-xs leading-5 text-[#2b5c7e]"><Info size={15} className="mr-2 inline" />Official reference: <strong>CPCB All India AQI Dashboard</strong> (airquality.cpcb.gov.in). Coverage is based on <strong>CAAQMS monitoring stations</strong>, not every town or neighbourhood. {DATA_NOTICE.coverage}</div>
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs text-[#4d6c5e]"><option>All states</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs text-[#4d6c5e]">{['All categories', 'Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe'].map((c) => <option key={c}>{c}</option>)}</select>
              <span className="text-xs text-[#8aa096]">{filtered.length} of {COMPUTED.length} stations with data</span>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wider text-[#91a49b]"><tr><th className="px-4 py-3">Station</th><th className="px-4 py-3">Latest AQI</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Dominant</th><th className="px-4 py-3">vs. baseline</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Source</th></tr></thead>
              <tbody>{filtered.map(({ station, aqi, baseline }) => {
                const cat = category(aqi.value);
                const sep = baseline.monthly.find((m) => m.month === CURRENT_MONTH);
                const ratio = sep ? aqi.value / sep.medianAqi : null;
                return <tr key={station.id} onClick={() => openStation(station.id)} className="cursor-pointer border-t border-[#eff3f1] hover:bg-[#f8fbf9]">
                  <td className="px-4 py-3"><div className="font-semibold text-[#315347]">{station.city}</div><div className="text-xs text-[#95a79f]">{station.district}, {station.state} · {station.station}</div></td>
                  <td className="px-4 py-3 font-bold" style={{ color: cat.color }}>{aqi.value}</td>
                  <td className="px-4 py-3"><Badge color={cat.color} bg={cat.bg}>{cat.label}</Badge></td>
                  <td className="px-4 py-3 text-[#557367]">{aqi.dominant ? POLLUTANTS.find((p) => p.key === aqi.dominant)?.name : '—'}</td>
                  <td className="px-4 py-3 text-xs">{ratio !== null ? <span style={{ color: ratio >= 1.5 ? '#c2542d' : ratio >= 1.1 ? '#b8860b' : '#159767' }}>{Math.round((ratio - 1) * 100) >= 0 ? '+' : ''}{Math.round((ratio - 1) * 100)}% vs Sep median {sep?.medianAqi}</span> : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#81978f]">{station.updated}</td>
                  <td className="px-4 py-3"><Badge {...modeBadgeColors(station.sourceKind)}>{station.sourceKind === 'MODEL' ? 'Open-Meteo model' : 'Station record'}</Badge></td>
                </tr>;
              })}</tbody>
            </table></div>
          </Card>
        </>}

        {/* ---------------- MAP ---------------- */}
        {view === 'map' && <>
          <SectionTitle title="Live Map" subtitle="Geospatial view of stations with data" />
          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-4"><AirMap points={filtered} selectedId={selectedId} onSelect={(id) => openStation(id, 'map')} /></Card>
            <Card className="p-4"><h3 className="mb-3 font-bold">Stations</h3><div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">{filtered.map(({ station, aqi }) => { const c = category(aqi.value); return <button key={station.id} onClick={() => openStation(station.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selectedId === station.id ? 'border-[#82c9ab] bg-[#f2faf6]' : 'border-[#e8efeb] hover:bg-[#fafcfb]'}`}><span><span className="block text-sm font-semibold">{station.city}</span><span className="text-xs text-[#91a49b]">{station.station}</span></span><span className="text-right"><span className="block text-lg font-bold" style={{ color: c.color }}>{aqi.value}</span><span className="text-[10px]" style={{ color: c.color }}>{c.label}</span></span></button>; })}</div></Card>
          </div>
        </>}

        {/* ---------------- INVESTIGATE ---------------- */}
        {view === 'investigate' && <>
          <SectionTitle title="Location Investigation" subtitle={`${sel.city} — ${sel.station}`}
            action={<div className="flex items-center gap-2">
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-sm">{COMPUTED.map(({ station }) => <option key={station.id} value={station.id}>{station.city} — {station.station}</option>)}</select>
              <button onClick={() => notify('Refresh fetches Open-Meteo modelled estimates for this station.')} className="flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-3 py-2 text-xs font-semibold text-[#3c6556]"><RefreshCw size={14} /> Refresh</button>
            </div>} />


          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#83988f]">Latest AQI</span><Gauge size={18} color={selCategory.color} /></div><div className="mt-3 flex items-end gap-3"><div className="text-5xl font-bold tracking-tight" style={{ color: selCategory.color }}>{selAqi.value}</div><div className="pb-1"><Badge color={selCategory.color} bg={selCategory.bg}>{selCategory.label}</Badge><div className="mt-1 text-xs text-[#8ba097]">{sel.district}, {sel.state}</div></div></div><p className="mt-2 text-xs text-[#71887e]">Dominant: {selAqi.dominant ? POLLUTANTS.find((p) => p.key === selAqi.dominant)?.name : '—'} · {sel.updated}</p></Card>
            <Metric label="Median AQI · 12 mo" value={selBaseline.medianAqi} icon={LineChartIcon} tone="#438bc2" sub={`Typical range ${selBaseline.p25}–${selBaseline.p75}`} />
            <Metric label="Seasonal median · Sep" value={seasonal?.medianAqi ?? '—'} icon={TrendingUp} tone="#8a63c9" sub={seasonal ? `Sep range ${seasonal.p25}–${seasonal.p75}` : 'No seasonal history'} />
            <Metric label="Anomaly status" value={selAnomaly.isAnomalous ? 'Flagged' : 'Normal'} icon={selAnomaly.isAnomalous ? TriangleAlert : CheckCircle2} tone={selAnomaly.isAnomalous ? '#c2542d' : '#159767'} sub={selAnomaly.isAnomalous ? selAnomaly.reasons[0] : 'Within health bands and seasonal norm'} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
            <Card className="p-5">
              <h3 className="font-bold">Baseline · median & typical range by month</h3>
              <p className="mb-4 mt-1 text-xs text-[#8aa096]">12-month history · dashed line = September median, red = current reading</p>
              <div className="h-[260px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyChart}>
                <defs><linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bfe3d2" stopOpacity={0.55} /><stop offset="100%" stopColor="#e8f5ee" stopOpacity={0.15} /></linearGradient></defs>
                <CartesianGrid stroke="#edf2ef" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8aa096' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#8aa096' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#bandFill)" name="Typical upper (p75)" />
                <Area type="monotone" dataKey="p25" stroke="none" fill="#ffffff" name="Typical lower (p25)" />
                <Line type="monotone" dataKey="median" stroke="#438bc2" strokeWidth={2} dot={false} name="Monthly median" />
                <Line type="monotone" dataKey="current" stroke="#e84e55" strokeWidth={2} dot={{ r: 4 }} name="Current" connectNulls={false} />
                {seasonal && <ReferenceLine y={seasonal.medianAqi} stroke="#8a63c9" strokeDasharray="5 4" label={{ value: 'Sep median', fontSize: 10, fill: '#8a63c9' }} />}
              </AreaChart></ResponsiveContainer></div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">{SEASONS.map((s) => {
                const rows = selBaseline.monthly.filter((m) => s.months.includes(m.month));
                const avg = rows.length ? Math.round(rows.reduce((sum, m) => sum + m.medianAqi, 0) / rows.length) : null;
                return <div key={s.name} className="rounded-xl bg-[#f5f9f7] p-3"><div className="font-semibold text-[#42695a]">{s.name}</div><div className="mt-1 text-lg font-bold text-[#193a31]">{avg ?? '—'}</div><div className="text-[10px] text-[#8aa096]">avg monthly median</div></div>;
              })}</div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold">Pollutant profile vs typical concentrations</h3>
              <p className="mb-4 mt-1 text-xs text-[#8aa096]">Current value with location's typical (median) level</p>
              <div className="space-y-4">{pollutantRows.map((p) => {
                const typical = selBaseline.typicalConcentrations[p.key as PollutantKey];
                const above = typeof typical === 'number' && p.concentration > typical * 1.3;
                return <div key={p.name}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-[#4b6b5e]">{p.name}</span><span>{p.concentration} {p.unit} <span className="text-[#8aa096]">· sub-index {p.index}</span></span></div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-[#edf3ef]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.concentration / p.scale) * 100)}%`, background: above ? '#e0703a' : '#1ba574' }} />{typeof typical === 'number' && <span className="absolute top-[-3px] h-[17px] w-[2px] bg-[#438bc2]" style={{ left: `${Math.min(100, (typical / p.scale) * 100)}%` }} title={`Typical: ${typical}`} />}</div>
                  <div className="mt-0.5 text-[10px] text-[#8aa096]">typical here: {typeof typical === 'number' ? `${typical} ${p.unit}` : 'n/a'}</div>
                </div>;
              })}</div>
              <div className="mt-4 rounded-xl bg-[#f5f9f7] p-3 text-xs leading-5 text-[#6d877b]"><Info size={14} className="mr-1 inline" />Blue tick = the location's typical median concentration. Bars past it, in orange, run above normal for this place.</div>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card className="p-5">
              <h3 className="font-bold flex items-center gap-2"><TriangleAlert size={17} className="text-[#c2542d]" /> Abnormal-pollution detection</h3>
              <p className="mb-4 mt-1 text-xs text-[#8aa096]">Both checks shown: CPCB health band and statistical deviation from this location's baseline</p>
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 ${selAnomaly.healthFlag ? 'border-[#f3c9b5] bg-[#fff6f1]' : 'border-[#e7efea] bg-[#fafcfb]'}`}>
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold">1 · CPCB health category</span><Badge color={selAnomaly.healthFlag ? '#c2542d' : '#159767'} bg={selAnomaly.healthFlag ? '#ffe9df' : '#e5f7ee'}>{selAnomaly.healthFlag ? 'FLAGGED' : 'WITHIN BANDS'}</Badge></div>
                  <p className="mt-2 text-xs leading-5 text-[#6d877b]">{selAnomaly.healthDetail}</p>
                </div>
                <div className={`rounded-xl border p-4 ${selAnomaly.deviationFlag ? 'border-[#f3c9b5] bg-[#fff6f1]' : 'border-[#e7efea] bg-[#fafcfb]'}`}>
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold">2 · Deviation from local baseline</span><Badge color={selAnomaly.deviationFlag ? '#c2542d' : '#159767'} bg={selAnomaly.deviationFlag ? '#ffe9df' : '#e5f7ee'}>{selAnomaly.deviationFlag ? 'UNUSUAL RISE' : 'WITHIN NORM'}</Badge></div>
                  <p className="mt-2 text-xs leading-5 text-[#6d877b]">{selAnomaly.deviationDetail}{selAnomaly.seasonalMedian !== null && ` September median for this station: ${selAnomaly.seasonalMedian}.`}</p>
                </div>
                <div className="rounded-xl border border-[#e7efea] bg-[#fafcfb] p-4"><ConfidenceBar confidence={selAnomaly.confidence} /></div>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="font-bold">Possible causes & context</h3>
              <p className="mb-4 mt-1 text-xs text-[#8aa096]">Inferred from pollutant mix + weather — labelled as possible, not confirmed</p>
              <div className="grid grid-cols-2 gap-3"><Metric label="Temperature" value={sel.temp} unit="°C" icon={Thermometer} tone="#d8893c" /><Metric label="Humidity" value={sel.humidity} unit="%" icon={Droplets} tone="#438bc2" /><Metric label="Wind speed" value={sel.wind} unit="km/h" icon={Wind} /><Metric label="Wind direction" value={sel.windDir} icon={Navigation} /></div>
              <div className="mt-4 space-y-2">{selCauses.map((c) => <div key={c.label} className="rounded-xl border border-[#e7efea] p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[#315347]">{c.label}</span><Badge color={c.likelihood === 'Higher' ? '#c2542d' : c.likelihood === 'Moderate' ? '#b8860b' : '#6b8a80'} bg={c.likelihood === 'Higher' ? '#ffe9df' : c.likelihood === 'Moderate' ? '#fff5df' : '#eef3f1'}>{c.likelihood}</Badge></div><p className="mt-1 text-xs leading-5 text-[#81978f]">{c.basis}</p></div>)}</div>
              <p className="mt-3 rounded-xl bg-[#f5f9f7] p-3 text-[11px] leading-5 text-[#6d877b]">{CAUSE_DISCLAIMER}</p>
            </Card>
          </div>

          <Card className="mt-5 p-5">
            <h3 className="font-bold">Evidence & data-quality checks</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[{ title: 'Source mode', status: selMode, detail: sel.sourceDetail, ok: selMode === 'MODEL' },
              { title: 'Station identity', status: 'CAAQMS-style ID', detail: `${sel.id} · ${sel.station}`, ok: true },
              { title: 'Timestamp', status: 'Present', detail: sel.updated, ok: true },
              { title: 'Official CPCB record', status: 'Not linked', detail: 'Compare with the official dashboard before operational use.', ok: false }].map((x) => <div key={x.title} className="rounded-xl border border-[#e7efea] p-3"><div className="flex items-center gap-2 text-sm font-semibold">{x.ok ? <CheckCircle2 size={16} className="text-[#159767]" /> : <CircleAlert size={16} className="text-[#c38a2d]" />}{x.title}</div><div className="mt-2 text-xs font-semibold" style={{ color: x.ok ? '#159767' : '#b27a20' }}>{x.status}</div><p className="mt-1 text-xs leading-5 text-[#8ba097]">{x.detail}</p></div>)}
            </div>
          </Card>
        </>}

        {/* ---------------- ALERTS ---------------- */}
        {view === 'alerts' && <>
          <SectionTitle title="Anomaly Alerts & Recommendations" subtitle="Health-band + baseline-deviation detection across all stations"
            action={<div className="flex items-center gap-2">
              {lastRun && <span className="text-xs text-[#8aa096]">Last run {lastRun}</span>}
              <button onClick={runDetection} className="flex items-center gap-2 rounded-xl bg-[#173b32] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#225344]"><Sparkles size={14} /> Run detection now</button>
            </div>} />


          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <div className="space-y-4">
              {alertHistory.length === 0 && <Card className="p-8 text-center"><Sparkles size={22} className="mx-auto text-[#0b9868]" /><p className="mt-3 text-sm font-semibold">No detection run yet</p><p className="mt-1 text-xs text-[#8aa096]">Run detection to scan all {COMPUTED.length} stations against CPCB bands and their seasonal baselines.</p></Card>}
              {alertHistory.map((a) => {
                const live = findStation(a.locationId);
                const status = resolveStatus(a, live?.aqi.value ?? a.aqi, a.baselineMedian);
                const sevColor = a.severity === 'Emergency' ? '#9b2638' : a.severity === 'Alert' ? '#ef8734' : '#e9b329';
                const sevBg = a.severity === 'Emergency' ? '#f9e5e9' : a.severity === 'Alert' ? '#fff0e2' : '#fff6d9';
                return <Card key={a.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><div className="flex items-center gap-2"><h3 className="font-bold">{a.locationName}</h3><Badge color={sevColor} bg={sevBg}>{a.severity.toUpperCase()}</Badge><Badge color={status === 'Active' ? '#c2542d' : '#159767'} bg={status === 'Active' ? '#ffe9df' : '#e5f7ee'}>{status}</Badge></div><p className="mt-1 text-xs text-[#8aa096]">Detected {new Date(a.detectedAt).toLocaleString()} · AQI {a.aqi} ({a.categoryLabel}) · dominant {a.dominant}</p></div>
                    <div className="text-right"><div className="text-2xl font-bold" style={{ color: sevColor }}>{a.aqi}</div><div className="text-[10px] text-[#8aa096]">baseline {a.baselineMedian}{a.seasonalMedian !== null ? ` · Sep ${a.seasonalMedian}` : ''}</div></div>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-lg bg-[#f5f9f7] p-3"><span className="font-semibold text-[#42695a]">Baseline comparison:</span> {a.deviationPct !== null ? <span style={{ color: a.deviationPct >= 50 ? '#c2542d' : '#b8860b' }}>+{a.deviationPct}% vs typical</span> : 'atypical not computed'} {a.seasonalMedian !== null && <span className="text-[#8aa096]">· same-month median {a.seasonalMedian}</span>}</div>
                    <div className="rounded-lg bg-[#f5f9f7] p-3"><span className="font-semibold text-[#42695a]">Confidence:</span> {Math.round(a.confidence * 100)}% <span className="text-[#8aa096]">· reasons: {a.reasonsCount}</span></div>
                  </div>
                  <div className="mt-3"><span className="text-xs font-semibold text-[#42695a]">Possible causes:</span> {a.possibleCauses.length ? <span className="text-xs text-[#6d877b]"> {a.possibleCauses.join(' · ')}</span> : <span className="text-xs text-[#6d877b]"> none inferred</span>}</div>
                  <div className="mt-2"><span className="text-xs font-semibold text-[#42695a]">Recommended precautions:</span><ul className="mt-1 list-disc pl-5 text-xs leading-5 text-[#6d877b]">{a.precautions.map((p) => <li key={p}>{p}</li>)}</ul></div>
                </Card>;
              })}
            </div>
            <div className="space-y-5">
              <Card className="p-5"><h3 className="font-bold">Trigger rules (optional)</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">Stations can also alert on a fixed AQI threshold, in addition to anomaly detection.</p>
                <label className="mb-1 block text-xs font-semibold text-[#668176]">Station</label>
                <select onChange={(e) => setAlertRules((prev) => [...prev.filter((r) => r.stationId !== e.target.value), { id: Date.now(), stationId: e.target.value, threshold: alertThreshold, enabled: true }])} className="mb-4 w-full rounded-lg border border-[#dce8e2] p-2.5 text-sm" defaultValue="">{COMPUTED.map(({ station }) => <option key={station.id} value={station.id}>{station.city} — {station.station}</option>)}</select>
                <label className="mb-1 block text-xs font-semibold text-[#668176]">Threshold (1–500)</label>
                <input type="number" min={1} max={500} value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} className="mb-4 w-full rounded-lg border border-[#dce8e2] p-2.5 text-sm" />
                <div className="space-y-2">{alertRules.map((r) => { const st = findStation(r.stationId); return <div key={r.id} className="flex items-center justify-between rounded-xl border border-[#e7efea] p-3 text-xs"><span><span className="font-semibold">{st?.station.city}</span> ≥ {r.threshold}</span><button onClick={() => setAlertRules((prev) => prev.filter((x) => x.id !== r.id))} className="text-[#9aaba4] hover:text-[#d65055]"><X size={14} /></button></div>; })}</div>
              </Card>
              <Card className="p-5"><h3 className="font-bold">Return-to-baseline tracking</h3><p className="mb-3 mt-1 text-xs text-[#8aa096]">Alerts auto-resolve when readings fall back to ≤10% above the baseline median.</p>
                <div className="space-y-2">{alertHistory.slice(0, 8).map((a) => { const status = resolveStatus(a, findStation(a.locationId)?.aqi.value ?? a.aqi, a.baselineMedian); return <div key={a.id} className="flex items-center justify-between rounded-lg bg-[#f5f9f7] px-3 py-2 text-xs"><span className="truncate pr-2 font-medium text-[#315347]">{a.locationName}</span><Badge color={status === 'Active' ? '#c2542d' : '#159767'} bg={status === 'Active' ? '#ffe9df' : '#e5f7ee'}>{status}</Badge></div>; })}{alertHistory.length === 0 && <p className="text-xs text-[#8aa096]">Run detection to populate history.</p>}</div>
              </Card>
            </div>
          </div>
        </>}

        {/* ---------------- SETTINGS ---------------- */}
        {view === 'settings' && <><SectionTitle title="Settings & Data Sources" subtitle="Configuration, provenance and readiness" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5"><div className="flex items-center gap-2"><Database size={18} className="text-[#0b9466]" /><h3 className="font-bold">Data-source status</h3></div>
              <div className="mt-4 space-y-3">
                {[{ name: 'CPCB All India AQI Dashboard', status: 'Official reference', detail: 'airquality.cpcb.gov.in — station-based coverage; used here as the definitional reference for AQI bands and category labels.' },
                { name: 'Station dataset', status: 'Loaded subset', detail: `${COMPUTED.length} stations across ${STATES.length} states with current values and 12-month history.` },
                { name: 'Open-Meteo (optional refresh)', status: 'Modelled estimates', detail: 'Per-station refresh switches mode to MODEL with gridded estimates — not ground observations.' },
                { name: 'Supabase persistence', status: 'Not connected', detail: 'Alert history lives in browser state; configure schema + RLS before production use.' }].map((s) => <div key={s.name} className="rounded-xl border border-[#e7efea] p-3"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{s.name}</div><Badge color={s.status === 'Official reference' ? '#16855d' : '#b47720'} bg={s.status === 'Official reference' ? '#e5f7ee' : '#fff5df'}>{s.status}</Badge></div><p className="mt-1 text-xs leading-5 text-[#83988f]">{s.detail}</p></div>)}
              </div></Card>
            <Card className="p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#0b9466]" /><h3 className="font-bold">Methodology notes</h3></div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[#6f887d]">
                <p><strong className="text-[#345749]">AQI:</strong> CPCB India breakpoints; sub-index max = AQI; dominant pollutant reported.</p>
                <p><strong className="text-[#345749]">Baseline:</strong> median, p25–p75 from 12 months of history; same-month comparison for seasonality.</p>
                <p><strong className="text-[#345749]">Anomaly:</strong> flagged when CPCB band ≥ Poor or reading ≥ 1.5× the seasonal/annual median.</p>
                <p><strong className="text-[#345749]">Causes:</strong> possible contributors from pollutant mix and weather; never asserted as confirmed sources.</p>
                <p><strong className="text-[#345749]">Next steps:</strong> live CAAQMS ingestion, Supabase persistence with RLS, automated tests for breakpoints and missing-data behavior.</p>
              </div>
              <button onClick={() => notify('Readiness checklist: official APIs → persistence → tests → deployment.')} className="mt-4 flex items-center gap-2 rounded-xl border border-[#dce8e2] px-4 py-2.5 text-sm font-semibold text-[#426557]"><CircleHelp size={16} /> Show readiness checklist</button>
            </Card>
          </div></>}
      </div>

      <footer className="border-t border-[#e4ece8] bg-white px-6 py-4 text-center text-[10px] text-[#91a49b]">AirPulse AI · Urban Air Quality & Pollution Alert System · Official reference: CPCB All India AQI Dashboard</footer>
    </main>
    {toast && <div role="status" className="fixed bottom-5 right-5 z-[1000] flex items-center gap-2 rounded-xl bg-[#173b32] px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 size={17} className="text-[#61d9a6]" />{toast}</div>}
  </div>;
}

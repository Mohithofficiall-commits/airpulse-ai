import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity, Bell, Check, ChevronDown, CircleHelp,
  Database, Download, FileCheck2, Gauge, LayoutDashboard,
  Map as MapIcon, MapPin, Menu, Search, Settings as SettingsIcon, ShieldCheck,
  SlidersHorizontal, Sparkles, Wind, X, RefreshCw, TrendingUp, Clock3, Thermometer,
  Droplets, Navigation, ArrowUpRight, Info, CheckCircle2, CircleAlert
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

type Pollutant = 'PM2.5' | 'PM10' | 'NO₂' | 'SO₂' | 'CO' | 'O₃' | 'NH₃';
type LocationData = {
  id: string; city: string; state: string; lat: number; lng: number;
  pm25: number; pm10: number; no2: number; so2: number; co: number; o3: number;
  temp: number; humidity: number; wind: number; windDir: string; updated: string;
};
type AlertRecord = { id: number; location: string; threshold: number; enabled: boolean; pollutant: string };

const seedLocations: LocationData[] = [
  { id:'DEL-01', city:'New Delhi', state:'Delhi', lat:28.6139, lng:77.2090, pm25:86, pm10:174, no2:38, so2:12, co:1.1, o3:34, temp:32, humidity:48, wind:8.2, windDir:'NW', updated:'2026-09-29 12:45 IST' },
  { id:'MUM-02', city:'Mumbai', state:'Maharashtra', lat:19.0760, lng:72.8777, pm25:42, pm10:91, no2:27, so2:9, co:0.7, o3:41, temp:30, humidity:72, wind:11.4, windDir:'W', updated:'2026-09-29 12:42 IST' },
  { id:'CHE-03', city:'Chennai', state:'Tamil Nadu', lat:13.0827, lng:80.2707, pm25:31, pm10:68, no2:21, so2:7, co:0.5, o3:29, temp:31, humidity:69, wind:13.1, windDir:'SE', updated:'2026-09-29 12:40 IST' },
  { id:'BLR-04', city:'Bengaluru', state:'Karnataka', lat:12.9716, lng:77.5946, pm25:24, pm10:54, no2:17, so2:5, co:0.4, o3:26, temp:27, humidity:61, wind:9.3, windDir:'E', updated:'2026-09-29 12:39 IST' },
  { id:'KOL-05', city:'Kolkata', state:'West Bengal', lat:22.5726, lng:88.3639, pm25:64, pm10:131, no2:33, so2:14, co:0.9, o3:37, temp:31, humidity:74, wind:6.4, windDir:'S', updated:'2026-09-29 12:35 IST' },
  { id:'HYD-06', city:'Hyderabad', state:'Telangana', lat:17.3850, lng:78.4867, pm25:37, pm10:76, no2:24, so2:8, co:0.6, o3:32, temp:29, humidity:55, wind:10.1, windDir:'NE', updated:'2026-09-29 12:32 IST' },
  { id:'THJ-07', city:'Thanjavur', state:'Tamil Nadu', lat:10.7867, lng:79.1378, pm25:19, pm10:42, no2:12, so2:4, co:0.3, o3:22, temp:30, humidity:63, wind:12.2, windDir:'E', updated:'2026-09-29 12:30 IST' },
];

const bands: Record<Pollutant, { ranges: [number, number, number, number][]; unit: string }> = {
  'PM2.5': { unit:'µg/m³', ranges:[[0,30,0,50],[31,60,51,100],[61,90,101,200],[91,120,201,300],[121,250,301,400],[251,500,401,500]] },
  'PM10': { unit:'µg/m³', ranges:[[0,50,0,50],[51,100,51,100],[101,250,101,200],[251,350,201,300],[351,430,301,400],[431,600,401,500]] },
  'NO₂': { unit:'µg/m³', ranges:[[0,40,0,50],[41,80,51,100],[81,180,101,200],[181,280,201,300],[281,400,301,400],[401,800,401,500]] },
  'SO₂': { unit:'µg/m³', ranges:[[0,40,0,50],[41,80,51,100],[81,380,101,200],[381,800,201,300],[801,1600,301,400],[1601,2000,401,500]] },
  'CO': { unit:'mg/m³', ranges:[[0,1,0,50],[1.1,2,51,100],[2.1,10,101,200],[10.1,17,201,300],[17.1,34,301,400],[34.1,50,401,500]] },
  'O₃': { unit:'µg/m³', ranges:[[0,50,0,50],[51,100,51,100],[101,168,101,200],[169,208,201,300],[209,748,301,400],[749,1000,401,500]] },
  'NH₃': { unit:'µg/m³', ranges:[[0,200,0,50],[201,400,51,100],[401,800,101,200],[801,1200,201,300],[1201,1800,301,400],[1801,2400,401,500]] },
};
function subIndex(value: number, pollutant: Pollutant) {
  const range = bands[pollutant].ranges.find(([lo, hi]) => value >= lo && value <= hi);
  if (!range) return value > 0 ? 500 : 0;
  const [bLo,bHi,iLo,iHi] = range;
  return Math.round(((iHi-iLo)/(bHi-bLo))*(value-bLo)+iLo);
}
function getAQI(loc: LocationData) {
  const indexes = [
    { name:'PM2.5', value:subIndex(loc.pm25,'PM2.5') },
    { name:'PM10', value:subIndex(loc.pm10,'PM10') },
    { name:'NO₂', value:subIndex(loc.no2,'NO₂') },
    { name:'SO₂', value:subIndex(loc.so2,'SO₂') },
    { name:'CO', value:subIndex(loc.co,'CO') },
    { name:'O₃', value:subIndex(loc.o3,'O₃') },
  ];
  const dominant = indexes.reduce((a,b) => b.value > a.value ? b : a);
  return { value:dominant.value, dominant:dominant.name };
}
function category(aqi:number) {
  if (aqi <= 50) return { label:'Good', color:'#16a36a', bg:'#e5f7ee', text:'Air quality is satisfactory; risk is low.' };
  if (aqi <= 100) return { label:'Satisfactory', color:'#82b735', bg:'#f0f7df', text:'Minor breathing discomfort may occur in sensitive people.' };
  if (aqi <= 200) return { label:'Moderate', color:'#e9b329', bg:'#fff6d9', text:'People with lung, heart or asthma conditions should limit prolonged exertion.' };
  if (aqi <= 300) return { label:'Poor', color:'#ef8734', bg:'#fff0e2', text:'Prolonged exposure may cause breathing discomfort.' };
  if (aqi <= 400) return { label:'Very Poor', color:'#e84e55', bg:'#ffeaeb', text:'Respiratory effects may occur with prolonged exposure.' };
  return { label:'Severe', color:'#9b2638', bg:'#f9e5e9', text:'Health impacts are possible even in healthy people; reduce outdoor exposure.' };
}
const history = [
  {time:'06:00',aqi:78,pm25:34},{time:'08:00',aqi:91,pm25:42},{time:'10:00',aqi:104,pm25:49},
  {time:'12:00',aqi:121,pm25:58},{time:'14:00',aqi:116,pm25:55},{time:'16:00',aqi:108,pm25:51},
  {time:'18:00',aqi:126,pm25:61},{time:'20:00',aqi:119,pm25:57},{time:'22:00',aqi:98,pm25:46},
];
const forecast = [
  {time:'Now',aqi:121,low:111,high:131},{time:'+4h',aqi:116,low:100,high:132},
  {time:'+8h',aqi:109,low:88,high:130},{time:'+12h',aqi:103,low:78,high:128},
  {time:'+16h',aqi:111,low:82,high:140},{time:'+20h',aqi:118,low:84,high:152},
  {time:'+24h',aqi:112,low:74,high:150},
];
const navItems = [
  { id:'overview', label:'Overview', icon:LayoutDashboard, group:'COMMAND' },
  { id:'map', label:'Live Map', icon:MapIcon, group:'COMMAND' },
  { id:'investigate', label:'Investigations', icon:Search, group:'INTELLIGENCE' },
  { id:'forecast', label:'Forecast & Trends', icon:TrendingUp, group:'INTELLIGENCE' },
  { id:'alerts', label:'Alerts', icon:Bell, group:'INTELLIGENCE' },
  { id:'passports', label:'Evidence Passports', icon:ShieldCheck, group:'EVIDENCE' },
  { id:'settings', label:'Settings', icon:SettingsIcon, group:'SYSTEM' },
] as const;
type View = typeof navItems[number]['id'];

function Badge({ children, color='#087443', bg='#e5f7ee' }: {children:ReactNode;color?:string;bg?:string}) {
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide" style={{color,background:bg}}><span className="h-1.5 w-1.5 rounded-full" style={{background:color}} />{children}</span>;
}
function Card({ children, className='' }: {children:ReactNode;className?:string}) {
  return <section className={`rounded-2xl border border-[#e3ece8] bg-white shadow-[0_5px_22px_rgba(26,65,52,.045)] ${className}`}>{children}</section>;
}
function SectionTitle({ title, subtitle, action }: {title:string;subtitle?:string;action?:React.ReactNode}) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-[#183c32]">{title}</h2>{subtitle && <p className="mt-1 text-sm text-[#7a9188]">{subtitle}</p>}</div>{action}</div>;
}
function MapContents({ locations, onSelect, selectedId }: {locations:LocationData[];onSelect:(id:string)=>void;selectedId:string}) {
  const map = useMap();
  return <>{locations.map((loc) => {
    const aqi = getAQI(loc).value;
    const c = category(aqi);
    return <CircleMarker key={loc.id} center={[loc.lat,loc.lng]} radius={loc.id===selectedId?11:8} pathOptions={{color:'#fff',weight:2,fillColor:c.color,fillOpacity:.95}} eventHandlers={{click:()=>{onSelect(loc.id);map.flyTo([loc.lat,loc.lng],7,{duration:.5});}}}>
      <Popup><div style={{minWidth:150}}><strong>{loc.city}</strong><br/>AQI {aqi} · {c.label}<br/><small>{getAQI(loc).dominant} dominant</small><br/><small>DEMO · {loc.updated}</small></div></Popup>
    </CircleMarker>;
  })}</>;
}
function AirMap({ locations, selectedId, onSelect }: {locations:LocationData[];selectedId:string;onSelect:(id:string)=>void}) {
  return <div className="h-[360px] overflow-hidden rounded-xl border border-[#e3ece8]"><MapContainer center={[22.8,79.2]} zoom={5} scrollWheelZoom className="h-full w-full">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapContents locations={locations} selectedId={selectedId} onSelect={onSelect}/>
  </MapContainer></div>;
}
function Metric({label,value,unit,icon:Icon,tone='#07845b',sub}:{label:string;value:string|number;unit?:string;icon:typeof Activity;tone?:string;sub?:string}) {
  return <Card className="p-4"><div className="flex items-start justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#849991]">{label}</span><span className="rounded-lg p-2" style={{background:`${tone}13`,color:tone}}><Icon size={17}/></span></div><div className="mt-3 flex items-baseline gap-1.5"><span className="text-2xl font-bold tracking-tight text-[#193a31]">{value}</span>{unit&&<span className="text-xs text-[#8aa097]">{unit}</span>}</div>{sub&&<p className="mt-1 text-xs text-[#81978f]">{sub}</p>}</Card>;
}

export default function App() {
  const [view,setView] = useState<View>('overview');
  const [collapsed,setCollapsed] = useState(false);
  const [search,setSearch] = useState('');
  const [selectedId,setSelectedId] = useState('DEL-01');
  const [locations, setLocations] = useState<LocationData[]>(seedLocations);
  const [dataModes, setDataModes] = useState<Record<string, 'DEMO' | 'MODEL'>>({});
  const [loadingLive, setLoadingLive] = useState(false);
  const [alerts,setAlerts] = useState<AlertRecord[]>([
    {id:1,location:'New Delhi',threshold:100,enabled:true,pollutant:'AQI'},
    {id:2,location:'Kolkata',threshold:150,enabled:true,pollutant:'PM2.5'},
  ]);
  const [alertLocation,setAlertLocation] = useState('New Delhi');
  const [alertThreshold,setAlertThreshold] = useState(100);
  const [alertPollutant,setAlertPollutant] = useState('AQI');
  const [toast,setToast] = useState('');
  const [filter,setFilter] = useState('All locations');
  const [showProfile,setShowProfile] = useState(false);
  const [showNotifications,setShowNotifications] = useState(false);
  const selected = locations.find(l=>l.id===selectedId) ?? locations[0];
  const pollutantRows = [
    { name: 'PM2.5', value: selected.pm25, unit: 'µg/m³', scale: 250 },
    { name: 'PM10', value: selected.pm10, unit: 'µg/m³', scale: 600 },
    { name: 'NO₂', value: selected.no2, unit: 'µg/m³', scale: 800 },
    { name: 'SO₂', value: selected.so2, unit: 'µg/m³', scale: 2000 },
    { name: 'CO', value: selected.co, unit: 'mg/m³', scale: 50 },
    { name: 'O₃', value: selected.o3, unit: 'µg/m³', scale: 1000 },
  ];
  const currentAQI = getAQI(selected);
  const currentCategory = category(currentAQI.value);
  const selectedDataMode = dataModes[selected.id] ?? 'DEMO';
  const filteredLocations = useMemo(()=>locations.filter(l=>{
    const q=search.toLowerCase();
    const matches = !q || `${l.city} ${l.state} ${l.id}`.toLowerCase().includes(q);
    const aqi=getAQI(l).value;
    const severity = filter==='All locations' || (filter==='Elevated AQI'&&aqi>100) || (filter==='Good/Satisfactory'&&aqi<=100);
    return matches&&severity;
  }),[locations,search,filter]);
  const alertCount = alerts.filter(a=>a.enabled && locations.some(l=>l.city===a.location && (a.pollutant==='AQI'?getAQI(l).value:l.pm25)>=a.threshold)).length;
  const notify = (msg:string)=>{setToast(msg);window.setTimeout(()=>setToast(''),3200);};
  const refreshSelectedData = async () => {
    setLoadingLive(true);
    try {
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${selected.lat}&longitude=${selected.lng}&hourly=pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone&past_days=1&forecast_days=1&timezone=Asia%2FKolkata`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&timezone=Asia%2FKolkata`;
      const [airResponse, weatherResponse] = await Promise.all([fetch(airUrl), fetch(weatherUrl)]);
      if (!airResponse.ok || !weatherResponse.ok) throw new Error('Provider request failed');
      const air = await airResponse.json() as {
        hourly?: { time?: string[]; pm2_5?: (number|null)[]; pm10?: (number|null)[]; nitrogen_dioxide?: (number|null)[]; sulphur_dioxide?: (number|null)[]; carbon_monoxide?: (number|null)[]; ozone?: (number|null)[] };
      };
      const weather = await weatherResponse.json() as { current?: { time?: string; temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number; wind_direction_10m?: number } };
      const hourly = air.hourly;
      if (!hourly?.time?.length || !weather.current) throw new Error('Provider returned incomplete data');
      const localHour = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T').slice(0, 13);
      let index = hourly.time.findIndex(t => t.slice(0, 13) === localHour);
      if (index < 0) index = hourly.time.reduce((best, t, i) => t.slice(0, 13) <= localHour ? i : best, -1);
      if (index < 7) throw new Error('Not enough hourly history to calculate averaging windows');
      const average = (values: (number|null)[] | undefined, count: number, divisor = 1) => {
        if (!values) throw new Error('A required pollutant is unavailable');
        const sample = values.slice(Math.max(0, index - count + 1), index + 1).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (sample.length < (count === 24 ? 16 : 8)) throw new Error('Insufficient valid pollutant observations for the required averaging window');
        return sample.reduce((sum, value) => sum + value, 0) / sample.length / divisor;
      };
      const updated: LocationData = {
        ...selected,
        pm25: average(hourly.pm2_5, 24),
        pm10: average(hourly.pm10, 24),
        no2: average(hourly.nitrogen_dioxide, 24),
        so2: average(hourly.sulphur_dioxide, 24),
        co: average(hourly.carbon_monoxide, 8, 1000),
        o3: average(hourly.ozone, 8),
        temp: weather.current.temperature_2m ?? selected.temp,
        humidity: weather.current.relative_humidity_2m ?? selected.humidity,
        wind: weather.current.wind_speed_10m ?? selected.wind,
        windDir: typeof weather.current.wind_direction_10m === 'number' ? `${Math.round(weather.current.wind_direction_10m)}°` : selected.windDir,
        updated: `${hourly.time[index]} · Asia/Kolkata`,
      };
      setLocations(prev => prev.map(loc => loc.id === selected.id ? updated : loc));
      setDataModes(prev => ({ ...prev, [selected.id]: 'MODEL' }));
      notify('Modelled air-quality and weather data refreshed. This is not a ground-station observation.');
    } catch {
      notify('Provider unavailable or data incomplete. Keeping clearly labelled demo values.');
    } finally {
      setLoadingLive(false);
    }
  };
  const addAlert = ()=>{
    if(!Number.isInteger(Number(alertThreshold))||Number(alertThreshold)<1||Number(alertThreshold)>500){notify('Enter an integer threshold from 1 to 500.');return;}
    setAlerts(prev=>[...prev,{id:Date.now(),location:alertLocation,threshold:Number(alertThreshold),enabled:true,pollutant:alertPollutant}]);
    notify('Alert rule saved for '+alertLocation+'.');
  };
  const exportPassport = ()=>{
    const payload={product:'AirPulse AI',dataMode:selectedDataMode,source:selectedDataMode==='MODEL'?'Open-Meteo modelled grid estimate':'Illustrative demo data',exportedAt:new Date().toISOString(),location:selected,aqi:currentAQI.value,category:currentCategory.label,dominantPollutant:currentAQI.dominant,standard:'CPCB India AQI breakpoint method',note:selectedDataMode==='MODEL'?'Modelled gridded estimate, not an official ground-station measurement.':'Illustrative demo observation; not a live monitoring record.'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=`airpulse-${selected.id}-evidence-passport.json`;a.click();URL.revokeObjectURL(url);notify('Evidence Passport exported.');
  };
  const exportCSV = ()=>{
    const rows=[['Location','State','AQI estimate','Category','Dominant pollutant','PM2.5','PM10','Mode','Source','Timestamp'],...locations.map(l=>[l.city,l.state,getAQI(l).value,category(getAQI(l).value).label,getAQI(l).dominant,l.pm25,l.pm10,dataModes[l.id]??'DEMO',dataModes[l.id]==='MODEL'?'Open-Meteo model estimate':'Illustrative sample data',l.updated])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='airpulse-observations-demo.csv';a.click();URL.revokeObjectURL(url);notify('CSV exported with DEMO labels.');
  };
  const pageTitle = navItems.find(n=>n.id===view)?.label ?? 'Overview';

  return <div className="flex min-h-screen bg-[#f4f7f6] text-[#203b33]">
    <aside className={`${collapsed?'w-[76px]':'w-[258px]'} fixed inset-y-0 left-0 z-30 flex flex-col border-r border-[#e4ece8] bg-white transition-all duration-200`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-[#edf2ef] px-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#123d32] text-white"><Wind size={22}/></div>
        {!collapsed&&<div className="min-w-0"><div className="text-[17px] font-bold tracking-tight text-[#183c32]">AirPulse AI</div><div className="text-[11px] text-[#83a095]">Urban Air Intelligence</div></div>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {(['COMMAND','INTELLIGENCE','EVIDENCE','SYSTEM'] as const).map(group=><div key={group} className="mb-5">
          {!collapsed&&<div className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-[#a4b8b0]">{group}</div>}
          {navItems.filter(n=>n.group===group).map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>setView(item.id)} title={item.label} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${view===item.id?'bg-[#173b32] font-semibold text-white shadow-sm':'text-[#49675c] hover:bg-[#f0f6f3]'}`}><Icon size={18} className={view===item.id?'text-[#12b981]':'text-[#648278]'}/>{!collapsed&&<span className="flex-1">{item.label}</span>}{!collapsed&&item.id==='alerts'&&<span className="rounded-full bg-[#fff0f0] px-2 py-0.5 text-[10px] font-bold text-[#db555b]">{alerts.length}</span>}</button>;})}
        </div>)}
      </div>
      <div className="border-t border-[#edf2ef] p-3"><button onClick={()=>setCollapsed(v=>!v)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm text-[#668177] hover:bg-[#f3f7f5]"><Menu size={17}/>{!collapsed&&'Collapse sidebar'}</button>{!collapsed&&<div className="mt-2 rounded-xl bg-[#f4f8f6] p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#89a198]">Data mode</div><div className="mt-1 flex items-center gap-2 text-xs font-semibold text-[#a56b14]"><span className="h-2 w-2 rounded-full bg-[#e7a63c]"/> DEMO DATA</div><p className="mt-1 text-[10px] leading-4 text-[#91a49d]">Sample values are illustrative, not live readings.</p></div>}</div>
    </aside>

    <main className={`min-w-0 flex-1 transition-all ${collapsed?'ml-[76px]':'ml-[258px]'}`}>
      <header className="sticky top-0 z-20 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#e4ece8] bg-white/95 px-5 py-3 backdrop-blur md:px-8">
        <div className="flex min-w-[220px] flex-1 items-center gap-3"><div className="relative w-full max-w-[460px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#88a198]" size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search cities, states, monitoring locations..." className="w-full rounded-xl border border-[#dce8e2] bg-[#fcfefd] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#0b9466] focus:ring-2 focus:ring-[#0b9466]/10"/></div></div>
        <div className="flex items-center gap-2">
          <Badge color={selectedDataMode === 'MODEL' ? '#087443' : '#b47718'} bg={selectedDataMode === 'MODEL' ? '#e5f7ee' : '#fff5df'}>{selectedDataMode === 'MODEL' ? 'MODEL DATA' : 'DEMO MODE'}</Badge>
          <div className="relative"><button onClick={()=>setShowNotifications(v=>!v)} className="relative rounded-xl border border-[#e1ebe6] p-2.5 text-[#527166] hover:bg-[#f4f8f6]"><Bell size={17}/>{alertCount>0&&<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#e35a5e]"/>}</button>{showNotifications&&<div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[#e0eae5] bg-white p-4 shadow-xl"><div className="font-semibold">Notifications</div><p className="mt-2 text-sm text-[#698278]">{alertCount?`${alertCount} enabled alert rule(s) currently meet their threshold in demo data.`:'No alert rules currently triggered.'}</p><button className="mt-3 text-xs font-semibold text-[#087c55]" onClick={()=>{setView('alerts');setShowNotifications(false)}}>Review alerts →</button></div>}</div>
          <button onClick={()=>setShowProfile(v=>!v)} className="flex items-center gap-2 rounded-xl border border-[#e1ebe6] px-3 py-2 text-sm text-[#49675c]"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e6f4ed] text-[#087c55]"><Activity size={15}/></span><span className="hidden text-left sm:block"><span className="block text-xs font-semibold">Air Quality Analyst</span><span className="block text-[10px] text-[#8ca198]">Local workspace</span></span><ChevronDown size={14}/></button>
          {showProfile&&<div className="absolute right-5 top-[66px] z-50 rounded-xl border border-[#e0eae5] bg-white p-3 shadow-xl"><button onClick={()=>{setView('settings');setShowProfile(false)}} className="text-sm">Workspace settings</button></div>}
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-4 md:p-7">
        {view==='overview'&&<><SectionTitle title="Air Quality Overview" subtitle="Urban air-quality monitoring · CPCB India AQI framework" action={<button onClick={refreshSelectedData} disabled={loadingLive} className="btn-outline flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-3 py-2 text-xs font-semibold text-[#3c6556] disabled:opacity-60"><RefreshCw size={14} className={loadingLive ? 'animate-spin' : ''}/>{loadingLive ? 'Fetching…' : `Refresh ${selected.city}`}</button>}/>
          <div className="mb-4 rounded-xl border border-[#f1dfb6] bg-[#fff9eb] px-4 py-3 text-xs leading-5 text-[#87631d]"><Info size={15} className="mr-2 inline"/> DATA NOTICE: locations without a successful refresh use illustrative demo values. Refresh fetches modelled Open-Meteo air-quality and weather estimates for the selected location; these are not official ground-station measurements.</div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Card className="col-span-2 overflow-hidden p-5 sm:col-span-1" ><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-[#83988f]">Selected location AQI</span><Gauge size={18} color={currentCategory.color}/></div><div className="mt-3 flex items-end gap-3"><div className="text-5xl font-bold tracking-tight" style={{color:currentCategory.color}}>{currentAQI.value}</div><div className="pb-1"><Badge color={currentCategory.color} bg={currentCategory.bg}>{currentCategory.label}</Badge><div className="mt-1 text-xs text-[#8ba097]">{selected.city}</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2ef]"><div className="h-full rounded-full" style={{width:`${Math.min(100,currentAQI.value/5)}%`,background:currentCategory.color}}/></div><p className="mt-3 text-xs leading-5 text-[#71887e]">{currentCategory.text}</p></Card>
            <Metric label="Dominant pollutant" value={currentAQI.dominant} unit={currentAQI.dominant==='CO'?'mg/m³':'µg/m³'} icon={Activity} sub="Highest calculated sub-index"/>
            <Metric label="Monitored locations" value={locations.length} icon={MapPin} sub="Sample locations across India"/>
            <Metric label="Alert rules" value={alerts.length} icon={Bell} tone="#d99a2b" sub={`${alertCount} currently meet thresholds in demo data`}/>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_1fr]">
            <Card className="p-4 md:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold text-[#24463a]">Pollution hotspot map</h3><p className="mt-1 text-xs text-[#8aa096]">Select a marker to inspect a location · OpenStreetMap</p></div><button onClick={()=>setView('map')} className="text-xs font-semibold text-[#07865b]">Open full map <ArrowUpRight size={13} className="inline"/></button></div><AirMap locations={locations} selectedId={selectedId} onSelect={setSelectedId}/><div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#81978e]">{[{l:'Good',c:'#16a36a'},{l:'Satisfactory',c:'#82b735'},{l:'Moderate',c:'#e9b329'},{l:'Poor',c:'#ef8734'},{l:'Very Poor / Severe',c:'#e84e55'}].map(x=><span key={x.l} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{background:x.c}}/>{x.l}</span>)}</div></Card>
            <Card className="p-4 md:p-5"><div className="mb-4"><h3 className="font-bold text-[#24463a]">AQI trend · selected location</h3><p className="mt-1 text-xs text-[#8aa096]">Illustrative historical sample · not live observations</p></div><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#13a875" stopOpacity={0.25}/><stop offset="95%" stopColor="#13a875" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid stroke="#edf2ef" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" tick={{fontSize:10,fill:'#8aa096'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10,fill:'#8aa096'}} axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="aqi" stroke="#0b9868" fill="url(#aqiFill)" strokeWidth={2.5} name="AQI"/></AreaChart></ResponsiveContainer></div><div className="mt-3 rounded-xl bg-[#f5f9f7] p-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#42695a]"><Sparkles size={15} className="text-[#0b9868]"/> Data-led insight</div><p className="mt-1 text-xs leading-5 text-[#789087]">Compare hourly changes with weather and nearby readings before attributing a cause. This demo chart is illustrative.</p></div></Card>
          </div>
          <Card className="mt-5 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ef] p-4"><div><h3 className="font-bold text-[#24463a]">Location readings</h3><p className="mt-1 text-xs text-[#8aa096]">AQI calculated from available pollutant values</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs text-[#4d6c5e]"><option>All locations</option><option>Elevated AQI</option><option>Good/Satisfactory</option></select></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-[#f8faf9] text-[10px] uppercase tracking-wider text-[#91a49b]"><tr><th className="px-4 py-3">Location</th><th className="px-4 py-3">AQI</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Dominant</th><th className="px-4 py-3">PM2.5</th><th className="px-4 py-3">Data status</th></tr></thead><tbody>{filteredLocations.map(l=>{const aq=getAQI(l);const cat=category(aq.value);return <tr key={l.id} onClick={()=>{setSelectedId(l.id);setView('investigate')}} className="cursor-pointer border-t border-[#eff3f1] hover:bg-[#f8fbf9]"><td className="px-4 py-3"><div className="font-semibold text-[#315347]">{l.city}</div><div className="text-xs text-[#95a79f]">{l.state} · {l.id}</div></td><td className="px-4 py-3 font-bold" style={{color:cat.color}}>{aq.value}</td><td className="px-4 py-3"><Badge color={cat.color} bg={cat.bg}>{cat.label}</Badge></td><td className="px-4 py-3 text-[#557367]">{aq.dominant}</td><td className="px-4 py-3 text-[#557367]">{l.pm25} µg/m³</td><td className="px-4 py-3"><Badge color={dataModes[l.id] === 'MODEL' ? '#087443' : '#b47718'} bg={dataModes[l.id] === 'MODEL' ? '#e5f7ee' : '#fff5df'}>{dataModes[l.id] ?? 'DEMO'}</Badge></td></tr>})}</tbody></table></div></Card>
        </>}

        {view==='map'&&<><SectionTitle title="Live Map" subtitle="Geospatial view of available monitoring locations" action={<select value={filter} onChange={e=>setFilter(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-xs"><option>All locations</option><option>Elevated AQI</option><option>Good/Satisfactory</option></select>}/><div className="mb-4 rounded-xl border border-[#f1dfb6] bg-[#fff9eb] p-3 text-xs text-[#87631d]">DEMO MAP: markers show illustrative sample readings, not verified live station feeds.</div><div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]"><Card className="p-4"><AirMap locations={filteredLocations} selectedId={selectedId} onSelect={setSelectedId}/></Card><Card className="p-4"><h3 className="mb-3 font-bold">Locations</h3><div className="space-y-2">{filteredLocations.map(l=>{const a=getAQI(l);const c=category(a.value);return <button key={l.id} onClick={()=>setSelectedId(l.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selectedId===l.id?'border-[#82c9ab] bg-[#f2faf6]':'border-[#e8efeb] hover:bg-[#fafcfb]'}`}><span><span className="block text-sm font-semibold">{l.city}</span><span className="text-xs text-[#91a49b]">{l.state} · {a.dominant}</span></span><span className="text-right"><span className="block text-lg font-bold" style={{color:c.color}}>{a.value}</span><span className="text-[10px]" style={{color:c.color}}>{c.label}</span></span></button>})}</div></Card></div></>}

        {view==='investigate'&&<><SectionTitle title="Location Investigation" subtitle="Inspect readings, data quality, local conditions and evidence for a selected location" action={<select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="rounded-lg border border-[#dce8e2] bg-white px-3 py-2 text-sm">{locations.map(l=><option key={l.id} value={l.id}>{l.city}</option>)}</select>}/><div className="mb-4 rounded-xl border border-[#f1dfb6] bg-[#fff9eb] p-3 text-xs text-[#87631d]">Readings may be DEMO or modelled estimates. AQI is calculated from available averaged values; modelled grid estimates are not official ground-station AQI. Pollution-source attribution is not inferred.</div><div className="grid gap-4 md:grid-cols-3"><Metric label="Calculated AQI" value={currentAQI.value} icon={Gauge} tone={currentCategory.color} sub={currentCategory.label}/><Metric label="Dominant pollutant" value={currentAQI.dominant} icon={Activity} sub="Highest available sub-index"/><Metric label="Observation freshness" value={selectedDataMode} icon={Clock3} tone={selectedDataMode === "MODEL" ? "#16855d" : "#b47718"} sub={selected.updated}/></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><Card className="p-5"><h3 className="font-bold">Pollutant measurements</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">{selectedDataMode === 'MODEL' ? 'Open-Meteo model estimates averaged over recent hourly values' : 'Sample concentrations · averaging periods are not supplied in this demo'}</p><div className="space-y-4">{pollutantRows.map(p=><div key={p.name}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-[#4b6b5e]">{p.name}</span><span>{p.value} {p.unit}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf3ef]"><div className="h-full rounded-full bg-[#1ba574]" style={{ width: `${Math.min(100, (p.value / p.scale) * 100)}%` }}/></div></div>)}</div></Card><Card className="p-5"><h3 className="font-bold">Weather context</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">{selectedDataMode === 'MODEL' ? 'Open-Meteo weather context' : 'Sample context values; not live weather'}</p><div className="grid grid-cols-2 gap-3"><Metric label="Temperature" value={selected.temp} unit="°C" icon={Thermometer} tone="#d8893c"/><Metric label="Humidity" value={selected.humidity} unit="%" icon={Droplets} tone="#438bc2"/><Metric label="Wind speed" value={selected.wind} unit="km/h" icon={Wind}/><Metric label="Wind direction" value={selected.windDir} icon={Navigation}/></div><div className="mt-4 rounded-xl bg-[#f5f9f7] p-3 text-xs leading-5 text-[#6d877b]"><Info size={14} className="mr-1 inline"/>Weather can provide context for interpreting pollutant patterns, but correlation alone does not establish a pollution source.</div></Card></div><Card className="mt-5 p-5"><h3 className="font-bold">Evidence and data-quality checks</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{title:'Source mode',status:selectedDataMode,detail:selectedDataMode==='MODEL'?'Open-Meteo modelled grid estimates':'Synthetic sample dataset',ok:selectedDataMode==='MODEL'},{title:'Location coordinates',status:'Present',detail:'Latitude and longitude available',ok:true},{title:'Timestamp',status:'Present',detail:selected.updated,ok:true},{title:'Averaging period',status:'Not supplied',detail:'Verify before official AQI reporting',ok:false}].map(x=><div key={x.title} className="rounded-xl border border-[#e7efea] p-3"><div className="flex items-center gap-2 text-sm font-semibold">{x.ok?<CheckCircle2 size={16} className="text-[#159767]"/>:<CircleAlert size={16} className="text-[#c38a2d]"/>}{x.title}</div><div className="mt-2 text-xs font-semibold" style={{color:x.ok?'#159767':'#b27a20'}}>{x.status}</div><p className="mt-1 text-xs leading-5 text-[#8ba097]">{x.detail}</p></div>)}</div></Card></>}

        {view==='forecast'&&<><SectionTitle title="Forecast & Trends" subtitle="Historical patterns and transparent baseline projections"/><div className="mb-4 rounded-xl border border-[#f1dfb6] bg-[#fff9eb] p-3 text-xs text-[#87631d]">BASELINE DEMO FORECAST: this is an illustrative persistence/rolling-trend scenario, not a validated live prediction. No accuracy claim is made.</div><div className="grid gap-5 xl:grid-cols-2"><Card className="p-5"><h3 className="font-bold">Historical AQI trend</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">Illustrative sample · AQI by hour</p><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={history}><CartesianGrid stroke="#edf2ef" strokeDasharray="3 3"/><XAxis dataKey="time" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="aqi" stroke="#07875c" strokeWidth={2.5} dot={false} name="AQI"/><Line type="monotone" dataKey="pm25" stroke="#e5a52c" strokeWidth={2} dot={false} name="PM2.5"/></LineChart></ResponsiveContainer></div></Card><Card className="p-5"><h3 className="font-bold">Next 24-hour baseline</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">Estimate and illustrative range</p><div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecast}><CartesianGrid stroke="#edf2ef" strokeDasharray="3 3"/><XAxis dataKey="time" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Area type="monotone" dataKey="high" stroke="#b6d8c7" fill="#eaf5ef" name="Upper illustrative range"/><Area type="monotone" dataKey="low" stroke="#b6d8c7" fill="#fff" name="Lower illustrative range"/><Line type="monotone" dataKey="aqi" stroke="#07875c" strokeWidth={2.5} name="Baseline AQI"/></AreaChart></ResponsiveContainer></div></Card></div><Card className="mt-5 p-5"><h3 className="font-bold">How to interpret this forecast</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{[{n:'1',t:'Historical input',d:'A real deployment needs sufficient timestamped observations with consistent units and averaging periods.'},{n:'2',t:'Baseline estimate',d:'A simple persistence or rolling-average baseline is easier to audit than an unsupported AI prediction.'},{n:'3',t:'Validate over time',d:'Compare predictions with later observations using a time-ordered holdout and report MAE when enough data exists.'}].map(x=><div key={x.n} className="rounded-xl bg-[#f5f9f7] p-4"><div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#dff3e8] text-xs font-bold text-[#087c55]">{x.n}</div><div className="text-sm font-semibold">{x.t}</div><p className="mt-1 text-xs leading-5 text-[#81968d]">{x.d}</p></div>)}</div></Card></>}

        {view==='alerts'&&<><SectionTitle title="Alert Center" subtitle="Configure AQI or pollutant thresholds and review alert rules"/><div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]"><Card className="p-5"><h3 className="font-bold">Create alert rule</h3><p className="mb-4 mt-1 text-xs text-[#8aa096]">Rules are stored in this browser session in the current prototype.</p><label className="mb-1 block text-xs font-semibold text-[#668176]">Location</label><select value={alertLocation} onChange={e=>setAlertLocation(e.target.value)} className="mb-4 w-full rounded-lg border border-[#dce8e2] p-2.5 text-sm">{locations.map(l=><option key={l.id}>{l.city}</option>)}</select><label className="mb-1 block text-xs font-semibold text-[#668176]">Metric</label><select value={alertPollutant} onChange={e=>setAlertPollutant(e.target.value)} className="mb-4 w-full rounded-lg border border-[#dce8e2] p-2.5 text-sm"><option>AQI</option><option>PM2.5</option></select><label className="mb-1 block text-xs font-semibold text-[#668176]">Trigger threshold (1–500)</label><input type="number" min="1" max="500" step="1" value={alertThreshold} onChange={e=>setAlertThreshold(Number(e.target.value))} className="mb-4 w-full rounded-lg border border-[#dce8e2] p-2.5 text-sm"/><button onClick={addAlert} className="w-full rounded-xl bg-[#173b32] px-4 py-3 text-sm font-semibold text-white hover:bg-[#225344]">Save alert rule</button></Card><Card className="p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Configured rules</h3><Badge>{alerts.length} RULES</Badge></div><div className="space-y-3">{alerts.map(a=>{const loc=locations.find(l=>l.city===a.location);const val=loc?(a.pollutant==='AQI'?getAQI(loc).value:loc.pm25):0;const triggered=a.enabled&&val>=a.threshold;return <div key={a.id} className="rounded-xl border border-[#e7efea] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-semibold">{a.location} · {a.pollutant} ≥ {a.threshold}</div><div className="mt-1 text-xs text-[#879b92]">Current demo value: {val} · {triggered?'Threshold met':'Threshold not met'}</div></div><div className="flex items-center gap-2"><Badge color={triggered?'#c77d20':'#16855d'} bg={triggered?'#fff4df':'#e5f7ee'}>{triggered?'TRIGGERED':'MONITORING'}</Badge><button onClick={()=>setAlerts(prev=>prev.map(x=>x.id===a.id?{...x,enabled:!x.enabled}:x))} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${a.enabled?'bg-[#e5f7ee] text-[#087c55]':'bg-[#f1f4f2] text-[#7d9289]'}`}>{a.enabled?'Enabled':'Disabled'}</button><button onClick={()=>setAlerts(prev=>prev.filter(x=>x.id!==a.id))} className="rounded-lg p-2 text-[#9aaba4] hover:bg-[#fff0f0] hover:text-[#d65055]"><X size={15}/></button></div></div></div>})}</div></Card></div><Card className="mt-5 p-5"><h3 className="font-bold">Suggested response</h3><p className="mt-2 text-sm leading-6 text-[#71877d]">When a threshold is reached, confirm the observation timestamp and averaging period, compare nearby readings, consult official local advisories, and avoid attributing a cause until supported by evidence.</p></Card></>}

        {view==='passports'&&<><SectionTitle title="Evidence Passports" subtitle="Traceable record of an observation, its source and AQI calculation" action={<button onClick={exportCSV} className="flex items-center gap-2 rounded-xl border border-[#dce8e2] bg-white px-3 py-2 text-xs font-semibold text-[#3c6556]"><Download size={14}/> Export locations CSV</button>}/><div className="mb-4 rounded-xl border border-[#f1dfb6] bg-[#fff9eb] p-3 text-xs text-[#87631d]">Passports preserve the current record mode. Modelled estimates are not authenticated government ground-station records.</div><div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]"><Card className="p-4"><h3 className="mb-3 font-bold">Available records</h3><div className="space-y-2">{locations.map(l=>{const a=getAQI(l);const c=category(a.value);return <button key={l.id} onClick={()=>setSelectedId(l.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${selectedId===l.id?'border-[#8ac9ad] bg-[#f3faf6]':'border-[#e7efea]'}`}><span><span className="block text-sm font-semibold">{l.city}</span><span className="text-xs text-[#8ca097]">{l.id} · {dataModes[l.id] ?? 'DEMO'}</span></span><span className="text-lg font-bold" style={{color:c.color}}>{a.value}</span></button>})}</div></Card><Card className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileCheck2 size={20} className="text-[#0a9566]"/><h3 className="font-bold">Observation Passport</h3></div><p className="mt-1 text-xs text-[#8aa096]">Record ID: AP-{selected.id}-{selectedDataMode}</p></div><Badge color={selectedDataMode === 'MODEL' ? '#087443' : '#b47718'} bg={selectedDataMode === 'MODEL' ? '#e5f7ee' : '#fff5df'}>{selectedDataMode}</Badge></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f5f9f7] p-3"><div className="text-xs text-[#8aa096]">Location</div><div className="mt-1 font-semibold">{selected.city}, {selected.state}</div></div><div className="rounded-xl bg-[#f5f9f7] p-3"><div className="text-xs text-[#8aa096]">Calculated AQI</div><div className="mt-1 text-2xl font-bold" style={{color:currentCategory.color}}>{currentAQI.value} <span className="text-xs">{currentCategory.label}</span></div></div><div className="rounded-xl bg-[#f5f9f7] p-3"><div className="text-xs text-[#8aa096]">Dominant pollutant</div><div className="mt-1 font-semibold">{currentAQI.dominant}</div></div><div className="rounded-xl bg-[#f5f9f7] p-3"><div className="text-xs text-[#8aa096]">AQI standard</div><div className="mt-1 font-semibold">CPCB India</div></div></div><div className="mt-4 space-y-2 text-xs text-[#6f887d]"><p><Check size={14} className="mr-1 inline text-[#0a9566]"/>Coordinates recorded: {selected.lat}, {selected.lng}</p><p><Check size={14} className="mr-1 inline text-[#0a9566]"/>Sample timestamp: {selected.updated}</p><p><CircleAlert size={14} className="mr-1 inline text-[#b77b20]"/>Source provider and averaging period not verified in this demo.</p></div><button onClick={exportPassport} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#173b32] px-4 py-3 text-sm font-semibold text-white hover:bg-[#225344]"><Download size={16}/> Export Evidence Passport (JSON)</button><button onClick={()=>window.print()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#dce8e2] px-4 py-3 text-sm font-semibold text-[#426557]"><FileCheck2 size={16}/> Print passport</button></Card></div></>}

        {view==='settings'&&<><SectionTitle title="Settings & Data Sources" subtitle="Prototype configuration, data provenance and implementation readiness"/><div className="grid gap-5 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><Database size={18} className="text-[#0b9466]"/><h3 className="font-bold">Data-source status</h3></div><div className="mt-4 space-y-3">{[{name:'Air quality provider',status:'Optional public endpoint',detail:'Refresh fetches Open-Meteo gridded air-quality estimates for the selected location. These are not ground-station observations.'},{name:'Weather provider',status:'Optional public endpoint',detail:'Refresh fetches Open-Meteo weather context for the selected location.'},{name:'Supabase persistence',status:'Not connected in this ZIP',detail:'Configure project URL, anon key, schema, and RLS before claiming persistent storage.'},{name:'OpenStreetMap tiles',status:'Available',detail:'Map tiles require network access and must follow provider usage policies.'}].map(s=><div key={s.name} className="rounded-xl border border-[#e7efea] p-3"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{s.name}</div><Badge color={s.status==='Available'?'#16855d':'#b47720'} bg={s.status==='Available'?'#e5f7ee':'#fff5df'}>{s.status}</Badge></div><p className="mt-1 text-xs leading-5 text-[#83988f]">{s.detail}</p></div>)}</div></Card><Card className="p-5"><div className="flex items-center gap-2"><SlidersHorizontal size={18} className="text-[#0b9466]"/><h3 className="font-bold">AQI and prototype notes</h3></div><div className="mt-4 space-y-3 text-sm leading-6 text-[#6f887d]"><p><strong className="text-[#345749]">Default region:</strong> India · CPCB AQI breakpoints.</p><p><strong className="text-[#345749]">Important:</strong> the prototype currently uses sample values. Official AQI reporting also depends on required pollutant availability and specified averaging periods. Verify these before presenting calculated results as official observations.</p><p><strong className="text-[#345749]">Security:</strong> keep provider secrets in server-side environment variables or Edge Functions. Never place service-role keys in browser code.</p><p><strong className="text-[#345749]">Next implementation step:</strong> connect live APIs, persist observations and alert rules in Supabase, and add automated tests for AQI breakpoints and missing-data behavior.</p></div><button onClick={()=>notify('Readiness checklist opened: APIs → Supabase/RLS → tests → deployment.')} className="mt-4 flex items-center gap-2 rounded-xl border border-[#dce8e2] px-4 py-2.5 text-sm font-semibold text-[#426557]"><CircleHelp size={16}/> Show readiness checklist</button></Card></div></>}
      </div>
      <footer className="border-t border-[#e4ece8] bg-white px-6 py-4 text-center text-[10px] text-[#91a49b]">AirPulse AI · Urban Air Quality & Pollution Alert System · Demo prototype · Verify source data before operational use</footer>
    </main>
    {toast&&<div role="status" className="fixed bottom-5 right-5 z-[1000] flex items-center gap-2 rounded-xl bg-[#173b32] px-4 py-3 text-sm font-medium text-white shadow-xl"><CheckCircle2 size={17} className="text-[#61d9a6]"/>{toast}</div>}
  </div>;
}

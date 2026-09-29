// Station-level dataset for the All-India explorer.
// Values are loaded observations; per-station refresh can switch a location to
// MODEL mode (Open-Meteo grid estimates).
// Coverage note: the official CPCB All India AQI Dashboard covers CAAQMS
// monitoring stations — not every town or neighbourhood.
import { computeAqi, computeBaseline, type AqiResult, type Baseline, type Concentrations } from './aqi';

export type SourceKind = 'DEMO' | 'MODEL';

export type Station = {
  id: string;
  city: string;
  district: string;
  state: string;
  station: string;
  lat: number;
  lng: number;
  current: Concentrations;
  temp: number;
  humidity: number;
  wind: number;
  windDir: string;
  updated: string;
  sourceKind: SourceKind;
  sourceDetail: 'Station observation record';
  history: { month: number; aqi: number; concentrations: Concentrations }[];
};

type Seed = Omit<Station, 'history'> & { historyAqi: number[] };

// 12 monthly AQI values (Jan..Dec) per station; concentrations are
// synthesized proportionally in makeStation. September (month 8) is the
// "current" reference month for this prototype.
const months = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function makeStation(seed: Seed): Station {
  const history = months.map((m) => {
    const aqi = seed.historyAqi[m];
    // Rough back-calculation: PM2.5 ≈ AQI×0.45, PM10 ≈ AQI×0.9, others scaled.
    const concentrations: Concentrations = {
      pm25: Math.round(aqi * 0.45),
      pm10: Math.round(aqi * 0.9),
      no2: Math.round(18 + aqi * 0.18),
      so2: Math.round(6 + aqi * 0.07),
      co: Math.round((0.4 + aqi * 0.004) * 10) / 10,
      o3: Math.round(20 + aqi * 0.22),
      nh3: Math.round(10 + aqi * 0.5),
    };
    return { month: m, aqi, concentrations };
  });
  return { ...seed, history };
}

const seeds: Seed[] = [
  { id: 'DL-ANI', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', station: 'Anand Vihar (CAAQMS)', lat: 28.6469, lng: 77.3162, current: { pm25: 168, pm10: 312, no2: 61, so2: 18, co: 1.8, o3: 44, nh3: 78 }, temp: 32, humidity: 52, wind: 5.8, windDir: 'NW', updated: '2026-09-29 12:45 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [340, 320, 240, 160, 130, 110, 95, 105, 155, 210, 300, 345] },
  { id: 'DL-SHU', city: 'New Delhi', district: 'New Delhi', state: 'Delhi', station: 'Shadipur (CAAQMS)', lat: 28.6514, lng: 77.1462, current: { pm25: 132, pm10: 241, no2: 48, so2: 14, co: 1.3, o3: 38, nh3: 61 }, temp: 32, humidity: 54, wind: 6.2, windDir: 'NW', updated: '2026-09-29 12:44 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [290, 275, 210, 145, 120, 100, 88, 96, 138, 185, 255, 300] },
  { id: 'GZ-SEC', city: 'Gurugram', district: 'Gurugram', state: 'Haryana', station: 'Sector 51 (CAAQMS)', lat: 28.4595, lng: 77.0266, current: { pm25: 118, pm10: 205, no2: 41, so2: 12, co: 1.1, o3: 35, nh3: 49 }, temp: 31, humidity: 50, wind: 7.1, windDir: 'NW', updated: '2026-09-29 12:40 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [255, 240, 190, 135, 112, 95, 84, 92, 128, 172, 230, 268] },
  { id: 'NO-S60', city: 'Noida', district: 'Gautam Buddh Nagar', state: 'Uttar Pradesh', station: 'Sector 60 (CAAQMS)', lat: 28.6219, lng: 77.3875, current: { pm25: 126, pm10: 218, no2: 44, so2: 13, co: 1.2, o3: 37, nh3: 55 }, temp: 31, humidity: 51, wind: 6.4, windDir: 'NW', updated: '2026-09-29 12:41 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [270, 252, 198, 140, 115, 97, 86, 94, 135, 180, 242, 282] },
  { id: 'MU-BAN', city: 'Mumbai', district: 'Mumbai Suburban', state: 'Maharashtra', station: 'Bandra (CAAQMS)', lat: 19.0596, lng: 72.8295, current: { pm25: 62, pm10: 118, no2: 31, so2: 10, co: 0.8, o3: 42, nh3: 28 }, temp: 30, humidity: 74, wind: 11.2, windDir: 'W', updated: '2026-09-29 12:42 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [110, 105, 96, 84, 78, 88, 92, 90, 88, 95, 105, 112] },
  { id: 'MU-MAZ', city: 'Mumbai', district: 'Mumbai City', state: 'Maharashtra', station: 'Mazgaon (CAAQMS)', lat: 18.9708, lng: 72.8403, current: { pm25: 71, pm10: 132, no2: 36, so2: 12, co: 0.9, o3: 40, nh3: 33 }, temp: 30, humidity: 75, wind: 10.4, windDir: 'W', updated: '2026-09-29 12:42 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [125, 118, 108, 92, 84, 94, 99, 97, 96, 104, 115, 122] },
  { id: 'PU-CIV', city: 'Pune', district: 'Pune', state: 'Maharashtra', station: 'Civil Lines (CAAQMS)', lat: 18.5294, lng: 73.8567, current: { pm25: 58, pm10: 105, no2: 29, so2: 9, co: 0.7, o3: 38, nh3: 25 }, temp: 28, humidity: 62, wind: 9.6, windDir: 'SW', updated: '2026-09-29 12:38 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [105, 100, 92, 82, 76, 84, 88, 86, 84, 91, 100, 108] },
  { id: 'KL-NSC', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', station: 'NSC Bose Road (CAAQMS)', lat: 22.4989, lng: 88.3029, current: { pm25: 96, pm10: 178, no2: 38, so2: 15, co: 1.0, o3: 36, nh3: 42 }, temp: 31, humidity: 78, wind: 6.8, windDir: 'S', updated: '2026-09-29 12:35 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [165, 152, 128, 105, 92, 86, 82, 85, 105, 130, 152, 168] },
  { id: 'KL-SAL', city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', station: 'Salt Lake Sector V (CAAQMS)', lat: 22.5759, lng: 88.4337, current: { pm25: 84, pm10: 156, no2: 33, so2: 12, co: 0.9, o3: 39, nh3: 37 }, temp: 31, humidity: 77, wind: 7.4, windDir: 'S', updated: '2026-09-29 12:34 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [148, 136, 115, 96, 86, 80, 78, 80, 95, 118, 138, 152] },
  { id: 'CH-MAZ', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', station: 'Manali (CAAQMS)', lat: 13.1706, lng: 80.2697, current: { pm25: 46, pm10: 88, no2: 26, so2: 11, co: 0.6, o3: 31, nh3: 21 }, temp: 31, humidity: 70, wind: 12.8, windDir: 'SE', updated: '2026-09-29 12:30 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [78, 76, 72, 66, 60, 58, 56, 58, 64, 72, 78, 82] },
  { id: 'CH-VYT', city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', station: 'Velachery (CAAQMS)', lat: 12.9791, lng: 80.2210, current: { pm25: 39, pm10: 74, no2: 22, so2: 8, co: 0.5, o3: 29, nh3: 18 }, temp: 31, humidity: 69, wind: 13.4, windDir: 'SE', updated: '2026-09-29 12:31 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [66, 64, 61, 56, 52, 50, 48, 50, 55, 62, 67, 70] },
  { id: 'BL-CEN', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', station: 'City Railway Station (CAAQMS)', lat: 12.9774, lng: 77.5726, current: { pm25: 34, pm10: 66, no2: 20, so2: 7, co: 0.5, o3: 27, nh3: 16 }, temp: 27, humidity: 63, wind: 9.8, windDir: 'E', updated: '2026-09-29 12:39 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [70, 68, 62, 55, 50, 52, 54, 52, 56, 62, 68, 72] },
  { id: 'BL-BAP', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', station: 'Bapuji Nagar (CAAQMS)', lat: 12.9603, lng: 77.5849, current: { pm25: 42, pm10: 81, no2: 24, so2: 8, co: 0.6, o3: 30, nh3: 19 }, temp: 27, humidity: 62, wind: 9.2, windDir: 'E', updated: '2026-09-29 12:39 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [82, 80, 74, 65, 58, 60, 62, 60, 65, 73, 80, 85] },
  { id: 'HY-PAR', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', station: 'Paradise (CAAQMS)', lat: 17.4325, lng: 78.5013, current: { pm25: 54, pm10: 99, no2: 28, so2: 10, co: 0.7, o3: 33, nh3: 23 }, temp: 29, humidity: 56, wind: 10.6, windDir: 'NE', updated: '2026-09-29 12:32 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [95, 92, 84, 72, 64, 66, 68, 66, 72, 82, 92, 98] },
  { id: 'HY-COI', city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', station: 'Coresu (CAAQMS)', lat: 17.3850, lng: 78.4867, current: { pm25: 48, pm10: 90, no2: 25, so2: 9, co: 0.6, o3: 31, nh3: 20 }, temp: 29, humidity: 57, wind: 11.0, windDir: 'NE', updated: '2026-09-29 12:32 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [86, 84, 77, 66, 59, 61, 63, 61, 66, 75, 84, 89] },
  { id: 'AH-MAN', city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', station: 'Maninagar (CAAQMS)', lat: 23.0241, lng: 72.8587, current: { pm25: 88, pm10: 158, no2: 34, so2: 16, co: 1.0, o3: 35, nh3: 31 }, temp: 33, humidity: 48, wind: 8.4, windDir: 'NW', updated: '2026-09-29 12:36 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [160, 150, 128, 105, 95, 92, 90, 92, 102, 125, 148, 162] },
  { id: 'JP-CHM', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', station: 'Chandpole (CAAQMS)', lat: 26.9345, lng: 75.7925, current: { pm25: 76, pm10: 140, no2: 30, so2: 13, co: 0.9, o3: 34, nh3: 27 }, temp: 32, humidity: 44, wind: 9.0, windDir: 'NW', updated: '2026-09-29 12:37 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [140, 132, 112, 92, 82, 80, 78, 80, 90, 110, 130, 142] },
  { id: 'LU-CTY', city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', station: 'Lalbagh (CAAQMS)', lat: 26.8500, lng: 80.9470, current: { pm25: 134, pm10: 235, no2: 46, so2: 17, co: 1.4, o3: 38, nh3: 58 }, temp: 31, humidity: 66, wind: 6.0, windDir: 'E', updated: '2026-09-29 12:33 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [280, 262, 205, 150, 122, 100, 88, 95, 140, 190, 250, 290] },
  { id: 'PT-SEC', city: 'Patna', district: 'Patna', state: 'Bihar', station: 'Planetarium (CAAQMS)', lat: 25.6187, lng: 85.1376, current: { pm25: 142, pm10: 248, no2: 49, so2: 18, co: 1.5, o3: 40, nh3: 62 }, temp: 30, humidity: 70, wind: 5.4, windDir: 'NE', updated: '2026-09-29 12:34 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [295, 275, 215, 158, 128, 105, 92, 98, 148, 198, 258, 305] },
  { id: 'BN-MYS', city: 'Mysuru', district: 'Mysuru', state: 'Karnataka', station: 'Hebbal Industrial (CAAQMS)', lat: 12.3172, lng: 76.6550, current: { pm25: 26, pm10: 52, no2: 15, so2: 5, co: 0.4, o3: 24, nh3: 12 }, temp: 27, humidity: 60, wind: 10.8, windDir: 'E', updated: '2026-09-29 12:29 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [52, 50, 46, 42, 38, 40, 42, 40, 44, 48, 52, 55] },
  { id: 'GU-CDP', city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', station: 'Garamur (CAAQMS)', lat: 26.1445, lng: 91.7362, current: { pm25: 58, pm10: 108, no2: 27, so2: 9, co: 0.7, o3: 30, nh3: 22 }, temp: 29, humidity: 80, wind: 7.8, windDir: 'SE', updated: '2026-09-29 12:31 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [108, 102, 88, 74, 66, 70, 72, 70, 76, 88, 102, 112] },
  { id: 'BH-VIG', city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', station: 'GVMC Victoria Grounds (CAAQMS)', lat: 17.7045, lng: 83.2969, current: { pm25: 44, pm10: 85, no2: 23, so2: 10, co: 0.6, o3: 32, nh3: 18 }, temp: 30, humidity: 72, wind: 12.2, windDir: 'SW', updated: '2026-09-29 12:30 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [74, 72, 66, 58, 52, 54, 56, 54, 60, 68, 74, 78] },
  { id: 'NAG-GRM', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', station: 'Gramin (CAAQMS)', lat: 21.1458, lng: 79.0882, current: { pm25: 66, pm10: 122, no2: 30, so2: 11, co: 0.8, o3: 36, nh3: 26 }, temp: 30, humidity: 58, wind: 8.8, windDir: 'NW', updated: '2026-09-29 12:36 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [122, 115, 98, 82, 74, 76, 78, 76, 82, 95, 110, 120] },
  { id: 'IN-SGN', city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', station: 'Sanghi Nagar (CAAQMS)', lat: 22.7196, lng: 75.8577, current: { pm25: 61, pm10: 115, no2: 28, so2: 10, co: 0.8, o3: 34, nh3: 24 }, temp: 29, humidity: 55, wind: 9.4, windDir: 'NW', updated: '2026-09-29 12:36 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [112, 105, 90, 76, 68, 70, 72, 70, 76, 88, 102, 112] },
  { id: 'TH-THR', city: 'Thane', district: 'Thane', state: 'Maharashtra', station: 'Naupada (CAAQMS)', lat: 19.1720, lng: 72.9620, current: { pm25: 64, pm10: 121, no2: 30, so2: 10, co: 0.8, o3: 38, nh3: 27 }, temp: 30, humidity: 73, wind: 10.9, windDir: 'W', updated: '2026-09-29 12:40 IST', sourceKind: 'DEMO', sourceDetail: 'Station observation record', historyAqi: [115, 108, 96, 82, 76, 82, 85, 83, 84, 92, 102, 112] },
];

export const STATIONS: Station[] = seeds.map(makeStation);

export const CURRENT_MONTH = 8; // September — matches "updated" timestamps

export type StationComputed = {
  station: Station;
  aqi: AqiResult;
  baseline: Baseline;
  searchIndex: string;
};

export const COMPUTED: StationComputed[] = STATIONS.map((s) => ({
  station: s,
  aqi: computeAqi(s.current),
  baseline: computeBaseline(s.history),
  searchIndex: [s.city, s.district, s.state, s.station, s.id].join(' ').toLowerCase(),
}));

export const STATES = [...new Set(STATIONS.map((s) => s.state))].sort();

export function findStation(id: string): StationComputed | undefined {
  return COMPUTED.find((c) => c.station.id === id);
}

export const DATA_NOTICE = {
  officialReference: 'CPCB All India AQI Dashboard (airquality.cpcb.gov.in) is the official reference; it covers CAAQMS monitoring stations only — not every town or neighbourhood.',
  coverage: 'This explorer shows the stations with available data. A location absent here means no station data is currently available, not clean air.',
};

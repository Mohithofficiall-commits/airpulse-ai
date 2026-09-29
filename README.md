# AirPulse AI

**Urban Air Quality & Pollution Alert System**

AirPulse AI is a responsive decision-support prototype for exploring station-level air quality across India, calculating CPCB-style AQI, establishing local historical baselines, detecting abnormal pollution, investigating possible causes, and generating traceable alerts with recommendations.

## Stack
- React + TypeScript + Vite
- Tailwind CSS
- Leaflet + OpenStreetMap
- Recharts
- Lucide icons

## Run locally
```bash
npm install
npm run dev
```

## Features

1. **All-India city & town explorer** — search by state, city, district, town or monitoring station; filter by state and CPCB category; results include latest AQI, dominant pollutant, vs-baseline deviation, timestamp and source. Official reference: **CPCB All India AQI Dashboard** (airquality.cpcb.gov.in), whose coverage is based on CAAQMS monitoring stations — not every town or neighbourhood.
2. **Normal baseline** — per-station median AQI, p25–p75 typical range, monthly medians, seasonal aggregates and typical pollutant concentrations computed from 12 months of illustrative history; current readings are compared with the same location and same time of year.
3. **Abnormal-pollution detection** — flags readings on two grounds shown together: CPCB health category (≥ Poor bands) and statistical deviation (≥ 1.5× the seasonal/annual median baseline).
4. **Possible-cause investigation** — examines pollutant mix alongside weather context to surface possible contributors (traffic, dust, industry, waste burning, stagnant weather) — always labelled **possible**, never confirmed.
5. **Alerts & recommendations** — each alert carries affected location, current AQI, baseline comparison, dominant pollutant, severity (Watch/Alert/Emergency), detection time, possible causes, data confidence and recommended precautions. History is kept in-session and each alert tracks whether pollution returned to baseline.

## Important data limitations
- The bundled dataset is a small **illustrative subset** of stations with synthetic current values and history. Absence of a location means no data here, not clean air.
- Refresh-per-station switches that station to **MODEL** mode (Open-Meteo gridded estimates) — not ground-station observations.
- No averaging-period metadata is enforced; official AQI reporting requires CPCB data-availability rules.
- Alert history lives in browser state; Supabase persistence is not configured.

## Recommended next steps
1. Ingest live CAAQMS data through a secure server-side adapter, preserving source, units and timestamps.
2. Add Supabase tables, migrations and RLS for observations, baselines and alert history.
3. Add tests for AQI breakpoints, missing data, baseline computation and anomaly thresholds.
4. Validate forecasting against time-ordered holdouts before publishing any accuracy metric.
5. Run `npm run typecheck`, `npm run lint` and `npm run build` after installing dependencies.

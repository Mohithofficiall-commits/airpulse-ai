# AirPulse AI

**Urban Air Quality & Pollution Alert System**

AirPulse AI is a responsive decision-support prototype for viewing urban air-quality readings, calculating a CPCB-style AQI from available pollutant values, exploring locations on a map, reviewing historical trends, configuring alerts, and exporting traceable observation passports.

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

## Current prototype status
The uploaded project has been adapted from a methane-specific interface to AirPulse AI. The current build uses **clearly labeled illustrative demo data**. Live air-quality/weather API credentials and Supabase persistence are not configured in this ZIP.

Implemented in the prototype:
- Responsive dashboard and navigation
- CPCB India breakpoint-based pollutant sub-index calculation for demo values
- Interactive map with sample Indian city locations
- Location investigation, pollutant readings and weather context
- Illustrative historical trend and baseline forecast panel
- Client-side alert rule creation, toggling and deletion
- Evidence Passport JSON export, CSV export and print
- Explicit demo-mode and data-quality notices

## Important data limitations
- Sample readings and historical/forecast charts are illustrative, not live measurements.
- The demo records do not include verified averaging-period metadata. Official AQI reporting must enforce CPCB data-availability and averaging-period requirements.
- The forecast is an illustrative baseline and has not been validated. Do not report predictive accuracy.
- Alerts are held in browser state and are not persisted to Supabase.
- Pollution-source attribution is not inferred from AQI readings alone.

## Recommended next steps
1. Integrate an air-quality and weather provider through a secure server-side adapter; preserve source, units, observation timestamps and retrieval timestamps.
2. Add Supabase tables, migrations and Row Level Security for observations, alert rules and Evidence Passports.
3. Add tests for AQI breakpoints, missing data, valid AQI zero, unit/averaging-period validation, API failure fallback and alert behavior.
4. Validate the forecast with time-ordered historical data before publishing performance metrics.
5. Run `npm run typecheck`, `npm run lint` and `npm run build` after installing dependencies.

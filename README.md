<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=230&section=header&text=AirPulse%20AI&fontSize=64&fontColor=ffffff&animation=fadeIn&fontAlignY=36&desc=Urban%20Air%20Quality%20%26%20Pollution%20Alert%20System&descSize=22&descAlignY=58" alt="AirPulse AI" width="100%"/>

[![Typing SVG](https://readme-typing-svg.demolab.com?font=Segoe+UI&weight=600&size=22&pause=1200&color=22D3EE&center=true&vCenter=true&width=760&lines=Know+which+pollutant+drives+the+AQI;See+how+fresh+every+reading+is;Validated+data%2C+labeled+honestly;Baseline+forecasts+with+published+error)](https://mohithofficiall-commits.github.io/airpulse-ai/)

[![Live Demo](https://img.shields.io/badge/LIVE-Web_App-22d3ee?style=for-the-badge&logo=githubpages&logoColor=white)](https://mohithofficiall-commits.github.io/airpulse-ai/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Mohithofficiall-commits/airpulse-ai)
![Status](https://img.shields.io/badge/status-hackathon_prototype-f97316?style=for-the-badge)
![AQI](https://img.shields.io/badge/AQI-CPCB_India-a3e635?style=for-the-badge)

**[Live App](https://mohithofficiall-commits.github.io/airpulse-ai/)** · **[Source Code](https://github.com/Mohithofficiall-commits/airpulse-ai)** · **[Architecture](#-architecture)** · **[Roadmap](#-roadmap)**

</div>

---

## ✨ What is AirPulse AI?

AirPulse AI is a hackathon prototype that collects urban air-quality readings, validates them, computes an AQI using the **India / CPCB methodology**, and shows current conditions and alerts on a web dashboard. It focuses on **transparency**: every reading carries its source, timestamp, freshness and quality flags, and demo data is always labeled.

Most AQI displays give one number. AirPulse tries to answer:

| Question | AirPulse design response |
| :-- | :-- |
| Which pollutant drives the AQI? | Sub-indices + dominant pollutant |
| How old is this reading? | `fresh` / `aging` / `stale` badge |
| Was the value checked? | Validation layer + quality flags + quarantine |
| What if the source fails? | Fallback source → last good data → STALE → labeled DEMO |
| How good is the forecast? | Baseline models with MAE / RMSE and sample size |

> **Honesty note.** Feature status reflects the design blueprint and must be confirmed against the repository. Nothing here is a measured result.

---

## 🏗 Architecture

### Full system architecture

```mermaid
flowchart LR
    subgraph SRC["1 · Data Sources"]
        S1["Official AQI feed<br/>(candidate)"]
        S2["Open aggregator<br/>(candidate)"]
        S3["Weather API<br/>(candidate)"]
        S4["IoT sensor gateway<br/>(optional, planned)"]
        S5["Demo dataset<br/>(always labeled DEMO)"]
    end

    subgraph ING["2 · Ingest and Validate"]
        I1["Scheduler<br/>15-60 min"]
        I2["Source adapters<br/>timeout, retry x3, fallback"]
        I3["Raw payload store"]
        I4["Normalize<br/>units, UTC time, dedupe"]
        I5{"Validate<br/>range, spike, missing,<br/>future timestamp"}
        I6["Quarantine<br/>invalid values + reason"]
    end

    subgraph AQI["3 · AQI Intelligence"]
        A1["Averaging windows<br/>24h / 8h, min 16h"]
        A2["CPCB sub-index calculator<br/>breakpoints as JSON"]
        A3["AQI = max sub-index<br/>dominant pollutant, category"]
        A4["Freshness and quality flags<br/>fresh / aging / stale"]
        A5["Baseline forecast<br/>persistence, seasonal, EWMA"]
        A6["Alert rule evaluator<br/>cool-down + hysteresis"]
    end

    subgraph BE["4 · Supabase Backend"]
        B1[("PostgreSQL")]
        B2["Edge Functions<br/>ingest, compute, alert"]
        B3["Row Level Security"]
        B4["Realtime / REST"]
        B5["Secrets store"]
    end

    subgraph OUT["5 · Outputs"]
        O1["React dashboard<br/>map, AQI cards, history,<br/>freshness, provenance, DEMO badge"]
        O2["Alert center<br/>email / push"]
        O3["CSV / JSON export"]
        O4["Run logs and health checks"]
        O5["Tests<br/>AQI vectors, validation,<br/>fault injection, RLS"]
    end

    S1 --> I2
    S2 --> I2
    S3 --> I2
    S4 -.-> I2
    S5 -. "operator-enabled only" .-> A4

    I1 --> I2 --> I3
    I2 --> I4 --> I5
    I5 -- invalid --> I6
    I5 -- valid --> A1

    A1 --> A2 --> A3 --> A4
    A4 --> A5
    A4 --> A6

    A4 --> B1
    A5 --> B1
    A6 --> B2
    B2 <--> B1
    B3 --- B1
    B5 --- B2
    B1 --> B4

    B4 --> O1
    B2 --> O2
    B1 --> O3
    I2 --> O4
    O5 -.-> I5
    O5 -.-> A2

    classDef src fill:#0e2a3a,stroke:#22d3ee,color:#e2f6ff
    classDef ing fill:#10263f,stroke:#38bdf8,color:#e2f6ff
    classDef aqi fill:#1c2f14,stroke:#a3e635,color:#f0ffe0
    classDef be fill:#2a1f3d,stroke:#a78bfa,color:#f1eaff
    classDef out fill:#3a2410,stroke:#f97316,color:#fff1e6
    classDef bad fill:#3a1010,stroke:#f87171,color:#ffeaea
    classDef demo fill:#3b2a0a,stroke:#f59e0b,color:#fff6dd
    class S1,S2,S3,S4 src
    class S5 demo
    class I1,I2,I3,I4,I5 ing
    class I6 bad
    class A1,A2,A3,A4,A5,A6 aqi
    class B1,B2,B3,B4,B5 be
    class O1,O2,O3,O4,O5 out
```

### Data flow

```mermaid
sequenceDiagram
    autonumber
    participant S as Scheduler
    participant A as Adapter
    participant V as Validator
    participant E as AQI Engine
    participant DB as PostgreSQL
    participant UI as Dashboard
    S->>A: trigger run
    A->>A: fetch with timeout, retry x3, fallback
    A->>DB: raw payload + run log
    A->>V: normalized readings (UTC)
    V-->>DB: quarantine invalid values
    V->>E: valid readings
    E->>DB: sub-indices, AQI, dominant pollutant, flags
    UI->>DB: latest AQI + history
    DB-->>UI: values with provenance and freshness
```

### Failure handling

```mermaid
flowchart TD
    A([Scheduled run]) --> B{Primary source OK?}
    B -- no/timeout --> C[Retry with backoff, max 3]
    C --> D{Recovered?}
    D -- no --> E{Secondary source OK?}
    E -- no --> F[Log failure, keep last good data]
    B -- yes --> G{Parses, units known?}
    D -- yes --> G
    E -- yes --> G
    G -- no --> Q[Quarantine + log]
    G -- yes --> H{Values valid?}
    H -- some invalid --> I[Drop invalid, flag partial]
    H -- yes --> J{Enough data in window?}
    I --> J
    J -- no --> K[/AQI not computed: insufficient data/]
    J -- yes --> L[Compute AQI]
    F --> M{Reading age}
    L --> M
    M -- within limit --> N[Show fresh / aging]
    M -- beyond limit --> O[STALE badge]
    O --> P{Demo mode enabled?}
    P -- yes --> R[DEMO banner, no alerts]
    P -- no --> S2[Data unavailable]
```

---

## 🧮 AQI methodology (CPCB, India default)

- Sub-index per pollutant → **overall AQI = max sub-index**; that pollutant is the **dominant pollutant**.
- Requires **≥ 3 pollutants, at least one PM2.5 or PM10**; otherwise "insufficient data".
- Averaging: PM2.5 / PM10 / NO₂ / SO₂ / NH₃ 24 h · O₃ 8 h · CO 8 h; about **16 h minimum** of data per window.
- Formula: `Ip = ((I_hi − I_lo) / (BP_hi − BP_lo)) × (Cp − BP_lo) + I_lo`
- Breakpoints live in **data (JSON), not code**; each AQI record stores `methodology` + `methodology_version`.
- Values above the top band cap at 500 with an `above_scale` flag.

**Illustrative test vector** (to be locked by tests): PM2.5 = 75 µg/m³ → ≈ 148.8 → **149**.

> Verify breakpoints against the current CPCB publication before submission.

---

## 🗄 Data model (proposed)

```mermaid
erDiagram
    data_sources ||--o{ stations : feeds
    data_sources ||--o{ ingestion_runs : logs
    ingestion_runs ||--o{ raw_observations : stores
    ingestion_runs ||--o{ quarantined_observations : rejects
    stations ||--o{ observations : has
    stations ||--o{ aqi_readings : has
    stations ||--o{ forecasts : has
    alert_rules ||--o{ alert_events : fires
    aqi_readings ||--o{ alert_events : triggers
```

**Security:** RLS on all tables · anon = read-only on public data · writes via service role from Edge Functions only · secrets never in client code or repo.

---

## 🔔 Alerts and 📈 Forecast

- **Alerts:** category crossing, dominant-pollutant change, stale data for a subscribed station. Cool-down + hysteresis; **demo data never triggers real notifications**.
- **Forecast:** persistence, seasonal naive, moving average / EWMA. Walk-forward evaluation, **MAE / RMSE with n** shown. With too little history the UI says *"Forecast unavailable"* and never invents a value.

---

## 🧰 Tech stack

| Layer | Technology |
| :-- | :-- |
| Frontend | React, hosted on GitHub Pages |
| Backend | Supabase (PostgreSQL, Auth, RLS, Realtime, Edge Functions) |
| Ingestion | Scheduled adapters (sources to be verified for access, licensing, limits) |
| Testing | AQI vectors, validation, fault injection, RLS checks |

---

## 🗺 Roadmap

| Phase | Focus | Status |
| :-- | :-- | :-- |
| 0 | Foundation: repo, Supabase, secrets, migrations | ☐ confirm |
| 1 | Core MVP: adapter → validation → CPCB engine → dashboard | ☐ confirm |
| 2 | Resilience: retry, quarantine, STALE, labeled demo fallback | ☐ confirm |
| 3 | History charts and alerts | ☐ confirm |
| 4 | Baseline forecast + MAE / RMSE | ☐ confirm |
| 5 | Hardening: second source, RLS audit, benchmarks, more regions | 📋 planned |

---

## 🚀 Run locally

```bash
git clone https://github.com/Mohithofficiall-commits/airpulse-ai.git
cd airpulse-ai
npm install
cp .env.example .env   # add your Supabase URL and ANON key only
npm run dev
```

> Never commit the service-role key or third-party API keys.

---

## ⚠️ Limitations

Informational only, not medical advice · does not reduce emissions · baseline forecasts ignore weather, traffic, festivals and fires · station coverage limited to the prototype · all metrics are targets until measured.

---

<div align="center">

**[Open the live app →](https://mohithofficiall-commits.github.io/airpulse-ai/)**

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer" width="100%" alt=""/>

</div>

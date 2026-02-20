# Sentinel — Real-Time Disaster Monitoring Frontend

A real-time disaster monitoring and response command center that fuses **social media intelligence**, **citizen IVR/GPS reports**, and **satellite imagery change detection** into a unified dashboard with a 3D CesiumJS globe.

> **Backend repo:** [ManishPingale7/Sentinel](https://github.com/ManishPingale7/Sentinel)

---

## Features

### Command Center (`/command-center`)
Interactive **CesiumJS 3D globe** with layered disaster markers (social, IVR, satellite). Live metrics panel, real-time WebSocket feed, auto-rotate globe, day/night toggle, layer toggling, and flood inspection panel. Subscribes to Firebase for IVR + app reports in real-time.

### Social Intelligence (`/social`)
Social media feed aggregator pulling from Twitter, Reddit, News, Telegram, and Instagram. NLP-classified by disaster type, urgency, and credibility. Trending hashtags, platform filters, and live updates via WebSocket.

### IVR & GPS Reports (`/ivr`)
Citizen-submitted disaster reports received through IVR (phone) calls. Audio playback from Firebase Storage, transcripts, GPS locations, and severity levels. Real-time updates via Firestore `onSnapshot`.

### Satellite Detection (`/satellite`)
Satellite-based flood change detection using the **ai4g-flood** SAR model. Before/during image comparison slider, flood polygon overlays, per-tile inspection. Fetches CEMS events and flood prediction outputs from the satellite API.

### Alerts Management (`/alerts`)
CRUD interface for managing disaster alerts — create, edit, delete. Stored in Firebase Firestore with severity levels (critical/high/medium/low), district targeting, and expiration dates.

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Framework** | React 18, TypeScript, Vite (SWC) |
| **Styling** | Tailwind CSS, shadcn/ui (Radix primitives), Framer Motion |
| **3D Globe** | CesiumJS v1.125, vite-plugin-cesium |
| **Data** | TanStack React Query, React Router v6, WebSocket |
| **Backend Services** | Firebase (Firestore + Storage), FastAPI backends |
| **Charts** | Recharts |

---

## Getting Started

### Prerequisites
- **Node.js** v18+ and **npm** (or **bun**)
- Backend APIs running (see [Backend repo](https://github.com/ManishPingale7/Sentinel))

### Installation

```bash
# Clone the repository
git clone https://github.com/JagjitBhosale/Sentinel-Frontend.git
cd Sentinel-Frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Backend APIs Required

| Service | URL | Purpose |
|---|---|---|
| Feed & Map API | `http://localhost:8000` | Social media feed, disaster map reports, heatmap, WebSocket stream |
| Satellite API | `http://localhost:8001` | CEMS flood events, satellite imagery, GeoJSON flood polygons |

Start both backends from the [Sentinel](https://github.com/ManishPingale7/Sentinel) repo:

```bash
cd "Sentinel Backend"
uvicorn backend.feed_and_map_api:app --reload --port 8000
uvicorn backend.satellite_api:app --reload --port 8001
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/          # Navbar
│   ├── layers/          # AppLayer, IVRLayer, SatelliteLayer, SocialLayer
│   ├── ui/              # shadcn/ui + custom components (FloodInspectorPanel, GlassCard, etc.)
│   ├── dashboard/       # MetricsPanel
│   ├── GlobeViewer.tsx  # CesiumJS 3D globe
│   ├── SidePanel.tsx    # Collapsible side panel
│   └── DisasterPopup.tsx
├── pages/
│   ├── Admin.tsx         # Landing page
│   ├── CommandCenter.tsx # Main dashboard with globe
│   ├── SocialPage.tsx    # Social media intelligence
│   ├── IVRPage.tsx       # IVR & GPS reports
│   ├── SatellitePage.tsx # Satellite flood detection
│   └── AlertsPage.tsx    # Alert management
├── services/
│   ├── api.ts            # API client (feed + satellite)
│   └── firebase.ts       # Firebase config & initialization
├── hooks/
│   ├── useDisasterData.ts # Firebase realtime data hook
│   └── useWebSocket.ts    # WebSocket connection with auto-reconnect
├── types/
│   └── disaster.ts        # TypeScript interfaces
└── lib/
    └── api.ts             # Additional API utilities
```

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

---

## License

Private project — all rights reserved.

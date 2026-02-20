import type {
    MapReport,
    SatelliteEvent,
    FloodGeoJsonCollection,
    DashboardStats,
    DashboardSummary,
} from "@/types/disaster";

const SOCIAL_API = "http://localhost:8000";
const SATELLITE_API = "http://localhost:8001";

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${url} → ${res.status}`);
    const json = await res.json();
    // Backend wraps responses in { ok, data, meta } — unwrap if present
    if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
    }
    return json as T;
}

// ─── Helpers: map backend shapes → frontend types ───

/** Capitalize first letter: "high" → "High", "critical" → "High" (mapped) */
function normalizeSeverity(s: string | undefined): "Low" | "Medium" | "High" {
    if (!s) return "Low";
    const lower = s.toLowerCase();
    if (lower === "critical" || lower === "high") return "High";
    if (lower === "medium") return "Medium";
    return "Low";
}

/** Transform a raw backend map-report pin into the frontend MapReport shape */
function toMapReport(raw: Record<string, any>): MapReport {
    return {
        id: raw.id,
        text: raw.title || raw.text || "",
        latitude: raw.latitude ?? raw.lat ?? 0,
        longitude: raw.longitude ?? raw.lng ?? 0,
        disaster_type: raw.disaster_type || "unknown",
        severity: normalizeSeverity(raw.severity),
        confidence: raw.confidence ?? 0.8,
        source: raw.source || "social",
        source_count: raw.source_count,
        timestamp: raw.timestamp || raw.created_at || new Date().toISOString(),
        urgency: raw.urgency,
        transcription: raw.transcription,
        reporter_type: raw.reporter_type,
    };
}

// ─── Social Media + Disaster Map (port 8000) ───

export async function fetchMapReports(): Promise<MapReport[]> {
    const raw = await fetchJson<any[]>(`${SOCIAL_API}/api/map/reports`);
    if (!Array.isArray(raw)) return [];
    return raw.map(toMapReport);
}

export async function fetchStats(): Promise<DashboardStats> {
    try {
        const raw = await fetchJson<Record<string, any>>(`${SOCIAL_API}/api/stats`);
        return {
            total_reports: raw.total_reports ?? raw.verified_reports ?? raw.total_posts ?? 0,
            critical_alerts: raw.critical_alerts ?? raw.critical_reports ?? 0,
            active_satellite_events: raw.active_satellite_events ?? 0,
            social_media_posts_24h: raw.social_media_posts_24h ?? raw.disaster_posts ?? 0,
        };
    } catch {
        // Fallback: build stats from reports
        const reports = await fetchMapReports();
        return {
            total_reports: reports.length,
            critical_alerts: reports.filter((r) => r.severity === "High").length,
            active_satellite_events: 0,
            social_media_posts_24h: reports.filter((r) => {
                const t = new Date(r.timestamp).getTime();
                return Date.now() - t < 86400000;
            }).length,
        };
    }
}

export async function fetchSummary(): Promise<DashboardSummary> {
    try {
        return await fetchJson<DashboardSummary>(`${SOCIAL_API}/api/summary`);
    } catch {
        return {
            total_posts: 0,
            disaster_posts: 0,
            non_disaster_posts: 0,
            by_type: {},
        };
    }
}

// ─── Satellite Flood Detection (port 8001) ───

export async function fetchSatelliteEvents(): Promise<SatelliteEvent[]> {
    try {
        return await fetchJson<SatelliteEvent[]>(`${SATELLITE_API}/api/events`);
    } catch {
        return [];
    }
}

export async function fetchEventGeoJson(
    cemsId: string,
    layer: string = "change"
): Promise<FloodGeoJsonCollection> {
    return fetchJson<FloodGeoJsonCollection>(
        `${SATELLITE_API}/api/events/${cemsId}/geojson?layer=${layer}`
    );
}

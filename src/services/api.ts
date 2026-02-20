import type { FeedPost, TrendingHashtag } from "@/types/disaster";

const SOCIAL_API = "http://localhost:8000";
const SATELLITE_API = "http://localhost:8001";

async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API ${url} → ${res.status}`);
    const json = await res.json();
    if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
    }
    return json as T;
}

// ─── Feed Page (Port 8000) ───

export interface FeedParams {
    platform?: string;
    disaster_type?: string;
    urgency?: string;
    disasters_only?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
}

export async function fetchFeed(params?: FeedParams): Promise<FeedPost[]> {
    const qs = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
        });
    }
    const query = qs.toString() ? `?${qs}` : "";
    try {
        const data = await fetchJson<any>(`${SOCIAL_API}/api/feed${query}`);
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

export async function fetchFeedPost(id: string): Promise<FeedPost | null> {
    try {
        return await fetchJson<FeedPost>(`${SOCIAL_API}/api/feed/${id}`);
    } catch {
        return null;
    }
}

export async function fetchPlatforms(): Promise<Record<string, number>> {
    try {
        return await fetchJson<Record<string, number>>(`${SOCIAL_API}/api/feed/platforms`);
    } catch {
        return {};
    }
}

export async function fetchTrending(topN = 15): Promise<TrendingHashtag[]> {
    try {
        return await fetchJson<TrendingHashtag[]>(
            `${SOCIAL_API}/api/feed/trending?top_n=${topN}`
        );
    } catch {
        return [];
    }
}

// ─── Map Endpoints (Port 8000) ───

export async function fetchMapReportDetail(id: string): Promise<any> {
    try {
        return await fetchJson<any>(`${SOCIAL_API}/api/map/reports/${id}`);
    } catch {
        return null;
    }
}

export async function fetchHeatmap(): Promise<[number, number, number][]> {
    try {
        return await fetchJson<[number, number, number][]>(`${SOCIAL_API}/api/map/heatmap`);
    } catch {
        return [];
    }
}

export async function fetchStateStats(): Promise<any[]> {
    try {
        return await fetchJson<any[]>(`${SOCIAL_API}/api/map/states`);
    } catch {
        return [];
    }
}

// ─── Satellite Endpoints (Port 8001) ───

export async function fetchFloodSummary(): Promise<any> {
    try {
        return await fetchJson<any>(`${SATELLITE_API}/api/summary`);
    } catch {
        return null;
    }
}

export async function fetchFloodEventDetail(cemsId: string): Promise<any> {
    try {
        return await fetchJson<any>(`${SATELLITE_API}/api/events/${cemsId}`);
    } catch {
        return null;
    }
}

export function getSatelliteImageUrl(cemsId: string, tile: string, phase: "before" | "during") {
    return `${SATELLITE_API}/api/events/${cemsId}/tiles/${tile}/rgb/${phase}`;
}

export function getChangeOverlayUrl(cemsId: string, tile: string) {
    return `${SATELLITE_API}/api/events/${cemsId}/tiles/${tile}/change_overlay`;
}

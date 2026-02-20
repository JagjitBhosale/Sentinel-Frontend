import { useQuery } from "@tanstack/react-query";
import {
    fetchMapReports,
    fetchStats,
    fetchSummary,
    fetchSatelliteEvents,
    fetchEventGeoJson,
} from "@/lib/api";

/** All map reports (social + IVR) — refetch every 30s */
export function useMapReports() {
    return useQuery({
        queryKey: ["mapReports"],
        queryFn: fetchMapReports,
        refetchInterval: 30_000,
        retry: 2,
        staleTime: 15_000,
    });
}

/** Dashboard stats — refetch every 30s */
export function useDashboardStats() {
    return useQuery({
        queryKey: ["dashboardStats"],
        queryFn: fetchStats,
        refetchInterval: 30_000,
        retry: 2,
        staleTime: 15_000,
    });
}

/** Dashboard summary — refetch every 30s */
export function useDashboardSummary() {
    return useQuery({
        queryKey: ["dashboardSummary"],
        queryFn: fetchSummary,
        refetchInterval: 30_000,
        retry: 2,
        staleTime: 15_000,
    });
}

/** Satellite events list */
export function useSatelliteEvents() {
    return useQuery({
        queryKey: ["satelliteEvents"],
        queryFn: fetchSatelliteEvents,
        refetchInterval: 60_000,
        retry: 2,
        staleTime: 30_000,
    });
}

/** Satellite event GeoJSON (enabled only when cemsId is provided) */
export function useEventGeoJson(cemsId: string | null, layer = "change") {
    return useQuery({
        queryKey: ["eventGeoJson", cemsId, layer],
        queryFn: () => fetchEventGeoJson(cemsId!, layer),
        enabled: !!cemsId,
        staleTime: 60_000,
    });
}

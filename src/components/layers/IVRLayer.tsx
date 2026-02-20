import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import type { IVRReport, MapReport, AppReport } from "@/types/disaster";

interface IVRLayerProps {
    viewer: Cesium.Viewer | null;
    firebaseReports: IVRReport[];
    /** App reports from the "reports" collection */
    appReports: AppReport[];
    /** legacy API reports – kept so nothing breaks */
    reports?: MapReport[];
    visible: boolean;
    onReportClick: (report: MapReport) => void;
    onAppReportClick: (report: MapReport, appReport: AppReport) => void;
    onReportHover: (report: MapReport | null, position?: { x: number; y: number }) => void;
}

/** Convert a Firebase IVR doc into the MapReport shape used by the detail panel / tooltip */
function toMapReport(doc: IVRReport): MapReport | null {
    const lat = parseFloat(doc.lat as any) || (doc.location?.lat as number) || null;
    const lng = parseFloat(doc.long as any) || (doc.location?.lng as number) || null;
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;

    return {
        id: doc.id,
        text: doc.summary || doc.transcript || doc.description || "",
        latitude: lat,
        longitude: lng,
        disaster_type: doc.disaster_type || "Unknown",
        severity: (doc.severity as any) || "Medium",
        confidence: doc.trust_score ?? 0.8,
        source: "ivr",
        timestamp: doc.created_at?.toDate?.()
            ? doc.created_at.toDate().toISOString()
            : new Date().toISOString(),
        transcription: doc.transcript || undefined,
        reporter_type: doc.reporter_type || "Citizen",
    };
}

/** Convert an AppReport to a MapReport */
function appToMapReport(doc: AppReport): MapReport | null {
    const lat = doc.location?.lat ?? null;
    const lng = doc.location?.lng ?? null;
    if (lat == null || lng == null) return null;

    return {
        id: doc.id,
        text: doc.description || doc.reportTitle || "",
        latitude: lat,
        longitude: lng,
        disaster_type: doc.reportType
            ? doc.reportType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : "App Report",
        severity:
            doc.priorityLevel === "critical" || doc.priorityLevel === "high"
                ? "High"
                : doc.priorityLevel === "medium"
                    ? "Medium"
                    : "Low",
        confidence: doc.trustScore ?? 0,
        source: "app",
        timestamp:
            doc.submissionTimestamp ||
            doc.createdAt?.toDate?.()?.toISOString() ||
            new Date().toISOString(),
    };
}

const priorityColorMap: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
    very_low: "#10b981",
};

const IVRLayer = ({
    viewer,
    firebaseReports,
    appReports,
    reports: _legacyReports,
    visible,
    onReportClick,
    onAppReportClick,
    onReportHover,
}: IVRLayerProps) => {
    const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
    const reportMapRef = useRef<Map<string, MapReport>>(new Map());
    const appReportMapRef = useRef<Map<string, { mapReport: MapReport; appReport: AppReport }>>(new Map());
    const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

    // Create data source
    useEffect(() => {
        if (!viewer) return;
        const ds = new Cesium.CustomDataSource("ivr-layer");
        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;
        return () => {
            if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true);
            dataSourceRef.current = null;
        };
    }, [viewer]);

    // Toggle visibility
    useEffect(() => {
        if (dataSourceRef.current) dataSourceRef.current.show = visible;
    }, [visible]);

    // Render Firebase IVR markers + App report markers
    useEffect(() => {
        const ds = dataSourceRef.current;
        if (!ds || !viewer) return;

        ds.entities.removeAll();
        reportMapRef.current.clear();
        appReportMapRef.current.clear();

        // ── IVR markers (diamond shape, cyan) ──
        const mapped = firebaseReports.map(toMapReport).filter(Boolean) as MapReport[];

        mapped.forEach((report) => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <polygon points="16,2 30,16 16,30 2,16" fill="rgba(0,188,212,0.85)" stroke="rgba(0,188,212,0.5)" stroke-width="2"/>
                <polygon points="16,8 24,16 16,24 8,16" fill="rgba(255,255,255,0.25)"/>
            </svg>`;
            const dataUri = "data:image/svg+xml;base64," + btoa(svg);

            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(report.longitude, report.latitude, 0),
                billboard: {
                    image: dataUri,
                    width: 28,
                    height: 28,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scaleByDistance: new Cesium.NearFarScalar(5000, 1.6, 5000000, 0.35),
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                },
                id: `ivr-${report.id}`,
            });

            reportMapRef.current.set(`ivr-${report.id}`, report);

            // Pulse ring
            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(report.longitude, report.latitude),
                ellipse: {
                    semiMinorAxis: 40000,
                    semiMajorAxis: 40000,
                    height: 0,
                    material: new Cesium.ColorMaterialProperty(
                        new Cesium.Color(0.0, 0.74, 0.83, 0.08)
                    ),
                    outline: true,
                    outlineColor: new Cesium.Color(0.0, 0.74, 0.83, 0.3),
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
            });
        });

        // ── App report markers (hexagon shape, priority-colored) ──
        appReports.forEach((appDoc) => {
            const mapReport = appToMapReport(appDoc);
            if (!mapReport) return;

            const priority = (appDoc.priorityLevel || "low").toLowerCase();
            const cssColor = priorityColorMap[priority] || "#22c55e";

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                <polygon points="16,1 29,8.5 29,23.5 16,31 3,23.5 3,8.5"
                    fill="${cssColor}cc" stroke="${cssColor}80" stroke-width="2"/>
                <circle cx="16" cy="16" r="5" fill="rgba(255,255,255,0.35)"/>
            </svg>`;
            const dataUri = "data:image/svg+xml;base64," + btoa(svg);

            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(mapReport.longitude, mapReport.latitude, 0),
                billboard: {
                    image: dataUri,
                    width: 26,
                    height: 26,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scaleByDistance: new Cesium.NearFarScalar(5000, 1.6, 5000000, 0.35),
                    verticalOrigin: Cesium.VerticalOrigin.CENTER,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                },
                id: `app-${appDoc.id}`,
            });

            appReportMapRef.current.set(`app-${appDoc.id}`, { mapReport, appReport: appDoc });

            // Pulse ring
            const color = Cesium.Color.fromCssColorString(cssColor);
            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(mapReport.longitude, mapReport.latitude),
                ellipse: {
                    semiMinorAxis: 35000,
                    semiMajorAxis: 35000,
                    height: 0,
                    material: new Cesium.ColorMaterialProperty(
                        new Cesium.Color(color.red, color.green, color.blue, 0.08)
                    ),
                    outline: true,
                    outlineColor: new Cesium.Color(color.red, color.green, color.blue, 0.25),
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
            });
        });
    }, [firebaseReports, appReports, viewer]);

    // Click & hover handlers
    useEffect(() => {
        if (!viewer) return;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current = handler;

        handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(click.position);
            if (Cesium.defined(picked) && picked.id?.id) {
                const entityId = picked.id.id as string;
                // Check if it's an app report
                const appEntry = appReportMapRef.current.get(entityId);
                if (appEntry) {
                    onAppReportClick(appEntry.mapReport, appEntry.appReport);
                    return;
                }
                // Otherwise check IVR
                const report = reportMapRef.current.get(entityId);
                if (report) onReportClick(report);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && picked.id?.id) {
                const entityId = picked.id.id as string;
                const appEntry = appReportMapRef.current.get(entityId);
                const report = appEntry?.mapReport ?? reportMapRef.current.get(entityId);
                if (report) {
                    onReportHover(report, {
                        x: movement.endPosition.x,
                        y: movement.endPosition.y,
                    });
                }
            } else {
                onReportHover(null);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        return () => {
            handler.destroy();
            handlerRef.current = null;
        };
    }, [viewer, onReportClick, onAppReportClick, onReportHover]);

    return null;
};

export default IVRLayer;

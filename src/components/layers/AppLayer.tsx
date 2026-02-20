import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import type { AppReport } from "@/types/disaster";
import type { MapReport } from "@/types/disaster";

interface AppLayerProps {
    viewer: Cesium.Viewer | null;
    appReports: AppReport[];
    visible: boolean;
    onReportClick: (report: MapReport, appReport: AppReport) => void;
    onReportHover: (report: MapReport | null, position?: { x: number; y: number }) => void;
}

/** Convert an AppReport to a MapReport shape for the tooltip / detail panel */
function toMapReport(doc: AppReport): MapReport | null {
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
        severity: doc.priorityLevel === "critical" || doc.priorityLevel === "high"
            ? "High"
            : doc.priorityLevel === "medium"
                ? "Medium"
                : "Low",
        confidence: doc.trustScore ?? 0,
        source: "app",
        timestamp: doc.submissionTimestamp
            || doc.createdAt?.toDate?.()?.toISOString()
            || new Date().toISOString(),
    };
}

const priorityColorMap: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#22c55e",
    very_low: "#10b981",
};

const AppLayer = ({
    viewer,
    appReports,
    visible,
    onReportClick,
    onReportHover,
}: AppLayerProps) => {
    const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
    const reportMapRef = useRef<Map<string, { mapReport: MapReport; appReport: AppReport }>>(new Map());
    const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

    // Create data source
    useEffect(() => {
        if (!viewer) return;
        const ds = new Cesium.CustomDataSource("app-layer");
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

    // Render markers
    useEffect(() => {
        const ds = dataSourceRef.current;
        if (!ds || !viewer) return;

        ds.entities.removeAll();
        reportMapRef.current.clear();

        appReports.forEach((appDoc) => {
            const mapReport = toMapReport(appDoc);
            if (!mapReport) return;

            const priority = (appDoc.priorityLevel || "low").toLowerCase();
            const cssColor = priorityColorMap[priority] || "#22c55e";
            const color = Cesium.Color.fromCssColorString(cssColor);

            // Hexagon-style billboard
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

            reportMapRef.current.set(`app-${appDoc.id}`, { mapReport, appReport: appDoc });

            // Pulse ring
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
    }, [appReports, viewer]);

    // Click & hover handlers
    useEffect(() => {
        if (!viewer) return;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current = handler;

        handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(click.position);
            if (Cesium.defined(picked) && picked.id?.id) {
                const entry = reportMapRef.current.get(picked.id.id);
                if (entry) onReportClick(entry.mapReport, entry.appReport);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && picked.id?.id) {
                const entry = reportMapRef.current.get(picked.id.id);
                if (entry) {
                    onReportHover(entry.mapReport, {
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
    }, [viewer, onReportClick, onReportHover]);

    return null;
};

export default AppLayer;

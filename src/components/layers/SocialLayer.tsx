import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import type { MapReport } from "@/types/disaster";

interface SocialLayerProps {
    viewer: Cesium.Viewer | null;
    reports: MapReport[];
    visible: boolean;
    onReportClick: (report: MapReport) => void;
    onReportHover: (report: MapReport | null, position?: { x: number; y: number }) => void;
}

const severityColorMap: Record<string, string> = {
    High: "#e53e3e",
    Medium: "#ecc94b",
    Low: "#38a169",
};

const SocialLayer = ({
    viewer,
    reports,
    visible,
    onReportClick,
    onReportHover,
}: SocialLayerProps) => {
    const dataSourceRef = useRef<Cesium.CustomDataSource | null>(null);
    const reportMapRef = useRef<Map<string, MapReport>>(new Map());
    const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

    // Create/manage data source
    useEffect(() => {
        if (!viewer) return;

        const ds = new Cesium.CustomDataSource("social-layer");
        viewer.dataSources.add(ds);
        dataSourceRef.current = ds;

        return () => {
            if (!viewer.isDestroyed()) {
                viewer.dataSources.remove(ds, true);
            }
            dataSourceRef.current = null;
        };
    }, [viewer]);

    // Toggle visibility
    useEffect(() => {
        if (dataSourceRef.current) {
            dataSourceRef.current.show = visible;
        }
    }, [visible]);

    // Add entities
    useEffect(() => {
        const ds = dataSourceRef.current;
        if (!ds || !viewer) return;

        ds.entities.removeAll();
        reportMapRef.current.clear();

        const socialReports = reports.filter((r) => r.source !== "ivr");

        socialReports.forEach((report) => {
            const color = Cesium.Color.fromCssColorString(
                severityColorMap[report.severity] || "#38a169"
            );
            const size = report.severity === "High" ? 16 : report.severity === "Medium" ? 12 : 9;

            const entity = ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(report.longitude, report.latitude, 0),
                point: {
                    pixelSize: size,
                    color: color.withAlpha(0.9),
                    outlineColor: color.withAlpha(0.4),
                    outlineWidth: report.severity === "High" ? 5 : 3,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scaleByDistance: new Cesium.NearFarScalar(5000, 1.8, 5000000, 0.4),
                },
                id: `social-${report.id}`,
            });

            reportMapRef.current.set(`social-${report.id}`, report);

            // Pulsing ring for high severity
            if (report.severity === "High") {
                ds.entities.add({
                    position: Cesium.Cartesian3.fromDegrees(report.longitude, report.latitude),
                    ellipse: {
                        semiMinorAxis: 60000,
                        semiMajorAxis: 60000,
                        height: 0,
                        material: new Cesium.ColorMaterialProperty(
                            new Cesium.Color(color.red, color.green, color.blue, 0.12)
                        ),
                        outline: true,
                        outlineColor: new Cesium.Color(color.red, color.green, color.blue, 0.4),
                        outlineWidth: 2,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    },
                });
            }
        });
    }, [reports, viewer]);

    // Click & hover handlers
    useEffect(() => {
        if (!viewer) return;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current = handler;

        handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(click.position);
            if (Cesium.defined(picked) && picked.id?.id) {
                const report = reportMapRef.current.get(picked.id.id);
                if (report) onReportClick(report);
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(movement.endPosition);
            if (Cesium.defined(picked) && picked.id?.id) {
                const report = reportMapRef.current.get(picked.id.id);
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
    }, [viewer, onReportClick, onReportHover]);

    return null; // Renders directly onto the Cesium viewer
};

export default SocialLayer;

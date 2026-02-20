import { useEffect, useRef, useCallback } from "react";
import * as Cesium from "cesium";
import type {
    SatelliteEvent,
    FloodGeoJsonCollection,
    FloodGeoJsonFeature,
} from "@/types/disaster";

// ── Neon Colour Palette ────────────────────────────────────────────────
const NEON_RED = "#FF004D"; // new flood
const NEON_CYAN = "#00BFFF"; // existing water
const NEON_ORANGE = "#FF6F00"; // markers
const MARKER_PULSE_MIN = 0.3;
const MARKER_PULSE_MAX = 1.0;
const FLOOD_GLOW_MIN = 0.18;
const FLOOD_GLOW_MAX = 0.42;
const EXTRUDE_MAX_M = 500; // max height for 3-D blocks

const SATELLITE_API = "http://localhost:8001";

export interface TileInspectPayload {
    cemsId: string;
    tileId: string;
    feature: FloodGeoJsonFeature;
}

interface SatelliteLayerProps {
    viewer: Cesium.Viewer | null;
    events: SatelliteEvent[];
    geoJson: FloodGeoJsonCollection | null;
    selectedEventId: string | null;
    visible: boolean;
    enable3D?: boolean;
    onEventClick: (event: SatelliteEvent) => void;
    onTileInspect?: (payload: TileInspectPayload | null) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────

/** Smooth breathing pulse (0→1→0) */
function pulse(period = 2.0): number {
    return (Math.sin((Date.now() / 1000) * ((2 * Math.PI) / period)) + 1) / 2;
}

/** Linearly interpolate */
function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

// ── Component ──────────────────────────────────────────────────────────

const SatelliteLayer = ({
    viewer,
    events,
    geoJson,
    selectedEventId,
    visible,
    enable3D = false,
    onEventClick,
    onTileInspect,
}: SatelliteLayerProps) => {
    const markerDsRef = useRef<Cesium.CustomDataSource | null>(null);
    const polygonDsRef = useRef<Cesium.CustomDataSource | null>(null);
    const glowDsRef = useRef<Cesium.CustomDataSource | null>(null);
    const overlayLayersRef = useRef<Cesium.ImageryLayer[]>([]);
    const eventMapRef = useRef<Map<string, SatelliteEvent>>(new Map());
    const featureMapRef = useRef<
        Map<string, { cemsId: string; tileId: string; feature: FloodGeoJsonFeature }>
    >(new Map());
    const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
    const scanRevealRef = useRef(0); // 0 → 1 animated reveal progress

    // ── 1. Create data sources ─────────────────────────────────────────
    useEffect(() => {
        if (!viewer) return;

        const markerDs = new Cesium.CustomDataSource("satellite-markers");
        const polygonDs = new Cesium.CustomDataSource("satellite-polygons");
        const glowDs = new Cesium.CustomDataSource("satellite-glow");
        viewer.dataSources.add(markerDs);
        viewer.dataSources.add(polygonDs);
        viewer.dataSources.add(glowDs);
        markerDsRef.current = markerDs;
        polygonDsRef.current = polygonDs;
        glowDsRef.current = glowDs;

        // Kick-off animated scan-line reveal
        scanRevealRef.current = 0;
        const startTime = Date.now();
        const REVEAL_DURATION_MS = 2500;
        const revealTick = () => {
            const elapsed = Date.now() - startTime;
            scanRevealRef.current = Math.min(elapsed / REVEAL_DURATION_MS, 1);
        };
        const revealInterval = setInterval(revealTick, 30);

        return () => {
            clearInterval(revealInterval);
            if (!viewer.isDestroyed()) {
                viewer.dataSources.remove(markerDs, true);
                viewer.dataSources.remove(polygonDs, true);
                viewer.dataSources.remove(glowDs, true);
            }
            markerDsRef.current = null;
            polygonDsRef.current = null;
            glowDsRef.current = null;
        };
    }, [viewer]);

    // ── 2. Toggle visibility ───────────────────────────────────────────
    useEffect(() => {
        if (markerDsRef.current) markerDsRef.current.show = visible;
        if (polygonDsRef.current) polygonDsRef.current.show = visible;
        if (glowDsRef.current) glowDsRef.current.show = visible;
    }, [visible]);

    // ── 3. Neon-glow event markers with pulsing rings ──────────────────
    useEffect(() => {
        const ds = markerDsRef.current;
        if (!ds || !viewer) return;

        ds.entities.removeAll();
        eventMapRef.current.clear();

        events.forEach((event) => {
            const isSelected = event.cems_id === selectedEventId;

            // Core marker dot
            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(event.longitude, event.latitude, 0),
                point: {
                    pixelSize: isSelected ? 18 : 14,
                    color: new Cesium.CallbackProperty(() => {
                        const a = lerp(MARKER_PULSE_MIN, MARKER_PULSE_MAX, pulse(2.0));
                        return Cesium.Color.fromCssColorString(NEON_ORANGE).withAlpha(a);
                    }, false) as any,
                    outlineColor: Cesium.Color.fromCssColorString(NEON_ORANGE).withAlpha(0.4),
                    outlineWidth: isSelected ? 7 : 5,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    scaleByDistance: new Cesium.NearFarScalar(5000, 1.8, 5000000, 0.4),
                },
                id: `sat-${event.cems_id}`,
            });

            eventMapRef.current.set(`sat-${event.cems_id}`, event);

            // Pulsing glow ring — static radius to avoid Cesium's
            // semiMajorAxis >= semiMinorAxis race; animate color only.
            const radius = isSelected ? 120000 : 80000;

            ds.entities.add({
                position: Cesium.Cartesian3.fromDegrees(event.longitude, event.latitude),
                ellipse: {
                    semiMinorAxis: radius,
                    semiMajorAxis: radius,
                    height: 0,
                    material: new Cesium.ColorMaterialProperty(
                        new Cesium.CallbackProperty(() => {
                            const a = isSelected
                                ? lerp(0.08, 0.2, pulse(2.5))
                                : lerp(0.03, 0.1, pulse(3.0));
                            return new Cesium.Color(1.0, 0.44, 0.0, a);
                        }, false) as any
                    ),
                    outline: true,
                    outlineColor: new Cesium.CallbackProperty(() => {
                        const a = isSelected
                            ? lerp(0.3, 0.7, pulse(2.5))
                            : lerp(0.1, 0.35, pulse(3.0));
                        return new Cesium.Color(1.0, 0.44, 0.0, a);
                    }, false) as any,
                    outlineWidth: isSelected ? 3 : 1,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
                id: `sat-ring-${event.cems_id}`,
            });
        });
    }, [events, viewer, selectedEventId]);

    // ── 4. Neon-glow flood polygons (with optional 3D extrusion) ───────
    useEffect(() => {
        const ds = polygonDsRef.current;
        if (!ds || !viewer || !geoJson) return;

        ds.entities.removeAll();
        featureMapRef.current.clear();

        geoJson.features.forEach((feature, idx) => {
            const isNewFlood =
                feature.properties.class === "new_flood" ||
                feature.properties.class === "flood_new";

            // Neon colours
            const cssColor = isNewFlood ? NEON_RED : NEON_CYAN;
            const baseColor = Cesium.Color.fromCssColorString(cssColor);

            // Pulsing fill material
            const fillMaterial = new Cesium.ColorMaterialProperty(
                new Cesium.CallbackProperty(() => {
                    const t = pulse(isNewFlood ? 2.0 : 3.0);
                    // Scan-line reveal fade-in
                    const reveal = Math.min(scanRevealRef.current * 1.5, 1.0);
                    const a = lerp(FLOOD_GLOW_MIN, FLOOD_GLOW_MAX, t) * reveal;
                    return baseColor.withAlpha(a);
                }, false) as any
            );

            // Pulsing outline
            const outlineColorProp = new Cesium.CallbackProperty(() => {
                const t = pulse(isNewFlood ? 2.0 : 3.0);
                const a = lerp(0.5, 0.95, t) * Math.min(scanRevealRef.current * 2, 1.0);
                return baseColor.withAlpha(a);
            }, false) as any;

            // 3D extrusion height (proportional to percent_increase)
            const pctIncrease = feature.properties.percent_increase ?? 0;
            const extrudeHeight = enable3D
                ? Math.min(pctIncrease * 5, EXTRUDE_MAX_M)
                : 0;

            try {
                let rings: number[][][] = [];

                if (feature.geometry.type === "Polygon") {
                    rings = feature.geometry.coordinates as number[][][];
                } else if (feature.geometry.type === "MultiPolygon") {
                    const multi = feature.geometry.coordinates as number[][][][];
                    multi.forEach((polygon) => {
                        rings = rings.concat(polygon);
                    });
                }

                rings.forEach((ring, ringIdx) => {
                    const positions = ring.map(([lng, lat]) =>
                        Cesium.Cartesian3.fromDegrees(lng, lat, 0)
                    );

                    const entityId = `flood-${idx}-${ringIdx}`;

                    if (enable3D && extrudeHeight > 0) {
                        // 3D extruded block
                        ds.entities.add({
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: fillMaterial,
                                outline: true,
                                outlineColor: outlineColorProp,
                                outlineWidth: 2,
                                height: 0,
                                extrudedHeight: extrudeHeight,
                                closeTop: true,
                                closeBottom: true,
                            },
                            id: entityId,
                        });
                    } else {
                        // Flat polygon clamped to ground
                        ds.entities.add({
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(positions),
                                material: fillMaterial,
                                outline: true,
                                outlineColor: outlineColorProp,
                                outlineWidth: 2,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            },
                            id: entityId,
                        });
                    }

                    // Store feature reference for click-to-inspect
                    const tileId = (feature.properties as any).tile ?? `tile-${idx}`;
                    featureMapRef.current.set(entityId, {
                        cemsId: selectedEventId ?? "",
                        tileId,
                        feature,
                    });
                });
            } catch (e) {
                console.warn("Failed to parse GeoJSON feature:", e);
            }
        });
    }, [geoJson, viewer, enable3D, selectedEventId]);

    // ── 5. Neon glow polyline outlines (PolylineGlowMaterialProperty) ──
    useEffect(() => {
        const ds = glowDsRef.current;
        if (!ds || !viewer || !geoJson) return;

        ds.entities.removeAll();

        geoJson.features.forEach((feature, idx) => {
            const isNewFlood =
                feature.properties.class === "new_flood" ||
                feature.properties.class === "flood_new";
            const cssColor = isNewFlood ? NEON_RED : NEON_CYAN;
            const baseColor = Cesium.Color.fromCssColorString(cssColor);

            try {
                let rings: number[][][] = [];

                if (feature.geometry.type === "Polygon") {
                    rings = feature.geometry.coordinates as number[][][];
                } else if (feature.geometry.type === "MultiPolygon") {
                    const multi = feature.geometry.coordinates as number[][][][];
                    multi.forEach((polygon) => {
                        rings = rings.concat(polygon);
                    });
                }

                rings.forEach((ring, ringIdx) => {
                    const positions = ring.map(([lng, lat]) =>
                        Cesium.Cartesian3.fromDegrees(lng, lat, 0)
                    );

                    // Neon glow polyline border
                    ds.entities.add({
                        polyline: {
                            positions,
                            width: 6,
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.3,
                                taperPower: 0.7,
                                color: new Cesium.CallbackProperty(() => {
                                    const t = pulse(isNewFlood ? 2.0 : 3.0);
                                    return baseColor.withAlpha(lerp(0.4, 0.9, t));
                                }, false) as any,
                            }),
                            clampToGround: true,
                        },
                        id: `glow-${idx}-${ringIdx}`,
                    });
                });
            } catch {
                /* skip broken geometry */
            }
        });
    }, [geoJson, viewer]);

    // ── 5b. Drape change-overlay imagery onto the globe ────────────────
    useEffect(() => {
        if (!viewer) return;

        // Remove previous overlay layers
        overlayLayersRef.current.forEach((layer) => {
            if (!viewer.isDestroyed()) {
                viewer.imageryLayers.remove(layer, true);
            }
        });
        overlayLayersRef.current = [];

        if (!selectedEventId || !visible) return;

        // Fetch event detail to get tile IDs + bounds, then drape
        let cancelled = false;

        fetch(`${SATELLITE_API}/api/events/${selectedEventId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then(async (detail) => {
                if (cancelled || !detail) return;

                const tiles: { tile: string; bounds: number[] | null }[] =
                    detail.tiles ?? [];

                for (const t of tiles) {
                    if (cancelled || !t.bounds || viewer.isDestroyed()) break;

                    const [west, south, east, north] = t.bounds;
                    const overlayUrl = `${SATELLITE_API}/api/events/${selectedEventId}/tiles/${t.tile}/change_overlay`;

                    try {
                        const provider = new Cesium.SingleTileImageryProvider({
                            url: overlayUrl,
                            rectangle: Cesium.Rectangle.fromDegrees(
                                west,
                                south,
                                east,
                                north
                            ),
                        });

                        const layer = viewer.imageryLayers.addImageryProvider(provider);
                        layer.alpha = 0.72;
                        layer.brightness = 1.3;
                        layer.contrast = 1.2;
                        layer.show = visible;
                        overlayLayersRef.current.push(layer);
                    } catch (e) {
                        console.warn(`Failed to drape overlay for ${t.tile}:`, e);
                    }
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [selectedEventId, viewer, visible]);

    // ── 6. Click handler (markers + flood polygons for inspect) ────────
    useEffect(() => {
        if (!viewer) return;

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current = handler;

        handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
            const picked = viewer.scene.pick(click.position);

            if (Cesium.defined(picked) && picked.id?.id) {
                const id = picked.id.id as string;

                // Check if it's a satellite event marker
                const event = eventMapRef.current.get(id);
                if (event) {
                    onEventClick(event);
                    return;
                }

                // Check if it's a flood polygon → tile inspect
                const featureRef = featureMapRef.current.get(id);
                if (featureRef && onTileInspect) {
                    onTileInspect({
                        cemsId: featureRef.cemsId,
                        tileId: featureRef.tileId,
                        feature: featureRef.feature,
                    });
                    return;
                }
            }

            // Clicked empty space → dismiss
            if (onTileInspect) onTileInspect(null);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        return () => {
            handler.destroy();
            handlerRef.current = null;
        };
    }, [viewer, onEventClick, onTileInspect]);

    return null;
};

export default SatelliteLayer;

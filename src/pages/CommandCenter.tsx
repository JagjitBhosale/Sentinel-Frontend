import { useState, useCallback, useRef, useEffect } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import {
    ChevronLeft,
    ChevronRight,
    X,
    Radio,
    Rss,
    Satellite,
    Wifi,
    WifiOff,
    RotateCw,
    Sun,
    Moon,
    Layers,
} from "lucide-react";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import GlassCard from "@/components/ui/GlassCard";
import GlobeTooltip from "@/components/ui/GlobeTooltip";
import { showDisasterToast } from "@/components/ui/SentinelToast";
import ReportDetailPanel from "@/components/ui/ReportDetailPanel";
import SocialLayer from "@/components/layers/SocialLayer";
import IVRLayer from "@/components/layers/IVRLayer";
import SatelliteLayer from "@/components/layers/SatelliteLayer";
import type { TileInspectPayload } from "@/components/layers/SatelliteLayer";
import FloodInspectorPanel from "@/components/ui/FloodInspectorPanel";
import {
    useMapReports,
    useDashboardStats,
    useSatelliteEvents,
    useEventGeoJson,
} from "@/hooks/useDisasterData";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { MapReport, SatelliteEvent, IVRReport, AppReport } from "@/types/disaster";
import { onIVRReports, onAppReports } from "@/services/firebase";

const CESIUM_ION_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZmE4MTBlOS1hYmM4LTRhMjYtYjRiNi04ZWU5YzBhZWQ4ODMiLCJpZCI6MzkwNTc5LCJpYXQiOjE3NzEzNDEzMzJ9.F11dYp0f58t04viROuW5_fl9hOzydQ0wEb_Cily3KVU";

const CommandCenter = () => {
    const globeContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);
    const rotateRef = useRef<number | null>(null);
    const rotatingRef = useRef(true);
    const [rotating, setRotating] = useState(true);
    const [dayNight, setDayNight] = useState(true);
    const [firebaseIVR, setFirebaseIVR] = useState<IVRReport[]>([]);
    const [firebaseApp, setFirebaseApp] = useState<AppReport[]>([]);

    // Layer visibility state
    const [layers, setLayers] = useState({
        social: true,
        ivr: true,
        satellite: true,
    });

    // UI state
    const [feedOpen, setFeedOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
    const [selectedAppReport, setSelectedAppReport] = useState<AppReport | null>(null);
    const [selectedIVRDoc, setSelectedIVRDoc] = useState<IVRReport | null>(null);
    const [hoveredReport, setHoveredReport] = useState<MapReport | null>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
    const [selectedSatEvent, setSelectedSatEvent] = useState<SatelliteEvent | null>(null);
    const [selectedSatId, setSelectedSatId] = useState<string | null>(null);
    const [tileInspect, setTileInspect] = useState<TileInspectPayload | null>(null);
    const [enable3D, setEnable3D] = useState(false);

    // Data hooks
    const { data: reports = [] } = useMapReports();
    const { data: stats } = useDashboardStats();
    const { data: satEvents = [] } = useSatelliteEvents();
    const { data: geoJson = null } = useEventGeoJson(selectedSatId);
    const { posts, latestDisaster, connected } = useWebSocket();

    // Firebase IVR real-time listener
    useEffect(() => {
        const unsub = onIVRReports((docs) => {
            setFirebaseIVR(docs as IVRReport[]);
        });
        return unsub;
    }, []);

    // Firebase App reports real-time listener
    useEffect(() => {
        const unsub = onAppReports((docs) => {
            setFirebaseApp(docs as AppReport[]);
        });
        return unsub;
    }, []);

    // Show toast on new disaster
    const prevDisasterRef = useRef<string | null>(null);
    useEffect(() => {
        if (latestDisaster && latestDisaster.id !== prevDisasterRef.current) {
            prevDisasterRef.current = latestDisaster.id;
            showDisasterToast(latestDisaster);
        }
    }, [latestDisaster]);

    // Initialize Cesium viewer
    useEffect(() => {
        if (!globeContainerRef.current || viewerRef.current) return;

        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        const viewer = new Cesium.Viewer(globeContainerRef.current, {
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            navigationHelpButton: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            animation: false,
            fullscreenButton: false,
            vrButton: false,
            creditContainer: document.createElement("div"),
            requestRenderMode: false,
            maximumRenderTimeChange: Infinity,
        });

        Cesium.IonImageryProvider.fromAssetId(2, { accessToken: CESIUM_ION_TOKEN })
            .then((ip) => {
                if (!viewer.isDestroyed()) {
                    viewer.imageryLayers.removeAll();
                    viewer.imageryLayers.addImageryProvider(ip);
                }
            })
            .catch(console.error);

        Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
            accessToken: CESIUM_ION_TOKEN,
            requestWaterMask: true,
            requestVertexNormals: true,
        } as any).then((terrain) => {
            if (!viewer.isDestroyed()) viewer.terrainProvider = terrain;
        });

        const scene = viewer.scene;
        const globe = scene.globe;

        // Enhanced visual quality
        globe.maximumScreenSpaceError = 1.5;
        scene.highDynamicRange = false;
        globe.enableLighting = true;
        (viewer as any).resolutionScale = Math.min(window.devicePixelRatio, 2);
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = true;
        scene.fog.density = 0.0002;
        globe.showGroundAtmosphere = true;
        scene.backgroundColor = Cesium.Color.BLACK;
        scene.sun.show = true;
        scene.moon.show = true;
        scene.skyBox.show = true;

        scene.screenSpaceCameraController.minimumZoomDistance = 500;
        scene.screenSpaceCameraController.maximumZoomDistance = 30000000;
        scene.screenSpaceCameraController.enableTilt = true;
        scene.screenSpaceCameraController.inertiaSpin = 0.9;
        scene.screenSpaceCameraController.inertiaTranslate = 0.9;
        scene.screenSpaceCameraController.inertiaZoom = 0.8;

        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(78, 20, 15000000),
        });

        viewerRef.current = viewer;

        // Subtle auto-rotation (respects rotatingRef toggle)
        const rotFn = () => {
            if (!viewer.isDestroyed()) {
                if (rotatingRef.current) {
                    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00015);
                }
                rotateRef.current = requestAnimationFrame(rotFn);
            }
        };
        rotateRef.current = requestAnimationFrame(rotFn);

        return () => {
            if (rotateRef.current) cancelAnimationFrame(rotateRef.current);
            viewer.destroy();
            viewerRef.current = null;
        };
    }, []);

    // Fly to satellite event
    useEffect(() => {
        if (!selectedSatEvent || !viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
                selectedSatEvent.longitude,
                selectedSatEvent.latitude,
                800000
            ),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-45),
                roll: 0,
            },
            duration: 2.0,
        });
    }, [selectedSatEvent]);

    // Fly to report
    const handleReportClick = useCallback((report: MapReport) => {
        setSelectedReport(report);
        setSelectedAppReport(null);
        setHoveredReport(null);

        // Find the matching IVR doc if source is ivr
        if (report.source === "ivr") {
            const match = firebaseIVR.find((d) => d.id === report.id);
            setSelectedIVRDoc(match || null);
        } else {
            setSelectedIVRDoc(null);
        }

        if (viewerRef.current) {
            viewerRef.current.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    report.longitude,
                    report.latitude,
                    500000
                ),
                duration: 1.5,
            });
        }
    }, [firebaseIVR]);

    // Fly to app report
    const handleAppReportClick = useCallback((mapReport: MapReport, appReport: AppReport) => {
        setSelectedReport(mapReport);
        setSelectedAppReport(appReport);
        setSelectedIVRDoc(null);
        setHoveredReport(null);
        if (viewerRef.current) {
            viewerRef.current.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    mapReport.longitude,
                    mapReport.latitude,
                    500000
                ),
                duration: 1.5,
            });
        }
    }, []);

    const handleReportHover = useCallback(
        (report: MapReport | null, position?: { x: number; y: number }) => {
            setHoveredReport(report);
            if (position) setHoverPos(position);
        },
        []
    );

    const handleSatEventClick = useCallback((event: SatelliteEvent) => {
        setSelectedSatEvent(event);
        setSelectedSatId(event.cems_id);
    }, []);

    const toggleLayer = (layer: keyof typeof layers) => {
        setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
    };

    const toggleRotation = () => {
        rotatingRef.current = !rotatingRef.current;
        setRotating(rotatingRef.current);
    };

    const toggleDayNight = () => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;
        const next = !dayNight;
        setDayNight(next);
        viewer.scene.globe.enableLighting = next;
        viewer.scene.sun.show = next;
        viewer.scene.moon.show = next;
    };

    return (
        <div className="fixed inset-0 bg-[#050816] overflow-hidden">
            {/* ── Cesium Globe ── */}
            <div
                ref={globeContainerRef}
                className="absolute inset-0 z-0"
                style={{ background: "#050816" }}
            />

            {/* ── Layers (headless, render onto viewer) ── */}
            <SocialLayer
                viewer={viewerRef.current}
                reports={reports}
                visible={layers.social}
                onReportClick={handleReportClick}
                onReportHover={handleReportHover}
            />
            <IVRLayer
                viewer={viewerRef.current}
                firebaseReports={firebaseIVR}
                appReports={firebaseApp}
                reports={reports}
                visible={layers.ivr}
                onReportClick={handleReportClick}
                onAppReportClick={handleAppReportClick}
                onReportHover={handleReportHover}
            />
            <SatelliteLayer
                viewer={viewerRef.current}
                events={satEvents}
                geoJson={geoJson}
                selectedEventId={selectedSatId}
                visible={layers.satellite}
                enable3D={enable3D}
                onEventClick={handleSatEventClick}
                onTileInspect={setTileInspect}
            />

            {/* ── Top-left Status Badge ── */}
            <div className="fixed top-[68px] left-4 z-30">
                <div className="glass rounded-xl px-3 py-1.5">
                    <div className="flex items-center gap-2">
                        {connected ? (
                            <Wifi className="w-3 h-3 text-green-400" />
                        ) : (
                            <WifiOff className="w-3 h-3 text-red-400" />
                        )}
                        <p className="text-[9px] text-white/40 font-mono">
                            {reports.length} REPORTS • {satEvents.length} SAT EVENTS •{" "}
                            {connected ? "LIVE" : "OFFLINE"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Vertical Metrics Panel (right side) ── */}
            <MetricsPanel
                stats={stats}
                reportCount={reports.length}
                satEventCount={satEvents.length}
                socialCount={reports.filter((r) => r.source !== "ivr").length}
            />

            {/* ── Layer Filter Panel (top-left, below status badge) ── */}
            <div className="fixed top-[108px] left-4 z-30">
                <GlassCard variant="strong" className="p-4 w-[260px]">
                    <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mb-3">
                        Intelligence Layers
                    </h3>
                    <div className="space-y-2">
                        {[
                            {
                                key: "social" as const,
                                label: "Social Media Feed Scraper",
                                color: "bg-red-500",
                                icon: <Rss className="w-3.5 h-3.5" />,
                            },
                            {
                                key: "ivr" as const,
                                label: "IVR, GPS & App Reports",
                                color: "bg-blue-500",
                                icon: <Radio className="w-3.5 h-3.5" />,
                            },
                            {
                                key: "satellite" as const,
                                label: "Satellite Image Change Detection",
                                color: "bg-orange-500",
                                icon: <Satellite className="w-3.5 h-3.5" />,
                            },
                        ].map((l) => (
                            <button
                                key={l.key}
                                onClick={() => toggleLayer(l.key)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${layers[l.key]
                                        ? "bg-white/8 border border-white/15 text-white/90"
                                        : "bg-white/3 border border-white/5 text-white/35"
                                    }`}
                            >
                                <span
                                    className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-all ${layers[l.key]
                                            ? "border-white/60 bg-white/20"
                                            : "border-white/20"
                                        }`}
                                >
                                    {layers[l.key] && (
                                        <span className="w-1.5 h-1.5 rounded-[1px] bg-white" />
                                    )}
                                </span>
                                <span className="text-white/50">{l.icon}</span>
                                <span className="flex-1 text-left font-mono">{l.label}</span>
                                <span
                                    className={`w-2 h-2 rounded-full ${l.color} ${layers[l.key] ? "opacity-100" : "opacity-20"
                                        } transition-opacity`}
                                />
                            </button>
                        ))}
                    </div>

                    {/* ── Globe Rotation Toggle ── */}
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        {/* 3D Flood Blocks Toggle */}
                        <button
                            onClick={() => setEnable3D((prev) => !prev)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${
                                enable3D
                                    ? "bg-white/8 border border-white/15 text-white/90"
                                    : "bg-white/3 border border-white/5 text-white/35"
                            }`}
                        >
                            <span
                                className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-all ${
                                    enable3D
                                        ? "border-white/60 bg-white/20"
                                        : "border-white/20"
                                }`}
                            >
                                {enable3D && (
                                    <span className="w-1.5 h-1.5 rounded-[1px] bg-white" />
                                )}
                            </span>
                            <span className="text-white/50">
                                <Layers className="w-3.5 h-3.5" />
                            </span>
                            <span className="flex-1 text-left font-mono">3D Flood Blocks</span>
                            <span
                                className={`w-2 h-2 rounded-full bg-pink-500 ${
                                    enable3D ? "opacity-100" : "opacity-20"
                                } transition-opacity`}
                            />
                        </button>

                        <button
                            onClick={toggleRotation}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 ${
                                rotating
                                    ? "bg-white/8 border border-white/15 text-white/90"
                                    : "bg-white/3 border border-white/5 text-white/35"
                            }`}
                        >
                            <span
                                className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-all ${
                                    rotating
                                        ? "border-white/60 bg-white/20"
                                        : "border-white/20"
                                }`}
                            >
                                {rotating && (
                                    <span className="w-1.5 h-1.5 rounded-[1px] bg-white" />
                                )}
                            </span>
                            <span className="text-white/50">
                                <RotateCw className={`w-3.5 h-3.5 ${rotating ? "animate-spin" : ""}`} style={rotating ? { animationDuration: "3s" } : undefined} />
                            </span>
                            <span className="flex-1 text-left font-mono">Globe Auto-Rotation</span>
                            <span
                                className={`w-2 h-2 rounded-full bg-emerald-500 ${
                                    rotating ? "opacity-100" : "opacity-20"
                                } transition-opacity`}
                            />
                        </button>

                        {/* ── Day / Night Lighting Toggle ── */}
                        <button
                            onClick={toggleDayNight}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all duration-200 mt-2 ${
                                dayNight
                                    ? "bg-white/8 border border-white/15 text-white/90"
                                    : "bg-white/3 border border-white/5 text-white/35"
                            }`}
                        >
                            <span
                                className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center transition-all ${
                                    dayNight
                                        ? "border-white/60 bg-white/20"
                                        : "border-white/20"
                                }`}
                            >
                                {dayNight && (
                                    <span className="w-1.5 h-1.5 rounded-[1px] bg-white" />
                                )}
                            </span>
                            <span className="text-white/50">
                                {dayNight ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                            </span>
                            <span className="flex-1 text-left font-mono">Day / Night Lighting</span>
                            <span
                                className={`w-2 h-2 rounded-full bg-amber-400 ${
                                    dayNight ? "opacity-100" : "opacity-20"
                                } transition-opacity`}
                            />
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* ── Hover Tooltip ── */}
            {hoveredReport && !selectedReport && (
                <GlobeTooltip report={hoveredReport} position={hoverPos} />
            )}

            {/* ── Selected Report Detail Panel ── */}
            <ReportDetailPanel
                report={selectedReport}
                appReport={selectedAppReport}
                ivrDoc={selectedIVRDoc}
                onClose={() => {
                    setSelectedReport(null);
                    setSelectedAppReport(null);
                    setSelectedIVRDoc(null);
                }}
            />

            {/* ── Satellite Detail Panel ── */}
            {selectedSatEvent && (
                <div className="fixed top-20 right-4 z-40 w-[350px] animate-slide-in-right">
                    <GlassCard variant="strong" className="overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <Satellite className="w-4 h-4 text-orange-400" />
                                <span className="text-xs font-mono text-white/70 uppercase tracking-wider">
                                    Satellite Event
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedSatEvent(null);
                                    setSelectedSatId(null);
                                }}
                                className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <h3 className="font-semibold text-white text-sm">
                                {selectedSatEvent.title}
                            </h3>
                            <p className="text-xs text-white/50 leading-relaxed">
                                {selectedSatEvent.description}
                            </p>

                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/35">Country</span>
                                    <p className="text-white/90 mt-0.5">{selectedSatEvent.country}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/35">Status</span>
                                    <p className="text-orange-400 mt-0.5">{selectedSatEvent.status}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/35">Type</span>
                                    <p className="text-white/90 mt-0.5">{selectedSatEvent.event_type}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/35">CEMS ID</span>
                                    <p className="text-white/90 mt-0.5">{selectedSatEvent.cems_id}</p>
                                </div>
                            </div>

                            {/* Flood polygon legend */}
                            {geoJson && geoJson.features.length > 0 && (
                                <div className="border-t border-white/10 pt-3 space-y-2">
                                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                                        Flood Analysis
                                    </span>
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm border" style={{ background: "#00BFFF80", borderColor: "#00BFFF99", boxShadow: "0 0 6px #00BFFF40" }} />
                                            <span className="text-white/60">Existing Water</span>
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-sm border" style={{ background: "#FF004D80", borderColor: "#FF004D99", boxShadow: "0 0 6px #FF004D40" }} />
                                            <span className="text-white/60">New Flood</span>
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                        {(() => {
                                            const newFloodFeatures = geoJson.features.filter(
                                                (f) =>
                                                    f.properties.class === "new_flood" ||
                                                    f.properties.class === "flood_new"
                                            );
                                            const totalArea = newFloodFeatures.reduce(
                                                (sum, f) => sum + (f.properties.area_km2 ?? 0),
                                                0
                                            );
                                            const avgIncrease =
                                                newFloodFeatures.length > 0
                                                    ? newFloodFeatures.reduce(
                                                        (sum, f) =>
                                                            sum + (f.properties.percent_increase ?? 0),
                                                        0
                                                    ) / newFloodFeatures.length
                                                    : 0;

                                            return (
                                                <>
                                                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                                                        <span className="text-red-400/60">Area Impact</span>
                                                        <p className="text-red-400 mt-0.5">
                                                            {totalArea.toFixed(2)} km²
                                                        </p>
                                                    </div>
                                                    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                                                        <span className="text-red-400/60">% Increase</span>
                                                        <p className="text-red-400 mt-0.5">
                                                            {avgIncrease.toFixed(1)}%
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}

            {/* ── Flood Inspector Panel (click-to-inspect) ── */}
            <FloodInspectorPanel
                payload={tileInspect}
                onClose={() => setTileInspect(null)}
            />

            {/* ── Live Feed Panel Toggle ── */}
            <button
                onClick={() => setFeedOpen(!feedOpen)}
                className="fixed bottom-4 right-4 z-50 glass rounded-lg p-2.5 hover:bg-white/10 transition-colors"
            >
                {feedOpen ? (
                    <ChevronRight className="w-5 h-5 text-white/70" />
                ) : (
                    <ChevronLeft className="w-5 h-5 text-white/70" />
                )}
            </button>

            {/* ── Live Feed Panel ── */}
            <div
                className={`fixed top-0 right-0 h-full w-80 z-40 glass-strong transition-transform duration-300 ease-out ${feedOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
                            <h3 className="text-xs font-mono text-white/60 uppercase tracking-[0.15em]">
                                Live Intelligence Feed
                            </h3>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {posts.length === 0 && (
                            <p className="text-xs text-white/30 text-center py-8 font-mono">
                                Waiting for incoming data...
                            </p>
                        )}
                        {posts.map((post, idx) => (
                            <div
                                key={post.id || idx}
                                className={`p-3 rounded-lg border transition-all duration-200 ${post.is_disaster
                                        ? "bg-red-500/5 border-red-500/15"
                                        : "bg-white/3 border-white/5"
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${post.is_disaster ? "bg-red-400" : "bg-white/30"
                                            }`}
                                    />
                                    <span className="text-[10px] font-mono text-white/40">
                                        {post.disaster_type || "Non-Disaster"} •{" "}
                                        {new Date(post.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
                                    {post.text}
                                </p>
                                {post.confidence !== undefined && (
                                    <div className="mt-1.5 flex items-center gap-2">
                                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                                                style={{ width: `${(post.confidence ?? 0) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-white/30">
                                            {((post.confidence ?? 0) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandCenter;

import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import GlassCard from "@/components/ui/GlassCard";
import {
    Satellite,
    Radio,
    Brain,
    ChevronDown,
    Shield,
    ArrowRight,
} from "lucide-react";

const CESIUM_ION_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZmE4MTBlOS1hYmM4LTRhMjYtYjRiNi04ZWU5YzBhZWQ4ODMiLCJpZCI6MzkwNTc5LCJpYXQiOjE3NzEzNDEzMzJ9.F11dYp0f58t04viROuW5_fl9hOzydQ0wEb_Cily3KVU";

const featureCards = [
    {
        icon: <Brain className="w-8 h-8 text-red-400" />,
        title: "Social Media Intelligence",
        items: [
            "NLP classification",
            "Credibility scoring",
            "Urgency detection",
        ],
        gradient: "from-red-500/20 to-transparent",
    },
    {
        icon: <Radio className="w-8 h-8 text-blue-400" />,
        title: "IVR & GPS Reporting",
        items: [
            "Citizen reporting",
            "Live location tagging",
            "Audio transcription",
        ],
        gradient: "from-blue-500/20 to-transparent",
    },
    {
        icon: <Satellite className="w-8 h-8 text-orange-400" />,
        title: "Satellite Change Detection",
        items: [
            "Before vs During imagery",
            "Flood polygon detection",
            "Area impact calculation",
        ],
        gradient: "from-orange-500/20 to-transparent",
    },
];

const Admin = () => {
    const navigate = useNavigate();
    const globeContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);
    const rotationRef = useRef<number | null>(null);

    const section2Ref = useRef<HTMLDivElement>(null);
    const section3Ref = useRef<HTMLDivElement>(null);
    const isSection2InView = useInView(section2Ref, { once: false, margin: "-20%" });
    const isSection3InView = useInView(section3Ref, { once: true, margin: "-10%" });

    const [hasFlownToIndia, setHasFlownToIndia] = useState(false);

    // Initialize Cesium
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

        Cesium.IonImageryProvider.fromAssetId(2, {
            accessToken: CESIUM_ION_TOKEN,
        }).then((imageryProvider) => {
            if (!viewer.isDestroyed()) {
                viewer.imageryLayers.removeAll();
                viewer.imageryLayers.addImageryProvider(imageryProvider);
            }
        }).catch(console.error);

        Cesium.CesiumTerrainProvider.fromIonAssetId(1, {
            accessToken: CESIUM_ION_TOKEN,
            requestWaterMask: true,
            requestVertexNormals: true,
        } as any).then((terrain) => {
            if (!viewer.isDestroyed()) viewer.terrainProvider = terrain;
        });

        const scene = viewer.scene;
        const globe = scene.globe;

        globe.maximumScreenSpaceError = 1.5;
        scene.highDynamicRange = false;
        globe.enableLighting = true;
        (viewer as any).resolutionScale = Math.min(window.devicePixelRatio, 2);
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = true;
        scene.fog.density = 0.0003;
        globe.showGroundAtmosphere = true;
        scene.backgroundColor = Cesium.Color.BLACK;
        scene.sun.show = true;
        scene.moon.show = true;
        scene.skyBox.show = true;

        scene.screenSpaceCameraController.enableTilt = true;
        scene.screenSpaceCameraController.enableZoom = false;
        scene.screenSpaceCameraController.enableRotate = false;
        scene.screenSpaceCameraController.enableTranslate = false;
        scene.screenSpaceCameraController.enableLook = false;

        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(78, 15, 22000000),
        });

        viewerRef.current = viewer;

        // Auto-rotation
        const rotate = () => {
            if (!viewer.isDestroyed()) {
                viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.0002);
                rotationRef.current = requestAnimationFrame(rotate);
            }
        };
        rotationRef.current = requestAnimationFrame(rotate);

        return () => {
            if (rotationRef.current) cancelAnimationFrame(rotationRef.current);
            viewer.destroy();
            viewerRef.current = null;
        };
    }, []);

    // Fly to India when Section 2 is in view
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || !isSection2InView || hasFlownToIndia) return;

        setHasFlownToIndia(true);

        // Stop rotation momentarily
        if (rotationRef.current) {
            cancelAnimationFrame(rotationRef.current);
            rotationRef.current = null;
        }

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(78.9, 22.5, 5000000),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-35),
                roll: 0,
            },
            duration: 3.0,
            complete: () => {
                // Add animated markers
                const locations = [
                    { lng: 72.87, lat: 19.07, type: "social", delay: 0 },
                    { lng: 77.59, lat: 12.97, type: "social", delay: 300 },
                    { lng: 80.27, lat: 13.08, type: "ivr", delay: 600 },
                    { lng: 88.36, lat: 22.57, type: "social", delay: 900 },
                    { lng: 73.85, lat: 18.52, type: "ivr", delay: 1200 },
                    { lng: 83.0, lat: 25.32, type: "satellite", delay: 1500 },
                    { lng: 85.14, lat: 25.61, type: "satellite", delay: 1800 },
                ];

                locations.forEach(({ lng, lat, type, delay }) => {
                    setTimeout(() => {
                        if (viewer.isDestroyed()) return;
                        const color =
                            type === "social"
                                ? Cesium.Color.fromCssColorString("#e53e3e")
                                : type === "ivr"
                                    ? Cesium.Color.fromCssColorString("#2196F3")
                                    : Cesium.Color.fromCssColorString("#FF6F00");

                        viewer.entities.add({
                            position: Cesium.Cartesian3.fromDegrees(lng, lat, 0),
                            point: {
                                pixelSize: 10,
                                color: color.withAlpha(0.9),
                                outlineColor: color.withAlpha(0.4),
                                outlineWidth: 4,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                            },
                        });

                        viewer.entities.add({
                            position: Cesium.Cartesian3.fromDegrees(lng, lat),
                            ellipse: {
                                semiMinorAxis: 40000,
                                semiMajorAxis: 40000,
                                height: 0,
                                material: new Cesium.ColorMaterialProperty(
                                    new Cesium.Color(color.red, color.green, color.blue, 0.08)
                                ),
                                outline: true,
                                outlineColor: new Cesium.Color(
                                    color.red,
                                    color.green,
                                    color.blue,
                                    0.25
                                ),
                                outlineWidth: 1,
                                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                            },
                        });
                    }, delay);
                });
            },
        });
    }, [isSection2InView, hasFlownToIndia]);

    return (
        <div className="relative w-full bg-[#050816] text-white overflow-x-hidden">
            {/* ── Fixed Cesium globe behind everything ── */}
            <div
                ref={globeContainerRef}
                className="fixed inset-0 z-0"
                style={{ background: "#050816" }}
            />

            {/* ── Gradient overlays for readability ── */}
            <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#050816]/70 via-transparent to-[#050816]/90" />

            {/* ━━━ SECTION 1: Hero ━━━ */}
            <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8"
                    >
                        <Shield className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-mono tracking-[0.2em] text-white/70 uppercase">
                            Government-Grade Intelligence
                        </span>
                    </motion.div>

                    {/* Title */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[0.95]">
                        <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
                            Sentinel
                        </span>
                        <br />
                        <span className="text-2xl md:text-3xl lg:text-4xl font-medium text-white/50 tracking-wide block mt-3">
                            Real-Time Disaster Intelligence
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.8 }}
                        className="text-sm md:text-base text-white/40 font-mono tracking-wide max-w-2xl mx-auto mb-10"
                    >
                        AI-powered Social Media Analysis &bull; IVR Reporting &bull;
                        Satellite Change Detection
                    </motion.p>

                    {/* CTA */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate("/command-center")}
                        className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold tracking-wide shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transition-all duration-300"
                    >
                        <span className="flex items-center gap-3">
                            Enter Command Center
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </motion.button>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute bottom-12 left-1/2 -translate-x-1/2"
                >
                    <ChevronDown className="w-6 h-6 text-white/30" />
                </motion.div>
            </section>

            {/* ━━━ SECTION 2: Live Monitoring ━━━ */}
            <section
                ref={section2Ref}
                className="relative z-10 min-h-screen flex items-center justify-center px-6"
            >
                <motion.div
                    initial={{ opacity: 0, y: 60 }}
                    animate={isSection2InView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="max-w-3xl text-center"
                >
                    <GlassCard className="p-10 md:p-14">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs font-mono text-green-400/80 uppercase tracking-[0.2em]">
                                Live Monitoring Active
                            </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                            Multi-Source Intelligence
                        </h2>
                        <p className="text-white/40 text-sm md:text-base leading-relaxed font-light">
                            Monitoring disasters from multiple intelligence sources in
                            real-time. Social media feeds, IVR citizen reports, and satellite
                            imagery converge into a unified operational picture.
                        </p>

                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            {[
                                { color: "bg-red-500", label: "Social Media" },
                                { color: "bg-blue-500", label: "IVR Reports" },
                                { color: "bg-orange-500", label: "Satellite" },
                            ].map((source) => (
                                <div
                                    key={source.label}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10"
                                >
                                    <span className={`w-2 h-2 rounded-full ${source.color} animate-pulse-marker`} />
                                    <span className="text-xs font-mono text-white/60">
                                        {source.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </motion.div>
            </section>

            {/* ━━━ SECTION 3: Feature Cards ━━━ */}
            <section
                ref={section3Ref}
                className="relative z-10 min-h-screen flex items-center justify-center px-6 py-20"
            >
                <div className="max-w-6xl w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={isSection3InView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-14"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-3">
                            Intelligence Modules
                        </h2>
                        <p className="text-white/35 text-sm font-mono tracking-wide">
                            Three pillars of real-time disaster situational awareness
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {featureCards.map((card, idx) => (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 50 }}
                                animate={isSection3InView ? { opacity: 1, y: 0 } : {}}
                                transition={{
                                    delay: idx * 0.2,
                                    duration: 0.7,
                                    ease: "easeOut",
                                }}
                            >
                                <GlassCard className="p-8 h-full hover:border-white/20 transition-all duration-300 group">
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-b ${card.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                                    />
                                    <div className="relative z-10">
                                        <div className="mb-5">{card.icon}</div>
                                        <h3 className="text-lg font-semibold text-white mb-4">
                                            {card.title}
                                        </h3>
                                        <ul className="space-y-2.5">
                                            {card.items.map((item) => (
                                                <li
                                                    key={item}
                                                    className="flex items-center gap-2 text-sm text-white/50"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>

                    {/* Bottom CTA */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={isSection3InView ? { opacity: 1 } : {}}
                        transition={{ delay: 1, duration: 0.8 }}
                        className="text-center mt-14"
                    >
                        <button
                            onClick={() => navigate("/command-center")}
                            className="group px-8 py-4 rounded-xl glass border border-white/10 hover:border-red-500/40 text-white font-medium tracking-wide transition-all duration-300 hover:shadow-lg hover:shadow-red-600/10"
                        >
                            <span className="flex items-center gap-3">
                                Launch Command Center
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Footer pad */}
            <div className="h-20 relative z-10" />
        </div>
    );
};

export default Admin;

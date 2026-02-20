import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Droplets,
    Layers,
    BarChart3,
    Eye,
    EyeOff,
    ChevronRight,
} from "lucide-react";
import type { TileInspectPayload } from "@/components/layers/SatelliteLayer";
import { getSatelliteImageUrl, getChangeOverlayUrl } from "@/services/api";

interface FloodInspectorPanelProps {
    payload: TileInspectPayload | null;
    onClose: () => void;
}

const FloodInspectorPanel = ({ payload, onClose }: FloodInspectorPanelProps) => {
    const [phase, setPhase] = useState<"before" | "during">("during");
    const [showOverlay, setShowOverlay] = useState(true);
    const [tileStats, setTileStats] = useState<Record<string, any> | null>(null);

    // Fetch tile stats when payload changes
    useEffect(() => {
        if (!payload) return;
        setTileStats(null);
        fetch(
            `http://localhost:8001/api/events/${payload.cemsId}/tiles/${payload.tileId}/stats`
        )
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setTileStats(d))
            .catch(() => setTileStats(null));
    }, [payload?.cemsId, payload?.tileId]);

    if (!payload) return null;

    const { cemsId, tileId, feature } = payload;
    const isNewFlood =
        feature.properties.class === "new_flood" ||
        feature.properties.class === "flood_new";

    const neonColor = isNewFlood ? "#FF004D" : "#00BFFF";
    const label = isNewFlood ? "New Flood" : "Existing Water";

    return (
        <AnimatePresence>
            <motion.div
                key="flood-inspector"
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="fixed bottom-4 right-4 z-50 w-[380px] max-h-[85vh] overflow-y-auto"
            >
                <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl shadow-2xl">
                    {/* ── Header ── */}
                    <div
                        className="flex items-center justify-between px-4 py-3 border-b border-white/10"
                        style={{
                            background: `linear-gradient(90deg, ${neonColor}15 0%, transparent 100%)`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Droplets
                                className="w-4 h-4"
                                style={{ color: neonColor }}
                            />
                            <div>
                                <span
                                    className="text-xs font-semibold"
                                    style={{ color: neonColor }}
                                >
                                    {label}
                                </span>
                                <p className="text-[10px] font-mono text-white/40">
                                    {cemsId} / {tileId}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* ── Satellite Imagery ── */}
                    <div className="p-3">
                        {/* Phase toggle */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-white/40 uppercase tracking-[0.15em]">
                                Satellite View
                            </span>
                            <div className="flex items-center gap-1 glass rounded-lg p-0.5">
                                <button
                                    onClick={() => setPhase("before")}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                                        phase === "before"
                                            ? "bg-white/10 text-white"
                                            : "text-white/40 hover:text-white/60"
                                    }`}
                                >
                                    Before
                                </button>
                                <button
                                    onClick={() => setPhase("during")}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                                        phase === "during"
                                            ? "bg-orange-500/20 text-orange-400"
                                            : "text-white/40 hover:text-white/60"
                                    }`}
                                >
                                    During
                                </button>
                                <button
                                    onClick={() => setShowOverlay(!showOverlay)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                                        showOverlay
                                            ? "bg-red-500/15 text-red-400"
                                            : "text-white/40 hover:text-white/60"
                                    }`}
                                    title="Toggle AI prediction overlay"
                                >
                                    {showOverlay ? (
                                        <Eye className="w-3 h-3" />
                                    ) : (
                                        <EyeOff className="w-3 h-3" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Image viewport */}
                        <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-square border border-white/[0.06]">
                            <img
                                key={`${cemsId}-${tileId}-${phase}`}
                                src={getSatelliteImageUrl(cemsId, tileId, phase)}
                                alt={`${phase} satellite`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).alt =
                                        "Image unavailable";
                                }}
                            />
                            {showOverlay && (
                                <img
                                    src={getChangeOverlayUrl(cemsId, tileId)}
                                    alt="AI overlay"
                                    className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-75"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display =
                                            "none";
                                    }}
                                />
                            )}
                            {/* Phase pill */}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[9px] font-mono text-white/60 border border-white/10">
                                {phase.toUpperCase()} • AI{showOverlay ? " ON" : " OFF"}
                            </div>
                            {/* Neon border accent */}
                            <div
                                className="absolute inset-0 rounded-xl pointer-events-none"
                                style={{
                                    boxShadow: `inset 0 0 30px ${neonColor}20, 0 0 15px ${neonColor}10`,
                                }}
                            />
                        </div>
                    </div>

                    {/* ── Stats Grid ── */}
                    <div className="px-3 pb-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 uppercase tracking-[0.15em]">
                            <BarChart3 className="w-3 h-3" />
                            Feature Properties
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <StatBox
                                label="Classification"
                                value={label}
                                color={neonColor}
                            />
                            <StatBox
                                label="Area"
                                value={
                                    feature.properties.area_km2 != null
                                        ? `${feature.properties.area_km2.toFixed(3)} km²`
                                        : "—"
                                }
                                color={neonColor}
                            />
                            <StatBox
                                label="% Increase"
                                value={
                                    feature.properties.percent_increase != null
                                        ? `${feature.properties.percent_increase.toFixed(1)}%`
                                        : "—"
                                }
                                color={isNewFlood ? "#FF004D" : "#00BFFF"}
                            />
                            <StatBox
                                label="Tile"
                                value={tileId}
                                color="#FF6F00"
                            />
                        </div>

                        {/* Per-tile aggregate stats */}
                        {tileStats && (
                            <>
                                <div className="border-t border-white/[0.06] pt-2 mt-2">
                                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                                        Tile Aggregate
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatBox
                                        label="Before Water"
                                        value={`${(tileStats.before_water_km2 ?? 0).toFixed(3)} km²`}
                                        color="#00BFFF"
                                    />
                                    <StatBox
                                        label="During Water"
                                        value={`${(tileStats.during_water_km2 ?? 0).toFixed(3)} km²`}
                                        color="#FF004D"
                                    />
                                    <StatBox
                                        label="New Flood"
                                        value={`${(tileStats.new_flood_km2 ?? 0).toFixed(3)} km²`}
                                        color="#FF004D"
                                    />
                                    <StatBox
                                        label="F1 Score"
                                        value={
                                            tileStats.f1 != null
                                                ? tileStats.f1.toFixed(3)
                                                : "—"
                                        }
                                        color="#A855F7"
                                    />
                                </div>
                            </>
                        )}

                        {/* Legend */}
                        <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/30">
                                <span
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{
                                        background: "#00BFFF",
                                        boxShadow: "0 0 6px #00BFFF60",
                                    }}
                                />
                                Existing Water
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-white/30">
                                <span
                                    className="w-2.5 h-2.5 rounded-sm"
                                    style={{
                                        background: "#FF004D",
                                        boxShadow: "0 0 6px #FF004D60",
                                    }}
                                />
                                New Flood
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Stat Box ───────────────────────────────────────────────────────────

function StatBox({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div
            className="rounded-lg p-2 border border-white/[0.06]"
            style={{ background: `${color}08` }}
        >
            <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider block">
                {label}
            </span>
            <p
                className="text-xs font-semibold mt-0.5"
                style={{ color: `${color}CC` }}
            >
                {value}
            </p>
        </div>
    );
}

export default FloodInspectorPanel;

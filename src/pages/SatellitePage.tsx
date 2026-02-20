import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Satellite,
    Globe,
    Layers,
    ArrowRight,
    X,
    MapPin,
    Calendar,
    Info,
    Image,
    Droplets,
    Eye,s
} from "lucide-react";
import {
    fetchFloodSummary,
    fetchFloodEventDetail,
    getSatelliteImageUrl,
    getChangeOverlayUrl,
} from "@/services/api";
import { fetchSatelliteEvents } from "@/lib/api";
import type { SatelliteEvent } from "@/types/disaster";
import GlassCard from "@/components/ui/GlassCard";

const statusColor: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    monitoring: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    completed: "bg-white/10 text-white/50 border-white/10",
    closed: "bg-white/10 text-white/40 border-white/10",
};

const SatellitePage = () => {
    const [selectedEvent, setSelectedEvent] = useState<SatelliteEvent | null>(null);
    const [selectedTile, setSelectedTile] = useState<string | null>(null);
    // Single slider: 0–100. 0=before, 50=during, 100=during+full overlay
    const [sliderValue, setSliderValue] = useState(50);

    const { data: events = [], isLoading } = useQuery({
        queryKey: ["satellite-events"],
        queryFn: fetchSatelliteEvents,
        refetchInterval: 60_000,
    });

    const { data: summary } = useQuery({
        queryKey: ["flood-summary"],
        queryFn: fetchFloodSummary,
    });

    const { data: eventDetail } = useQuery({
        queryKey: ["flood-event-detail", selectedEvent?.cems_id],
        queryFn: () =>
            selectedEvent
                ? fetchFloodEventDetail(selectedEvent.cems_id)
                : Promise.resolve(null),
        enabled: !!selectedEvent,
    });

    const tiles: string[] = (() => {
        const raw = eventDetail?.tiles ?? eventDetail?.available_tiles ?? [];
        if (!Array.isArray(raw) || raw.length === 0) return [];
        // API may return [{tile:"t001",bounds:…}, …] or ["t001",…]
        if (typeof raw[0] === "string") return raw as string[];
        return raw.map((t: any) => t.tile ?? t.id ?? String(t)).filter(Boolean);
    })();

    return (
        <div className="min-h-screen bg-[#050816] pt-20">
            <div className="max-w-screen-2xl mx-auto px-6 py-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Satellite className="w-5 h-5 text-orange-400" />
                            Satellite Change Detection
                        </h1>
                        <p className="text-xs text-white/30 font-mono mt-0.5">
                            Copernicus EMS flood events • {events.length} events loaded
                        </p>
                    </div>

                    {/* Summary chips */}
                    {summary && (
                        <div className="flex items-center gap-3">
                            {Object.entries(summary)
                                .filter(([k]) => typeof summary[k] === "number")
                                .slice(0, 3)
                                .map(([k, v]) => (
                                    <div
                                        key={k}
                                        className="glass rounded-lg px-3 py-1.5 text-xs font-mono text-white/40"
                                    >
                                        <span className="text-white/70 mr-1">{String(v)}</span>
                                        {k.replace(/_/g, " ")}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-6">
                    {/* ── Event list ── */}
                    <div className="w-96 flex-shrink-0 space-y-3">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-32 rounded-xl bg-white/[0.03] animate-pulse"
                                />
                            ))
                        ) : events.length === 0 ? (
                            <div className="text-center py-20">
                                <Satellite className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-white/20 font-mono text-sm">
                                    No satellite events loaded.
                                </p>
                                <p className="text-white/10 font-mono text-xs mt-1">
                                    Ensure Backend (port 8001) is running.
                                </p>
                            </div>
                        ) : (
                            events.map((ev) => {
                                const isSelected = selectedEvent?.cems_id === ev.cems_id;
                                const st = ev.status?.toLowerCase() ?? "active";
                                return (
                                    <motion.div
                                        key={ev.cems_id}
                                        layout
                                        onClick={() => {
                                            setSelectedEvent(ev);
                                            setSelectedTile(null);
                                            setSliderValue(50);
                                        }}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.005] ${
                                            isSelected
                                                ? "bg-orange-500/[0.06] border-orange-500/30"
                                                : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-white/80">
                                                {ev.title}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                                    statusColor[st] ?? statusColor.active
                                                }`}
                                            >
                                                {ev.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/40 line-clamp-2 mb-2">
                                            {ev.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-[10px] font-mono text-white/25">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {ev.country}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Layers className="w-3 h-3" />
                                                {ev.event_type}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Globe className="w-3 h-3" />
                                                {ev.cems_id}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* ── Detail panel ── */}
                    <div className="flex-1 min-w-0">
                        {!selectedEvent ? (
                            <div className="h-96 flex items-center justify-center">
                                <div className="text-center">
                                    <Satellite className="w-12 h-12 text-white/5 mx-auto mb-3" />
                                    <p className="text-white/15 font-mono text-sm">
                                        Select an event to view details
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Event info */}
                                <GlassCard className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-sm font-bold text-white">
                                            {selectedEvent.title}
                                        </h2>
                                        <button
                                            onClick={() => setSelectedEvent(null)}
                                            className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-white/50 leading-relaxed mb-4">
                                        {selectedEvent.description}
                                    </p>
                                    <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">CEMS ID</span>
                                            <p className="text-white/80 mt-0.5">
                                                {selectedEvent.cems_id}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Country</span>
                                            <p className="text-white/80 mt-0.5">
                                                {selectedEvent.country}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Type</span>
                                            <p className="text-white/80 mt-0.5">
                                                {selectedEvent.event_type}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Activation</span>
                                            <p className="text-white/80 mt-0.5">
                                                {new Date(
                                                    selectedEvent.activation_time
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                </GlassCard>

                                {/* Tiles */}
                                {tiles.length > 0 && (
                                    <GlassCard className="p-5">
                                        <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mb-3">
                                            Available Tiles
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {tiles.map((tile: string) => (
                                                <button
                                                    key={tile}
                                                    onClick={() => {
                                                        setSelectedTile(tile);
                                                        setSliderValue(50);
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                                        selectedTile === tile
                                                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                                            : "bg-white/5 text-white/40 border-white/[0.06] hover:border-white/15"
                                                    }`}
                                                >
                                                    <Layers className="w-3 h-3 inline mr-1" />
                                                    {tile}
                                                </button>
                                            ))}
                                        </div>
                                    </GlassCard>
                                )}

                                {/* Satellite imagery — slider view */}
                                {selectedTile && selectedEvent && (
                                    <GlassCard className="p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                                                Satellite Imagery — {selectedTile}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[10px] font-mono">
                                                <span className={`px-2 py-0.5 rounded ${sliderValue <= 33 ? "bg-white/10 text-white" : "text-white/25"}`}>
                                                    Before
                                                </span>
                                                <span className={`px-2 py-0.5 rounded ${sliderValue > 33 && sliderValue <= 66 ? "bg-orange-500/20 text-orange-400" : "text-white/25"}`}>
                                                    During
                                                </span>
                                                <span className={`px-2 py-0.5 rounded ${sliderValue > 66 ? "bg-red-500/15 text-red-400" : "text-white/25"}`}>
                                                    <Eye className="w-3 h-3 inline mr-0.5" />
                                                    AI Overlay {sliderValue > 66 ? `${Math.round(((sliderValue - 66) / 34) * 100)}%` : ""}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Image viewport */}
                                        <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-square border border-white/[0.06]">
                                            {/* Before image (show when slider ≤ 33) */}
                                            <img
                                                src={getSatelliteImageUrl(
                                                    selectedEvent.cems_id,
                                                    selectedTile,
                                                    "before"
                                                )}
                                                alt="Before flood"
                                                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
                                                style={{ opacity: sliderValue <= 33 ? 1 : 0 }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).alt = "Image unavailable";
                                                }}
                                            />

                                            {/* During image (show when slider > 33) */}
                                            <img
                                                src={getSatelliteImageUrl(
                                                    selectedEvent.cems_id,
                                                    selectedTile,
                                                    "during"
                                                )}
                                                alt="During flood"
                                                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300"
                                                style={{ opacity: sliderValue > 33 ? 1 : 0 }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).alt = "Image unavailable";
                                                }}
                                            />

                                            {/* AI change overlay (fade in from slider 67→100) */}
                                            <img
                                                src={getChangeOverlayUrl(
                                                    selectedEvent.cems_id,
                                                    selectedTile
                                                )}
                                                alt="AI flood overlay"
                                                className="absolute inset-0 w-full h-full object-contain mix-blend-screen transition-opacity duration-200"
                                                style={{
                                                    opacity: sliderValue > 66
                                                        ? ((sliderValue - 66) / 34) * 0.85
                                                        : 0,
                                                }}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = "none";
                                                }}
                                            />

                                            {/* Phase label pill */}
                                            <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur text-[9px] font-mono text-white/60 border border-white/10">
                                                {sliderValue <= 33 ? "BEFORE" : sliderValue <= 66 ? "DURING" : "DURING + AI"}
                                                {" "}• {selectedEvent.cems_id}/{selectedTile}
                                            </div>

                                            {/* Neon border on overlay mode */}
                                            {sliderValue > 66 && (
                                                <div
                                                    className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300"
                                                    style={{
                                                        boxShadow: `inset 0 0 40px #FF004D${Math.round(((sliderValue - 66) / 34) * 40).toString(16).padStart(2, "0")}, 0 0 20px #00BFFF${Math.round(((sliderValue - 66) / 34) * 25).toString(16).padStart(2, "0")}`,
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Slider */}
                                        <div className="mt-4 px-1">
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={sliderValue}
                                                onChange={(e) => setSliderValue(Number(e.target.value))}
                                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                                style={{
                                                    background: `linear-gradient(to right, 
                                                        rgba(255,255,255,0.3) 0%, 
                                                        rgba(255,255,255,0.3) 33%, 
                                                        rgba(255,111,0,0.5) 33%, 
                                                        rgba(255,111,0,0.5) 66%, 
                                                        rgba(255,0,77,0.5) 66%, 
                                                        rgba(255,0,77,0.5) 100%)`,
                                                }}
                                            />
                                            <div className="flex justify-between mt-1 text-[9px] font-mono text-white/25">
                                                <span>Before</span>
                                                <span>During Flood</span>
                                                <span>AI Overlay</span>
                                            </div>
                                        </div>

                                        {/* Legend */}
                                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06] text-xs font-mono text-white/30">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-sm border" style={{ background: "#00BFFF80", borderColor: "#00BFFF99", boxShadow: "0 0 6px #00BFFF40" }} />
                                                Existing Water
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-3 rounded-sm border" style={{ background: "#FF004D80", borderColor: "#FF004D99", boxShadow: "0 0 6px #FF004D40" }} />
                                                New Flood
                                            </span>
                                        </div>
                                    </GlassCard>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SatellitePage;

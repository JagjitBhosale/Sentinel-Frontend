import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Phone,
    MapPin,
    Clock,
    Shield,
    AlertTriangle,
    X,
    ChevronDown,
    User,
    Volume2,
    FileText,
    Play,
    Pause,
    Loader2,
} from "lucide-react";
import { onIVRReports, onDisasterReports, getAudioUrl } from "@/services/firebase";
import type { IVRReport } from "@/types/disaster";
import GlassCard from "@/components/ui/GlassCard";

/* ── Audio Player Hook ── */
function useAudioPlayer() {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentFile, setCurrentFile] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const frameRef = useRef<number>(0);

    const tick = useCallback(() => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                frameRef.current = requestAnimationFrame(tick);
            }
        }
    }, []);

    const play = useCallback(async (filePath: string) => {
        setError(null);
        // If same file, just toggle
        if (currentFile === filePath && audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play();
                setPlaying(true);
                frameRef.current = requestAnimationFrame(tick);
            } else {
                audioRef.current.pause();
                setPlaying(false);
                cancelAnimationFrame(frameRef.current);
            }
            return;
        }
        // New file
        try {
            setLoading(true);
            setPlaying(false);
            setProgress(0);
            setDuration(0);
            cancelAnimationFrame(frameRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            const url = await getAudioUrl(filePath);
            const audio = new Audio(url);
            audioRef.current = audio;
            setCurrentFile(filePath);

            audio.addEventListener("loadedmetadata", () => {
                setDuration(audio.duration);
                setLoading(false);
            });
            audio.addEventListener("ended", () => {
                setPlaying(false);
                setProgress(0);
                cancelAnimationFrame(frameRef.current);
            });
            audio.addEventListener("error", () => {
                setError("Failed to load audio");
                setLoading(false);
                setPlaying(false);
            });

            await audio.play();
            setPlaying(true);
            frameRef.current = requestAnimationFrame(tick);
        } catch (err) {
            console.error("Audio play error:", err);
            setError("Could not load audio");
            setLoading(false);
        }
    }, [currentFile, tick]);

    const seek = useCallback((time: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    }, []);

    const stop = useCallback(() => {
        cancelAnimationFrame(frameRef.current);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
        setPlaying(false);
        setProgress(0);
        setDuration(0);
        setCurrentFile(null);
        setError(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelAnimationFrame(frameRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    return { playing, loading, progress, duration, currentFile, error, play, seek, stop };
}

/* ── Format seconds to mm:ss ── */
function fmtTime(sec: number) {
    if (!sec || !isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ── Trust badge colour ── */
const trustColor: Record<string, string> = {
    high: "bg-green-500/20 text-green-400 border-green-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-red-500/20 text-red-400 border-red-500/30",
};

const sevColor: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const IVRPage = () => {
    const [reports, setReports] = useState<IVRReport[]>([]);
    const [disasterReports, setDisasterReports] = useState<IVRReport[]>([]);
    const [tab, setTab] = useState<"all" | "disaster">("all");
    const [selected, setSelected] = useState<IVRReport | null>(null);
    const [filterSev, setFilterSev] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const audio = useAudioPlayer();

    /* ── Firebase real-time listeners ── */
    useEffect(() => {
        setLoading(true);

        const unsubReports = onIVRReports((docs) => {
            setReports(docs as IVRReport[]);
            setLoading(false);
        });

        const unsubDisaster = onDisasterReports((docs) => {
            setDisasterReports(docs as IVRReport[]);
        });

        return () => {
            unsubReports();
            unsubDisaster();
        };
    }, []);

    const activeList = tab === "all" ? reports : disasterReports;
    const filtered = filterSev
        ? activeList.filter(
            (r) => (r.severity || "").toLowerCase() === filterSev
        )
        : activeList;

    const criticalCount = activeList.filter(
        (r) =>
            (r.severity || "").toLowerCase() === "high" ||
            (r.severity || "").toLowerCase() === "critical"
    ).length;

    return (
        <div className="min-h-screen bg-[#050816] pt-20">
            <div className="max-w-screen-2xl mx-auto px-6 py-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <Phone className="w-5 h-5 text-blue-400" />
                            IVR & GPS Reports
                        </h1>
                        <p className="text-xs text-white/30 font-mono mt-0.5">
                            Real-time reports from Firebase • {activeList.length} reports
                            {criticalCount > 0 && (
                                <span className="text-red-400 ml-2">
                                    • {criticalCount} critical
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Tab toggles */}
                    <div className="flex items-center gap-1 glass rounded-lg p-1">
                        <button
                            onClick={() => setTab("all")}
                            className={`px-4 py-1.5 rounded-md text-xs font-mono transition-colors ${
                                tab === "all"
                                    ? "bg-white/10 text-white"
                                    : "text-white/40 hover:text-white/60"
                            }`}
                        >
                            All Reports
                        </button>
                        <button
                            onClick={() => setTab("disaster")}
                            className={`px-4 py-1.5 rounded-md text-xs font-mono transition-colors ${
                                tab === "disaster"
                                    ? "bg-red-500/20 text-red-400"
                                    : "text-white/40 hover:text-white/60"
                            }`}
                        >
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Disaster Only
                        </button>
                    </div>
                </div>

                {/* ── Severity filters ── */}
                <div className="flex gap-2 mb-6">
                    {["critical", "high", "medium", "low"].map((sev) => (
                        <button
                            key={sev}
                            onClick={() =>
                                setFilterSev(filterSev === sev ? null : sev)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                filterSev === sev
                                    ? sevColor[sev] ?? "bg-white/10 text-white/50 border-white/20"
                                    : "bg-white/[0.03] text-white/30 border-white/[0.06] hover:border-white/15"
                            }`}
                        >
                            {sev}
                        </button>
                    ))}
                    {filterSev && (
                        <button
                            onClick={() => setFilterSev(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/30 hover:text-white/50"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* ── Loading state ── */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-44 rounded-xl bg-white/[0.03] animate-pulse"
                            />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Phone className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-white/20 font-mono text-sm">
                            No IVR reports found.
                        </p>
                        <p className="text-white/10 font-mono text-xs mt-1">
                            Reports will appear here in real-time from Firebase.
                        </p>
                    </div>
                ) : (
                    /* ── Report Grid ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((report) => {
                                const sev = (report.severity || "low").toLowerCase();
                                const trust = (report.trust_level || "medium").toLowerCase();
                                return (
                                    <motion.div
                                        key={report.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onClick={() => setSelected(report)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                                            sev === "critical" || sev === "high"
                                                ? "bg-red-500/[0.03] border-red-500/15 hover:border-red-500/30"
                                                : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                                        }`}
                                    >
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">
                                                    {report.reporter_type === "ivr"
                                                        ? "📞"
                                                        : report.reporter_type === "gps"
                                                        ? "📍"
                                                        : "📋"}
                                                </span>
                                                <div>
                                                    <span className="text-xs font-semibold text-white/80 capitalize">
                                                        {report.disaster_type || "Report"}
                                                    </span>
                                                    <p className="text-[10px] text-white/30 font-mono">
                                                        ID: {report.id.slice(0, 8)}...
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                                        sevColor[sev] ?? "bg-white/10 text-white/40 border-white/10"
                                                    }`}
                                                >
                                                    {sev}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <p className="text-xs text-white/50 leading-relaxed line-clamp-3 mb-2">
                                            {report.summary || report.description || "No summary available"}
                                        </p>

                                        {/* Transcript preview */}
                                        {report.transcript && (
                                            <p className="text-[10px] text-white/30 italic line-clamp-2 mb-3">
                                                "{report.transcript}"
                                            </p>
                                        )}

                                        {/* Mini Audio Player */}
                                        {report.file_name && (
                                            <div className="mb-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        audio.play(report.file_name!);
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono border transition-all ${
                                                        audio.currentFile === report.file_name && audio.playing
                                                            ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                                            : "bg-white/[0.04] border-white/[0.06] text-white/40 hover:text-white/60 hover:border-white/15"
                                                    }`}
                                                >
                                                    {audio.loading && audio.currentFile === report.file_name ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : audio.currentFile === report.file_name && audio.playing ? (
                                                        <Pause className="w-3 h-3" />
                                                    ) : (
                                                        <Play className="w-3 h-3" />
                                                    )}
                                                    {audio.currentFile === report.file_name && audio.playing
                                                        ? `Playing ${fmtTime(audio.progress)}`
                                                        : "Play Audio"}
                                                </button>
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between text-[10px] font-mono text-white/25">
                                            <div className="flex items-center gap-3">
                                                {report.status && (
                                                    <span className="flex items-center gap-1">
                                                        <Shield className="w-3 h-3" />
                                                        {report.status}
                                                    </span>
                                                )}
                                                {report.people_affected != null && (
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {report.people_affected} affected
                                                    </span>
                                                )}
                                            </div>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {report.created_at?.toDate
                                                    ? new Date(report.created_at.toDate()).toLocaleDateString()
                                                    : "—"}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ── Detail Modal ── */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelected(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[480px] max-w-[90vw] max-h-[80vh] overflow-y-auto glass-strong rounded-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">
                                        {selected.reporter_type === "ivr" ? "📞" : "📍"}
                                    </span>
                                    <div>
                                        <h3 className="font-semibold text-white text-sm capitalize">
                                            {selected.disaster_type || "IVR Report"}
                                        </h3>
                                        <p className="text-[10px] text-white/30 font-mono">
                                            {selected.id}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Meta grid */}
                                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                                    <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                        <AlertTriangle className="w-3.5 h-3.5 mx-auto text-white/30 mb-1" />
                                        <p className="text-white/70 capitalize">
                                            {selected.severity || "N/A"}
                                        </p>
                                        <p className="text-[9px] text-white/30">Severity</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                        <Shield className="w-3.5 h-3.5 mx-auto text-white/30 mb-1" />
                                        <p className="text-white/70 capitalize">
                                            {selected.status || "pending"}
                                        </p>
                                        <p className="text-[9px] text-white/30">Status</p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2.5 text-center">
                                        <User className="w-3.5 h-3.5 mx-auto text-white/30 mb-1" />
                                        <p className="text-white/70">
                                            {selected.people_affected ?? "—"}
                                        </p>
                                        <p className="text-[9px] text-white/30">People Affected</p>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                                        Summary
                                    </h4>
                                    <p className="text-sm text-white/60 leading-relaxed">
                                        {selected.summary || selected.description || "No summary"}
                                    </p>
                                </div>

                                {/* Transcript */}
                                {selected.transcript && (
                                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                                        <h4 className="text-[10px] font-mono text-blue-400/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <Volume2 className="w-3 h-3" /> Audio Transcript
                                        </h4>
                                        <p className="text-xs text-white/60 italic leading-relaxed">
                                            "{selected.transcript}"
                                        </p>
                                    </div>
                                )}

                                {/* Audio File + Player */}
                                {selected.file_name && (
                                    <div className="bg-gradient-to-br from-blue-500/[0.06] to-purple-500/[0.04] border border-blue-500/15 rounded-xl p-4">
                                        <h4 className="text-[10px] font-mono text-blue-400/70 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                            <Volume2 className="w-3.5 h-3.5" /> Audio Recording
                                        </h4>

                                        {/* Player controls */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <button
                                                onClick={() => audio.play(selected.file_name!)}
                                                disabled={audio.loading && audio.currentFile === selected.file_name}
                                                className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 hover:bg-blue-500/30 transition-all disabled:opacity-50"
                                            >
                                                {audio.loading && audio.currentFile === selected.file_name ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : audio.currentFile === selected.file_name && audio.playing ? (
                                                    <Pause className="w-4 h-4" />
                                                ) : (
                                                    <Play className="w-4 h-4 ml-0.5" />
                                                )}
                                            </button>

                                            <div className="flex-1">
                                                {/* Progress bar */}
                                                <div
                                                    className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden cursor-pointer"
                                                    onClick={(e) => {
                                                        if (!audio.duration || audio.currentFile !== selected.file_name) return;
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const ratio = (e.clientX - rect.left) / rect.width;
                                                        audio.seek(ratio * audio.duration);
                                                    }}
                                                >
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-100"
                                                        style={{
                                                            width: audio.currentFile === selected.file_name && audio.duration
                                                                ? `${(audio.progress / audio.duration) * 100}%`
                                                                : "0%",
                                                        }}
                                                    />
                                                </div>
                                                {/* Time */}
                                                <div className="flex justify-between mt-1">
                                                    <span className="text-[10px] font-mono text-white/25">
                                                        {audio.currentFile === selected.file_name
                                                            ? fmtTime(audio.progress)
                                                            : "0:00"}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-white/25">
                                                        {audio.currentFile === selected.file_name
                                                            ? fmtTime(audio.duration)
                                                            : "--:--"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Error */}
                                        {audio.error && audio.currentFile === selected.file_name && (
                                            <p className="text-[10px] text-red-400 font-mono">
                                                {audio.error}
                                            </p>
                                        )}

                                        {/* File name */}
                                        <p className="text-[10px] text-white/20 font-mono break-all mt-1">
                                            {selected.file_name}
                                        </p>
                                    </div>
                                )}

                                {/* Location */}
                                {selected.location && selected.location !== null && typeof selected.location === "object" && (
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Location
                                        </h4>
                                        <p className="text-xs text-white/70">
                                            {selected.location.name || "Unknown location"}
                                        </p>
                                        {selected.location.lat != null && (
                                            <p className="text-[10px] font-mono text-white/30 mt-0.5">
                                                {selected.location.lat?.toFixed(4)},{" "}
                                                {selected.location.lng?.toFixed(4)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                    <span className="text-[10px] font-mono text-white/30">
                                        Status:{" "}
                                        <span className="text-white/60 capitalize">
                                            {selected.status || "pending"}
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-mono text-white/30">
                                        {selected.created_at?.toDate
                                            ? new Date(selected.created_at.toDate()).toLocaleString()
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default IVRPage;

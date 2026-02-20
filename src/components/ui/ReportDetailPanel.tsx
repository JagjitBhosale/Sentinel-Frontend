import { useState, useRef, useEffect } from "react";
import {
    X,
    MapPin,
    Clock,
    Shield,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Volume2,
    Image as ImageIcon,
    FileText,
    CheckCircle2,
    XCircle,
    Eye,
    Phone,
    Smartphone,
    User,
    ZoomIn,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import type { AppReport } from "@/types/disaster";
import type { MapReport, IVRReport } from "@/types/disaster";
import { getAudioUrl } from "@/services/firebase";

/* ───────────────────── helpers ───────────────────── */

function formatTimestamp(ts: any): string {
    if (!ts) return "Unknown";
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (typeof ts === "string") return new Date(ts).toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return String(ts);
}

function priorityBadge(level?: string) {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        critical: { bg: "bg-red-500/20 border-red-500/30", text: "text-red-400", label: "Critical" },
        high: { bg: "bg-orange-500/20 border-orange-500/30", text: "text-orange-400", label: "High" },
        medium: { bg: "bg-yellow-500/20 border-yellow-500/30", text: "text-yellow-400", label: "Medium" },
        low: { bg: "bg-green-500/20 border-green-500/30", text: "text-green-400", label: "Low" },
        very_low: { bg: "bg-emerald-500/20 border-emerald-500/30", text: "text-emerald-400", label: "Very Low" },
    };
    const p = map[(level || "").toLowerCase()] ?? map.low!;
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${p.bg} ${p.text}`}>
            {p.label}
        </span>
    );
}

function statusBadge(status?: string) {
    const s = (status || "").toLowerCase();
    if (s === "verified")
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border bg-green-500/15 border-green-500/25 text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Verified
            </span>
        );
    if (s === "rejected")
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border bg-red-500/15 border-red-500/25 text-red-400">
                <XCircle className="w-3 h-3" /> Rejected
            </span>
        );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono border bg-blue-500/15 border-blue-500/25 text-blue-400">
            <Eye className="w-3 h-3" /> {status || "Pending"}
        </span>
    );
}

function reportTypeLabel(type?: string) {
    if (!type) return "Report";
    return type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ───────────── Image Gallery (for App reports) ───────────── */

function ImageGallery({ media }: { media: AppReport["media"] }) {
    const [current, setCurrent] = useState(0);
    const [lightbox, setLightbox] = useState(false);

    if (!media || media.length === 0) return null;

    const images = media.filter((m) => m.type === "image");
    if (images.length === 0) return null;

    return (
        <>
            {/* Carousel */}
            <div className="relative group">
                <div className="overflow-hidden rounded-lg border border-white/10">
                    <img
                        src={images[current]?.url}
                        alt={`Report media ${current + 1}`}
                        className="w-full h-52 object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
                        onClick={() => setLightbox(true)}
                    />
                </div>

                {/* Zoom hint */}
                <button
                    onClick={() => setLightbox(true)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>

                {/* Nav arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => setCurrent((p) => (p === 0 ? images.length - 1 : p - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrent((p) => (p === images.length - 1 ? 0 : p + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 backdrop-blur-sm text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </>
                )}

                {/* Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white w-4" : "bg-white/40"
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Counter */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
                    <span className="text-[10px] font-mono text-white/70">
                        <ImageIcon className="w-3 h-3 inline mr-1" />
                        {current + 1} / {images.length}
                    </span>
                </div>
            </div>

            {/* EXIF metadata */}
            {images[current]?.exifData && (
                <div className="flex gap-2 text-[10px] font-mono text-white/35 mt-1">
                    {images[current]?.exifData?.resolution && (
                        <span>Resolution: {images[current]?.exifData?.resolution}</span>
                    )}
                    {images[current]?.uploadedAt && (
                        <span>Uploaded: {new Date(images[current]?.uploadedAt!).toLocaleDateString()}</span>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
                    onClick={() => setLightbox(false)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        onClick={() => setLightbox(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={images[current]?.url}
                        alt={`Report media ${current + 1}`}
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrent((p) => (p === 0 ? images.length - 1 : p - 1));
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrent((p) => (p === images.length - 1 ? 0 : p + 1));
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

/* ────────────── Audio Player (for IVR reports) ────────────── */

function AudioPlayer({ report }: { report: MapReport }) {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Try to resolve the audio URL from the original IVR report
    useEffect(() => {
        const ivrData = (report as any)._ivrDoc as IVRReport | undefined;
        if (!ivrData) return;

        const filePath =
            ivrData.file_name ||
            ivrData.media_url ||
            (ivrData.bucket ? `${ivrData.bucket}/${ivrData.file_name}` : null);

        if (!filePath) return;

        setLoading(true);
        // If url is already a full https url, use it directly
        if (filePath.startsWith("http")) {
            setAudioUrl(filePath);
            setLoading(false);
        } else {
            getAudioUrl(filePath)
                .then(setAudioUrl)
                .catch(() => setAudioUrl(null))
                .finally(() => setLoading(false));
        }
    }, [report]);

    const toggle = () => {
        if (!audioRef.current) return;
        if (playing) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setPlaying(!playing);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        setProgress(audioRef.current.currentTime);
    };

    const handleLoaded = () => {
        if (!audioRef.current) return;
        setDuration(audioRef.current.duration);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = val;
            setProgress(val);
        }
    };

    const fmtTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    if (!audioUrl && !loading) return null;

    return (
        <div className="bg-cyan-500/5 border border-cyan-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 mb-1">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400/70" />
                <span className="text-[10px] text-cyan-400/60 font-mono uppercase tracking-wider">
                    IVR Audio Recording
                </span>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-xs text-white/40">
                    <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Loading audio...
                </div>
            ) : (
                <>
                    <audio
                        ref={audioRef}
                        src={audioUrl!}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoaded}
                        onEnded={() => setPlaying(false)}
                    />
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggle}
                            className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
                        >
                            {playing ? (
                                <Pause className="w-3.5 h-3.5 text-cyan-400" />
                            ) : (
                                <Play className="w-3.5 h-3.5 text-cyan-400 ml-0.5" />
                            )}
                        </button>
                        <div className="flex-1 space-y-1">
                            <input
                                type="range"
                                min={0}
                                max={duration || 1}
                                step={0.1}
                                value={progress}
                                onChange={handleSeek}
                                className="w-full h-1 rounded-full appearance-none bg-white/10 accent-cyan-400 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
                            />
                            <div className="flex justify-between text-[10px] font-mono text-white/30">
                                <span>{fmtTime(progress)}</span>
                                <span>{fmtTime(duration)}</span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   Main Panel — works for both App reports & IVR reports
   ═══════════════════════════════════════════════════════════ */

interface ReportDetailPanelProps {
    /** The selected MapReport (social / IVR) */
    report: MapReport | null;
    /** If the clicked report came from the "reports" (app) collection, pass the full AppReport doc */
    appReport: AppReport | null;
    /** Original IVR doc if source is ivr */
    ivrDoc: IVRReport | null;
    onClose: () => void;
}

export default function ReportDetailPanel({
    report,
    appReport,
    ivrDoc,
    onClose,
}: ReportDetailPanelProps) {
    /* ─── Decide which view to render ─── */
    const isApp = !!appReport;
    const isIVR = report?.source === "ivr";

    if (!report && !appReport) return null;

    /* ═════════════════════  APP REPORT VIEW  ═════════════════════ */
    if (isApp && appReport) {
        const loc = appReport.location;
        const meta = appReport.reportMetadata;

        return (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[460px] max-w-[92vw] animate-scale-in">
                <GlassCard variant="strong" className="overflow-hidden max-h-[85vh] flex flex-col">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl shrink-0">
                                <Smartphone className="w-5 h-5 text-violet-400" />
                            </span>
                            <div className="min-w-0">
                                <h3 className="font-semibold text-white text-sm truncate">
                                    {appReport.reportTitle || reportTypeLabel(appReport.reportType)}
                                </h3>
                                <p className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 inline" />
                                    {formatTimestamp(appReport.createdAt)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {statusBadge(appReport.status)}
                            {priorityBadge(appReport.priorityLevel)}
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Scrollable body ── */}
                    <div className="overflow-y-auto flex-1 p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                        {/* Report type pill */}
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-mono">
                                {reportTypeLabel(appReport.reportType)}
                            </span>
                            {appReport.requiresManualReview && (
                                <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Manual Review
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        {appReport.description && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                                <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider block mb-1.5">
                                    Description
                                </span>
                                <p className="text-sm text-white/75 leading-relaxed">
                                    {appReport.description}
                                </p>
                            </div>
                        )}

                        {/* Media Gallery */}
                        <ImageGallery media={appReport.media} />

                        {/* Location */}
                        {loc && (loc.lat || loc.address) && (
                            <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 space-y-2">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400/70" />
                                    <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">
                                        Location
                                    </span>
                                </div>
                                {loc.address && (
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        {loc.address}
                                    </p>
                                )}
                                {loc.lat != null && loc.lng != null && (
                                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Latitude</span>
                                            <p className="text-white/80 mt-0.5">{loc.lat.toFixed(6)}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Longitude</span>
                                            <p className="text-white/80 mt-0.5">{loc.lng.toFixed(6)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Trust / confidence */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-white/5 rounded-lg p-2.5">
                                <span className="text-white/30 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Trust Score
                                </span>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                            style={{
                                                width: `${((appReport.trustScore ?? 0) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-white/80 tabular-nums">
                                        {((appReport.trustScore ?? 0) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2.5">
                                <span className="text-white/30">Trust Level</span>
                                <p className="text-white/80 mt-0.5 capitalize">
                                    {(appReport.trustLevel || "unknown").replace(/_/g, " ")}
                                </p>
                            </div>
                        </div>

                        {/* Metadata section */}
                        {meta && (
                            <div className="border-t border-white/[0.06] pt-3 space-y-2">
                                <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">
                                    Report Metadata
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <span className="text-white/30">Severity</span>
                                        <p className="text-white/80 mt-0.5 capitalize">
                                            {meta.estimated_severity || "Unknown"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <span className="text-white/30">Affected Area</span>
                                        <p className="text-white/80 mt-0.5">
                                            {meta.affected_area_size || "N/A"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <span className="text-white/30">Authority Contact</span>
                                        <p className={`mt-0.5 ${meta.authority_contact ? "text-green-400" : "text-white/50"}`}>
                                            {meta.authority_contact ? "Yes" : "No"}
                                        </p>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2">
                                        <span className="text-white/30">Casualties</span>
                                        <p className={`mt-0.5 ${meta.casualty_mentions ? "text-red-400" : "text-white/50"}`}>
                                            {meta.casualty_mentions ? "Mentioned" : "None"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer info */}
                        <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-[10px] font-mono text-white/25">
                            <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                ID: {appReport.reportId || appReport.id}
                            </span>
                            {appReport.userId && (
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {appReport.userId.slice(0, 8)}…
                                </span>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    /* ═════════════════════  IVR REPORT VIEW  ═════════════════════ */
    if (isIVR && report) {
        const enriched = ivrDoc
            ? { ...report, _ivrDoc: ivrDoc } as MapReport & { _ivrDoc: IVRReport }
            : report;

        return (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] max-w-[92vw] animate-scale-in">
                <GlassCard variant="strong" className="overflow-hidden max-h-[85vh] flex flex-col">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center">
                                <Phone className="w-4 h-4 text-cyan-400" />
                            </span>
                            <div>
                                <h3 className="font-semibold text-white text-sm">
                                    {report.disaster_type}
                                </h3>
                                <p className="text-[10px] text-white/40 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(report.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${report.severity === "High"
                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                    : report.severity === "Medium"
                                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                        : "bg-green-500/20 text-green-400 border-green-500/30"
                                    }`}
                            >
                                {report.severity}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="overflow-y-auto flex-1 p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                        {/* Source badge */}
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                                IVR Report
                            </span>
                            {report.reporter_type && (
                                <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-mono">
                                    {report.reporter_type}
                                </span>
                            )}
                        </div>

                        {/* Summary / text */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
                            <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider block mb-1.5">
                                Summary
                            </span>
                            <p className="text-sm text-white/75 leading-relaxed">
                                {report.text}
                            </p>
                        </div>

                        {/* Audio Player */}
                        <AudioPlayer report={enriched} />

                        {/* Transcription */}
                        {report.transcription && (
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                                <span className="text-[10px] text-blue-400/60 font-mono uppercase tracking-wider block mb-1.5">
                                    Audio Transcription
                                </span>
                                <p className="text-xs text-white/60 leading-relaxed italic">
                                    "{report.transcription}"
                                </p>
                            </div>
                        )}

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-white/5 rounded-lg p-2.5">
                                <span className="text-white/30 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Confidence
                                </span>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                                            style={{
                                                width: `${((report.confidence ?? 0) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-white/80 tabular-nums">
                                        {((report.confidence ?? 0) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2.5">
                                <span className="text-white/30">Source</span>
                                <p className="text-cyan-400 mt-0.5 capitalize">{report.source}</p>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-rose-400/70" />
                                <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">
                                    Location
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/30">Latitude</span>
                                    <p className="text-white/80 mt-0.5">{report.latitude.toFixed(4)}</p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-2">
                                    <span className="text-white/30">Longitude</span>
                                    <p className="text-white/80 mt-0.5">{report.longitude.toFixed(4)}</p>
                                </div>
                            </div>
                        </div>

                        {/* IVR-specific metadata */}
                        {ivrDoc && (
                            <div className="border-t border-white/[0.06] pt-3 space-y-2">
                                <span className="text-[10px] text-white/35 font-mono uppercase tracking-wider">
                                    IVR Details
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    {ivrDoc.status && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Status</span>
                                            <p className="text-white/80 mt-0.5 capitalize">{ivrDoc.status}</p>
                                        </div>
                                    )}
                                    {ivrDoc.trust_level && (
                                        <div className="bg-white/5 rounded-lg p-2">
                                            <span className="text-white/30">Trust Level</span>
                                            <p className="text-white/80 mt-0.5 capitalize">
                                                {ivrDoc.trust_level.replace(/_/g, " ")}
                                            </p>
                                        </div>
                                    )}
                                    {ivrDoc.people_affected != null && (
                                        <div className="bg-white/5 rounded-lg p-2 col-span-2">
                                            <span className="text-white/30">People Affected</span>
                                            <p className="text-white/80 mt-0.5">
                                                {ivrDoc.people_affected ?? "Unknown"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </GlassCard>
            </div>
        );
    }

    /* ═════════════════  FALLBACK — Social / Other  ═════════════════ */
    if (!report) return null;

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] animate-scale-in">
            <GlassCard variant="strong" className="overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📡</span>
                        <div>
                            <h3 className="font-semibold text-white text-sm">
                                {report.disaster_type}
                            </h3>
                            <p className="text-[10px] text-white/40 font-mono">
                                {new Date(report.timestamp).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${report.severity === "High"
                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                : report.severity === "Medium"
                                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                    : "bg-green-500/20 text-green-400 border-green-500/30"
                                }`}
                        >
                            {report.severity}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    <p className="text-sm text-white/70 leading-relaxed">
                        {report.text}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/35">Confidence</span>
                            <p className="text-white/90 mt-0.5">
                                {((report.confidence ?? 0) * 100).toFixed(1)}%
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/35">Source</span>
                            <p className="text-white/90 mt-0.5 capitalize">
                                {report.source}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/35">Latitude</span>
                            <p className="text-white/90 mt-0.5">
                                {report.latitude.toFixed(4)}
                            </p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2">
                            <span className="text-white/35">Longitude</span>
                            <p className="text-white/90 mt-0.5">
                                {report.longitude.toFixed(4)}
                            </p>
                        </div>
                    </div>
                    {report.transcription && (
                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
                            <span className="text-[10px] text-blue-400/60 font-mono uppercase tracking-wider">
                                Audio Transcription
                            </span>
                            <p className="text-xs text-white/60 mt-1 italic">
                                "{report.transcription}"
                            </p>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

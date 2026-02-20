import type { MapReport } from "@/types/disaster";

interface GlobeTooltipProps {
    report: MapReport;
    position: { x: number; y: number };
}

const GlobeTooltip = ({ report, position }: GlobeTooltipProps) => {
    const isIVR = report.source === "ivr";

    return (
        <div
            className="fixed z-[9999] pointer-events-none animate-fade-in"
            style={{
                left: position.x + 16,
                top: position.y - 20,
            }}
        >
            <div className="glass-strong rounded-xl px-4 py-3 min-w-[220px] max-w-[300px] border border-white/15">
                {isIVR ? (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📞</span>
                            <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">
                                IVR Report
                            </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-white/50">Reporter</span>
                                <span className="text-white/90 font-mono">
                                    {report.reporter_type || "Citizen"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Coordinates</span>
                                <span className="text-white/90 font-mono">
                                    {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Time</span>
                                <span className="text-white/90 font-mono">
                                    {new Date(report.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                            {report.transcription && (
                                <p className="text-white/60 mt-1 italic border-t border-white/10 pt-1.5">
                                    "{report.transcription.slice(0, 80)}..."
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{
                                    backgroundColor:
                                        report.severity === "High"
                                            ? "#e53e3e"
                                            : report.severity === "Medium"
                                                ? "#ecc94b"
                                                : "#38a169",
                                }}
                            />
                            <span className="text-xs font-semibold text-white/90">
                                {report.disaster_type}
                            </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-white/50">Severity</span>
                                <span
                                    className={`font-mono font-semibold ${report.severity === "High"
                                            ? "text-red-400"
                                            : report.severity === "Medium"
                                                ? "text-yellow-400"
                                                : "text-green-400"
                                        }`}
                                >
                                    {report.severity}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Confidence</span>
                                <span className="text-white/90 font-mono">
                                    {((report.confidence ?? 0) * 100).toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Source</span>
                                <span className="text-white/90 font-mono capitalize">
                                    {report.source}
                                </span>
                            </div>
                            {report.source_count !== undefined && (
                                <div className="flex justify-between">
                                    <span className="text-white/50">Sources</span>
                                    <span className="text-white/90 font-mono">
                                        {report.source_count}
                                    </span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GlobeTooltip;

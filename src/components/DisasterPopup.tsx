import { Disaster } from "@/types/disaster";
import { X } from "lucide-react";

interface DisasterPopupProps {
  disaster: Disaster;
  onClose: () => void;
}

const severityStyles: Record<string, string> = {
  High: "bg-primary/20 text-primary border-primary/30",
  Medium: "bg-warning/20 text-warning border-warning/30",
  Low: "bg-safe/20 text-safe border-safe/30",
};

const typeIcons: Record<string, string> = {
  Earthquake: "🌍",
  Flood: "🌊",
  Fire: "🔥",
  Cyclone: "🌀",
};

const DisasterPopup = ({ disaster, onClose }: DisasterPopupProps) => {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] animate-scale-in">
      <div className="glass-strong rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeIcons[disaster.disasterType]}</span>
            <div>
              <h3 className="font-semibold text-foreground">
                {disaster.disasterType}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {new Date(disaster.timestamp).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${severityStyles[disaster.severity]}`}
            >
              {disaster.severity}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-2 gap-px bg-border/30">
          <div className="relative">
            <img
              src={disaster.beforeImage}
              alt="Before"
              className="w-full h-32 object-cover"
            />
            <span className="absolute bottom-1 left-1 text-[10px] font-mono bg-background/80 px-1.5 py-0.5 rounded text-muted-foreground">
              BEFORE
            </span>
          </div>
          <div className="relative">
            <img
              src={disaster.afterImage}
              alt="After"
              className="w-full h-32 object-cover"
            />
            <span className="absolute bottom-1 left-1 text-[10px] font-mono bg-background/80 px-1.5 py-0.5 rounded text-muted-foreground">
              AFTER
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="p-4">
          <p className="text-sm text-secondary-foreground leading-relaxed">
            {disaster.description}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span>LAT {disaster.latitude.toFixed(4)}</span>
            <span className="text-border">|</span>
            <span>LNG {disaster.longitude.toFixed(4)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisasterPopup;

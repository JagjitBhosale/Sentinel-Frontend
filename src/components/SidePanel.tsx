import { useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Activity,
  AlertTriangle,
  Flame,
  Droplets,
  Globe,
  RotateCw,
} from "lucide-react";
import { Disaster, DisasterType } from "@/types/disaster";
import StatsCard from "./StatsCard";

interface SidePanelProps {
  disasters: Disaster[];
  isOpen: boolean;
  onToggle: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  filterType: DisasterType | "All";
  onFilterChange: (type: DisasterType | "All") => void;
  onDisasterSelect: (disaster: Disaster) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  Earthquake: <Globe className="w-3.5 h-3.5" />,
  Flood: <Droplets className="w-3.5 h-3.5" />,
  Fire: <Flame className="w-3.5 h-3.5" />,
  Cyclone: <RotateCw className="w-3.5 h-3.5" />,
};

const SidePanel = ({
  disasters,
  isOpen,
  onToggle,
  autoRotate,
  onToggleAutoRotate,
  filterType,
  onFilterChange,
  onDisasterSelect,
}: SidePanelProps) => {
  const stats = useMemo(() => {
    const total = disasters.length;
    const high = disasters.filter((d) => d.severity === "High").length;
    const medium = disasters.filter((d) => d.severity === "Medium").length;
    const low = disasters.filter((d) => d.severity === "Low").length;
    return { total, high, medium, low };
  }, [disasters]);

  const filterOptions: (DisasterType | "All")[] = [
    "All",
    "Earthquake",
    "Flood",
    "Fire",
    "Cyclone",
  ];

  const severityDot: Record<string, string> = {
    High: "bg-primary",
    Medium: "bg-warning",
    Low: "bg-safe",
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 glass rounded-lg p-2 hover:bg-accent transition-colors"
      >
        {isOpen ? (
          <ChevronRight className="w-5 h-5 text-foreground" />
        ) : (
          <ChevronLeft className="w-5 h-5 text-foreground" />
        )}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 z-40 glass-strong transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border/40">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-marker" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                DisasterSphere
              </h2>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              GLOBAL MONITORING SYSTEM
            </p>
          </div>

          {/* Stats */}
          <div className="p-4 grid grid-cols-2 gap-2">
            <StatsCard
              label="Total"
              value={stats.total}
              icon={<Activity className="w-3.5 h-3.5" />}
            />
            <StatsCard
              label="Critical"
              value={stats.high}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              variant="danger"
            />
            <StatsCard
              label="Warning"
              value={stats.medium}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              variant="warning"
            />
            <StatsCard
              label="Low Risk"
              value={stats.low}
              icon={<Activity className="w-3.5 h-3.5" />}
              variant="safe"
            />
          </div>

          {/* Controls */}
          <div className="px-4 pb-3 space-y-3">
            {/* Filter */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-1.5 block">
                Filter by Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => onFilterChange(type)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      filterType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Auto-Rotate */}
            <button
              onClick={onToggleAutoRotate}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                autoRotate
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-accent text-muted-foreground"
              }`}
            >
              <span className="font-mono uppercase tracking-wider">Auto Rotation</span>
              <span className={`w-2 h-2 rounded-full ${autoRotate ? "bg-primary" : "bg-muted-foreground/30"}`} />
            </button>
          </div>

          {/* Disaster List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mb-2 block">
              Active Events ({disasters.length})
            </label>
            <div className="space-y-1.5">
              {disasters.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onDisasterSelect(d)}
                  className="w-full text-left p-2.5 rounded-lg bg-accent/50 hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot[d.severity]}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {typeIcons[d.disasterType]}
                        <span className="text-xs font-medium text-foreground truncate">
                          {d.disasterType}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {d.description.slice(0, 60)}...
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidePanel;

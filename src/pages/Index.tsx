import { useState, useCallback, useMemo, useEffect } from "react";
import GlobeViewer from "@/components/GlobeViewer";
import SidePanel from "@/components/SidePanel";
import DisasterPopup from "@/components/DisasterPopup";
import { mockDisasters } from "@/data/mockDisasters";
import { Disaster, DisasterType } from "@/types/disaster";

const Index = () => {
  const [selectedDisaster, setSelectedDisaster] = useState<Disaster | null>(null);
  const [hoveredDisaster, setHoveredDisaster] = useState<Disaster | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [filterType, setFilterType] = useState<DisasterType | "All">("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const filteredDisasters = useMemo(
    () =>
      filterType === "All"
        ? mockDisasters
        : mockDisasters.filter((d) => d.disasterType === filterType),
    [filterType]
  );

  const handleDisasterClick = useCallback((disaster: Disaster) => {
    setSelectedDisaster(disaster);
    setAutoRotate(false);
  }, []);

  const handleDisasterHover = useCallback((disaster: Disaster | null) => {
    setHoveredDisaster(disaster);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-transparent border-b-primary/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
        <div className="text-center flex flex-col items-center">
          <img
            src="/SentinalLogo.png"
            alt="Sentinel Logo"
            className="w-16 h-16 rounded-full object-cover mb-4"
          />
          <h1 className="text-lg font-bold tracking-widest uppercase text-foreground">
            Sentinel
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            INITIALIZING GLOBAL MONITORING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      {/* Globe */}
      <GlobeViewer
        disasters={filteredDisasters}
        onDisasterClick={handleDisasterClick}
        onDisasterHover={handleDisasterHover}
        autoRotate={autoRotate}
        selectedDisaster={selectedDisaster}
      />

      {/* Top-left branding */}
      <div className="fixed top-4 left-4 z-30 glass rounded-lg px-4 py-2.5">
        <div className="flex items-center gap-2">
          <img
            src="/SentinalLogo.png"
            alt="Sentinel Logo"
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-foreground">
            Sentinel
          </span>
        </div>
        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
          {filteredDisasters.length} ACTIVE EVENTS • LIVE MONITORING
        </p>
      </div>

      {/* Hover tooltip */}
      {hoveredDisaster && !selectedDisaster && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 glass rounded-lg px-4 py-2 animate-fade-in">
          <div className="flex items-center gap-3 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  hoveredDisaster.severity === "High"
                    ? "hsl(var(--primary))"
                    : hoveredDisaster.severity === "Medium"
                    ? "hsl(var(--warning))"
                    : "hsl(var(--safe))",
              }}
            />
            <span className="font-medium text-foreground">
              {hoveredDisaster.disasterType}
            </span>
            <span className="text-muted-foreground text-xs font-mono">
              {hoveredDisaster.severity}
            </span>
          </div>
        </div>
      )}

      {/* Selected disaster popup */}
      {selectedDisaster && (
        <DisasterPopup
          disaster={selectedDisaster}
          onClose={() => setSelectedDisaster(null)}
        />
      )}

      {/* Side Panel */}
      <SidePanel
        disasters={filteredDisasters}
        isOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
        autoRotate={autoRotate}
        onToggleAutoRotate={() => setAutoRotate(!autoRotate)}
        filterType={filterType}
        onFilterChange={setFilterType}
        onDisasterSelect={handleDisasterClick}
      />
    </div>
  );
};

export default Index;

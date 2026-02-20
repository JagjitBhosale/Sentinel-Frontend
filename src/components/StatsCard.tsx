interface StatsCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  variant?: "default" | "danger" | "warning" | "safe";
}

const variantStyles: Record<string, string> = {
  default: "border-border/50",
  danger: "border-primary/30",
  warning: "border-warning/30",
  safe: "border-safe/30",
};

const valueStyles: Record<string, string> = {
  default: "text-foreground",
  danger: "text-primary",
  warning: "text-warning",
  safe: "text-safe",
};

const StatsCard = ({ label, value, icon, variant = "default" }: StatsCardProps) => {
  return (
    <div
      className={`glass rounded-lg p-3 border ${variantStyles[variant]} transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${valueStyles[variant]}`}>{value}</p>
    </div>
  );
};

export default StatsCard;

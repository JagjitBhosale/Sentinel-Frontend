import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface MetricCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    variant?: "default" | "danger" | "warning" | "info" | "safe";
    suffix?: string;
}

const variantStyles: Record<string, string> = {
    default: "border-white/10",
    danger: "border-red-500/30 glow-red",
    warning: "border-yellow-500/30 glow-yellow",
    info: "border-blue-500/30",
    safe: "border-green-500/30 glow-green",
};

const valueColors: Record<string, string> = {
    default: "text-white",
    danger: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
    safe: "text-green-400",
};

const MetricCard = ({
    label,
    value,
    icon,
    variant = "default",
    suffix,
}: MetricCardProps) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        const start = prevValue.current;
        const end = value;
        const duration = 800;
        const startTime = Date.now();

        const animate = () => {
            const progress = Math.min((Date.now() - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setDisplayValue(Math.round(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
        prevValue.current = end;
    }, [value]);

    return (
        <div
            className={cn(
                "glass rounded-xl p-4 border transition-all duration-300 hover:scale-[1.03]",
                variantStyles[variant]
            )}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-white/50">{icon}</span>
                <span className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-mono">
                    {label}
                </span>
            </div>
            <p className={cn("text-3xl font-bold font-mono", valueColors[variant])}>
                {displayValue.toLocaleString()}
                {suffix && (
                    <span className="text-sm text-white/40 ml-1">{suffix}</span>
                )}
            </p>
        </div>
    );
};

export default MetricCard;

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    variant?: "default" | "strong" | "critical";
    glow?: boolean;
    onClick?: () => void;
}

const GlassCard = ({
    children,
    className,
    variant = "default",
    glow = false,
    onClick,
}: GlassCardProps) => {
    const base =
        variant === "strong"
            ? "glass-strong"
            : variant === "critical"
                ? "glass-strong border-red-500/30"
                : "glass";

    return (
        <div
            onClick={onClick}
            className={cn(
                base,
                "rounded-2xl transition-all duration-300",
                glow && "glow-red",
                onClick && "cursor-pointer hover:scale-[1.01]",
                className
            )}
        >
            {children}
        </div>
    );
};

export default GlassCard;

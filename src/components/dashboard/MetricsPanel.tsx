import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    Satellite,
    Rss,
    type LucideIcon,
} from "lucide-react";
import type { DashboardStats } from "@/types/disaster";

interface MetricsPanelProps {
    stats: DashboardStats | undefined;
    reportCount: number;
    satEventCount: number;
    socialCount: number;
}

interface MetricItem {
    label: string;
    value: number;
    icon: LucideIcon;
    variant: "default" | "danger" | "info" | "warning";
}

const variantStyles: Record<string, string> = {
    default: "text-white/80",
    danger: "text-red-400",
    info: "text-blue-400",
    warning: "text-yellow-400",
};

const variantGlow: Record<string, string> = {
    default: "",
    danger: "glow-red",
    info: "glow-blue",
    warning: "glow-yellow",
};

const MetricsPanel = ({
    stats,
    reportCount,
    satEventCount,
    socialCount,
}: MetricsPanelProps) => {
    const metrics: MetricItem[] = [
        {
            label: "Total Reports",
            value: stats?.total_reports ?? reportCount,
            icon: Activity,
            variant: "default",
        },
        {
            label: "Critical",
            value: stats?.critical_alerts ?? 0,
            icon: AlertTriangle,
            variant: "danger",
        },
        {
            label: "Sat Events",
            value: stats?.active_satellite_events ?? satEventCount,
            icon: Satellite,
            variant: "info",
        },
        {
            label: "Social 24h",
            value: stats?.social_media_posts_24h ?? socialCount,
            icon: Rss,
            variant: "warning",
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-20 right-4 z-30 w-[180px] space-y-2"
        >
            {metrics.map((m, i) => {
                const Icon = m.icon;
                const isCritical = m.variant === "danger" && m.value > 0;
                return (
                    <motion.div
                        key={m.label}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`glass rounded-xl px-3 py-3 ${
                            isCritical ? "glow-red neon-border-critical" : ""
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Icon
                                className={`w-3.5 h-3.5 ${
                                    variantStyles[m.variant]
                                }`}
                            />
                            <span className="text-[9px] font-mono text-white/35 uppercase tracking-wider">
                                {m.label}
                            </span>
                        </div>
                        <p
                            className={`text-xl font-bold font-mono ${
                                variantStyles[m.variant]
                            }`}
                        >
                            {m.value.toLocaleString()}
                        </p>
                    </motion.div>
                );
            })}
        </motion.div>
    );
};

export default MetricsPanel;

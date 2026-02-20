import { toast } from "sonner";
import type { WebSocketPost } from "@/types/disaster";

const severityEmoji: Record<string, string> = {
    High: "🔴",
    Medium: "🟡",
    Low: "🟢",
};

export function showDisasterToast(post: WebSocketPost) {
    const emoji = severityEmoji[post.severity || "Low"] || "⚪";
    toast(
        `${emoji} ${post.disaster_type || "ALERT"} — ${post.severity || "Unknown"} Severity`,
        {
            description: post.text?.slice(0, 120) || "New disaster report detected",
            duration: 6000,
            style: {
                background: "rgba(10, 10, 30, 0.92)",
                backdropFilter: "blur(20px)",
                border: post.severity === "High"
                    ? "1px solid rgba(211, 47, 47, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.12)",
                color: "#e2e8f0",
                boxShadow: post.severity === "High"
                    ? "0 0 30px rgba(211, 47, 47, 0.2)"
                    : "0 8px 32px rgba(0, 0, 0, 0.4)",
            },
        }
    );
}

import { useEffect, useRef, useState, useCallback } from "react";
import type { WebSocketPost } from "@/types/disaster";

const WS_URL = "ws://localhost:8000/ws/feed";
const RECONNECT_BASE = 3000;
const RECONNECT_MAX = 30000;
const MAX_POSTS = 50;

interface UseWebSocketReturn {
    posts: WebSocketPost[];
    latestDisaster: WebSocketPost | null;
    connected: boolean;
}

/** Normalize a backend feed post (nested) into a flat WebSocketPost */
function toWebSocketPost(raw: Record<string, any>): WebSocketPost | null {
    if (!raw || !raw.id) return null;

    // Backend posts may be flat OR nested — handle both shapes
    const text =
        raw.text ?? raw.content?.text ?? "";
    const isDis =
        raw.is_disaster ?? raw.analysis?.is_disaster ?? false;
    const dtype =
        raw.disaster_type ?? raw.analysis?.disaster_type;
    const conf =
        raw.confidence ?? raw.analysis?.confidence;
    const lat =
        raw.latitude ?? raw.location?.lat ?? raw.lat;
    const lng =
        raw.longitude ?? raw.location?.lng ?? raw.lng;
    const sev =
        raw.severity ?? raw.analysis?.urgency;
    const ts =
        raw.timestamp ?? new Date().toISOString();

    return { id: raw.id, text, is_disaster: isDis, disaster_type: dtype, severity: sev, confidence: conf, latitude: lat, longitude: lng, timestamp: ts };
}

export function useWebSocket(): UseWebSocketReturn {
    const [posts, setPosts] = useState<WebSocketPost[]>([]);
    const [latestDisaster, setLatestDisaster] = useState<WebSocketPost | null>(null);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
    const retriesRef = useRef(0);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setConnected(true);
                retriesRef.current = 0; // reset backoff on success
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    // Backend sends { type: "new_post", post: {...} }
                    const raw =
                        msg && msg.type === "new_post" && msg.post ? msg.post : msg;
                    const post = toWebSocketPost(raw);
                    if (!post) return;
                    setPosts((prev) => [post, ...prev].slice(0, MAX_POSTS));
                    if (post.is_disaster) {
                        setLatestDisaster(post);
                    }
                } catch {
                    // ignore malformed messages
                }
            };

            ws.onclose = () => {
                setConnected(false);
                const delay = Math.min(RECONNECT_BASE * 2 ** retriesRef.current, RECONNECT_MAX);
                retriesRef.current += 1;
                reconnectTimer.current = setTimeout(connect, delay);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            const delay = Math.min(RECONNECT_BASE * 2 ** retriesRef.current, RECONNECT_MAX);
            retriesRef.current += 1;
            reconnectTimer.current = setTimeout(connect, delay);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, [connect]);

    return { posts, latestDisaster, connected };
}

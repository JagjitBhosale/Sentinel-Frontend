import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Filter,
    TrendingUp,
    Hash,
    AlertTriangle,
    Eye,
    Heart,
    Share2,
    MessageCircle,
    ChevronDown,
    Shield,
    Globe,
    X,
} from "lucide-react";
import { fetchFeed, fetchPlatforms, fetchTrending, type FeedParams } from "@/services/api";
import type { FeedPost, TrendingHashtag } from "@/types/disaster";
import { useWebSocket } from "@/hooks/useWebSocket";
import GlassCard from "@/components/ui/GlassCard";

/* ── Platform badge colour map ── */
const platformColor: Record<string, string> = {
    twitter: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    reddit: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    news: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    telegram: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    instagram: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

const urgencyColor: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-green-400",
};

/* ── FeedCard Component ── */
const FeedCard = ({
    post,
    onClick,
}: {
    post: FeedPost;
    onClick: (p: FeedPost) => void;
}) => {
    const text = post.content?.text || post.content?.headline || post.content?.title || "";
    const isDis = post.analysis?.is_disaster;
    const conf = post.analysis?.confidence ?? 0;
    const urg = post.analysis?.urgency?.toLowerCase() ?? "low";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={() => onClick(post)}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                isDis
                    ? "bg-red-500/[0.04] border-red-500/20 hover:border-red-500/40"
                    : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
            }`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                    {post.author?.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white/80 truncate">
                            {post.author?.name ?? "Unknown"}
                        </span>
                        {post.author?.verified && (
                            <Shield className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        )}
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">
                        @{post.author?.handle ?? "unknown"} •{" "}
                        {new Date(post.timestamp).toLocaleString()}
                    </span>
                </div>
                <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                        platformColor[post.platform] ?? "bg-white/10 text-white/50 border-white/10"
                    }`}
                >
                    {post.platform}
                </span>
            </div>

            {/* Body */}
            <p className="text-sm text-white/60 leading-relaxed line-clamp-3 mb-3">
                {text}
            </p>

            {/* Tags */}
            {post.content?.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.content.hashtags.slice(0, 5).map((h) => (
                        <span
                            key={h}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40"
                        >
                            #{h}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[10px] font-mono text-white/30">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.engagement?.likes ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                        <Share2 className="w-3 h-3" /> {post.engagement?.shares ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.engagement?.comments ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {post.engagement?.views ?? 0}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isDis && (
                        <span className={`font-semibold ${urgencyColor[urg] ?? "text-white/40"}`}>
                            {post.analysis.disaster_type}
                        </span>
                    )}
                    {isDis && (
                        <span className="text-white/50">
                            {(conf * 100).toFixed(0)}%
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

/* ── Main SocialPage ── */
const SocialPage = () => {
    const [params, setParams] = useState<FeedParams>({ limit: 40 });
    const [search, setSearch] = useState("");
    const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const { data: feed = [], isLoading } = useQuery({
        queryKey: ["social-feed", params],
        queryFn: () => fetchFeed(params),
        refetchInterval: 30_000,
    });

    const { data: platforms = {} } = useQuery({
        queryKey: ["platforms"],
        queryFn: () => fetchPlatforms(),
    });

    const { data: trending = [] } = useQuery({
        queryKey: ["trending"],
        queryFn: () => fetchTrending(12),
        refetchInterval: 60_000,
    });

    const { posts: livePosts, connected } = useWebSocket();

    /* ── Combine & filter ── */
    const visibleFeed = useMemo(() => {
        let list = [...feed];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (p) =>
                    (p.content?.text ?? "").toLowerCase().includes(q) ||
                    (p.content?.headline ?? "").toLowerCase().includes(q) ||
                    (p.author?.name ?? "").toLowerCase().includes(q)
            );
        }
        return list;
    }, [feed, search]);

    const disasterCount = visibleFeed.filter((p) => p.analysis?.is_disaster).length;

    return (
        <div className="min-h-screen bg-[#050816] pt-20">
            <div className="max-w-screen-2xl mx-auto px-6 py-6 flex gap-6">
                {/* ── Main Feed ── */}
                <div className="flex-1 min-w-0">
                    {/* Search & Filter bar */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search posts, authors, keywords..."
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2.5 pl-10 pr-4 text-sm text-white/80 placeholder:text-white/25 font-mono focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className={`glass rounded-lg p-2.5 hover:bg-white/10 transition-colors ${
                                filterOpen ? "bg-white/10" : ""
                            }`}
                        >
                            <Filter className="w-4 h-4 text-white/60" />
                        </button>
                    </div>

                    {/* Filter chips */}
                    <AnimatePresence>
                        {filterOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-4"
                            >
                                <div className="flex flex-wrap gap-2 pb-4 border-b border-white/[0.06]">
                                    <button
                                        onClick={() =>
                                            setParams((p) => ({
                                                ...p,
                                                disasters_only: !p.disasters_only,
                                            }))
                                        }
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                            params.disasters_only
                                                ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                : "bg-white/5 text-white/40 border-white/10"
                                        }`}
                                    >
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        Disasters Only
                                    </button>

                                    {Object.keys(platforms).map((plat) => (
                                        <button
                                            key={plat}
                                            onClick={() =>
                                                setParams((p) => ({
                                                    ...p,
                                                    platform: p.platform === plat ? undefined : plat,
                                                }))
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                                params.platform === plat
                                                    ? platformColor[plat] ?? "bg-white/15 text-white/70 border-white/20"
                                                    : "bg-white/5 text-white/40 border-white/10"
                                            }`}
                                        >
                                            {plat}
                                            <span className="ml-1 opacity-50">
                                                ({platforms[plat]})
                                            </span>
                                        </button>
                                    ))}

                                    {["critical", "high", "medium", "low"].map((urg) => (
                                        <button
                                            key={urg}
                                            onClick={() =>
                                                setParams((p) => ({
                                                    ...p,
                                                    urgency: p.urgency === urg ? undefined : urg,
                                                }))
                                            }
                                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                                params.urgency === urg
                                                    ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                                                    : "bg-white/5 text-white/40 border-white/10"
                                            }`}
                                        >
                                            {urg}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-4 text-xs font-mono text-white/40">
                        <span>{visibleFeed.length} posts</span>
                        <span className="text-red-400/70">{disasterCount} disaster-related</span>
                        <span className={connected ? "text-green-400/70" : "text-red-400/70"}>
                            {connected ? "● LIVE" : "○ Disconnected"}
                        </span>
                    </div>

                    {/* Feed list */}
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="h-32 rounded-xl bg-white/[0.03] animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {visibleFeed.map((post) => (
                                    <FeedCard
                                        key={post.id}
                                        post={post}
                                        onClick={setSelectedPost}
                                    />
                                ))}
                            </AnimatePresence>
                            {visibleFeed.length === 0 && (
                                <p className="text-center text-white/20 font-mono text-sm py-12">
                                    No posts found.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Right Sidebar ── */}
                <div className="w-80 flex-shrink-0 space-y-4 hidden xl:block">
                    {/* Live pulse */}
                    <GlassCard className="p-4">
                        <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mb-3">
                            Live Feed Pulse
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {livePosts.length === 0 && (
                                <p className="text-[10px] text-white/20 font-mono text-center py-4">
                                    Waiting for live data...
                                </p>
                            )}
                            {livePosts.slice(0, 8).map((p, i) => (
                                <div
                                    key={p.id || i}
                                    className={`p-2 rounded-lg border text-xs ${
                                        p.is_disaster
                                            ? "bg-red-500/5 border-red-500/15"
                                            : "bg-white/[0.02] border-white/5"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                p.is_disaster ? "bg-red-400" : "bg-white/20"
                                            }`}
                                        />
                                        <span className="text-[10px] font-mono text-white/30">
                                            {p.disaster_type || "safe"} •{" "}
                                            {new Date(p.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <p className="text-white/50 line-clamp-2">{p.text}</p>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Trending */}
                    <GlassCard className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                                Trending
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {trending.map((t: TrendingHashtag) => (
                                <button
                                    key={t.hashtag}
                                    onClick={() => setSearch(t.hashtag)}
                                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs"
                                >
                                    <span className="flex items-center gap-2 text-white/60">
                                        <Hash className="w-3 h-3 text-white/20" />
                                        {t.hashtag}
                                    </span>
                                    <span className="text-white/30 font-mono">{t.count}</span>
                                </button>
                            ))}
                            {trending.length === 0 && (
                                <p className="text-[10px] text-white/20 font-mono text-center py-4">
                                    No trending data
                                </p>
                            )}
                        </div>
                    </GlassCard>

                    {/* Platforms */}
                    <GlassCard className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Globe className="w-3.5 h-3.5 text-blue-400" />
                            <h3 className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
                                Platforms
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {Object.entries(platforms).map(([plat, count]) => (
                                <div
                                    key={plat}
                                    className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-white/[0.02] text-xs"
                                >
                                    <span className="text-white/60 capitalize">{plat}</span>
                                    <span className="text-white/30 font-mono">{count}</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ── Post Detail Modal ── */}
            <AnimatePresence>
                {selectedPost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setSelectedPost(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[520px] max-w-[90vw] max-h-[80vh] overflow-y-auto glass-strong rounded-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/60">
                                        {selectedPost.author?.name?.[0] ?? "?"}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-white">
                                                {selectedPost.author?.name}
                                            </span>
                                            {selectedPost.author?.verified && (
                                                <Shield className="w-3.5 h-3.5 text-blue-400" />
                                            )}
                                            <span
                                                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                                    platformColor[selectedPost.platform] ?? "bg-white/10 text-white/50 border-white/10"
                                                }`}
                                            >
                                                {selectedPost.platform}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-white/30 font-mono">
                                            @{selectedPost.author?.handle} •{" "}
                                            {new Date(selectedPost.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <p className="text-sm text-white/70 leading-relaxed">
                                    {selectedPost.content?.text ||
                                        selectedPost.content?.headline ||
                                        selectedPost.content?.title}
                                </p>

                                {selectedPost.content?.hashtags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedPost.content.hashtags.map((h) => (
                                            <span
                                                key={h}
                                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-white/40"
                                            >
                                                #{h}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Engagement */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: "Likes", icon: Heart, val: selectedPost.engagement?.likes },
                                        { label: "Shares", icon: Share2, val: selectedPost.engagement?.shares },
                                        { label: "Comments", icon: MessageCircle, val: selectedPost.engagement?.comments },
                                        { label: "Views", icon: Eye, val: selectedPost.engagement?.views },
                                    ].map((m) => (
                                        <div
                                            key={m.label}
                                            className="bg-white/5 rounded-lg p-2.5 text-center"
                                        >
                                            <m.icon className="w-3.5 h-3.5 mx-auto text-white/30 mb-1" />
                                            <p className="text-xs font-mono text-white/80">
                                                {m.val ?? 0}
                                            </p>
                                            <p className="text-[9px] text-white/30">{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Analysis */}
                                {selectedPost.analysis && (
                                    <div className={`rounded-lg p-4 border ${
                                        selectedPost.analysis.is_disaster
                                            ? "bg-red-500/5 border-red-500/15"
                                            : "bg-green-500/5 border-green-500/15"
                                    }`}>
                                        <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
                                            AI Analysis
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                            <div>
                                                <span className="text-white/35">Disaster</span>
                                                <p className={selectedPost.analysis.is_disaster ? "text-red-400" : "text-green-400"}>
                                                    {selectedPost.analysis.is_disaster ? "Yes" : "No"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-white/35">Type</span>
                                                <p className="text-white/70">
                                                    {selectedPost.analysis.disaster_type || "N/A"}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-white/35">Confidence</span>
                                                <p className="text-white/70">
                                                    {(selectedPost.analysis.confidence * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-white/35">Urgency</span>
                                                <p className={urgencyColor[selectedPost.analysis.urgency?.toLowerCase()] ?? "text-white/70"}>
                                                    {selectedPost.analysis.urgency}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-white/35">Sentiment</span>
                                                <p className="text-white/70">
                                                    {selectedPost.analysis.sentiment}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-white/35">Credibility</span>
                                                <p className="text-white/70">
                                                    {(selectedPost.analysis.credibility_score * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Location */}
                                {selectedPost.location && (
                                    <div className="bg-white/5 rounded-lg p-3">
                                        <h4 className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                                            Location
                                        </h4>
                                        <p className="text-xs text-white/70">
                                            {selectedPost.location.name}
                                            {selectedPost.location.state && `, ${selectedPost.location.state}`}
                                        </p>
                                        <p className="text-[10px] font-mono text-white/30 mt-0.5">
                                            {selectedPost.location.lat.toFixed(4)},{" "}
                                            {selectedPost.location.lng.toFixed(4)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SocialPage;

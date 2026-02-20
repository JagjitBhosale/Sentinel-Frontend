import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldAlert,
    Plus,
    Pencil,
    Trash2,
    X,
    Check,
    AlertTriangle,
    MapPin,
    Calendar,
    Clock,
} from "lucide-react";
import {
    onAlerts,
    createAlert,
    updateAlert,
    deleteAlert,
} from "@/services/firebase";
import type { FirebaseAlert } from "@/types/disaster";
import GlassCard from "@/components/ui/GlassCard";

const sevOptions = ["critical", "high", "medium", "low"] as const;
const statusOptions = ["active", "resolved", "expired"] as const;

const sevBadge: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const statusBadge: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    resolved: "bg-white/10 text-white/50 border-white/10",
    expired: "bg-red-500/10 text-red-400/50 border-red-500/10",
};

/* ── Empty form ── */
const emptyForm = {
    title: "",
    description: "",
    severity: "medium" as string,
    district: "",
    expires_at: "",
};

const AlertsPage = () => {
    const [alerts, setAlerts] = useState<FirebaseAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [filterSev, setFilterSev] = useState<string | null>(null);

    /* ── Firebase listener ── */
    useEffect(() => {
        setLoading(true);
        const unsub = onAlerts((docs) => {
            setAlerts(docs as FirebaseAlert[]);
            setLoading(false);
        });
        return unsub;
    }, []);

    /* ── Filtered list ── */
    const filtered = filterSev
        ? alerts.filter((a) => a.severity?.toLowerCase() === filterSev)
        : alerts;

    /* ── Open create form ── */
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setFormOpen(true);
    };

    /* ── Open edit form ── */
    const openEdit = (alert: FirebaseAlert) => {
        setForm({
            title: alert.title,
            description: alert.description,
            severity: alert.severity,
            district: alert.district,
            expires_at: alert.expires_at,
        });
        setEditingId(alert.id);
        setFormOpen(true);
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!form.title.trim() || !form.description.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await updateAlert(editingId, form);
            } else {
                await createAlert(form);
            }
            setFormOpen(false);
            setEditingId(null);
            setForm(emptyForm);
        } catch (err) {
            console.error("Alert save error:", err);
        }
        setSaving(false);
    };

    /* ── Delete ── */
    const handleDelete = async (id: string) => {
        try {
            await deleteAlert(id);
        } catch (err) {
            console.error("Alert delete error:", err);
        }
        setConfirmDeleteId(null);
    };

    return (
        <div className="min-h-screen bg-[#050816] pt-20">
            <div className="max-w-screen-xl mx-auto px-6 py-6">
                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-red-400" />
                            Admin Alerts
                        </h1>
                        <p className="text-xs text-white/30 font-mono mt-0.5">
                            Manage hazard alerts via Firebase •{" "}
                            {alerts.length} total
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono hover:bg-red-500/30 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Alert
                    </button>
                </div>

                {/* ── Severity filter ── */}
                <div className="flex gap-2 mb-6">
                    {sevOptions.map((sev) => (
                        <button
                            key={sev}
                            onClick={() =>
                                setFilterSev(filterSev === sev ? null : sev)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                                filterSev === sev
                                    ? sevBadge[sev]
                                    : "bg-white/[0.03] text-white/30 border-white/[0.06] hover:border-white/15"
                            }`}
                        >
                            {sev}
                        </button>
                    ))}
                    {filterSev && (
                        <button
                            onClick={() => setFilterSev(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono text-white/30 hover:text-white/50"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* ── Alerts Table/List ── */}
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-20 rounded-xl bg-white/[0.03] animate-pulse"
                            />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <ShieldAlert className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-white/20 font-mono text-sm">
                            No alerts found.
                        </p>
                        <p className="text-white/10 font-mono text-xs mt-1">
                            Create a new alert to get started.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((alert) => {
                                const sev = alert.severity?.toLowerCase() ?? "medium";
                                const st = alert.status?.toLowerCase() ?? "active";
                                return (
                                    <motion.div
                                        key={alert.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={`p-4 rounded-xl border transition-all ${
                                            sev === "critical"
                                                ? "bg-red-500/[0.03] border-red-500/15"
                                                : "bg-white/[0.02] border-white/[0.06]"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-sm font-semibold text-white/80 truncate">
                                                        {alert.title}
                                                    </h3>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex-shrink-0 ${
                                                            sevBadge[sev] ?? sevBadge.medium
                                                        }`}
                                                    >
                                                        {sev}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono border flex-shrink-0 ${
                                                            statusBadge[st] ?? statusBadge.active
                                                        }`}
                                                    >
                                                        {st}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/40 line-clamp-2">
                                                    {alert.description}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-white/25">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {alert.district || "—"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Expires:{" "}
                                                        {alert.expires_at
                                                            ? new Date(
                                                                  alert.expires_at
                                                              ).toLocaleDateString()
                                                            : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openEdit(alert)}
                                                    className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setConfirmDeleteId(alert.id)
                                                    }
                                                    className="p-2 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* ── Create / Edit Modal ── */}
            <AnimatePresence>
                {formOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setFormOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[480px] max-w-[90vw] glass-strong rounded-2xl"
                        >
                            <div className="flex items-center justify-between p-5 border-b border-white/10">
                                <h3 className="text-sm font-bold text-white">
                                    {editingId ? "Edit Alert" : "Create New Alert"}
                                </h3>
                                <button
                                    onClick={() => setFormOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.title}
                                        onChange={(e) =>
                                            setForm({ ...form, title: e.target.value })
                                        }
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white/80 placeholder:text-white/20 font-mono focus:outline-none focus:border-white/20"
                                        placeholder="Alert title"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
                                        Description *
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                description: e.target.value,
                                            })
                                        }
                                        rows={3}
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white/80 placeholder:text-white/20 font-mono focus:outline-none focus:border-white/20 resize-none"
                                        placeholder="Describe the hazard..."
                                    />
                                </div>

                                {/* Severity + District row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
                                            Severity
                                        </label>
                                        <select
                                            value={form.severity}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    severity: e.target.value,
                                                })
                                            }
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white/80 font-mono focus:outline-none focus:border-white/20 appearance-none"
                                        >
                                            {sevOptions.map((s) => (
                                                <option
                                                    key={s}
                                                    value={s}
                                                    className="bg-[#0a0f1e] text-white"
                                                >
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
                                            District
                                        </label>
                                        <input
                                            type="text"
                                            value={form.district}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    district: e.target.value,
                                                })
                                            }
                                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white/80 placeholder:text-white/20 font-mono focus:outline-none focus:border-white/20"
                                            placeholder="e.g. Mumbai"
                                        />
                                    </div>
                                </div>

                                {/* Expiry */}
                                <div>
                                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1 block">
                                        Expires At
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={form.expires_at}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                expires_at: e.target.value,
                                            })
                                        }
                                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 px-3 text-sm text-white/80 font-mono focus:outline-none focus:border-white/20"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setFormOpen(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-mono text-white/40 hover:text-white/60 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={
                                            saving ||
                                            !form.title.trim() ||
                                            !form.description.trim()
                                        }
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono hover:bg-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                        {saving
                                            ? "Saving..."
                                            : editingId
                                            ? "Update"
                                            : "Create"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Delete Confirmation ── */}
            <AnimatePresence>
                {confirmDeleteId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setConfirmDeleteId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[360px] glass-strong rounded-2xl p-6 text-center"
                        >
                            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-white mb-1">
                                Delete Alert?
                            </h3>
                            <p className="text-xs text-white/40 font-mono mb-5">
                                This action cannot be undone. The alert will be permanently
                                removed from Firebase.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-5 py-2 rounded-lg text-xs font-mono text-white/40 hover:text-white/60 border border-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDelete(confirmDeleteId)}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono hover:bg-red-500/30 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AlertsPage;

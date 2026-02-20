import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Globe,
    Rss,
    Phone,
    Satellite,
    ShieldAlert,
} from "lucide-react";

const navItems = [
    { to: "/command-center", label: "Command Center", icon: Globe },
    { to: "/social", label: "Social Intelligence", icon: Rss },
    { to: "/ivr", label: "IVR & GPS", icon: Phone },
    { to: "/satellite", label: "Satellite Detection", icon: Satellite },
    { to: "/alerts", label: "Admin Alerts", icon: ShieldAlert },
];

const Navbar = () => {
    const { pathname } = useLocation();

    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] h-14 w-[min(90%,1200px)] rounded-2xl overflow-hidden shadow-lg shadow-black/20">
            {/* Blurred glass background */}
            <div className="absolute inset-0 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl" />

            {/* Subtle inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />

            {/* Animated gradient orbs */}
            <div className="absolute -top-20 left-1/4 w-40 h-40 bg-red-500/[0.06] rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-16 right-1/3 w-32 h-32 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none" />

            <div className="relative h-full max-w-screen-2xl mx-auto px-6 flex items-center justify-between">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <img
                        src="/SentinalLogo.png"
                        alt="Sentinel Logo"
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-white font-mono">
                        Sentinel
                    </span>
                </div>

                {/* Nav Links */}
                <div className="flex items-center gap-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.to;
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className="relative"
                            >
                                <div
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all duration-300 ${
                                        isActive
                                            ? "text-white bg-white/[0.08]"
                                            : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="hidden lg:inline">{item.label}</span>
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="navbar-underline"
                                        className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-red-500 via-orange-500 to-red-500 rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </NavLink>
                        );
                    })}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-white/30">LIVE</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

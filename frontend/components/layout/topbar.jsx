"use client";

import { motion } from "framer-motion";
import { User, Wifi } from "lucide-react";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-8">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Connected</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800/80 ring-1 ring-zinc-700/50 transition-colors hover:bg-zinc-700/80"
          >
            <User className="h-4 w-4 text-zinc-400" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}

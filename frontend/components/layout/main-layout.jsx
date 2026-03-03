"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Video, Film, Settings, Sparkles } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/create", icon: Video, label: "Create" },
  { href: "/videos", icon: Film, label: "Videos" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MainLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar />
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 border-t border-zinc-800/50 bg-zinc-950/90 backdrop-blur-xl px-4 py-2 lg:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs transition-colors",
                  isActive ? "text-purple-400" : "text-zinc-500"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="min-h-[calc(100vh-4rem)] p-6 pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

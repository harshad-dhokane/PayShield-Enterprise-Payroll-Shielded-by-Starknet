"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  HelpCircle,
  LogOut,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payroll/batch", label: "Batch Payroll", icon: Zap },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/treasury", label: "Treasury", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest flex flex-col py-8 shadow-[20px_0_40px_rgba(0,0,0,0.4)] z-[60] font-headline">
      {/* Brand */}
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-on-primary-container" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-black text-primary-container tracking-tighter">
              PayShield
            </h1>
            <p className="text-[10px] text-on-surface-variant/40 tracking-[0.2em] uppercase mt-0.5">
              Mission Control
            </p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 duration-300 ease-in-out transition-all ${isActive
                  ? "bg-gradient-to-r from-primary-container/10 to-transparent text-primary-container border-r-2 border-primary-container"
                  : "text-on-surface/50 hover:text-on-surface hover:bg-surface-container-low"
                }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* CTA Button */}
      <div className="px-6 mb-6">
        <Link href="/payroll/batch">
          <button className="w-full brand-gradient text-on-primary-container font-bold py-3 px-4 rounded-md glow-orange text-xs uppercase tracking-widest active:scale-95 transition-transform duration-300">
            Run Payroll
          </button>
        </Link>
      </div>

      {/* Bottom Nav */}
      <div className="mt-auto border-t border-outline-variant/10 pt-6 flex flex-col gap-1">
        <button
          onClick={() => alert("PayShield 24/7 Enterprise Support Hub opening...")}
          className="flex items-center gap-3 text-on-surface/50 px-6 py-3 hover:text-on-surface hover:bg-surface-container-low duration-300 ease-in-out transition-all w-full text-left"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-sm font-medium tracking-tight">Support</span>
        </button>
        <button
          onClick={() => alert("Are you sure you want to completely sever your Cartridge connection? Continuing will erase your Local Master Key.")}
          className="flex items-center gap-3 text-on-surface/50 px-6 py-3 hover:text-on-surface hover:bg-surface-container-low duration-300 ease-in-out transition-all w-full text-left"
        >
          <LogOut className="w-5 h-5 text-error" />
          <span className="text-sm font-medium tracking-tight">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

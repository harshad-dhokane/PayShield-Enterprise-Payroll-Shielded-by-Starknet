"use client";
import { Search, Bell, Settings, LogOut, ChevronDown, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { getStarkZapTokens } from "@/lib/starkzap-sdk";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { address, wallet, disconnect, username, network } = useWallet();
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const tokens = getStarkZapTokens();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Active Live Wallet Balance Sync Context
  const [ethBalance, setEthBalance] = useState<string>("...");
  const [strkBalance, setStrkBalance] = useState<string>("...");

  useEffect(() => {
     if (wallet) {
        const fetchBalances = async () => {
           try {
              const [ethAmount, strkAmount] = await Promise.all([
                wallet.balanceOf(tokens.ETH),
                wallet.balanceOf(tokens.STRK),
              ]);

              setEthBalance(
                Number(ethAmount.toUnit()).toLocaleString("en-US", {
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })
              );
              setStrkBalance(
                Number(strkAmount.toUnit()).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              );
           } catch (e) {
              console.error("Balance fetch error:", e);
              setEthBalance("0.0000");
              setStrkBalance("0.00");
           }
        }
        fetchBalances();
     } else {
        setEthBalance("0.0000");
        setStrkBalance("0.00");
     }
  }, [wallet, tokens.ETH, tokens.STRK]);

  const shortenAddress = (addr: string | null) => {
    if (!addr) return "Not connected";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="w-full sticky top-0 z-50 flex justify-between items-center px-8 py-4 bg-surface-container-low font-headline tracking-tighter shadow-sm border-b border-outline-variant/5">
      <div className="flex items-center gap-6">
        <h2 className="text-2xl font-bold tracking-tighter text-on-surface">
          {title}
        </h2>
        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-on-surface-variant/40">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search accounts or data..."
            className="bg-surface-container-highest/50 border-none text-sm rounded-md pl-10 pr-4 py-2 w-64 focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface-variant/30 text-on-surface"
          />
        </div>
      </div>
      <div className="flex items-center gap-6 relative">
        
        {/* Treasury Live Sycn Balances */}
        {address && (
           <div className="hidden lg:flex items-center gap-4 mr-4">
             <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-[#1e40af]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#3b82f6] font-bold">Ξ</span>
                 </div>
                 <div className="flex flex-col text-right">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest leading-none mb-1">ETH</span>
                    <span className="text-xs text-on-surface font-black font-mono leading-none">{ethBalance}</span>
                 </div>
             </div>
             
             <div className="h-6 w-px bg-outline-variant/10" />

             <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
                    <span className="text-[10px] text-[#ef4444] font-bold tracking-tighter">STRK</span>
                 </div>
                 <div className="flex flex-col text-left">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest leading-none mb-1">STRK</span>
                    <span className="text-xs text-on-surface font-black font-mono leading-none">{strkBalance}</span>
                 </div>
             </div>
          </div>
        )}

        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-on-surface/60 hover:bg-surface-container-high transition-colors cursor-pointer active:scale-95 rounded-full"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          {isNotificationsOpen && (
             <div className="absolute right-0 mt-3 w-72 bg-surface-container-high border border-outline-variant/10 rounded-xl shadow-2xl py-2 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
               <div className="px-4 py-3 border-b border-outline-variant/10">
                 <p className="text-xs font-bold text-on-surface">Notifications</p>
               </div>
               <div className="p-4 flex flex-col items-center justify-center text-center gap-2">
                 <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center">
                   <Bell className="w-5 h-5 text-on-surface-variant/40" />
                 </div>
                 <p className="text-xs text-on-surface-variant font-medium mt-2">You&apos;re all caught up!</p>
                 <p className="text-[10px] text-on-surface-variant/60">No pending alerts or batch triggers.</p>
               </div>
             </div>
          )}
        </div>

        <Link href="/settings">
          <button className="p-2 text-on-surface/60 hover:bg-surface-container-high transition-colors cursor-pointer active:scale-95 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        </Link>
        
        {/* Profile Element Container */}
        <div className="relative ml-2" ref={profileRef}>
          <button 
             onClick={() => setIsProfileOpen(!isProfileOpen)}
             className="flex items-center gap-3 bg-surface-container-high px-2 py-1.5 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden border border-primary/20 bg-primary-container flex items-center justify-center">
              <span className="text-xs font-bold text-on-primary-container font-mono">
                {address ? address.substring(2, 4).toUpperCase() : "AK"}
              </span>
            </div>
            <div className="hidden md:flex flex-col text-left mr-2">
              <span className="text-[10px] font-bold text-on-surface tracking-widest uppercase">
                {username || "Admin"}
              </span>
              <span className="text-[10px] text-on-surface-variant font-mono">
                {shortenAddress(address)}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
             <div className="absolute right-0 mt-3 w-56 bg-surface-container-high border border-outline-variant/10 rounded-xl shadow-2xl py-2 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
               <div className="px-4 py-3 border-b border-outline-variant/10 mb-1">
                 <p className="text-xs font-bold text-on-surface">Employer Node</p>
                 <p className="text-[10px] text-on-surface-variant mt-1 font-mono">{address || "Disconnected"}</p>
                 <div className="mt-2 inline-block px-2 py-0.5 bg-tertiary/10 text-tertiary rounded text-[8px] font-black uppercase tracking-widest">
                   Connected via Cartridge on {network}
                 </div>
               </div>
               
               <Link href="/settings">
                 <button className="w-full text-left px-4 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface border-l-2 border-transparent hover:border-primary hover:text-on-surface transition-colors flex items-center gap-3">
                   <User className="w-4 h-4" />
                   Organization Settings
                 </button>
               </Link>
               
               <button onClick={() => void disconnect()} className="w-full text-left px-4 py-2 mt-1 text-xs font-bold text-error border-l-2 border-transparent hover:bg-error/10 hover:border-error transition-colors flex items-center gap-3">
                 <LogOut className="w-4 h-4" />
                 Sign Out
               </button>
             </div>
          )}
        </div>
      </div>
    </header>
  );
}

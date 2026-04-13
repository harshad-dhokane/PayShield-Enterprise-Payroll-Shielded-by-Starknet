"use client";

import TopBar from "@/components/TopBar";
import {
  ArrowRight,
  Shield,
  Zap,
  Rocket,
  TrendingUp,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePayrollStore } from "@/store/payroll-store";
import { useWallet } from "@/context/WalletContext";
import { loadTreasuryHistory, loadTreasurySnapshot, type TreasurySnapshot } from "@/lib/starkzap-treasury";
import type { TreasuryActionRow } from "@/lib/starkzap-models";

export default function DashboardPage() {
  const { stats, fetchBatches, fetchEmployees, batches } = usePayrollStore();
  const { address, localMasterKey, wallet } = useWallet();
  const [treasurySnapshot, setTreasurySnapshot] = useState<TreasurySnapshot | null>(null);
  const [treasuryHistory, setTreasuryHistory] = useState<TreasuryActionRow[]>([]);

  useEffect(() => {
    if (address && localMasterKey && wallet) {
      void fetchBatches(address, localMasterKey);
      void fetchEmployees(address, localMasterKey);
      void loadTreasurySnapshot(wallet, localMasterKey).then(setTreasurySnapshot);
      void loadTreasuryHistory(address).then((history) => setTreasuryHistory(history as TreasuryActionRow[]));
    }
  }, [address, localMasterKey, fetchBatches, fetchEmployees, wallet]);

  const treasuryBalance =
    treasurySnapshot?.balances.reduce((acc, balance) => acc + Number(balance.amount), 0) || 0;

  return (
    <>
      <TopBar title="Overview" />
      <div className="p-8 grid grid-cols-12 gap-6">
        {/* 1. Payroll Overview Card */}
        <section className="col-span-12 lg:col-span-8 group">
          <div className="brand-gradient rounded-xl p-8 glow-orange relative overflow-hidden h-full">
            {/* Texture overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <p className="text-on-primary-container/70 text-xs font-bold uppercase tracking-widest mb-1 font-label">
                    Total Volume
                  </p>
                  <h3 className="text-5xl font-black text-on-primary-container tracking-tighter font-headline">
                    ${stats.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="bg-on-primary-container/10 p-3 rounded-xl">
                  <Shield className="w-9 h-9 text-on-primary-container" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-on-primary-container/20">
                <div>
                  <p className="text-on-primary-container/60 text-[10px] font-bold uppercase tracking-widest mb-1 font-label">
                    Active Shielded Employees
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-on-primary-container font-headline">
                      {stats.totalEmployees}
                    </span>
                    <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-full font-bold">
                      +12%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-on-primary-container/60 text-[10px] font-bold uppercase tracking-widest mb-1 font-label">
                    Total Gas Saved
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-on-primary-container font-headline">
                      ${(batches.reduce((acc, batch) => acc + batch.items.length * 2.50, 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <Zap className="w-5 h-5 text-tertiary" />
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative */}
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <Shield className="w-48 h-48" />
            </div>
          </div>
        </section>

        {/* 2. Run Payroll Fast Action */}
        <section className="col-span-12 lg:col-span-4">
          <div className="bg-surface-container-low rounded-xl p-8 flex flex-col justify-center h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-16 h-16" />
            </div>
            <h4 className="text-xl font-bold font-headline mb-4">
              Last Cycle: {stats.lastPayrollDate}
            </h4>
            <p className="text-on-surface-variant text-sm mb-8 leading-relaxed">
              Treasury is aligned for the next payroll run with live PayShield balances, confidential
              float visibility, and treasury automation status.
            </p>
            <Link href="/payroll/batch">
              <button className="w-full brand-gradient text-on-primary-container font-black py-5 rounded-md glow-orange text-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                <Rocket className="w-5 h-5" />
                RUN PAYROLL NOW
              </button>
            </Link>
            <p className="text-[10px] text-center mt-4 text-on-surface-variant/40 uppercase tracking-widest">
              Treasury balance: ${treasuryBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </section>

        {/* 3. Privacy Volume Chart */}
        <section className="col-span-12 lg:col-span-8">
          <div className="bg-surface-container rounded-xl p-6 h-80 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-label">
                Privacy Volume (30D)
              </h4>
              <div className="flex gap-4">
                <span className="flex items-center gap-2 text-[10px] font-bold text-primary tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-primary" /> VOLUME
                </span>
                <span className="flex items-center gap-2 text-[10px] font-bold text-secondary-container tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-secondary-container" />{" "}
                  GAS
                </span>
              </div>
            </div>
            <div className="flex-1 relative mt-4">
              <svg className="w-full h-full" viewBox="0 0 800 200">
                <defs>
                  <linearGradient
                    id="chartGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#FF5733" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF5733" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path
                  d="M0 160 Q 50 140 100 150 T 200 120 T 300 140 T 400 100 T 500 130 T 600 90 T 700 110 T 800 80 V 200 H 0 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M0 160 Q 50 140 100 150 T 200 120 T 300 140 T 400 100 T 500 130 T 600 90 T 700 110 T 800 80"
                  fill="none"
                  stroke="#FF5733"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <circle
                  cx="400"
                  cy="100"
                  r="6"
                  fill="#FF5733"
                  className="glow-orange"
                />
                <line
                  x1="0"
                  y1="180"
                  x2="800"
                  y2="180"
                  stroke="#5b403a"
                  strokeDasharray="4"
                  strokeOpacity={0.2}
                />
              </svg>
            </div>
          </div>
        </section>

        {/* 4. Recent Batches Panel */}
        <section className="col-span-12">
          <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
            <div className="bg-surface-container-high px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center font-black text-on-primary-container">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold font-headline">Recent Shielded Batches</h4>
                  <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
                    Real-time cryptographic logs
                  </p>
                </div>
              </div>
            </div>
            <div className="p-8 grid grid-cols-12 gap-10">
              {/* History Table */}
              <div className="col-span-12 lg:col-span-8">
                <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  Payroll History
                </h5>
                <div className="flex flex-col gap-3">
                  {batches.length === 0 ? (
                    <div className="p-4 text-sm text-on-surface-variant">No payroll batches executed yet.</div>
                  ) : (
                    batches.map((batch, i) => (
                      <div
                        key={i}
                        className="bg-surface-container p-4 rounded-lg flex justify-between items-center hover:bg-surface-container-highest transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Shield className={`w-5 h-5 ${batch.status === 'confirmed' ? 'text-primary' : 'text-on-surface-variant'}`} />
                          <div>
                            <p className="text-sm font-bold">{batch.name} - {batch.items.length} Recipients</p>
                            <p className="text-[10px] text-on-surface-variant font-mono">
                              {batch.txHash || 'Pending TX'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">
                            ${batch.items.reduce((acc, item) => acc + Number(item.amount), 0).toLocaleString()}
                          </p>
                          <p className={`text-[10px] font-bold ${batch.status === 'confirmed' ? 'text-tertiary uppercase' : 'text-on-surface-variant'}`}>
                            {batch.status === 'confirmed' ? 'STARK-CONFIRMED' : 'DRAFT'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Performance Stats */}
              <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                <div className="glass-gradient p-6 rounded-xl border border-white/5">
                  <h5 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-6">
                    Treasury Strategy
                  </h5>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold mb-1">
                        <span>SHIELDING RATE</span>
                        <span className="text-tertiary">100%</span>
                      </div>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary w-[100%]" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-surface-container p-4 border border-outline-variant/10">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                        <PiggyBank className="w-3 h-3" /> Confidential Float
                      </div>
                      <p className="text-lg font-black font-headline">
                        {treasurySnapshot?.confidential.balance || "0"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container p-4 border border-outline-variant/10">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                        <Sparkles className="w-3 h-3" /> Treasury Actions
                      </div>
                      <p className="text-lg font-black font-headline">{treasuryHistory.length}</p>
                    </div>
                    <Link href="/treasury" className="inline-flex items-center gap-2 text-xs font-bold text-primary">
                      Open Treasury Desk <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                <div className="glass-gradient p-6 rounded-xl border border-white/5">
                  <h5 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">
                    Recent Treasury Activity
                  </h5>
                  <div className="space-y-3">
                    {treasuryHistory.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="bg-surface-container p-3 rounded-lg">
                        <p className="text-xs font-bold uppercase tracking-widest">{entry.action_type}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">{entry.status}</p>
                      </div>
                    ))}
                    {treasuryHistory.length === 0 && (
                      <p className="text-xs text-on-surface-variant">No treasury actions recorded yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 brand-gradient rounded-xl flex items-center justify-center text-on-primary-container glow-orange shadow-2xl active:scale-95 transition-all z-[100]">
        <span className="text-3xl font-light">+</span>
      </button>
    </>
  );
}

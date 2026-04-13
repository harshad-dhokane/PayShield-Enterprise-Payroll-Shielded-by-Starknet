"use client";

import TopBar from "@/components/TopBar";
import { usePayrollStore } from "@/store/payroll-store";
import { useWallet } from "@/context/WalletContext";
import { useEffect, useState } from "react";
import { loadTreasuryHistory } from "@/lib/starkzap-treasury";
import type { TreasuryActionRow } from "@/lib/starkzap-models";

export default function ReportsPage() {
  const { stats, batches, fetchBatches } = usePayrollStore();
  const { address, localMasterKey } = useWallet();
  const [timeframe, setTimeframe] = useState("Monthly");
  const [treasuryHistory, setTreasuryHistory] = useState<TreasuryActionRow[]>([]);

  useEffect(() => {
    if (address && localMasterKey) {
      void fetchBatches(address, localMasterKey);
      void loadTreasuryHistory(address).then((history) => setTreasuryHistory(history as TreasuryActionRow[]));
    }
  }, [address, localMasterKey, fetchBatches]);

  const confirmedBatches = batches.filter((batch) => batch.status === "confirmed");
  const averageBatchSize =
    confirmedBatches.length === 0
      ? 0
      : confirmedBatches.reduce((acc, batch) => acc + batch.items.length, 0) / confirmedBatches.length;

  return (
    <>
      <TopBar title="Reports" />
      <div className="p-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black font-headline tracking-[-0.04em] mb-2">
              Analytics &amp; Reports
            </h2>
            <p className="text-on-surface-variant font-label text-sm">
              PayShield payroll receipts and treasury automation history, consolidated in one place.
            </p>
          </div>
          <div className="flex gap-3">
            {["Monthly", "Quarterly", "Annual"].map((selectedTimeframe) => (
              <button
                key={selectedTimeframe}
                onClick={() => setTimeframe(selectedTimeframe)}
                className={`px-4 py-2 rounded text-xs font-bold tracking-tight transition-colors ${timeframe === selectedTimeframe
                    ? "bg-surface-container-high text-primary"
                    : "text-on-surface-variant/50 hover:text-on-surface"
                  }`}
              >
                {selectedTimeframe}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Total Disbursed
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              ${stats.totalVolume.toLocaleString()}
            </h3>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Confirmed Batches
            </p>
            <h3 className="text-3xl font-black font-headline text-tertiary">
              {confirmedBatches.length}
            </h3>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Avg Batch Size
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              {averageBatchSize.toFixed(1)}
            </h3>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Treasury Actions
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              {treasuryHistory.length}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="px-8 py-6 border-b border-white/5">
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Payroll Receipts
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-white/5">
                    <th className="px-8 py-4 font-bold">Batch</th>
                    <th className="px-8 py-4 font-bold">Token</th>
                    <th className="px-8 py-4 font-bold">Fee Mode</th>
                    <th className="px-8 py-4 font-bold">Receipt</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="border-b border-white/5 hover:bg-surface-container-high transition-colors"
                    >
                      <td className="px-8 py-4">
                        <p className="font-bold">{batch.name}</p>
                        <p className="text-[10px] text-on-surface-variant font-mono">
                          {batch.txHash || "Pending"}
                        </p>
                      </td>
                      <td className="px-8 py-4 text-on-surface-variant">
                        {batch.payrollToken || "N/A"}
                      </td>
                      <td className="px-8 py-4">{batch.feeMode || "N/A"}</td>
                      <td className="px-8 py-4">
                        {batch.executionMetadata?.explorerUrl ? (
                          <a
                            href={String(batch.executionMetadata.explorerUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            Open Explorer
                          </a>
                        ) : (
                          <span className="text-on-surface-variant">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-6 text-on-surface-variant text-sm">
                        No payroll receipts yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10">
            <div className="px-8 py-6 border-b border-white/5">
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Treasury Automation
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-white/5">
                    <th className="px-8 py-4 font-bold">Action</th>
                    <th className="px-8 py-4 font-bold">Amount</th>
                    <th className="px-8 py-4 font-bold">Status</th>
                    <th className="px-8 py-4 font-bold">Tx</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {treasuryHistory.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-surface-container-high transition-colors"
                    >
                      <td className="px-8 py-4 font-bold uppercase tracking-widest">
                        {entry.action_type}
                      </td>
                      <td className="px-8 py-4 text-on-surface-variant">
                        {entry.amount || "N/A"}
                      </td>
                      <td className="px-8 py-4">{entry.status}</td>
                      <td className="px-8 py-4 font-mono text-[10px]">
                        {entry.tx_hash || entry.external_tx_hash || "Pending"}
                      </td>
                    </tr>
                  ))}
                  {treasuryHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-6 text-on-surface-variant text-sm">
                        No treasury actions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

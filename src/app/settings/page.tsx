"use client";

import { useWallet } from "@/context/WalletContext";
import TopBar from "@/components/TopBar";
import { Building, Shield, Key } from "lucide-react";
import { useEffect, useState } from "react";
import { starkZapClient } from "@/lib/starkzap";

export default function SettingsPage() {
  const { address, localMasterKey, wallet } = useWallet();
  const [confidentialProfile, setConfidentialProfile] = useState<{
    address: string;
    contractAddress: string;
    balance: string;
  } | null>(null);

  useEffect(() => {
    if (!wallet || !localMasterKey) {
      return;
    }

    void starkZapClient.getCompanyConfidentialOverview(wallet, localMasterKey).then((profile) =>
      setConfidentialProfile({
        address: profile.address,
        contractAddress: profile.contractAddress,
        balance: profile.balance,
      })
    );
  }, [localMasterKey, wallet]);

  return (
    <>
      <TopBar title="Settings" />
      <div className="p-8 max-w-5xl">
        <div className="mb-12">
          <h2 className="text-4xl font-black font-headline tracking-[-0.04em] mb-2">
            Employer Organization
          </h2>
          <p className="text-on-surface-variant font-label text-sm">
            Manage your local master keys, compliance properties, and identity configurations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Account details */}
          <div className="md:col-span-2 space-y-8">
             <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10">
                <h3 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
                   <Building className="w-5 h-5 text-primary" />
                   Organization Profile
                </h3>
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                           Company Name
                         </label>
                         <input type="text" defaultValue="StarkZap Enterprise" className="w-full bg-surface-container-highest/30 border border-outline-variant/5 rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/20 transition-all outline-none" />
                      </div>
                      <div>
                         <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                           Primary Email
                         </label>
                         <input type="email" defaultValue="admin@starkzap.com" className="w-full bg-surface-container-highest/30 border border-outline-variant/5 rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary/20 transition-all outline-none" />
                      </div>
                   </div>
                   <div>
                       <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                         Starknet Smart Account (Admin Address)
                       </label>
                       <input type="text" readOnly value={address || "Not connected"} className="w-full font-mono bg-black/40 border border-outline-variant/10 rounded-md px-4 py-3 text-xs text-on-surface-variant opacity-70 outline-none cursor-not-allowed" />
                   </div>
                   <button className="px-6 py-3 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-lg text-xs font-bold text-on-surface cursor-pointer active:scale-95">Save Changes</button>
                </div>
             </div>

             <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10">
                <h3 className="text-lg font-bold font-headline mb-6 flex items-center gap-2">
                   <Key className="w-5 h-5 text-tertiary" />
                   Cryptographic Operations
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg border border-outline-variant/5">
                      <div>
                         <p className="font-bold text-sm">Local Master Key (LMK)</p>
                         <p className="text-[10px] text-on-surface-variant mt-1">Derived from your Cartridge ephemeral signature.</p>
                      </div>
                      <span className="px-3 py-1 bg-tertiary/20 text-tertiary rounded text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(46,204,113,0.15)]">Active</span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg border border-outline-variant/5">
                      <div>
                         <p className="font-bold text-sm">Auditor Viewing Keys</p>
                         <p className="text-[10px] text-on-surface-variant mt-1">Export a time-limited decryption key for auditors.</p>
                      </div>
                      <button onClick={() => alert("Tongo viewing key generation is currently active on mainnet only.")} className="px-4 py-1.5 brand-gradient text-on-primary-container rounded text-xs font-bold glow-orange transition-transform active:scale-95 cursor-pointer">Generate</button>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg border border-outline-variant/5">
                      <div>
                         <p className="font-bold text-sm">Company Tongo Account</p>
                         <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                           {confidentialProfile?.address || "Loading confidential address..."}
                         </p>
                      </div>
                      <span className="px-3 py-1 bg-primary/20 text-primary rounded text-[10px] font-bold uppercase tracking-widest">
                        {confidentialProfile?.balance || "0"} Shielded
                      </span>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-surface-container-highest/30 rounded-lg border border-outline-variant/5">
                      <div>
                         <p className="font-bold text-sm">Tongo Contract</p>
                         <p className="text-[10px] text-on-surface-variant mt-1 font-mono">
                           {confidentialProfile?.contractAddress || "Resolving network contract..."}
                         </p>
                      </div>
                      <span className="px-3 py-1 bg-tertiary/20 text-tertiary rounded text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(46,204,113,0.15)]">Live</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-surface-container-lowest p-6 rounded-2xl border border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full" />
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 relative z-10 border border-primary/30">
                   <Shield className="w-6 h-6 text-primary drop-shadow-[0_0_5px_rgba(255,87,51,0.5)]" />
                </div>
                <h4 className="font-bold font-headline text-lg mb-2 relative z-10">Zero-Knowledge Trust</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed relative z-10">
                   Your node is configured for mathematical privacy. No plain-text salary or identity metadata ever touches our servers. All encryption occurs strictly within your local browser perimeter using AES-256 GCM authenticated channels.
                </p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}

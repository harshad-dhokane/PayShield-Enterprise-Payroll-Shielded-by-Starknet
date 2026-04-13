"use client";

import { useWallet } from "@/context/WalletContext";
import { Shield, Zap, Loader2 } from "lucide-react";

export default function LoginGate({ children }: { children: React.ReactNode }) {
  const { wallet, localMasterKey, isConnecting, isSigningLMK, connect } =
    useWallet();

  // If connected and LMK is ready, render the app
  if (wallet && localMasterKey) {
    return <>{children}</>;
  }

  // Otherwise show the login screen
  return (
    <div className="fixed inset-0 z-[200] min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-md p-10">
        {/* Branding */}
        <div className="flex items-center gap-3 mb-12 justify-center">
          <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center glow-orange">
            <Zap className="w-7 h-7 text-on-primary-container" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary-container tracking-tighter font-headline">
              PayShield
            </h1>
            <p className="text-[10px] text-on-surface-variant/40 tracking-[0.2em] uppercase">
              Fintech Mission Control
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-container" />
            </div>
          </div>

          <h2 className="text-xl font-bold font-headline text-center mb-2">
            {isSigningLMK ? "Generating Privacy Key" : "Shielded Access"}
          </h2>

          <p className="text-sm text-on-surface-variant text-center mb-8 leading-relaxed">
            {isSigningLMK
              ? "Please sign the message to generate your Local Master Key. This key encrypts your payroll data locally."
              : "Connect your Cartridge Controller wallet to access the privacy-first payroll dashboard."}
          </p>

          {isSigningLMK ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-6 h-6 text-primary-container animate-spin" />
              <p className="text-xs text-on-surface-variant/60 uppercase tracking-widest">
                Awaiting signature...
              </p>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="w-full brand-gradient text-on-primary-container font-black py-4 rounded-md glow-orange text-sm flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Connect Wallet
                </>
              )}
            </button>
          )}

          <p className="text-[10px] text-center mt-6 text-on-surface-variant/30 uppercase tracking-widest">
            Secured with StarkProof™ Privacy
          </p>
        </div>
      </div>
    </div>
  );
}

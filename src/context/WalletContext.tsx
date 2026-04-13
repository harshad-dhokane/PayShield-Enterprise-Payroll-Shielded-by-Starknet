"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import type { TypedData } from "starknet";
import {
  createCartridgeOnboardOptions,
  createStarkZapSdk,
  getActiveChainIdLiteral,
  getActiveNetworkName,
  type StarkZapWallet,
} from "@/lib/starkzap-sdk";

// ── Typed data for signature request ──
function getShieldedPayrollTypedData(): TypedData {
  return {
    types: {
      StarkNetDomain: [
        { name: "name", type: "felt" },
        { name: "version", type: "felt" },
        { name: "chainId", type: "felt" },
      ],
      Message: [{ name: "content", type: "felt" }],
    },
    primaryType: "Message",
    domain: {
      name: "StarkZap",
      version: "1",
      chainId: getActiveChainIdLiteral(),
    },
    message: {
      content: "Access Shielded Payroll",
    },
  };
}

// ── Context type ──
interface WalletContextType {
  account: StarkZapWallet | null;
  wallet: StarkZapWallet | null;
  address: string | null;
  username: string | null;
  localMasterKey: string | null;
  network: string;
  isConnecting: boolean;
  isSigningLMK: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  wallet: null,
  address: null,
  username: null,
  localMasterKey: null,
  network: getActiveNetworkName(),
  isConnecting: false,
  isSigningLMK: false,
  connect: async () => {},
  disconnect: async () => {},
});

export const useWallet = () => useContext(WalletContext);

// ── Provider ──
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const sdkRef = useRef(createStarkZapSdk());
  const [wallet, setWallet] = useState<StarkZapWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [localMasterKey, setLocalMasterKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSigningLMK, setIsSigningLMK] = useState(false);
  const lmkGeneratedFor = useRef<string | null>(null);

  // Derive the Local Master Key from a signature
  const generateLMK = useCallback(async (connectedWallet: StarkZapWallet) => {
    if (lmkGeneratedFor.current === connectedWallet.address) return;
    try {
      setIsSigningLMK(true);
      // Request one-time signature for "Access Shielded Payroll"
      const signature = await connectedWallet.signMessage(getShieldedPayrollTypedData());

      // Concatenate signature components and hash to create LMK
      let sigString: string;
      if (Array.isArray(signature)) {
        sigString = signature.map((part) => String(part)).join("");
      } else if (signature && typeof signature === "object" && "r" in signature && "s" in signature) {
        sigString = `${String(signature.r)}${String(signature.s)}`;
      } else {
        sigString = String(signature);
      }

      const lmk = CryptoJS.SHA256(`${connectedWallet.address}:${sigString}`).toString();
      setLocalMasterKey(lmk);
      lmkGeneratedFor.current = connectedWallet.address;
      console.log("[StarkZap] LMK generated (in-memory only, never persisted)");
    } catch (err) {
      console.error("[StarkZap] LMK signature rejected or failed:", err);
    } finally {
      setIsSigningLMK(false);
    }
  }, []);

  // Connect wallet via Cartridge Controller
  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      const result = await sdkRef.current.onboard(createCartridgeOnboardOptions());
      const connectedWallet = result.wallet as StarkZapWallet;

      setWallet(connectedWallet);
      setAddress(connectedWallet.address);

      const uname = connectedWallet.username ? await connectedWallet.username() : undefined;
      setUsername(uname || null);

      await generateLMK(connectedWallet);
    } catch (err) {
      console.error("[StarkZap] Connection failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [generateLMK]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    if (wallet) {
      await wallet.disconnect();
    }
    setWallet(null);
    setAddress(null);
    setUsername(null);
    setLocalMasterKey(null);
    lmkGeneratedFor.current = null;
  }, [wallet]);

  return (
    <WalletContext.Provider
      value={{
        account: wallet,
        wallet,
        address,
        username,
        localMasterKey,
        network: getActiveNetworkName(),
        isConnecting,
        isSigningLMK,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import CryptoJS from "crypto-js";
import type { TypedData } from "starknet";
import {
  createCartridgeOnboardOptions,
  createStarkZapSdk,
  getActiveChainIdLiteral,
  getActiveNetworkName,
  type StarkZapWallet,
} from "@/lib/starkzap-sdk";

function getLmkStorageKey(address: string) {
  return `starkzap:lmk:${address.toLowerCase()}`;
}

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
  isRestoringSession: boolean;
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
  isRestoringSession: false,
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
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const lmkGeneratedFor = useRef<string | null>(null);
  const hasAttemptedRestore = useRef(false);

  // Derive the Local Master Key from a signature
  const generateLMK = useCallback(async (connectedWallet: StarkZapWallet) => {
    if (lmkGeneratedFor.current === connectedWallet.address) return;
    try {
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(getLmkStorageKey(connectedWallet.address));
        if (cached) {
          setLocalMasterKey(cached);
          lmkGeneratedFor.current = connectedWallet.address;
          return;
        }
      }

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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(getLmkStorageKey(connectedWallet.address), lmk);
      }
      lmkGeneratedFor.current = connectedWallet.address;
      console.log("[StarkZap] LMK generated and cached locally for this wallet");
    } catch (err) {
      console.error("[StarkZap] LMK signature rejected or failed:", err);
    } finally {
      setIsSigningLMK(false);
    }
  }, []);

  // Connect wallet via Cartridge Controller
  const connect = useCallback(async () => {
    if (isConnecting) {
      return;
    }

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
  }, [generateLMK, isConnecting]);

  useEffect(() => {
    if (hasAttemptedRestore.current) {
      return;
    }

    hasAttemptedRestore.current = true;

    if (typeof window === "undefined") {
      setIsRestoringSession(false);
      return;
    }

    const hasStoredSession =
      Boolean(window.localStorage.getItem("session")) &&
      Boolean(window.localStorage.getItem("sessionSigner"));

    if (!hasStoredSession) {
      setIsRestoringSession(false);
      return;
    }

    void (async () => {
      try {
        await connect();
      } catch (error) {
        console.error("[StarkZap] Session restore failed:", error);
      } finally {
        setIsRestoringSession(false);
      }
    })();
  }, [connect]);

  useEffect(() => {
    if (wallet || localMasterKey) {
      setIsRestoringSession(false);
    }
  }, [wallet, localMasterKey]);

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
        isRestoringSession,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

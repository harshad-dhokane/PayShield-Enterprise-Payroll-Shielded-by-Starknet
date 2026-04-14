"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BadgeCheck, Building, Key, Shield } from "lucide-react";
import TopBar from "@/components/TopBar";
import GuideDialog, {
  GuideButton,
  type GuideDialogContent,
} from "@/components/GuideDialog";
import { useWallet } from "@/context/WalletContext";
import { starkZapClient } from "@/lib/starkzap";

const PROFILE_STORAGE_KEY = "starkzap:settings:organization";

const SETTINGS_GUIDES: Record<string, GuideDialogContent> = {
  organization: {
    eyebrow: "Settings Guide",
    title: "Organization Profile",
    summary:
      "This form stores the employer-facing display profile for the current browser session. It does not push anything on-chain.",
    sections: [
      {
        title: "What this updates",
        items: [
          "Company name and primary email are saved locally in the browser so operators see the same values after refresh.",
          "Your Starknet admin address is read from the connected wallet and cannot be edited here.",
          "The settings page is safe to use before payroll execution because it does not mutate shielded balances.",
        ],
      },
      {
        title: "Operator flow",
        ordered: true,
        items: [
          "Connect the admin wallet you use for treasury and payroll actions.",
          "Update the organization name and support email shown to internal operators.",
          "Press Save Changes to persist the profile in this browser.",
        ],
      },
    ],
    footer:
      "If you need shared team-wide settings later, wire this form to Supabase or another server-side profile store instead of localStorage.",
  },
  cryptography: {
    eyebrow: "Settings Guide",
    title: "Cryptographic Operations",
    summary:
      "This area shows the local key material and Tongo account state that payroll and treasury flows depend on.",
    sections: [
      {
        title: "What each row means",
        items: [
          "Local Master Key is derived from the Cartridge signature and cached per wallet address in local storage.",
          "Company Tongo Account is the deterministic confidential recipient used to hold shielded payroll liquidity.",
          "Tongo Contract shows which shielded token instance the current network is using.",
        ],
      },
      {
        title: "Readiness checks",
        items: [
          "Wallet must be connected and the LMK must be active before confidential payroll preview can succeed.",
          "A non-zero shielded balance means the company account can already fund recipients without another public deposit.",
          "Auditor viewing key export is documented here, but this build does not yet generate portable auditor packages.",
        ],
      },
    ],
    footer:
      "Use this panel as the first stop when payroll proof generation fails. Wrong wallet, missing LMK, or mismatched contract configuration will show up here.",
  },
  readiness: {
    eyebrow: "Settings Guide",
    title: "Runtime Readiness",
    summary:
      "Use this checklist before payroll day to verify the connected environment matches the network and confidential account you expect.",
    sections: [
      {
        title: "Before you run payroll",
        ordered: true,
        items: [
          "Confirm the app is on the intended network and your admin wallet is connected.",
          "Verify the LMK is active in this browser profile so the same company Tongo identity is reused.",
          "Check the Tongo contract and company confidential balance values before uploading a payroll CSV.",
        ],
      },
      {
        title: "What is local vs shared",
        items: [
          "Wallet session and LMK are browser-local.",
          "Shielded balance and contract data come from the active Starknet network.",
          "Organization profile values in this build are also browser-local until a shared backend store is added.",
        ],
      },
    ],
    footer:
      "If another operator uses a different browser or device, they need to reconnect the same admin wallet and generate their own local LMK cache.",
  },
};

export default function SettingsPage() {
  const {
    address,
    localMasterKey,
    wallet,
    network,
    isConnecting,
    isRestoringSession,
  } = useWallet();
  const [companyName, setCompanyName] = useState("StarkZap Enterprise");
  const [primaryEmail, setPrimaryEmail] = useState("admin@starkzap.com");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<GuideDialogContent | null>(null);
  const [confidentialProfile, setConfidentialProfile] = useState<{
    address: string;
    contractAddress: string;
    balance: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!savedProfile) {
      return;
    }

    try {
      const parsed = JSON.parse(savedProfile) as {
        companyName?: string;
        primaryEmail?: string;
      };
      if (parsed.companyName) {
        setCompanyName(parsed.companyName);
      }
      if (parsed.primaryEmail) {
        setPrimaryEmail(parsed.primaryEmail);
      }
    } catch (error) {
      console.warn("Failed to restore organization profile settings", error);
    }
  }, []);

  useEffect(() => {
    if (!wallet || !localMasterKey) {
      setConfidentialProfile(null);
      return;
    }

    let cancelled = false;

    void starkZapClient
      .getCompanyConfidentialOverview(wallet, localMasterKey)
      .then((profile) => {
        if (cancelled) {
          return;
        }

        setConfidentialProfile({
          address: profile.address,
          contractAddress: profile.contractAddress,
          balance: profile.balance,
        });
      })
      .catch((error) => {
        console.warn("Failed to load confidential profile", error);
        if (!cancelled) {
          setStatusMessage("Unable to load the company confidential profile right now.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localMasterKey, wallet]);

  const runtimeChecks = useMemo(
    () => [
      {
        label: "Network",
        value: network.toUpperCase(),
        tone: "text-primary",
      },
      {
        label: "Wallet Session",
        value: address
          ? "Connected"
          : isRestoringSession
            ? "Restoring"
            : isConnecting
              ? "Connecting"
              : "Not connected",
        tone: address ? "text-tertiary" : "text-on-surface",
      },
      {
        label: "LMK State",
        value: localMasterKey ? "Active" : address ? "Awaiting signature" : "Idle",
        tone: localMasterKey ? "text-tertiary" : "text-on-surface",
      },
      {
        label: "Shielded Balance",
        value: confidentialProfile ? `${confidentialProfile.balance} Shielded` : "Loading",
        tone: confidentialProfile ? "text-primary" : "text-on-surface",
      },
    ],
    [address, confidentialProfile, isConnecting, isRestoringSession, localMasterKey, network]
  );

  const saveOrganizationProfile = () => {
    const nextCompanyName = companyName.trim();
    const nextPrimaryEmail = primaryEmail.trim();

    if (!nextCompanyName || !nextPrimaryEmail) {
      setStatusMessage("Company name and primary email are both required.");
      return;
    }

    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextPrimaryEmail);
    if (!emailLooksValid) {
      setStatusMessage("Enter a valid primary email before saving.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({
          companyName: nextCompanyName,
          primaryEmail: nextPrimaryEmail,
        })
      );
    }

    setStatusMessage("Organization profile saved locally for this browser.");
  };

  const viewingKeySupportLabel = network === "mainnet" ? "Planned" : "Guide only";

  return (
    <>
      <TopBar title="Settings" />
      <GuideDialog
        content={activeGuide}
        isOpen={Boolean(activeGuide)}
        onClose={() => setActiveGuide(null)}
      />
      <div className="max-w-6xl space-y-8 p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="mb-2 text-4xl font-black tracking-[-0.04em]">Employer Organization</h2>
            <p className="max-w-2xl text-sm text-on-surface-variant">
              Keep operator identity, local cryptographic state, and confidential account wiring in
              one place before treasury and payroll runs.
            </p>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
              Active Network
            </p>
            <p className="mt-2 text-lg font-black text-on-surface">{network.toUpperCase()}</p>
          </div>
        </div>

        {statusMessage && (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-sm text-on-surface">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-8 md:col-span-2">
            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Building className="h-5 w-5 text-primary" />
                    Organization Profile
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
                    These values label the employer workspace for the current browser and help the
                    team confirm the correct admin context before making treasury moves.
                  </p>
                </div>
                <GuideButton
                  label="Open organization profile guide"
                  onClick={() => setActiveGuide(SETTINGS_GUIDES.organization)}
                />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      className="w-full rounded-md border border-outline-variant/5 bg-surface-container-highest/30 px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Primary Email
                    </label>
                    <input
                      type="email"
                      value={primaryEmail}
                      onChange={(event) => setPrimaryEmail(event.target.value)}
                      className="w-full rounded-md border border-outline-variant/5 bg-surface-container-highest/30 px-4 py-3 text-sm text-on-surface outline-none transition-all focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Starknet Smart Account (Admin Address)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={address || "Not connected"}
                    className="w-full cursor-not-allowed rounded-md border border-outline-variant/10 bg-black/40 px-4 py-3 font-mono text-xs text-on-surface-variant opacity-70 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-on-surface-variant">
                    Saved locally on this device so operators can refresh without re-entering the
                    organization profile.
                  </p>
                  <button
                    type="button"
                    onClick={saveOrganizationProfile}
                    className="rounded-lg bg-surface-container-high px-6 py-3 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-highest active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <Key className="h-5 w-5 text-tertiary" />
                    Cryptographic Operations
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
                    This is the live cryptographic state behind confidential payroll proofs,
                    company account routing, and future auditor exports.
                  </p>
                </div>
                <GuideButton
                  label="Open cryptographic operations guide"
                  onClick={() => setActiveGuide(SETTINGS_GUIDES.cryptography)}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-outline-variant/5 bg-surface-container-highest/30 p-4">
                  <div>
                    <p className="text-sm font-bold">Local Master Key (LMK)</p>
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      Derived from your Cartridge signature and reused per wallet address.
                    </p>
                  </div>
                  <span className="rounded bg-tertiary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-tertiary shadow-[0_0_15px_rgba(46,204,113,0.15)]">
                    {localMasterKey ? "Active" : address ? "Waiting" : "Idle"}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-outline-variant/5 bg-surface-container-highest/30 p-4">
                  <div>
                    <p className="text-sm font-bold">Auditor Viewing Keys</p>
                    <p className="mt-1 text-[10px] text-on-surface-variant">
                      Reference-only guidance for controlled decryption handoffs. Export is not yet
                      automated in this build.
                    </p>
                  </div>
                  <span className="rounded bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {viewingKeySupportLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-outline-variant/5 bg-surface-container-highest/30 p-4">
                  <div>
                    <p className="text-sm font-bold">Company Tongo Account</p>
                    <p className="mt-1 font-mono text-[10px] text-on-surface-variant">
                      {confidentialProfile?.address || "Loading confidential address..."}
                    </p>
                  </div>
                  <span className="rounded bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                    {confidentialProfile?.balance || "0"} Shielded
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-outline-variant/5 bg-surface-container-highest/30 p-4">
                  <div>
                    <p className="text-sm font-bold">Tongo Contract</p>
                    <p className="mt-1 font-mono text-[10px] text-on-surface-variant">
                      {confidentialProfile?.contractAddress || "Resolving network contract..."}
                    </p>
                  </div>
                  <span className="rounded bg-tertiary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-tertiary shadow-[0_0_15px_rgba(46,204,113,0.15)]">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface-container-lowest p-6">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/10 blur-[40px]" />
              <div className="relative z-10 mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/20">
                    <Shield className="h-6 w-6 text-primary drop-shadow-[0_0_5px_rgba(255,87,51,0.5)]" />
                  </div>
                  <h4 className="text-lg font-bold">Runtime Readiness</h4>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                    Confirm the active environment before you fund confidential payroll or move
                    treasury liquidity.
                  </p>
                </div>
                <GuideButton
                  label="Open runtime readiness guide"
                  onClick={() => setActiveGuide(SETTINGS_GUIDES.readiness)}
                />
              </div>

              <div className="relative z-10 space-y-3">
                {runtimeChecks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container/70 px-4 py-3"
                  >
                    <span className="text-xs text-on-surface-variant">{check.label}</span>
                    <span className={`text-xs font-bold uppercase tracking-widest ${check.tone}`}>
                      {check.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-4 flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <h4 className="text-sm font-bold uppercase tracking-widest">Operator Notes</h4>
              </div>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>
                  Use the same browser profile for payroll runs so the cached LMK maps to the same
                  company confidential identity.
                </p>
                <p>
                  If payroll proof ownership fails after a wallet reconnect, clear the cached LMK
                  for that wallet and reconnect once.
                </p>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                  <div className="flex items-center gap-2 text-on-surface">
                    <BadgeCheck className="h-4 w-4 text-tertiary" />
                    <span className="text-sm font-bold">Current status</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-on-surface-variant">
                    Settings now save correctly, guide popups explain each workflow, and dead-end
                    buttons were replaced with truthful readiness states.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

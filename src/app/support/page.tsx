"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  CircleHelp,
  LifeBuoy,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import TopBar from "@/components/TopBar";
import { useWallet } from "@/context/WalletContext";

const supportChannels = [
  {
    title: "Operations Desk",
    description:
      "Use this first when payroll preview fails, treasury data is stale, or a wallet session is behaving unexpectedly.",
    detail: "Primary SLA: under 30 minutes during payroll windows",
    icon: LifeBuoy,
  },
  {
    title: "Compliance Hotline",
    description:
      "Escalate proof mismatches, audit prep questions, or confidential-account state discrepancies before payroll is approved.",
    detail: "Best for Tongo identity, receipts, and regulator support",
    icon: ShieldCheck,
  },
  {
    title: "Product Feedback",
    description:
      "Capture UX gaps, missing guides, or non-blocking issues your payroll operators run into during day-to-day use.",
    detail: "Routes into the internal backlog and release queue",
    icon: MessageSquareText,
  },
];

const runbookSteps = [
  "Confirm the correct admin wallet is connected and the Local Master Key is active in this browser.",
  "Open Settings to verify the company Tongo account and contract match the network you expect.",
  "Refresh Treasury before retrying swaps, bridge estimates, or payroll funding so the latest balances are loaded.",
  "If a confidential proof fails, reconnect once and re-check the company Tongo account before re-running payroll.",
];

const faqItems = [
  {
    question: "Payroll preview says the wallet has enough STRK but execution still fails.",
    answer:
      "Check Settings for the company confidential balance and Tongo contract first. Treasury and payroll now use shielded units under the hood, so stale LMK state or the wrong wallet session is usually the cause.",
  },
  {
    question: "Bridge routes are empty or Estimate Bridge does nothing.",
    answer:
      "That usually means the injected Ethereum or Solana wallet is missing in the browser, or the current route provider did not return tokens for the selected source network.",
  },
  {
    question: "Can I export auditor viewing keys from Support?",
    answer:
      "Not yet. This build documents the workflow, but it does not generate portable auditor packages automatically.",
  },
];

export default function SupportPage() {
  const { address, network, localMasterKey } = useWallet();

  return (
    <>
      <TopBar title="Support" />
      <div className="space-y-8 p-8">
        <section className="relative overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container p-8">
          <div className="absolute -right-10 top-0 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-36 w-36 rounded-full bg-tertiary/10 blur-3xl" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                Operator Support
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.04em] text-on-surface">
                Get payroll, treasury, and confidential account issues resolved from one place.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
                This page gives operators a practical triage flow before they escalate. It is wired
                directly into the application so support is part of the workflow rather than a dead
                end button.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-primary/15"
                >
                  Check Settings
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Link>
                <Link
                  href="/treasury"
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-high px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  Open Treasury
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Link>
                <Link
                  href="/payroll/batch"
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/15 bg-surface-container-high px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  Open Payroll
                  <ArrowRight className="h-4 w-4 text-primary" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">Current Session</p>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Live operator context
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Network
                  </p>
                  <p className="mt-2 text-sm font-bold text-on-surface">{network.toUpperCase()}</p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Wallet
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-on-surface">
                    {address || "Not connected"}
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                    LMK State
                  </p>
                  <p className="mt-2 text-sm font-bold text-on-surface">
                    {localMasterKey ? "Active in this browser" : "Not active yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
            <div className="mb-6 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
                Escalation Paths
              </h3>
            </div>
            <div className="space-y-4">
              {supportChannels.map((channel) => {
                const Icon = channel.icon;

                return (
                  <div
                    key={channel.title}
                    className="rounded-2xl border border-outline-variant/10 bg-surface-container px-5 py-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-on-surface">{channel.title}</h4>
                        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                          {channel.description}
                        </p>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                          {channel.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
              <div className="mb-6 flex items-center gap-3">
                <TriangleAlert className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
                  Fast Triage Runbook
                </h3>
              </div>
              <ol className="space-y-4 text-sm leading-7 text-on-surface-variant">
                {runbookSteps.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
              <div className="mb-6 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
                  Contact Package
                </h3>
              </div>
              <div className="space-y-3 text-sm text-on-surface-variant">
                <p>When you escalate, include the following so support can reproduce the issue quickly.</p>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4">
                  <p className="text-on-surface">Network, wallet address, current page, and the exact error text.</p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4">
                  <p className="text-on-surface">Whether the LMK is active and whether the issue happened before or after reconnecting.</p>
                </div>
                <div className="rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4">
                  <p className="text-on-surface">Relevant tx hash, bridge estimate result, or payroll batch name if one exists.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
            <div className="mb-6 flex items-center gap-3">
              <CircleHelp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
                Common Questions
              </h3>
            </div>
            <div className="space-y-4">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className="rounded-2xl border border-outline-variant/10 bg-surface-container px-5 py-5"
                >
                  <h4 className="text-base font-bold text-on-surface">{item.question}</h4>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-8">
            <div className="mb-6 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">
                Quick Links
              </h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/settings"
                className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Organization Settings
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/treasury"
                className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Treasury Operations
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/payroll/batch"
                className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Batch Payroll
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
              <Link
                href="/reports"
                className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container px-4 py-4 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                Reports and Receipts
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

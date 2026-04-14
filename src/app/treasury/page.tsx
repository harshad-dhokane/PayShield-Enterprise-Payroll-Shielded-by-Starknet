"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  ChevronsUp,
  Coins,
  Loader2,
  Link2,
  PiggyBank,
  RefreshCcw,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type {
  BridgeToken,
  DcaOrdersPage,
  LendingHealthQuote,
  LendingMarket,
  LendingUserPosition,
  SwapQuote,
  Token,
} from "starkzap";
import GuideDialog, {
  GuideButton,
  type GuideDialogContent,
} from "@/components/GuideDialog";
import TopBar from "@/components/TopBar";
import { useWallet } from "@/context/WalletContext";
import {
  claimStakingRewards,
  createTreasuryDca,
  depositToLending,
  estimateBridge,
  executeBridge,
  executeTreasurySwap,
  getBridgeTokens,
  getDefaultStakingPool,
  getPayrollToken,
  getSwapQuote,
  getTreasuryTokens,
  loadDcaOrders,
  loadLendingMarkets,
  loadLendingPositions,
  loadTreasuryHistory,
  loadTreasurySnapshot,
  previewDcaCycle,
  quoteBorrowHealth,
  stakeTreasury,
  withdrawFromLending,
  type BridgeSource,
  type TreasurySnapshot,
} from "@/lib/starkzap-treasury";
import type { TreasuryActionRow } from "@/lib/starkzap-models";

function resolveToken(tokens: Token[], symbol: string) {
  return tokens.find((token) => token.symbol === symbol) || tokens[0];
}

function compactAddress(value: string) {
  return `${value.substring(0, 10)}...${value.substring(value.length - 8)}`;
}

const TREASURY_GUIDES: Record<string, GuideDialogContent> = {
  overview: {
    eyebrow: "Treasury Guide",
    title: "Treasury Overview",
    summary:
      "The header cards summarize public wallet balances, shielded float, and the protocol modules that are ready for the connected treasury wallet.",
    sections: [
      {
        title: "What to review first",
        items: [
          "Total Treasury Balance is the sum of the public token balances loaded for the treasury wallet.",
          "Confidential Float shows how much payroll liquidity already sits inside the company Tongo account.",
          "Treasury Pulse calls out live dependencies such as the validator pool, lending positions, and pending confidential balance.",
        ],
      },
      {
        title: "Best operating order",
        ordered: true,
        items: [
          "Refresh the page after connecting the wallet so the treasury snapshot is current.",
          "Confirm the connected wallet and confidential float before performing a rebalance or funding action.",
          "Use history and active positions to verify each transaction landed after execution.",
        ],
      },
    ],
    footer:
      "If a module fails to load, the rest of the treasury can still operate. The status banner will show which dependency needs attention.",
  },
  rebalance: {
    eyebrow: "Treasury Guide",
    title: "Treasury Rebalance",
    summary:
      "Use AVNU swap routing to rotate treasury inventory into the asset you want to hold or use for payroll.",
    sections: [
      {
        title: "Before you execute",
        items: [
          "Choose different source and target tokens. The page now blocks same-token swaps before submission.",
          "Quote the swap first to see the expected output in the destination asset.",
          "Make sure the connected wallet holds enough of the source token to cover both the trade and fees.",
        ],
      },
      {
        title: "Operator flow",
        ordered: true,
        items: [
          "Select the source token, target token, and amount.",
          "Press Quote Swap to fetch the current AVNU route.",
          "If the output looks right, press Execute Swap and wait for the transaction to confirm.",
        ],
      },
    ],
  },
  dca: {
    eyebrow: "Treasury Guide",
    title: "DCA Accumulation",
    summary:
      "This creates a recurring AVNU DCA order that steadily buys the configured payroll token over time.",
    sections: [
      {
        title: "Important rules",
        items: [
          "The sell token must be different from the payroll token you are buying into.",
          "Total amount is the full order size, while cycle amount is what the strategy sells each interval.",
          "Frequency uses ISO-8601 duration style such as P1D, P1W, or P1M.",
        ],
      },
      {
        title: "Operator flow",
        ordered: true,
        items: [
          "Pick the sell token and enter the frequency you want.",
          "Enter the total order amount and the amount per cycle.",
          "Preview one cycle, then create the DCA order once the projected buy amount looks acceptable.",
        ],
      },
    ],
  },
  yield: {
    eyebrow: "Treasury Guide",
    title: "Vesu Yield",
    summary:
      "This section manages lending deposits and withdrawals, and it also includes a borrow-health simulator for pre-trade risk checks.",
    sections: [
      {
        title: "Deposit and withdraw",
        items: [
          "Deposit moves public wallet funds into the lending market for the selected token.",
          "Withdraw pulls available funds back from the lending position into the connected wallet.",
          "The page refreshes positions after each confirmed action so the Active Positions panel stays current.",
        ],
      },
      {
        title: "Borrow health simulator",
        items: [
          "This quote is advisory only. It does not open a borrow position.",
          "Choose the collateral token, debt token, and corresponding amounts to inspect the resulting health metrics.",
          "Use the simulator before adding leverage elsewhere in your treasury workflow.",
        ],
      },
    ],
  },
  bridgeStake: {
    eyebrow: "Treasury Guide",
    title: "External Funding and Staking",
    summary:
      "Bridge routes pull assets from an injected Ethereum or Solana wallet into Starknet, while staking uses the configured validator pool for STRK.",
    sections: [
      {
        title: "Bridge prerequisites",
        items: [
          "Ethereum bridging requires an injected EVM wallet such as MetaMask in the same browser.",
          "Solana bridging requires an injected Solana wallet such as Phantom.",
          "Estimate Bridge checks route fees and available balance before you submit the transfer.",
        ],
      },
      {
        title: "Staking prerequisites",
        items: [
          "Stake STRK uses the default validator configured in the environment.",
          "Claim Rewards only works when a staking position already exists for the connected treasury wallet.",
          "If no pool is returned, the validator configuration or network support needs attention.",
        ],
      },
    ],
  },
};

function SectionHeader({
  title,
  description,
  icon,
  onGuide,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onGuide: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          {icon}
          <h4 className="text-sm font-bold uppercase tracking-widest font-headline">{title}</h4>
        </div>
        <p className="mt-2 max-w-xl text-sm text-on-surface-variant">{description}</p>
      </div>
      <GuideButton label={`Open ${title} guide`} onClick={onGuide} />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  emphasis = "secondary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  emphasis?: "primary" | "secondary";
}) {
  const className =
    emphasis === "primary"
      ? "brand-gradient text-on-primary-container"
      : "bg-surface-container-high text-on-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex-1 rounded-lg py-3 text-xs font-bold uppercase tracking-widest transition-opacity ${className} ${
        disabled || loading ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </span>
    </button>
  );
}

export default function TreasuryPage() {
  const { wallet, address, localMasterKey } = useWallet();
  const tokens = getTreasuryTokens();
  const payrollToken = getPayrollToken();
  const [snapshot, setSnapshot] = useState<TreasurySnapshot | null>(null);
  const [history, setHistory] = useState<TreasuryActionRow[]>([]);
  const [dcaOrders, setDcaOrders] = useState<DcaOrdersPage | null>(null);
  const [lendingMarkets, setLendingMarkets] = useState<LendingMarket[]>([]);
  const [lendingPositions, setLendingPositions] = useState<LendingUserPosition[]>([]);
  const [bridgeTokens, setBridgeTokens] = useState<BridgeToken[]>([]);
  const [stakingPoolAddress, setStakingPoolAddress] = useState<string | null>(null);

  const [swapTokenSymbol, setSwapTokenSymbol] = useState(
    tokens.find((token) => token.symbol !== payrollToken.symbol)?.symbol || payrollToken.symbol
  );
  const [swapTargetTokenSymbol, setSwapTargetTokenSymbol] = useState(payrollToken.symbol);
  const [swapAmount, setSwapAmount] = useState("25");
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);

  const [dcaSellTokenSymbol, setDcaSellTokenSymbol] = useState(
    tokens.find((token) => token.symbol !== payrollToken.symbol)?.symbol || payrollToken.symbol
  );
  const [dcaTotalAmount, setDcaTotalAmount] = useState("200");
  const [dcaCycleAmount, setDcaCycleAmount] = useState("50");
  const [dcaFrequency, setDcaFrequency] = useState("P1W");
  const [dcaPreview, setDcaPreview] = useState<SwapQuote | null>(null);

  const [lendTokenSymbol, setLendTokenSymbol] = useState(payrollToken.symbol);
  const [lendAmount, setLendAmount] = useState("50");
  const [healthCollateralToken, setHealthCollateralToken] = useState(payrollToken.symbol);
  const [healthDebtToken, setHealthDebtToken] = useState(
    tokens.find((token) => token.symbol !== payrollToken.symbol)?.symbol || payrollToken.symbol
  );
  const [healthCollateralAmount, setHealthCollateralAmount] = useState("100");
  const [healthBorrowAmount, setHealthBorrowAmount] = useState("30");
  const [healthQuote, setHealthQuote] = useState<LendingHealthQuote | null>(null);

  const [bridgeSource, setBridgeSource] = useState<BridgeSource>("ethereum");
  const [selectedBridgeTokenId, setSelectedBridgeTokenId] = useState<string>("");
  const [bridgeAmount, setBridgeAmount] = useState("10");
  const [bridgeEstimateText, setBridgeEstimateText] = useState<string | null>(null);

  const [stakeAmount, setStakeAmount] = useState("10");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [activeGuide, setActiveGuide] = useState<GuideDialogContent | null>(null);

  const selectedSwapToken = resolveToken(tokens, swapTokenSymbol);
  const selectedSwapTargetToken = resolveToken(tokens, swapTargetTokenSymbol);
  const selectedDcaToken = resolveToken(tokens, dcaSellTokenSymbol);
  const selectedLendToken = resolveToken(tokens, lendTokenSymbol);
  const selectedCollateralToken = resolveToken(tokens, healthCollateralToken);
  const selectedDebtToken = resolveToken(tokens, healthDebtToken);
  const selectedBridgeToken = bridgeTokens.find((token) => token.id === selectedBridgeTokenId) || null;
  const canOperate = Boolean(wallet && address);
  const canLoadTreasury = Boolean(wallet && address && localMasterKey);
  const isBusy = Boolean(runningAction);
  const swapSelectionInvalid =
    selectedSwapToken.address.toLowerCase() === selectedSwapTargetToken.address.toLowerCase() ||
    selectedSwapToken.symbol.toUpperCase() === selectedSwapTargetToken.symbol.toUpperCase();
  const dcaSelectionInvalid =
    selectedDcaToken.address.toLowerCase() === payrollToken.address.toLowerCase() ||
    selectedDcaToken.symbol.toUpperCase() === payrollToken.symbol.toUpperCase();

  useEffect(() => {
    if (!canLoadTreasury) {
      return;
    }

    const load = async () => {
      setLoading(true);

      try {
        const [
          nextSnapshot,
          nextHistory,
          nextDcaOrders,
          nextLendingMarkets,
          nextLendingPositions,
          nextBridgeTokens,
          nextStakingPool,
        ] = await Promise.allSettled([
          loadTreasurySnapshot(wallet!, localMasterKey!),
          loadTreasuryHistory(address!),
          loadDcaOrders(wallet!),
          loadLendingMarkets(wallet!),
          loadLendingPositions(wallet!),
          getBridgeTokens(bridgeSource),
          getDefaultStakingPool(),
        ]);

        if (nextSnapshot.status === "fulfilled") {
          setSnapshot(nextSnapshot.value);
        }

        if (nextHistory.status === "fulfilled") {
          setHistory(nextHistory.value as TreasuryActionRow[]);
        }

        if (nextDcaOrders.status === "fulfilled") {
          setDcaOrders(nextDcaOrders.value);
        }

        if (nextLendingMarkets.status === "fulfilled") {
          setLendingMarkets(nextLendingMarkets.value);
        }

        if (nextLendingPositions.status === "fulfilled") {
          setLendingPositions(nextLendingPositions.value);
        }

        if (nextBridgeTokens.status === "fulfilled") {
          setBridgeTokens(nextBridgeTokens.value);
          setSelectedBridgeTokenId((current) => current || nextBridgeTokens.value[0]?.id || "");
        }

        if (nextStakingPool.status === "fulfilled") {
          setStakingPoolAddress(nextStakingPool.value?.poolContract || null);
        }

        const firstFailure = [
          nextSnapshot,
          nextHistory,
          nextDcaOrders,
          nextLendingMarkets,
          nextLendingPositions,
          nextBridgeTokens,
          nextStakingPool,
        ].find((result) => result.status === "rejected");

        if (firstFailure?.status === "rejected") {
          const reason = firstFailure.reason;
          setStatusMessage(
            reason instanceof Error ? reason.message : "Some treasury modules failed to load"
          );
        }
      } catch {
        setStatusMessage("Failed to refresh treasury data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [address, bridgeSource, canLoadTreasury, localMasterKey, wallet]);

  useEffect(() => {
    if (selectedBridgeTokenId || bridgeTokens.length === 0) {
      return;
    }

    setSelectedBridgeTokenId(bridgeTokens[0].id);
  }, [bridgeTokens, selectedBridgeTokenId]);

  const refreshTreasury = async () => {
    if (!wallet || !localMasterKey || !address) {
      setStatusMessage("Connect the admin wallet and unlock the LMK before refreshing treasury data.");
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const [nextSnapshot, nextHistory, nextDcaOrders, nextLendingPositions] =
        await Promise.allSettled([
          loadTreasurySnapshot(wallet, localMasterKey),
          loadTreasuryHistory(address),
          loadDcaOrders(wallet),
          loadLendingPositions(wallet),
        ]);

      if (nextSnapshot.status === "fulfilled") {
        setSnapshot(nextSnapshot.value);
      }

      if (nextHistory.status === "fulfilled") {
        setHistory(nextHistory.value as TreasuryActionRow[]);
      }

      if (nextDcaOrders.status === "fulfilled") {
        setDcaOrders(nextDcaOrders.value);
      }

      if (nextLendingPositions.status === "fulfilled") {
        setLendingPositions(nextLendingPositions.value);
      }

      const firstFailure = [
        nextSnapshot,
        nextHistory,
        nextDcaOrders,
        nextLendingPositions,
      ].find((result) => result.status === "rejected");

      if (firstFailure?.status === "rejected") {
        const reason = firstFailure.reason;
        setStatusMessage(
          reason instanceof Error ? reason.message : "Some treasury modules failed to refresh"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionKey: string, action: () => Promise<void>) => {
    if (runningAction) {
      return;
    }

    if (!wallet || !address) {
      setStatusMessage("Connect the admin wallet before running treasury actions.");
      return;
    }

    try {
      setRunningAction(actionKey);
      setStatusMessage(null);
      await action();
      await refreshTreasury();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Treasury action failed");
    } finally {
      setRunningAction(null);
    }
  };

  const totalTreasuryBalance =
    snapshot?.balances.reduce((total, balance) => total + Number(balance.amount || 0), 0) || 0;

  return (
    <>
      <TopBar title="StarkZap Treasury" />
      <GuideDialog
        content={activeGuide}
        isOpen={Boolean(activeGuide)}
        onClose={() => setActiveGuide(null)}
      />
      <div className="p-8 space-y-8">
        {!canLoadTreasury && (
          <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low px-5 py-4 text-sm text-on-surface">
            Connect the admin wallet and unlock the Local Master Key to enable treasury automation,
            confidential balance reads, and post-trade refreshes.
          </div>
        )}

        {statusMessage && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-on-surface">
            {statusMessage}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-xl bg-surface-container p-8 neon-glow-primary lg:col-span-2">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[100px] -mr-32 -mt-32" />
            <div>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant font-headline">
                    Total Treasury Balance
                  </p>
                  <p className="max-w-xl text-sm text-on-surface-variant">
                    Monitor public holdings, shielded payroll float, and live module readiness
                    before you move treasury funds.
                  </p>
                </div>
                <GuideButton
                  label="Open treasury overview guide"
                  onClick={() => setActiveGuide(TREASURY_GUIDES.overview)}
                />
              </div>
              <h3 className="flex items-baseline gap-2 text-6xl font-black tracking-tighter text-on-surface font-headline">
                <span className="text-primary-container">$</span>
                {totalTreasuryBalance.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
              </h3>
              {snapshot && (
                <p className="mt-4 text-xs text-on-surface-variant uppercase tracking-widest">
                  Company Tongo: {compactAddress(snapshot.confidential.address)}
                </p>
              )}
            </div>
            <div className="mt-12 grid grid-cols-2 gap-8">
              <div className="flex flex-col">
                <span className="mb-1 text-[10px] uppercase tracking-widest text-on-surface-variant">
                  Confidential Float
                </span>
                <span className="text-2xl font-bold font-headline">
                  {snapshot?.confidential.balance || "0"} {payrollToken.symbol}
                </span>
                <div className="h-1 bg-surface-container-highest mt-2 rounded-full overflow-hidden">
                  <div className="w-[65%] h-full brand-gradient" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
                  DCA Orders
                </span>
                <span className="text-2xl font-bold font-headline">
                  {dcaOrders?.totalElements || 0}
                </span>
                <div className="h-1 bg-surface-container-highest mt-2 rounded-full overflow-hidden">
                  <div className="w-[45%] h-full brand-gradient" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-xl bg-surface-container-low p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-headline">
                  Treasury Pulse
                </h4>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Quick health checks for the live wallet session, validator route, and pending
                  confidential liquidity.
                </p>
              </div>
              <GuideButton
                label="Open treasury overview guide"
                onClick={() => setActiveGuide(TREASURY_GUIDES.overview)}
              />
            </div>
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => void refreshTreasury()}
                disabled={!canLoadTreasury || loading || isBusy}
                className={`rounded-lg p-2 transition-colors ${
                  !canLoadTreasury || loading || isBusy
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-surface-container-highest"
                }`}
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Yield Positions</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-tertiary">{snapshot?.lendingPositions || 0}</span>
                  <TrendingUp className="h-4 w-4 text-tertiary" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Staking Pool</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-tertiary">
                    {stakingPoolAddress ? compactAddress(stakingPoolAddress) : "Unavailable"}
                  </span>
                  <ChevronsUp className="h-4 w-4 text-tertiary" />
                </div>
              </div>
              <div className="rounded-xl bg-surface-container p-4 border border-outline-variant/10">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">
                  Pending Confidential Balance
                </p>
                <p className="text-lg font-black font-headline text-on-surface">
                  {snapshot?.confidential.pending || "0"} {payrollToken.symbol}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="space-y-5 rounded-xl bg-surface-container p-8">
            <SectionHeader
              title="Treasury Rebalance"
              description="Swap treasury inventory into the asset mix you want to hold or route toward payroll."
              icon={<ArrowRightLeft className="h-5 w-5 text-primary" />}
              onGuide={() => setActiveGuide(TREASURY_GUIDES.rebalance)}
            />
            <div className="grid grid-cols-3 gap-4">
              <select
                value={swapTokenSymbol}
                onChange={(event) => setSwapTokenSymbol(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <select
                value={swapTargetTokenSymbol}
                onChange={(event) => setSwapTargetTokenSymbol(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    To: {token.symbol}
                  </option>
                ))}
              </select>
              <input
                value={swapAmount}
                onChange={(event) => setSwapAmount(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="Amount"
              />
            </div>
            {swapSelectionInvalid && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-on-surface">
                Choose different source and destination tokens before requesting a swap quote.
              </div>
            )}
            {swapQuote && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                Estimated output:{" "}
                {Number(swapQuote.amountOutBase) / 10 ** selectedSwapTargetToken.decimals}{" "}
                {selectedSwapTargetToken.symbol}
              </div>
            )}
            <div className="flex gap-4">
              <ActionButton
                label="Quote Swap"
                disabled={!canOperate || isBusy || swapSelectionInvalid || !swapAmount.trim()}
                loading={runningAction === "quote-swap"}
                onClick={() =>
                  void handleAction("quote-swap", async () => {
                    const quote = await getSwapQuote(
                      wallet!,
                      selectedSwapToken,
                      selectedSwapTargetToken,
                      swapAmount
                    );
                    setSwapQuote(quote);
                  })
                }
              />
              <ActionButton
                label="Execute Swap"
                emphasis="primary"
                disabled={!canOperate || isBusy || swapSelectionInvalid || !swapAmount.trim()}
                loading={runningAction === "execute-swap"}
                onClick={() =>
                  void handleAction("execute-swap", async () => {
                    await executeTreasurySwap(
                      wallet!,
                      address!,
                      selectedSwapToken,
                      selectedSwapTargetToken,
                      swapAmount
                    );
                    setSwapQuote(null);
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-5 rounded-xl bg-surface-container p-8">
            <SectionHeader
              title="DCA Accumulation"
              description={`Automate recurring purchases into ${payrollToken.symbol} so payroll inventory can build up gradually.`}
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              onGuide={() => setActiveGuide(TREASURY_GUIDES.dca)}
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={dcaSellTokenSymbol}
                onChange={(event) => setDcaSellTokenSymbol(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <input
                value={dcaFrequency}
                onChange={(event) => setDcaFrequency(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="P1W"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                value={dcaTotalAmount}
                onChange={(event) => setDcaTotalAmount(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="Total amount"
              />
              <input
                value={dcaCycleAmount}
                onChange={(event) => setDcaCycleAmount(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="Cycle amount"
              />
            </div>
            {dcaSelectionInvalid && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-on-surface">
                Choose a sell token that differs from the payroll asset before previewing or creating
                a DCA order.
              </div>
            )}
            {dcaPreview && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                Projected buy per cycle: {Number(dcaPreview.amountOutBase) / 10 ** payrollToken.decimals}{" "}
                {payrollToken.symbol}
              </div>
            )}
            <div className="flex gap-4">
              <ActionButton
                label="Preview Cycle"
                disabled={!canOperate || isBusy || dcaSelectionInvalid || !dcaCycleAmount.trim()}
                loading={runningAction === "preview-dca"}
                onClick={() =>
                  void handleAction("preview-dca", async () => {
                    const preview = await previewDcaCycle(wallet!, selectedDcaToken, dcaCycleAmount);
                    setDcaPreview(preview);
                  })
                }
              />
              <ActionButton
                label="Create DCA"
                emphasis="primary"
                disabled={
                  !canOperate ||
                  isBusy ||
                  dcaSelectionInvalid ||
                  !dcaCycleAmount.trim() ||
                  !dcaTotalAmount.trim() ||
                  !dcaFrequency.trim()
                }
                loading={runningAction === "create-dca"}
                onClick={() =>
                  void handleAction("create-dca", async () => {
                    await createTreasuryDca(
                      wallet!,
                      address!,
                      selectedDcaToken,
                      dcaTotalAmount,
                      dcaCycleAmount,
                      dcaFrequency
                    );
                    setDcaPreview(null);
                  })
                }
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="space-y-5 rounded-xl bg-surface-container p-8">
            <SectionHeader
              title="Vesu Yield"
              description="Manage lending deposits, withdrawals, and risk simulation from the same treasury workspace."
              icon={<PiggyBank className="h-5 w-5 text-primary" />}
              onGuide={() => setActiveGuide(TREASURY_GUIDES.yield)}
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={lendTokenSymbol}
                onChange={(event) => setLendTokenSymbol(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
              >
                {tokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
              <input
                value={lendAmount}
                onChange={(event) => setLendAmount(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                placeholder="Amount"
              />
            </div>
            <div className="flex gap-4">
              <ActionButton
                label="Deposit"
                disabled={!canOperate || isBusy || !lendAmount.trim()}
                loading={runningAction === "lend-deposit"}
                onClick={() =>
                  void handleAction("lend-deposit", async () => {
                    await depositToLending(wallet!, address!, selectedLendToken, lendAmount);
                  })
                }
              />
              <ActionButton
                label="Withdraw"
                emphasis="primary"
                disabled={!canOperate || isBusy || !lendAmount.trim()}
                loading={runningAction === "lend-withdraw"}
                onClick={() =>
                  void handleAction("lend-withdraw", async () => {
                    await withdrawFromLending(wallet!, address!, selectedLendToken, lendAmount);
                  })
                }
              />
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
                Borrow Health Simulator
              </p>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={healthCollateralToken}
                  onChange={(event) => setHealthCollateralToken(event.target.value)}
                  className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                >
                  {tokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      Collateral: {token.symbol}
                    </option>
                  ))}
                </select>
                <select
                  value={healthDebtToken}
                  onChange={(event) => setHealthDebtToken(event.target.value)}
                  className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                >
                  {tokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      Debt: {token.symbol}
                    </option>
                  ))}
                </select>
                <input
                  value={healthCollateralAmount}
                  onChange={(event) => setHealthCollateralAmount(event.target.value)}
                  className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                  placeholder="Collateral amount"
                />
                <input
                  value={healthBorrowAmount}
                  onChange={(event) => setHealthBorrowAmount(event.target.value)}
                  className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
                  placeholder="Borrow amount"
                />
              </div>
              <div className="mt-4 flex">
                <ActionButton
                  label="Quote Health"
                  disabled={
                    !canOperate ||
                    isBusy ||
                    !healthCollateralAmount.trim() ||
                    !healthBorrowAmount.trim()
                  }
                  loading={runningAction === "quote-health"}
                  onClick={() =>
                    void handleAction("quote-health", async () => {
                      const quote = await quoteBorrowHealth(
                        wallet!,
                        selectedCollateralToken,
                        selectedDebtToken,
                        healthCollateralAmount,
                        healthBorrowAmount
                      );
                      setHealthQuote(quote);
                    })
                  }
                />
              </div>
              {healthQuote && (
                <div className="mt-4 text-sm text-on-surface">
                  Current debt value: {healthQuote.current.debtValue.toString()}
                  <br />
                  Current collateral value: {healthQuote.current.collateralValue.toString()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-5 rounded-xl bg-surface-container p-8">
            <SectionHeader
              title="External Funding + Staking"
              description="Bridge assets from another chain into Starknet, then put idle STRK to work with the default validator."
              icon={<Link2 className="h-5 w-5 text-primary" />}
              onGuide={() => setActiveGuide(TREASURY_GUIDES.bridgeStake)}
            />
            <div className="grid grid-cols-3 gap-4">
              <select
                value={bridgeSource}
                onChange={(event) => setBridgeSource(event.target.value as BridgeSource)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none"
              >
                <option value="ethereum">Ethereum</option>
                <option value="solana">Solana</option>
              </select>
              <select
                value={selectedBridgeTokenId}
                onChange={(event) => setSelectedBridgeTokenId(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none col-span-2"
              >
                {bridgeTokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={bridgeAmount}
              onChange={(event) => setBridgeAmount(event.target.value)}
              className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none w-full"
              placeholder="Bridge amount"
            />
            {!selectedBridgeToken && (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-on-surface">
                Waiting for bridge routes. Refresh treasury data or change the source network if no
                tokens appear.
              </div>
            )}
            {bridgeEstimateText && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                {bridgeEstimateText}
              </div>
            )}
            <div className="flex gap-4">
              <ActionButton
                label="Estimate Bridge"
                disabled={!canOperate || isBusy || !selectedBridgeToken || !bridgeAmount.trim()}
                loading={runningAction === "estimate-bridge"}
                onClick={() =>
                  void handleAction("estimate-bridge", async () => {
                    if (!selectedBridgeToken) {
                      throw new Error("Select a bridge token first");
                    }

                    const estimate = await estimateBridge(wallet!, bridgeSource, selectedBridgeToken);
                    const fees =
                      "l1Fee" in estimate.fees
                        ? `L1 ${estimate.fees.l1Fee.toFormatted(true)} + L2 ${estimate.fees.l2Fee.toFormatted(
                            true
                          )}`
                        : `Local ${estimate.fees.localFee.toFormatted(true)} + Interchain ${estimate.fees.interchainFee.toFormatted(
                            true
                          )}`;
                    setBridgeEstimateText(
                      `Available balance: ${estimate.balance.toFormatted(true)}. Estimated fees: ${fees}`
                    );
                  })
                }
              />
              <ActionButton
                label="Bridge Funds"
                emphasis="primary"
                disabled={!canOperate || isBusy || !selectedBridgeToken || !bridgeAmount.trim()}
                loading={runningAction === "bridge-funds"}
                onClick={() =>
                  void handleAction("bridge-funds", async () => {
                    if (!selectedBridgeToken) {
                      throw new Error("Select a bridge token first");
                    }

                    await executeBridge(wallet!, address!, bridgeSource, selectedBridgeToken, bridgeAmount);
                    setBridgeEstimateText(null);
                  })
                }
              />
            </div>

            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-4 h-4 text-tertiary" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Staking Strategy
                </span>
              </div>
              <input
                value={stakeAmount}
                onChange={(event) => setStakeAmount(event.target.value)}
                className="bg-surface-container-highest/40 rounded-lg px-4 py-3 text-sm outline-none w-full mb-4"
                placeholder="STRK amount"
              />
              <div className="flex gap-4">
                <ActionButton
                  label="Stake STRK"
                  disabled={!canOperate || isBusy || !stakeAmount.trim()}
                  loading={runningAction === "stake"}
                  onClick={() =>
                    void handleAction("stake", async () => {
                      await stakeTreasury(wallet!, address!, stakeAmount);
                    })
                  }
                />
                <ActionButton
                  label="Claim Rewards"
                  emphasis="primary"
                  disabled={!canOperate || isBusy}
                  loading={runningAction === "claim-rewards"}
                  onClick={() =>
                    void handleAction("claim-rewards", async () => {
                      await claimStakingRewards(wallet!, address!);
                    })
                  }
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-surface-container rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <BadgeCheck className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Active Positions
              </h4>
            </div>
            <div className="space-y-3">
              {lendingPositions.length === 0 && (
                <p className="text-sm text-on-surface-variant">No active lending positions</p>
              )}
              {lendingPositions.map((position) => (
                <div
                  key={`${position.pool.id}-${position.type}`}
                  className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10"
                >
                  <p className="text-sm font-bold text-on-surface">
                    {position.pool.name || compactAddress(position.pool.id)}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {position.type.toUpperCase()} • {position.collateral.token.symbol} •{" "}
                    {position.collateral.amount.toString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Treasury History
              </h4>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {history.length === 0 && (
                <p className="text-sm text-on-surface-variant">No treasury actions yet.</p>
              )}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10"
                >
                  <p className="text-sm font-bold text-on-surface">{entry.action_type}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {entry.status.toUpperCase()}
                    {entry.tx_hash ? ` • ${compactAddress(entry.tx_hash)}` : ""}
                    {entry.external_tx_hash ? ` • ${compactAddress(entry.external_tx_hash)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-surface-container rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
              Protocol Coverage
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Swap</p>
              <p className="text-lg font-black font-headline mt-2">AVNU</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">DCA</p>
              <p className="text-lg font-black font-headline mt-2">
                {dcaOrders?.totalElements || 0} Orders
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Lending</p>
              <p className="text-lg font-black font-headline mt-2">{lendingMarkets.length} Markets</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Bridge</p>
              <p className="text-lg font-black font-headline mt-2">{bridgeTokens.length} Routes</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant">Stake</p>
              <p className="text-lg font-black font-headline mt-2">
                {snapshot?.stakingPosition ? "Active" : "Ready"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

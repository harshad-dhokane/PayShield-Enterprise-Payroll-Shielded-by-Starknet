"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  BadgeCheck,
  ChevronsUp,
  Coins,
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

  const selectedSwapToken = resolveToken(tokens, swapTokenSymbol);
  const selectedSwapTargetToken = resolveToken(tokens, swapTargetTokenSymbol);
  const selectedDcaToken = resolveToken(tokens, dcaSellTokenSymbol);
  const selectedLendToken = resolveToken(tokens, lendTokenSymbol);
  const selectedCollateralToken = resolveToken(tokens, healthCollateralToken);
  const selectedDebtToken = resolveToken(tokens, healthDebtToken);
  const selectedBridgeToken = bridgeTokens.find((token) => token.id === selectedBridgeTokenId) || null;

  useEffect(() => {
    if (!wallet || !localMasterKey || !address) {
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
          loadTreasurySnapshot(wallet, localMasterKey),
          loadTreasuryHistory(address),
          loadDcaOrders(wallet),
          loadLendingMarkets(wallet),
          loadLendingPositions(wallet),
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
  }, [address, bridgeSource, localMasterKey, wallet]);

  useEffect(() => {
    if (selectedBridgeTokenId || bridgeTokens.length === 0) {
      return;
    }

    setSelectedBridgeTokenId(bridgeTokens[0].id);
  }, [bridgeTokens, selectedBridgeTokenId]);

  const refreshTreasury = async () => {
    if (!wallet || !localMasterKey || !address) {
      return;
    }

    setStatusMessage(null);
    const [nextSnapshot, nextHistory, nextDcaOrders, nextLendingPositions] = await Promise.allSettled([
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
  };

  const handleAction = async (action: () => Promise<void>) => {
    try {
      setStatusMessage(null);
      await action();
      await refreshTreasury();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Treasury action failed");
    }
  };

  const totalTreasuryBalance =
    snapshot?.balances.reduce((total, balance) => total + Number(balance.amount || 0), 0) || 0;

  return (
    <>
      <TopBar title="StarkZap Treasury" />
      <div className="p-8 space-y-8">
        {statusMessage && (
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/10 text-sm text-on-surface">
            {statusMessage}
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container rounded-xl p-8 neon-glow-primary relative overflow-hidden flex flex-col justify-between min-h-[320px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[100px] -mr-32 -mt-32" />
            <div>
              <p className="text-on-surface-variant uppercase tracking-[0.2em] text-xs font-bold font-headline mb-2">
                Total Treasury Balance
              </p>
              <h3 className="text-6xl font-black font-headline tracking-tighter text-on-surface flex items-baseline gap-2">
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
            <div className="grid grid-cols-2 gap-8 mt-12">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
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

          <div className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant font-headline">
                Treasury Pulse
              </h4>
              <button
                onClick={() => void refreshTreasury()}
                className="p-2 rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Yield Positions</span>
                <div className="flex items-center gap-2">
                  <span className="text-tertiary font-bold">{snapshot?.lendingPositions || 0}</span>
                  <TrendingUp className="w-4 h-4 text-tertiary" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant">Staking Pool</span>
                <div className="flex items-center gap-2">
                  <span className="text-tertiary font-bold">
                    {stakingPoolAddress ? compactAddress(stakingPoolAddress) : "Unavailable"}
                  </span>
                  <ChevronsUp className="w-4 h-4 text-tertiary" />
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

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-surface-container rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Treasury Rebalance
              </h4>
            </div>
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
            {swapQuote && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                Estimated output:{" "}
                {Number(swapQuote.amountOutBase) / 10 ** selectedSwapTargetToken.decimals}{" "}
                {selectedSwapTargetToken.symbol}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() =>
                  void handleAction(async () => {
                    const quote = await getSwapQuote(
                      wallet!,
                      selectedSwapToken,
                      selectedSwapTargetToken,
                      swapAmount
                    );
                    setSwapQuote(quote);
                  })
                }
                className="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Quote Swap
              </button>
              <button
                onClick={() =>
                  void handleAction(async () => {
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
                className="flex-1 py-3 rounded-lg brand-gradient text-on-primary-container text-xs font-bold uppercase tracking-widest"
              >
                Execute Swap
              </button>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                DCA Accumulation
              </h4>
            </div>
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
            {dcaPreview && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                Projected buy per cycle: {Number(dcaPreview.amountOutBase) / 10 ** payrollToken.decimals}{" "}
                {payrollToken.symbol}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() =>
                  void handleAction(async () => {
                    const preview = await previewDcaCycle(wallet!, selectedDcaToken, dcaCycleAmount);
                    setDcaPreview(preview);
                  })
                }
                className="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Preview Cycle
              </button>
              <button
                onClick={() =>
                  void handleAction(async () => {
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
                className="flex-1 py-3 rounded-lg brand-gradient text-on-primary-container text-xs font-bold uppercase tracking-widest"
              >
                Create DCA
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-surface-container rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3">
              <PiggyBank className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                Vesu Yield
              </h4>
            </div>
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
              <button
                onClick={() =>
                  void handleAction(async () => {
                    await depositToLending(wallet!, address!, selectedLendToken, lendAmount);
                  })
                }
                className="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Deposit
              </button>
              <button
                onClick={() =>
                  void handleAction(async () => {
                    await withdrawFromLending(wallet!, address!, selectedLendToken, lendAmount);
                  })
                }
                className="flex-1 py-3 rounded-lg brand-gradient text-on-primary-container text-xs font-bold uppercase tracking-widest"
              >
                Withdraw
              </button>
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
              <button
                onClick={() =>
                  void handleAction(async () => {
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
                className="mt-4 w-full py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Quote Health
              </button>
              {healthQuote && (
                <div className="mt-4 text-sm text-on-surface">
                  Current debt value: {healthQuote.current.debtValue.toString()}
                  <br />
                  Current collateral value: {healthQuote.current.collateralValue.toString()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-8 space-y-5">
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
                External Funding + Staking
              </h4>
            </div>
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
            {bridgeEstimateText && (
              <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/10 text-sm">
                {bridgeEstimateText}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() =>
                  void handleAction(async () => {
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
                className="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
              >
                Estimate Bridge
              </button>
              <button
                onClick={() =>
                  void handleAction(async () => {
                    if (!selectedBridgeToken) {
                      throw new Error("Select a bridge token first");
                    }

                    await executeBridge(wallet!, address!, bridgeSource, selectedBridgeToken, bridgeAmount);
                    setBridgeEstimateText(null);
                  })
                }
                className="flex-1 py-3 rounded-lg brand-gradient text-on-primary-container text-xs font-bold uppercase tracking-widest"
              >
                Bridge Funds
              </button>
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
                <button
                  onClick={() =>
                    void handleAction(async () => {
                      await stakeTreasury(wallet!, address!, stakeAmount);
                    })
                  }
                  className="flex-1 py-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-bold uppercase tracking-widest"
                >
                  Stake STRK
                </button>
                <button
                  onClick={() =>
                    void handleAction(async () => {
                      await claimStakingRewards(wallet!, address!);
                    })
                  }
                  className="flex-1 py-3 rounded-lg brand-gradient text-on-primary-container text-xs font-bold uppercase tracking-widest"
                >
                  Claim Rewards
                </button>
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

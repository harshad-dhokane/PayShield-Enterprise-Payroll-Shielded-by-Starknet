import {
  Amount,
  ConnectedEthereumWallet,
  ConnectedSolanaWallet,
  ExternalChain,
  SolanaNetwork,
  type Address,
  type BridgeToken,
  type ConnectedExternalWallet,
  type LendingHealthQuote,
  type LendingMarket,
  type LendingUserPosition,
  type Pool,
  type PoolMember,
  type SwapQuote,
  type Token,
  type Tx,
  type WalletInterface,
} from "starkzap";
import type { Eip1193Provider, SolanaProvider } from "starkzap";
import { supabase } from "@/lib/supabase";
import { starkZapClient } from "@/lib/starkzap";
import {
  createStarkZapSdk,
  getConfidentialPayrollToken,
  getDefaultValidator,
  getTreasuryTokenOptions,
} from "@/lib/starkzap-sdk";

const treasurySdk = createStarkZapSdk();

export type BridgeSource = "ethereum" | "solana";

export interface TreasuryBalance {
  symbol: string;
  amount: string;
}

export interface TreasurySnapshot {
  balances: TreasuryBalance[];
  confidential: {
    address: string;
    balance: string;
    pending: string;
    nonce: string;
  };
  dcaOrders: number;
  lendingPositions: number;
  stakingPool: Pool | null;
  stakingPosition: PoolMember | null;
}

interface RecordTreasuryActionInput {
  adminAddress: string;
  actionType: string;
  status: string;
  tokenIn?: string | null;
  tokenOut?: string | null;
  amount?: string | null;
  feeMode?: string | null;
  txHash?: string | null;
  externalTxHash?: string | null;
  metadata?: Record<string, unknown>;
}

interface BrowserSolanaProvider extends SolanaProvider {
  connect(): Promise<{ publicKey?: { toBase58(): string } }>;
  publicKey?: { toBase58(): string };
}

function isMissingTreasuryTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? String(error.code) : "";
  const message = "message" in error ? String(error.message) : "";

  return code === "PGRST205" || message.includes("Could not find the table 'public.treasury_actions'");
}

function getPayrollTokenOrThrow() {
  const payrollToken = getConfidentialPayrollToken();
  if (!payrollToken) {
    throw new Error("Confidential payroll token is not configured for this network");
  }

  return payrollToken;
}

function assertDifferentTokens(tokenIn: Token, tokenOut: Token, action: string) {
  const sameAddress = tokenIn.address.toLowerCase() === tokenOut.address.toLowerCase();
  const sameSymbol = tokenIn.symbol.toUpperCase() === tokenOut.symbol.toUpperCase();

  if (sameAddress || sameSymbol) {
    throw new Error(
      `Cannot ${action} ${tokenIn.symbol} into ${tokenOut.symbol}. Select a different source token.`
    );
  }
}

async function recordTreasuryAction(input: RecordTreasuryActionInput) {
  const { error } = await supabase.from("treasury_actions").insert({
    admin_address: input.adminAddress,
    action_type: input.actionType,
    status: input.status,
    token_in: input.tokenIn || null,
    token_out: input.tokenOut || null,
    amount: input.amount || null,
    fee_mode: input.feeMode || null,
    tx_hash: input.txHash || null,
    external_tx_hash: input.externalTxHash || null,
    metadata: input.metadata || null,
  });

  if (error) {
    if (isMissingTreasuryTableError(error)) {
      console.warn("treasury_actions table is missing; skipping treasury action persistence");
      return;
    }

    throw error;
  }
}

async function waitForTreasuryTx(
  tx: Tx,
  adminAddress: string,
  actionType: string,
  metadata: Record<string, unknown>
) {
  await tx.wait();

  await recordTreasuryAction({
    adminAddress,
    actionType,
    status: "confirmed",
    feeMode: null,
    txHash: tx.hash,
    metadata: {
      explorerUrl: tx.explorerUrl,
      ...metadata,
    },
  });

  return tx;
}

async function connectExternalWallet(
  wallet: WalletInterface,
  source: BridgeSource
): Promise<ConnectedExternalWallet> {
  if (source === "ethereum") {
    const provider = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!provider) {
      throw new Error("No injected Ethereum wallet found in this browser");
    }

    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    const chainId = (await provider.request({ method: "eth_chainId" })) as string;

    return ConnectedEthereumWallet.from(
      {
        chain: ExternalChain.ETHEREUM,
        provider,
        address: accounts[0],
        chainId,
      },
      wallet.getChainId()
    );
  }

  const provider = (window as Window & { solana?: BrowserSolanaProvider }).solana;
  if (!provider) {
    throw new Error("No injected Solana wallet found in this browser");
  }

  const response = await provider.connect();
  const address = response.publicKey?.toBase58() || provider.publicKey?.toBase58();
  if (!address) {
    throw new Error("Unable to resolve the connected Solana wallet address");
  }

  return ConnectedSolanaWallet.from(
    {
      chain: ExternalChain.SOLANA,
      provider,
      address,
      chainId: wallet.getChainId().isMainnet() ? SolanaNetwork.MAINNET : SolanaNetwork.TESTNET,
    },
    wallet.getChainId()
  );
}

export async function loadTreasurySnapshot(
  wallet: WalletInterface,
  lmk: string
): Promise<TreasurySnapshot> {
  const tokenOptions = getTreasuryTokenOptions().slice(0, 4);
  const balances = await Promise.all(
    tokenOptions.map(async ({ token }) => ({
      symbol: token.symbol,
      amount: (await wallet.balanceOf(token)).toUnit(),
    }))
  );
  let confidential: TreasurySnapshot["confidential"] = {
    address: "Unavailable",
    balance: "0",
    pending: "0",
    nonce: "0",
  };
  try {
    confidential = await starkZapClient.getCompanyConfidentialOverview(wallet, lmk);
  } catch (error) {
    console.warn("Failed to load company confidential overview", error);
  }

  let dcaOrders = 0;
  try {
    dcaOrders = (await wallet.dca().getOrders({ size: 20 })).totalElements;
  } catch {
    dcaOrders = 0;
  }

  let lendingPositions = 0;
  try {
    const positions = await wallet.lending().getPositions();
    lendingPositions = positions.length;
  } catch {
    lendingPositions = 0;
  }

  const defaultValidator = getDefaultValidator();
  let stakingPool: Pool | null = null;
  let stakingPosition: PoolMember | null = null;

  if (defaultValidator) {
    try {
      const stakeablePools = await treasurySdk.getStakerPools(
        defaultValidator.stakerAddress as Address
      );
      stakingPool =
        stakeablePools.find((pool) => pool.token.symbol === "STRK") || stakeablePools[0] || null;

      if (stakingPool) {
        try {
          stakingPosition = await wallet.getPoolPosition(stakingPool.poolContract);
        } catch {
          stakingPosition = null;
        }
      }
    } catch {
      stakingPool = null;
      stakingPosition = null;
    }
  }

  return {
    balances,
    confidential,
    dcaOrders,
    lendingPositions,
    stakingPool,
    stakingPosition,
  };
}

export async function getSwapQuote(
  wallet: WalletInterface,
  tokenIn: Token,
  tokenOut: Token,
  amount: string
) {
  assertDifferentTokens(tokenIn, tokenOut, "swap");

  return wallet.getQuote({
    provider: "avnu",
    tokenIn,
    tokenOut,
    amountIn: Amount.parse(amount, tokenIn),
  });
}

export async function executeTreasurySwap(
  wallet: WalletInterface,
  adminAddress: string,
  tokenIn: Token,
  tokenOut: Token,
  amount: string
) {
  assertDifferentTokens(tokenIn, tokenOut, "swap");
  const tx = await wallet.swap(
    {
      provider: "avnu",
      tokenIn,
      tokenOut,
      amountIn: Amount.parse(amount, tokenIn),
    },
    {
      feeMode: wallet.getFeeMode(),
    }
  );

  await waitForTreasuryTx(tx, adminAddress, "swap", {
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
    amount,
  });

  return tx;
}

export async function previewDcaCycle(wallet: WalletInterface, sellToken: Token, amountPerCycle: string) {
  const payrollToken = getPayrollTokenOrThrow();
  assertDifferentTokens(sellToken, payrollToken, "create a DCA order");

  return wallet.dca().previewCycle({
    sellToken,
    buyToken: payrollToken,
    sellAmountPerCycle: Amount.parse(amountPerCycle, sellToken),
  });
}

export async function createTreasuryDca(
  wallet: WalletInterface,
  adminAddress: string,
  sellToken: Token,
  totalAmount: string,
  cycleAmount: string,
  frequency: string
) {
  const payrollToken = getPayrollTokenOrThrow();
  assertDifferentTokens(sellToken, payrollToken, "create a DCA order");
  const tx = await wallet.dca().create(
    {
      provider: "avnu",
      sellToken,
      buyToken: payrollToken,
      sellAmount: Amount.parse(totalAmount, sellToken),
      sellAmountPerCycle: Amount.parse(cycleAmount, sellToken),
      frequency,
    },
    {
      feeMode: wallet.getFeeMode(),
    }
  );

  await waitForTreasuryTx(tx, adminAddress, "dca_create", {
    tokenIn: sellToken.symbol,
    tokenOut: payrollToken.symbol,
    totalAmount,
    cycleAmount,
    frequency,
  });

  return tx;
}

export async function loadDcaOrders(wallet: WalletInterface) {
  return wallet.dca().getOrders({ size: 20 });
}

export async function loadLendingMarkets(wallet: WalletInterface): Promise<LendingMarket[]> {
  return wallet.lending().getMarkets();
}

export async function loadLendingPositions(wallet: WalletInterface): Promise<LendingUserPosition[]> {
  return wallet.lending().getPositions();
}

export async function depositToLending(
  wallet: WalletInterface,
  adminAddress: string,
  token: Token,
  amount: string
) {
  const tx = await wallet.lending().deposit(
    {
      token,
      amount: Amount.parse(amount, token),
    },
    {
      feeMode: wallet.getFeeMode(),
    }
  );

  await waitForTreasuryTx(tx, adminAddress, "lend_deposit", {
    tokenIn: token.symbol,
    amount,
  });

  return tx;
}

export async function withdrawFromLending(
  wallet: WalletInterface,
  adminAddress: string,
  token: Token,
  amount: string
) {
  const tx = await wallet.lending().withdraw(
    {
      token,
      amount: Amount.parse(amount, token),
    },
    {
      feeMode: wallet.getFeeMode(),
    }
  );

  await waitForTreasuryTx(tx, adminAddress, "lend_withdraw", {
    tokenIn: token.symbol,
    amount,
  });

  return tx;
}

export async function quoteBorrowHealth(
  wallet: WalletInterface,
  collateralToken: Token,
  debtToken: Token,
  collateralAmount: string,
  borrowAmount: string
): Promise<LendingHealthQuote> {
  return wallet.lending().quoteHealth({
    action: {
      action: "borrow",
      request: {
        collateralToken,
        debtToken,
        amount: Amount.parse(borrowAmount, debtToken),
        collateralAmount: Amount.parse(collateralAmount, collateralToken),
      },
    },
    health: {
      collateralToken,
      debtToken,
    },
    feeMode: wallet.getFeeMode(),
  });
}

export async function getBridgeTokens(source: BridgeSource) {
  return treasurySdk.getBridgingTokens(
    source === "ethereum" ? ExternalChain.ETHEREUM : ExternalChain.SOLANA
  );
}

export async function estimateBridge(
  wallet: WalletInterface,
  source: BridgeSource,
  token: BridgeToken
) {
  const externalWallet = await connectExternalWallet(wallet, source);
  const balance = await wallet.getDepositBalance(token, externalWallet);
  const fees = await wallet.getDepositFeeEstimate(token, externalWallet);

  return {
    balance,
    fees,
  };
}

export async function executeBridge(
  wallet: WalletInterface,
  adminAddress: string,
  source: BridgeSource,
  token: BridgeToken,
  amount: string
) {
  const externalWallet = await connectExternalWallet(wallet, source);
  const response = await wallet.deposit(
    wallet.address,
    Amount.parse(amount, token.decimals, token.symbol),
    token,
    externalWallet
  );

  await recordTreasuryAction({
    adminAddress,
    actionType: "bridge_deposit",
    status: "submitted",
    tokenIn: token.symbol,
    amount,
    externalTxHash: response.hash,
    metadata: {
      source,
      starknetRecipient: wallet.address,
    },
  });

  return response;
}

export async function getDefaultStakingPool() {
  const defaultValidator = getDefaultValidator();
  if (!defaultValidator) {
    return null;
  }

  const pools = await treasurySdk.getStakerPools(defaultValidator.stakerAddress as Address);
  return pools.find((pool) => pool.token.symbol === "STRK") || pools[0] || null;
}

export async function stakeTreasury(wallet: WalletInterface, adminAddress: string, amount: string) {
  const pool = await getDefaultStakingPool();
  if (!pool) {
    throw new Error("No staking pool is available for the configured validator");
  }

  const tx = await wallet.stake(pool.poolContract, Amount.parse(amount, pool.token), {
    feeMode: wallet.getFeeMode(),
  });

  await waitForTreasuryTx(tx, adminAddress, "stake", {
    validatorPool: pool.poolContract,
    amount,
    tokenIn: pool.token.symbol,
  });

  return tx;
}

export async function claimStakingRewards(wallet: WalletInterface, adminAddress: string) {
  const pool = await getDefaultStakingPool();
  if (!pool) {
    throw new Error("No staking pool is available for the configured validator");
  }

  const tx = await wallet.claimPoolRewards(pool.poolContract, {
    feeMode: wallet.getFeeMode(),
  });

  await waitForTreasuryTx(tx, adminAddress, "stake_claim_rewards", {
    validatorPool: pool.poolContract,
    tokenIn: pool.token.symbol,
  });

  return tx;
}

export async function loadTreasuryHistory(adminAddress: string) {
  const { data, error } = await supabase
    .from("treasury_actions")
    .select("*")
    .eq("admin_address", adminAddress)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    if (isMissingTreasuryTableError(error)) {
      return [];
    }

    throw error;
  }

  return data ?? [];
}

export function getTreasuryTokens() {
  return getTreasuryTokenOptions().map((option) => option.token);
}

export function getPayrollToken() {
  return getPayrollTokenOrThrow();
}

export function formatQuoteAmount(quote: SwapQuote, token: Token) {
  return Amount.fromRaw(quote.amountOutBase, token).toUnit();
}

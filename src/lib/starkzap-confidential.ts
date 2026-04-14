import CryptoJS from "crypto-js";
import {
  Amount,
  TongoConfidential,
  TransactionFinalityStatus,
  type Address,
  type Call,
  type ConfidentialRecipient,
  type FeeMode,
  type PreflightResult,
  type Token,
  type WalletInterface,
} from "starkzap";
import type { EstimateFeeResponseOverhead } from "starknet";
import { pubKeyAffineToBase58, pubKeyBase58ToAffine } from "@fatsolutions/tongo-sdk";
import {
  type CompanyConfidentialProfile,
  type PayrollBatchItem,
  type PayrollExecutionPreview,
  type PayrollExecutionResult,
  type SerializedRecipient,
  isSerializedRecipient,
} from "@/lib/starkzap-models";
import {
  getConfiguredFeePreference,
  getConfiguredTongoContract,
  getConfidentialPayrollToken,
} from "@/lib/starkzap-sdk";

interface PreparedPayrollExecution {
  calls: Call[];
  payrollToken: Token;
  feeEstimate: EstimateFeeResponseOverhead;
  feeMode: FeeMode;
  preflight: PreflightResult;
  preview: PayrollExecutionPreview;
}

interface TongoContractIntrospection {
  Tongo: {
    ERC20(): Promise<string | bigint>;
  };
}

// Stark curve subgroup order expected by Tongo key utilities.
const TONGO_PRIVATE_KEY_ORDER =
  3618502788666131213697322783095070105526743751716087489154079457884512865583n;

function normalizePrivateKeyScalar(candidate: bigint): bigint {
  const range = TONGO_PRIVATE_KEY_ORDER - 1n;
  const normalized = ((candidate % range) + range) % range + 1n;

  if (normalized <= 0n || normalized >= TONGO_PRIVATE_KEY_ORDER) {
    throw new Error(`Unable to derive a valid Tongo private key scalar from seed ${candidate}`);
  }

  return normalized;
}

function normalizeCoordinate(value: bigint | number | string): string {
  if (typeof value === "bigint") {
    return `0x${value.toString(16)}`;
  }

  if (typeof value === "number") {
    return `0x${BigInt(value).toString(16)}`;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Recipient coordinate cannot be empty");
  }

  if (trimmed.startsWith("0x")) {
    return trimmed;
  }

  return `0x${BigInt(trimmed).toString(16)}`;
}

function toAmountUnitString(baseAmount: bigint, token: Token): string {
  return Amount.fromRaw(baseAmount, token).toUnit();
}

async function confidentialToPublicUnitString(
  confidential: TongoConfidential,
  confidentialAmount: bigint,
  token: Token
): Promise<string> {
  const publicBaseAmount = await confidential.toPublicUnits(confidentialAmount);
  return toAmountUnitString(publicBaseAmount, token);
}

function sumAmounts(amounts: Amount[]): Amount {
  if (amounts.length === 0) {
    const payrollToken = getConfidentialPayrollToken();
    if (!payrollToken) {
      throw new Error("Payroll token is not configured for this network");
    }

    return Amount.fromRaw(0n, payrollToken);
  }

  return amounts.slice(1).reduce((total, amount) => total.add(amount), amounts[0]);
}

async function executeCalls(
  wallet: WalletInterface,
  calls: Call[]
): Promise<{
  txHash: string;
  explorerUrl: string;
  feeMode: FeeMode;
  feeEstimate: EstimateFeeResponseOverhead;
  preflight: PreflightResult;
  receipt: Record<string, unknown>;
}> {
  const { feeMode, feeEstimate, preflight } = await resolveExecutionMode(wallet, calls);
  const tx = await wallet.execute(calls, { feeMode });

  await tx.wait({
    successStates: [TransactionFinalityStatus.ACCEPTED_ON_L2],
  });

  const receipt = await tx.receipt();

  return {
    txHash: tx.hash,
    explorerUrl: tx.explorerUrl,
    feeMode,
    feeEstimate,
    preflight,
    receipt: receipt as Record<string, unknown>,
  };
}

async function resolveExecutionMode(
  wallet: WalletInterface,
  calls: Call[]
): Promise<{
  feeMode: FeeMode;
  preflight: PreflightResult;
  feeEstimate: EstimateFeeResponseOverhead;
}> {
  const preferred = getConfiguredFeePreference();
  const modes: FeeMode[] =
    preferred === "sponsored" ? ["sponsored", "user_pays"] : ["user_pays", "sponsored"];

  let lastPreflight: PreflightResult = {
    ok: false,
    reason: "Unable to simulate the payroll transaction",
  };

  for (const feeMode of modes) {
    const preflight = await wallet.preflight({ calls, feeMode });
    if (!preflight.ok) {
      lastPreflight = preflight;
      continue;
    }

    const feeEstimate = await wallet.estimateFee(calls);
    return {
      feeMode,
      preflight,
      feeEstimate,
    };
  }

  throw new Error(lastPreflight.reason);
}

function normalizeStarknetAddress(value: string | bigint): string {
  return `0x${BigInt(value).toString(16)}`.toLowerCase();
}

async function assertConfiguredTongoToken(
  confidential: TongoConfidential,
  payrollToken: Token
): Promise<void> {
  const tongoAccount = confidential.getTongoAccount() as unknown as TongoContractIntrospection;
  const configuredContract = getConfiguredTongoContract();

  const wrappedTokenAddress = normalizeStarknetAddress(await tongoAccount.Tongo.ERC20());
  const expectedTokenAddress = payrollToken.address.toLowerCase();

  if (wrappedTokenAddress !== expectedTokenAddress) {
    throw new Error(
      `Configured Tongo contract ${configuredContract ?? "unknown"} wraps ${wrappedTokenAddress}, but payroll is configured for ${payrollToken.symbol} (${expectedTokenAddress}). Update NEXT_PUBLIC_TONGO_CONTRACT or NEXT_PUBLIC_TONGO_PAYROLL_TOKEN_SYMBOL so they point to the same Tongo instance.`
    );
  }
}

export function serializeRecipient(recipient: ConfidentialRecipient): SerializedRecipient {
  return {
    x: normalizeCoordinate(recipient.x),
    y: normalizeCoordinate(recipient.y),
  };
}

export function deserializeRecipient(recipient: SerializedRecipient): ConfidentialRecipient {
  return {
    x: recipient.x,
    y: recipient.y,
  };
}

export function recipientToAddress(recipient: SerializedRecipient): string {
  return pubKeyAffineToBase58(deserializeRecipient(recipient));
}

export function parseRecipientInput(input: string): SerializedRecipient {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("A Tongo recipient is required");
  }

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!isSerializedRecipient(parsed)) {
      throw new Error("Recipient JSON must include x and y coordinates");
    }

    return {
      x: normalizeCoordinate(parsed.x),
      y: normalizeCoordinate(parsed.y),
    };
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      throw new Error("Recipient array must contain [x, y]");
    }

    return {
      x: normalizeCoordinate(parsed[0] as string | number | bigint),
      y: normalizeCoordinate(parsed[1] as string | number | bigint),
    };
  }

  if (trimmed.includes(",")) {
    const [x, y] = trimmed.split(",").map((value) => value.trim());
    if (!x || !y) {
      throw new Error("Recipient coordinates must be provided as x,y");
    }

    return {
      x: normalizeCoordinate(x),
      y: normalizeCoordinate(y),
    };
  }

  try {
    const parsed = pubKeyBase58ToAffine(trimmed);
    return serializeRecipient(parsed);
  } catch {
    throw new Error(
      "Recipient must be a Tongo base58 address or JSON coordinates like {\"x\":\"0x...\",\"y\":\"0x...\"}"
    );
  }
}

export function parseStoredRecipient(
  storedRecipient: SerializedRecipient | null | undefined,
  fallbackAddress: string | null | undefined
): SerializedRecipient {
  if (storedRecipient && isSerializedRecipient(storedRecipient)) {
    return {
      x: normalizeCoordinate(storedRecipient.x),
      y: normalizeCoordinate(storedRecipient.y),
    };
  }

  if (fallbackAddress) {
    return parseRecipientInput(fallbackAddress);
  }

  throw new Error("Employee is missing a valid Tongo recipient");
}

export function deriveCompanyTongoPrivateKey(lmk: string, walletAddress: string): bigint {
  const digest = CryptoJS.SHA256(`${walletAddress}:${lmk}:starkzap-tongo-company`).toString(
    CryptoJS.enc.Hex
  );
  const seed = BigInt(`0x${digest}`);

  // Map SHA-256 output into the valid scalar range [1, ORDER - 1].
  return normalizePrivateKeyScalar(seed);
}

export function getCompanyConfidentialProfile(
  wallet: WalletInterface,
  lmk: string
): CompanyConfidentialProfile {
  const contractAddress = getConfiguredTongoContract();
  if (!contractAddress) {
    throw new Error("Tongo contract is not configured");
  }
  const typedContractAddress = contractAddress as Address;

  const privateKey = normalizePrivateKeyScalar(deriveCompanyTongoPrivateKey(lmk, wallet.address));
  const confidential = new TongoConfidential({
    privateKey,
    contractAddress: typedContractAddress,
    provider: wallet.getProvider(),
  });
  const recipient = serializeRecipient(confidential.recipientId);

  return {
    privateKey,
    address: confidential.address,
    recipient,
    contractAddress,
  };
}

export function createCompanyConfidential(wallet: WalletInterface, lmk: string) {
  const profile = getCompanyConfidentialProfile(wallet, lmk);

  return new TongoConfidential({
    privateKey: profile.privateKey,
    contractAddress: profile.contractAddress as Address,
    provider: wallet.getProvider(),
  });
}

export async function getCompanyConfidentialState(wallet: WalletInterface, lmk: string) {
  const payrollToken = getConfidentialPayrollToken();
  if (!payrollToken) {
    throw new Error("Payroll token is not configured for this network");
  }

  const confidential = createCompanyConfidential(wallet, lmk);
  await assertConfiguredTongoToken(confidential, payrollToken);
  const state = await confidential.getState();

  return {
    balance: await confidentialToPublicUnitString(confidential, state.balance, payrollToken),
    pending: await confidentialToPublicUnitString(confidential, state.pending, payrollToken),
    nonce: state.nonce.toString(),
  };
}

export async function preparePayrollExecution(
  wallet: WalletInterface,
  lmk: string,
  items: PayrollBatchItem[],
  options?: { sweepRemainderToTreasury?: boolean }
): Promise<PreparedPayrollExecution> {
  if (items.length === 0) {
    throw new Error("Add at least one employee to the payroll batch");
  }

  const payrollToken = getConfidentialPayrollToken();
  if (!payrollToken) {
    throw new Error("Payroll token is not configured for this network");
  }

  const confidential = createCompanyConfidential(wallet, lmk);
  await assertConfiguredTongoToken(confidential, payrollToken);
  const confidentialState = await confidential.getState();
  const profile = getCompanyConfidentialProfile(wallet, lmk);

  const payrollAmounts = items.map((item) => Amount.parse(item.amount, payrollToken));
  const confidentialAmounts = await Promise.all(
    payrollAmounts.map((amount) => confidential.toConfidentialUnits(amount))
  );
  const totalAmount = sumAmounts(payrollAmounts);
  const totalConfidentialAmount = confidentialAmounts.reduce((sum, amount) => sum + amount, 0n);
  const availableConfidentialBalance = confidentialState.balance;
  const fundAmountBase =
    totalConfidentialAmount > availableConfidentialBalance
      ? totalConfidentialAmount - availableConfidentialBalance
      : 0n;

  let calls: Call[];
  if (confidentialState.pending > 0n) {
    calls = await confidential.rollover({ sender: wallet.address });
  } else if (fundAmountBase > 0n) {
    calls = await confidential.fund({
      amount: Amount.fromRaw(fundAmountBase, 0, payrollToken.symbol),
      sender: wallet.address,
    });
  } else {
    calls = await confidential.transfer({
      amount: Amount.fromRaw(confidentialAmounts[0], 0, payrollToken.symbol),
      to: deserializeRecipient(items[0].tongoRecipient),
      sender: wallet.address,
    });
  }

  const { feeMode, feeEstimate, preflight } = await resolveExecutionMode(wallet, calls);
  const sweepAmountBase = options?.sweepRemainderToTreasury ?? true
    ? availableConfidentialBalance > totalConfidentialAmount
      ? availableConfidentialBalance - totalConfidentialAmount
      : 0n
    : 0n;

  return {
    calls,
    payrollToken,
    feeEstimate,
    feeMode,
    preflight,
    preview: {
      callsCount: calls.length,
      feeMode,
      preflight,
      feeEstimate,
      payrollTokenSymbol: payrollToken.symbol,
      totalAmount: totalAmount.toUnit(),
      fundAmount: await confidentialToPublicUnitString(confidential, fundAmountBase, payrollToken),
      sweepAmount: await confidentialToPublicUnitString(
        confidential,
        sweepAmountBase > 0n ? sweepAmountBase : 0n,
        payrollToken
      ),
      companyConfidentialAddress: profile.address,
      companyRecipient: profile.recipient,
      confidentialBalanceBefore: await confidentialToPublicUnitString(
        confidential,
        confidentialState.balance,
        payrollToken
      ),
      confidentialPendingBefore: await confidentialToPublicUnitString(
        confidential,
        confidentialState.pending,
        payrollToken
      ),
    },
  };
}

export async function executePayrollExecution(
  wallet: WalletInterface,
  lmk: string,
  items: PayrollBatchItem[],
  options?: { sweepRemainderToTreasury?: boolean }
): Promise<PayrollExecutionResult> {
  const prepared = await preparePayrollExecution(wallet, lmk, items, options);
  const payrollToken = prepared.payrollToken;
  const confidential = createCompanyConfidential(wallet, lmk);
  const transactions: Array<Record<string, unknown>> = [];

  let state = await confidential.getState();
  if (state.pending > 0n) {
    const rolloverCalls = await confidential.rollover({ sender: wallet.address });
    const rolloverTx = await executeCalls(wallet, rolloverCalls);
    transactions.push({
      step: "rollover",
      txHash: rolloverTx.txHash,
      explorerUrl: rolloverTx.explorerUrl,
      feeMode: rolloverTx.feeMode,
      receipt: rolloverTx.receipt,
    });
    state = await confidential.getState();
  }

  const payrollAmounts = items.map((item) => Amount.parse(item.amount, payrollToken));
  const confidentialAmounts = await Promise.all(
    payrollAmounts.map((amount) => confidential.toConfidentialUnits(amount))
  );
  const totalConfidentialAmount = confidentialAmounts.reduce((sum, amount) => sum + amount, 0n);

  if (state.balance < totalConfidentialAmount) {
    const fundCalls = await confidential.fund({
      amount: Amount.fromRaw(totalConfidentialAmount - state.balance, 0, payrollToken.symbol),
      sender: wallet.address,
    });
    const fundTx = await executeCalls(wallet, fundCalls);
    transactions.push({
      step: "fund",
      txHash: fundTx.txHash,
      explorerUrl: fundTx.explorerUrl,
      feeMode: fundTx.feeMode,
      receipt: fundTx.receipt,
    });
    state = await confidential.getState();
  }

  for (const [index, item] of items.entries()) {
    const transferCalls = await confidential.transfer({
      amount: Amount.fromRaw(confidentialAmounts[index], 0, payrollToken.symbol),
      to: deserializeRecipient(item.tongoRecipient),
      sender: wallet.address,
    });
    const transferTx = await executeCalls(wallet, transferCalls);
    transactions.push({
      step: "transfer",
      employeeId: item.employeeId,
      name: item.name,
      txHash: transferTx.txHash,
      explorerUrl: transferTx.explorerUrl,
      feeMode: transferTx.feeMode,
      receipt: transferTx.receipt,
    });
    state = await confidential.getState();
  }

  if ((options?.sweepRemainderToTreasury ?? true) && state.balance > 0n) {
    const withdrawCalls = await confidential.withdraw({
      amount: Amount.fromRaw(state.balance, 0, payrollToken.symbol),
      to: wallet.address,
      sender: wallet.address,
    });
    const withdrawTx = await executeCalls(wallet, withdrawCalls);
    transactions.push({
      step: "sweep",
      txHash: withdrawTx.txHash,
      explorerUrl: withdrawTx.explorerUrl,
      feeMode: withdrawTx.feeMode,
      receipt: withdrawTx.receipt,
    });
  }

  const lastTransaction = transactions[transactions.length - 1] as
    | {
        txHash?: string;
        explorerUrl?: string;
      }
    | undefined;

  return {
    txHash: lastTransaction?.txHash || "",
    explorerUrl: lastTransaction?.explorerUrl || "",
    feeMode: prepared.feeMode,
    preview: prepared.preview,
    receipt: {
      transactions,
    },
  };
}

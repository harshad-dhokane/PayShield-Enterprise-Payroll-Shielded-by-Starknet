import {
  AvnuDcaProvider,
  AvnuSwapProvider,
  ChainId,
  type CartridgeWalletInterface,
  type FeeMode,
  type ExplorerConfig,
  type OnboardOptions,
  type Token,
  OnboardStrategy,
  StarkZap,
  EkuboDcaProvider,
  EkuboSwapProvider,
  mainnetTokens,
  mainnetValidators,
  sepoliaTokens,
  sepoliaValidators,
} from "starkzap";
import type { PaymasterOptions } from "starknet";

export type StarkZapNetworkName = "mainnet" | "sepolia";
type StarkZapTokenMap = typeof mainnetTokens | typeof sepoliaTokens;

interface CartridgePolicy {
  target: string;
  method: string;
}

interface ValidatorPreset {
  name: string;
  stakerAddress: string;
  logoUrl: URL;
}

const DEFAULT_NETWORK: StarkZapNetworkName =
  process.env.NEXT_PUBLIC_STARKZAP_NETWORK === "mainnet" ? "mainnet" : "sepolia";

const EXPLORER_CONFIG: ExplorerConfig = {
  provider: "voyager",
};

const DEFAULT_TONGO_CONTRACTS_BY_TOKEN_ADDRESS: Record<StarkZapNetworkName, Record<string, string>> =
  {
    mainnet: {
      [mainnetTokens.STRK.address.toLowerCase()]:
        "0x03a542d7eb73b3e33a2c54e9827ec17a6365e289ec35ccc94dde97950d9db498",
      [mainnetTokens.ETH.address.toLowerCase()]:
        "0x0276e11a5428f6de18a38b7abc1d60abc75ce20aa3a925e20a393fcec9104f89",
      [mainnetTokens.USDC_E.address.toLowerCase()]:
        "0x072098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96",
      [mainnetTokens.USDC.address.toLowerCase()]:
        "0x026f79017c3c382148832c6ae50c22502e66f7a2f81ccbdb9e1377af31859d3a",
    },
    sepolia: {
      [sepoliaTokens.STRK.address.toLowerCase()]:
        "0x0408163bfcfc2d76f34b444cb55e09dace5905cf84c0884e4637c2c0f06ab6ed",
      [sepoliaTokens.ETH.address.toLowerCase()]:
        "0x02cf0dc1d9e8c7731353dd15e6f2f22140120ef2d27116b982fa4fed87f6fef5",
      [sepoliaTokens.USDC_E.address.toLowerCase()]:
        "0x02caae365e67921979a4e5c16dd70eaa5776cfc6a9592bcb903d91933aaf2552",
    },
  };

const DEFAULT_CONFIDENTIAL_TOKEN_SYMBOLS: Record<StarkZapNetworkName, string> = {
  mainnet: "USDC",
  sepolia: "STRK",
};

const DEFAULT_COMPANY_REGISTRY_METHODS = [
  "register_company",
  "add_employee",
  "record_payroll",
] as const;

const DEFAULT_TONGO_METHODS = ["fund", "transfer", "withdraw", "rollover", "ragequit"] as const;

function getConfiguredNetwork(): StarkZapNetworkName {
  return DEFAULT_NETWORK;
}

function getConfiguredChainId(): ChainId {
  return getConfiguredNetwork() === "mainnet" ? ChainId.MAINNET : ChainId.SEPOLIA;
}

function getConfiguredExplorer(): ExplorerConfig {
  return EXPLORER_CONFIG;
}

function getConfiguredRpcUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_STARKZAP_RPC_URL;
}

function getConfiguredPaymaster(): PaymasterOptions | undefined {
  const nodeUrl = process.env.NEXT_PUBLIC_STARKZAP_PAYMASTER_URL?.trim();
  if (!nodeUrl) {
    return undefined;
  }

  return { nodeUrl };
}

function getTokenMap(): StarkZapTokenMap {
  return getConfiguredNetwork() === "mainnet" ? mainnetTokens : sepoliaTokens;
}

function getConfiguredTokenSymbol(): string {
  return (
    process.env.NEXT_PUBLIC_TONGO_PAYROLL_TOKEN_SYMBOL?.trim() ||
    DEFAULT_CONFIDENTIAL_TOKEN_SYMBOLS[getConfiguredNetwork()]
  );
}

function getDefaultTongoContractForConfiguredToken(): string | null {
  const token = getConfidentialPayrollToken();
  if (!token) {
    return null;
  }

  return (
    DEFAULT_TONGO_CONTRACTS_BY_TOKEN_ADDRESS[getConfiguredNetwork()][token.address.toLowerCase()] ??
    null
  );
}

function findTokenByKeyOrSymbol(tokens: StarkZapTokenMap, symbolOrKey: string): Token | null {
  const normalized = symbolOrKey.trim().toUpperCase();

  for (const [key, token] of Object.entries(tokens)) {
    const symbol = token.symbol.trim().toUpperCase();
    if (key.toUpperCase() === normalized || symbol === normalized) {
      return token;
    }
  }

  return null;
}

function dedupePolicies(policies: CartridgePolicy[]): CartridgePolicy[] {
  const seen = new Set<string>();

  return policies.filter((policy) => {
    const key = `${policy.target}:${policy.method}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function readConfiguredPolicies(): CartridgePolicy[] {
  const policies: CartridgePolicy[] = [];
  const tongoContract = getConfiguredTongoContract();
  const payrollToken = getConfidentialPayrollToken();

  if (payrollToken) {
    policies.push({
      target: payrollToken.address,
      method: "approve",
    });
  }

  if (tongoContract) {
    for (const method of DEFAULT_TONGO_METHODS) {
      policies.push({
        target: tongoContract,
        method,
      });
    }
  }

  const companyRegistry = process.env.NEXT_PUBLIC_COMPANY_REGISTRY?.trim();
  if (companyRegistry) {
    const configuredMethods =
      process.env.NEXT_PUBLIC_COMPANY_REGISTRY_METHODS?.split(",")
        .map((method) => method.trim())
        .filter(Boolean) ?? [...DEFAULT_COMPANY_REGISTRY_METHODS];

    for (const method of configuredMethods) {
      policies.push({
        target: companyRegistry,
        method,
      });
    }
  }

  return dedupePolicies(policies);
}

function getConfiguredFeeMode(): FeeMode {
  return process.env.NEXT_PUBLIC_STARKZAP_FEE_MODE === "user_pays" ? "user_pays" : "sponsored";
}

function createSwapProviders() {
  return [new AvnuSwapProvider(), new EkuboSwapProvider()];
}

function createDcaProviders() {
  return [new AvnuDcaProvider(), new EkuboDcaProvider()];
}

function getConfiguredSwapProviderId() {
  return process.env.NEXT_PUBLIC_STARKZAP_SWAP_PROVIDER?.trim() || "avnu";
}

function getConfiguredDcaProviderId() {
  return process.env.NEXT_PUBLIC_STARKZAP_DCA_PROVIDER?.trim() || "avnu";
}

function getValidatorPresets(): ValidatorPreset[] {
  return Object.values(
    getConfiguredNetwork() === "mainnet" ? mainnetValidators : sepoliaValidators
  );
}

export function createStarkZapSdk() {
  const network = getConfiguredNetwork();
  const rpcUrl = getConfiguredRpcUrl();
  const paymaster = getConfiguredPaymaster();

  return new StarkZap({
    network,
    ...(rpcUrl ? { rpcUrl } : {}),
    ...(paymaster ? { paymaster } : {}),
    explorer: getConfiguredExplorer(),
    bridging: {
      layerZeroApiKey: process.env.NEXT_PUBLIC_LAYERZERO_API_KEY,
      ethereumRpcUrl: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
      solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    },
  });
}

export function createCartridgeOnboardOptions(): OnboardOptions {
  return {
    strategy: OnboardStrategy.Cartridge,
    deploy: "if_needed",
    feeMode: getConfiguredFeeMode(),
    swapProviders: createSwapProviders(),
    defaultSwapProviderId: getConfiguredSwapProviderId(),
    dcaProviders: createDcaProviders(),
    defaultDcaProviderId: getConfiguredDcaProviderId(),
    cartridge: {
      policies: readConfiguredPolicies(),
      explorer: getConfiguredExplorer(),
      ...(process.env.NEXT_PUBLIC_CARTRIDGE_URL
        ? { url: process.env.NEXT_PUBLIC_CARTRIDGE_URL }
        : {}),
      ...(process.env.NEXT_PUBLIC_CARTRIDGE_PRESET
        ? { preset: process.env.NEXT_PUBLIC_CARTRIDGE_PRESET }
        : {}),
    },
  };
}

export function getStarkZapTokens() {
  return getTokenMap();
}

export function getDefaultPayrollToken() {
  return getConfidentialPayrollToken();
}

export function getPayrollTokenOptions() {
  const token = getConfidentialPayrollToken();
  return token
    ? [
        {
          symbol: token.symbol,
          token,
        },
      ]
    : [];
}

export function getTreasuryTokenOptions() {
  const tokens = getStarkZapTokens();
  const available = [tokens.STRK, tokens.USDC, tokens.USDC_E, tokens.ETH].filter(Boolean);

  return available.map((token) => ({
    symbol: token.symbol,
    token,
  }));
}

export function getActiveChainIdLiteral() {
  return getConfiguredChainId().toLiteral();
}

export function getActiveNetworkName() {
  return getConfiguredNetwork();
}

export function getConfiguredTongoContract() {
  return process.env.NEXT_PUBLIC_TONGO_CONTRACT?.trim() || getDefaultTongoContractForConfiguredToken();
}

export function getConfidentialPayrollToken(): Token | null {
  return findTokenByKeyOrSymbol(getTokenMap(), getConfiguredTokenSymbol());
}

export function getConfiguredFeePreference() {
  return getConfiguredFeeMode();
}

export function getDefaultValidator() {
  const configuredAddress = process.env.NEXT_PUBLIC_STARKZAP_STAKER_ADDRESS?.trim();
  if (configuredAddress) {
    const matched = getValidatorPresets().find(
      (validator) => validator.stakerAddress.toLowerCase() === configuredAddress.toLowerCase()
    );
    if (matched) {
      return matched;
    }

    return {
      name: process.env.NEXT_PUBLIC_STARKZAP_STAKER_NAME?.trim() || "Custom Validator",
      stakerAddress: configuredAddress,
      logoUrl: new URL("https://www.starknet.io/favicon.ico"),
    };
  }

  return getValidatorPresets()[0] ?? null;
}

export type StarkZapWallet = CartridgeWalletInterface;

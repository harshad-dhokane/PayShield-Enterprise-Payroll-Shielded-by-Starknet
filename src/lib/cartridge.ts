import Controller from "@cartridge/controller";
import type { Signature, TypedData } from "starknet";

import { getConfidentialPayrollToken } from "./starkzap-sdk";

// We use the hex address for Mainnet/Sepolia
const getCartridgeConfig = () => {
  const policies = [
    {
      target: process.env.NEXT_PUBLIC_COMPANY_REGISTRY || "0x0",
      method: "register_company",
    },
    {
      target: process.env.NEXT_PUBLIC_COMPANY_REGISTRY || "0x0",
      method: "add_employee",
    },
    {
      target: process.env.NEXT_PUBLIC_COMPANY_REGISTRY || "0x0",
      method: "record_payroll",
    },
  ];

  const tongoContract = process.env.NEXT_PUBLIC_TONGO_CONTRACT || "0x0";
  const tongoMethods = ["fund", "transfer", "withdraw", "rollover", "ragequit"];
  for (const method of tongoMethods) {
    policies.push({
      target: tongoContract,
      method,
    });
  }

  const payrollToken = getConfidentialPayrollToken();
  if (payrollToken) {
    policies.push({
      target: payrollToken.address,
      method: "approve",
    });
  }

  return {
    rpc: "https://api.cartridge.gg/x/starknet/sepolia",
    policies,
    theme: "starkzap",
  };
};

interface CartridgeSessionAccount {
  address: string;
  execute(calls: unknown[]): Promise<{ transaction_hash: string }>;
  signMessage(typedData: TypedData): Promise<Signature>;
}

class CartridgeAuth {
  private controller: Controller;
  private account: CartridgeSessionAccount | null = null;

  constructor() {
    this.controller = new Controller(getCartridgeConfig());
  }

  // Connect
  async connect(): Promise<{ address: string; username: string }> {
    try {
      const result = (await this.controller.connect()) as CartridgeSessionAccount | null;
      if (!result) {
        throw new Error("Connection rejected");
      }
      this.account = result;
      const username = await this.controller.username() || "admin";
      return {
        address: result.address,
        username,
      };
    } catch (error) {
      console.error("Cartridge connection failed:", error);
      throw error;
    }
  }

  // Execute transaction through Cartridge
  async executeTransaction(calls: unknown[]): Promise<string> {
    if (!this.account) {
      throw new Error("Not connected");
    }
    const response = await this.account.execute(calls);
    return response.transaction_hash;
  }

  // Sign message for authentication & LMK derivation
  async signMessage(message: string): Promise<string> {
    if (!this.account) {
      throw new Error("Not connected");
    }
    // EIP712 standard message to sign (as required by starknet.js and cartridge)
    const typedData = {
      types: {
        StarkNetDomain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
        ],
        Message: [{ name: "content", type: "string" }],
      },
      primaryType: "Message",
      domain: { name: "ShieldedPayroll", version: "1" },
      message: { content: message },
    };

    const signature = await this.account.signMessage(typedData);
    return normalizeSignature(signature);
  }

  // Disconnect
  async disconnect(): Promise<void> {
    await this.controller.disconnect();
    this.account = null;
  }

  isConnected(): boolean {
    return this.account !== null;
  }

  getAccount(): CartridgeSessionAccount | null {
    return this.account;
  }
}

export const cartridgeAuth = new CartridgeAuth();

function normalizeSignature(signature: Signature): string {
  if (Array.isArray(signature)) {
    return signature.join("");
  }

  if (
    typeof signature === "object" &&
    signature !== null &&
    "r" in signature &&
    "s" in signature
  ) {
    return `${String(signature.r)}${String(signature.s)}`;
  }

  return String(signature);
}

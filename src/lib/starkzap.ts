import type { WalletInterface } from "starkzap";
import {
  createCompanyConfidential,
  executePayrollExecution,
  getCompanyConfidentialProfile,
  getCompanyConfidentialState,
  preparePayrollExecution,
} from "@/lib/starkzap-confidential";
import type { PayrollBatchItem } from "@/lib/starkzap-models";

class StarkZapClient {
  async previewBatchPayroll(wallet: WalletInterface, lmk: string, payments: PayrollBatchItem[]) {
    const prepared = await preparePayrollExecution(wallet, lmk, payments);
    return prepared.preview;
  }

  async executeBatchPayroll(wallet: WalletInterface, lmk: string, payments: PayrollBatchItem[]) {
    return executePayrollExecution(wallet, lmk, payments);
  }

  async getCompanyConfidentialOverview(wallet: WalletInterface, lmk: string) {
    const confidential = createCompanyConfidential(wallet, lmk);
    const profile = getCompanyConfidentialProfile(wallet, lmk);
    const state = await getCompanyConfidentialState(wallet, lmk);

    return {
      address: confidential.address,
      contractAddress: profile.contractAddress,
      recipient: profile.recipient,
      balance: state.balance,
      pending: state.pending,
      nonce: state.nonce,
    };
  }
}

export const starkZapClient = new StarkZapClient();

import { create } from "zustand";
import { starkZapClient } from "@/lib/starkzap";
import { supabase } from "@/lib/supabase";
import { encryptWithLMK, decryptWithLMK } from "@/lib/encryption";
import type { WalletInterface } from "starkzap";
import type {
  AddEmployeeFormData,
  BatchRecord,
  BatchRow,
  EmployeeRecord,
  EmployeeRow,
  PayrollBatchItem,
  PayrollItemRow,
  SerializedRecipient,
} from "@/lib/starkzap-models";
import { parseRecipientInput, parseStoredRecipient, recipientToAddress } from "@/lib/starkzap-confidential";

type DraftPayrollInput = {
  amount?: string;
  amount_encrypted?: string;
  employee_id?: string;
  name?: string;
  email?: string;
  token?: string;
  tokenSymbol?: string;
  token_address?: string;
  recipientInput?: string;
  tongo_id?: string;
  tongo_address?: string;
  shielded_id?: string;
  tongo_recipient?: SerializedRecipient | null;
  employee?: {
    tongo_recipient_id?: string;
    tongo_address?: string;
    tongo_recipient?: SerializedRecipient | null;
  };
};

function resolveDraftRecipient(item: DraftPayrollInput) {
  if (item.tongo_recipient) {
    const recipient = parseStoredRecipient(item.tongo_recipient, item.tongo_address || item.tongo_id);
    return {
      recipient,
      address: item.tongo_address || recipientToAddress(recipient),
    };
  }

  if (item.employee?.tongo_recipient) {
    const recipient = parseStoredRecipient(
      item.employee.tongo_recipient,
      item.employee.tongo_address || item.employee.tongo_recipient_id
    );
    return {
      recipient,
      address: item.employee.tongo_address || recipientToAddress(recipient),
    };
  }

  const source =
    item.recipientInput ||
    item.tongo_address ||
    item.tongo_id ||
    item.shielded_id ||
    item.employee?.tongo_address ||
    item.employee?.tongo_recipient_id;

  if (!source) {
    throw new Error("Each payroll item must include a valid Tongo recipient");
  }

  const recipient = parseRecipientInput(source);
  return {
    recipient,
    address: recipientToAddress(recipient),
  };
}

interface PayrollState {
  // Data
  batches: BatchRecord[];
  currentBatch: BatchRecord | null;
  employees: EmployeeRecord[];

  // Stats
  stats: {
    totalVolume: number;
    totalEmployees: number;
    lastPayrollDate: string | null;
  };

  // UI State
  isProcessing: boolean;
  processingProgress: number;

  // Actions
  createBatch: (adminAddress: string, lmk: string, name: string, payments: DraftPayrollInput[]) => Promise<void>;
  executeBatch: (
    adminAddress: string,
    batchId: string,
    wallet: WalletInterface | null,
    lmk: string
  ) => Promise<void>;
  fetchBatches: (adminAddress: string, lmk: string) => Promise<void>;
  fetchEmployees: (adminAddress: string, lmk: string) => Promise<void>;
  addEmployee: (adminAddress: string, lmk: string, employeeData: AddEmployeeFormData) => Promise<void>;
}

export const usePayrollStore = create<PayrollState>((set, get) => ({
  batches: [],
  currentBatch: null,
  employees: [],
  stats: {
    totalVolume: 0,
    totalEmployees: 0,
    lastPayrollDate: null,
  },
  isProcessing: false,
  processingProgress: 0,

  createBatch: async (adminAddress, lmk, name, payments) => {
    const payrollToken = payments[0]?.tokenSymbol || payments[0]?.token || payments[0]?.token_address || "STRK";

    // 1. Create batch metadata in Supabase
    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .insert({
        admin_address: adminAddress,
        name,
        status: "draft",
        payroll_token: payrollToken,
      })
      .select()
      .single();

    if (batchError) throw batchError;

    // 2. Encrypt & create items
    const parsedItems = payments.map((item) => {
      const amountStr = String(item.amount || item.amount_encrypted || "0");
      const { recipient, address } = resolveDraftRecipient(item);
      return {
        batch_id: batchData.id,
        admin_address: adminAddress,
        employee_id: item.name || item.email || item.employee_id || "Unknown",
        tongo_id: address,
        tongo_address: address,
        tongo_recipient: recipient,
        amount_enc: encryptWithLMK(amountStr, lmk),
        token: item.tokenSymbol || item.token || item.token_address || "STRK",
      };
    });

    const { error: itemsError } = await supabase.from("payroll_items").insert(parsedItems);
    if (itemsError) throw itemsError;

    // Refresh state using fetchBatches instead of mutating just local state
    await get().fetchBatches(adminAddress, lmk);
    
    // Set current manually so UI can execute immediately
    const updatedBatches = get().batches;
    set({ currentBatch: updatedBatches.find(b => b.id === batchData.id) || null });
  },

  executeBatch: async (adminAddress, batchId, wallet, lmk) => {
    set({ isProcessing: true, processingProgress: 0 });

    try {
      const batch = get().batches.find((b) => b.id === batchId);
      if (!batch) throw new Error("Batch not found");
      if (!wallet) throw new Error("Wallet not connected");
      if (!lmk) throw new Error("Local master key not available");

      set({ processingProgress: 20 });

      // Execute through StarkZap module
      const result = await starkZapClient.executeBatchPayroll(wallet, lmk, batch.items);

      set({ processingProgress: 70 });

      // Update the batch status to confirmed on Supabase
      const { error } = await supabase
        .from("batches")
        .update({
          status: "confirmed",
          tx_hash: result.txHash,
          fee_mode: result.feeMode,
          fee_estimate: result.preview.feeEstimate.overall_fee.toString(),
          payroll_token: result.preview.payrollTokenSymbol,
          preflight_ok: result.preview.preflight.ok,
          execution_metadata: {
            explorerUrl: result.explorerUrl,
            companyConfidentialAddress: result.preview.companyConfidentialAddress,
            fundAmount: result.preview.fundAmount,
            sweepAmount: result.preview.sweepAmount,
            callsCount: result.preview.callsCount,
            receipt: result.receipt,
          },
        })
        .eq("id", batchId)
        .eq("admin_address", adminAddress);
        
      if (error) throw error;

      // Update local state directly so UI responds instantly
      set((state) => ({
        batches: state.batches.map((b) =>
          b.id === batchId
            ? {
                ...b,
                status: "confirmed",
                txHash: result.txHash,
                feeMode: result.feeMode,
                feeEstimate: result.preview.feeEstimate.overall_fee.toString(),
                payrollToken: result.preview.payrollTokenSymbol,
                preflightOk: result.preview.preflight.ok,
                executionMetadata: {
                  explorerUrl: result.explorerUrl,
                  companyConfidentialAddress: result.preview.companyConfidentialAddress,
                  fundAmount: result.preview.fundAmount,
                  sweepAmount: result.preview.sweepAmount,
                  callsCount: result.preview.callsCount,
                },
              }
            : b
        ),
        processingProgress: 100,
        stats: {
          ...state.stats,
          totalVolume:
            state.stats.totalVolume +
            batch.items.reduce((acc, payrollItem) => acc + Number(payrollItem.amount), 0),
          lastPayrollDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        }
      }));
    } catch (error) {
      await supabase
        .from("batches")
        .update({
          status: "failed",
          execution_metadata: {
            error: error instanceof Error ? error.message : "Unknown payroll execution error",
          },
        })
        .eq("id", batchId)
        .eq("admin_address", adminAddress);
      throw error;
    } finally {
      setTimeout(() => {
        set({ isProcessing: false });
      }, 1000);
    }
  },

  fetchBatches: async (adminAddress, lmk) => {
    // Fetch Batches
    const { data: batchesRecord, error: bError } = await supabase
      .from("batches")
      .select("*")
      .eq("admin_address", adminAddress)
      .order("created_at", { ascending: false });
      
    if (bError) throw bError;

    // Fetch related Items
    const { data: itemsRecord, error: iError } = await supabase
      .from("payroll_items")
      .select("*")
      .eq("admin_address", adminAddress);
      
    if (iError) throw iError;

    // Consolidate & Decrypt
    let historicalVolume = 0;
    
    const parsedBatches: BatchRecord[] = (batchesRecord as BatchRow[]).map((b) => {
       const bItems: PayrollBatchItem[] = (itemsRecord as PayrollItemRow[])
         .filter((i) => i.batch_id === b.id)
         .map((i) => {
          const dec_amt = decryptWithLMK(i.amount_enc, lmk);
          const safe_amt = (dec_amt === "undefined" || dec_amt === "NaN" || !dec_amt) ? "0" : dec_amt;
          const recipient = parseStoredRecipient(i.tongo_recipient, i.tongo_address || i.tongo_id);
          return {
             id: i.id,
             batchId: i.batch_id,
             name: i.employee_id,
             employeeId: i.employee_id,
             tongoAddress: i.tongo_address || i.tongo_id || recipientToAddress(recipient),
             tongoRecipient: recipient,
             amount: safe_amt,
             tokenSymbol: i.token,
          };
       });
       
       if(b.status === "confirmed") {
          historicalVolume += bItems.reduce((acc, item) => acc + Number(item.amount), 0);
       }
       
       return {
         id: b.id,
         name: b.name,
         status: b.status,
         txHash: b.tx_hash,
         feeMode: b.fee_mode,
         feeEstimate: b.fee_estimate,
         payrollToken: b.payroll_token,
         preflightOk: b.preflight_ok,
         executionMetadata: b.execution_metadata,
         createdAt: b.created_at,
         items: bItems,
       };
    });

    const lastDate = parsedBatches.find((batch) => batch.status === "confirmed")?.createdAt;

    set((state) => ({
      batches: parsedBatches,
      stats: {
        ...state.stats,
        totalVolume: historicalVolume,
        lastPayrollDate: lastDate ? new Date(lastDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No run yet"
      }
    }));
  },

  fetchEmployees: async (adminAddress, lmk) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("admin_address", adminAddress);

    if (error) throw error;

    const employees: EmployeeRecord[] = (data as EmployeeRow[]).map((item) => {
      const recipient = parseStoredRecipient(item.tongo_recipient, item.tongo_address || item.shielded_id);

      return {
        id: item.id,
        adminAddress: item.admin_address,
        name: decryptWithLMK(item.name_enc, lmk),
        salary: decryptWithLMK(item.salary_enc, lmk),
        tongoAddress: item.tongo_address || recipientToAddress(recipient),
        tongoRecipient: recipient,
        department: item.department_enc ? decryptWithLMK(item.department_enc, lmk) : "Engineering",
        role: item.role_enc ? decryptWithLMK(item.role_enc, lmk) : "Developer",
        tokenSymbol: item.token_enc ? decryptWithLMK(item.token_enc, lmk) : "STRK",
        createdAt: item.created_at,
      };
    });

    set((state) => ({
      employees,
      stats: {
        ...state.stats,
        totalEmployees: employees.length,
      },
    }));
  },

  addEmployee: async (adminAddress, lmk, employeeData) => {
    const nameEnc = encryptWithLMK(employeeData.name, lmk);
    const salaryEnc = encryptWithLMK(String(employeeData.salary), lmk);
    const deptEnc = encryptWithLMK(employeeData.department || "Engineering", lmk);
    const roleEnc = encryptWithLMK(employeeData.role || "Developer", lmk);
    const tokenEnc = encryptWithLMK(employeeData.tokenSymbol || "STRK", lmk);
    const recipient = parseRecipientInput(employeeData.recipientInput);
    const tongoAddress = recipientToAddress(recipient);

    const { error: dbError } = await supabase.from("employees").insert({
      admin_address: adminAddress,
      name_enc: nameEnc,
      salary_enc: salaryEnc,
      shielded_id: tongoAddress,
      tongo_address: tongoAddress,
      tongo_recipient: recipient,
      department_enc: deptEnc,
      role_enc: roleEnc,
      token_enc: tokenEnc,
    });

    if (dbError) throw dbError;

    // Refresh employees from supbase
    await get().fetchEmployees(adminAddress, lmk);
  },
}));

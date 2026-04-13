import type { EstimateFeeResponseOverhead } from "starknet";
import type { ConfidentialRecipient, FeeMode, PreflightResult } from "starkzap";

export interface SerializedRecipient {
  x: string;
  y: string;
}

export interface EmployeeRow {
  id: string;
  admin_address: string;
  name_enc: string;
  salary_enc: string;
  department_enc: string | null;
  role_enc: string | null;
  token_enc: string | null;
  shielded_id: string | null;
  tongo_address: string | null;
  tongo_recipient: SerializedRecipient | null;
  created_at?: string;
}

export interface EmployeeRecord {
  id: string;
  adminAddress: string;
  name: string;
  salary: string;
  department: string;
  role: string;
  tokenSymbol: string;
  tongoAddress: string;
  tongoRecipient: SerializedRecipient;
  createdAt?: string;
}

export interface AddEmployeeFormData {
  name: string;
  salary: string;
  recipientInput: string;
  department: string;
  role: string;
  tokenSymbol: string;
}

export interface PayrollDraftInput {
  name: string;
  amount: string;
  tokenSymbol: string;
  recipientInput: string;
  employeeId?: string;
}

export interface PayrollBatchItem {
  id?: string;
  batchId?: string;
  employeeId: string;
  name: string;
  amount: string;
  tokenSymbol: string;
  tongoAddress: string;
  tongoRecipient: SerializedRecipient;
}

export interface PayrollItemRow {
  id: string;
  batch_id: string;
  admin_address: string;
  employee_id: string;
  tongo_id: string | null;
  tongo_address: string | null;
  tongo_recipient: SerializedRecipient | null;
  amount_enc: string;
  token: string;
  created_at?: string;
}

export interface BatchRow {
  id: string;
  admin_address: string;
  name: string;
  status: string;
  tx_hash: string | null;
  fee_mode: FeeMode | null;
  fee_estimate: string | null;
  payroll_token: string | null;
  preflight_ok: boolean | null;
  execution_metadata: Record<string, unknown> | null;
  created_at?: string;
}

export interface BatchRecord {
  id: string;
  name: string;
  items: PayrollBatchItem[];
  status: string;
  txHash?: string | null;
  feeMode?: FeeMode | null;
  feeEstimate?: string | null;
  payrollToken?: string | null;
  preflightOk?: boolean | null;
  executionMetadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface TreasuryActionRow {
  id: string;
  admin_address: string;
  action_type: string;
  status: string;
  token_in: string | null;
  token_out: string | null;
  amount: string | null;
  fee_mode: FeeMode | null;
  tx_hash: string | null;
  external_tx_hash: string | null;
  metadata: Record<string, unknown> | null;
  created_at?: string;
}

export interface TreasuryActionRecord {
  id: string;
  actionType: string;
  status: string;
  tokenIn?: string | null;
  tokenOut?: string | null;
  amount?: string | null;
  feeMode?: FeeMode | null;
  txHash?: string | null;
  externalTxHash?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

export interface PayrollExecutionPreview {
  callsCount: number;
  feeMode: FeeMode;
  preflight: PreflightResult;
  feeEstimate: EstimateFeeResponseOverhead;
  payrollTokenSymbol: string;
  totalAmount: string;
  fundAmount: string;
  sweepAmount: string;
  companyConfidentialAddress: string;
  companyRecipient: SerializedRecipient;
  confidentialBalanceBefore: string;
  confidentialPendingBefore: string;
}

export interface PayrollExecutionResult {
  txHash: string;
  explorerUrl: string;
  feeMode: FeeMode;
  preview: PayrollExecutionPreview;
  receipt: Record<string, unknown>;
}

export interface CompanyConfidentialProfile {
  privateKey: bigint;
  address: string;
  recipient: SerializedRecipient;
  contractAddress: string;
}

export function isSerializedRecipient(value: unknown): value is SerializedRecipient {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ConfidentialRecipient>;
  return Boolean(candidate.x) && Boolean(candidate.y);
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  PlusCircle,
  Shield,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import parse, { type ParseResult } from "papaparse";
import { Amount } from "starkzap";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { usePayrollStore } from "@/store/payroll-store";
import { useWallet } from "@/context/WalletContext";
import { starkZapClient } from "@/lib/starkzap";
import { parseRecipientInput, recipientToAddress } from "@/lib/starkzap-confidential";
import { getConfidentialPayrollToken } from "@/lib/starkzap-sdk";
import type {
  BatchRecord,
  EmployeeRecord,
  PayrollBatchItem,
  PayrollExecutionPreview,
} from "@/lib/starkzap-models";

interface CsvPayrollRow {
  name?: string;
  employee_id?: string;
  amount?: string;
  token?: string;
  tokenSymbol?: string;
  recipient?: string;
  recipientInput?: string;
  tongo_id?: string;
  tongo_address?: string;
  shielded_id?: string;
}

function toBatchItemFromCsvRow(row: CsvPayrollRow, defaultTokenSymbol: string): PayrollBatchItem {
  const recipientInput =
    row.recipientInput || row.recipient || row.tongo_address || row.tongo_id || row.shielded_id;

  if (!row.name || !row.amount || !recipientInput) {
    throw new Error("CSV rows must include name, amount, and a Tongo recipient");
  }

  const recipient = parseRecipientInput(recipientInput);

  return {
    employeeId: row.employee_id || row.name,
    name: row.name,
    amount: row.amount,
    tokenSymbol: row.tokenSymbol || row.token || defaultTokenSymbol,
    tongoAddress: recipientToAddress(recipient),
    tongoRecipient: recipient,
  };
}

function formatFeeEstimate(preview: PayrollExecutionPreview) {
  return Amount.fromRaw(preview.feeEstimate.overall_fee, 18, preview.feeEstimate.unit).toFormatted(true);
}

export default function BatchPayrollPage() {
  const payrollToken = getConfidentialPayrollToken();
  const [payrollItems, setPayrollItems] = useState<PayrollBatchItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [inputMode, setInputMode] = useState<"csv" | "manual">("csv");
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Set<string>>(new Set());
  const [selectedReceipt, setSelectedReceipt] = useState<BatchRecord | null>(null);
  const [batchPreview, setBatchPreview] = useState<PayrollExecutionPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const { createBatch, executeBatch, isProcessing, processingProgress, employees, fetchEmployees, batches, fetchBatches } =
    usePayrollStore();
  const { address, localMasterKey, wallet } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (address && localMasterKey) {
      if (employees.length === 0) {
        void fetchEmployees(address, localMasterKey);
      }

      if (batches.length === 0) {
        void fetchBatches(address, localMasterKey);
      }
    }
  }, [address, localMasterKey, employees.length, fetchEmployees, batches.length, fetchBatches]);

  useEffect(() => {
    setBatchPreview(null);
    setPreviewError(null);
  }, [payrollItems]);

  const buildPreview = useCallback(async () => {
    if (!wallet || !localMasterKey) {
      setPreviewError("Connect your StarkZap wallet before previewing payroll");
      return null;
    }

    if (payrollItems.length === 0) {
      setPreviewError("Add at least one employee to preview payroll");
      return null;
    }

    try {
      setIsPreviewing(true);
      setPreviewError(null);
      const preview = await starkZapClient.previewBatchPayroll(wallet, localMasterKey, payrollItems);
      setBatchPreview(preview);
      return preview;
    } catch (error) {
      setBatchPreview(null);
      setPreviewError(error instanceof Error ? error.message : "Failed to preview payroll");
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }, [localMasterKey, payrollItems, wallet]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !payrollToken) {
        return;
      }

      setIsUploading(true);
      parse.parse<CsvPayrollRow>(file, {
        complete: (results: ParseResult<CsvPayrollRow>) => {
          try {
            const parsedRows = results.data.map((row) =>
              toBatchItemFromCsvRow(row, payrollToken.symbol)
            );
            setPayrollItems((previous) => [...previous, ...parsedRows]);
            setPreviewError(null);
          } catch (error) {
            setPreviewError(error instanceof Error ? error.message : "Invalid CSV format");
          } finally {
            setIsUploading(false);
          }
        },
        error: (error) => {
          setPreviewError(error.message);
          setIsUploading(false);
        },
        header: true,
        skipEmptyLines: true,
      });
    },
    [payrollToken]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleExecutePayroll = async () => {
    if (!address || !localMasterKey || !wallet || payrollItems.length === 0) {
      return;
    }

    const preview = batchPreview || (await buildPreview());
    if (!preview) {
      return;
    }

    await createBatch(address, localMasterKey, "Multi-Source Batch", payrollItems);

    const batchId = usePayrollStore.getState().currentBatch?.id;
    if (!batchId) {
      setPreviewError("Failed to persist the payroll batch before execution");
      return;
    }

    await executeBatch(address, batchId, wallet, localMasterKey);
    setShowSuccess(true);
    setPayrollItems([]);
    setBatchPreview(null);
    setSelectedPersonnelIds(new Set());

    window.setTimeout(() => setShowSuccess(false), 5000);
  };

  const toggleSelection = (employeeId: string) => {
    setSelectedPersonnelIds((previous) => {
      const next = new Set(previous);

      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }

      return next;
    });
  };

  const addManualSelectionToBatch = () => {
    const resolvedItems = Array.from(selectedPersonnelIds)
      .map((employeeId) => employees.find((employee) => employee.id === employeeId))
      .filter((employee): employee is EmployeeRecord => Boolean(employee))
      .map((employee) => ({
        employeeId: employee.id,
        name: employee.name,
        tongoAddress: employee.tongoAddress,
        tongoRecipient: employee.tongoRecipient,
        amount: employee.salary,
        tokenSymbol: employee.tokenSymbol,
      }));

    setPayrollItems((previous) => [...previous, ...resolvedItems]);
    setSelectedPersonnelIds(new Set());
    setInputMode("csv");
  };

  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2) || "UK"
    );
  };

  const handleDownloadReceipt = (batch: BatchRecord) => {
    const csvContent = [
      ["Batch ID", "Name", "Total Amount", "Status", "Date"],
      [
        batch.txHash || batch.id || "unknown",
        batch.name,
        batch.items.reduce((acc, item) => acc + Number(item.amount), 0),
        batch.status,
        new Date().toLocaleString(),
      ],
      [],
      ["Recipient Name", "Tongo Address", "Amount", "Asset"],
      ...batch.items.map((item) => [item.name, item.tongoAddress, item.amount, item.tokenSymbol]),
    ]
      .map((entry) => entry.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", `receipt_${batch.txHash || batch.id || "export"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <TopBar title="Batch Payroll" />
      <div className="p-8">
        <h1 className="text-4xl font-black font-headline tracking-tight text-on-surface mb-2">
          Batch Operations
        </h1>
        <p className="text-on-surface-variant font-label text-sm mb-8">
          Build confidential payroll batches, run fee estimation and preflight checks, then execute
          the final PayShield confidential transaction.
        </p>

        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-4 bg-tertiary/10 border border-tertiary/30 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-tertiary/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-tertiary" />
              </div>
              <div>
                <p className="text-on-surface font-bold text-sm">Confidential Payroll Executed</p>
                <p className="text-on-surface-variant text-xs">
                  StarkZap preflight, fee mode selection, and Tongo settlement all completed.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/reports")}
              className="text-xs font-bold text-tertiary hover:underline uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
            >
              View Receipt
            </button>
          </motion.div>
        )}

        <div className="flex gap-4 mb-8 max-w-5xl">
          <button
            onClick={() => setInputMode("csv")}
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${inputMode === "csv"
                ? "border-primary bg-primary/10"
                : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
              }`}
          >
            <FileSpreadsheet
              className={`w-6 h-6 ${inputMode === "csv"
                  ? "text-primary drop-shadow-[0_0_10px_rgba(255,87,51,0.5)]"
                  : "text-on-surface-variant"
                }`}
            />
            <span
              className={`text-sm font-bold tracking-widest uppercase ${inputMode === "csv" ? "text-primary" : "text-on-surface-variant"
                }`}
            >
              External Load (CSV)
            </span>
          </button>
          <button
            onClick={() => setInputMode("manual")}
            className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all ${inputMode === "manual"
                ? "border-primary bg-primary/10"
                : "border-outline-variant/10 bg-surface-container-low hover:bg-surface-container"
              }`}
          >
            <Users
              className={`w-6 h-6 ${inputMode === "manual"
                  ? "text-primary drop-shadow-[0_0_10px_rgba(255,87,51,0.5)]"
                  : "text-on-surface-variant"
                }`}
            />
            <span
              className={`text-sm font-bold tracking-widest uppercase ${inputMode === "manual" ? "text-primary" : "text-on-surface-variant"
                }`}
            >
              Internal Select
            </span>
          </button>
        </div>

        <div className="max-w-5xl">
          <AnimatePresence mode="wait">
            {inputMode === "csv" && (
              <motion.div
                key="csv-panel"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div
                  {...getRootProps()}
                  className={`bg-surface-container-low rounded-2xl p-12 text-center cursor-pointer border ${isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/10 hover:border-primary/50"
                    } transition-all`}
                >
                  <input {...getInputProps()} />

                  <div className="w-16 h-16 mx-auto mb-4 rounded-full brand-gradient flex items-center justify-center glow-orange">
                    <Upload className="w-8 h-8 text-on-primary-container" />
                  </div>

                  <h3 className="text-lg font-bold text-on-surface mb-2 font-headline">
                    {isUploading ? "Processing CSV..." : isDragActive ? "Drop CSV here" : "Upload File Maps"}
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-4 font-label">
                    Drag and drop your spreadsheet layout, or click to browse. Supported columns:
                    `name`, `amount`, and `recipient` or `tongo_address`.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>
                      Format: name, amount, recipient, token. Default payroll asset:{" "}
                      {payrollToken?.symbol || "STRK"}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {inputMode === "manual" && (
              <motion.div
                key="manual-panel"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold font-headline text-on-surface flex items-center gap-2">
                    <Users className="w-5 h-5 text-tertiary" /> Target Internal Organization
                  </h3>
                  <span className="text-xs font-bold bg-surface-container-highest px-3 py-1 rounded-full">
                    {employees.length} Personnel Linked
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto mb-6 pr-2">
                  {employees.length === 0 ? (
                    <div className="text-center p-8 bg-surface-container-highest/20 rounded-xl border border-outline-variant/5">
                      <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                        No local database nodes resolved.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {employees.map((employee) => {
                        const isSelected = selectedPersonnelIds.has(employee.id);

                        return (
                          <div
                            key={employee.id}
                            onClick={() => toggleSelection(employee.id)}
                            className={`cursor-pointer flex items-center p-4 rounded-xl border transition-all ${isSelected
                                ? "border-tertiary bg-tertiary/10"
                                : "border-outline-variant/10 bg-surface-container-highest/30 hover:border-outline-variant/50"
                              }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border ${isSelected
                                  ? "bg-tertiary border-tertiary flex items-center justify-center text-black"
                                  : "border-outline-variant/50 mr-4 flex-shrink-0"
                                }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            {isSelected && <div className="w-4" />}
                            <div className="h-10 w-10 mx-3 rounded bg-surface-container-highest flex items-center justify-center font-bold text-xs text-primary-container">
                              {getInitials(employee.name)}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-sm text-on-surface">{employee.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-mono">
                                {employee.tongoAddress.substring(0, 6)}...
                                {employee.tongoAddress.substring(employee.tongoAddress.length - 4)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-sm text-on-surface">${employee.salary}</p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary text-right">
                                {employee.tokenSymbol}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-outline-variant/10">
                  <button
                    onClick={addManualSelectionToBatch}
                    disabled={selectedPersonnelIds.size === 0}
                    className="px-6 py-3 brand-gradient text-on-primary-container font-black text-xs uppercase tracking-widest rounded-lg disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 glow-orange"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Push {selectedPersonnelIds.size} Target(s) Next
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {previewError && (
          <div className="mt-6 max-w-5xl p-4 bg-error/10 border border-error/30 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-on-surface">Payroll Preview Failed</p>
              <p className="text-xs text-on-surface-variant mt-1">{previewError}</p>
            </div>
          </div>
        )}

        {payrollItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-surface-container-low border border-outline-variant/10 rounded-2xl overflow-hidden shadow-xl"
          >
            <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-[#0A0A0A]">
              <h3 className="text-on-surface font-bold text-sm tracking-widest uppercase">
                Active Batch Aggregation ({payrollItems.length} nodes)
              </h3>
              <button
                onClick={() => setPayrollItems([])}
                className="text-[10px] font-bold text-error/80 hover:text-error transition-colors uppercase tracking-widest"
              >
                Clear Entire Batch
              </button>
            </div>

            <div className="max-h-96 overflow-auto">
              <table className="w-full">
                <thead className="bg-[#111111] sticky top-0 relative z-10">
                  <tr>
                    <th className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant py-3 px-6 border-b border-outline-variant/10">
                      Name
                    </th>
                    <th className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant py-3 px-6 border-b border-outline-variant/10">
                      Tongo Address
                    </th>
                    <th className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant py-3 px-6 border-b border-outline-variant/10">
                      Amount
                    </th>
                    <th className="text-right text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant py-3 px-6 border-b border-outline-variant/10">
                      Asset
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {payrollItems.map((row) => (
                    <tr
                      key={`${row.employeeId}-${row.tongoAddress}-${row.amount}`}
                      className="hover:bg-surface-container-highest/20 transition-colors"
                    >
                      <td className="py-4 px-6 text-on-surface font-bold text-sm tracking-tight">
                        {row.name}
                      </td>
                      <td className="py-4 px-6 text-on-surface-variant/60 font-mono text-xs">
                        {row.tongoAddress}
                      </td>
                      <td className="py-4 px-6 text-right text-on-surface font-black font-headline">
                        ${row.amount}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded border border-secondary border-opacity-30 bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-wider">
                          {row.tokenSymbol}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-[#0A0A0A] border-t border-outline-variant/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">
                    Total Transfers Confirmed
                  </span>
                  <span className="text-on-surface font-black font-headline text-xl">
                    {payrollItems.length}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-on-surface-variant text-sm font-bold uppercase tracking-widest">
                    Total Liquidity Required
                  </span>
                  <span className="text-on-surface font-black font-headline text-2xl">
                    $
                    {payrollItems
                      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-6 p-4 bg-secondary/10 border border-secondary/30 rounded-lg text-xs font-bold text-secondary">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>
                    The company confidential account will fund, transfer, and optionally sweep any
                    remainder in one PayShield execution path.
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {payrollItems.length > 0 && (
          <div className="mt-6 max-w-5xl space-y-4">
            <div className="flex gap-4">
              <button
                onClick={() => void buildPreview()}
                disabled={isPreviewing || isProcessing}
                className="flex-1 bg-surface-container-low border border-outline-variant/10 py-4 rounded-xl text-on-surface font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
              >
                {isPreviewing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-on-surface/20 border-t-on-surface rounded-full animate-spin" />
                    Running Preflight...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Run Fee + Preflight Check
                  </>
                )}
              </button>

              <button
                onClick={() => void handleExecutePayroll()}
                disabled={!batchPreview || isProcessing}
                className="flex-1 brand-gradient py-4 rounded-xl text-on-primary-container font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 glow-orange disabled:opacity-50 active:scale-[0.99] transition-all"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-on-primary-container/30 border-t-on-primary-container rounded-full animate-spin" />
                    Executing Confidential Payroll ({processingProgress}%)
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Execute Confidential Payroll
                  </>
                )}
              </button>
            </div>

            {batchPreview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Fee Estimate
                  </p>
                  <p className="text-lg font-black font-headline text-on-surface">
                    {formatFeeEstimate(batchPreview)}
                  </p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Fee Mode
                  </p>
                  <p className="text-lg font-black font-headline text-on-surface">
                    {batchPreview.feeMode === "sponsored" ? "Sponsored" : "User Pays"}
                  </p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Confidential Fund
                  </p>
                  <p className="text-lg font-black font-headline text-on-surface">
                    {batchPreview.fundAmount} {batchPreview.payrollTokenSymbol}
                  </p>
                </div>
                <div className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/10">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Company Tongo
                  </p>
                  <p className="text-xs font-black font-mono text-on-surface break-all">
                    {batchPreview.companyConfidentialAddress}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-12 bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/5">
          <div className="bg-surface-container-high px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center font-black text-on-primary-container">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold font-headline">Recent Shielded Batches</h4>
                <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest">
                  Real PayShield confidential receipts
                </p>
              </div>
            </div>
          </div>
          <div className="p-8">
            <h5 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
              Payroll History
            </h5>
            <div className="flex flex-col gap-3">
              {batches.length === 0 ? (
                <div className="p-4 text-sm text-on-surface-variant">
                  No payroll batches executed yet.
                </div>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedReceipt(batch)}
                    className="bg-surface-container cursor-pointer p-4 rounded-lg flex justify-between items-center hover:bg-surface-container-highest border border-transparent hover:border-tertiary/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <Shield
                        className={`w-5 h-5 ${batch.status === "confirmed" ? "text-primary" : "text-on-surface-variant"
                          }`}
                      />
                      <div>
                        <p className="text-sm font-bold">
                          {batch.name} - {batch.items.length} Recipients
                        </p>
                        <p className="text-[10px] text-on-surface-variant font-mono">
                          {batch.txHash || "Pending TX"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        $
                        {batch.items
                          .reduce((acc, item) => acc + Number(item.amount), 0)
                          .toLocaleString()}
                      </p>
                      <p
                        className={`text-[10px] font-bold ${batch.status === "confirmed"
                            ? "text-tertiary uppercase"
                            : "text-on-surface-variant"
                          }`}
                      >
                        {batch.status === "confirmed" ? "STARK-CONFIRMED" : batch.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedReceipt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedReceipt(null)}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(event) => event.stopPropagation()}
                className="bg-surface-container rounded-2xl w-full max-w-2xl overflow-hidden border border-outline-variant/10 shadow-2xl"
              >
                <div className="bg-surface-container-high px-6 py-4 flex justify-between items-center border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold font-headline text-on-surface">
                        Cryptographic Receipt
                      </h3>
                      <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">
                        {selectedReceipt.txHash || "Pending Hash"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/5">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Batch Name
                      </p>
                      <p className="font-bold text-sm text-on-surface">{selectedReceipt.name}</p>
                    </div>
                    <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/5">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                        Total Payload
                      </p>
                      <p className="font-bold text-sm text-on-surface">
                        $
                        {selectedReceipt.items
                          .reduce((acc, item) => acc + Number(item.amount), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
                    Shielded Transfer List
                  </h4>
                  <div className="max-h-60 overflow-y-auto bg-surface-container-low rounded-xl border border-outline-variant/5 mb-6">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container-highest/20 sticky top-0">
                        <tr>
                          <th className="py-2 px-4 text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                            Target
                          </th>
                          <th className="py-2 px-4 text-right text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {selectedReceipt.items.map((item) => (
                          <tr key={`${selectedReceipt.id}-${item.employeeId}-${item.tongoAddress}`}>
                            <td className="py-3 px-4">
                              <p className="font-bold text-on-surface">{item.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-mono">
                                {item.tongoAddress}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-right font-black font-headline text-on-surface">
                              ${item.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => handleDownloadReceipt(selectedReceipt)}
                    className="w-full brand-gradient py-4 rounded-xl text-on-primary-container font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all glow-orange"
                  >
                    <Download className="w-4 h-4" />
                    Download Encrypted CSV Receipt
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

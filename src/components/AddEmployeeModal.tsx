"use client";

import { useState } from "react";
import { X, Shield, Loader2 } from "lucide-react";
import { getPayrollTokenOptions } from "@/lib/starkzap-sdk";
import type { AddEmployeeFormData } from "@/lib/starkzap-models";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AddEmployeeFormData) => Promise<void>;
}

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onSubmit,
}: AddEmployeeModalProps) {
  const [name, setName] = useState("");
  const [salary, setSalary] = useState("");
  const payrollTokens = getPayrollTokenOptions();
  const [recipientInput, setRecipientInput] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [role, setRole] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState(payrollTokens[0]?.symbol || "STRK");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !salary || !recipientInput || !role) {
      setError("All fields are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        name,
        salary,
        recipientInput,
        department,
        role,
        tokenSymbol,
      });
      // Reset form
      setName("");
      setSalary("");
      setRecipientInput("");
      setDepartment("Engineering");
      setRole("");
      setTokenSymbol(payrollTokens[0]?.symbol || "STRK");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-container-low rounded-xl border border-outline-variant/10 w-full max-w-lg p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-on-primary-container" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-headline">
                Add Shielded Employee
              </h3>
              <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest">
                Data encrypted locally with your LMK
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Employee Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Vance"
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30 cursor-pointer"
              >
                <option className="bg-[#0A0A0A] text-white" value="Engineering">Engineering</option>
                <option className="bg-[#0A0A0A] text-white" value="Marketing">Marketing</option>
                <option className="bg-[#0A0A0A] text-white" value="Operations">Operations</option>
                <option className="bg-[#0A0A0A] text-white" value="Security">Security</option>
                <option className="bg-[#0A0A0A] text-white" value="Product">Product</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Specific Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior Backend Dev"
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Preferred Token
              </label>
              <select
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30 cursor-pointer"
              >
                {payrollTokens.map((option) => (
                  <option key={option.symbol} className="bg-[#0A0A0A] text-white" value={option.symbol}>
                    {option.symbol} (Confidential Payroll Asset)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Payroll Amount
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder={`e.g. 10 ${tokenSymbol}`}
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                Tongo Recipient
              </label>
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder='base58 or {"x":"0x...","y":"0x..."}'
                className="w-full bg-surface-container-highest/50 border border-outline-variant/10 rounded-md px-4 py-3 text-sm text-on-surface font-mono text-xs placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary-container/30 focus:border-primary-container/30"
              />
              <p className="mt-2 text-[10px] text-on-surface-variant/50 uppercase tracking-widest">
                Accepts a Tongo base58 address or raw recipient coordinates
              </p>
            </div>
          </div>

          {error && (
            <p className="text-xs text-error font-bold">{error}</p>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-highest text-on-surface-variant font-bold text-sm rounded-md hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 brand-gradient text-on-primary-container font-bold text-sm rounded-md glow-orange active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Shield &amp; Add Node
                </>
              )}
            </button>
          </div>

          <p className="text-[10px] text-center text-on-surface-variant/30 uppercase tracking-widest">
            Profile metadata is AES-encrypted before leaving your browser
          </p>
        </form>
      </div>
    </div>
  );
}

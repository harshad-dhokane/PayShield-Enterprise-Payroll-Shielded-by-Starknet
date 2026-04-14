"use client";

import { X, Shield, Lock, Activity, Building, Hash } from "lucide-react";
import type { EmployeeRecord } from "@/lib/starkzap-models";

interface EmployeeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
}

export default function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
}: EmployeeDetailModalProps) {
  if (!isOpen || !employee) return null;

  const formatPayrollAmount = (amount: string, tokenSymbol: string) => `${amount} ${tokenSymbol}`;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-surface-container-low rounded-xl border border-outline-variant/10 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Block */}
        <div className="relative h-24 brand-gradient opacity-90" />
        
        <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors z-10"
        >
            <X className="w-5 h-5 text-on-primary-container" />
        </button>

        <div className="px-8 pb-8 -mt-10 relative">
          <div className="flex items-end gap-4 mb-6">
            <div className="h-20 w-20 rounded-xl overflow-hidden border-4 border-surface-container-low bg-surface-container-highest flex items-center justify-center font-black text-primary-container text-2xl shadow-lg">
              {getInitials(employee.name)}
            </div>
            <div className="pb-1">
              <h3 className="text-2xl font-black font-headline text-on-surface tracking-tight">
                {employee.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                 <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded flex items-center gap-1 shadow-[0_0_10px_rgba(255,87,51,0.1)]">
                    <Shield className="w-3 h-3" /> Shielded Node
                 </span>
                 <span className="text-xs text-on-surface-variant font-mono">{employee.id?.substring(0,8)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             {/* Department & Role */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-highest/30 p-4 rounded-lg border border-outline-variant/5">
                   <div className="flex items-center gap-2 text-on-surface-variant/50 uppercase tracking-widest text-[10px] font-bold mb-1">
                      <Building className="w-3 h-3" /> Department
                   </div>
                   <div className="font-bold text-sm text-on-surface">{employee.department || "Engineering"}</div>
                </div>
                <div className="bg-surface-container-highest/30 p-4 rounded-lg border border-outline-variant/5">
                   <div className="flex items-center gap-2 text-on-surface-variant/50 uppercase tracking-widest text-[10px] font-bold mb-1">
                      <Activity className="w-3 h-3" /> Specific Role
                   </div>
                   <div className="font-bold text-sm text-on-surface">{employee.role || "Developer"}</div>
                </div>
             </div>

             {/* Secure Data */}
             <div className="bg-[#0A0A0A] p-5 rounded-lg border border-outline-variant/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full" />
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2 text-tertiary uppercase tracking-widest text-[10px] font-bold drop-shadow-[0_0_10px_rgba(46,204,113,0.3)]">
                      <Lock className="w-3 h-3" /> Local Master Key Decrypted
                   </div>
                </div>

                <div className="space-y-4 relative z-10">
                   <div>
                      <p className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest mb-1">Payroll Amount</p>
                      <p className="text-2xl font-black font-headline text-on-surface tracking-tight">
                        {formatPayrollAmount(employee.salary, employee.tokenSymbol)}
                      </p>
                   </div>
                   <div>
                      <p className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                         <Hash className="w-3 h-3" /> Tongo Recipient Address
                      </p>
                      <p className="font-mono text-xs text-on-surface-variant bg-black/50 p-2.5 rounded border border-white/5 break-all">
                         {employee.tongoAddress}
                      </p>
                   </div>
                   <div>
                      <p className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest mb-1">
                         Confidential Coordinates
                      </p>
                      <p className="font-mono text-[10px] text-on-surface-variant bg-black/50 p-2.5 rounded border border-white/5 break-all">
                         {employee.tongoRecipient.x}, {employee.tongoRecipient.y}
                      </p>
                   </div>
                   <div>
                      <p className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest mb-1">
                         Payroll Asset
                      </p>
                      <p className="font-mono text-xs text-on-surface-variant bg-black/50 p-2.5 rounded border border-white/5 break-all">
                         {employee.tokenSymbol}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

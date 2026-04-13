"use client";

import TopBar from "@/components/TopBar";
import { useState, useEffect } from "react";
import { usePayrollStore } from "@/store/payroll-store";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { useWallet } from "@/context/WalletContext";
import type { AddEmployeeFormData, EmployeeRecord } from "@/lib/starkzap-models";
import {
  TrendingUp,
  ShieldCheck,
  Activity,
  GitBranch,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "Shielded") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-tertiary/10 text-tertiary rounded-full neon-glow-green">
        <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-wider">
          Shielded
        </span>
      </div>
    );
  }
  if (status === "Exposed") {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary-container/10 text-secondary rounded-full">
        <span className="w-1.5 h-1.5 bg-secondary rounded-full" />
        <span className="text-[10px] font-black uppercase tracking-wider">
          Exposed
        </span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-highest/50 text-on-surface-variant/50 rounded-full">
      <span className="w-1.5 h-1.5 bg-on-surface-variant/30 rounded-full" />
      <span className="text-[10px] font-black uppercase tracking-wider">
        Pending
      </span>
    </div>
  );
}

export default function EmployeesPage() {
  const { employees, fetchEmployees, addEmployee } = usePayrollStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Active");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const { address, localMasterKey } = useWallet();
  
  useEffect(() => {
    if (address && localMasterKey) {
      fetchEmployees(address, localMasterKey);
    }
  }, [fetchEmployees, address, localMasterKey]);
  
  const loading = false;
  const error = null;

  const handleAddEmployee = async (data: AddEmployeeFormData) => {
    if (address && localMasterKey) {
      await addEmployee(address, localMasterKey, data);
      setIsAddModalOpen(false);
    }
  };

  // Filter based on active tab
  const displayedEmployees = activeTab === "Active" ? employees : [];

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Format salary
  const formatSalary = (salary: string) => {
    const num = parseFloat(salary);
    if (isNaN(num)) return `$${salary}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Distinct count of departments
  const departmentCount = new Set(employees.map(e => e.department)).size || 1;

  return (
    <>
      <TopBar title="Employees" />
      <div className="p-8">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black font-headline tracking-[-0.04em] mb-2">
              Employee Directory
            </h2>
            <p className="text-on-surface-variant font-label text-sm">
              Manage global payroll, compliance, and personnel access from a
              single node.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 brand-gradient text-on-primary-container font-black text-[10px] uppercase tracking-[0.2em] rounded-lg glow-orange flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
            <div className="flex items-center bg-surface-container-low p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab("Active")}
                className={`px-4 py-1.5 rounded text-xs font-bold tracking-tight transition-colors ${activeTab === 'Active' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
              >
                Active
              </button>
              <button 
                onClick={() => setActiveTab("Archived")}
                className={`px-4 py-1.5 rounded text-xs font-bold tracking-tight transition-colors ${activeTab === 'Archived' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant/50 hover:text-on-surface'}`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Total Personnel
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              {loading ? "..." : employees.length.toLocaleString()}
            </h3>
            <div className="mt-4 flex items-center text-tertiary text-xs font-bold">
              <TrendingUp className="w-4 h-4 mr-1" />
              +0% this month
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Shielded Nodes
            </p>
            <h3 className="text-3xl font-black font-headline text-tertiary">
              100%
            </h3>
            <div className="mt-4 flex items-center text-on-surface-variant text-xs opacity-60">
              <ShieldCheck className="w-4 h-4 mr-1" />
              Audit compliant
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Monthly Volume
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              ${employees.reduce((acc, emp) => acc + (parseFloat(emp.salary) || 0), 0).toLocaleString()}
            </h3>
            <div className="mt-4 flex items-center text-secondary text-xs font-bold">
              <Activity className="w-4 h-4 mr-1" />
              Processing...
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Departments
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              {departmentCount}
            </h3>
            <div className="mt-4 flex items-center text-on-surface-variant text-xs opacity-60">
              <GitBranch className="w-4 h-4 mr-1" />
              Global hierarchy
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center text-on-surface-variant opacity-50">
                <Filter className="w-4 h-4" />
              </span>
              <input
                type="text"
                onChange={() => {}}
                className="w-full bg-surface-container-highest/30 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary/20 text-on-surface outline-none"
                placeholder="Search by name, ID, or department..."
              />
            </div>
            <select onChange={() => alert("Detailed filters coming soon.")} className="bg-surface-container-highest/30 border-none rounded-lg px-4 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary/20 cursor-pointer font-label outline-none">
              <option className="bg-[#0A0A0A] text-white">All Departments</option>
              <option className="bg-[#0A0A0A] text-white">Engineering</option>
              <option className="bg-[#0A0A0A] text-white">Marketing</option>
              <option className="bg-[#0A0A0A] text-white">Operations</option>
              <option className="bg-[#0A0A0A] text-white">Security</option>
              <option className="bg-[#0A0A0A] text-white">Product</option>
            </select>
            <select onChange={() => alert("Detailed filters coming soon.")} className="bg-surface-container-highest/30 border-none rounded-lg px-4 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary/20 cursor-pointer font-label outline-none">
              <option className="bg-[#0A0A0A] text-white">Shielded Status</option>
              <option className="bg-[#0A0A0A] text-white">Shielded</option>
              <option className="bg-[#0A0A0A] text-white">Exposed</option>
              <option className="bg-[#0A0A0A] text-white">Pending</option>
            </select>
          </div>
          <button 
            onClick={() => alert("Export format compilation starting... please contact support to enable this feature.")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary px-4 py-2 hover:bg-primary/10 rounded transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Employee List Table */}
        <div className="kinetic-glass rounded-2xl overflow-hidden border border-outline-variant/10">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-high/50 border-b border-outline-variant/10">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  Personnel Identity
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                  Department
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant text-center">
                  Shielded Status
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant text-right">
                  30D Payout
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm font-bold text-on-surface-variant"
                  >
                    Fetching and decrypting nodes...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm font-bold text-error"
                  >
                    {error}
                  </td>
                </tr>
              ) : displayedEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm font-bold text-on-surface-variant"
                  >
                    No personnel found in {activeTab}.
                  </td>
                </tr>
              ) : (
                displayedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-surface-container-highest/20 transition-colors group cursor-pointer"
                    onClick={() => setSelectedEmployee(emp)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden border border-outline-variant/20 bg-surface-container-highest flex items-center justify-center font-bold text-primary-container text-sm shadow-[0_0_10px_rgba(255,87,51,0.05)]">
                          {getInitials(emp.name)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface font-headline tracking-tight">
                            {emp.name}
                          </p>
                          <p className="text-[10px] text-on-surface-variant opacity-60">
                            Tongo: {emp.tongoAddress.substring(0, 6)}...{emp.tongoAddress.substring(emp.tongoAddress.length - 4)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 bg-surface-container-highest/50 rounded text-on-surface-variant">
                        {emp.department || "Engineering"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusBadge status="Shielded" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-headline font-bold text-on-surface">
                        {formatSalary(emp.salary)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedEmployee(emp); }}
                        className="opacity-0 group-hover:opacity-100 transition-all px-4 py-1.5 text-xs font-bold text-primary bg-primary/10 rounded-md hover:bg-primary hover:text-on-primary-container"
                      >
                        View Node
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-between">
          <p className="text-xs text-on-surface-variant/60 font-label">
            Showing {displayedEmployees.length > 0 ? 1 : 0}-{displayedEmployees.length} of {displayedEmployees.length} entries
          </p>
          <div className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center bg-surface-container-low rounded border border-outline-variant/10 cursor-not-allowed opacity-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-primary text-on-primary-container font-black text-xs rounded shadow-[0_0_10px_rgba(255,87,51,0.2)]">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-surface-container-low rounded border border-outline-variant/10 cursor-not-allowed opacity-50">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEmployee}
      />
      
      <EmployeeDetailModal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
      />
    </>
  );
}

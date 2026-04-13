"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { encryptWithLMK, decryptWithLMK } from "@/lib/encryption";
import { useWallet } from "@/context/WalletContext";
import type { EmployeeRecord, EmployeeRow } from "@/lib/starkzap-models";
import { parseRecipientInput, parseStoredRecipient, recipientToAddress } from "@/lib/starkzap-confidential";

export function useEmployees() {
  const { address, localMasterKey } = useWallet();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch & decrypt employees
  const fetchEmployees = useCallback(async () => {
    if (!address || !localMasterKey) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("employees")
        .select("*")
        .eq("admin_address", address)
        .order("created_at", { ascending: false });

      if (dbError) throw dbError;

      // Decrypt each employee's name and salary locally
      const decrypted: EmployeeRecord[] = (data as EmployeeRow[]).map((row) => {
        const recipient = parseStoredRecipient(row.tongo_recipient, row.shielded_id);

        return {
          id: row.id,
          adminAddress: row.admin_address,
          name: decryptWithLMK(row.name_enc, localMasterKey),
          salary: decryptWithLMK(row.salary_enc, localMasterKey),
          department: row.department_enc
            ? decryptWithLMK(row.department_enc, localMasterKey)
            : "Engineering",
          role: row.role_enc ? decryptWithLMK(row.role_enc, localMasterKey) : "Developer",
          tokenSymbol: row.token_enc ? decryptWithLMK(row.token_enc, localMasterKey) : "STRK",
          tongoAddress: row.tongo_address || recipientToAddress(recipient),
          tongoRecipient: recipient,
          createdAt: row.created_at,
        };
      });

      setEmployees(decrypted);
    } catch (err) {
      console.error("[StarkZap] Failed to fetch employees:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  }, [address, localMasterKey]);

  // Add a new employee (encrypt before save)
  const addEmployee = useCallback(
    async (name: string, salary: string, recipientInput: string) => {
      if (!address || !localMasterKey) {
        throw new Error("Wallet not connected or LMK not available");
      }

      // Encrypt name and salary with the LMK — Supabase only stores ciphertext
      const nameEnc = encryptWithLMK(name, localMasterKey);
      const salaryEnc = encryptWithLMK(salary, localMasterKey);
      const recipient = parseRecipientInput(recipientInput);
      const tongoAddress = recipientToAddress(recipient);

      const { error: dbError } = await supabase.from("employees").insert({
        admin_address: address,
        name_enc: nameEnc,
        salary_enc: salaryEnc,
        shielded_id: tongoAddress,
        tongo_address: tongoAddress,
        tongo_recipient: recipient,
      });

      if (dbError) throw dbError;

      // Refresh the list
      await fetchEmployees();
    },
    [address, localMasterKey, fetchEmployees]
  );

  // Delete an employee
  const deleteEmployee = useCallback(
    async (id: string) => {
      const { error: dbError } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;
      await fetchEmployees();
    },
    [fetchEmployees]
  );

  // Auto-fetch on mount when wallet is ready
  useEffect(() => {
    if (address && localMasterKey) {
      fetchEmployees();
    }
  }, [address, localMasterKey, fetchEmployees]);

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    addEmployee,
    deleteEmployee,
  };
}

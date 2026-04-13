"use client";

import { usePathname } from "next/navigation";
import { WalletProvider } from "@/context/WalletContext";
import LoginGate from "@/components/LoginGate";
import Sidebar from "@/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <main className="flex-1 w-full flex flex-col min-h-screen bg-surface relative">{children}</main>;
  }

  return (
    <WalletProvider>
      <LoginGate>
        <div className="noise-overlay" />
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">{children}</main>
      </LoginGate>
    </WalletProvider>
  );
}

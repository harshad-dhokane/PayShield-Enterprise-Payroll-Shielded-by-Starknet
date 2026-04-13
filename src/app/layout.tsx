import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "PayShield | Fintech Mission Control",
  description:
    "Privacy-first payroll management on StarkNet. Manage employees, run payroll, and track treasury.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased flex min-h-screen bg-surface selection:bg-primary-container selection:text-on-primary-container mx-8">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

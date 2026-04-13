"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Lock, FileCheck, ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center glow-orange">
              <Shield className="w-6 h-6 text-on-primary-container" />
            </div>
            <span className="text-xl font-black font-headline text-on-surface">PayShield </span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="#features" className="text-on-surface-variant font-label hover:text-on-surface transition-colors">
              Features
            </Link>
            <Link href="#compliance" className="text-on-surface-variant font-label hover:text-on-surface transition-colors">
              Compliance
            </Link>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="brand-gradient px-6 py-2.5 rounded-lg text-on-primary-container font-black text-xs uppercase tracking-widest glow-orange"
              >
                Access App
              </motion.button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {/* Abstract blur background */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-primary/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-black text-on-surface mb-6 leading-tight font-headline tracking-tighter">
              Enterprise Payroll,<br />
              <span className="inline-block brand-gradient px-4 py-1 rounded-md text-transparent transition-colors duration-300 hover:text-white">
                Shielded by Starknet
              </span>
            </h1>
            <p className="text-xl text-on-surface-variant/80 mb-10 max-w-2xl mx-auto font-label">
              Pay employees and vendors using private stablecoins.
              Transaction details are shielded from public view,
              yet remain verifiable for compliance.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="brand-gradient px-8 py-4 rounded-xl text-on-primary-container font-black text-sm uppercase tracking-widest flex items-center gap-3 glow-orange"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <button className="px-8 py-4 rounded-xl bg-surface-container-high text-on-surface font-black text-sm uppercase tracking-widest border border-outline-variant/10 hover:bg-surface-container-highest transition-colors">
                View Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Lock}
              title="Confidential Transfers"
              description="Salary amounts and recipient details are encrypted on-chain using ZK-STARKs. Only authorized parties can decrypt."
            />
            <FeatureCard
              icon={Zap}
              title="Batch Payroll"
              description="Process hundreds of payments in a single transaction. Save on gas fees while maintaining individual privacy."
            />
            <FeatureCard
              icon={FileCheck}
              title="Verifiable Audit"
              description="Generate compliance reports for auditors without revealing sensitive data. Built-in auditor keys for regulators."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto bg-surface-container-low rounded-3xl p-12 text-center relative overflow-hidden border border-outline-variant/10">
          <div className="absolute inset-0 brand-gradient opacity-10 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-4xl font-black font-headline text-on-surface mb-4 tracking-tight">
              Ready to shield your payroll?
            </h2>
            <p className="text-on-surface-variant mb-8 font-label">
              Join enterprises using Starknet&apos;s native privacy for compliant,
              confidential payments.
            </p>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="brand-gradient px-8 py-4 rounded-xl text-on-primary-container font-black text-xs uppercase tracking-widest glow-orange"
              >
                Get Started Now
              </motion.button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="bg-surface-container-highest/50 border border-outline-variant/10 rounded-2xl p-8 relative overflow-hidden group"
    >
      <div className={`absolute top-0 right-0 w-32 h-32 brand-gradient opacity-0 group-hover:opacity-10 blur-3xl transition-opacity pointer-events-none`} />

      <div className={`w-14 h-14 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-6`}>
        <Icon className={`w-6 h-6 text-primary`} />
      </div>

      <h3 className="text-xl font-bold font-headline text-on-surface mb-3 tracking-tight">{title}</h3>
      <p className="text-on-surface-variant font-label text-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

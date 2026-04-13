# PayShield

PayShield is a Starknet-powered payroll and treasury application for enterprises that need:
- confidential salary and vendor payouts
- verifiable onchain settlement
- compliance-ready audit trails without exposing sensitive compensation data

The app uses StarkZap SDK primitives for wallet onboarding, confidential transfers (Tongo), swaps, DCA, lending, staking, and cross-chain bridging, with encrypted operational metadata persisted in Supabase.

## The Real Problem This Solves

Traditional crypto payroll exposes too much:
- wallet-level salary visibility leaks compensation bands and organizational structure
- public transaction histories reveal vendor relationships and payment cadence
- finance teams still need auditability, but privacy and proof are usually trade-offs

PayShield addresses this by combining:
- client-side encryption for HR/payroll records
- confidential transfer rails for salary settlement
- deterministic execution previews and fee-mode fallback
- operational telemetry and history for treasury governance

Result: payroll privacy for employees and vendors, while preserving finance and compliance control.

## What The Application Does

Core product capabilities:
- Wallet-gated admin access with Cartridge onboarding via StarkZap.
- Local Master Key (LMK) generation from a signed message.
- Employee management with encrypted fields at rest in Supabase.
- Batch payroll ingestion from CSV or manual selection.
- Confidential payroll preview before execution (calls, fund amount, sweep amount, fee estimate, preflight).
- One-click payroll execution on Starknet through StarkZap wallet calls.
- Treasury automation for swap, DCA, lending, staking, and bridge deposits.
- Treasury action history persisted for reporting and audit context.
- Dashboard and reports views for volume, batches, and strategy health.

## High-Level Architecture

- Frontend: Next.js App Router + React + Tailwind + Framer Motion.
- State: Zustand stores for payroll/auth flows.
- Wallet/Onboarding: StarkZap + Cartridge strategy.
- Confidential rail: StarkZap `TongoConfidential`.
- Data persistence: Supabase tables (`employees`, `batches`, `payroll_items`, `treasury_actions`).
- Crypto utils: `crypto-js` AES for LMK-based local encryption.

Main implementation files:
- `src/lib/starkzap-sdk.ts`: StarkZap SDK creation + network/provider/policy config.
- `src/lib/starkzap-confidential.ts`: Tongo profile derivation and confidential payroll execution builder.
- `src/lib/starkzap.ts`: app-level StarkZap client facade.
- `src/lib/starkzap-treasury.ts`: treasury operations around StarkZap wallet APIs.
- `src/context/WalletContext.tsx`: wallet connect + LMK derivation lifecycle.
- `src/store/payroll-store.ts`: encrypted data persistence + batch execution orchestration.

## StarkZap SDK Implementation Details

### 1) SDK bootstrap and network binding

`createStarkZapSdk()` configures:
- network: `mainnet` or `sepolia`
- optional RPC override
- optional paymaster node
- explorer config (Voyager)
- bridging options (LayerZero API + Ethereum/Solana RPC endpoints)

This creates one consistent StarkZap instance used throughout treasury and onboarding flows.

### 2) Cartridge onboarding with scoped policies

`createCartridgeOnboardOptions()` sets:
- strategy: `OnboardStrategy.Cartridge`
- deploy mode: `if_needed`
- fee mode preference: sponsored or user-pays
- AVNU + Ekubo swap providers
- AVNU + Ekubo DCA providers
- policy list derived from configured contracts/methods

Policies are dynamically assembled and de-duplicated for:
- payroll token approvals
- Tongo methods (`fund`, `transfer`, `withdraw`, `rollover`, `ragequit`)
- optional company registry methods (`register_company`, `add_employee`, `record_payroll`)

### 3) Token and validator configuration

`starkzap-sdk.ts` also centralizes:
- active token map by network
- default confidential payroll token resolution
- treasury token options
- default validator selection for staking

This avoids token drift across payroll and treasury modules.

## Confidential Payroll Pipeline (How It Works)

### 1) LMK generation (client-only)

On login, `WalletContext` asks the wallet to sign typed data:
- domain: `StarkZap`
- message: `Access Shielded Payroll`

LMK is derived as SHA-256 of wallet address + signature and kept in memory only.

### 2) Employee/payroll data encryption

Using `encryptWithLMK()`:
- employee name, salary, department, role, token are encrypted before Supabase insert
- payroll item amounts are encrypted in `payroll_items.amount_enc`

Using `decryptWithLMK()`:
- data is decrypted on fetch for rendering and payroll composition

### 3) Confidential identity derivation for company vault

`getCompanyConfidentialProfile()`:
- derives deterministic company Tongo private key from `lmk + walletAddress`
- instantiates `TongoConfidential`
- produces company confidential recipient/address

This makes confidential treasury state reproducible for the same admin + LMK session.

### 4) Batch preparation (`preparePayrollExecution`)

For each payroll run:
- validates at least one payroll item
- loads company confidential state (balance + pending)
- appends rollover call if pending funds exist
- computes required funding delta
- adds confidential fund call if needed
- adds confidential transfer calls per employee recipient
- optionally sweeps remainder back to admin treasury address
- builds final call array and runs preflight simulation
- attempts preferred fee mode first, with fallback mode if preflight fails
- returns preview payload for UI confirmation

Preview contains:
- calls count
- fee mode and preflight status
- fee estimate
- total payroll amount
- fund amount and sweep amount
- company confidential address and recipient

### 5) Final execution (`executePayrollExecution`)

Execution path:
- executes prepared calls with selected fee mode
- waits for accepted L2 finality state
- collects receipt and explorer metadata
- writes batch status and metadata back to Supabase

## Treasury Module Implementation

`src/lib/starkzap-treasury.ts` wraps StarkZap wallet capabilities into admin actions:

- Swap:
  - quote via `wallet.getQuote`
  - execute via `wallet.swap`
- DCA:
  - preview cycle via `wallet.dca().previewCycle`
  - create order via `wallet.dca().create`
- Lending:
  - markets/positions load
  - deposit/withdraw
  - borrow health quote via `wallet.lending().quoteHealth`
- Bridge:
  - Ethereum/Solana wallet connect
  - bridge token discovery + fee estimate
  - deposit initiation to Starknet
- Staking:
  - default validator pool resolution
  - stake + reward claim

Each confirmed treasury operation is written to `treasury_actions` with metadata and tx hash where available.

## Data Model (Supabase)

Schema is in `supabase_setup.sql`.

Primary tables:
- `employees`: encrypted profile + recipient coordinates/address
- `batches`: payroll run metadata and execution state
- `payroll_items`: encrypted per-recipient payment rows
- `treasury_actions`: action log for strategy operations

Notes:
- current SQL policy in this repo uses permissive anon rules for demo speed
- production deployments should enforce strict RLS by authenticated admin identity

## App Routes and User Flow

- `/`: landing page
- `/dashboard`: treasury and payroll operational overview
- `/employees`: encrypted employee registry
- `/payroll/batch`: CSV/manual batch build, preview, execute
- `/payroll`: payroll list view
- `/treasury`: swap/DCA/lending/bridge/stake actions
- `/reports`: payroll and treasury reporting surfaces
- `/settings`: administrative configuration UX

For all non-landing routes:
- app mounts `WalletProvider`
- `LoginGate` blocks UI until wallet + LMK are available

## Short Repository Description

Confidential Starknet payroll and treasury automation with StarkZap, Tongo privacy rails, and compliance-ready operational audit logs.

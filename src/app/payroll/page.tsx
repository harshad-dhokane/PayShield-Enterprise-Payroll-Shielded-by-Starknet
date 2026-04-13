import TopBar from "@/components/TopBar";

export default function PayrollPage() {
  return (
    <>
      <TopBar title="Payroll" />
      <div className="p-8">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-black font-headline tracking-[-0.04em] mb-2">
              Payroll Management
            </h2>
            <p className="text-on-surface-variant font-label text-sm">
              Configure, schedule, and execute privacy-first payroll batches.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Next Payout
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              Jun 25
            </h3>
            <p className="mt-4 text-xs text-on-surface-variant/60">
              13 days remaining
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Pending Batch
            </p>
            <h3 className="text-3xl font-black font-headline text-primary-container">
              $142.5K
            </h3>
            <p className="mt-4 text-xs text-tertiary font-bold">
              54 employees queued
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <p className="text-xs font-label text-on-surface-variant mb-1 uppercase tracking-widest">
              Gas Estimate
            </p>
            <h3 className="text-3xl font-black font-headline text-on-surface">
              $12.40
            </h3>
            <p className="mt-4 text-xs text-tertiary font-bold">
              Batched via StarkProof™
            </p>
          </div>
        </div>

        {/* Recent Payroll History */}
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5">
            <h4 className="text-sm font-bold uppercase tracking-widest font-headline">
              Payroll History
            </h4>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant border-b border-white/5">
                <th className="px-8 py-4 font-bold">Batch ID</th>
                <th className="px-8 py-4 font-bold">Date</th>
                <th className="px-8 py-4 font-bold">Employees</th>
                <th className="px-8 py-4 font-bold">Total</th>
                <th className="px-8 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { id: "#882", date: "Jun 12, 2024", emps: 54, total: "$142,500", status: "Confirmed" },
                { id: "#881", date: "May 25, 2024", emps: 52, total: "$138,200", status: "Confirmed" },
                { id: "#880", date: "May 12, 2024", emps: 51, total: "$135,800", status: "Confirmed" },
              ].map((batch, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-surface-container-high transition-colors"
                >
                  <td className="px-8 py-4 font-bold font-headline">
                    {batch.id}
                  </td>
                  <td className="px-8 py-4 text-on-surface-variant">
                    {batch.date}
                  </td>
                  <td className="px-8 py-4">{batch.emps}</td>
                  <td className="px-8 py-4 font-bold">{batch.total}</td>
                  <td className="px-8 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary text-[10px] font-bold uppercase">
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

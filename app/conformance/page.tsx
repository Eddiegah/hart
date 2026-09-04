import Link from "next/link";
import results from "../../docs/conformance-results.json";

export const metadata = {
  title: "Conformance — Hart",
};

export default function ConformancePage() {
  const sorted = [...results.tests].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
        <Link href="/" className="mono text-[0.65rem] text-muted hover:text-accent">
          ← BACK TO SIMULATOR
        </Link>
        <h1 className="mono text-lg font-black tracking-tight text-foreground">CONFORMANCE</h1>
        <p className="max-w-md text-[0.7rem] leading-relaxed text-muted">
          Every entry below is a real, unmodified test file from{" "}
          <a href="https://github.com/riscv-software-src/riscv-tests" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            riscv-software-src/riscv-tests
          </a>
          , run on the actual RTL. See{" "}
          <a href="https://github.com/Eddiegah/hart/blob/master/docs/SCOPE.md" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            docs/SCOPE.md
          </a>
          .
        </p>
        <span className="mono ml-auto flex items-center gap-2 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-sm font-black text-accent">
          {results.totalPassed}/{results.totalTests}
        </span>
      </header>

      {/* LED-grid status board - each test is one indicator, not a table
          row - reads like a real hardware test bench readout. */}
      <div className="panel grid grid-cols-3 gap-2 p-4 sm:grid-cols-6">
        {sorted.map((t) => (
          <a
            key={t.name}
            href={t.upstreamPath}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col items-center gap-1.5 rounded border border-border px-2 py-3 hover:border-accent/50"
            title={`${t.cycles} cycles — view real source`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${t.pass ? "bg-accent" : "bg-accent-2"}`} style={{ boxShadow: `0 0 8px ${t.pass ? "var(--accent)" : "var(--accent-2)"}` }} />
            <span className="mono text-[0.65rem] text-foreground">{t.name}</span>
            <span className="mono text-[0.55rem] text-muted group-hover:text-accent">{t.cycles}c</span>
          </a>
        ))}
      </div>

      <p className="text-center text-[0.65rem] text-muted">
        Generated {new Date(results.generatedAt).toLocaleString()} · toolchain: {results.toolchainVersion}
      </p>
    </main>
  );
}

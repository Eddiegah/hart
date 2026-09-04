import Link from "next/link";
import results from "../../docs/conformance-results.json";

export const metadata = {
  title: "Conformance — Hart",
};

export default function ConformancePage() {
  const sorted = [...results.tests].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="fade-in flex flex-col items-center gap-3 text-center">
        <Link href="/" className="text-xs text-muted underline underline-offset-2">
          ← back to the simulator
        </Link>
        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">Conformance</h1>
        <div className="glow-pulse card-in glass-panel flex flex-col items-center gap-1 px-8 py-5">
          <span className="text-5xl font-black text-accent">
            {results.totalPassed}/{results.totalTests}
          </span>
          <span className="text-xs tracking-wide text-muted uppercase">real official riscv-tests rv32ui tests passing</span>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          Every row below is a real, unmodified test file from{" "}
          <a href="https://github.com/riscv-software-src/riscv-tests" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            riscv-software-src/riscv-tests
          </a>
          , run on the actual Verilog RTL via Icarus Verilog. Only the pass/fail-signaling harness was simplified — see{" "}
          <a href="https://github.com/Eddiegah/hart/blob/master/docs/SCOPE.md" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
            docs/SCOPE.md
          </a>{" "}
          for exactly what that means and why.
        </p>
      </header>

      <div className="card-in glass-panel overflow-x-auto p-2">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-muted">
              <th className="px-3 py-2 font-medium">Test</th>
              <th className="px-3 py-2 font-medium">Result</th>
              <th className="px-3 py-2 font-medium">Cycles</th>
              <th className="px-3 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.name} className="border-t border-border">
                <td className="mono px-3 py-2 text-foreground">{t.name}</td>
                <td className="px-3 py-2">
                  {t.pass ? <span className="text-accent">PASS</span> : <span className="text-accent-2">FAIL{t.testnum !== null ? ` (testnum=${t.testnum})` : ""}</span>}
                </td>
                <td className="mono px-3 py-2 text-muted">{t.cycles}</td>
                <td className="px-3 py-2">
                  <a href={t.upstreamPath} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                    view real source
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-center text-[0.7rem] text-muted">Generated {new Date(results.generatedAt).toLocaleString()} · toolchain: {results.toolchainVersion}</p>
    </main>
  );
}

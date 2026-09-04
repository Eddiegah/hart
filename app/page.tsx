"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Simulator } from "@/components/Simulator";
import type { ProgramManifestEntry } from "@/lib/programs";

export default function Home() {
  const [programs, setPrograms] = useState<ProgramManifestEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string>("factorial");
  const [hexText, setHexText] = useState<string | null>(null);
  const [resetNonce, setResetNonce] = useState(0);

  useEffect(() => {
    fetch("/programs/manifest.json")
      .then((r) => r.json())
      .then((data) => setPrograms(data.programs));
  }, []);

  const selected = programs.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    fetch(selected.hexFile)
      .then((r) => r.text())
      .then(setHexText);
  }, [selected]);

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-5 py-10 sm:px-8">
      <header className="fade-in flex flex-col items-center gap-3 text-center">
        <span className="glow-pulse flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-2xl">⚡</span>
        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">Hart</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          A from-scratch RV32I RISC-V CPU core in Verilog — verified against{" "}
          <Link href="/conformance" className="text-accent underline underline-offset-2">
            42 real official riscv-tests conformance tests
          </Link>
          , cross-validated register-for-register against this independent TypeScript model, and simulated live below.
        </p>
      </header>

      <div className="card-in glass-panel flex flex-col gap-3 p-5" style={{ "--card-delay": "0ms" } as React.CSSProperties}>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Program
          <select
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setHexText(null);
              setResetNonce((n) => n + 1);
            }}
          >
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {selected && <p className="text-[0.7rem] leading-relaxed text-muted">{selected.description}</p>}
      </div>

      {selected && hexText ? (
        <Simulator key={`${selected.id}-${resetNonce}`} program={selected} hexText={hexText} onReset={() => setResetNonce((n) => n + 1)} />
      ) : (
        <p className="text-center text-sm text-muted">Loading program...</p>
      )}

      <details className="glass-panel group p-5 text-xs text-muted sm:p-6">
        <summary className="cursor-pointer font-medium text-foreground/80 select-none">How this works</summary>
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
          <p>
            The RTL in <code className="mono">rtl/</code> is a from-scratch, single-cycle RV32I core in Verilog, verified against 42 real, unmodified official riscv-tests
            conformance test files (see the{" "}
            <Link href="/conformance" className="text-accent underline underline-offset-2">
              conformance dashboard
            </Link>
            ). What you&apos;re watching above runs on an independent TypeScript model of that same core — <code className="mono">tests/cross-validation.test.ts</code> runs
            the exact same compiled machine code through both engines and asserts they reach identical final register-file state, not just a documented claim that they match.
          </p>
          <p>
            Base RV32I has no hardware multiply or divide — the factorial demo computes products via repeated addition, and the GCD demo computes its modulo via repeated
            subtraction, both in software.
          </p>
          <p>
            No CSRs, no privileged architecture, no traps are implemented — a deliberate, disclosed scope decision. See{" "}
            <a href="https://github.com/Eddiegah/hart/blob/master/docs/SCOPE.md" target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
              docs/SCOPE.md
            </a>{" "}
            for exactly why that&apos;s provably fine for RV32I integer correctness.
          </p>
        </div>
      </details>
    </main>
  );
}

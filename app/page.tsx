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
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-5 py-8 sm:px-8">
      {/* Nameplate strip, not a hero banner - a fixed-height instrument
          label rather than the tall gradient-title header this portfolio's
          other recent projects share. */}
      <header className="panel flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="mono flex h-9 w-9 items-center justify-center rounded border border-accent/50 bg-accent/10 text-sm font-black text-accent">H</span>
          <div>
            <h1 className="mono text-lg font-black tracking-tight text-foreground">HART</h1>
            <p className="text-[0.65rem] text-muted">RV32I RISC-V core · Verilog RTL · single-cycle</p>
          </div>
        </div>
        <p className="max-w-md text-[0.7rem] leading-relaxed text-muted">
          Verified against{" "}
          <Link href="/conformance" className="text-accent underline underline-offset-2">
            42 real official riscv-tests
          </Link>
          , cross-validated register-for-register against an independent TypeScript model.
        </p>
        <Link href="/conformance" className="mono ml-auto rounded border border-border px-3 py-1.5 text-[0.65rem] text-muted hover:border-accent/50 hover:text-accent">
          CONFORMANCE →
        </Link>
      </header>

      {selected && hexText ? (
        <Simulator
          key={`${selected.id}-${resetNonce}`}
          program={selected}
          programs={programs}
          hexText={hexText}
          onSelectProgram={(id) => {
            setSelectedId(id);
            setHexText(null);
            setResetNonce((n) => n + 1);
          }}
          onReset={() => setResetNonce((n) => n + 1)}
        />
      ) : (
        <p className="text-center text-sm text-muted">Loading program…</p>
      )}

      <details className="panel p-5 text-xs text-muted">
        <summary className="mono cursor-pointer font-medium text-foreground/80 select-none">HOW THIS WORKS</summary>
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

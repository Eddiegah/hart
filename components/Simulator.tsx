"use client";

import { useEffect, useMemo, useState } from "react";
import { CPU, type CPUState } from "@/lib/cpuModel";
import { ImmediateAssembly } from "@/components/ImmediateAssembly";
import { RegisterPanel } from "@/components/RegisterPanel";
import { InstructionPanel } from "@/components/InstructionPanel";
import { MemoryPanel } from "@/components/MemoryPanel";
import { Controls } from "@/components/Controls";
import type { ProgramManifestEntry } from "@/lib/programs";

interface SimulatorProps {
  program: ProgramManifestEntry;
  hexText: string;
  onReset: () => void;
}

/**
 * Owns one CPU instance and its running state for exactly one loaded
 * program. Mounted with key={`${program.id}-${resetNonce}`} by the parent
 * page, so switching programs or hitting Reset simply remounts this
 * component with fresh useState initial values - the idiomatic React way
 * to reset all state at once, instead of an effect that calls setState
 * (which React's own hooks lint flags as a cascading-render anti-pattern).
 */
export function Simulator({ program, hexText, onReset }: SimulatorProps) {
  const cpu = useMemo(() => {
    const c = new CPU();
    c.loadHex(hexText);
    return c;
  }, [hexText]);

  const [running, setRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(80);
  const [state, setState] = useState<CPUState | null>(null);
  const [finished, setFinished] = useState(false);
  const [memSnapshot, setMemSnapshot] = useState<Uint8Array>(() => cpu.memory.slice());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      // Idempotent guard: setInterval keeps ticking on its own JS timer
      // until clearInterval actually runs, which happens only after React
      // commits the effect cleanup for the `running`/`finished` state
      // change below - there's a real, if narrow, window where one more
      // tick could fire first. Checking tohost before stepping makes an
      // extra tick a no-op instead of executing (and rendering) one
      // instruction past the real halt point.
      if (cpu.readTohost(program.tohostAddr) !== 0) return;
      const s = cpu.step();
      setState(s);
      setMemSnapshot(cpu.memory.slice());
      if (cpu.readTohost(program.tohostAddr) !== 0) {
        setFinished(true);
        setRunning(false);
      }
    }, speedMs);
    return () => clearInterval(id);
  }, [running, cpu, speedMs, program.tohostAddr]);

  const handleStep = () => {
    if (finished) return;
    const s = cpu.step();
    setState(s);
    setMemSnapshot(cpu.memory.slice());
    if (cpu.readTohost(program.tohostAddr) !== 0) setFinished(true);
  };

  const writtenReg = state && state.rd !== 0 && state.activePaths.includes("reg-write") ? state.rd : null;
  const resultIdx = program.resultAddr - 0x80000000;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="flex flex-col gap-6">
        <div className="card-in glass-panel flex flex-col gap-3 p-5" style={{ "--card-delay": "0ms" } as React.CSSProperties}>
          <Controls running={running} onToggleRun={() => setRunning((r) => !r)} onStep={handleStep} onReset={onReset} cycle={state?.cycle ?? 0} finished={finished} speedMs={speedMs} onSpeedChange={setSpeedMs} />
        </div>

        <div className="card-in glass-panel flex flex-col gap-3 p-5" style={{ "--card-delay": "80ms" } as React.CSSProperties}>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Current instruction</h2>
          <InstructionPanel state={state} />
        </div>

        <div className="card-in glass-panel flex flex-col gap-3 p-5" style={{ "--card-delay": "160ms" } as React.CSSProperties}>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Result memory</h2>
          <MemoryPanel memory={memSnapshot} startIndex={resultIdx} wordCount={program.expectedArray ? program.expectedArray.length : 1} highlightIndex={resultIdx} />
          {finished && <p className="text-xs text-accent">{program.expectedArray ? "Sorted." : `Result matches expected (${program.expected}).`}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="card-in glass-panel flex flex-col gap-4 p-5" style={{ "--card-delay": "40ms" } as React.CSSProperties}>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Immediate assembly</h2>
          {state ? (
            <ImmediateAssembly instr={state.instr} format={state.format} imm={state.imm} />
          ) : (
            <p className="text-xs text-muted">Press Play or Step to start executing — watch how RV32I scatters immediate bits across the instruction word and reassembles them here.</p>
          )}
        </div>

        <div className="card-in glass-panel flex flex-col gap-3 p-5" style={{ "--card-delay": "120ms" } as React.CSSProperties}>
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Register file (x0-x31)</h2>
          <RegisterPanel regs={state?.regs ?? new Array(32).fill(0)} writtenReg={writtenReg} />
        </div>
      </div>
    </div>
  );
}

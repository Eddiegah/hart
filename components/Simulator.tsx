"use client";

import { useEffect, useMemo, useState } from "react";
import { CPU, type CPUState } from "@/lib/cpuModel";
import { ImmediateAssembly } from "@/components/ImmediateAssembly";
import { RegisterPanel } from "@/components/RegisterPanel";
import { InstructionPanel } from "@/components/InstructionPanel";
import { MemoryPanel } from "@/components/MemoryPanel";
import { Toolbar } from "@/components/Toolbar";
import { Schematic } from "@/components/Schematic";
import type { ProgramManifestEntry } from "@/lib/programs";

interface SimulatorProps {
  program: ProgramManifestEntry;
  programs: ProgramManifestEntry[];
  hexText: string;
  onSelectProgram: (id: string) => void;
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
export function Simulator({ program, programs, hexText, onSelectProgram, onReset }: SimulatorProps) {
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
    <div className="flex flex-col gap-4">
      <Toolbar
        programs={programs}
        selectedId={program.id}
        onSelect={onSelectProgram}
        running={running}
        onToggleRun={() => setRunning((r) => !r)}
        onStep={handleStep}
        onReset={onReset}
        cycle={state?.cycle ?? 0}
        finished={finished}
        speedMs={speedMs}
        onSpeedChange={setSpeedMs}
      />

      <Schematic state={state} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="panel flex flex-col gap-3 p-4">
          <h2 className="mono text-[0.65rem] font-semibold tracking-wide text-muted">CURRENT INSTRUCTION</h2>
          <InstructionPanel state={state} />
        </div>

        <div className="panel flex flex-col gap-3 p-4">
          <h2 className="mono text-[0.65rem] font-semibold tracking-wide text-muted">RESULT MEMORY</h2>
          <MemoryPanel memory={memSnapshot} startIndex={resultIdx} wordCount={program.expectedArray ? program.expectedArray.length : 1} highlightIndex={resultIdx} />
          {finished && <p className="mono text-xs text-accent">{program.expectedArray ? "✓ SORTED" : `✓ MATCHES EXPECTED (${program.expected})`}</p>}
        </div>
      </div>

      <div className="panel flex flex-col gap-3 p-4">
        <h2 className="mono text-[0.65rem] font-semibold tracking-wide text-muted">IMMEDIATE ASSEMBLY</h2>
        {state ? (
          <ImmediateAssembly instr={state.instr} format={state.format} imm={state.imm} />
        ) : (
          <p className="text-xs text-muted">Press RUN or STEP to start executing.</p>
        )}
      </div>

      <div className="panel flex flex-col gap-3 p-4">
        <h2 className="mono text-[0.65rem] font-semibold tracking-wide text-muted">REGISTER FILE — x0 – x31</h2>
        <RegisterPanel regs={state?.regs ?? new Array(32).fill(0)} writtenReg={writtenReg} />
      </div>
    </div>
  );
}

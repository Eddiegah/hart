import { ABI_NAMES, type CPUState } from "@/lib/cpuModel";

interface InstructionPanelProps {
  state: CPUState | null;
}

export function InstructionPanel({ state }: InstructionPanelProps) {
  if (!state) {
    return <p className="text-xs text-muted">No instruction executed yet.</p>;
  }

  const rows: [string, string][] = [
    ["PC", `0x${state.pc.toString(16)}`],
    ["Instruction", `0x${state.instr.toString(16).padStart(8, "0")}`],
    ["Mnemonic", state.mnemonic],
    ["Format", `${state.format}-type`],
    ["rd", `x${state.rd} (${ABI_NAMES[state.rd]})`],
    ["rs1", `x${state.rs1} (${ABI_NAMES[state.rs1]})`],
    ["rs2", `x${state.rs2} (${ABI_NAMES[state.rs2]})`],
    ["ALU A", `0x${(state.aluA >>> 0).toString(16)}`],
    ["ALU B", `0x${(state.aluB >>> 0).toString(16)}`],
    ["ALU result", `0x${(state.aluResult >>> 0).toString(16)}`],
    ["Write-back", `0x${(state.wbData >>> 0).toString(16)}`],
  ];

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mono text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="text-right text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

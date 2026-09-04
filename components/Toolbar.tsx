"use client";

import type { ProgramManifestEntry } from "@/lib/programs";

interface ToolbarProps {
  programs: ProgramManifestEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  running: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  cycle: number;
  finished: boolean;
  speedMs: number;
  onSpeedChange: (v: number) => void;
}

/**
 * A single instrument-panel control strip - program select, transport
 * controls, cycle readout, and speed, all in one row - rather than the
 * "picker card" + "controls card" split this portfolio's other projects
 * use. Reads like the front panel of a piece of test equipment.
 */
export function Toolbar({ programs, selectedId, onSelect, running, onToggleRun, onStep, onReset, cycle, finished, speedMs, onSpeedChange }: ToolbarProps) {
  return (
    <div className="panel flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
      <select
        className="mono rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleRun}
          disabled={finished}
          className="btn-press mono flex items-center gap-1.5 rounded border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-40"
        >
          <span className={`h-1.5 w-1.5 rounded-full bg-accent ${running ? "led-blink" : ""}`} />
          {running ? "PAUSE" : "RUN"}
        </button>
        <button onClick={onStep} disabled={running || finished} className="btn-press mono rounded border border-border px-3 py-1.5 text-xs text-muted hover:border-border-strong disabled:opacity-40">
          STEP
        </button>
        <button onClick={onReset} className="btn-press mono rounded border border-border px-3 py-1.5 text-xs text-muted hover:border-border-strong">
          RESET
        </button>
      </div>

      <label className="flex items-center gap-2 text-[0.65rem] text-muted">
        SPEED
        <input type="range" min={10} max={500} step={10} value={speedMs} onChange={(e) => onSpeedChange(Number(e.target.value))} className="w-24" />
        <span className="mono w-14 text-foreground">{speedMs}ms</span>
      </label>

      <span className="mono ml-auto flex items-center gap-2 text-xs text-muted">
        CYCLE <span className="text-foreground">{cycle.toString().padStart(4, "0")}</span>
        {finished && <span className="rounded-sm border border-accent/50 bg-accent/10 px-1.5 py-0.5 text-[0.6rem] text-accent">HALTED</span>}
      </span>
    </div>
  );
}

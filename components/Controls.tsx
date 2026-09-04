interface ControlsProps {
  running: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  cycle: number;
  finished: boolean;
  speedMs: number;
  onSpeedChange: (v: number) => void;
}

export function Controls({ running, onToggleRun, onStep, onReset, cycle, finished, speedMs, onSpeedChange }: ControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button onClick={onToggleRun} disabled={finished} className="btn-press glow-pulse rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-40">
          {running ? "Pause" : "Play"}
        </button>
        <button onClick={onStep} disabled={running || finished} className="btn-press rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-border-strong disabled:opacity-40">
          Step
        </button>
        <button onClick={onReset} className="btn-press rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-border-strong">
          Reset
        </button>
        <span className="mono ml-auto text-xs text-muted">
          cycle {cycle} {finished && <span className="text-accent">· halted</span>}
        </span>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted">
        Speed: <span className="text-foreground">{speedMs}ms/cycle</span>
        <input type="range" min={10} max={500} step={10} value={speedMs} onChange={(e) => onSpeedChange(Number(e.target.value))} />
      </label>
    </div>
  );
}

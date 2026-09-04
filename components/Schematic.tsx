"use client";

import type { ActivePath, CPUState } from "@/lib/cpuModel";

interface SchematicProps {
  state: CPUState | null;
}

interface Box {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
}

const BOXES: Box[] = [
  { id: "pc", x: 20, y: 195, w: 100, h: 70, label: "PC" },
  { id: "mem", x: 300, y: 20, w: 360, h: 75, label: "MEMORY", sub: "unified · fetch + load/store" },
  { id: "decode", x: 180, y: 195, w: 140, h: 70, label: "DECODE", sub: "control + immediate" },
  { id: "regs", x: 400, y: 195, w: 140, h: 70, label: "REGISTERS" },
  { id: "alu", x: 620, y: 195, w: 120, h: 70, label: "ALU" },
  { id: "wb", x: 440, y: 345, w: 160, h: 50, label: "WRITE-BACK" },
  { id: "pcnext", x: 20, y: 345, w: 100, h: 50, label: "PC-NEXT" },
];

const boxById = Object.fromEntries(BOXES.map((b) => [b.id, b]));
const cx = (b: Box) => b.x + b.w / 2;
const cy = (b: Box) => b.y + b.h / 2;
const top = (b: Box, frac = 0.5) => ({ x: b.x + b.w * frac, y: b.y });
const bottom = (b: Box, frac = 0.5) => ({ x: b.x + b.w * frac, y: b.y + b.h });
const left = (b: Box, frac = 0.5) => ({ x: b.x, y: b.y + b.h * frac });
const right = (b: Box, frac = 0.5) => ({ x: b.x + b.w, y: b.y + b.h * frac });

interface Wire {
  id: string;
  path: string;
  /** activePaths keys that light this wire up this cycle. */
  keys: ActivePath[];
  label?: string;
}

function elbowV(x1: number, y1: number, x2: number, y2: number, midY: number): string {
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}
function elbowH(x1: number, y1: number, x2: number, y2: number, midX: number): string {
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

const pc = boxById.pc;
const mem = boxById.mem;
const decode = boxById.decode;
const regs = boxById.regs;
const alu = boxById.alu;
const wb = boxById.wb;
const pcnext = boxById.pcnext;

const memFetch = bottom(mem, 0.18);
const memLoadStore = bottom(mem, 0.82);

const WIRES: Wire[] = [
  { id: "pc-to-mem", path: elbowV(cx(pc), top(pc).y, memFetch.x, memFetch.y, 60), keys: ["fetch"], label: "addr" },
  { id: "mem-to-decode", path: elbowV(memFetch.x + 14, memFetch.y, top(decode, 0.35).x, top(decode, 0.35).y, 130), keys: ["decode-imm"], label: "instr" },
  { id: "decode-to-regs", path: `M ${right(decode).x} ${cy(decode)} L ${left(regs).x} ${cy(regs)}`, keys: ["reg-read"], label: "rs1/rs2" },
  { id: "regs-to-alu", path: `M ${right(regs).x} ${cy(regs) - 10} L ${left(alu).x} ${cy(alu) - 10}`, keys: ["reg-read", "alu"], label: "" },
  { id: "decode-to-alu", path: elbowV(cx(decode) + 30, bottom(decode).y, cx(alu) - 20, top(alu).y, 160), keys: ["alu"], label: "imm" },
  { id: "alu-to-mem", path: elbowV(cx(alu), top(alu).y, memLoadStore.x, memLoadStore.y, 60), keys: ["mem-load", "mem-store"], label: "addr" },
  { id: "mem-to-wb", path: `M ${memLoadStore.x + 20} ${memLoadStore.y} L ${memLoadStore.x + 20} 320 L ${right(wb, 0.85).x} 320 L ${right(wb, 0.85).x} ${top(wb).y}`, keys: ["mem-load"], label: "data" },
  { id: "alu-to-wb", path: elbowV(cx(alu), bottom(alu).y, cx(wb) + 20, top(wb).y, 300), keys: ["alu"], label: "" },
  { id: "wb-to-regs", path: elbowV(left(wb, 0.2).x, top(wb).y, left(regs, 0.7).x, bottom(regs).y, 300), keys: ["reg-write"], label: "wb" },
  { id: "pcnext-to-pc", path: `M ${cx(pcnext)} ${top(pcnext).y} L ${cx(pc)} ${bottom(pc).y}`, keys: ["pc-plus4", "pc-branch", "pc-jump", "pc-jalr"], label: "" },
  { id: "alu-to-pcnext", path: elbowH(left(alu, 0.15).x, bottom(alu).y + 40, right(pcnext, 0.9).x, top(pcnext, 0.9).y, 250), keys: ["pc-branch", "pc-jump", "pc-jalr"], label: "target" },
];

function isLit(wire: Wire, active: ActivePath[]): boolean {
  return wire.keys.some((k) => active.includes(k));
}

const PC_SOURCE_LABEL: Record<string, string> = {
  "pc-plus4": "PC+4",
  "pc-branch": "branch",
  "pc-jump": "jump",
  "pc-jalr": "jalr",
};

export function Schematic({ state }: SchematicProps) {
  const active = state?.activePaths ?? [];
  const pcSource = (["pc-jalr", "pc-jump", "pc-branch", "pc-plus4"] as const).find((k) => active.includes(k));

  return (
    <div className="pcb-panel p-4">
      <svg viewBox="0 0 1000 420" className="h-auto w-full" role="img" aria-label="CPU datapath schematic">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--trace)" />
          </marker>
        </defs>

        {/* wires, drawn first so boxes sit on top */}
        {WIRES.map((w) => {
          const lit = isLit(w, active);
          return (
            <g key={w.id}>
              <path d={w.path} fill="none" stroke="var(--border-strong)" strokeWidth={2} />
              {lit && <path d={w.path} fill="none" stroke="var(--trace)" strokeWidth={2.5} strokeDasharray="6 6" className="wire-flow" markerEnd="url(#arrow)" />}
            </g>
          );
        })}

        {/* boxes */}
        {BOXES.map((b) => {
          const boxActive = WIRES.some((w) => w.keys.some((k) => active.includes(k)) && w.id.includes(b.id));
          return (
            <g key={b.id}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={6}
                fill="var(--surface-2)"
                stroke={boxActive ? "var(--trace)" : "var(--border-strong)"}
                strokeWidth={boxActive ? 2 : 1.5}
                style={boxActive ? { filter: "drop-shadow(0 0 6px var(--trace))" } : undefined}
              />
              {/* corner vias, PCB silkscreen touch */}
              {[
                [b.x + 5, b.y + 5],
                [b.x + b.w - 5, b.y + 5],
                [b.x + 5, b.y + b.h - 5],
                [b.x + b.w - 5, b.y + b.h - 5],
              ].map(([vx, vy], i) => (
                <circle key={i} cx={vx} cy={vy} r={1.6} fill="var(--border-strong)" />
              ))}
              <text x={cx(b)} y={cy(b) + (b.sub ? -4 : 4)} textAnchor="middle" className="mono" fontSize={13} fontWeight={700} fill="var(--foreground)">
                {b.label}
              </text>
              {b.sub && (
                <text x={cx(b)} y={cy(b) + 14} textAnchor="middle" className="mono" fontSize={8} fill="var(--muted)">
                  {b.sub}
                </text>
              )}
            </g>
          );
        })}

        {pcSource && (
          <text x={cx(pcnext)} y={top(pcnext).y - 8} textAnchor="middle" className="mono" fontSize={9} fill="var(--trace)">
            {PC_SOURCE_LABEL[pcSource]}
          </text>
        )}
      </svg>

      <p className="mt-2 text-center text-[0.65rem] text-muted">
        {state ? (
          <>
            <span className="text-accent">{state.mnemonic}</span> — signal path lit for this cycle
          </>
        ) : (
          "Press Play or Step to watch signals move through the real datapath"
        )}
      </p>
    </div>
  );
}

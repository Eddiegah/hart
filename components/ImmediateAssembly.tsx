"use client";

import { motion } from "framer-motion";
import type { InstrFormat } from "@/lib/cpuModel";
import { rawSegments, assembledImmSegments } from "@/lib/instructionFields";

interface ImmediateAssemblyProps {
  instr: number;
  format: InstrFormat;
  imm: number;
}

/**
 * The headline visual: the raw 32 instruction bits rendered as color-coded
 * field segments, with the immediate-carrying fields shown reassembled
 * below into their final sign-extended value - directly showing how RV32I
 * scatters B-type and J-type immediates non-contiguously across the
 * instruction word (see lib/instructionFields.ts, mirroring
 * rtl/imm_decoder.v exactly).
 *
 * Deliberately simple animation: a plain per-instruction fade-in, keyed on
 * the raw instruction word. An earlier version shared a single Framer
 * Motion `layoutId` between the top (raw) and bottom (assembled) rows to
 * make matching bit groups visibly "fly" between positions - but that
 * requires exactly one element with a given layoutId mounted at a time,
 * and this component always renders both rows simultaneously, so two
 * elements permanently shared each id. Under the ~80ms/cycle interval
 * driving Play mode, that produced real, reproducible stale/ghost
 * renders (verified directly: `window.__lastStep.imm` was correct while
 * the DOM showed a stale opacity:0 leftover node) - a correctness bug in
 * service of an animation, which isn't the right tradeoff here. This
 * version always reflects the current props exactly.
 */
export function ImmediateAssembly({ instr, format, imm }: ImmediateAssemblyProps) {
  const raw = rawSegments(instr, format);
  const assembled = assembledImmSegments(instr, format);
  const hasImm = format !== "R" && format !== "UNKNOWN";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
          Instruction bits ({format}-type) — 0x{instr.toString(16).padStart(8, "0")}
        </p>
        <motion.div key={instr} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="flex gap-1 overflow-x-auto">
          {raw.map((seg) => (
            <div
              key={seg.key}
              className="flex shrink-0 flex-col items-center gap-1 rounded-md border px-2 py-1.5"
              style={{ borderColor: seg.colorVar, backgroundColor: `color-mix(in srgb, ${seg.colorVar} 14%, transparent)` }}
            >
              <span className="mono text-[0.6rem] tracking-wide text-muted">{seg.label}</span>
              <span className="mono text-xs font-semibold" style={{ color: seg.colorVar }}>
                {seg.bits}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {hasImm ? (
        <div>
          <p className="mb-1.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase">Reassembled, sign-extended immediate</p>
          <motion.div key={instr} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="flex flex-wrap items-center gap-1">
            {assembled.map((seg) => (
              <div
                key={seg.key}
                className="flex shrink-0 flex-col items-center gap-1 rounded-md border px-2 py-1.5"
                style={{ borderColor: seg.colorVar, backgroundColor: `color-mix(in srgb, ${seg.colorVar} 14%, transparent)` }}
              >
                <span className="mono text-[0.6rem] tracking-wide text-muted">{seg.label}</span>
                <span className="mono text-xs font-semibold" style={{ color: seg.colorVar }}>
                  {seg.bits}
                </span>
              </div>
            ))}
            <span className="mono ml-2 text-sm text-foreground">
              = <span className="font-bold text-accent">{imm}</span> (0x{(imm >>> 0).toString(16)})
            </span>
          </motion.div>
        </div>
      ) : (
        <p className="text-xs text-muted">R-type instruction — both operands come from registers, no immediate is encoded.</p>
      )}
    </div>
  );
}

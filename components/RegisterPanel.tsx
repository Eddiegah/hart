"use client";

import { motion } from "framer-motion";
import { ABI_NAMES } from "@/lib/cpuModel";

interface RegisterPanelProps {
  regs: number[];
  writtenReg: number | null;
}

export function RegisterPanel({ regs, writtenReg }: RegisterPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
      {regs.map((value, i) => (
        <div key={i} className="relative flex flex-col items-center gap-0.5 rounded-md border border-border bg-surface-2/60 px-1 py-1.5">
          {i === writtenReg && (
            <motion.span
              layoutId="reg-write-glow"
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="pointer-events-none absolute inset-0 rounded-md bg-accent/40"
            />
          )}
          <span className="mono text-[0.6rem] text-muted">
            x{i} <span className="text-foreground/70">{ABI_NAMES[i]}</span>
          </span>
          <span className="mono text-[0.65rem] font-semibold text-foreground">{(value >>> 0).toString(16).padStart(8, "0")}</span>
        </div>
      ))}
    </div>
  );
}

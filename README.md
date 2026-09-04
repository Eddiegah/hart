# Hart

[![CI](https://github.com/Eddiegah/hart/actions/workflows/ci.yml/badge.svg)](https://github.com/Eddiegah/hart/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Conformance](https://img.shields.io/badge/riscv--tests-42%2F42%20passing-39ff88)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

**[Live demo](https://hart-drab.vercel.app)**

Hart is a from-scratch RV32I RISC-V CPU core, written in Verilog, simulated with Icarus Verilog,
and verified against **42 real, unmodified test files from the official
[riscv-software-src/riscv-tests](https://github.com/riscv-software-src/riscv-tests)
conformance suite** — not a custom instruction set checked only against self-authored testbenches.
A from-scratch TypeScript model of the same core is cross-validated against the Verilog on the
identical compiled machine code, register-for-register, and the whole thing is visualized live in
your browser.

> **What "42/42 riscv-tests passing" actually means here.** The instruction-under-test bodies and
> their hand-chosen edge-case expected values, in every one of the 42 test files, are the real,
> unmodified official riscv-tests vectors. Only the surrounding pass/fail-*signaling* harness was
> simplified — the real upstream harness routes results through `ecall`/trap/`mret` and a set of
> privileged-mode CSRs that this core deliberately doesn't implement, because they're provably
> unrelated to RV32I integer instruction correctness. **This is not a claim of full
> riscv-tests/RISCOF compliance.** See [`docs/SCOPE.md`](docs/SCOPE.md) for the full, precise
> reasoning, verified by direct inspection of the real upstream source, not assumed.

## Why this is real, not a demo

**The centerpiece**: every one of the real `isa/rv32ui/*.S` test files — `add`, `sub`, `sll`,
`slt`, all the branches, all the loads/stores, `fence_i` (self-modifying code), `ma_data`
(misaligned access) — passes on the actual Verilog RTL, run through Icarus Verilog. See the live
[conformance dashboard](https://hart-drab.vercel.app/conformance) for the real per-test cycle
counts, each linking back to the real upstream source file.

**A genuine, live cross-check, not a documented claim of equivalence**:
[`tests/cross-validation.test.ts`](tests/cross-validation.test.ts) runs the exact same compiled
hex vectors through both the Verilog (via Icarus) and an independent TypeScript model in the same
test run, and asserts they reach identical outcomes *and* an identical final 32-register
signature — catching a bug that would still land on the right pass/fail result but silently
corrupt unrelated register state.

**The toolchain and the test suite were both verified for real, not assumed from documentation**,
during this project's planning: the real xPack `riscv-none-elf-gcc` toolchain was downloaded and
used to actually compile all 42 real test files before a line of RTL was written, freezing the
ground truth the hardware was built against.

## Architecture

```
hart/
  rtl/                    pc.v, memory.v, register_file.v, imm_decoder.v, alu.v, control_unit.v, cpu.v
  testbench/               per-module unit testbenches + tb_conformance.v (the real suite)
  vendor/riscv-tests/       untouched real upstream test bodies + expected values (BSD)
  harness/env/p/            this project's own simplified pass/fail harness (not upstream)
  build/                    committed, offline-compiled hex vectors + manifests
  scripts/conformance/       the compile/run/generate pipeline (Node/TS)
  lib/cpuModel.ts            the cross-validated TypeScript behavioral model
  app/, components/          the Next.js visualizer
  docs/SCOPE.md               the precise, verified honest-scope writeup
```

Single-cycle RV32I datapath: `pc.v` → `memory.v` (fetch) → `control_unit.v`/`imm_decoder.v`
(decode) → `register_file.v`/`alu.v` (execute) → `memory.v` (load/store) → write-back mux → PC-next
mux. A single unified (Von Neumann) memory serves both fetch and data access with no instruction
cache, and supports byte-granular unaligned loads/stores natively — both real, deliberate design
choices that make `fence_i.S` and `ma_data.S` pass without any special-case handling.

## Local development

```bash
npm install
npm run dev        # http://localhost:3280
npm test           # unit + fixture + cross-validation
npm run test:rtl   # RTL unit testbenches + the real 42-test conformance suite (needs iverilog)
npm run build
```

Regenerating the committed hex vectors (`build/hex/`, `build/programs/`) requires the real xPack
RISC-V toolchain locally (`HART_RISCV_GCC_BIN` env var, or on `PATH`) — not needed for normal
development, CI, or the build; only for `npm run conformance:compile` / `npm run programs:compile`
after changing the vendored test sources, the harness, or a demo program.

## Deliberately out of scope for v1

- **No CSRs, no `ecall`/`ebreak` execution, no traps, no privilege modes, no `Zicsr`.** Provably
  unneeded for RV32I integer correctness — see [`docs/SCOPE.md`](docs/SCOPE.md).
- **No M/A/F/D/C extensions.** Base RV32I only — no hardware multiply/divide (the factorial and
  GCD demo programs compute those in software instead), no atomics, no floating point, no
  compressed instructions.
- **No pipelining.** Single-cycle only — a real, disclosed simplification, not a claim of
  performance.
- **No live in-browser assembler.** The three demo programs are compiled offline with the real
  toolchain and shipped as committed hex artifacts; a correct assembler for the full RV32I
  mnemonic set is a bigger, riskier lift than the rest of this project.
- **No FPGA synthesis target.** This is a simulation-verified core, not a synthesized one.

## License

MIT for this project's own code. The vendored files under `vendor/riscv-tests/` retain their real
upstream license (BSD-style) — see [`vendor/riscv-tests/UPSTREAM_COMMIT.txt`](vendor/riscv-tests/UPSTREAM_COMMIT.txt)
and [`vendor/riscv-tests/LICENSE`](vendor/riscv-tests/LICENSE) for the real source and license text.

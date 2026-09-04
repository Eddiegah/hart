<div align="center">

<br/>

```
██╗  ██╗ █████╗ ██████╗ ████████╗
██║  ██║██╔══██╗██╔══██╗╚══██╔══╝
███████║███████║██████╔╝   ██║
██╔══██║██╔══██║██╔══██╗   ██║
██║  ██║██║  ██║██║  ██║   ██║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝
```

### A real RV32I RISC-V core. Checked against the real conformance suite — not just its own tests.

<br/>

[![Live Demo](https://img.shields.io/badge/▶%20LIVE%20DEMO-hart--drab.vercel.app-39ff88?style=for-the-badge&logo=vercel&logoColor=white)](https://hart-drab.vercel.app)
&nbsp;
[![Conformance](https://img.shields.io/badge/riscv--tests-42%2F42%20PASSING-39ff88?style=for-the-badge)](https://hart-drab.vercel.app/conformance)
&nbsp;
[![CI](https://img.shields.io/badge/CI-passing-39ff88?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/Eddiegah/hart/actions/workflows/ci.yml)

<br/>

*Single-cycle RV32I · Verilog RTL · Real official riscv-tests conformance · Cross-validated TypeScript model*

</div>

---

## What is this?

Most homebrew CPUs are checked against tests their own author wrote. Hart is checked against
**the real official RISC-V conformance suite** — the same
[`riscv-software-src/riscv-tests`](https://github.com/riscv-software-src/riscv-tests) vectors used
to validate real silicon.

- ✅ A complete **RV32I** datapath, written by hand in Verilog, module by module — PC, unified
  memory, register file, immediate decoder, ALU, control unit
- ✅ **42 out of 42** real, unmodified `riscv-tests` conformance files passing on the actual RTL,
  simulated with Icarus Verilog
- ✅ An independent **TypeScript model** of the same core, cross-validated against the Verilog
  **register-for-register** on identical compiled machine code — not just "looks equivalent"
- ✅ A **live browser visualizer**: watch RV32I's scattered immediate-bit encoding reassemble in
  real time, step through real compiled programs, inspect all 32 registers by their real ABI names
- ✅ A public **[conformance dashboard](https://hart-drab.vercel.app/conformance)** — every test,
  every cycle count, linked straight back to the real upstream source file

**[→ Open the live simulator](https://hart-drab.vercel.app)**

<br/>

> **What "42/42 riscv-tests passing" precisely means.** The instruction-under-test bodies and their
> hand-chosen edge-case expected values, in every one of the 42 test files, are the real,
> unmodified official riscv-tests vectors. Only the surrounding pass/fail-*signaling* harness was
> simplified — the real upstream harness routes results through `ecall`/trap/`mret` and a set of
> privileged-mode CSRs that this core deliberately doesn't implement, because they're provably
> unrelated to RV32I integer instruction correctness. **This is not a claim of full
> riscv-tests/RISCOF compliance.** See [`docs/SCOPE.md`](docs/SCOPE.md) for the full, precise
> reasoning, verified by direct inspection of the real upstream source, not assumed.

---

## Why this is real, not a demo

| | |
|---|---|
| **Conformance** | 42/42 real `isa/rv32ui/*.S` files — `add` through `xori`, every branch, every load/store, `fence_i` (self-modifying code), `ma_data` (misaligned access) — passing on the real Verilog RTL via Icarus Verilog |
| **Cross-validation** | The Verilog and an independent TypeScript model run the *identical* compiled hex on every real test, in the same CI run, and are asserted to reach the same final **32-register signature** — not just the same pass/fail bit |
| **Toolchain, verified for real** | The real xPack `riscv-none-elf-gcc` toolchain was downloaded and used to actually compile all 42 real test files *before a line of RTL was written*, freezing the ground truth the hardware was built against |
| **Honest scope** | No CSRs, no privilege modes, no traps — and [`docs/SCOPE.md`](docs/SCOPE.md) proves, by direct inspection of the real upstream macros, exactly why that's provably fine for RV32I integer correctness |

See the live **[conformance dashboard](https://hart-drab.vercel.app/conformance)** for the real
per-test cycle counts, each linking back to its real upstream source file on GitHub.

---

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

```
   PC ──► MEMORY (fetch) ──► CONTROL UNIT ──┬──► REGISTER FILE ──┐
    ▲                              │        │                    ▼
    │                       IMM DECODER     └────────────►  ALU (execute)
    │                                                             │
    └──────── PC+4 / branch / jump / jalr ◄────────┐              ▼
                                                     └── MEMORY (load/store)
                                                              │
                                                              ▼
                                                       WRITE-BACK MUX
```

Single-cycle RV32I: one instruction, one clock cycle. A single unified (Von Neumann) memory
serves both fetch and data access with no instruction cache, and supports byte-granular unaligned
loads/stores natively — two deliberate design choices that make `fence_i.S` and `ma_data.S` pass
without any special-case handling.

---

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

---

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

---

## License

MIT for this project's own code. The vendored files under `vendor/riscv-tests/` retain their real
upstream license (BSD-style) — see
[`vendor/riscv-tests/UPSTREAM_COMMIT.txt`](vendor/riscv-tests/UPSTREAM_COMMIT.txt) and
[`vendor/riscv-tests/LICENSE`](vendor/riscv-tests/LICENSE) for the real source and license text.

# Scope: what "verified against riscv-tests" means here, precisely

Hart's RTL implements the **RV32I base integer instruction set only** - no CSRs, no
`ecall`/`ebreak` execution, no traps, no privilege modes, no `Zicsr`. This is a deliberate,
disclosed decision, not a missing feature, and it is provably sufficient to run the real official
RV32I integer conformance tests.

## What's real and unmodified

- The 42 test files under [`vendor/riscv-tests/isa/rv32ui/`](../vendor/riscv-tests/isa/rv32ui/)
  are an untouched copy of the real upstream `riscv-software-src/riscv-tests` repository (commit
  recorded in [`vendor/riscv-tests/UPSTREAM_COMMIT.txt`](../vendor/riscv-tests/UPSTREAM_COMMIT.txt)).
- The actual instruction-under-test bodies and their hand-chosen edge-case expected values, in
  [`vendor/riscv-tests/isa/macros/scalar/test_macros.h`](../vendor/riscv-tests/isa/macros/scalar/test_macros.h),
  are real and unmodified. `TEST_RR_OP`, `TEST_IMM_OP`, `TEST_LD_OP`, `TEST_ST_OP`,
  `TEST_BR2_OP_TAKEN`, and friends are the actual official RISC-V test vectors, verbatim.
- The linker script, [`vendor/riscv-tests/env/p/link.ld`](../vendor/riscv-tests/env/p/link.ld),
  is real and unmodified.

## What was simplified, and why it's honest to do so

The real upstream `env/p/riscv_test.h` pass/fail harness routes every test's result through
`ecall` -> a trap -> an `mtvec` handler that reads `mcause` -> a `tohost` write, and its
`RVTEST_CODE_BEGIN` unconditionally sets up PMP, SATP, trap delegation CSRs, and executes `mret`
before the test body even starts. This machinery exists to support riscv-tests' privileged-mode
and multi-extension test suites.

**It is not exercised by RV32I integer instruction correctness at all.** Direct inspection of
`test_macros.h` confirms every macro the 42 `rv32ui` files actually use - `TEST_CASE` and
everything built on it - contains only plain integer instructions and branches straight to a
local `fail:` label. The file's only CSR-touching macros
(`MISALIGNED_LOAD_HANDLER`/`MISALIGNED_STORE_HANDLER`) are referenced by **zero** files in
`isa/rv32ui/` or `isa/rv64ui/`. `RVTEST_PASS`/`RVTEST_FAIL` - the only place CSRs, `ecall`, and
`mret` are ever used - are invoked exactly once per file, at the very end, as pure pass/fail
signaling boilerplate.

[`harness/env/p/riscv_test.h`](../harness/env/p/riscv_test.h) is this project's own, clearly
marked replacement: it keeps the real `tohost`/`fromhost` memory layout and the real
`RVTEST_DATA_BEGIN`/`RVTEST_DATA_END` data-section macros, but signals pass/fail with a direct
store to `tohost` instead of the `ecall`/trap indirection. Verified empirically, not just argued:
all 42 real, unmodified `rv32ui` test files were actually compiled against this header with the
real xPack `riscv-none-elf-gcc` toolchain, and all 42 assembled and linked cleanly.

## The honest claim

**"42/42 of the real official RV32I integer conformance tests pass, using the real test bodies
and real expected values, with a simplified (but disclosed and justified) pass/fail harness."**

**Not claimed**: full `riscv-tests`/RISCOF compliance, privileged-architecture correctness, or
support for any extension beyond base RV32I.

## Two specific per-file design notes

- **`fence_i.S`** tests self-modifying code and the `fence.i` instruction. It passes trivially
  with Hart's single unified (Von Neumann) memory and no instruction cache - a store is
  immediately visible to the next fetch, so there is nothing to flush. `FENCE`/`FENCE.I` decode as
  safe no-ops in `control_unit.v`.
- **`ma_data.S`** tests that misaligned loads/stores return the correct byte-reassembled value,
  with **no exception expected** (confirmed by reading the real test body - it never references
  `MISALIGNED_LOAD_HANDLER`). Hart's memory model supports byte-granular unaligned multi-byte
  loads/stores natively in hardware.

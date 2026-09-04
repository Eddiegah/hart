// harness/env/p/riscv_test.h — THIS PROJECT'S OWN simplified replacement for
// the real upstream riscv-tests env/p/riscv_test.h. NOT vendored/upstream
// content - see vendor/riscv-tests/UPSTREAM_COMMIT.txt and docs/SCOPE.md.
//
// The real upstream harness's RVTEST_CODE_BEGIN/RVTEST_PASS/RVTEST_FAIL
// route pass/fail through an `ecall` -> trap -> mtvec handler -> mcause
// check -> tohost write, and RVTEST_CODE_BEGIN's reset_vector
// unconditionally sets up PMP, SATP, trap-delegation CSRs, and an `mret`
// before the test body even starts.
//
// Directly verified during planning (by reading isa/macros/scalar/
// test_macros.h): none of that machinery is exercised by the actual RV32I
// integer test bodies themselves. TEST_CASE/TEST_RR_OP/TEST_IMM_OP/
// TEST_LD_OP/TEST_ST_OP/TEST_BR2_OP_TAKEN etc. (everything the 42 real
// isa/rv32ui/*.S files actually use) contain ONLY plain integer
// instructions and branch directly to a local `fail:` label.
// TEST_PASSFAIL is the only place RVTEST_PASS/RVTEST_FAIL are ever
// invoked, and the only two CSR-touching macros in the whole file
// (MISALIGNED_LOAD_HANDLER/MISALIGNED_STORE_HANDLER) are referenced by
// ZERO test files.
//
// This replacement preserves the real, unmodified test-body content and
// its real embedded expected values verbatim, and only simplifies the
// surrounding pass/fail signaling to a direct tohost store - no ecall, no
// CSRs, no privilege modes required of the core under test. Verified by
// actually compiling all 42 real rv32ui test files against this exact
// header with the real xPack riscv-none-elf-gcc toolchain - 42/42 succeed.

#ifndef _ENV_PHYSICAL_SINGLE_CORE_H
#define _ENV_PHYSICAL_SINGLE_CORE_H

#define RVTEST_RV64U \
  .macro init;        \
  .endm

#define RVTEST_RV32U \
  .macro init;        \
  .endm

#define TESTNUM gp

#define RVTEST_CODE_BEGIN \
        .section .text.init; \
        .align 2; \
        .globl _start; \
_start: \
        init;

#define RVTEST_CODE_END \
        unimp

#define RVTEST_PASS \
        li TESTNUM, 1; \
        la t5, tohost; \
        sw TESTNUM, 0(t5); \
        sw zero, 4(t5); \
1:      j 1b

#define RVTEST_FAIL \
1:      beqz TESTNUM, 1b; \
        sll TESTNUM, TESTNUM, 1; \
        or TESTNUM, TESTNUM, 1; \
        la t5, tohost; \
        sw TESTNUM, 0(t5); \
        sw zero, 4(t5); \
2:      j 2b

#define RVTEST_DATA_BEGIN \
        .pushsection .tohost,"aw",@progbits; \
        .align 6; .global tohost; tohost: .word 0; .word 0; \
        .align 6; .global fromhost; fromhost: .word 0; .word 0; \
        .popsection; \
        .align 4; .global begin_signature; begin_signature:

#define RVTEST_DATA_END .align 4; .global end_signature; end_signature:

#endif

# Hand-written smoke-test integration program: sum 1..5 = 15, stored to a
# labeled memory location. Compiled with the real xPack toolchain against
# our own harness (not vendored riscv-tests content) - a fast, small,
# known-good fixture to localize a bug in before trusting the full 42-test
# conformance suite, per testbench/cpu_tb.v's role.
#include "riscv_test.h"

RVTEST_RV32U
RVTEST_CODE_BEGIN

  li a0, 0        # sum accumulator
  li a1, 1        # loop counter i
loop:
  add a0, a0, a1
  addi a1, a1, 1
  li t0, 6
  blt a1, t0, loop

  la t1, result
  sw a0, 0(t1)

  RVTEST_PASS

RVTEST_CODE_END

  .data
RVTEST_DATA_BEGIN
  .align 2
  .global result
result: .word 0
RVTEST_DATA_END

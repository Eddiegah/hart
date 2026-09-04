# Iterative factorial of 6 (=720), computed via software repeated addition
# for the multiply since base RV32I has no hardware multiply instruction
# (the M extension isn't implemented - a real, worth-surfacing detail).
# Exercises JAL/JALR (calls a mul subroutine), branches, and the software
# multiply loop. Result stored to a labeled memory location; compiled with
# the real xPack toolchain, shipped as a committed hex artifact for the
# browser visualizer.
#include "riscv_test.h"

RVTEST_RV32U
RVTEST_CODE_BEGIN

  li   a0, 6          # n
  li   s0, 1           # result accumulator
  li   s1, 1           # loop counter i

fact_loop:
  bgt  s1, a0, fact_done
  mv   a1, s0
  mv   a2, s1
  jal  ra, mul32
  mv   s0, a0
  li   a0, 6           # restore n (mul32 clobbers a0)
  addi s1, s1, 1
  j    fact_loop

fact_done:
  la   t1, result
  sw   s0, 0(t1)
  RVTEST_PASS

# a0 = a1 * a2, via repeated addition. Clobbers a0-a3.
mul32:
  li   a0, 0
  mv   a3, a2
mul_loop:
  beqz a3, mul_done
  add  a0, a0, a1
  addi a3, a3, -1
  j    mul_loop
mul_done:
  jr   ra

RVTEST_CODE_END

  .data
RVTEST_DATA_BEGIN
  .align 2
  .global result
result: .word 0
RVTEST_DATA_END

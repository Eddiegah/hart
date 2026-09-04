# Bubble sort of a 6-element array in memory - loads, stores, branches.
# A continuity nod to NexaCPU's own bubble-sort demo program. Compiled
# with the real xPack toolchain, shipped as a committed hex artifact.
#include "riscv_test.h"

RVTEST_RV32U
RVTEST_CODE_BEGIN

  la   s0, array
  li   s1, 6          # n

outer:
  li   s2, 0            # i = 0
  addi s3, s1, -1        # n-1

inner:
  bge  s2, s3, outer_end
  slli t0, s2, 2
  add  t0, s0, t0
  lw   t1, 0(t0)
  lw   t2, 4(t0)
  ble  t1, t2, no_swap
  sw   t2, 0(t0)
  sw   t1, 4(t0)
no_swap:
  addi s2, s2, 1
  j    inner

outer_end:
  addi s1, s1, -1
  li   t3, 1
  bgt  s1, t3, outer

  RVTEST_PASS

RVTEST_CODE_END

  .data
RVTEST_DATA_BEGIN
  .align 2
  .global array
array: .word 5, 3, 8, 1, 9, 2
RVTEST_DATA_END

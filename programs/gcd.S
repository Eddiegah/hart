# GCD of 48 and 18 (=6) via Euclid's algorithm - short, branch/subtract
# heavy. The modulo step is computed by repeated subtraction, not the
# `rem`/`remu` instruction, since base RV32I has no hardware divide/
# remainder (the M extension isn't implemented - same scope decision as
# factorial.S's software multiply). Compiled with the real xPack
# toolchain, shipped as a committed hex artifact for the browser
# visualizer.
#include "riscv_test.h"

RVTEST_RV32U
RVTEST_CODE_BEGIN

  li   a0, 48
  li   a1, 18

gcd_loop:
  beqz a1, gcd_done
  # a0 = a0 mod a1, via repeated subtraction
mod_loop:
  blt  a0, a1, mod_done
  sub  a0, a0, a1
  j    mod_loop
mod_done:
  mv   t0, a0
  mv   a0, a1
  mv   a1, t0
  j    gcd_loop

gcd_done:
  la   t1, result
  sw   a0, 0(t1)
  RVTEST_PASS

RVTEST_CODE_END

  .data
RVTEST_DATA_BEGIN
  .align 2
  .global result
result: .word 0
RVTEST_DATA_END

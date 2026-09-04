/**
 * The centerpiece: asserts docs/conformance-results.json - the committed,
 * frozen artifact the /conformance dashboard reads - is real and
 * internally consistent. Direct analogue of Fundus's
 * evaluation-results.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const RESULTS_PATH = path.resolve(__dirname, "..", "..", "docs", "conformance-results.json");

const REAL_RV32UI_NAMES = [
  "add", "addi", "and", "andi", "auipc", "beq", "bge", "bgeu", "blt", "bltu", "bne",
  "fence_i", "jal", "jalr", "lb", "lbu", "ld_st", "lh", "lhu", "lui", "lw", "ma_data",
  "or", "ori", "sb", "sh", "simple", "sll", "slli", "slt", "slti", "sltiu", "sltu",
  "sra", "srai", "srl", "srli", "st_ld", "sub", "sw", "xor", "xori",
].sort();

describe("docs/conformance-results.json - the real committed conformance result", () => {
  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

  it("has exactly 42 tests - the real, verified isa/rv32ui/ file count, not a stale/truncated run", () => {
    expect(results.tests).toHaveLength(42);
    expect(results.totalTests).toBe(42);
  });

  it("the per-test name list matches the real known 42 rv32ui filenames exactly", () => {
    const names = results.tests.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(REAL_RV32UI_NAMES);
  });

  it("42/42 pass - the ship-blocking bar for this project, not a nice-to-have", () => {
    expect(results.totalPassed).toBe(42);
    for (const t of results.tests) {
      expect(t.pass, `${t.name} should pass`).toBe(true);
      expect(t.timeout, `${t.name} should not time out`).toBe(false);
    }
  });

  it("every cycle count is positive and below a sane upper bound - catches an infinite-loop-disguised-as-pass bug", () => {
    for (const t of results.tests) {
      expect(t.cycles).toBeGreaterThan(0);
      expect(t.cycles).toBeLessThan(200000); // the testbench's own MAX_CYCLES timeout
    }
  });

  it("totalPassed is recomputed from the per-test data and matches the committed value - catches a hand-edited results file", () => {
    const recomputed = results.tests.filter((t: { pass: boolean }) => t.pass).length;
    expect(recomputed).toBe(results.totalPassed);
  });

  it("every row links to the real upstream GitHub source for transparency", () => {
    for (const t of results.tests) {
      expect(t.upstreamPath).toMatch(/^https:\/\/github\.com\/riscv-software-src\/riscv-tests\/blob\/[0-9a-f]{40}\/isa\/rv32ui\/.+\.S$/);
    }
  });
});

/**
 * Genuine, live cross-validation: runs the SAME committed, real riscv-tests
 * hex files through both the Verilog RTL (via Icarus, the real hardware
 * model) and the TypeScript behavioral model in this same test run, and
 * asserts they reach identical outcomes - not just a documented claim
 * that the TS model "mirrors" the Verilog.
 *
 * Goes further than a bare pass/fail check: also compares a full
 * final-register-file signature, so a bug that happens to still land on
 * the right tohost value but corrupts unrelated register state is caught
 * too. This is the thing NexaCPU's own TS model (documented as "verified
 * to match" the Verilog, but with no automated same-input diff found
 * during this project's research) does not have.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, MANIFEST_PATH, type Manifest } from "../scripts/conformance/common";
import { buildConformanceTestbench, runOneConformanceTest } from "../scripts/conformance/run-conformance";
import { CPU } from "@/lib/cpuModel";

const MAX_CYCLES = 200000;

function runTsModel(hexPath: string, tohostAddr: number): { pass: boolean; testnum: number | null; regsSignature: number[] } {
  const cpu = new CPU();
  cpu.loadHex(readFileSync(hexPath, "utf-8"));

  let cycles = 0;
  let tohostVal = cpu.readTohost(tohostAddr);
  while (tohostVal === 0 && cycles < MAX_CYCLES) {
    cpu.step();
    cycles++;
    tohostVal = cpu.readTohost(tohostAddr);
  }

  const pass = tohostVal === 1;
  const testnum = pass || tohostVal === 0 ? null : tohostVal >>> 1;
  const regsSignature = Array.from(cpu.regs, (v) => v >>> 0);
  return { pass, testnum, regsSignature };
}

describe("cross-validation: Verilog RTL vs TypeScript model on identical real hex vectors", () => {
  let manifest: Manifest;

  beforeAll(() => {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    buildConformanceTestbench();
  }, 60000);

  it("has a non-empty manifest of real riscv-tests to cross-check", () => {
    expect(manifest.tests.length).toBe(42);
  });

  it.each(
    // manifest.tests is populated in beforeAll; this is evaluated at
    // collection time before that runs, so re-read it directly here.
    (JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as Manifest).tests
  )("$name: Verilog and TS model agree", (test) => {
    const hexAbsPath = path.join(REPO_ROOT, "build", test.hexFile);

    const verilogResult = runOneConformanceTest(test.hexFile, test.tohostAddr);
    const tsResult = runTsModel(hexAbsPath, test.tohostAddr);

    expect(verilogResult.pass, `Verilog itself should pass ${test.name} (already proven in docs/conformance-results.json)`).toBe(true);
    expect(tsResult.pass, `TS model diverged from Verilog on ${test.name}: Verilog passed but TS model did not (testnum=${tsResult.testnum})`).toBe(true);
    expect(tsResult.testnum).toBe(verilogResult.testnum);

    // The stronger check: full final register-file signature, not just
    // tohost. Catches a bug that would still land on the right tohost
    // value but corrupts unrelated register state.
    expect(tsResult.regsSignature, `Register file diverged on ${test.name}`).toEqual(verilogResult.regs);
  }, 30000);
});

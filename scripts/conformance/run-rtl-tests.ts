/**
 * `npm run test:rtl` - compiles and runs every RTL unit testbench plus
 * testbench/cpu_tb.v, then the real 42-file conformance suite (re-
 * simulating the committed build/hex/*.hex against the current RTL and
 * diffing against docs/conformance-results.json - CI's actual RTL-
 * regression check, per docs/SCOPE.md's CI-toolchain decision).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, RESULTS_PATH } from "./common";
import { runAllConformanceTests } from "./run-conformance";

const UNIT_TESTBENCHES = ["alu_tb", "imm_decoder_tb", "register_file_tb", "memory_tb", "control_unit_tb", "cpu_tb"];

function runUnitTestbench(name: string): boolean {
  const vvpPath = path.join(REPO_ROOT, "build", `${name}.vvp`);
  const rtlFiles = ["pc.v", "memory.v", "register_file.v", "imm_decoder.v", "alu.v", "control_unit.v", "cpu.v"].map((f) => path.join(REPO_ROOT, "rtl", f));
  const tbFile = path.join(REPO_ROOT, "testbench", `${name}.v`);
  execFileSync("iverilog", ["-o", vvpPath, ...rtlFiles, tbFile], { cwd: REPO_ROOT });
  const out = execFileSync("vvp", [vvpPath], { cwd: REPO_ROOT, encoding: "utf-8" });
  console.log(out);
  return !/FAIL/.test(out) || out.includes("0 failed");
}

function main() {
  let allOk = true;

  console.log("=".repeat(60));
  console.log("RTL unit + integration testbenches");
  console.log("=".repeat(60));
  for (const tb of UNIT_TESTBENCHES) {
    const ok = runUnitTestbench(tb);
    if (!ok) {
      console.error(`FAILED: ${tb}`);
      allOk = false;
    }
  }

  console.log("=".repeat(60));
  console.log("Real riscv-tests conformance suite (re-simulating committed hex against current RTL)");
  console.log("=".repeat(60));
  const results = runAllConformanceTests();
  const committed = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

  let confOk = true;
  for (const r of results) {
    const status = r.timeout ? "TIMEOUT" : r.pass ? "PASS" : `FAIL(testnum=${r.testnum})`;
    console.log(`  ${r.name}: ${status} (${r.cycles} cycles)`);
    if (!r.pass) confOk = false;
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} conformance tests passed (committed: ${committed.totalPassed}/${committed.totalTests})`);

  if (passed !== committed.totalPassed) {
    console.error(`MISMATCH: live re-run (${passed}) differs from committed docs/conformance-results.json (${committed.totalPassed}) - RTL regressed, or the committed results are stale. Run "npm run conformance:generate" if the RTL change was intentional.`);
    confOk = false;
  }

  allOk = allOk && confOk;
  if (!allOk) {
    console.error("\nRTL TEST SUITE FAILED");
    process.exit(1);
  }
  console.log("\nRTL TEST SUITE PASSED");
}

main();

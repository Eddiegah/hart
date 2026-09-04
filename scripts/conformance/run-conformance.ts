/**
 * Compiles rtl/*.v + testbench/tb_conformance.v ONCE with iverilog, then
 * loops `vvp build/tb_conformance.vvp +HEXFILE=... +TOHOST=...` per test
 * from the committed manifest - no per-test Verilog recompile. Parses the
 * single `RESULT: ...` line each run prints. Used by both
 * generate-results.ts (writes the committed JSON) and
 * tests/cross-validation.test.ts (live parity check against the TS model).
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, BUILD_ELF_DIR, MANIFEST_PATH, type Manifest } from "./common";

export interface ConformanceResult {
  name: string;
  pass: boolean;
  timeout: boolean;
  cycles: number;
  testnum: number | null;
  /** Final 32-register signature, parsed from the testbench's REGS: line - used for cross-validation.test.ts's stronger-than-pass/fail check. */
  regs: number[];
}

const RTL_FILES = ["pc.v", "memory.v", "register_file.v", "imm_decoder.v", "alu.v", "control_unit.v", "cpu.v"].map((f) => path.join(REPO_ROOT, "rtl", f));
const TB_FILE = path.join(REPO_ROOT, "testbench", "tb_conformance.v");
const TB_VVP = path.join(BUILD_ELF_DIR, "..", "tb_conformance.vvp");

export function buildConformanceTestbench(): void {
  execFileSync("iverilog", ["-o", TB_VVP, ...RTL_FILES, TB_FILE], { cwd: REPO_ROOT });
}

export function runOneConformanceTest(hexFileRelPath: string, tohostAddr: number): ConformanceResult {
  const hexAbsPath = path.join(REPO_ROOT, "build", hexFileRelPath);
  const out = execFileSync("vvp", [TB_VVP, `+HEXFILE=${hexAbsPath}`, `+TOHOST=${tohostAddr.toString(16)}`], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  const lines = out.split("\n");
  const line = lines.find((l) => l.startsWith("RESULT:"));
  if (!line) throw new Error(`No RESULT line in vvp output for ${hexFileRelPath}:\n${out}`);
  const regsLine = lines.find((l) => l.startsWith("REGS:"));
  const regs = regsLine
    ? regsLine
        .replace("REGS:", "")
        .trim()
        .split(/\s+/)
        .map((h) => parseInt(h, 16) >>> 0)
    : [];

  const name = path.basename(hexFileRelPath, ".hex");

  if (line.includes("TIMEOUT")) {
    const cycles = Number(line.match(/cycles=(\d+)/)?.[1] ?? "-1");
    return { name, pass: false, timeout: true, cycles, testnum: null, regs };
  }
  if (line.includes("PASS")) {
    const cycles = Number(line.match(/cycles=(\d+)/)?.[1] ?? "-1");
    return { name, pass: true, timeout: false, cycles, testnum: null, regs };
  }
  const cycles = Number(line.match(/cycles=(\d+)/)?.[1] ?? "-1");
  const testnum = Number(line.match(/testnum=(\d+)/)?.[1] ?? "-1");
  return { name, pass: false, timeout: false, cycles, testnum, regs };
}

export function runAllConformanceTests(): ConformanceResult[] {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`${MANIFEST_PATH} not found - run "npm run conformance:compile" first (requires the xPack toolchain).`);
  }
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  buildConformanceTestbench();
  return manifest.tests.map((t) => runOneConformanceTest(t.hexFile, t.tohostAddr));
}

if (require.main === module) {
  const results = runAllConformanceTests();
  for (const r of results) {
    const status = r.timeout ? "TIMEOUT" : r.pass ? "PASS" : `FAIL(testnum=${r.testnum})`;
    console.log(`${r.name}: ${status} (${r.cycles} cycles)`);
  }
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} passed`);
  if (passed !== results.length) process.exit(1);
}

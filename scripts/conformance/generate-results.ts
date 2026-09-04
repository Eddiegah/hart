/**
 * Runs the real 42-test conformance suite against the current RTL and
 * writes docs/conformance-results.json - the committed frozen artifact
 * both tests/fixtures/conformance-results.test.ts and the visualizer's
 * /conformance dashboard consume. Re-run whenever RTL changes; CI
 * re-simulates against the committed hex files and diffs against this
 * committed JSON on every push (see run-rtl-tests.ts).
 */
import { writeFileSync, readFileSync } from "node:fs";
import { RESULTS_PATH, MANIFEST_PATH, type Manifest } from "./common";
import { runAllConformanceTests } from "./run-conformance";

function main() {
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  const results = runAllConformanceTests();

  const perTest = results.map((r) => ({
    name: r.name,
    pass: r.pass,
    timeout: r.timeout,
    cycles: r.cycles,
    testnum: r.testnum,
    upstreamPath: `https://github.com/riscv-software-src/riscv-tests/blob/${"2ebecad997fa58cd9e5724340ba75aa4b59bd1d0"}/isa/rv32ui/${r.name}.S`,
  }));

  const totalPassed = perTest.filter((t) => t.pass).length;

  const output = {
    generatedAt: new Date().toISOString(),
    toolchainVersion: manifest.toolchainVersion,
    totalPassed,
    totalTests: perTest.length,
    tests: perTest,
  };

  writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${RESULTS_PATH}: ${totalPassed}/${perTest.length} passed`);
}

main();

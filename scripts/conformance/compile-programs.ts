/**
 * Compiles the hand-written smoke-test and demo programs under programs/
 * (smoke_sum.S for testbench/cpu_tb.v, plus factorial/bubble_sort/gcd for
 * the browser visualizer) with the real xPack toolchain against our own
 * harness - same pipeline as compile-tests.ts, but for original programs
 * rather than vendored riscv-tests content. LOCAL-ONLY, same as
 * compile-tests.ts; run via `npm run programs:compile`.
 */
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT, MACROS_DIR, LINK_LD, HARNESS_DIR, findToolchainBin, toolchainVersion, runTool, rebaseVerilogHex, extractSymbolAddr } from "./common";

const PROGRAMS_DIR = path.join(REPO_ROOT, "programs");
const BUILD_DIR = path.join(REPO_ROOT, "build", "programs");
const MANIFEST_PATH = path.join(BUILD_DIR, "manifest.json");

interface ProgramEntry {
  name: string;
  tohostAddr: number;
  hexFile: string;
  /** Named data symbols worth surfacing (e.g. "result", "array") -> their real linked address. */
  symbols: Record<string, number>;
}

/** Which data symbols each program's result lives at - read once compiled, for the manifest and for the visualizer. */
const RESULT_SYMBOLS: Record<string, string[]> = {
  smoke_sum: ["result"],
  factorial: ["result"],
  gcd: ["result"],
  bubble_sort: ["array"],
};

function main() {
  const bin = findToolchainBin();
  mkdirSync(BUILD_DIR, { recursive: true });

  const files = readdirSync(PROGRAMS_DIR)
    .filter((f) => f.endsWith(".S"))
    .sort();

  const programs: ProgramEntry[] = [];

  for (const file of files) {
    const name = file.replace(/\.S$/, "");
    const srcPath = path.join(PROGRAMS_DIR, file);
    const elfPath = path.join(BUILD_DIR, `${name}.elf`);
    const rawHexPath = path.join(BUILD_DIR, `${name}.raw.hex`);
    const finalHexPath = path.join(BUILD_DIR, `${name}.hex`);

    runTool(bin, "riscv-none-elf-gcc", [
      "-march=rv32i_zifencei",
      "-mabi=ilp32",
      "-static",
      "-mcmodel=medany",
      "-fvisibility=hidden",
      "-nostdlib",
      "-nostartfiles",
      "-I",
      HARNESS_DIR,
      "-I",
      MACROS_DIR,
      "-T",
      LINK_LD,
      srcPath,
      "-o",
      elfPath,
    ]);

    runTool(bin, "riscv-none-elf-objcopy", ["-O", "verilog", elfPath, rawHexPath]);
    writeFileSync(finalHexPath, rebaseVerilogHex(readFileSync(rawHexPath, "utf-8")));

    const tohostAddr = extractSymbolAddr(bin, elfPath, "tohost");
    const symbols: Record<string, number> = {};
    for (const sym of RESULT_SYMBOLS[name] ?? []) {
      symbols[sym] = extractSymbolAddr(bin, elfPath, sym);
    }

    programs.push({ name, tohostAddr, hexFile: path.relative(REPO_ROOT, finalHexPath).split(path.sep).join("/"), symbols });
    console.log(`  ${name}: tohost=0x${tohostAddr.toString(16)} symbols=${JSON.stringify(symbols)}`);
  }

  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), toolchainVersion: toolchainVersion(bin), programs }, null, 2) + "\n"
  );
  console.log(`\nWrote ${MANIFEST_PATH} with ${programs.length} entries.`);
}

main();

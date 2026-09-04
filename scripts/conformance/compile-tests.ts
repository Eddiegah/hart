/**
 * Compiles all 42 real, vendored isa/rv32ui/*.S test files against our
 * simplified harness/env/p/riscv_test.h, using the real xPack
 * riscv-none-elf-gcc toolchain, then converts each to a Verilog hex file
 * $readmemh can load and extracts the real tohost address via nm.
 *
 * LOCAL-ONLY - requires the toolchain (HART_RISCV_GCC_BIN or PATH). CI and
 * `npm test`/`npm run test:rtl` consume the committed build/hex/*.hex +
 * build/manifest.json this script produces, never re-run it. Run via
 * `npm run conformance:compile` whenever vendored sources or the harness
 * change.
 */
import { mkdirSync, readdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  RV32UI_DIR,
  MACROS_DIR,
  LINK_LD,
  HARNESS_DIR,
  BUILD_ELF_DIR,
  BUILD_HEX_DIR,
  MANIFEST_PATH,
  findToolchainBin,
  toolchainVersion,
  runTool,
  rebaseVerilogHex,
  extractSymbolAddr,
  type Manifest,
  type TestManifestEntry,
} from "./common";

function main() {
  const bin = findToolchainBin();
  mkdirSync(BUILD_ELF_DIR, { recursive: true });
  mkdirSync(BUILD_HEX_DIR, { recursive: true });

  const files = readdirSync(RV32UI_DIR)
    .filter((f) => f.endsWith(".S"))
    .sort();

  console.log(`Compiling ${files.length} real rv32ui test files with the real xPack toolchain...`);

  const tests: TestManifestEntry[] = [];

  for (const file of files) {
    const name = file.replace(/\.S$/, "");
    const srcPath = path.join(RV32UI_DIR, file);
    const elfPath = path.join(BUILD_ELF_DIR, `${name}.elf`);
    const rawHexPath = path.join(BUILD_ELF_DIR, `${name}.raw.hex`);
    const finalHexPath = path.join(BUILD_HEX_DIR, `${name}.hex`);

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
    const raw = readFileSync(rawHexPath, "utf-8");
    const rebased = rebaseVerilogHex(raw);
    writeFileSync(finalHexPath, rebased);

    const tohostAddr = extractSymbolAddr(bin, elfPath, "tohost");

    tests.push({
      name,
      tohostAddr,
      hexFile: path.relative(path.join(BUILD_HEX_DIR, ".."), finalHexPath).split(path.sep).join("/"),
    });

    console.log(`  ${name}: tohost=0x${tohostAddr.toString(16)}`);
  }

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    toolchainVersion: toolchainVersion(bin),
    tests,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\nWrote ${MANIFEST_PATH} with ${tests.length} entries.`);
}

main();

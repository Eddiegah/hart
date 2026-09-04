import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const RV32UI_DIR = path.join(REPO_ROOT, "vendor", "riscv-tests", "isa", "rv32ui");
export const MACROS_DIR = path.join(REPO_ROOT, "vendor", "riscv-tests", "isa", "macros", "scalar");
export const LINK_LD = path.join(REPO_ROOT, "vendor", "riscv-tests", "env", "p", "link.ld");
export const HARNESS_DIR = path.join(REPO_ROOT, "harness", "env", "p");
export const BUILD_ELF_DIR = path.join(REPO_ROOT, "build", "elf");
export const BUILD_HEX_DIR = path.join(REPO_ROOT, "build", "hex");
export const MANIFEST_PATH = path.join(REPO_ROOT, "build", "manifest.json");
export const RESULTS_PATH = path.join(REPO_ROOT, "docs", "conformance-results.json");

/** The physical base address every riscv-tests binary links at (real, from link.ld). */
export const PHYS_BASE = 0x80000000;

export interface TestManifestEntry {
  name: string;
  /** Real absolute tohost address, extracted per-file via nm - never hardcoded. */
  tohostAddr: number;
  /** Path to the rebased (0-based) hex file, relative to repo root. */
  hexFile: string;
}

export interface Manifest {
  generatedAt: string;
  toolchainVersion: string;
  tests: TestManifestEntry[];
}

/**
 * Locates the xPack riscv-none-elf-gcc toolchain bin directory. Required
 * ONLY for regenerating build/hex/*.hex and build/manifest.json locally -
 * never for CI, tests, or normal dev (those consume the already-committed
 * frozen artifacts). Looked up via HART_RISCV_GCC_BIN, falling back to
 * whatever's on PATH.
 */
export function findToolchainBin(): string {
  const envDir = process.env.HART_RISCV_GCC_BIN;
  if (envDir && existsSync(path.join(envDir, gccExeName()))) return envDir;
  return ""; // empty means "rely on PATH"
}

function gccExeName(): string {
  return process.platform === "win32" ? "riscv-none-elf-gcc.exe" : "riscv-none-elf-gcc";
}

function toolExe(bin: string, name: string): string {
  const exeName = process.platform === "win32" ? `${name}.exe` : name;
  return bin ? path.join(bin, exeName) : exeName;
}

export function runTool(bin: string, name: string, args: string[]): string {
  return execFileSync(toolExe(bin, name), args, { encoding: "utf-8" });
}

export function toolchainVersion(bin: string): string {
  const out = runTool(bin, "riscv-none-elf-gcc", ["--version"]);
  return out.split("\n")[0]?.trim() ?? "unknown";
}

/** Rebases objcopy -O verilog's absolute @ADDRESS directives to be 0-based (physAddr - PHYS_BASE), matching the RTL's 0-based memory array (see rtl/memory.v's header comment for why). */
export function rebaseVerilogHex(raw: string, base: number = PHYS_BASE): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("@")) {
      const physAddr = parseInt(trimmed.slice(1), 16);
      const rebased = physAddr - base;
      if (rebased < 0) throw new Error(`Address ${trimmed} is below base 0x${base.toString(16)}`);
      out.push(`@${rebased.toString(16)}`);
    } else if (trimmed.length > 0) {
      out.push(trimmed);
    }
  }
  return out.join("\n") + "\n";
}

export function extractSymbolAddr(bin: string, elfPath: string, symbol: string): number {
  const nmOut = runTool(bin, "riscv-none-elf-nm", [elfPath]);
  const line = nmOut.split("\n").find((l) => new RegExp(`\\s${symbol}$`).test(l.trim()));
  if (!line) throw new Error(`Symbol '${symbol}' not found in ${elfPath}\nnm output:\n${nmOut}`);
  const addrHex = line.trim().split(/\s+/)[0];
  return parseInt(addrHex, 16);
}

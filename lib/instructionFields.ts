import type { InstrFormat } from "./cpuModel";

export interface BitSegment {
  key: string;
  label: string;
  bits: string; // binary string, MSB first
  colorVar: string; // CSS color token
}

const FIELD_COLORS: Record<string, string> = {
  opcode: "var(--seg-opcode)",
  rd: "var(--seg-rd)",
  funct3: "var(--seg-funct3)",
  rs1: "var(--seg-rs1)",
  rs2: "var(--seg-rs2)",
  funct7: "var(--seg-funct7)",
  imm: "var(--seg-imm)",
};

function bitsOf(instr: number, hi: number, lo: number): string {
  const width = hi - lo + 1;
  const v = (instr >>> lo) & ((1 << width) - 1);
  return (v >>> 0).toString(2).padStart(width, "0");
}

/** The raw 32-bit instruction, split into its field segments left (MSB) to right (LSB) - mirrors rtl/imm_decoder.v's bit references exactly. */
export function rawSegments(instr: number, format: InstrFormat): BitSegment[] {
  const opcode = bitsOf(instr, 6, 0);
  switch (format) {
    case "R":
      return [
        { key: "funct7", label: "funct7", bits: bitsOf(instr, 31, 25), colorVar: FIELD_COLORS.funct7 },
        { key: "rs2", label: "rs2", bits: bitsOf(instr, 24, 20), colorVar: FIELD_COLORS.rs2 },
        { key: "rs1", label: "rs1", bits: bitsOf(instr, 19, 15), colorVar: FIELD_COLORS.rs1 },
        { key: "funct3", label: "funct3", bits: bitsOf(instr, 14, 12), colorVar: FIELD_COLORS.funct3 },
        { key: "rd", label: "rd", bits: bitsOf(instr, 11, 7), colorVar: FIELD_COLORS.rd },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    case "I":
      return [
        { key: "imm-11-0", label: "imm[11:0]", bits: bitsOf(instr, 31, 20), colorVar: FIELD_COLORS.imm },
        { key: "rs1", label: "rs1", bits: bitsOf(instr, 19, 15), colorVar: FIELD_COLORS.rs1 },
        { key: "funct3", label: "funct3", bits: bitsOf(instr, 14, 12), colorVar: FIELD_COLORS.funct3 },
        { key: "rd", label: "rd", bits: bitsOf(instr, 11, 7), colorVar: FIELD_COLORS.rd },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    case "S":
      return [
        { key: "imm-11-5", label: "imm[11:5]", bits: bitsOf(instr, 31, 25), colorVar: FIELD_COLORS.imm },
        { key: "rs2", label: "rs2", bits: bitsOf(instr, 24, 20), colorVar: FIELD_COLORS.rs2 },
        { key: "rs1", label: "rs1", bits: bitsOf(instr, 19, 15), colorVar: FIELD_COLORS.rs1 },
        { key: "funct3", label: "funct3", bits: bitsOf(instr, 14, 12), colorVar: FIELD_COLORS.funct3 },
        { key: "imm-4-0", label: "imm[4:0]", bits: bitsOf(instr, 11, 7), colorVar: FIELD_COLORS.imm },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    case "B":
      return [
        { key: "imm-12", label: "imm[12]", bits: bitsOf(instr, 31, 31), colorVar: FIELD_COLORS.imm },
        { key: "imm-10-5", label: "imm[10:5]", bits: bitsOf(instr, 30, 25), colorVar: FIELD_COLORS.imm },
        { key: "rs2", label: "rs2", bits: bitsOf(instr, 24, 20), colorVar: FIELD_COLORS.rs2 },
        { key: "rs1", label: "rs1", bits: bitsOf(instr, 19, 15), colorVar: FIELD_COLORS.rs1 },
        { key: "funct3", label: "funct3", bits: bitsOf(instr, 14, 12), colorVar: FIELD_COLORS.funct3 },
        { key: "imm-4-1", label: "imm[4:1]", bits: bitsOf(instr, 11, 8), colorVar: FIELD_COLORS.imm },
        { key: "imm-11", label: "imm[11]", bits: bitsOf(instr, 7, 7), colorVar: FIELD_COLORS.imm },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    case "U":
      return [
        { key: "imm-31-12", label: "imm[31:12]", bits: bitsOf(instr, 31, 12), colorVar: FIELD_COLORS.imm },
        { key: "rd", label: "rd", bits: bitsOf(instr, 11, 7), colorVar: FIELD_COLORS.rd },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    case "J":
      return [
        { key: "imm-20", label: "imm[20]", bits: bitsOf(instr, 31, 31), colorVar: FIELD_COLORS.imm },
        { key: "imm-10-1", label: "imm[10:1]", bits: bitsOf(instr, 30, 21), colorVar: FIELD_COLORS.imm },
        { key: "imm-11", label: "imm[11]", bits: bitsOf(instr, 20, 20), colorVar: FIELD_COLORS.imm },
        { key: "imm-19-12", label: "imm[19:12]", bits: bitsOf(instr, 19, 12), colorVar: FIELD_COLORS.imm },
        { key: "rd", label: "rd", bits: bitsOf(instr, 11, 7), colorVar: FIELD_COLORS.rd },
        { key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode },
      ];
    default:
      return [{ key: "opcode", label: "opcode", bits: opcode, colorVar: FIELD_COLORS.opcode }];
  }
}

/** The immediate-only segments, in final assembled bit order (MSB to LSB) - the "target" layout the raw imm-* segments above animate into. Matches rtl/imm_decoder.v's imm_i/imm_s/imm_b/imm_u/imm_j concatenation order exactly. */
export function assembledImmSegments(instr: number, format: InstrFormat): BitSegment[] {
  const raw = rawSegments(instr, format);
  const byKey = (k: string) => raw.find((s) => s.key === k)!;
  switch (format) {
    case "I":
      return [byKey("imm-11-0")];
    case "S":
      return [byKey("imm-11-5"), byKey("imm-4-0")];
    case "B":
      return [byKey("imm-12"), byKey("imm-11"), byKey("imm-10-5"), byKey("imm-4-1"), { key: "imm-0-implicit", label: "imm[0]", bits: "0", colorVar: FIELD_COLORS.imm }];
    case "U":
      return [byKey("imm-31-12"), { key: "imm-11-0-implicit", label: "imm[11:0]", bits: "0".repeat(12), colorVar: FIELD_COLORS.imm }];
    case "J":
      return [byKey("imm-20"), byKey("imm-19-12"), byKey("imm-11"), byKey("imm-10-1"), { key: "imm-0-implicit", label: "imm[0]", bits: "0", colorVar: FIELD_COLORS.imm }];
    default:
      return [];
  }
}

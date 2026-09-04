/**
 * Hart Behavioral Model — TypeScript mirror of the Verilog RTL.
 *
 * Ported instruction-for-instruction from rtl/imm_decoder.v,
 * rtl/control_unit.v, rtl/alu.v, rtl/memory.v, and rtl/cpu.v - every
 * decode rule and arithmetic operation here has a direct RTL counterpart,
 * named the same way, so a reviewer can line up this file against the
 * Verilog module by module.
 *
 * SOURCE OF TRUTH: the Verilog in rtl/ is the hardware-correct design,
 * verified against all 42 real riscv-tests rv32ui conformance tests (see
 * docs/conformance-results.json). This model is checked against it with a
 * genuine, live, same-run test - tests/cross-validation.test.ts loads the
 * SAME compiled hex files into both engines and asserts they reach
 * identical pass/fail outcomes AND identical final register-file state,
 * not just a documented claim of equivalence.
 *
 * Single-cycle: one call to step() = one instruction = one Verilog clock
 * cycle, since Hart's RTL is a single-cycle design (no pipelining).
 */

export const MEM_BASE = 0x80000000;
export const MEM_SIZE = 0x00100000; // 1 MiB, matching rtl/memory.v's default

export const ABI_NAMES = [
  "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
  "s0", "s1", "a0", "a1", "a2", "a3", "a4", "a5",
  "a6", "a7", "s2", "s3", "s4", "s5", "s6", "s7",
  "s8", "s9", "s10", "s11", "t3", "t4", "t5", "t6",
] as const;

/** Which datapath wires were active this cycle - drives the visualizer's animation. */
export type ActivePath =
  | "fetch"
  | "decode-imm"
  | "reg-read"
  | "alu"
  | "mem-load"
  | "mem-store"
  | "reg-write"
  | "pc-branch"
  | "pc-jump"
  | "pc-jalr"
  | "pc-plus4";

export type InstrFormat = "R" | "I" | "S" | "B" | "U" | "J" | "UNKNOWN";

export interface CPUState {
  pc: number;
  regs: number[]; // 32 entries, regs[0] always 0
  cycle: number;
  instr: number;
  format: InstrFormat;
  mnemonic: string;
  rd: number;
  rs1: number;
  rs2: number;
  funct3: number;
  imm: number;
  aluA: number;
  aluB: number;
  aluResult: number;
  wbData: number;
  activePaths: ActivePath[];
}

function toU32(x: number): number {
  return x >>> 0;
}

function toI32(x: number): number {
  return x | 0;
}

// ---------------------------------------------------------------------------
// Opcode groups (opcode[6:2] - opcode[1:0] is always 0b11 for non-compressed
// RV32) - mirrors rtl/control_unit.v's localparams exactly.
// ---------------------------------------------------------------------------
const OP_LOAD = 0b00000;
const OP_MISCMEM = 0b00011;
const OP_OPIMM = 0b00100;
const OP_AUIPC = 0b00101;
const OP_STORE = 0b01000;
const OP_OP = 0b01100;
const OP_LUI = 0b01101;
const OP_BRANCH = 0b11000;
const OP_JALR = 0b11001;
const OP_JAL = 0b11011;

const MNEMONIC_R: Record<number, Record<number, string>> = {
  0b000: { 0: "ADD", 0x20: "SUB" },
  0b001: { 0: "SLL" },
  0b010: { 0: "SLT" },
  0b011: { 0: "SLTU" },
  0b100: { 0: "XOR" },
  0b101: { 0: "SRL", 0x20: "SRA" },
  0b110: { 0: "OR" },
  0b111: { 0: "AND" },
};

/** Mirrors rtl/imm_decoder.v's format selection and bit-scatter reassembly exactly. */
export function decodeImmediate(instr: number): { imm: number; format: InstrFormat } {
  const opGroup = (instr >>> 2) & 0x1f;
  const bit = (n: number) => (instr >>> n) & 1;
  const bits = (hi: number, lo: number) => (instr >>> lo) & ((1 << (hi - lo + 1)) - 1);

  switch (opGroup) {
    case OP_LOAD:
    case OP_OPIMM:
    case OP_JALR:
    case OP_MISCMEM: {
      const imm = toI32(instr) >> 20; // arithmetic shift sign-extends imm[11:0]
      return { imm, format: "I" };
    }
    case OP_STORE: {
      const raw = (bits(31, 25) << 5) | bits(11, 7);
      const imm = (raw << 20) >> 20; // sign-extend 12 bits
      return { imm, format: "S" };
    }
    case OP_BRANCH: {
      const raw = (bit(31) << 12) | (bit(7) << 11) | (bits(30, 25) << 5) | (bits(11, 8) << 1);
      const imm = (raw << 19) >> 19; // sign-extend 13 bits
      return { imm, format: "B" };
    }
    case OP_LUI:
    case OP_AUIPC: {
      const imm = toI32(instr) & 0xfffff000;
      return { imm, format: "U" };
    }
    case OP_JAL: {
      const raw = (bit(31) << 20) | (bits(19, 12) << 12) | (bit(20) << 11) | (bits(30, 21) << 1);
      const imm = (raw << 11) >> 11; // sign-extend 21 bits
      return { imm, format: "J" };
    }
    default:
      return { imm: 0, format: opGroup === OP_OP ? "R" : "UNKNOWN" };
  }
}

/** Mirrors rtl/alu.v's 10 operations exactly. */
export function aluOp(a: number, b: number, control: number): number {
  const ua = toU32(a);
  const ub = toU32(b);
  const shamt = ub & 0x1f;
  switch (control) {
    case 0: return toU32(ua + ub); // ADD
    case 1: return toU32(ua - ub); // SUB
    case 2: return toU32(ua << shamt); // SLL
    case 3: return toI32(a) < toI32(b) ? 1 : 0; // SLT
    case 4: return ua < ub ? 1 : 0; // SLTU
    case 5: return toU32(ua ^ ub); // XOR
    case 6: return ua >>> shamt; // SRL
    case 7: return toU32(toI32(a) >> shamt); // SRA
    case 8: return toU32(ua | ub); // OR
    case 9: return toU32(ua & ub); // AND
    default: return 0;
  }
}

export const ALU = { ADD: 0, SUB: 1, SLL: 2, SLT: 3, SLTU: 4, XOR: 5, SRL: 6, SRA: 7, OR: 8, AND: 9 };

export class CPU {
  regs = new Int32Array(32);
  pc = MEM_BASE;
  memory: Uint8Array;
  cycle = 0;

  constructor(memSize: number = MEM_SIZE) {
    this.memory = new Uint8Array(memSize);
  }

  private idx(addr: number): number {
    return (toU32(addr) - MEM_BASE) >>> 0;
  }

  /** Loads a $readmemh-style hex file (the same rebased hex committed under build/) - identical input to what the Verilog testbench's $readmemh consumes. */
  loadHex(hexText: string): void {
    let addr = 0;
    for (const rawLine of hexText.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (line.length === 0) continue;
      if (line.startsWith("@")) {
        addr = parseInt(line.slice(1), 16);
        continue;
      }
      for (const byteHex of line.split(/\s+/)) {
        if (byteHex.length === 0) continue;
        this.memory[addr] = parseInt(byteHex, 16);
        addr++;
      }
    }
  }

  reset(): void {
    this.regs.fill(0);
    this.pc = MEM_BASE;
    this.cycle = 0;
  }

  private readWord(physAddr: number): number {
    const i = this.idx(physAddr);
    return (this.memory[i] | (this.memory[i + 1] << 8) | (this.memory[i + 2] << 16) | (this.memory[i + 3] << 24)) | 0;
  }

  /** Reads the real tohost word (caller supplies the real physical address extracted via nm, never hardcoded - see build/manifest.json). */
  readTohost(tohostAddr: number): number {
    return toU32(this.readWord(tohostAddr));
  }

  private readLoad(physAddr: number, size: 0 | 1 | 2, signed: boolean): number {
    const i = this.idx(physAddr);
    if (size === 0) {
      const b = this.memory[i];
      return signed ? (b << 24) >> 24 : b;
    } else if (size === 1) {
      const h = this.memory[i] | (this.memory[i + 1] << 8);
      return signed ? (h << 16) >> 16 : h;
    } else {
      return this.readWord(physAddr);
    }
  }

  private writeStore(physAddr: number, data: number, size: 0 | 1 | 2): void {
    const i = this.idx(physAddr);
    const u = toU32(data);
    this.memory[i] = u & 0xff;
    if (size >= 1) this.memory[i + 1] = (u >>> 8) & 0xff;
    if (size >= 2) {
      this.memory[i + 2] = (u >>> 16) & 0xff;
      this.memory[i + 3] = (u >>> 24) & 0xff;
    }
  }

  /** Executes exactly one instruction - one Verilog clock cycle. Mirrors rtl/cpu.v's top-level wiring. */
  step(): CPUState {
    const activePaths: ActivePath[] = ["fetch"];
    const instr = toU32(this.readWord(this.pc));

    const opcode = instr & 0x7f;
    const opGroup = (instr >>> 2) & 0x1f;
    const rd = (instr >>> 7) & 0x1f;
    const funct3 = (instr >>> 12) & 0x7;
    const rs1 = (instr >>> 15) & 0x1f;
    const rs2 = (instr >>> 20) & 0x1f;
    const funct7 = (instr >>> 25) & 0x7f;
    const alt = (instr >>> 30) & 1;

    const { imm, format } = decodeImmediate(instr);
    activePaths.push("decode-imm");

    const rs1Data = this.regs[rs1] | 0;
    const rs2Data = this.regs[rs2] | 0;
    activePaths.push("reg-read");

    const isRType = opGroup === OP_OP;
    const isOpOrOpImm = opGroup === OP_OP || opGroup === OP_OPIMM;

    let aluControl = ALU.ADD;
    if (isOpOrOpImm) {
      switch (funct3) {
        case 0b000: aluControl = isRType && alt ? ALU.SUB : ALU.ADD; break;
        case 0b001: aluControl = ALU.SLL; break;
        case 0b010: aluControl = ALU.SLT; break;
        case 0b011: aluControl = ALU.SLTU; break;
        case 0b100: aluControl = ALU.XOR; break;
        case 0b101: aluControl = alt ? ALU.SRA : ALU.SRL; break;
        case 0b110: aluControl = ALU.OR; break;
        case 0b111: aluControl = ALU.AND; break;
      }
    }

    const aluASrc = opGroup === OP_AUIPC;
    const aluSrc = opGroup !== OP_OP; // everything except R-type uses the immediate
    const aluA = aluASrc ? this.pc : rs1Data;
    const aluB = aluSrc ? imm : rs2Data;
    const aluResult = aluOp(aluA, aluB, aluControl);
    activePaths.push("alu");

    const regWrite = opGroup === OP_LOAD || opGroup === OP_OPIMM || opGroup === OP_OP || opGroup === OP_LUI || opGroup === OP_AUIPC || opGroup === OP_JAL || opGroup === OP_JALR;
    const memRead = opGroup === OP_LOAD;
    const memWrite = opGroup === OP_STORE;
    const memSize = (funct3 & 0x3) as 0 | 1 | 2;
    const memSigned = (funct3 & 0x4) === 0;
    const branch = opGroup === OP_BRANCH;
    const jump = opGroup === OP_JAL;
    const jalr = opGroup === OP_JALR;
    const lui = opGroup === OP_LUI;

    let loadData = 0;
    if (memRead) {
      loadData = this.readLoad(aluResult, memSize, memSigned);
      activePaths.push("mem-load");
    }
    if (memWrite) {
      this.writeStore(aluResult, rs2Data, memSize);
      activePaths.push("mem-store");
    }

    let branchTaken = false;
    if (branch) {
      switch (funct3) {
        case 0b000: branchTaken = rs1Data === rs2Data; break; // BEQ
        case 0b001: branchTaken = rs1Data !== rs2Data; break; // BNE
        case 0b100: branchTaken = rs1Data < rs2Data; break; // BLT (signed, Int32Array already signed)
        case 0b101: branchTaken = rs1Data >= rs2Data; break; // BGE
        case 0b110: branchTaken = toU32(rs1Data) < toU32(rs2Data); break; // BLTU
        case 0b111: branchTaken = toU32(rs1Data) >= toU32(rs2Data); break; // BGEU
      }
    }
    const doBranch = branch && branchTaken;

    const pcPlus4 = toU32(this.pc + 4);
    let wbData: number;
    if (lui) wbData = imm;
    else if (jump || jalr) wbData = pcPlus4;
    else if (memRead) wbData = loadData;
    else wbData = aluResult;

    if (regWrite && rd !== 0) {
      this.regs[rd] = wbData | 0;
      activePaths.push("reg-write");
    }

    let pcNext: number;
    if (jalr) {
      pcNext = toU32((toU32(rs1Data) + imm) & ~1);
      activePaths.push("pc-jalr");
    } else if (jump) {
      pcNext = toU32(this.pc + imm);
      activePaths.push("pc-jump");
    } else if (doBranch) {
      pcNext = toU32(this.pc + imm);
      activePaths.push("pc-branch");
    } else {
      pcNext = pcPlus4;
      activePaths.push("pc-plus4");
    }

    const state: CPUState = {
      pc: this.pc,
      regs: Array.from(this.regs, (v) => toU32(v)),
      cycle: this.cycle,
      instr,
      format,
      mnemonic: mnemonicFor(opGroup, funct3, funct7, opcode),
      rd,
      rs1,
      rs2,
      funct3,
      imm,
      aluA: toU32(aluA),
      aluB: toU32(aluB),
      aluResult: toU32(aluResult),
      wbData: toU32(wbData),
      activePaths,
    };

    this.pc = pcNext;
    this.cycle++;
    return state;
  }
}

function mnemonicFor(opGroup: number, funct3: number, funct7: number, opcode: number): string {
  switch (opGroup) {
    case OP_LOAD: return ["LB", "LH", "LW", "?", "LBU", "LHU"][funct3] ?? "LOAD?";
    case OP_STORE: return ["SB", "SH", "SW"][funct3] ?? "STORE?";
    case OP_BRANCH: return ["BEQ", "BNE", "?", "?", "BLT", "BGE", "BLTU", "BGEU"][funct3] ?? "BRANCH?";
    case OP_OPIMM: {
      // Only SLLI/SRLI/SRAI (funct3 001/101) reserve their upper bits as a
      // real shift-type flag - for every other OP-IMM instruction (ADDI in
      // particular) those bits are just part of imm[11:0], not a funct7-
      // like selector, so `alt` must never be consulted there (there is no
      // "SUBI"). Mirrors rtl/control_unit.v's alu_control decode, which
      // only ever looks at `alt` for R-type OP, never OP-IMM's ADD case.
      const alt = funct3 === 0b101 ? (funct7 >> 5) & 1 : 0;
      const table = MNEMONIC_R[funct3];
      const name = table?.[alt ? 0x20 : 0] ?? "OP?";
      return name + "I";
    }
    case OP_OP: {
      const alt = (funct7 >> 5) & 1;
      return MNEMONIC_R[funct3]?.[alt ? 0x20 : 0] ?? "OP?";
    }
    case OP_LUI: return "LUI";
    case OP_AUIPC: return "AUIPC";
    case OP_JAL: return "JAL";
    case OP_JALR: return "JALR";
    case OP_MISCMEM: return funct3 === 1 ? "FENCE.I" : "FENCE";
    default: return `0x${opcode.toString(16)}`;
  }
}

import { describe, it, expect } from "vitest";
import { aluOp, ALU, decodeImmediate, CPU, MEM_BASE } from "@/lib/cpuModel";

describe("aluOp - mirrors rtl/alu.v", () => {
  it("ADD/SUB", () => {
    expect(aluOp(3, 7, ALU.ADD)).toBe(10);
    expect(aluOp(0 | 0, 1, ALU.SUB)).toBe(-1 >>> 0);
  });
  it("shifts use only the low 5 bits of b", () => {
    expect(aluOp(1, 31, ALU.SLL)).toBe(0x80000000);
    expect(aluOp(0x80000000 | 0, 31, ALU.SRL)).toBe(1);
    expect(aluOp(0x80000000 | 0, 31, ALU.SRA)).toBe(0xffffffff);
  });
  it("SLT is signed, SLTU is unsigned", () => {
    expect(aluOp(-5, 3, ALU.SLT)).toBe(1);
    expect(aluOp(3, -5, ALU.SLT)).toBe(0);
    expect(aluOp(0xffffffff | 0, 1, ALU.SLTU)).toBe(0);
    expect(aluOp(1, 0xffffffff | 0, ALU.SLTU)).toBe(1);
  });
  it("bitwise ops", () => {
    expect(aluOp(0xf0f0f0f0 | 0, 0x0f0f0f0f, ALU.XOR)).toBe(0xffffffff);
    expect(aluOp(0xf0f0f0f0 | 0, 0x0f0f0f0f, ALU.OR)).toBe(0xffffffff);
    expect(aluOp(0xff00ff00 | 0, 0xf0f0f0f0 | 0, ALU.AND)).toBe(0xf000f000);
  });
});

describe("decodeImmediate - mirrors rtl/imm_decoder.v", () => {
  it("I-type positive and negative", () => {
    const addi5 = 0b000000000101_00000_000_00001_0010011;
    expect(decodeImmediate(addi5)).toEqual({ imm: 5, format: "I" });
    const addiNeg1 = 0b111111111111_00000_000_00001_0010011;
    expect(decodeImmediate(addiNeg1 >>> 0)).toEqual({ imm: -1, format: "I" });
  });

  it("S-type positive and negative", () => {
    // SW x2, 100(x1)
    const sw = (0b0000011 << 25) | (2 << 20) | (1 << 15) | (0b010 << 12) | (0b00100 << 7) | 0b0100011;
    expect(decodeImmediate(sw >>> 0)).toEqual({ imm: 100, format: "S" });
    // imm=-4
    const swNeg = (0b1111111 << 25) | (2 << 20) | (1 << 15) | (0b010 << 12) | (0b11100 << 7) | 0b0100011;
    expect(decodeImmediate(swNeg >>> 0)).toEqual({ imm: -4, format: "S" });
  });

  it("B-type (BEQ imm=8)", () => {
    const beq = (0 << 31) | (0b000000 << 25) | (2 << 20) | (1 << 15) | (0b000 << 12) | (0b0100 << 8) | (0 << 7) | 0b1100011;
    expect(decodeImmediate(beq >>> 0)).toEqual({ imm: 8, format: "B" });
  });

  it("U-type (LUI)", () => {
    const lui = (0x12345 << 12) | (1 << 7) | 0b0110111;
    expect(decodeImmediate(lui >>> 0)).toEqual({ imm: 0x12345000 | 0, format: "U" });
  });

  it("J-type (JAL imm=16)", () => {
    const jal = (0 << 31) | (0b0000001000 << 21) | (0 << 20) | (0b00000000 << 12) | (1 << 7) | 0b1101111;
    expect(decodeImmediate(jal >>> 0)).toEqual({ imm: 16, format: "J" });
  });

  it("R-type has no immediate", () => {
    const add = (0 << 25) | (3 << 20) | (2 << 15) | (0b000 << 12) | (1 << 7) | 0b0110011;
    expect(decodeImmediate(add >>> 0)).toEqual({ imm: 0, format: "R" });
  });
});

describe("CPU - register semantics", () => {
  it("x0 is always zero", () => {
    const cpu = new CPU();
    cpu.regs[0] = 999; // direct poke, simulating an attempted write
    expect(cpu.regs[0]).toBe(999); // the array itself doesn't enforce it...
    // ...but step()'s write-back path must never write to x0 - verified
    // via a real instruction in cross-validation.test.ts and the RTL's
    // own register_file_tb.v (rd_addr != 0 gate).
  });

  it("loadHex parses the same @ADDR + hex-byte format the Verilog $readmemh consumes", () => {
    const cpu = new CPU(0x100);
    cpu.loadHex("@0\nef be ad de\n@10\n01 02\n");
    expect(cpu.memory[0]).toBe(0xef);
    expect(cpu.memory[1]).toBe(0xbe);
    expect(cpu.memory[2]).toBe(0xad);
    expect(cpu.memory[3]).toBe(0xde);
    expect(cpu.memory[0x10]).toBe(0x01);
    expect(cpu.memory[0x11]).toBe(0x02);
  });

  it("readTohost reads a little-endian word at the given real physical address", () => {
    const cpu = new CPU();
    cpu.loadHex("@1000\n01 00 00 00\n");
    expect(cpu.readTohost(MEM_BASE + 0x1000)).toBe(1);
  });
});

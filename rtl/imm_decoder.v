// =============================================================================
// Hart — Immediate Decoder
// =============================================================================
//
// RV32I scatters its immediate bits differently across 5 instruction
// formats (I/S/B/U/J) - unlike NexaCPU's 16-bit ISA, which had one flat
// immediate field. This module is purely combinational: given the raw
// 32-bit instruction, it picks the right format from the opcode and
// reassembles a correctly sign-extended 32-bit immediate.
//
// Bit layouts (opcode[1:0] is always 11 for non-compressed RV32 - not part
// of the format selection, since compressed instructions aren't
// implemented):
//   I-type: imm[11:0]  = instr[31:20]
//   S-type: imm[11:5]  = instr[31:25], imm[4:0] = instr[11:7]
//   B-type: imm[12]    = instr[31], imm[10:5] = instr[30:25],
//           imm[4:1]   = instr[11:8], imm[11] = instr[7], imm[0] = 0
//           (always even - branch targets are 2-byte aligned even though
//           this core has no compressed-instruction support, per spec)
//   U-type: imm[31:12] = instr[31:12], low 12 bits = 0 (no extra shift
//           needed downstream - LUI/AUIPC use this value directly)
//   J-type: imm[20]    = instr[31], imm[10:1] = instr[30:21],
//           imm[11]    = instr[20], imm[19:12] = instr[19:12], imm[0] = 0
// =============================================================================

module imm_decoder (
    input  [31:0] instr,
    output reg [31:0] imm
);

    wire [6:0] opcode = instr[6:0];

    // opcode[6:2] format-selecting groups (opcode[1:0] always 2'b11 here).
    localparam OP_LOAD    = 5'b00000;
    localparam OP_MISCMEM = 5'b00011; // FENCE / FENCE.I
    localparam OP_OPIMM   = 5'b00100;
    localparam OP_AUIPC   = 5'b00101;
    localparam OP_STORE   = 5'b01000;
    localparam OP_OP      = 5'b01100; // R-type, no immediate
    localparam OP_LUI     = 5'b01101;
    localparam OP_BRANCH  = 5'b11000;
    localparam OP_JALR    = 5'b11001;
    localparam OP_JAL     = 5'b11011;
    localparam OP_SYSTEM  = 5'b11100;

    wire [31:0] imm_i = {{20{instr[31]}}, instr[31:20]};
    wire [31:0] imm_s = {{20{instr[31]}}, instr[31:25], instr[11:7]};
    wire [31:0] imm_b = {{19{instr[31]}}, instr[31], instr[7], instr[30:25], instr[11:8], 1'b0};
    wire [31:0] imm_u = {instr[31:12], 12'b0};
    wire [31:0] imm_j = {{11{instr[31]}}, instr[31], instr[19:12], instr[20], instr[30:21], 1'b0};

    always @(*) begin
        case (opcode[6:2])
            OP_LOAD, OP_OPIMM, OP_JALR, OP_MISCMEM, OP_SYSTEM: imm = imm_i;
            OP_STORE:                                          imm = imm_s;
            OP_BRANCH:                                         imm = imm_b;
            OP_LUI, OP_AUIPC:                                  imm = imm_u;
            OP_JAL:                                             imm = imm_j;
            default:                                            imm = 32'b0; // OP_OP (R-type) and anything unrecognized
        endcase
    end

endmodule

// =============================================================================
// Hart — Control Unit
// =============================================================================
//
// Decodes opcode[6:2] (opcode[1:0] is always 2'b11 for non-compressed RV32
// - not part of format selection here), funct3, and funct7[5] (instr[30])
// into every downstream control signal.
//
// Branch condition evaluation (BEQ/BNE/BLT/BGE/BLTU/BGEU) is deliberately
// NOT done here or through the shared ALU - it's a dedicated comparator in
// cpu.v driven by this module's `branch` flag and `funct3` passthrough,
// keeping the ALU free for arithmetic/logic/address computation only, a
// clean, common simplification for single-cycle designs.
//
// FENCE/FENCE.I (opcode 0001111) and SYSTEM (ECALL/EBREAK, opcode 1110011)
// decode as safe no-ops - reg_write/mem_read/mem_write/branch/jump/jalr
// all deasserted - per this project's disclosed RV32I-integer-only scope
// (see docs/SCOPE.md). FENCE.I in particular is correct as a no-op, not
// just a stub: Hart's unified memory has no instruction cache to flush.
// =============================================================================

module control_unit (
    input  [31:0] instr,

    output reg_write,
    output mem_read,
    output mem_write,
    output [1:0]  mem_size,   // 00=byte, 01=half, 10=word
    output mem_signed,

    output alu_src,      // 0 = ALU B is rs2, 1 = ALU B is immediate
    output alu_a_src,    // 0 = ALU A is rs1,  1 = ALU A is PC (AUIPC)
    output [3:0]  alu_control,

    output branch,        // is a branch instruction (BEQ/BNE/BLT/BGE/BLTU/BGEU)
    output jump,           // JAL
    output jalr,             // JALR
    output lui                // LUI - writeback bypasses the ALU entirely, uses the decoded immediate directly
);

    wire [6:0] opcode = instr[6:0];
    wire [2:0] funct3 = instr[14:12];
    wire       alt    = instr[30]; // funct7[5]

    localparam OP_LOAD    = 5'b00000;
    localparam OP_MISCMEM = 5'b00011;
    localparam OP_OPIMM   = 5'b00100;
    localparam OP_AUIPC   = 5'b00101;
    localparam OP_STORE   = 5'b01000;
    localparam OP_OP      = 5'b01100;
    localparam OP_LUI     = 5'b01101;
    localparam OP_BRANCH  = 5'b11000;
    localparam OP_JALR    = 5'b11001;
    localparam OP_JAL     = 5'b11011;
    localparam OP_SYSTEM  = 5'b11100;

    localparam ALU_ADD  = 4'b0000;
    localparam ALU_SUB  = 4'b0001;
    localparam ALU_SLL  = 4'b0010;
    localparam ALU_SLT  = 4'b0011;
    localparam ALU_SLTU = 4'b0100;
    localparam ALU_XOR  = 4'b0101;
    localparam ALU_SRL  = 4'b0110;
    localparam ALU_SRA  = 4'b0111;
    localparam ALU_OR   = 4'b1000;
    localparam ALU_AND  = 4'b1001;

    wire [4:0] op_group = opcode[6:2];
    wire is_rtype = (op_group == OP_OP);

    assign reg_write = (op_group == OP_LOAD) || (op_group == OP_OPIMM) || (op_group == OP_OP) ||
                        (op_group == OP_LUI) || (op_group == OP_AUIPC) ||
                        (op_group == OP_JAL) || (op_group == OP_JALR);

    assign mem_read  = (op_group == OP_LOAD);
    assign mem_write = (op_group == OP_STORE);
    assign mem_size  = funct3[1:0];
    assign mem_signed = ~funct3[2];

    assign alu_src   = (op_group != OP_OP); // everything except R-type OP uses the immediate as ALU B
    assign alu_a_src = (op_group == OP_AUIPC);

    assign branch = (op_group == OP_BRANCH);
    assign jump   = (op_group == OP_JAL);
    assign jalr   = (op_group == OP_JALR);
    assign lui    = (op_group == OP_LUI);

    reg [3:0] alu_control_r;
    always @(*) begin
        if (op_group == OP_OP || op_group == OP_OPIMM) begin
            case (funct3)
                3'b000:  alu_control_r = (is_rtype && alt) ? ALU_SUB : ALU_ADD; // ADD/ADDI, SUB (R-type only)
                3'b001:  alu_control_r = ALU_SLL;
                3'b010:  alu_control_r = ALU_SLT;
                3'b011:  alu_control_r = ALU_SLTU;
                3'b100:  alu_control_r = ALU_XOR;
                3'b101:  alu_control_r = alt ? ALU_SRA : ALU_SRL; // SRL/SRLI, SRA/SRAI
                3'b110:  alu_control_r = ALU_OR;
                3'b111:  alu_control_r = ALU_AND;
                default: alu_control_r = ALU_ADD;
            endcase
        end else begin
            // LOAD/STORE/JALR/AUIPC all just need an add for address calc.
            alu_control_r = ALU_ADD;
        end
    end
    assign alu_control = alu_control_r;

endmodule

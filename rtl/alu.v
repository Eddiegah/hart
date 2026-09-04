// =============================================================================
// Hart — Arithmetic/Logic Unit
// =============================================================================
//
// The 10 RV32I ALU operations (ADD, SUB, SLL, SLT, SLTU, XOR, SRL, SRA, OR,
// AND), selected by alu_control - a small code control_unit.v derives from
// funct3 and funct7[5]. This two-level decode (opcode -> funct3/funct7 ->
// alu_control) is the standard textbook single-cycle RISC-V design, a real
// step up from NexaCPU's flatter "opcode IS alu_op" shortcut, since RV32I's
// R-type and I-type arithmetic instructions share funct3 encodings that
// only funct7 (or its absence, for immediates) disambiguates.
//
// Purely combinational - no clock, no memory.
// =============================================================================

module alu (
    input  [31:0] a,
    input  [31:0] b,
    input  [3:0]  alu_control,
    output reg [31:0] result
);

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

    // Shift amount is the low 5 bits of b, per RV32I (SLLI/SRLI/SRAI encode
    // it directly as imm[4:0]; SLL/SRL/SRA take it from rs2[4:0]).
    wire [4:0] shamt = b[4:0];

    always @(*) begin
        case (alu_control)
            ALU_ADD:  result = a + b;
            ALU_SUB:  result = a - b;
            ALU_SLL:  result = a << shamt;
            ALU_SLT:  result = ($signed(a) < $signed(b)) ? 32'd1 : 32'd0;
            ALU_SLTU: result = (a < b) ? 32'd1 : 32'd0;
            ALU_XOR:  result = a ^ b;
            ALU_SRL:  result = a >> shamt;
            ALU_SRA:  result = $signed(a) >>> shamt;
            ALU_OR:   result = a | b;
            ALU_AND:  result = a & b;
            default:  result = 32'b0;
        endcase
    end

endmodule

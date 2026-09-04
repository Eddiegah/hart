// =============================================================================
// Hart — Register File
// =============================================================================
//
// 32 general-purpose registers (x0-x31), each 32 bits wide, per the RV32I
// base ISA. x0 is hardwired to zero on both read and write - the classic
// RISC design choice, same pattern as NexaCPU's R0.
//
// Two combinational read ports (rs1, rs2 - most R/I/S/B-type instructions
// need both source operands simultaneously), one clocked write port.
// Write-then-read in the same cycle returns the OLD value (write takes
// effect at the next clock edge) - standard synchronous-register-file
// semantics.
// =============================================================================

module register_file (
    input         clk,
    input         rst,

    input  [4:0]  rs1_addr,
    output [31:0] rs1_data,

    input  [4:0]  rs2_addr,
    output [31:0] rs2_data,

    input  [4:0]  rd_addr,
    input  [31:0] rd_data,
    input         rd_write
);

    reg [31:0] regs [0:31];
    integer i;

    always @(posedge clk) begin
        if (rst) begin
            for (i = 0; i < 32; i = i + 1)
                regs[i] <= 32'b0;
        end else if (rd_write && rd_addr != 5'd0) begin
            regs[rd_addr] <= rd_data;
        end
    end

    assign rs1_data = (rs1_addr == 5'd0) ? 32'b0 : regs[rs1_addr];
    assign rs2_data = (rs2_addr == 5'd0) ? 32'b0 : regs[rs2_addr];

endmodule

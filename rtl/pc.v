// =============================================================================
// Hart — Program Counter
// =============================================================================
//
// A 32-bit register holding the address of the instruction currently being
// fetched. Advances by 4 (one instruction word) every cycle unless a taken
// branch, JAL, or JALR redirects it to pc_next.
//
// RESET_PC defaults to 0x8000_0000 - the real physical address every
// riscv-tests binary links at (see vendor/riscv-tests/env/p/link.ld), so
// conformance tests and demo programs share one memory map with no special
// casing.
// =============================================================================

module pc #(
    parameter RESET_PC = 32'h8000_0000
) (
    input         clk,
    input         rst,
    input  [31:0] pc_next,
    output reg [31:0] pc
);

    always @(posedge clk) begin
        if (rst)
            pc <= RESET_PC;
        else
            pc <= pc_next;
    end

endmodule

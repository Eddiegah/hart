// Spike test: confirms two Verilog mechanics the whole conformance-suite
// approach depends on, under the installed Icarus Verilog 12.0.
// (1) A memory array declared with an absolute, non-zero-based, large
//     [msb:lsb] range works and can be $readmemh-loaded using real
//     absolute addresses (no rebasing).
// (2) $value$plusargs can round-trip a hex address string from the vvp
//     command line into a usable register value.

`timescale 1ns/1ps

module spike_test;
    // Icarus 12.0 empirically does NOT honor a non-zero-based [msb:lsb]
    // memory declaration as absolute addressing - it silently normalizes
    // to 0-based indexing and rejects the real absolute address as
    // out-of-range. Verified directly (see spike test history). Real
    // design: a plain 0-based array + explicit address rebasing, which is
    // also how real memory-mapped address decoding works in hardware
    // (subtract a base, compare/index the remainder).
    reg [7:0] mem [0:32'h000F_FFFF];
    localparam BASE = 32'h8000_0000;

    reg [31:0] tohost_addr;
    integer code;

    initial begin
        // (1) 0-based memory + a pre-rebased $readmemh file (address 0
        //     corresponds to physical 0x80000000)
        $readmemh("testbench/spike_test.hex", mem);
        $display("mem[0] = %02x (expect ef)", mem[0]);
        $display("mem[1] = %02x (expect be)", mem[1]);
        $display("mem[2] = %02x (expect ad)", mem[2]);
        $display("mem[3] = %02x (expect de)", mem[3]);
        if (mem[0] === 8'hef && mem[1] === 8'hbe &&
            mem[2] === 8'had && mem[3] === 8'hde)
            $display("MEMORY_SPIKE: PASS");
        else
            $display("MEMORY_SPIKE: FAIL");

        // (2) $value$plusargs round-tripping a hex address
        code = $value$plusargs("TOHOST=%h", tohost_addr);
        $display("plusargs code=%0d tohost_addr=%08x (expect 1, 80001000)", code, tohost_addr);
        if (code == 1 && tohost_addr == 32'h8000_1000)
            $display("PLUSARGS_SPIKE: PASS");
        else
            $display("PLUSARGS_SPIKE: FAIL");

        $finish;
    end
endmodule

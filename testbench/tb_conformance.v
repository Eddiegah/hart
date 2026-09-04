// =============================================================================
// Hart — Conformance Testbench
// =============================================================================
//
// One generic testbench, not one per test file. Takes the hex image path
// and the real tohost address (extracted per-file via nm, never hardcoded
// - see scripts/conformance/compile-tests.ts) as runtime plusargs, so the
// same compiled tb_conformance.vvp runs all 42 real rv32ui tests without
// recompiling Verilog per test:
//
//   vvp build/tb_conformance.vvp +HEXFILE=build/hex/add.hex +TOHOST=80001000
//
// Loads the hex image directly into the CPU's memory (hierarchical access
// into the instantiated MEM submodule - the same dot-access pattern
// NexaCPU's own testbenches use for internal state), clocks until the
// word at the real tohost address goes nonzero or a cycle timeout fires,
// then reports PASS/FAIL/TIMEOUT in a single parseable line that
// scripts/conformance/run-conformance.ts greps for.
// =============================================================================

`timescale 1ns/1ps

module tb_conformance;

    localparam MEM_BASE = 32'h8000_0000;
    localparam MAX_CYCLES = 200000;

    reg clk, rst;

    cpu #(.RESET_PC(MEM_BASE), .MEM_BASE(MEM_BASE), .MEM_SIZE(32'h0010_0000)) dut (
        .clk(clk),
        .rst(rst)
    );

    reg [2047:0] hexfile;
    reg [31:0]   tohost_addr;
    reg [31:0]   tohost_idx;
    reg [31:0]   tohost_val;
    integer      code;
    integer      cycle_count;
    integer      i;

    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        code = $value$plusargs("HEXFILE=%s", hexfile);
        if (code != 1) begin
            $display("RESULT: ERROR missing +HEXFILE=<path>");
            $finish;
        end
        code = $value$plusargs("TOHOST=%h", tohost_addr);
        if (code != 1) begin
            $display("RESULT: ERROR missing +TOHOST=<hex-addr>");
            $finish;
        end
        tohost_idx = tohost_addr - MEM_BASE;

        $readmemh(hexfile, dut.MEM.mem);

        rst = 1;
        @(posedge clk);
        @(posedge clk);
        rst = 0;

        cycle_count = 0;
        tohost_val = {dut.MEM.mem[tohost_idx+3], dut.MEM.mem[tohost_idx+2], dut.MEM.mem[tohost_idx+1], dut.MEM.mem[tohost_idx]};
        while (tohost_val == 32'b0 && cycle_count < MAX_CYCLES) begin
            @(posedge clk);
            cycle_count = cycle_count + 1;
            tohost_val = {dut.MEM.mem[tohost_idx+3], dut.MEM.mem[tohost_idx+2], dut.MEM.mem[tohost_idx+1], dut.MEM.mem[tohost_idx]};
        end

        if (cycle_count >= MAX_CYCLES) begin
            $display("RESULT: TIMEOUT cycles=%0d", cycle_count);
        end else if (tohost_val == 32'd1) begin
            $display("RESULT: PASS cycles=%0d", cycle_count);
        end else begin
            $display("RESULT: FAIL testnum=%0d cycles=%0d", tohost_val >> 1, cycle_count);
        end

        // Final register-file signature - lets cross-validation.test.ts
        // compare full state against the TS model, not just tohost.
        $write("REGS:");
        for (i = 0; i < 32; i = i + 1) $write(" %08x", dut.REGS.regs[i]);
        $write("\n");

        $finish;
    end

endmodule

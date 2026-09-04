// =============================================================================
// Hart — CPU Integration Smoke Test
// =============================================================================
// A small, fast, hand-written integration program (programs/smoke_sum.S,
// compiled with the real toolchain against our own harness) exercising
// the full fetch-decode-execute-writeback path: a loop, branches,
// arithmetic, and a store - proof of life before trusting the much
// larger 42-file real conformance suite. If the conformance suite ever
// fails, this is the faster, smaller fixture to localize the bug in.
`timescale 1ns/1ps

module cpu_tb;

    localparam MEM_BASE = 32'h8000_0000;
    localparam RESULT_ADDR = 32'h8000_2000; // from build/programs/manifest.json
    localparam MAX_CYCLES = 5000;

    reg clk, rst;

    cpu #(.RESET_PC(MEM_BASE), .MEM_BASE(MEM_BASE), .MEM_SIZE(32'h0010_0000)) dut (
        .clk(clk),
        .rst(rst)
    );

    integer cycle_count;
    reg [31:0] tohost_val;
    reg [31:0] result_val;

    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        $display("=== CPU Integration Smoke Test (programs/smoke_sum.S: sum 1..5) ===");

        $readmemh("build/programs/smoke_sum.hex", dut.MEM.mem);

        rst = 1;
        @(posedge clk);
        @(posedge clk);
        rst = 0;

        cycle_count = 0;
        tohost_val = {dut.MEM.mem[32'h1000+3], dut.MEM.mem[32'h1000+2], dut.MEM.mem[32'h1000+1], dut.MEM.mem[32'h1000]};
        while (tohost_val == 32'b0 && cycle_count < MAX_CYCLES) begin
            @(posedge clk);
            cycle_count = cycle_count + 1;
            tohost_val = {dut.MEM.mem[32'h1000+3], dut.MEM.mem[32'h1000+2], dut.MEM.mem[32'h1000+1], dut.MEM.mem[32'h1000]};
        end

        if (cycle_count >= MAX_CYCLES) begin
            $display("FAIL: timed out after %0d cycles", cycle_count);
        end else if (tohost_val != 32'd1) begin
            $display("FAIL: program signaled failure, tohost=%0d", tohost_val);
        end else begin
            result_val = {dut.MEM.mem[RESULT_ADDR-MEM_BASE+3], dut.MEM.mem[RESULT_ADDR-MEM_BASE+2],
                          dut.MEM.mem[RESULT_ADDR-MEM_BASE+1], dut.MEM.mem[RESULT_ADDR-MEM_BASE]};
            $display("Program halted after %0d cycles. result = %0d (expect 15)", cycle_count, result_val);
            if (result_val == 32'd15)
                $display("CPU_TB: PASS");
            else
                $display("CPU_TB: FAIL");
        end

        $finish;
    end

endmodule

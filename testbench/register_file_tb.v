// =============================================================================
// Hart — Register File Testbench
// =============================================================================
`timescale 1ns/1ps

module register_file_tb;

    reg clk, rst;
    reg  [4:0]  rs1_addr, rs2_addr, rd_addr;
    reg  [31:0] rd_data;
    reg         rd_write;
    wire [31:0] rs1_data, rs2_data;

    register_file DUT (
        .clk(clk), .rst(rst),
        .rs1_addr(rs1_addr), .rs1_data(rs1_data),
        .rs2_addr(rs2_addr), .rs2_data(rs2_data),
        .rd_addr(rd_addr), .rd_data(rd_data), .rd_write(rd_write)
    );

    integer pass_count, fail_count, test_num;

    task check;
        input [255:0] label;
        input [31:0]  got;
        input [31:0]  expected;
        begin
            test_num = test_num + 1;
            if (got === expected) begin
                $display("  PASS [%0d] %s = %08x", test_num, label, got);
                pass_count = pass_count + 1;
            end else begin
                $display("  FAIL [%0d] %s: got %08x, expected %08x", test_num, label, got, expected);
                fail_count = fail_count + 1;
            end
        end
    endtask

    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        pass_count = 0; fail_count = 0; test_num = 0;
        $display("=== Register File Testbench ===");

        rst = 1; rd_write = 0; rd_addr = 0; rd_data = 0; rs1_addr = 0; rs2_addr = 0;
        @(posedge clk); #1;
        rst = 0;

        // x0 always reads zero, writes to it are discarded.
        rd_addr = 5'd0; rd_data = 32'hDEADBEEF; rd_write = 1;
        @(posedge clk); #1;
        rd_write = 0;
        rs1_addr = 5'd0;
        #1; check("x0 reads zero after attempted write", rs1_data, 32'd0);

        // Write x5 = 42, read it back.
        rd_addr = 5'd5; rd_data = 32'd42; rd_write = 1;
        @(posedge clk); #1;
        rd_write = 0;
        rs1_addr = 5'd5;
        #1; check("x5 == 42 after write", rs1_data, 32'd42);

        // Write x31 = 0xCAFEBABE (top of the register file range).
        rd_addr = 5'd31; rd_data = 32'hCAFEBABE; rd_write = 1;
        @(posedge clk); #1;
        rd_write = 0;
        rs2_addr = 5'd31;
        #1; check("x31 == 0xCAFEBABE after write", rs2_data, 32'hCAFEBABE);

        // Two independent read ports simultaneously.
        rs1_addr = 5'd5; rs2_addr = 5'd31;
        #1;
        check("simultaneous read port 1 (x5)", rs1_data, 32'd42);
        check("simultaneous read port 2 (x31)", rs2_data, 32'hCAFEBABE);

        // Write-then-read same cycle returns the OLD value.
        rd_addr = 5'd5; rd_data = 32'd999; rd_write = 1;
        rs1_addr = 5'd5;
        #1; check("write-then-read same cycle returns OLD value", rs1_data, 32'd42);
        @(posedge clk); #1;
        rd_write = 0;
        #1; check("value updates on the following cycle", rs1_data, 32'd999);

        // Reset clears everything.
        rst = 1;
        @(posedge clk); #1;
        rst = 0;
        rs1_addr = 5'd5;
        #1; check("reset clears x5 to zero", rs1_data, 32'd0);

        $display("\nResults: %0d passed, %0d failed (of %0d)", pass_count, fail_count, test_num);
        if (fail_count == 0) $display("ALL REGISTER_FILE TESTS PASSED");
        $finish;
    end

endmodule

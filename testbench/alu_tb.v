// =============================================================================
// Hart — ALU Testbench
// =============================================================================
`timescale 1ns/1ps

module alu_tb;

    reg  [31:0] a, b;
    reg  [3:0]  alu_control;
    wire [31:0] result;

    alu DUT (.a(a), .b(b), .alu_control(alu_control), .result(result));

    integer pass_count, fail_count, test_num;

    task check;
        input [255:0] label;
        input [31:0]  got;
        input [31:0]  expected;
        begin
            test_num = test_num + 1;
            #1;
            if (got === expected) begin
                $display("  PASS [%0d] %s = %08x", test_num, label, got);
                pass_count = pass_count + 1;
            end else begin
                $display("  FAIL [%0d] %s: got %08x, expected %08x", test_num, label, got, expected);
                fail_count = fail_count + 1;
            end
        end
    endtask

    localparam ALU_ADD = 4'b0000, ALU_SUB = 4'b0001, ALU_SLL = 4'b0010, ALU_SLT = 4'b0011,
               ALU_SLTU = 4'b0100, ALU_XOR = 4'b0101, ALU_SRL = 4'b0110, ALU_SRA = 4'b0111,
               ALU_OR = 4'b1000, ALU_AND = 4'b1001;

    initial begin
        pass_count = 0; fail_count = 0; test_num = 0;
        $display("=== ALU Testbench ===");

        // NOTE: Verilog copies task arguments by value at the moment of
        // the call, BEFORE the task body's own #1 runs - so inputs must
        // settle (#1) here, before calling check(), not inside it.

        a = 32'd3; b = 32'd7; alu_control = ALU_ADD; #1; check("3+7", result, 32'd10);
        a = 32'hFFFFFFFF; b = 32'd1; alu_control = ALU_ADD; #1; check("-1+1", result, 32'd0);

        a = 32'd10; b = 32'd3; alu_control = ALU_SUB; #1; check("10-3", result, 32'd7);
        a = 32'd0; b = 32'd1; alu_control = ALU_SUB; #1; check("0-1", result, 32'hFFFFFFFF);

        a = 32'h0000_0001; b = 32'd31; alu_control = ALU_SLL; #1; check("1<<31", result, 32'h8000_0000);
        a = 32'h0000_0001; b = 32'd0;  alu_control = ALU_SLL; #1; check("1<<0", result, 32'h0000_0001);

        a = -32'sd5; b = 32'd3; alu_control = ALU_SLT; #1; check("SLT -5<3", result, 32'd1);
        a = 32'd3; b = -32'sd5; alu_control = ALU_SLT; #1; check("SLT 3<-5", result, 32'd0);

        a = 32'hFFFFFFFF; b = 32'd1; alu_control = ALU_SLTU; #1; check("SLTU 0xFFFFFFFF<1 (unsigned)", result, 32'd0);
        a = 32'd1; b = 32'hFFFFFFFF; alu_control = ALU_SLTU; #1; check("SLTU 1<0xFFFFFFFF (unsigned)", result, 32'd1);

        a = 32'hF0F0F0F0; b = 32'h0F0F0F0F; alu_control = ALU_XOR; #1; check("XOR", result, 32'hFFFFFFFF);

        a = 32'h8000_0000; b = 32'd31; alu_control = ALU_SRL; #1; check("0x80000000>>31 (logical)", result, 32'h0000_0001);
        a = 32'h8000_0000; b = 32'd31; alu_control = ALU_SRA; #1; check("0x80000000>>>31 (arithmetic)", result, 32'hFFFFFFFF);

        a = 32'hF0F0F0F0; b = 32'h0F0F0F0F; alu_control = ALU_OR; #1; check("OR", result, 32'hFFFFFFFF);
        a = 32'hFF00FF00; b = 32'hF0F0F0F0; alu_control = ALU_AND; #1; check("AND", result, 32'hF000F000);

        $display("\nResults: %0d passed, %0d failed (of %0d)", pass_count, fail_count, test_num);
        if (fail_count == 0) $display("ALL ALU TESTS PASSED");
        $finish;
    end

endmodule

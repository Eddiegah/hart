// =============================================================================
// Hart — Control Unit Testbench
// =============================================================================
// One representative instruction per opcode/funct3/funct7 combination the
// control unit needs to distinguish.
`timescale 1ns/1ps

module control_unit_tb;

    reg  [31:0] instr;
    wire reg_write, mem_read, mem_write, mem_signed, alu_src, alu_a_src, branch, jump, jalr, lui;
    wire [1:0] mem_size;
    wire [3:0] alu_control;

    control_unit DUT (
        .instr(instr),
        .reg_write(reg_write), .mem_read(mem_read), .mem_write(mem_write),
        .mem_size(mem_size), .mem_signed(mem_signed),
        .alu_src(alu_src), .alu_a_src(alu_a_src), .alu_control(alu_control),
        .branch(branch), .jump(jump), .jalr(jalr), .lui(lui)
    );

    integer pass_count, fail_count, test_num;

    task check1;
        input [255:0] label;
        input got, expected;
        begin
            test_num = test_num + 1;
            if (got === expected) begin
                $display("  PASS [%0d] %s = %0d", test_num, label, got);
                pass_count = pass_count + 1;
            end else begin
                $display("  FAIL [%0d] %s: got %0d, expected %0d", test_num, label, got, expected);
                fail_count = fail_count + 1;
            end
        end
    endtask

    task check4;
        input [255:0] label;
        input [3:0] got, expected;
        begin
            test_num = test_num + 1;
            if (got === expected) begin
                $display("  PASS [%0d] %s = %0d", test_num, label, got);
                pass_count = pass_count + 1;
            end else begin
                $display("  FAIL [%0d] %s: got %0d, expected %0d", test_num, label, got, expected);
                fail_count = fail_count + 1;
            end
        end
    endtask

    localparam ALU_ADD = 4'b0000, ALU_SUB = 4'b0001, ALU_SRL = 4'b0110, ALU_SRA = 4'b0111;

    initial begin
        pass_count = 0; fail_count = 0; test_num = 0;
        $display("=== Control Unit Testbench ===");

        // ADD x1, x2, x3 (R-type, funct7=0)
        instr = {7'b0000000, 5'd3, 5'd2, 3'b000, 5'd1, 7'b0110011};
        #1;
        check1("ADD: reg_write", reg_write, 1'b1);
        check1("ADD: alu_src (rs2, not imm)", alu_src, 1'b0);
        check4("ADD: alu_control", alu_control, ALU_ADD);

        // SUB x1, x2, x3 (R-type, funct7=0100000)
        instr = {7'b0100000, 5'd3, 5'd2, 3'b000, 5'd1, 7'b0110011};
        #1;
        check4("SUB: alu_control (distinguished from ADD by funct7)", alu_control, ALU_SUB);

        // ADDI x1, x2, 5 (I-type OP-IMM, funct3=000) - must NOT be read as SUB even with instr[30] set incidentally
        instr = {7'b0000000, 5'd0, 5'd2, 3'b000, 5'd1, 7'b0010011};
        #1;
        check1("ADDI: reg_write", reg_write, 1'b1);
        check1("ADDI: alu_src (imm, not rs2)", alu_src, 1'b1);
        check4("ADDI: alu_control is ADD (I-type never SUBs)", alu_control, ALU_ADD);

        // SRLI vs SRAI distinguished by instr[30], same funct3=101
        instr = {7'b0000000, 5'd5, 5'd2, 3'b101, 5'd1, 7'b0010011};
        #1; check4("SRLI: alu_control", alu_control, ALU_SRL);
        instr = {7'b0100000, 5'd5, 5'd2, 3'b101, 5'd1, 7'b0010011};
        #1; check4("SRAI: alu_control", alu_control, ALU_SRA);

        // LW x1, 0(x2) - LOAD, funct3=010 (word), signed
        instr = {12'd0, 5'd2, 3'b010, 5'd1, 7'b0000011};
        #1;
        check1("LW: reg_write", reg_write, 1'b1);
        check1("LW: mem_read", mem_read, 1'b1);
        check1("LW: mem_write", mem_write, 1'b0);
        check1("LW: mem_size is word", mem_size, 2'b10);
        check1("LW: mem_signed", mem_signed, 1'b1);

        // LBU x1, 0(x2) - unsigned byte load, funct3=100
        instr = {12'd0, 5'd2, 3'b100, 5'd1, 7'b0000011};
        #1;
        check1("LBU: mem_size is byte", mem_size, 2'b00);
        check1("LBU: mem_signed is false", mem_signed, 1'b0);

        // SW x2, 0(x1) - STORE, funct3=010
        instr = {7'd0, 5'd2, 5'd1, 3'b010, 5'd0, 7'b0100011};
        #1;
        check1("SW: reg_write is false", reg_write, 1'b0);
        check1("SW: mem_write", mem_write, 1'b1);
        check1("SW: mem_size is word", mem_size, 2'b10);

        // BEQ x1, x2, offset - BRANCH
        instr = {1'b0, 6'd0, 5'd2, 5'd1, 3'b000, 4'd0, 1'b0, 7'b1100011};
        #1;
        check1("BEQ: branch", branch, 1'b1);
        check1("BEQ: reg_write is false", reg_write, 1'b0);

        // JAL x1, offset
        instr = {1'b0, 10'd0, 1'b0, 8'd0, 5'd1, 7'b1101111};
        #1;
        check1("JAL: jump", jump, 1'b1);
        check1("JAL: reg_write", reg_write, 1'b1);

        // JALR x1, x2, 0
        instr = {12'd0, 5'd2, 3'b000, 5'd1, 7'b1100111};
        #1;
        check1("JALR: jalr", jalr, 1'b1);
        check1("JALR: alu_src (imm)", alu_src, 1'b1);

        // LUI x1, 0x1000
        instr = {20'h1000, 5'd1, 7'b0110111};
        #1;
        check1("LUI: lui", lui, 1'b1);
        check1("LUI: reg_write", reg_write, 1'b1);

        // AUIPC x1, 0x1000
        instr = {20'h1000, 5'd1, 7'b0010111};
        #1;
        check1("AUIPC: alu_a_src (PC, not rs1)", alu_a_src, 1'b1);
        check1("AUIPC: reg_write", reg_write, 1'b1);

        // FENCE.I - must decode as a safe no-op (opcode 0001111)
        instr = {17'd0, 3'b001, 5'd0, 7'b0001111};
        #1;
        check1("FENCE.I: reg_write is false (no-op)", reg_write, 1'b0);
        check1("FENCE.I: branch is false", branch, 1'b0);
        check1("FENCE.I: jump is false", jump, 1'b0);

        $display("\nResults: %0d passed, %0d failed (of %0d)", pass_count, fail_count, test_num);
        if (fail_count == 0) $display("ALL CONTROL_UNIT TESTS PASSED");
        $finish;
    end

endmodule

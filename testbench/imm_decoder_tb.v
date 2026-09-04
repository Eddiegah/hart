// =============================================================================
// Hart — Immediate Decoder Testbench
// =============================================================================
`timescale 1ns/1ps

module imm_decoder_tb;

    reg  [31:0] instr;
    wire [31:0] imm;

    imm_decoder DUT (.instr(instr), .imm(imm));

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

    initial begin
        pass_count = 0; fail_count = 0; test_num = 0;
        $display("=== Immediate Decoder Testbench ===");

        // I-type: ADDI x1, x0, 5   -> opcode 0010011, imm=5
        instr = 32'b000000000101_00000_000_00001_0010011;
        #1; check("I-type positive (ADDI imm=5)", imm, 32'd5);

        // I-type negative: ADDI x1, x0, -1 -> imm[11:0]=0xFFF, sign-extend
        instr = 32'b111111111111_00000_000_00001_0010011;
        #1; check("I-type negative (ADDI imm=-1)", imm, 32'hFFFFFFFF);

        // S-type: SW x2, 100(x1)  imm=100=0x064 -> imm[11:5]=0000011, imm[4:0]=00100
        instr = {7'b0000011, 5'd2, 5'd1, 3'b010, 5'b00100, 7'b0100011};
        #1; check("S-type (SW imm=100)", imm, 32'd100);

        // S-type negative: imm=-4 -> 12'hFFC -> imm[11:5]=1111111, imm[4:0]=11100
        instr = {7'b1111111, 5'd2, 5'd1, 3'b010, 5'b11100, 7'b0100011};
        #1; check("S-type negative (imm=-4)", imm, 32'hFFFFFFFC);

        // B-type: BEQ with imm=8 (0b0000_0000_1000) -> imm[12]=0,imm[10:5]=000000,imm[4:1]=0100,imm[11]=0
        instr = {1'b0, 6'b000000, 5'd2, 5'd1, 3'b000, 4'b0100, 1'b0, 7'b1100011};
        #1; check("B-type (BEQ imm=8)", imm, 32'd8);

        // U-type: LUI x1, 0x12345 -> imm[31:12]=0x12345
        instr = {20'h12345, 5'd1, 7'b0110111};
        #1; check("U-type (LUI imm=0x12345000)", imm, 32'h12345000);

        // J-type: JAL x1, imm=16 (=0b10000, so only imm[4]=1). imm[10:1] (10 bits) = 0000001000.
        instr = {1'b0, 10'b0000001000, 1'b0, 8'b00000000, 5'd1, 7'b1101111};
        #1; check("J-type (JAL imm=16)", imm, 32'd16);

        // R-type: ADD has no immediate - should decode to 0
        instr = {7'b0000000, 5'd3, 5'd2, 3'b000, 5'd1, 7'b0110011};
        #1; check("R-type (ADD, no immediate)", imm, 32'd0);

        $display("\nResults: %0d passed, %0d failed (of %0d)", pass_count, fail_count, test_num);
        if (fail_count == 0) $display("ALL IMM_DECODER TESTS PASSED");
        $finish;
    end

endmodule

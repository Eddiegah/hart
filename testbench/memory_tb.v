// =============================================================================
// Hart — Memory Testbench
// =============================================================================
// Direct RTL-level check of aligned AND misaligned byte/half/word
// read/write - the module-level proof backing isa/rv32ui/ma_data.S's
// requirement (see docs/SCOPE.md), so a failure here localizes to the
// memory module instead of only surfacing as a cryptic conformance-suite
// failure.
`timescale 1ns/1ps

module memory_tb;

    localparam BASE = 32'h8000_0000;

    reg clk;
    reg  [31:0] fetch_addr, load_addr, store_addr, store_data;
    reg  [1:0]  load_size, store_size;
    reg         load_signed, store_en;
    wire [31:0] fetch_data, load_data;

    memory #(.BASE(BASE), .SIZE(32'h1000)) DUT (
        .clk(clk),
        .fetch_addr(fetch_addr), .fetch_data(fetch_data),
        .load_addr(load_addr), .load_size(load_size), .load_signed(load_signed), .load_data(load_data),
        .store_addr(store_addr), .store_data(store_data), .store_size(store_size), .store_en(store_en)
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

    task do_store;
        input [31:0] addr;
        input [31:0] data;
        input [1:0]  size;
        begin
            store_addr = addr; store_data = data; store_size = size; store_en = 1;
            @(posedge clk); #1;
            store_en = 0;
        end
    endtask

    initial clk = 0;
    always #5 clk = ~clk;

    initial begin
        pass_count = 0; fail_count = 0; test_num = 0;
        store_en = 0;
        $display("=== Memory Testbench ===");

        // Word-aligned store/load round-trip.
        do_store(BASE + 32'h10, 32'hDEADBEEF, 2'b10);
        load_addr = BASE + 32'h10; load_size = 2'b10; load_signed = 0;
        #1; check("aligned word round-trip", load_data, 32'hDEADBEEF);

        // Fetch reads the same shared memory a store just wrote (the
        // fence_i.S / self-modifying-code requirement).
        fetch_addr = BASE + 32'h10;
        #1; check("fetch sees a just-written word (unified memory)", fetch_data, 32'hDEADBEEF);

        // Byte store/load, signed and unsigned.
        do_store(BASE + 32'h20, 32'hFFFFFF80, 2'b00); // stores byte 0x80
        load_addr = BASE + 32'h20; load_size = 2'b00; load_signed = 1;
        #1; check("signed byte load of 0x80 sign-extends", load_data, 32'hFFFFFF80);
        load_signed = 0;
        #1; check("unsigned byte load of 0x80 zero-extends", load_data, 32'h00000080);

        // Half store/load, signed and unsigned.
        do_store(BASE + 32'h30, 32'h0000_8000, 2'b01);
        load_addr = BASE + 32'h30; load_size = 2'b01; load_signed = 1;
        #1; check("signed half load of 0x8000 sign-extends", load_data, 32'hFFFF8000);
        load_signed = 0;
        #1; check("unsigned half load of 0x8000 zero-extends", load_data, 32'h00008000);

        // Misaligned word store/load (address not a multiple of 4) - the
        // direct ma_data.S-style check: must just work, byte-reassembled
        // correctly, no special handling needed at this level.
        do_store(BASE + 32'h41, 32'h11223344, 2'b10); // misaligned by 1
        load_addr = BASE + 32'h41; load_size = 2'b10; load_signed = 0;
        #1; check("misaligned (offset+1) word round-trip", load_data, 32'h11223344);

        do_store(BASE + 32'h53, 32'hAABBCCDD, 2'b10); // misaligned by 3
        load_addr = BASE + 32'h53; load_size = 2'b10; load_signed = 0;
        #1; check("misaligned (offset+3) word round-trip", load_data, 32'hAABBCCDD);

        // Misaligned half store/load.
        do_store(BASE + 32'h61, 32'h0000_ABCD, 2'b01);
        load_addr = BASE + 32'h61; load_size = 2'b01; load_signed = 0;
        #1; check("misaligned half round-trip", load_data, 32'h0000ABCD);

        // A byte-sized store must not disturb neighboring bytes.
        do_store(BASE + 32'h70, 32'hFFFFFFFF, 2'b10); // fill word with FF
        do_store(BASE + 32'h71, 32'h0000_0000, 2'b00); // overwrite just byte 1 with 0x00
        load_addr = BASE + 32'h70; load_size = 2'b10; load_signed = 0;
        #1; check("byte store leaves neighboring bytes untouched", load_data, 32'hFFFF00FF);

        $display("\nResults: %0d passed, %0d failed (of %0d)", pass_count, fail_count, test_num);
        if (fail_count == 0) $display("ALL MEMORY TESTS PASSED");
        $finish;
    end

endmodule

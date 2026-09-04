// =============================================================================
// Hart — Unified Memory
// =============================================================================
//
// A single, unified (Von Neumann) byte-addressable memory serving both
// instruction fetch and data load/store. One shared array, no instruction
// cache - a store is immediately visible to the very next fetch, which is
// exactly what isa/rv32ui/fence_i.S (self-modifying code + fence.i) needs:
// there is nothing to flush, so FENCE.I is a safe no-op (see control_unit.v).
//
// REAL, EMPIRICALLY-VERIFIED DESIGN NOTE: an earlier draft tried declaring
// this array with an absolute, non-zero-based Verilog index range
// (`reg [7:0] mem [32'h8010_0000:32'h8000_0000]`) so the array's own
// indices would literally BE the real physical addresses riscv-tests links
// at (0x8000_0000+), letting objcopy's raw hex output load via $readmemh
// with zero rebasing. A spike test (testbench/spike_test.v) proved this
// does NOT work on the installed Icarus Verilog 12.0 - it silently
// normalizes the array to 0-based indexing and rejects the real physical
// address as out-of-range. The real, verified design instead uses a plain
// 0-based array with explicit address translation (physAddr - BASE) below
// - which is also how real hardware memory-mapped address decoding works
// (a subtractor/comparator against a base register), so this isn't a
// downgrade. The BUILD-TIME rebasing this requires (subtracting BASE from
// every hex file's @ADDRESS directive before $readmemh) lives in
// scripts/conformance/compile-tests.ts's rebaseVerilogHex().
//
// Loads and stores are explicitly unaligned-capable - reading/writing N
// consecutive byte addresses regardless of alignment - satisfying
// isa/rv32ui/ma_data.S, which expects misaligned loads/stores to just work
// (no exception), confirmed by reading its real test body.
// =============================================================================

module memory #(
    parameter BASE      = 32'h8000_0000,
    parameter SIZE      = 32'h0010_0000  // 1 MiB
) (
    input         clk,

    // Instruction fetch - combinational, word-aligned.
    input  [31:0] fetch_addr,
    output [31:0] fetch_data,

    // Load - combinational, byte/half/word, sign or zero extended,
    // unaligned-capable.
    input  [31:0] load_addr,
    input  [1:0]  load_size,   // 00=byte, 01=half, 10=word
    input         load_signed,
    output reg [31:0] load_data,

    // Store - synchronous, byte/half/word, unaligned-capable.
    input  [31:0] store_addr,
    input  [31:0] store_data,
    input  [1:0]  store_size,  // 00=byte, 01=half, 10=word
    input         store_en
);

    reg [7:0] mem [0:SIZE-1];

    wire [31:0] fetch_idx = fetch_addr - BASE;
    wire [31:0] load_idx  = load_addr  - BASE;
    wire [31:0] store_idx = store_addr - BASE;

    // ---- Fetch (always a full word) ------------------------------------
    assign fetch_data = {mem[fetch_idx+3], mem[fetch_idx+2], mem[fetch_idx+1], mem[fetch_idx]};

    // ---- Load, with size selection and sign/zero extension -------------
    wire [7:0]  load_byte = mem[load_idx];
    wire [15:0] load_half = {mem[load_idx+1], mem[load_idx]};
    wire [31:0] load_word = {mem[load_idx+3], mem[load_idx+2], mem[load_idx+1], mem[load_idx]};

    always @(*) begin
        case (load_size)
            2'b00: load_data = load_signed ? {{24{load_byte[7]}}, load_byte} : {24'b0, load_byte};
            2'b01: load_data = load_signed ? {{16{load_half[15]}}, load_half} : {16'b0, load_half};
            2'b10: load_data = load_word;
            default: load_data = 32'b0;
        endcase
    end

    // ---- Store, byte-granular write enable ------------------------------
    always @(posedge clk) begin
        if (store_en) begin
            case (store_size)
                2'b00: begin
                    mem[store_idx] <= store_data[7:0];
                end
                2'b01: begin
                    mem[store_idx]   <= store_data[7:0];
                    mem[store_idx+1] <= store_data[15:8];
                end
                2'b10: begin
                    mem[store_idx]   <= store_data[7:0];
                    mem[store_idx+1] <= store_data[15:8];
                    mem[store_idx+2] <= store_data[23:16];
                    mem[store_idx+3] <= store_data[31:24];
                end
                default: ; // no-op
            endcase
        end
    end

endmodule

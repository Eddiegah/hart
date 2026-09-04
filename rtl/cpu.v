// =============================================================================
// Hart — Top-Level CPU Integration (single-cycle RV32I)
// =============================================================================
//
// The classic fetch-decode-execute-writeback cycle, all in one clock cycle,
// same overall shape as NexaCPU's single-cycle design but scaled to RV32I's
// wider instruction/register space and 5 immediate formats.
//
// Branch condition evaluation (BEQ/BNE/BLT/BGE/BLTU/BGEU) is a dedicated
// comparator here, not routed through the shared ALU - keeps the ALU
// focused on arithmetic/logic/address computation (see control_unit.v).
//
// No CSRs, no ECALL/EBREAK execution, no traps/privilege - see
// docs/SCOPE.md for why that's provably fine for RV32I integer
// correctness against the real riscv-tests conformance suite.
//
// Debug/inspection: testbenches use hierarchical dot-access into the
// instantiated REGS/MEM submodules (dut.REGS.regs[N], dut.MEM.mem[idx]) -
// the same pattern NexaCPU's own testbenches already use for register 5-7
// and memory contents, extended here since 32 registers is too many for
// individually named debug ports.
// =============================================================================

module cpu #(
    parameter RESET_PC = 32'h8000_0000,
    parameter MEM_BASE = 32'h8000_0000,
    parameter MEM_SIZE = 32'h0010_0000
) (
    input clk,
    input rst
);

    // ---- Program counter ----------------------------------------------
    wire [31:0] pc_val;
    wire [31:0] pc_next;

    pc #(.RESET_PC(RESET_PC)) PC (
        .clk(clk),
        .rst(rst),
        .pc_next(pc_next),
        .pc(pc_val)
    );

    // ---- Instruction fetch ----------------------------------------------
    wire [31:0] instr;

    // ---- Decode -----------------------------------------------------------
    wire [4:0] rs1_addr = instr[19:15];
    wire [4:0] rs2_addr = instr[24:20];
    wire [4:0] rd_addr  = instr[11:7];
    wire [2:0] funct3   = instr[14:12];

    wire [31:0] imm;
    imm_decoder IMM (.instr(instr), .imm(imm));

    wire reg_write, mem_read, mem_write, alu_src, alu_a_src, branch, jump, jalr, lui, mem_signed;
    wire [1:0] mem_size;
    wire [3:0] alu_control;

    control_unit CU (
        .instr(instr),
        .reg_write(reg_write),
        .mem_read(mem_read),
        .mem_write(mem_write),
        .mem_size(mem_size),
        .mem_signed(mem_signed),
        .alu_src(alu_src),
        .alu_a_src(alu_a_src),
        .alu_control(alu_control),
        .branch(branch),
        .jump(jump),
        .jalr(jalr),
        .lui(lui)
    );

    // ---- Register file -----------------------------------------------------
    wire [31:0] rs1_data, rs2_data;
    wire [31:0] wb_data;

    register_file REGS (
        .clk(clk),
        .rst(rst),
        .rs1_addr(rs1_addr), .rs1_data(rs1_data),
        .rs2_addr(rs2_addr), .rs2_data(rs2_data),
        .rd_addr(rd_addr), .rd_data(wb_data), .rd_write(reg_write)
    );

    // ---- ALU -----------------------------------------------------------------
    wire [31:0] alu_a = alu_a_src ? pc_val : rs1_data;
    wire [31:0] alu_b = alu_src ? imm : rs2_data;
    wire [31:0] alu_result;

    alu ALU (
        .a(alu_a),
        .b(alu_b),
        .alu_control(alu_control),
        .result(alu_result)
    );

    // ---- Branch comparator -----------------------------------------------------
    reg branch_taken;
    always @(*) begin
        case (funct3)
            3'b000:  branch_taken = (rs1_data == rs2_data);                     // BEQ
            3'b001:  branch_taken = (rs1_data != rs2_data);                     // BNE
            3'b100:  branch_taken = ($signed(rs1_data) < $signed(rs2_data));    // BLT
            3'b101:  branch_taken = ($signed(rs1_data) >= $signed(rs2_data));   // BGE
            3'b110:  branch_taken = (rs1_data < rs2_data);                      // BLTU
            3'b111:  branch_taken = (rs1_data >= rs2_data);                     // BGEU
            default: branch_taken = 1'b0;
        endcase
    end
    wire do_branch = branch && branch_taken;

    // ---- Memory (unified: fetch + load/store) -----------------------------------
    wire [31:0] load_data;

    memory #(.BASE(MEM_BASE), .SIZE(MEM_SIZE)) MEM (
        .clk(clk),
        .fetch_addr(pc_val),
        .fetch_data(instr),
        .load_addr(alu_result),
        .load_size(mem_size),
        .load_signed(mem_signed),
        .load_data(load_data),
        .store_addr(alu_result),
        .store_data(rs2_data),
        .store_size(mem_size),
        .store_en(mem_write)
    );

    // ---- PC-next mux -------------------------------------------------------------
    wire [31:0] pc_plus4     = pc_val + 32'd4;
    wire [31:0] branch_target = pc_val + imm;
    wire [31:0] jal_target    = pc_val + imm;
    wire [31:0] jalr_target   = (rs1_data + imm) & ~32'd1;

    assign pc_next = jalr    ? jalr_target :
                      jump    ? jal_target :
                      do_branch ? branch_target :
                      pc_plus4;

    // ---- Write-back mux -----------------------------------------------------------
    // lui bypasses the ALU entirely and uses the decoded immediate directly;
    // jump/jalr write the return address (pc+4); loads write the sized/
    // sign-extended memory read; everything else writes the ALU result.
    assign wb_data = lui            ? imm :
                      (jump || jalr) ? pc_plus4 :
                      mem_read       ? load_data :
                      alu_result;

endmodule

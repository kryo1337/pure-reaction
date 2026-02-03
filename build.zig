const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{ .cpu_arch = .wasm32, .os_tag = .freestanding });
    const optimize = b.standardOptimizeOption(.{ .preferred_optimize_mode = .ReleaseFast });
    const small_binary = b.option(bool, "small", "Build smaller binary (ReleaseSmall)");
    const use_small = small_binary orelse false;
    const final_optimize = if (use_small) .ReleaseSmall else optimize;

    const exe = b.addExecutable(.{
        .name = "reaction",
        .root_module = b.createModule(.{
            .root_source_file = b.path("src/main.zig"),
            .target = target,
            .optimize = final_optimize,
            .single_threaded = true,
        }),
    });
    exe.lto = .full;
    exe.entry = .disabled;
    exe.rdynamic = true;
    exe.root_module.strip = optimize != .Debug;

    b.installArtifact(exe);

    const install_step = b.addInstallArtifact(exe, .{});
    const cp = b.addSystemCommand(&[_][]const u8{
        "sh", "-c", "cp zig-out/bin/reaction.wasm ./reaction.wasm || cp zig-out/reaction.wasm ./reaction.wasm",
    });
    cp.step.dependOn(&install_step.step);

    const run_step = b.step("copy-wasm", "Copy built reaction.wasm next to index.html");
    run_step.dependOn(&cp.step);
}

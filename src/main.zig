const std = @import("std");

var rng_state: u64 = 0x9e3779b97f4a7c15;
fn xorshift64star() u64 {
    rng_state ^= rng_state >> 12;
    rng_state ^= rng_state << 25;
    rng_state ^= rng_state >> 27;
    return rng_state *% 0x2545F4914F6CDD1D;
}

const GameState = enum(u32) { Idle = 0, Waiting = 1, Ready = 2, Measured = 3, FalseStart = 4 };
var state: GameState = .Idle;
var start_time_ms: u32 = 0;
var target_delay_ms: u32 = 0;
var last_reaction_ms: u32 = 0;
var clicked: bool = false;

export fn init(width: u32, height: u32) void {
    _ = width;
    _ = height;
    state = .Idle;
    start_time_ms = 0;
    last_reaction_ms = 0;
    clicked = false;
}

export fn seed_rng(seed: u64) void {
    if (seed == 0) {
        rng_state = 0x9e3779b97f4a7c15;
    } else {
        rng_state = seed;
    }
}

fn randomDelayMs() u32 {
    const u = @as(f64, @floatFromInt(xorshift64star() >> 11)) * 0x1.0p-53 + 0x1.0p-54;
    const d = 1500.0 - 600.0 * @log(u);
    return if (d > 5000.0) 5000 else @intFromFloat(d);
}

inline fn startWaiting(now_ms: u32) void {
    state = .Waiting;
    start_time_ms = now_ms;
    target_delay_ms = randomDelayMs();
}

export fn update(now_ms: u32) void {
    const elapsed: u32 = if (start_time_ms > 0 and now_ms >= start_time_ms)
        now_ms - start_time_ms
    else
        0;

    switch (state) {
        .Idle => {
            if (clicked) {
                clicked = false;
                startWaiting(now_ms);
            }
        },
        .Waiting => {
            if (clicked) {
                clicked = false;
                state = .FalseStart;
                start_time_ms = now_ms;
            } else if (elapsed >= target_delay_ms) {
                state = .Ready;
                start_time_ms = now_ms;
            }
        },
        .Ready => {
            if (clicked) {
                clicked = false;
                last_reaction_ms = elapsed;
                state = .Measured;
                start_time_ms = now_ms;
            }
        },
        .Measured, .FalseStart => {
            if (clicked) {
                clicked = false;
                startWaiting(now_ms);
            }
        },
    }
}

export fn on_action(down: u32) void {
    if (down != 0) {
        clicked = true;
    }
}

export fn rebase_ready(now_ms: u32) void {
    if (state == .Ready) {
        start_time_ms = now_ms;
    }
}

export fn get_state() u32 {
    return @intFromEnum(state);
}

export fn get_last_reaction_ms() u32 {
    return last_reaction_ms;
}

export fn get_ready_deadline_ms() u32 {
    if (state == .Waiting) {
        return start_time_ms + target_delay_ms;
    }
    return 0;
}

export fn reset() void {
    state = .Idle;
    start_time_ms = 0;
    last_reaction_ms = 0;
    clicked = false;
}

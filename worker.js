let canvas = null;
let ctx = null;
let W = 0,
  H = 0;
let stateBuffer = null;
let stateView = null;
let lastState = -1;
let colors = [];
let armed = false;
let deadlineAbs = 0;
let reportOnset = false;

let textIdle = null;
let textMeasured = null;
let textFalseStart = null;
let digitSheet = null;

const DIGIT_WIDTH = 32;
const DIGIT_HEIGHT = 40;

function createTextBitmap(text, font, color) {
  const off = new OffscreenCanvas(512, 64);
  const c = off.getContext("2d", { alpha: true, willReadFrequently: false });
  c.imageSmoothingEnabled = false;
  c.font = font;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = color;
  c.fillText(text, 256, 32);
  return off;
}

function createDigitSheet() {
  const sheet = new OffscreenCanvas(DIGIT_WIDTH * 13, DIGIT_HEIGHT);
  const c = sheet.getContext("2d", { alpha: true, willReadFrequently: false });
  c.imageSmoothingEnabled = false;
  c.font = "40px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#9d7cff";

  const chars = "0123456789 ms";
  for (let i = 0; i < 13; i++) {
    c.fillText(
      chars[i],
      i * DIGIT_WIDTH + (DIGIT_WIDTH >> 1),
      DIGIT_HEIGHT >> 1,
    );
  }

  return sheet;
}

function drawDigits(ms, x, y) {
  if (!digitSheet) return;

  const str = String(ms) + " ms";
  const totalWidth = str.length * DIGIT_WIDTH;
  let drawX = x - (totalWidth >> 1);

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    let idx;
    if (ch >= "0" && ch <= "9") {
      idx = ch.charCodeAt(0) - 48;
    } else if (ch === " ") {
      idx = 10;
    } else if (ch === "m") {
      idx = 11;
    } else if (ch === "s") {
      idx = 12;
    } else {
      continue;
    }

    ctx.drawImage(
      digitSheet,
      idx * DIGIT_WIDTH,
      0,
      DIGIT_WIDTH,
      DIGIT_HEIGHT,
      drawX,
      y - (DIGIT_HEIGHT >> 1),
      DIGIT_WIDTH,
      DIGIT_HEIGHT,
    );
    drawX += DIGIT_WIDTH;
  }
}

function render(state, ms) {
  if (!ctx) return;

  ctx.fillStyle = colors[state] || colors[0] || "#0040c0";
  ctx.fillRect(0, 0, W, H);

  const cx = W >> 1;
  const cy = H >> 1;

  switch (state) {
    case 3:
      drawDigits(ms, cx, cy);
      if (textMeasured) {
        ctx.drawImage(textMeasured, cx - 256, cy + 10);
      }
      break;
    case 0:
      if (textIdle) {
        ctx.drawImage(textIdle, cx - 256, cy - 32);
      }
      break;
    case 4:
      if (textFalseStart) {
        ctx.drawImage(textFalseStart, cx - 256, cy - 32);
      }
      break;
  }
}

function renderLoop(now) {
  if (reportOnset) {
    reportOnset = false;
    self.postMessage({ type: "onset", abs: performance.timeOrigin + now });
  }
  if (stateView) {
    const currentState = Atomics.load(stateView, 0);
    if (currentState !== lastState) {
      if (currentState !== 1) {
        armed = false;
      }
      const ms = Atomics.load(stateView, 1);
      render(currentState, ms);
      if (currentState === 2 && lastState !== 2) {
        reportOnset = true;
      }
      lastState = currentState;
    } else if (
      armed &&
      lastState === 1 &&
      performance.timeOrigin + now >= deadlineAbs
    ) {
      armed = false;
      render(2, 0);
      lastState = 2;
      reportOnset = true;
    }
  }
  requestAnimationFrame(renderLoop);
}

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      canvas = msg.canvas;
      W = msg.size.W;
      H = msg.size.H;
      colors = msg.colors || [];
      if (msg.stateBuffer) {
        stateBuffer = msg.stateBuffer;
        stateView = new Uint32Array(stateBuffer);
      }
      ctx = canvas.getContext("2d", {
        alpha: false,
        desynchronized: true,
        willReadFrequently: false,
      });
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      textIdle = createTextBitmap(
        "click to begin",
        "24px monospace",
        "#ffffff",
      );
      textMeasured = createTextBitmap(
        "click for next trial",
        "20px monospace",
        "#ffffff",
      );
      textFalseStart = createTextBitmap(
        "too soon — click to retry",
        "24px monospace",
        "#ffffff",
      );
      digitSheet = createDigitSheet();

      if (stateView) {
        requestAnimationFrame(renderLoop);
      }
      return;
    case "arm":
      deadlineAbs = msg.deadlineAbs;
      armed = true;
      break;
    case "resize":
      W = msg.size.W;
      H = msg.size.H;
      if (canvas) {
        canvas.width = W;
        canvas.height = H;
      }
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        render(lastState >= 0 ? lastState : msg.state, msg.ms || 0);
      }
      break;
  }
};

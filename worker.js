let canvas = null;
let ctx = null;
let W = 0,
  H = 0;
let stateBuffer = null;
let stateView = null;
let lastState = -1;

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
  const sheet = new OffscreenCanvas(DIGIT_WIDTH * 12, DIGIT_HEIGHT);
  const c = sheet.getContext("2d", { alpha: true, willReadFrequently: false });
  c.imageSmoothingEnabled = false;
  c.font = "40px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#ffcc00";

  const chars = "0123456789 ms";
  for (let i = 0; i < 12; i++) {
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

  ctx.clearRect(0, 0, W, H);

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

function renderLoop() {
  if (stateView) {
    const currentState = Atomics.load(stateView, 0);
    if (currentState !== lastState) {
      const ms = Atomics.load(stateView, 1);
      render(currentState, ms);
      lastState = currentState;
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
      if (msg.stateBuffer) {
        stateBuffer = msg.stateBuffer;
        stateView = new Uint32Array(stateBuffer);
      }
      ctx = canvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
        willReadFrequently: false,
      });
      ctx.imageSmoothingEnabled = false;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      textIdle = createTextBitmap(
        "Click to begin",
        "24px monospace",
        "#ffffff",
      );
      textMeasured = createTextBitmap(
        "Click to begin next trial",
        "20px monospace",
        "#ffffff",
      );
      textFalseStart = createTextBitmap(
        "False start! Click to restart trial",
        "28px monospace",
        "#ffffff",
      );
      digitSheet = createDigitSheet();

      if (stateView) {
        requestAnimationFrame(renderLoop);
      }
      return;
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
        render(msg.state, msg.ms || 0);
        lastState = msg.state;
      }
      break;
    case "paint":
      render(msg.state, msg.ms);
      lastState = msg.state;
      break;
  }
};

let canvas = null;
let ctx = null;
let W = 0, H = 0;

function render(state, repaint, ms) {
  if (!ctx) return;
  
  if (repaint) {
    if (state === 0) ctx.fillStyle = '#0040c0';
    else if (state === 1 || state === 4) ctx.fillStyle = '#c02030';
    else if (state === 2) ctx.fillStyle = '#18a040';
    else ctx.fillStyle = '#8020c0';
    ctx.fillRect(0, 0, W, H);
  }

  switch (state) {
    case 3: {
      ctx.fillStyle = '#ffcc00';
      ctx.font = '40px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ms + ' ms', W >> 1, H >> 1);
      ctx.font = '20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Click to begin next trial', W >> 1, (H >> 1) + 40);
      break;
    }
    case 0:
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Click to begin', W >> 1, H >> 1);
      break;
    case 4:
      ctx.fillStyle = '#ffffff';
      ctx.font = '28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('False start! Click to restart trial', W >> 1, H >> 1);
      break;
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      canvas = msg.canvas;
      W = msg.size.W; H = msg.size.H;
      ctx = canvas.getContext('2d', { 
        alpha: false, 
        desynchronized: true,
        willReadFrequently: false
      });
      ctx.imageSmoothingEnabled = false;
      return;
    case 'resize':
      W = msg.size.W; H = msg.size.H;
      if (canvas) {
        canvas.width = W;
        canvas.height = H;
      }
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        // Force full repaint (background + text) on resize
        render(msg.state, true, msg.ms || 0);
      }
      break;
    case 'paint':
      render(msg.state, msg.repaint, msg.ms);
      break;
  }
};



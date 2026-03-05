import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const port = process.env.PORT || 3000;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = url.pathname;
    if (path === "/" || path === "") path = "/index.html";
    const filePath = new URL(`.${path}`, import.meta.url);
    const data = await readFile(filePath);
    const type = mime[extname(path)] || "application/octet-stream";

    let cacheControl = "no-store";
    if (path.endsWith(".wasm") || path.endsWith(".js")) {
      cacheControl = "public, max-age=31536000, immutable";
    } else if (path.endsWith(".html")) {
      cacheControl = "no-cache";
    }

    res.writeHead(200, {
      "content-type": type,
      "cache-control": cacheControl,
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`listening on :${port}`);
});

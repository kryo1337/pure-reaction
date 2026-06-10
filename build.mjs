import { readFile, writeFile, mkdir } from "node:fs/promises";
import { transform } from "esbuild";

const html = await readFile("index.html", "utf8");
const workerSrc = await readFile("worker.js", "utf8");
const wasm = await readFile("reaction.wasm");

const workerMin = (
  await transform(workerSrc, { loader: "js", minify: true })
).code;

let out = html.replace(/\n?\s*<link\s+rel="preload"[\s\S]*?\/>/, "");

const cssMatch = out.match(/<style>([\s\S]*?)<\/style>/);
const cssMin = (
  await transform(cssMatch[1], { loader: "css", minify: true })
).code;
out = out.replace(cssMatch[0], () => "<style>" + cssMin + "</style>");

const scriptMatch = out.match(/<script>([\s\S]*?)<\/script>/);
const scriptMin = (
  await transform(scriptMatch[1], { loader: "js", minify: true })
).code;
const inject =
  "self.__WASM_B64=" +
  JSON.stringify(wasm.toString("base64")) +
  ";self.__WORKER_SRC=" +
  JSON.stringify(workerMin).replaceAll("</script", "<\\/script") +
  ";";
out = out.replace(
  scriptMatch[0],
  () => "<script>" + inject + scriptMin.replaceAll("</script", "<\\/script") + "</script>",
);

await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", out);
console.log("dist/index.html", out.length, "bytes");

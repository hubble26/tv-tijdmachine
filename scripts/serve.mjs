// Kleine lokale webserver om de site te testen: node scripts/serve.mjs  →  http://localhost:4321
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const port = Number(process.env.PORT) || 4321;

createServer(async (req, res) => {
  let pad = normalize(decodeURIComponent(req.url.split("?")[0])).replace(/^([/\\])+/, "");
  if (!pad || pad.endsWith("/") || pad.endsWith("\\")) pad += "index.html";
  if (pad.startsWith("..")) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(join(root, pad));
    res.writeHead(200, { "content-type": types[extname(pad)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Niet gevonden");
  }
}).listen(port, () => console.log(`TV-Tijdmachine draait op http://localhost:${port}`));

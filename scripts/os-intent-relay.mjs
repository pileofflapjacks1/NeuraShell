#!/usr/bin/env node
/**
 * Optional local relay for NeuraShell "Actuate OS" live mode.
 *
 * Receives POST /intent JSON { vx, vy, click, t } from the browser
 * and prints NDJSON (compatible with Intent → OS mental model).
 *
 * Usage:
 *   node scripts/os-intent-relay.mjs
 *   # default http://127.0.0.1:8765/intent
 *
 * Then in NeuraShell: Actuate OS → Live (after ARM).
 *
 * Computer-side only. Not implant software. Not a medical device.
 */

import http from "node:http";

const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer((req, res) => {
  // CORS for local browser shell
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "neurashell-os-intent-relay" }));
    return;
  }

  if (req.method === "POST" && (req.url === "/intent" || req.url === "/")) {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8");
        const sample = JSON.parse(body || "{}");
        // NDJSON line — pipe to tools or just watch
        process.stdout.write(JSON.stringify(sample) + "\n");
        res.writeHead(204);
        res.end();
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e) }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, HOST, () => {
  console.error(
    `[neurashell-os-relay] listening http://${HOST}:${PORT}/intent (POST JSON · dry log to stdout)`
  );
  console.error(
    "Pair with: python -m intent_to_os --source csv … or consume NDJSON yourself."
  );
  console.error("Ctrl+C to stop. Computer-side only.");
});

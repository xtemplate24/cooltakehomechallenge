import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = process.env.PORT || 8080;

// The database file lives on the PersistentVolume mounted at /data.
const db = new DatabaseSync(process.env.DB_PATH || "/data/app3.db");
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS custom_exercises (
    user TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY (user, name)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user TEXT NOT NULL, exercise TEXT NOT NULL, kind TEXT NOT NULL,
    reps INTEGER NOT NULL, effort INTEGER, ts TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user);
`);
const q = {
  customs: db.prepare("SELECT name FROM custom_exercises WHERE user = ? ORDER BY name"),
  addCustom: db.prepare("INSERT OR IGNORE INTO custom_exercises (user, name) VALUES (?, ?)"),
  sessions: db.prepare("SELECT exercise, kind, reps, effort, ts FROM sessions WHERE user = ? ORDER BY ts, id"),
  addSession: db.prepare(
    "INSERT INTO sessions (user, exercise, kind, reps, effort, ts) VALUES (?, ?, ?, ?, ?, ?)"
  ),
};

const json = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10_000) { reject(new Error("body too large")); req.destroy(); }
    });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); } });
  });

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
function serveStatic(p, res) {
  let file = path.join(DIST, path.normalize(p));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, "index.html");
  }
  res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer(async (req, res) => {
    const p = new URL(req.url, "http://x").pathname;
    try {
      if (p === "/healthz") { res.writeHead(200); return res.end("ok"); }

      if (p.startsWith("/api/")) {
        // oauth2-proxy (via Traefik forwardAuth) sets this header to the GitHub username.
        const user = req.headers["x-auth-request-user"];
        if (!user) return json(res, 401, { error: "not signed in" });

        if (req.method === "GET" && p === "/api/state") {
          return json(res, 200, {
            custom: q.customs.all(user).map((r) => r.name),
            sessions: q.sessions.all(user),
          });
        }
        if (req.method === "POST" && p === "/api/custom") {
          const name = String((await readBody(req)).name || "").trim();
          if (!name || name.length > 30) return json(res, 400, { error: "name must be 1-30 characters" });
          q.addCustom.run(user, name);
          return json(res, 200, { ok: true });
        }
        if (req.method === "POST" && p === "/api/sessions") {
          const b = await readBody(req);
          const exercise = String(b.exercise || "").trim();
          const reps = Number(b.reps);
          const effort = b.effort == null ? null : Number(b.effort);
          if (!exercise || exercise.length > 30) return json(res, 400, { error: "bad exercise" });
          if (!["assessment", "training"].includes(b.kind)) return json(res, 400, { error: "bad kind" });
          if (!Number.isInteger(reps) || reps < 0 || reps > 10000) return json(res, 400, { error: "bad reps" });
          if (effort !== null && !(Number.isInteger(effort) && effort >= 1 && effort <= 5))
            return json(res, 400, { error: "effort must be 1-5" });
          q.addSession.run(user, exercise, b.kind, reps, effort, new Date().toISOString());
          return json(res, 200, { ok: true });
        }
        return json(res, 404, { error: "not found" });
      }

      serveStatic(p, res);
    } catch (err) {
      console.error(err);
      json(res, 500, { error: "internal error" });
    }
  })
  .listen(PORT, () => console.log(`app3 listening on ${PORT}`));

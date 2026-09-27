import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Traefik's StripPrefix middleware removes "/app1" before the request
// reaches this pod, so everything here is rooted at "/" — even though the
// browser is talking to https://host/app1/... the whole time.
app.use(express.static(path.join(__dirname, "dist")));

const PORT = process.env.PORT || 8080;
// Set via app1-frontend's Deployment env — points at the backend's
// ClusterIP service. Never exposed to the browser directly.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8081";

// Used by the Deployment's readiness/liveness probes (path: "/").
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.post("/api/convert", async (req, res) => {
  try {
    const upstream = await fetch(`${BACKEND_URL}/api/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "backend unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`app1-frontend listening on ${PORT}, proxying to ${BACKEND_URL}`);
});

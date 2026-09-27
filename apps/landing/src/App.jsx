import "./App.css";
// apps/landing/src/App.jsx
import { useEffect, useState } from "react";

// inside App():
const [user, setUser] = useState(null); // null = checking, string = signed in, false = not

useEffect(() => {
  fetch("/oauth2/auth", { credentials: "include" })
    .then((res) =>
      setUser(res.ok ? res.headers.get("X-Auth-Request-User") || "signed in" : false)
    )
    .catch(() => setUser(false));
}, []);

const apps = [
  { name: "App One", path: "/app1" },
  { name: "App Two", path: "/app2" },
];

export default function App() {
  return (
    <div className="page">
      <div className="hero">
        <div className="hero-copy">
          <h1>The front door to a personal cluster.</h1>
          <p className="lede">
            This page is open to anyone. Everything past it needs a GitHub
            sign-in.
          </p>

          <nav className="apps" aria-label="Applications">
            {apps.map((app) => (
              <a key={app.path} href={app.path} className="app-link">
                <span>{app.name}</span>
                <span className="app-path">{app.path}</span>
              </a>
            ))}
          </nav>
        </div>

        <aside className="status" aria-label="Cluster status">
          <div className="status-row">
            <span className="dot dot-ok" />
            <span>cluster: myowncluster</span>
          </div>
          <div className="status-row">
            <span className="dot dot-open" />
            <span>this page: public</span>
          </div>
          <div className="status-row">
            <span className={`dot ${user ? "dot-ok" : "dot-auth"}`} />
            <span>{user ? `signed in as ${user}` : "not signed in"}</span>
          </div>
          <div className="status-row">
            <span className="dot dot-ok" />
            <span>images scanned: daily</span>
          </div>
        </aside>
      </div>

      <footer className="footer">
        <span>Self-hosted. Secured with OAuth. Scanned on a schedule.</span>
      </footer>
    </div>
  );
}

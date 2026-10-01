import { useEffect, useState } from "react";

const API = `${import.meta.env.BASE_URL}api`;
const DEFAULTS = ["Push ups", "Pull ups", "Crunches", "Squats"];
const REST_SECONDS = 120;

async function call(path, body) {
  const res = await fetch(
    `${API}${path}`,
    body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined
  );
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
  return res.json();
}

const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const latestMax = (sessions, ex) => {
  const a = sessions.filter((s) => s.exercise === ex && s.kind === "assessment");
  return a.length ? a[a.length - 1].reps : null;
};
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [screen, setScreen] = useState("home"); // home | mode | assess | train | stats
  const [exercise, setExercise] = useState(null);
  const [newName, setNewName] = useState("");

  const refresh = () => call("/state").then(setData).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const save = async (session) => {
    await call("/sessions", { exercise, ...session });
    await refresh();
    setScreen("mode");
  };

  const addCustom = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await call("/custom", { name });
      await refresh();
      setNewName("");
      setExercise(name);
      setScreen("mode");
    } catch (e) { setError(e.message); }
  };

  if (error) return <div className="page"><p className="error">{error} — try reloading.</p></div>;
  if (!data) return <div className="page"><p>Loading…</p></div>;

  const max = exercise ? latestMax(data.sessions, exercise) : null;

  return (
    <div className="page">
      <nav className="nav">
        <button className={screen !== "stats" ? "tab on" : "tab"} onClick={() => setScreen("home")}>Exercises</button>
        <button className={screen === "stats" ? "tab on" : "tab"} onClick={() => setScreen("stats")}>My stats</button>
      </nav>

      {screen === "home" && (
        <section>
          <h1>Pick an exercise</h1>
          <div className="grid">
            {[...DEFAULTS, ...data.custom].map((n) => (
              <button key={n} className="big" onClick={() => { setExercise(n); setScreen("mode"); }}>{n}</button>
            ))}
          </div>
          <h2>Custom</h2>
          <div className="row">
            <input value={newName} maxLength={30} placeholder="e.g. Burpees" onChange={(e) => setNewName(e.target.value)} />
            <button className="primary" onClick={addCustom}>Add</button>
          </div>
        </section>
      )}

      {screen === "mode" && (
        <section>
          <h1>{exercise}</h1>
          <p className="muted">{max === null ? "No assessment yet." : `Current max: ${max} reps`}</p>
          <div className="grid">
            <button className="big" onClick={() => setScreen("assess")}>Assessment</button>
            <button className="big" disabled={max === null} onClick={() => setScreen("train")}>Daily training</button>
          </div>
          {max === null && <p className="muted">Do an assessment first so we know your max.</p>}
        </section>
      )}

      {screen === "assess" && <Assessment exercise={exercise} onSave={save} onBack={() => setScreen("mode")} />}
      {screen === "train" && <Training exercise={exercise} max={max} onSave={save} onBack={() => setScreen("mode")} />}
      {screen === "stats" && <Stats sessions={data.sessions} />}
    </div>
  );
}

function Assessment({ exercise, onSave, onBack }) {
  const [count, setCount] = useState(null); // null = not started, 3..1 counting, 0 = go
  const [reps, setReps] = useState("");
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (count === null || count <= 0) return;
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count]);

  const submit = () => {
    const n = parseInt(reps, 10);
    if (!(n >= 0)) return setErr("Enter a number of reps");
    onSave({ kind: "assessment", reps: n, effort: null }).catch((e) => setErr(e.message));
  };

  return (
    <section>
      <h1>{exercise} — assessment</h1>
      {count === null && <button className="primary huge" onClick={() => setCount(3)}>Start</button>}
      {count > 0 && <div className="clock">{count}</div>}
      {count === 0 && (
        <>
          <div className="clock go">GO!</div>
          <p className="muted">Do as many reps as you can, then log it.</p>
          <div className="row">
            <input type="number" min="0" value={reps} placeholder="Max reps" onChange={(e) => setReps(e.target.value)} />
            <button className="primary" onClick={submit}>Save</button>
          </div>
        </>
      )}
      {err && <p className="error">{err}</p>}
      <button className="link" onClick={onBack}>Back</button>
    </section>
  );
}

function Training({ exercise, max, onSave, onBack }) {
  const [x, setX] = useState("2");
  const [phase, setPhase] = useState("setup"); // setup | set | rest | effort
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(REST_SECONDS);
  const [err, setErr] = useState(null);

  const h = Math.floor(max / 2);
  const xn = Math.max(0, parseInt(x, 10) || 0);
  const plan = [h, h + xn, h, h, h + xn];

  const nextSet = () => { setI(i + 1); setPhase("set"); };

  useEffect(() => {
    if (phase !== "rest") return;
    if (left <= 0) return nextSet();
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, left]);

  const finishSet = () => {
    if (i === plan.length - 1) return setPhase("effort");
    setLeft(REST_SECONDS);
    setPhase("rest");
  };

  const submit = (effort) =>
    onSave({ kind: "training", reps: plan.reduce((a, b) => a + b, 0), effort }).catch((e) => setErr(e.message));

  return (
    <section>
      <h1>{exercise} — training</h1>
      {phase === "setup" && (
        <>
          <p className="muted">Max {max} → sets: {plan.join(", ")}</p>
          <label>Your x (extra reps on sets 2 and 5)</label>
          <div className="row">
            <input type="number" min="0" value={x} onChange={(e) => setX(e.target.value)} />
            <button className="primary" onClick={() => setPhase("set")}>Begin</button>
          </div>
        </>
      )}
      {phase === "set" && (
        <>
          <p className="muted">Set {i + 1} of {plan.length}</p>
          <div className="clock">{plan[i]}</div>
          <p className="muted">reps</p>
          <button className="primary huge" onClick={finishSet}>Set done</button>
        </>
      )}
      {phase === "rest" && (
        <>
          <p className="muted">Rest — next: set {i + 2} ({plan[i + 1]} reps)</p>
          <div className="clock">{fmt(left)}</div>
          <div className="row">
            <button onClick={() => setLeft((l) => l + 10)}>+10s</button>
            <button className="primary" onClick={nextSet}>Skip rest</button>
          </div>
        </>
      )}
      {phase === "effort" && (
        <>
          <p className="muted">Done! How hard was it? (1 easy – 5 max effort)</p>
          <div className="row">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className="big" onClick={() => submit(n)}>{n}</button>
            ))}
          </div>
        </>
      )}
      {err && <p className="error">{err}</p>}
      {phase !== "effort" && <button className="link" onClick={onBack}>Quit (this session is not saved)</button>}
    </section>
  );
}

function Stats({ sessions }) {
  if (!sessions.length) return <section><h1>My stats</h1><p className="muted">Nothing logged yet.</p></section>;

  const total = sessions.reduce((a, s) => a + s.reps, 0);
  const efforts = sessions.filter((s) => s.effort);
  const avgEffort = efforts.length ? (efforts.reduce((a, s) => a + s.effort, 0) / efforts.length).toFixed(1) : "–";
  const rows = [...new Set(sessions.map((s) => s.exercise))].map((n) => ({
    n,
    max: latestMax(sessions, n),
    total: sessions.filter((s) => s.exercise === n).reduce((a, s) => a + s.reps, 0),
  }));
  const tmax = Math.max(1, ...rows.map((r) => r.total));

  const days = [];
  for (let k = 13; k >= 0; k--) {
    const d = new Date();
    d.setDate(d.getDate() - k);
    days.push({ key: dayKey(d), label: `${d.getDate()}/${d.getMonth() + 1}`, reps: 0 });
  }
  sessions.forEach((s) => {
    const d = days.find((x) => x.key === dayKey(s.ts));
    if (d) d.reps += s.reps;
  });
  const dmax = Math.max(1, ...days.map((d) => d.reps));

  return (
    <section>
      <h1>My stats</h1>
      <div className="cards">
        <div className="card"><b>{total}</b><span>total reps</span></div>
        <div className="card"><b>{sessions.length}</b><span>sessions</span></div>
        <div className="card"><b>{avgEffort}</b><span>avg effort</span></div>
      </div>

      <h2>By exercise</h2>
      {rows.map((r) => (
        <div key={r.n} className="hbar">
          <div className="hbar-label"><span>{r.n}</span><span>max {r.max ?? "–"} · total {r.total}</span></div>
          <div className="track"><div className="fill" style={{ width: `${(r.total / tmax) * 100}%` }} /></div>
        </div>
      ))}

      <h2>Reps per day (last 14 days)</h2>
      <div className="bars">
        {days.map((d) => (
          <div key={d.key} className="col" title={`${d.label}: ${d.reps} reps`}>
            <div className="vfill" style={{ height: `${(d.reps / dmax) * 100}%` }} />
            <small>{d.label.split("/")[0]}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

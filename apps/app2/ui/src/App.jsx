import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "app2-chats";
const MAX_CHATS = 3;          // how many conversations to keep
const MAX_CONTEXT = 8;        // last N messages sent to the model (it has a small memory window)
const API_URL = `${import.meta.env.BASE_URL}api/v1/chat/completions`;

const makeChat = () => ({ id: String(Date.now()), title: "New chat", messages: [] });

function loadChats() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved.slice(0, MAX_CHATS);
  } catch {
    // ignore corrupted or unavailable storage
  }
  return [makeChat()];
}

export default function App() {
  const [chats, setChats] = useState(loadChats);
  const [activeId, setActiveId] = useState(() => loadChats()[0].id);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const active = chats.find((c) => c.id === activeId) || chats[0];

  // Save to the browser whenever chats change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch {
      // storage full or blocked: keep working without saving
    }
  }, [chats]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages]);

  const updateChat = (id, fn) =>
    setChats((all) => all.map((c) => (c.id === id ? fn(c) : c)));

  const startNewChat = () => {
    if (chats.length >= MAX_CHATS) {
      const ok = window.confirm(
        `Only ${MAX_CHATS} chats are kept. Starting a new one deletes the oldest. Continue?`
      );
      if (!ok) return;
    }
    const fresh = makeChat();
    setChats((all) => [fresh, ...all].slice(0, MAX_CHATS));
    setActiveId(fresh.id);
  };

  const deleteChat = (id) => {
    const rest = chats.filter((c) => c.id !== id);
    if (rest.length === 0) {
      const fresh = makeChat();
      setChats([fresh]);
      setActiveId(fresh.id);
      return;
    }
    setChats(rest);
    if (id === activeId) setActiveId(rest[0].id);
  };

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const id = active.id;
    const history = [...active.messages, { role: "user", content: text }];

    setInput("");
    setError(null);
    setBusy(true);
    updateChat(id, (c) => ({
      ...c,
      title: c.messages.length ? c.title : text.slice(0, 30),
      messages: [...history, { role: "assistant", content: "" }],
    }));

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.slice(-MAX_CONTEXT),
          stream: true,
          max_tokens: 512,
        }),
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      // The server sends the reply in small pieces; show them as they arrive.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          const piece = JSON.parse(data).choices?.[0]?.delta?.content;
          if (piece) {
            reply += piece;
            const snapshot = reply;
            updateChat(id, (c) => ({
              ...c,
              messages: [
                ...c.messages.slice(0, -1),
                { role: "assistant", content: snapshot },
              ],
            }));
          }
        }
      }
    } catch (err) {
      setError(
        `${err.message}. If this keeps happening, reload the page (your login may have expired).`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <button className="primary" onClick={startNewChat} disabled={busy}>
          + New chat
        </button>
        {chats.map((c) => (
          <div key={c.id} className={`chat-item${c.id === active.id ? " active" : ""}`}>
            <button className="chat-title" onClick={() => setActiveId(c.id)} disabled={busy}>
              {c.title}
            </button>
            <button
              className="chat-delete"
              aria-label="Delete chat"
              onClick={() => deleteChat(c.id)}
              disabled={busy}
            >
              ×
            </button>
          </div>
        ))}
        <p className="hint">Chats are saved in this browser only.</p>
      </aside>

      <main className="main">
        <div className="messages">
          {active.messages.length === 0 && (
            <p className="empty">Ask the local model something.</p>
          )}
          {active.messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              {m.content || (busy && i === active.messages.length - 1 ? "…" : "")}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="error">{error}</p>}

        <form className="composer" onSubmit={send}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message"
            disabled={busy}
          />
          <button type="submit" className="primary" disabled={busy || !input.trim()}>
            {busy ? "Thinking…" : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
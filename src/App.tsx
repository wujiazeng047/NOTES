import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";

type Note = { id: string; title: string; content: string; createdAt: number; updatedAt: number };
const STORAGE_KEY = "sage-notes-v1";

const createNote = (): Note => {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "", content: "", createdAt: now, updatedAt: now };
};

const formatDate = (value: number) => new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
}).format(value);

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const selected = notes.find((note) => note.id === selectedId) ?? null;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setNotes(JSON.parse(saved));
    } catch { /* Keep the app usable if browser storage is unavailable. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes, loaded]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...notes]
      .filter((note) => !term || `${note.title} ${note.content}`.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, query]);

  const addNote = () => {
    const note = createNote();
    setNotes((current) => [note, ...current]);
    setSelectedId(note.id);
    setQuery("");
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const updateNote = (field: "title" | "content", value: string) => {
    if (!selectedId) return;
    setNotes((current) => current.map((note) => note.id === selectedId
      ? { ...note, [field]: value, updatedAt: Date.now() }
      : note));
  };

  const deleteNote = () => {
    if (!pendingDelete) return;
    setNotes((current) => current.filter((note) => note.id !== pendingDelete.id));
    if (selectedId === pendingDelete.id) setSelectedId(null);
    setPendingDelete(null);
  };

  const NoteCard = ({ note }: { note: Note }) => {
    const timer = useRef<number | null>(null);
    const longPressed = useRef(false);
    const start = () => {
      longPressed.current = false;
      timer.current = window.setTimeout(() => {
        longPressed.current = true;
        navigator.vibrate?.(30);
        setPendingDelete(note);
      }, 650);
    };
    const stop = () => { if (timer.current) window.clearTimeout(timer.current); };

    return (
      <button className="note-card" onPointerDown={start} onPointerUp={stop}
        onPointerCancel={stop} onPointerLeave={stop} onContextMenu={(e) => e.preventDefault()}
        onClick={() => { if (!longPressed.current) setSelectedId(note.id); }}>
        <span className="card-accent" />
        <span className="card-copy">
          <span className="card-heading">
            <strong>{note.title.trim() || "Untitled note"}</strong><ChevronRight size={20} />
          </span>
          <span className="preview">{note.content.trim() || "Nothing written yet…"}</span>
          <time>{formatDate(note.updatedAt)}</time>
        </span>
      </button>
    );
  };

  return (
    <main className="app-shell">
      <section className={`list-pane ${selected ? "has-editor" : ""}`}>
        <header className="brand-row">
          <div><span className="eyebrow">MY NOTEBOOK</span><h1>Sage Notes</h1></div>
          <button className="round-button" onClick={addNote} aria-label="New note"><Plus /></button>
        </header>

        <label className="search-box">
          <Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and notes" aria-label="Search notes" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}
        </label>

        <div className="list-meta"><span>{query ? `${filtered.length} found` : `${notes.length} notes`}</span><span>Press and hold to delete</span></div>

        <div className="note-list">
          {filtered.map((note) => <NoteCard note={note} key={note.id} />)}
          {!filtered.length && (
            <div className="empty-state">
              <span className="empty-mark">N</span>
              <h2>{notes.length ? "No matching notes" : "Keep something worth remembering"}</h2>
              <p>{notes.length ? "Try another word or phrase." : "Your notes stay private and save automatically on this device."}</p>
              {!notes.length && <button className="primary-button" onClick={addNote}>Create your first note</button>}
            </div>
          )}
        </div>
      </section>

      <section className={`editor-pane ${selected ? "open" : ""}`} aria-hidden={!selected}>
        {selected && <>
          <header className="editor-header">
            <button className="back-button" onClick={() => setSelectedId(null)}><ArrowLeft size={20} />Notes</button>
            <span className="saved"><Check size={14} />Saved on this device</span>
            <button className="delete-button" onClick={() => setPendingDelete(selected)}><Trash2 size={17} /><span>Delete</span></button>
          </header>
          <div className="editor-body">
            <input ref={titleRef} className="title-input" value={selected.title}
              onChange={(e) => updateNote("title", e.target.value)} placeholder="Note title" maxLength={100} />
            <span className="title-rule" />
            <textarea value={selected.content} onChange={(e) => updateNote("content", e.target.value)}
              placeholder="Write down a thought, a fragment, or something worth remembering…" />
          </div>
          <footer className="editor-footer"><span>{selected.content.length} characters</span><span>Updated {formatDate(selected.updatedAt)}</span></footer>
        </>}
      </section>

      {pendingDelete && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(e) => e.stopPropagation()}>
            <span className="modal-icon"><Trash2 size={22} /></span>
            <h2 id="delete-title">Delete this note?</h2>
            <p>“{pendingDelete.title.trim() || "Untitled note"}” will be permanently removed from this device.</p>
            <div className="modal-actions"><button onClick={() => setPendingDelete(null)}>Cancel</button><button className="confirm-delete" onClick={deleteNote}>Delete note</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

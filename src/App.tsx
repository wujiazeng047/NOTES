import { useEffect, useMemo, useRef, useState, type ChangeEvent, type TouchEvent } from "react";
import { ArrowLeft, Check, ChevronRight, Download, Plus, Search, Trash2, Upload, X } from "lucide-react";

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
  const [actionNote, setActionNote] = useState<Note | null>(null);
  const [toast, setToast] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
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

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

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

  const duplicateNote = (note: Note) => {
    const now = Date.now();
    const duplicate: Note = {
      ...note,
      id: crypto.randomUUID(),
      title: note.title.trim() ? `${note.title} (Copy)` : "Untitled note (Copy)",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((current) => [duplicate, ...current]);
    setActionNote(null);
    setToast("Note duplicated");
  };

  const copyNoteText = async (note: Note) => {
    const text = [note.title.trim(), note.content.trim()].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text || "Untitled note");
    } catch {
      const area = document.createElement("textarea");
      area.value = text || "Untitled note";
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setActionNote(null);
    setToast("Copied to clipboard");
  };

  const startSwipe = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    swipeStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const finishSwipe = (event: TouchEvent<HTMLElement>) => {
    if (!swipeStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStart.current.x;
    const deltaY = Math.abs(touch.clientY - swipeStart.current.y);
    swipeStart.current = null;

    if (deltaX > 80 && deltaY < 70) setSelectedId(null);
  };

  const exportBackup = async () => {
    const date = new Date().toISOString().slice(0, 10);
    const fileName = `lwin-car-info-notes-backup-${date}.json`;
    const backup = JSON.stringify({
      app: "Lwin Car Info Notes",
      version: 1,
      exportedAt: new Date().toISOString(),
      notes,
    }, null, 2);
    const file = new File([backup], fileName, { type: "application/json" });

    try {
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Lwin Car Info Notes Backup",
          text: "Save this backup to iCloud Drive or Files.",
          files: [file],
        });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const incoming: Note[] = Array.isArray(parsed) ? parsed : parsed.notes;
      const valid = Array.isArray(incoming) && incoming.every((note) =>
        typeof note.id === "string" &&
        typeof note.title === "string" &&
        typeof note.content === "string" &&
        typeof note.createdAt === "number" &&
        typeof note.updatedAt === "number");

      if (!valid) throw new Error("Invalid backup");
      if (!window.confirm(`Restore ${incoming.length} notes from this backup? Existing notes will be kept.`)) return;

      setNotes((current) => {
        const merged = new Map(current.map((note) => [note.id, note]));
        incoming.forEach((note) => {
          const existing = merged.get(note.id);
          if (!existing || note.updatedAt >= existing.updatedAt) merged.set(note.id, note);
        });
        return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      window.alert(`${incoming.length} notes restored successfully.`);
    } catch {
      window.alert("This file is not a valid Lwin Car Info Notes backup.");
    }
  };

  const NoteCard = ({ note }: { note: Note }) => {
    const timer = useRef<number | null>(null);
    const longPressed = useRef(false);
    const start = () => {
      longPressed.current = false;
      timer.current = window.setTimeout(() => {
        longPressed.current = true;
        navigator.vibrate?.(30);
        setActionNote(note);
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
            <strong lang="my">{note.title.trim() || "Untitled note"}</strong><ChevronRight size={20} />
          </span>
          <span className="preview" lang="my">{note.content.trim() || "Nothing written yet…"}</span>
          <time>{formatDate(note.updatedAt)}</time>
        </span>
      </button>
    );
  };

  return (
    <main className="app-shell">
      <section className={`list-pane ${selected ? "has-editor" : ""}`}>
        <header className="brand-row">
          <div className="brand-lockup">
            <span className="logo-badge"><img src="./lwin-logo.png" alt="LWIN Car Sales Center" /></span>
            <div><span className="eyebrow">CAR INFO NOTEBOOK</span><h1>Lwin Car Info Notes</h1></div>
          </div>
          <button className="round-button" onClick={addNote} aria-label="New note"><Plus /></button>
        </header>

        <label className="search-box">
          <Search size={19} /><input lang="my" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles and notes" aria-label="Search notes" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={17} /></button>}
        </label>

        <div className="list-meta"><span>{query ? `${filtered.length} found` : `${notes.length} notes`}</span><span>Press and hold to delete</span></div>

        <div className="backup-actions">
          <button onClick={exportBackup}><Download size={15} />Backup to Files</button>
          <button onClick={() => restoreInputRef.current?.click()}><Upload size={15} />Restore backup</button>
          <input ref={restoreInputRef} className="file-input" type="file" accept="application/json,.json" onChange={restoreBackup} />
        </div>

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

      <section className={`editor-pane ${selected ? "open" : ""}`} aria-hidden={!selected}
        onTouchStart={startSwipe} onTouchEnd={finishSwipe}>
        {selected && <>
          <header className="editor-header">
            <button className="back-button" onClick={() => setSelectedId(null)}><ArrowLeft size={20} />Notes</button>
            <span className="saved"><Check size={14} />Saved on this device</span>
            <button className="delete-button" onClick={() => setPendingDelete(selected)}><Trash2 size={17} /><span>Delete</span></button>
          </header>
          <div className="editor-body">
            <input ref={titleRef} className="title-input" lang="my" dir="auto" value={selected.title}
              onChange={(e) => updateNote("title", e.target.value)} placeholder="Note title" maxLength={100} />
            <span className="title-rule" />
            <textarea lang="my" dir="auto" value={selected.content} onChange={(e) => updateNote("content", e.target.value)}
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

      {actionNote && (
        <div className="modal-backdrop action-backdrop" role="presentation" onClick={() => setActionNote(null)}>
          <div className="action-sheet" role="dialog" aria-modal="true" aria-labelledby="note-actions-title" onClick={(e) => e.stopPropagation()}>
            <div className="action-heading">
              <span id="note-actions-title">{actionNote.title.trim() || "Untitled note"}</span>
              <small>Choose an action</small>
            </div>
            <button onClick={() => duplicateNote(actionNote)}>Duplicate note</button>
            <button onClick={() => copyNoteText(actionNote)}>Copy text</button>
            <button className="action-delete" onClick={() => { setPendingDelete(actionNote); setActionNote(null); }}>Delete note</button>
            <button className="action-cancel" onClick={() => setActionNote(null)}>Cancel</button>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
